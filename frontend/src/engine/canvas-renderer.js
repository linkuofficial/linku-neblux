// Canvas scene renderer for the star-field knowledge graph — "Deep Field".
//
// Physics stays in d3-force; the renderer only READS node x/y. Visual state
// travels on per-object flag bags (node.vis / edge.vis) the page logic
// mutates:
//
//   node.vis: dimmed, selected, related, learned, available, onPath
//   edge.vis: dimmed, highlight, prereqPath          (+ edge.pending, static)
//
// The Deep Field look (all constants in engine/theme.js):
//   層級 — star brightness hierarchy from starMeta.baseOp (fields ≫ dust);
//          ambient colours are tier-suppressed, full colour is earned by
//          interaction (hover / selection / related / LP states).
//   焦點 — while a node is selected the rest of the sky dims and the resting
//          lines recede, so one constellation owns the scene.
//   緩動 — every visual state change eases through an exponential lerp
//          (THEME.anim.tau) instead of snapping; under prefers-reduced-motion
//          values jump straight to target and ambient animation stops.
//   深度 — parallax far-field + per-domain nebula fog + vignette.
//
// Perf ground rules learned the hard way: NO shadowBlur anywhere (per-stroke
// gaussian shadows collapse Chrome's raster pipeline once dozens of curves
// light up — soft glow is layered strokes instead), sprites are pre-rendered
// offscreen, and the first paint is synchronous so hidden tabs see state.

import { createSpriteCache } from './star-sprites.js';
import { edgeCurveDirection, EDGE_CURVE_DISTANCE_FACTOR, EDGE_CURVE_MIN_OFFSET, EDGE_CURVE_MAX_OFFSET, hexA } from './geometry.js';
import { THEME, ambientColor } from './theme.js';
import { createFarField, createNebulaSprite, createVignette } from './atmosphere.js';

const TWO_PI = Math.PI * 2;

// World-space control point of an edge's quadratic curve (same math as
// geometry.curvedEdgePath, but returning the point for canvas quadraticCurveTo).
function curveControl(edge) {
    const sx = edge.source.x ?? 0, sy = edge.source.y ?? 0;
    const tx = edge.target.x ?? 0, ty = edge.target.y ?? 0;
    const dx = tx - sx, dy = ty - sy;
    const dist = Math.hypot(dx, dy) || 1;
    const baseOffset = Math.min(EDGE_CURVE_MAX_OFFSET, Math.max(EDGE_CURVE_MIN_OFFSET, dist * EDGE_CURVE_DISTANCE_FACTOR));
    const dir = edgeCurveDirection(edge);
    return {
        cx: (sx + tx) * 0.5 + (-dy / dist) * baseOffset * dir,
        cy: (sy + ty) * 0.5 + (dx / dist) * baseOffset * dir,
    };
}

export function ensureVis(obj) {
    if (!obj.vis) obj.vis = {};
    return obj.vis;
}

export function createCanvasRenderer(opts) {
    const {
        canvas,
        relationColor,     // (relation_type) => '#rrggbb'
        domainColor,       // (node) => '#rrggbb'
        starMeta,          // (node) => {core,glow,halo,corona,glowAlpha,baseOp,tier,twDur,twDelay}
        label,             // (node, hovered) => {text, dy, size, alpha, field} | null
    } = opts;
    // Let (not const) so setData can swap the arrays when explorer expands.
    let nodes = opts.nodes;
    let edges = opts.edges;

    const ctx = canvas.getContext('2d');
    const sprites = createSpriteCache();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0, height = 0, dpr = 1;
    let transform = { k: 1, x: 0, y: 0 };
    let hoveredId = null;
    let selectedNode = null;
    let constellations = [];   // tour overlays: [{id, name, accent, members[], segments[[a,b]]}]
    let lastConstNames = [];   // last-frame name boxes (screen space) for click hit-testing
    let curConstT = 0;         // current zoom crossfade for the constellation layer (0..1)
    let lpMode = false;
    let rafId = 0;
    let dirty = true;
    let running = false;
    // Quiet mode: when a glass panel is open on mobile, the backdrop-blur is
    // recomputed every time the canvas under it repaints. Capping the ambient
    // (twinkle/photon) redraw to QUIET_FPS roughly halves that GPU cost.
    // (Reuses `lastDrawMs`, set by draw() below, as the gate clock.)
    // narrowViewport is refreshed on resize so the hot loop never reads layout.
    let quiet = false;
    let narrowViewport = window.innerWidth <= 768;
    const QUIET_FPS = 30;
    const stats = { lastMs: 0, avgMs: 0, frames: 0 };

    // ── atmosphere (lazy: far field needs dpr from resize) ─────────────────
    let farField = null;
    const vignette = createVignette();
    let nebulae = null; // [{node, sprite}] — one per domain, anchored to its hub field

    function ensureNebulae() {
        if (nebulae) return;
        const seedByDomain = new Map();
        const consider = (n, meta) => {
            const key = domainColor(n);
            const cur = seedByDomain.get(key);
            if (!cur || (meta.degree || 0) > cur.degree) {
                seedByDomain.set(key, { node: n, degree: meta.degree || 0 });
            }
        };
        for (const n of nodes) {
            const meta = starMeta(n);
            if (meta.tier === 'primary') consider(n, meta);
        }
        // A small curated subgraph (e.g. a Wonders tour) can contain no field/hub
        // node at all — which would leave the Deep Field with no nebula fog and
        // read as a flat void. Fall back to seeding from the strongest node per
        // domain so the scene keeps its atmosphere. In the full graph a primary
        // always exists, so this branch never alters app/explorer.
        if (!seedByDomain.size) {
            for (const n of nodes) consider(n, starMeta(n));
        }
        nebulae = [];
        for (const [color, seed] of seedByDomain) {
            nebulae.push({ node: seed.node, sprite: createNebulaSprite(color, color, 256) });
        }
    }

    // ── eased visual state (the "every change glides" engine) ──────────────
    // Per node: dim (focus/filter), mix (suppressed↔full colour), label alpha.
    // Per edge: lit (focus-curve presence). Plus one global scalar for how far
    // the resting lines recede while something is selected.
    const anims = new Map();
    function animOf(id, initMix) {
        let a = anims.get(id);
        if (!a) {
            a = { dim: { c: 1, t: 1 }, mix: { c: initMix, t: initMix }, label: { c: 0, t: 0 }, lastInfo: null };
            anims.set(id, a);
        }
        return a;
    }
    const edgeLit = new Map();
    function litOf(id) {
        let a = edgeLit.get(id);
        if (!a) { a = { c: 0, t: 0 }; edgeLit.set(id, a); }
        return a;
    }
    const restDim = { c: 1, t: 1 };

    function ease(v, f) {
        v.c += (v.t - v.c) * f;
        if (Math.abs(v.t - v.c) < THEME.anim.epsilon) v.c = v.t;
    }

    function nodeTargets(n, meta) {
        const v = n.vis || {};
        const anySel = !!selectedNode;
        let dim = 1;
        if (v.dimmed) dim = THEME.focus.filterDim;
        else if (anySel) dim = (v.selected || v.related) ? 1 : (lpMode ? THEME.focus.dimOthersLp : THEME.focus.dimOthers);
        let mix = THEME.star.ambientMix[meta.tier] ?? 0.4;
        if (v.selected || v.related || v.onPath || n.id === hoveredId) mix = 1;
        if (lpMode && (v.learned || v.available)) mix = 1;
        return { dim, mix };
    }

    function updateAnims(dtSec) {
        const f = reducedMotion ? 1 : Math.min(1, 1 - Math.exp(-dtSec / THEME.anim.tau));
        for (const n of nodes) {
            const meta = starMeta(n);
            const a = animOf(n.id, THEME.star.ambientMix[meta.tier] ?? 0.4);
            const tgt = nodeTargets(n, meta);
            a.dim.t = tgt.dim;
            a.mix.t = tgt.mix;
            const info = label(n, n.id === hoveredId);
            a.label.t = info ? info.alpha : 0;
            if (info) a.lastInfo = info;
            ease(a.dim, f); ease(a.mix, f); ease(a.label, f);
        }
        for (const e of edges) {
            const v = e.vis || {};
            const a = litOf(edgeId(e));
            a.t = (v.highlight || v.prereqPath) ? 1 : 0;
            ease(a, f);
        }
        restDim.t = selectedNode ? THEME.focus.restEdgeDim : 1;
        ease(restDim, f);
    }

    function edgeId(e) {
        return (e.source.id || e.source) + '|' + (e.target.id || e.target) + '|' + e.relation_type;
    }

    function resize() {
        const w = window.innerWidth, h = window.innerHeight;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        width = w; height = h;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        sprites.clear(); // dpr may have changed; sprites re-bake lazily
        farField = createFarField(dpr);
        dirty = true;
    }

    // ── per-frame helpers ───────────────────────────────────────────────────

    function twinkleAlpha(meta, nowSec) {
        if (reducedMotion) return 1;
        const dur = Number(meta.twDur) || 5;
        const delay = Number(meta.twDelay) || 0;
        const phase = ((nowSec - delay) / dur) % 1;
        // @keyframes nebluxTwinkle: 0.85 → 1 → 0.85, ease-in-out ≈ sinusoid.
        return 0.925 - 0.075 * Math.cos(TWO_PI * phase);
    }

    function drawAtmosphere(k, tx, ty) {
        farField.draw(ctx, width, height, tx, ty);
        ensureNebulae();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const neb of nebulae) {
            const n = neb.node;
            if (!Number.isFinite(n.x)) continue;
            const sx = n.x * k + tx, sy = n.y * k + ty;
            const r = Math.min(THEME.atmosphere.nebulaWorldRadius * k, THEME.atmosphere.nebulaMaxScreenRadius);
            if (sx < -r || sx > width + r || sy < -r || sy > height + r) continue;
            ctx.globalAlpha = THEME.atmosphere.nebulaAlpha;
            ctx.drawImage(neb.sprite, sx - r, sy - r, r * 2, r * 2);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    function drawEdges(k, tx, ty, nowSec) {
        // Resting constellation lines, batched by (relation, state) so the whole
        // sky is ~a dozen stroke() calls. Edges whose focus-curve is fading
        // in/out cross-fade between the two renditions.
        const buckets = new Map();
        const lit = [];
        for (const e of edges) {
            const v = e.vis || {};
            const litA = litOf(edgeId(e)).c;
            if (litA > THEME.anim.epsilon) lit.push({ e, a: litA });
            if (litA > 0.5) continue; // resting line hidden under a solid curve
            const alpha = (v.dimmed ? THEME.edges.restDimmed : (e.pending ? THEME.edges.pending : THEME.edges.rest)) * (1 - litA);
            const key = e.relation_type + '|' + (v.dimmed ? 'd' : (e.pending ? 'p' : 'r'));
            let b = buckets.get(key);
            if (!b) { b = { color: relationColor(e.relation_type) || '#888', alpha, pending: !!e.pending, list: [] }; buckets.set(key, b); }
            b.list.push(e);
        }
        ctx.lineWidth = 0.5;
        ctx.lineCap = 'round';
        for (const b of buckets.values()) {
            ctx.globalAlpha = b.alpha * restDim.c;
            ctx.strokeStyle = b.color;
            ctx.setLineDash(b.pending ? [4 * k, 3 * k] : []);
            ctx.beginPath();
            for (const e of b.list) {
                ctx.moveTo(e.source.x * k + tx, e.source.y * k + ty);
                ctx.lineTo(e.target.x * k + tx, e.target.y * k + ty);
            }
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        if (!lit.length) return;

        // Lit constellation: gradient backbone (bright at the stars, fading
        // mid-span so long curves stop slicing the composition) + a flowing
        // photon. NO shadowBlur — layered strokes only.
        for (const { e, a: litA } of lit) {
            const isPrereq = !!(e.vis && e.vis.prereqPath);
            // 克制 in learning-path mode: the full gold web would smother the
            // sky, so at rest it shows as restrained threads (no photons); when
            // a chain is selected only its edges blaze, the rest recede.
            let strength = 1, photonOn = true;
            if (isPrereq && lpMode) {
                if (!selectedNode) {
                    strength = 0.5; photonOn = false;
                } else {
                    const onChain = !!(e.source.vis && e.source.vis.onPath && e.target.vis && e.target.vis.onPath);
                    if (!onChain) { strength = 0.22; photonOn = false; }
                }
            }
            // Super-hub restraint: a node with dozens of edges marks all but its
            // top-N most important connections as "secondary" — those stay as
            // quiet threads (no photon) so the lit fan reads as a few strong
            // links, not a blinding starburst.
            if (e.vis && e.vis.secondary) { strength *= 0.4; photonOn = false; }
            const a = litA * strength;
            const sxp = e.source.x * k + tx, syp = e.source.y * k + ty;
            const txp = e.target.x * k + tx, typ = e.target.y * k + ty;
            const cp = curveControl(e);
            const cxp = cp.cx * k + tx, cyp = cp.cy * k + ty;
            const stroke = isPrereq ? '#f0c050' : (relationColor(e.relation_type) || '#cfe0f5');
            const curve = () => {
                ctx.beginPath();
                ctx.moveTo(sxp, syp);
                ctx.quadraticCurveTo(cxp, cyp, txp, typ);
                ctx.stroke();
            };

            // Backbone — endpoint-bright gradient thread.
            const aEnd = reducedMotion ? THEME.edges.reducedEnd : (isPrereq ? THEME.edges.litEndGold : THEME.edges.litEnd);
            const aMid = reducedMotion ? THEME.edges.reducedMid : (isPrereq ? THEME.edges.litMidGold : THEME.edges.litMid);
            const grad = ctx.createLinearGradient(sxp, syp, txp, typ);
            grad.addColorStop(0, hexA(stroke, aEnd));
            grad.addColorStop(0.5, hexA(stroke, aMid));
            grad.addColorStop(1, hexA(stroke, aEnd));
            ctx.strokeStyle = grad;
            ctx.globalAlpha = a * 0.5;     // faint halo
            ctx.lineWidth = 3.2;
            curve();
            ctx.globalAlpha = a;           // hairline core
            ctx.lineWidth = isPrereq ? 1.2 : 1.0;
            curve();

            // Photon — one long luminous dash gliding the curve. LINEAR and
            // seamless: the offset advances exactly one dash period per cycle.
            // Dash is in world units (×k), matching the SVG dasharray.
            if (photonOn) {
                const photonColor = isPrereq ? '#f7d27d' : (relationColor(e.relation_type) || '#cfe0f5');
                const dur = isPrereq ? 4.4 : 3.6;
                const dash = isPrereq ? [54 * k, 680 * k] : [60 * k, 640 * k];
                const period = isPrereq ? 734 : 700;   // dash + gap, world units
                const flow = reducedMotion ? 0 : (nowSec / dur) % 1;
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = photonColor;
                ctx.setLineDash(dash);
                ctx.lineDashOffset = -flow * period * k;
                ctx.globalAlpha = 0.26 * a;    // diffuse band under the bright core
                ctx.lineWidth = 4.2;
                curve();
                ctx.globalAlpha = a;
                ctx.lineWidth = isPrereq ? 1.0 : 1.15;
                curve();
                ctx.restore();
            }

            // Gold arrowhead on prerequisite edges (old SVG marker-end #arrow).
            if (isPrereq) {
                const ang = Math.atan2(typ - cyp, txp - cxp);
                const s = 0.72 * k;
                const tipX = txp - Math.cos(ang) * 10 * s;
                const tipY = typ - Math.sin(ang) * 10 * s;
                ctx.globalAlpha = a;
                ctx.fillStyle = '#f0c050';
                ctx.beginPath();
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(tipX - Math.cos(ang - 0.46) * 11 * s, tipY - Math.sin(ang - 0.46) * 11 * s);
                ctx.lineTo(tipX - Math.cos(ang + 0.46) * 11 * s, tipY - Math.sin(ang + 0.46) * 11 * s);
                ctx.closePath();
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    // ── tour constellation overlay ─────────────────────────────────────────
    // Zoom crossfade: 1 when zoomed out (whole-sky index), 0 when zoomed in.
    // Zero when no constellations are set, so app-without-index / explorer are
    // untouched (ironclad rule 1 — a missing tour-index just means no overlay).
    function constellationT() {
        if (!constellations.length) return 0;
        const { inHi, outHi } = THEME.constellation;
        const k = transform.k;
        if (k <= inHi) return 1;
        if (k >= outHi) return 0;
        return (outHi - k) / (outHi - inHi);
    }

    // Dashed accent-colour spine arcs — drawn above the resting edges, below the
    // stars (per the layer-order rule). One batched stroke per tour (≈19).
    function drawConstellationLines(k, tx, ty, ct) {
        if (ct <= 0.01) return;
        const C = THEME.constellation;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = C.lineWidth;
        ctx.setLineDash([C.dash[0] * k, C.dash[1] * k]);
        for (const c of constellations) {
            ctx.strokeStyle = c.accent;
            ctx.globalAlpha = C.lineAlpha * ct;
            ctx.beginPath();
            for (const [a, b] of c.segments) {
                if (!Number.isFinite(a.x) || !Number.isFinite(b.x)) continue;
                const cp = curveControl({ source: a, target: b });
                ctx.moveTo(a.x * k + tx, a.y * k + ty);
                ctx.quadraticCurveTo(cp.cx * k + tx, cp.cy * k + ty, b.x * k + tx, b.y * k + ty);
            }
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    // Constellation names at each tour's centroid — drawn on top of the stars so
    // they stay readable; records screen boxes for click hit-testing.
    function drawConstellationNames(k, tx, ty, ct) {
        lastConstNames = [];
        if (ct <= 0.01) return;
        const C = THEME.constellation;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${C.nameSize}px 'IBM Plex Mono', monospace`;
        const canSpace = 'letterSpacing' in ctx;
        if (canSpace) ctx.letterSpacing = '1px';
        for (const c of constellations) {
            let sx = 0, sy = 0, n = 0;
            for (const m of c.members) { if (Number.isFinite(m.x)) { sx += m.x; sy += m.y; n++; } }
            if (!n) continue;
            const cx = (sx / n) * k + tx, cy = (sy / n) * k + ty;
            if (cx < -120 || cx > width + 120 || cy < -60 || cy > height + 60) continue;
            ctx.globalAlpha = C.nameAlpha * ct;
            ctx.strokeStyle = 'rgba(4,7,12,0.92)';   // paint-order: halo behind glyphs
            ctx.lineWidth = 3.5;
            ctx.strokeText(c.name, cx, cy);
            ctx.fillStyle = c.accent;
            ctx.fillText(c.name, cx, cy);
            const w = ctx.measureText(c.name).width;
            lastConstNames.push({ id: c.id, x: cx, y: cy, w: w + 18, h: C.nameSize + 14 });
        }
        if (canSpace) ctx.letterSpacing = '0px';
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    function constellationNameAt(px, py) {
        // Topmost-last: iterate in reverse so the last drawn name wins on overlap.
        for (let i = lastConstNames.length - 1; i >= 0; i--) {
            const b = lastConstNames[i];
            if (Math.abs(px - b.x) <= b.w / 2 && Math.abs(py - b.y) <= b.h / 2) return b.id;
        }
        return null;
    }

    function drawStars(k, tx, ty, nowSec) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const margin = 140; // stars are constant screen size; pad by max corona
        // Far-zoom exposure control: hundreds of constant-screen-size stars
        // overlap when zoomed way out; additive compositing would blow out.
        const farZoom = Math.min(1, Math.max(0, (k - 0.18) / (0.6 - 0.18)));
        const sizeMul = 0.55 + 0.45 * farZoom;
        const exposure = 0.30 + 0.70 * farZoom;
        for (const n of nodes) {
            const sx = n.x * k + tx, sy = n.y * k + ty;
            if (sx < -margin || sx > width + margin || sy < -margin || sy > height + margin) continue;
            const v = n.vis || {};
            const meta = starMeta(n);
            const a = animOf(n.id, THEME.star.ambientMix[meta.tier] ?? 0.4);
            const mixC = a.mix.c;
            // Brightness hierarchy: baseOp (with per-star jitter) is the star's
            // ambient magnitude; interaction lifts it toward 1 with the colour.
            const baseOp = meta.baseOp ?? 1;
            const magnitude = baseOp + (1 - baseOp) * mixC;
            const baseAlpha = exposure * a.dim.c * magnitude;
            if (baseAlpha < 0.01) continue;

            const fullColor = domainColor(n);
            const twk = twinkleAlpha(meta, nowSec);
            const stamp = (sp, alpha) => {
                if (alpha < 0.01) return;
                const cr = sp.coronaRadius * sizeMul;
                const br = sp.bodyRadius * sizeMul;
                ctx.globalAlpha = alpha * twk;
                ctx.drawImage(sp.corona, sx - cr, sy - cr, cr * 2, cr * 2);
                ctx.globalAlpha = alpha;
                ctx.drawImage(sp.body, sx - br, sy - br, br * 2, br * 2);
            };

            // Suppressed↔full colour cross-fade (each side skipped when idle).
            if (mixC < 0.98) stamp(sprites.get(ambientColor(fullColor, meta.tier), meta, dpr), baseAlpha * (1 - mixC));
            if (mixC > 0.02) stamp(sprites.get(fullColor, meta, dpr), baseAlpha * mixC);

            // Brightness boost states (the old CSS brightness() filters) — an
            // extra additive pass of the full-colour body.
            let boost = 0;
            if (v.selected) boost = 0.35;
            else if (n.id === hoveredId) boost = 0.3;
            else if (v.onPath) boost = 0.25;
            if (boost > 0) {
                const sp = sprites.get(fullColor, meta, dpr);
                const br = sp.bodyRadius * sizeMul;
                ctx.globalAlpha = baseAlpha * boost;
                ctx.drawImage(sp.body, sx - br, sy - br, br * 2, br * 2);
            }

            // Learning-path state mark — tiny tick tucked outside the core.
            if (lpMode && (v.learned || v.available)) {
                const mx = sx + meta.glow * 0.6, my = sy - meta.glow * 0.6;
                let ma = exposure * a.dim.c;
                if (v.available && !reducedMotion) {
                    const p = (nowSec / 1.5) % 1; // @keyframes pulse: 0.7→1→0.7
                    ma *= 0.85 - 0.15 * Math.cos(TWO_PI * p);
                }
                ctx.globalAlpha = ma;
                ctx.fillStyle = v.learned ? 'rgba(150,230,215,0.95)' : '#fbbf24';
                ctx.beginPath();
                ctx.arc(mx, my, 1.6, 0, TWO_PI);
                ctx.fill();
            }
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    function drawFocusRing(k, tx, ty, nowSec) {
        if (!selectedNode) return;
        const m = starMeta(selectedNode);
        const fade = animOf(selectedNode.id, 1).mix.c; // rides the colour ease-in
        const r = Math.max(m.halo * 0.7, m.core * 5) + 6;
        const sx = selectedNode.x * k + tx, sy = selectedNode.y * k + ty;
        // @keyframes nebluxSelHalo: ring opacity 0.6 → 1 → 0.6 over 3.6s.
        const pulse = (reducedMotion ? 1 : 0.8 - 0.2 * Math.cos(TWO_PI * ((nowSec / 3.6) % 1))) * fade;
        ctx.save();
        const ring = (radius, strokeStyle, lineWidth, alphaScale = 1) => {
            ctx.globalAlpha = pulse * alphaScale;
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.arc(sx, sy, radius, 0, TWO_PI);
            ctx.stroke();
        };
        ring(r + 3, 'rgba(255,255,255,0.26)', 11, 0.35); // .fr-bloom outer haze
        ring(r + 3, 'rgba(255,255,255,0.26)', 5);        // .fr-bloom
        ring(r, 'rgba(255,255,255,0.7)', 3, 0.4);        // .fr-band haze
        ring(r, 'rgba(255,255,255,0.7)', 1.6);           // .fr-band
        ring(r - 4, 'rgba(255,255,255,0.92)', 0.5);      // .fr-edge
        ctx.restore();
    }

    // Grid keys a label can cover (its text box spans ~CW px around the centre).
    const LBL_CW = 96, LBL_CH = 16;

    function drawLabels(k, tx, ty) {
        ctx.lineJoin = 'round';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        const canSpace = 'letterSpacing' in ctx;
        // Node labels recede as the constellation names rise (zoomed out), so the
        // two label layers never fight. 1 when no overlay / zoomed in.
        const labelMul = 1 - curConstT * THEME.constellation.labelFade;

        // Gather visible candidates, then place them strongest-first into an
        // occupancy grid so ambient field labels in dense clusters stop stacking
        // on top of each other. High-priority labels (selected / hovered /
        // related — alpha ≥ 0.9) are always drawn and reserve their cells.
        const cands = [];
        for (const n of nodes) {
            const a = anims.get(n.id);
            if (!a || a.label.c < 0.02 || !a.lastInfo) continue;
            const sx = n.x * k + tx, sy = n.y * k + ty;
            if (sx < -160 || sx > width + 160 || sy < -160 || sy > height + 160) continue;
            cands.push({ a, info: a.lastInfo, sx, sy: sy + a.lastInfo.dy });
        }
        cands.sort((p, q) => (q.a.label.c - p.a.label.c) || ((q.info.field ? 1 : 0) - (p.info.field ? 1 : 0)));

        const occupied = new Set();
        for (const c of cands) {
            const gx = Math.round(c.sx / LBL_CW), gy = Math.round(c.sy / LBL_CH);
            const strong = c.a.label.c >= 0.9;
            const key = gx + ',' + gy, keyL = (gx - 1) + ',' + gy, keyR = (gx + 1) + ',' + gy;
            if (!strong && (occupied.has(key) || occupied.has(keyL) || occupied.has(keyR))) continue;
            occupied.add(key);
            const info = c.info;
            ctx.globalAlpha = c.a.label.c * labelMul;
            ctx.font = `${info.size}px 'IBM Plex Mono', monospace`;
            if (canSpace) ctx.letterSpacing = info.field ? THEME.labels.field.spacing : '0px';
            ctx.strokeStyle = 'rgba(4,7,12,0.92)';   // CSS paint-order: stroke
            ctx.lineWidth = 3;
            ctx.strokeText(info.text, c.sx, c.sy);
            ctx.fillStyle = '#d4e4fa';
            ctx.fillText(info.text, c.sx, c.sy);
        }
        if (canSpace) ctx.letterSpacing = '0px';
        ctx.globalAlpha = 1;
    }

    let lastDrawMs = 0;
    function draw(nowMs) {
        // Nothing to paint into yet — skip rather than throw on a 0-size canvas
        // (can happen if the first paint races a not-yet-laid-out / hidden tab).
        if (width <= 0 || height <= 0) { dirty = false; return; }
        const t0 = performance.now();
        const nowSec = nowMs / 1000;
        const dtSec = lastDrawMs ? Math.min(0.1, (nowMs - lastDrawMs) / 1000) : 0.016;
        lastDrawMs = nowMs;
        updateAnims(dtSec);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        const { k, x: tx, y: ty } = transform;
        curConstT = constellationT();
        drawAtmosphere(k, tx, ty);
        drawEdges(k, tx, ty, nowSec);
        drawConstellationLines(k, tx, ty, curConstT);   // above edges, below stars
        drawStars(k, tx, ty, nowSec);
        vignette.draw(ctx, width, height);
        drawConstellationNames(k, tx, ty, curConstT);   // on top, readable
        drawFocusRing(k, tx, ty, nowSec);
        drawLabels(k, tx, ty);
        stats.lastMs = performance.now() - t0;
        stats.frames += 1;
        stats.avgMs += (stats.lastMs - stats.avgMs) / Math.min(stats.frames, 60);
        dirty = false;
    }

    function loop(nowMs) {
        rafId = 0;
        if (!running) return;
        const now = nowMs || performance.now();
        // Continuous when ambient animation runs (twinkle/photon); on-demand
        // (dirty-flag) under prefers-reduced-motion. In quiet mode (mobile +
        // panel open) the ambient redraw is rate-capped, but state changes still
        // paint immediately via `dirty`, so interaction stays fully responsive.
        const throttling = quiet && !reducedMotion && narrowViewport;
        const ambientDue = !throttling || (now - lastDrawMs) >= (1000 / QUIET_FPS);
        if ((!reducedMotion && ambientDue) || dirty) draw(now);
        if (!reducedMotion || dirty) rafId = requestAnimationFrame(loop);
        else running = false;
    }

    function start() {
        running = true;
        if (!rafId) rafId = requestAnimationFrame(loop);
    }

    function notify() {
        dirty = true;
        // rAF never fires while the document is hidden (background tab, headless
        // screenshot tools) — paint state changes synchronously there so the
        // canvas always reflects current state; the rAF loop takes over once
        // the page is visible.
        if (document.hidden) {
            draw(performance.now());
            return;
        }
        start();
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            running = false;
            if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        } else {
            notify();
        }
    });

    window.addEventListener('resize', () => { narrowViewport = window.innerWidth <= 768; resize(); notify(); });
    resize();

    return {
        notify,
        start,
        resize,
        stats,
        get reducedMotion() { return reducedMotion; },
        setTransform(t) { transform = { k: t.k, x: t.x, y: t.y }; notify(); },
        // Rate-cap ambient redraw while a glass panel is open (effective on
        // mobile only — see loop()). Resumes full fidelity when cleared.
        setQuiet(v) { quiet = !!v; if (!quiet) notify(); },
        getTransform() { return transform; },
        setHover(id) { if (hoveredId !== id) { hoveredId = id; notify(); } },
        getHover() { return hoveredId; },
        // Tour constellation overlay. `list` = [{id, name, accent, nodeIds[], segments[[a,b]]}];
        // node ids resolve to live node objects so arcs/centroids track the layout.
        setConstellations(list) {
            const byId = new Map(nodes.map(n => [n.id, n]));
            constellations = (list || []).map(c => ({
                id: c.id, name: c.name, accent: c.accent,
                members: (c.nodeIds || []).map(id => byId.get(id)).filter(Boolean),
                segments: (c.segments || [])
                    .map(([a, b]) => [byId.get(a), byId.get(b)])
                    .filter(([a, b]) => a && b),
            })).filter(c => c.segments.length);
            notify();
        },
        constellationNameAt,
        constellationCount: () => constellations.length,
        constellationT: () => constellationT(),
        setSelected(node) { selectedNode = node || null; notify(); },
        setLpMode(v) { lpMode = !!v; notify(); },
        // test/diagnostic snapshot of what the scene is currently lighting up
        debugCounts() {
            let active = 0, prereq = 0, dimmedNodes = 0;
            for (const e of edges) { const v = e.vis || {}; if (v.highlight || v.prereqPath) active++; if (v.prereqPath) prereq++; }
            for (const n of nodes) { if (n.vis && n.vis.dimmed) dimmedNodes++; }
            return { activeEdges: active, prereqEdges: prereq, dimmedNodes, hasRing: !!selectedNode, running, rafPending: !!rafId, dirty };
        },
        // Replace the node/edge arrays (explorer progressive expand).
        // Prunes stale animation entries to avoid memory leaks.
        setData(newNodes, newEdges) {
            nodes = newNodes;
            edges = newEdges;
            const nodeSet = new Set(newNodes.map(n => n.id));
            for (const id of anims.keys()) { if (!nodeSet.has(id)) anims.delete(id); }
            const edgeSet = new Set(newEdges.map(edgeId));
            for (const id of edgeLit.keys()) { if (!edgeSet.has(id)) edgeLit.delete(id); }
            // Nebulae are domain-anchored — rebuild when the visible set changes.
            nebulae = null;
            // Constellation refs point at the old node objects — drop them (only
            // the app sets constellations, and it never swaps its data).
            constellations = []; lastConstNames = [];
            notify();
        },
    };
}
