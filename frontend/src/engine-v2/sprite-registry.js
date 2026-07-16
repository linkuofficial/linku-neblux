import { DEFAULT_TOKENS, mergeTokens } from './tokens.js';
import { hexA } from '../engine/geometry.js';
import { desaturate, hash01, mixHex } from '../engine/theme.js';

// Deep Field stars, pre-rendered into offscreen canvases and stamped with
// drawImage. A magnitude is a *kind of object*, not a scale factor, so each
// tier picks a distinct paint recipe from the family table below:
//
//   point (faint)     — a sharp dot. No scatter, no corona.
//   disc (standard)   — a small white core with a narrow rim.
//   tight (bright)    — white-hot core, compact scatter, coloured outer rim.
//   bloom (major+)    — the only tier that earns a wide corona, and the only
//                       one (nucleus) that earns diffraction spikes.
//
// Radii come from tokens.magnitude, which tunes core/glow/halo/corona per tier
// rather than deriving them from a single multiplier — see the note there.
// The gradient stop tables descend from frontend/src/engine/star-sprites.js
// (review-locked shared production code, hence mirrored rather than imported);
// the bloom family still matches it stop-for-stop, while the tighter families
// use steeper falloffs that the production single-recipe engine has no way to
// express.

const PAD = 2; // guard ring so the gradient's 0-alpha edge never clips

// Brightness hierarchy per magnitude — mirrors the production starMeta tiers
// (primary 1.0 / secondary ~0.78 / minor ~0.42 with per-star jitter).
// ambientMix is the "restraint" principle: how much of the full domain colour
// the untouched sky keeps per tier (THEME.star.ambientMix — fields vivid,
// dust nearly monochrome); full colour is earned by interaction.
const MAGNITUDE_LIGHT = Object.freeze({
    nucleus: { baseOp: 1, glowAlpha: 1, jitter: 0, ambientMix: 1 },
    major: { baseOp: 1, glowAlpha: 1, jitter: 0, ambientMix: 1 },
    bright: { baseOp: 0.9, glowAlpha: 0.95, jitter: 0.08, ambientMix: 0.6 },
    standard: { baseOp: 0.78, glowAlpha: 0.86, jitter: 0.12, ambientMix: 0.45 },
    faint: { baseOp: 0.42, glowAlpha: 0.62, jitter: 0.16, ambientMix: 0.28 },
});
const SUPPRESS_KEEP_SAT = 0.30; // THEME.star.suppressKeepSat

function coreStops(color) {
    return [
        [0.00, 'rgba(255,255,255,1)'],
        [0.22, 'rgba(255,255,255,0.98)'],
        [0.48, 'rgba(255,255,255,0.78)'],
        [0.70, hexA(color, 0.55)],
        [0.88, hexA(color, 0.22)],
        [1.00, hexA(color, 0)],
    ];
}
function glowStops(color) {
    return [
        [0.00, hexA(color, 0.92)],
        [0.24, hexA(color, 0.58)],
        [0.55, hexA(color, 0.18)],
        [1.00, hexA(color, 0)],
    ];
}
function haloStops(color) {
    return [
        [0.00, hexA(color, 0.32)],
        [0.38, hexA(color, 0.13)],
        [0.78, hexA(color, 0.035)],
        [1.00, hexA(color, 0)],
    ];
}
// The bright tier's scatter has to stop, not trail off: a steeper falloff is
// what separates a compact star from a small bloom.
function tightHaloStops(color) {
    return [
        [0.00, hexA(color, 0.30)],
        [0.30, hexA(color, 0.10)],
        [0.62, hexA(color, 0.02)],
        [1.00, hexA(color, 0)],
    ];
}
function coronaStops(color) {
    return [
        [0.00, hexA(color, 0)],
        [0.30, hexA(color, 0.035)],
        [0.65, hexA(color, 0.012)],
        [1.00, hexA(color, 0)],
    ];
}

function makeCanvas(documentRef, size) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(size, size);
    if (!documentRef?.createElement) return null;
    const canvas = documentRef.createElement('canvas');
    canvas.width = size; canvas.height = size;
    return canvas;
}

function paintRadial(ctx, cx, cy, r, stops) {
    if (!(r > 0)) return;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    for (const [offset, color] of stops) grad.addColorStop(offset, color);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
}

function whiteCore(ctx, cx, cy, r) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0.5, r), 0, Math.PI * 2);
    ctx.fill();
}

// ── Sprite families ────────────────────────────────────────────────────────

// A faint star is a point of light. The outer stops exist only to antialias
// the dot's edge; there is no scatter to speak of.
function paintPoint(ctx, cx, cy, magnitude, color) {
    paintRadial(ctx, cx, cy, magnitude.core, [
        [0.00, 'rgba(255,255,255,1)'],
        [0.58, hexA(color, 0.90)],
        [1.00, hexA(color, 0)],
    ]);
}

// A standard star is a small white disc with a narrow rim — at rest the rim is
// the only place its domain colour appears at all.
function paintDisc(ctx, cx, cy, magnitude, color) {
    paintRadial(ctx, cx, cy, magnitude.halo, [
        [0.00, hexA(color, 0.34)],
        [0.42, hexA(color, 0.12)],
        [1.00, hexA(color, 0)],
    ]);
    paintRadial(ctx, cx, cy, magnitude.core, [
        [0.00, 'rgba(255,255,255,1)'],
        [0.46, 'rgba(255,255,255,0.94)'],
        [0.78, hexA(color, 0.50)],
        [1.00, hexA(color, 0)],
    ]);
}

// A bright star is over-exposed at the centre with a compact scatter and no
// corona — the wide field belongs to the bloom tier alone.
function paintTight(ctx, cx, cy, magnitude, color, glowAlpha) {
    paintRadial(ctx, cx, cy, magnitude.halo, tightHaloStops(color));
    ctx.globalAlpha = glowAlpha;
    paintRadial(ctx, cx, cy, magnitude.glow, glowStops(color));
    ctx.globalAlpha = 1;
    paintRadial(ctx, cx, cy, magnitude.core, coreStops(color));
    whiteCore(ctx, cx, cy, magnitude.core * 0.50);
}

// The full four-layer stack: only this tier blooms.
function paintBloom(ctx, cx, cy, magnitude, color, glowAlpha) {
    paintRadial(ctx, cx, cy, magnitude.halo, haloStops(color));
    ctx.globalAlpha = glowAlpha;
    paintRadial(ctx, cx, cy, magnitude.glow, glowStops(color));
    ctx.globalAlpha = 1;
    paintRadial(ctx, cx, cy, magnitude.core, coreStops(color));
    whiteCore(ctx, cx, cy, magnitude.core * 0.42);
}

const FAMILIES = Object.freeze({ point: paintPoint, disc: paintDisc, tight: paintTight, bloom: paintBloom });

// Diffraction spikes ride in the corona canvas (the wide, faint one) so the
// body sprite stays tight around the star.
function paintSpikes(ctx, cx, cy, length, color) {
    if (!(length > 0) || typeof ctx.createLinearGradient !== 'function') return;
    for (const horizontal of [true, false]) {
        const gradient = horizontal
            ? ctx.createLinearGradient(cx - length, cy, cx + length, cy)
            : ctx.createLinearGradient(cx, cy - length, cx, cy + length);
        if (!gradient?.addColorStop) return;
        gradient.addColorStop(0, hexA(color, 0));
        gradient.addColorStop(0.42, hexA(color, 0.05));
        gradient.addColorStop(0.5, hexA(color, 0.34));
        gradient.addColorStop(0.58, hexA(color, 0.05));
        gradient.addColorStop(1, hexA(color, 0));
        ctx.fillStyle = gradient;
        if (horizontal) ctx.fillRect(cx - length, cy - 0.6, length * 2, 1.2);
        else ctx.fillRect(cx - 0.6, cy - length, 1.2, length * 2);
    }
}

function colorFor(node, tokens) { return tokens.colors[node.domains[0]] || tokens.colors.default; }

export function twinkleAlpha(node, nowMs = 0, reducedMotion = false) {
    if (reducedMotion) return 1;
    const duration = 4500 + hash01(`${node.id}:twinkle-duration`) * 2000;
    const delay = hash01(`${node.id}:twinkle-delay`) * duration;
    const phase = (((nowMs - delay) / duration) % 1 + 1) % 1;
    return 0.925 - 0.075 * Math.cos(Math.PI * 2 * phase);
}

export function createSpriteRegistry({ documentRef = globalThis.document, tokens: inputTokens = DEFAULT_TOKENS } = {}) {
    const tokens = mergeTokens(inputTokens);
    const cache = new Map();
    function light(node) { return MAGNITUDE_LIGHT[node.visualMagnitude] || MAGNITUDE_LIGHT.standard; }
    function get(node, dpr = 1, lit = true) {
        const magnitude = tokens.magnitude[node.visualMagnitude] || tokens.magnitude.standard;
        const fullColor = colorFor(node, tokens);
        const mix = light(node).ambientMix;
        // Ambient (untouched) stars are baked in the suppressed rendition of
        // their domain colour; lit stars use the full colour. Keying on the
        // painted colour dedupes tiers whose ambient mix is already 1.
        const color = lit || mix >= 1 ? fullColor : mixHex(desaturate(fullColor, SUPPRESS_KEEP_SAT), fullColor, mix);
        const key = `${node.visualMagnitude}|${color}|${dpr}`;
        if (cache.has(key)) return cache.get(key);
        const glowAlpha = light(node).glowAlpha;

        // The body canvas hugs the star's actual ink: a faint point needs ~6px,
        // a nucleus ~72px. Sizing per family (rather than off a shared halo) is
        // what lets the small tiers cost almost nothing to cache.
        const bodyExtent = Math.max(magnitude.core, magnitude.glow || 0, magnitude.halo || 0);
        const body = makeCanvas(documentRef, Math.ceil((bodyExtent + PAD) * 2 * dpr));
        if (!body) return { body: null, corona: null, radius: magnitude.core, size: 0 };
        const bctx = body.getContext('2d');
        bctx.scale(dpr, dpr);
        const bc = bodyExtent + PAD;
        (FAMILIES[magnitude.family] || paintDisc)(bctx, bc, bc, magnitude, color, glowAlpha);

        // Corona: the wide faint field around the body, plus the spikes. Only
        // the bloom family declares either, so the other tiers allocate nothing.
        const coronaExtent = Math.max(magnitude.corona || 0, magnitude.spike || 0);
        let corona = null;
        let cc = 0;
        if (coronaExtent > 0) {
            corona = makeCanvas(documentRef, Math.ceil((coronaExtent + PAD) * 2 * dpr));
            cc = coronaExtent + PAD;
            if (corona) {
                const cctx = corona.getContext('2d');
                cctx.scale(dpr, dpr);
                paintRadial(cctx, cc, cc, magnitude.corona, coronaStops(color));
                paintSpikes(cctx, cc, cc, magnitude.spike, color);
            }
        }

        const entry = { body, bodyRadius: bc, corona, coronaRadius: cc, radius: magnitude.core, size: Math.ceil((bodyExtent + PAD) * 2) };
        cache.set(key, entry);
        return entry;
    }
    return {
        get,
        draw(ctx, node, x, y, dpr = 1, alpha = 1, isLit = true) {
            const sprite = get(node, dpr, isLit);
            const lit = light(node);
            const jitter = lit.jitter ? 1 + (hash01(node.id) - 0.5) * lit.jitter : 1;
            const a = Math.max(0, Math.min(1, alpha * lit.baseOp * jitter));
            if (sprite.body) {
                ctx.globalAlpha = a;
                if (sprite.corona) ctx.drawImage(sprite.corona, x - sprite.coronaRadius, y - sprite.coronaRadius, sprite.coronaRadius * 2, sprite.coronaRadius * 2);
                ctx.drawImage(sprite.body, x - sprite.bodyRadius, y - sprite.bodyRadius, sprite.bodyRadius * 2, sprite.bodyRadius * 2);
                ctx.globalAlpha = 1;
            } else {
                ctx.fillStyle = colorFor(node, tokens); ctx.globalAlpha = a;
                ctx.beginPath(); ctx.arc(x, y, sprite.radius, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
            }
        },
        clear() { cache.clear(); },
        size() { return cache.size; },
    };
}
