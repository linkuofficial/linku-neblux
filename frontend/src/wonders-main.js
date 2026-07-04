// Wonders — curated curiosity tours over the knowledge graph.
//
// A "wonder" is a hand-authored JSON (data/wonders/<id>.json): an ordered list
// of steps, each anchored to a graph node (ref) or a tour-local node (local),
// carrying a curiosity loop — hook → reveal → example → surprise → thread.
// The page builds the step subgraph, lays it out with d3-force, renders it on
// the shared Deep Field canvas engine, and walks a narrative panel step by
// step, focusing the sky on each node. No quizzes, no scores — just wonder.

import * as d3 from "d3";
import { createCanvasRenderer, ensureVis } from "./engine/canvas-renderer.js";

// ===== TOKENS =====
const DC = window.NebluxTokens?.DOMAIN_COLORS || {
    MAT: '#5b9bd5', PHY: '#c97a5b', CHE: '#c9c05b', BIO: '#5bc97a',
    MED: '#5bc9b8', ENG: '#9b7bc9', TEC: '#c95b9b', SOC: '#c9a05a',
    HUM: '#7ba5c9', PHI: '#9bc95b', ART: '#c95b5b', HIS: '#a07850'
};
const RC = window.NebluxTokens?.RELATION_COLORS || {
    logical: '#5b9bd5', historical: '#c9a05a', applied: '#5bc97a',
    conceptual: '#9b7bc9', causal: '#c95b5b'
};
const TYPE_SIZE = { field: 14, concept: 7, person: 10, event: 12 };

// Available tours, in picker order. Lead with the widest-appeal wonders; keep a
// 7-step tour first so the picker preview always shows a full row of dots.
const WONDER_IDS = [
    'black-holes', 'quantum', 'infinity', 'the-mind', 'the-gene', 'light',
    'chaos', 'symmetry', 'the-atom', 'emergence', 'networks', 'arrow-of-time',
    'computation', 'edge-ai', 'language', 'markets', 'music', 'germs', 'ideas-that-spread'
];

// ===== UI STRINGS =====
const UI = {
    en: {
        hdrTitle: 'Neblux Wonders', home: 'Home', graph: 'Graph', tours: 'Tours', progress: 'Tour progress',
        loading: 'Loading…', retry: 'Retry',
        tagHook: 'A QUESTION', tagExample: 'FOR INSTANCE', tagSurprise: 'THE TWIST',
        cueNext: 'Up next', cueOutward: 'Go further', recWhy: 'from “{via}”, keep falling',
        start: 'Begin the tour', wander: 'Wander the graph', otherTours: 'Explore other wonders →',
        steps: 'steps', hint: '✦ Tap any star to jump to its step',
        pickerKicker: 'Wonders', pickerTitle: 'Choose a wonder',
        pickerSubtitle: 'Pick a thread of curiosity and follow it, step by step.',
        cardGo: 'Take this tour →',
        errLoad: "Couldn't load this tour.",
    },
    zh: {
        hdrTitle: 'Neblux 驚奇之旅', home: '首頁', graph: '圖譜', tours: '驚奇之旅', progress: '旅程進度',
        loading: '載入中…', retry: '重試',
        tagHook: '先想想', tagExample: '舉個例', tagSurprise: '意外的是',
        cueNext: '接下來', cueOutward: '想真的學會', recWhy: '從『{via}』，繼續往下墜',
        start: '開始這趟', wander: '漫遊整張圖', otherTours: '探索其他主題 →',
        steps: '步', hint: '✦ 點任一顆星，就能跳到那一步',
        pickerKicker: '驚奇之旅', pickerTitle: '選一趟驚奇之旅',
        pickerSubtitle: '挑一條好奇的線索，一步步跟著它走。',
        cardGo: '走這一趟 →',
        errLoad: '這趟旅程載入失敗。',
    },
    ja: {
        hdrTitle: 'Neblux Wonders', home: 'ホーム', graph: 'グラフ', tours: 'ツアー', progress: 'ツアーの進捗',
        loading: '読み込み中…', retry: '再試行',
        tagHook: 'まず考えて', tagExample: 'たとえば', tagSurprise: '意外にも',
        cueNext: '次は', cueOutward: 'さらに先へ', recWhy: '「{via}」から、もっと深くへ',
        start: 'ツアーを始める', wander: 'グラフを散歩する', otherTours: '他のツアーへ →',
        steps: 'ステップ', hint: '✦ 星をタップして、その歩へ',
        pickerKicker: 'Wonders', pickerTitle: 'ツアーを選ぶ',
        pickerSubtitle: '好奇心の糸を一つ選んで、一歩ずつたどってみましょう。',
        cardGo: 'このツアーへ →',
        errLoad: 'このツアーを読み込めませんでした。',
    },
};

// ===== STATE =====
let LANG = (localStorage.getItem('neblux-lang') || document.documentElement.lang || 'en').toLowerCase();
if (LANG.startsWith('zh')) LANG = 'zh';
else if (LANG.startsWith('ja')) LANG = 'ja';
else LANG = 'en';

let wonder = null;
let wonderId = null;          // current tour id, for deep-link URL sync
let graphNodes = null;        // cached full-graph nodes (loaded once)
let pickerMetas = null;       // cached [{id, wonder}] for the picker
let labelMap = {};            // id -> localized label string (non-en)
let graphLabelById = {};      // id -> English label (for via nodes not in the subgraph)
let tourIndex = null;         // reverse index (tours/nodes/related); lazy + non-blocking
let relatedWonderCache = {};  // tour id -> wonder JSON, for endgame recommendation cards
let nodes = [];               // subgraph node objects (sim mutates x/y)
let edges = [];               // subgraph link objects (sim mutates source/target)
let nodeById = {};
let stepNodeIds = [];         // step index -> node id
let adjacency = {};           // id -> Set of neighbor ids
let starMetaMap = {};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer = null, sim = null, canvasSel = null, zoomBehavior = null;
let viewTransform = { k: 1, x: 0, y: 0 };
let currentZoom = 1;
let stepIndex = -1;           // -1 = intro not started
let started = false;

// ===== HELPERS =====
function t(k) { return (UI[LANG] || UI.en)[k] ?? UI.en[k] ?? k; }
function pick(obj) { return obj ? (obj[LANG] ?? obj.en ?? '') : ''; }
function nc(n) { return DC[(n.domain && n.domain[0])] || '#888'; }
function nr(n) { return TYPE_SIZE[n.type] || 7; }

function nodeLabel(n) {
    if (n._labelLocal) return pick(n._labelLocal);
    if (LANG !== 'en' && labelMap[n.id]) return labelMap[n.id];
    return n.label || '';
}

function sm(n) {
    return starMetaMap[n.id] || {
        core: nr(n) * 0.3, glow: nr(n), halo: nr(n) * 2, corona: nr(n) * 4,
        glowAlpha: 0.6, baseOp: 0.8, twDur: '5', twDelay: '0', tier: 'minor', degree: 0
    };
}

// Degree-aware bloom radii (mirrors explorer's buildExplorerStarMeta).
function buildStarMeta() {
    const degree = {};
    for (const e of edges) {
        const s = e.source.id || e.source, tg = e.target.id || e.target;
        degree[s] = (degree[s] || 0) + 1;
        degree[tg] = (degree[tg] || 0) + 1;
    }
    starMetaMap = {};
    for (const n of nodes) {
        const d = degree[n.id] || 0;
        const degCap = Math.min(d, 20);
        const tier = n.type === 'field' ? 'primary' : (n.type === 'concept' ? 'secondary' : 'minor');
        // Richer bloom than the full-graph tuning: a tour shows only 6–8 stars on
        // a full-screen canvas, so each one carries more of the scene and is given
        // a more luminous halo/corona to read as a deliberate constellation rather
        // than sparse dots. (This buildStarMeta is Wonders-local; app/explorer use
        // explorer's own.)
        const size = tier === 'primary'
            ? { core: 4.6 + degCap * 0.30, glow: 18 + degCap * 0.9, halo: 38 + degCap * 1.6, corona: 78 + degCap * 2.4 }
            : tier === 'secondary'
                ? { core: 2.3 + degCap * 0.12, glow: 9.5 + degCap * 0.42, halo: 21 + degCap * 0.8, corona: 46 + degCap * 1.3 }
                : { core: 1.5, glow: 5.0, halo: 11, corona: 25 };
        let h = 0;
        for (let i = 0; i < n.id.length; i++) h = ((h << 5) - h + n.id.charCodeAt(i)) | 0;
        h = Math.abs(h);
        const jitter = (h % 100) / 100 - 0.5;
        starMetaMap[n.id] = {
            ...size, degree: d, tier, jitter,
            baseOp: tier === 'primary' ? 1.0 : tier === 'secondary' ? 0.78 + jitter * 0.12 : 0.42 + jitter * 0.16,
            glowAlpha: tier === 'primary' ? 1.0 : tier === 'secondary' ? 0.86 : 0.62,
            twDur: (6.5 + (h % 7) * 0.9).toFixed(2),
            twDelay: ((h % 60) / 10).toFixed(2),
        };
    }
}

function wonderLabelInfo(n, hovered) {
    const v = n.vis || {};
    // Dimmed stars stay quiet — UNLESS hovered. Revealing the name on hover is
    // what tells a first-time visitor every star is a clickable step.
    if (v.dimmed && !hovered) return null;
    const m = sm(n);
    let alpha = 0;
    if (v.selected) alpha = 0.96;
    else if (v.related) alpha = 0.9;
    else if (currentZoom > 0.9) alpha = 0.62;
    else alpha = 0.4;
    if (hovered) alpha = Math.max(alpha, 0.95);
    if (alpha <= 0) return null;
    // The current concept's star (and whatever you hover) carries the biggest
    // label so it visibly pairs with the panel title.
    const base = n.type === 'field' ? 12 : 11;
    return {
        text: nodeLabel(n),
        dy: Math.max(m.halo * 0.5, nr(n) + 12),
        size: (v.selected || hovered) ? base + 4 : base,
        alpha,
        field: n.type === 'field',
    };
}

// ===== DATA =====
async function fetchJson(url, ms = 8000) {
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), ms);
    try {
        const r = await fetch(url, { signal: ctrl.signal });
        if (!r.ok) throw new Error(`${url} → ${r.status}`);
        return await r.json();
    } finally { clearTimeout(tm); }
}

const labelMapCache = { en: {} };
async function loadLabelMap(lang) {
    if (labelMapCache[lang]) { labelMap = labelMapCache[lang]; return; }
    try { labelMap = await fetchJson(`/data/i18n/${lang}.json`, 6000); }
    catch { try { labelMap = await fetchJson(`/data/i18n/en.json`, 6000); } catch { labelMap = {}; } }
    labelMapCache[lang] = labelMap;
}

// Build the step subgraph: resolve ref/local nodes, spine edges + organic edges.
function buildSubgraph(graphNodes) {
    const graphById = {};
    for (const n of graphNodes) graphById[n.id] = n;

    nodes = [];
    stepNodeIds = [];
    const idSet = new Set();

    for (const step of wonder.steps) {
        let node;
        if (step.local) {
            node = {
                id: step.local.id,
                label: pick(step.local.label) || step.local.id,
                _labelLocal: step.local.label,
                type: step.local.type || 'concept',
                domain: step.local.domain || ['TEC'],
            };
        } else {
            const g = graphById[step.ref];
            if (!g) { console.warn('wonder: missing ref node', step.ref); continue; }
            node = { id: g.id, label: g.label, type: g.type, domain: g.domain, _conns: g.connections || [] };
        }
        nodes.push(node);
        stepNodeIds.push(node.id);
        idSet.add(node.id);
    }

    nodeById = {};
    for (const n of nodes) nodeById[n.id] = n;

    // Edges: curated spine first, then organic links among the step nodes.
    const seen = new Set();
    const key = (a, b) => [a, b].sort().join('|');
    edges = [];
    const addEdge = (s, tg, rel) => {
        if (s === tg || !idSet.has(s) || !idSet.has(tg)) return;
        const k = key(s, tg);
        if (seen.has(k)) return;
        seen.add(k);
        edges.push({ source: s, target: tg, relation_type: rel || 'conceptual' });
    };
    for (const e of (wonder.edges || [])) addEdge(e.source, e.target, e.relation_type);
    for (const n of nodes) {
        for (const c of (n._conns || [])) {
            if (!c.pending) addEdge(n.id, c.target, c.relation_type);
        }
    }

    // Adjacency (for related-node highlighting).
    adjacency = {};
    for (const n of nodes) adjacency[n.id] = new Set();
    for (const e of edges) { adjacency[e.source].add(e.target); adjacency[e.target].add(e.source); }
}

// ===== GRAPH ENGINE =====
function initGraph() {
    const W = window.innerWidth, H = window.innerHeight;
    const canvas = document.getElementById('canvas');
    canvasSel = d3.select(canvas);

    buildStarMeta();

    renderer = createCanvasRenderer({
        canvas,
        nodes, edges,
        relationColor: rel => RC[rel] || '#7f8a99',
        domainColor: n => nc(n),
        starMeta: n => sm(n),
        label: wonderLabelInfo,
    });
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => { if (renderer) renderer.notify(); });
    }

    zoomBehavior = d3.zoom().scaleExtent([0.2, 6])
        .filter(ev => {
            if (ev.ctrlKey && ev.type !== 'wheel') return false;
            if (ev.button) return false;
            return true;
        })
        .on('zoom', e => {
            viewTransform = e.transform;
            currentZoom = e.transform.k;
            renderer.setTransform(e.transform);
            renderer.notify();
        });
    canvasSel.call(zoomBehavior);
    canvasSel.on('dblclick.zoom', null);

    canvas.addEventListener('pointermove', e => {
        const [px, py] = d3.pointer(e, canvas);
        const node = findNodeAtScreen(px, py);
        if (node) dismissHint();
        renderer.setHover(node ? node.id : null);
        canvas.style.cursor = node ? 'pointer' : '';
    });
    canvas.addEventListener('pointerleave', () => { renderer.setHover(null); canvas.style.cursor = ''; });

    // Click a star → jump to that step (if it's a tour node).
    canvas.addEventListener('click', e => {
        const [px, py] = d3.pointer(e, canvas);
        const node = findNodeAtScreen(px, py);
        if (!node) return;
        const i = stepNodeIds.indexOf(node.id);
        if (i >= 0) { if (!started) startTour(); goToStep(i); }
    });

    sim = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(edges).id(d => d.id).distance(d => {
            const s = nodeById[d.source.id || d.source];
            const tg = nodeById[d.target.id || d.target];
            if (s && tg && s.type === 'field' && tg.type === 'field') return 150;
            if ((s && s.type === 'field') || (tg && tg.type === 'field')) return 100;
            return 90;
        }).strength(0.35))
        .force('charge', d3.forceManyBody().strength(d => d.type === 'field' ? -500 : -260))
        .force('center', d3.forceCenter(W / 2, H / 2).strength(0.06))
        .force('collision', d3.forceCollide(d => nr(d) + 14))
        .alphaDecay(0.025)
        .on('tick', () => { if (renderer) renderer.notify(); });

    // On resize, keep the (small, curated) layout stable and just re-frame the
    // camera — reheating the sim would make the stars jump while someone reads.
    window.addEventListener('resize', () => {
        if (started && stepIndex >= 0) centerViewOnNode(nodeById[stepNodeIds[stepIndex]], 0);
        else fitView(0);
    });

    window.__nebluxWonders = {
        ready: () => nodes.length > 0,
        nodeIds: () => nodes.map(n => n.id),
        step: () => stepIndex,
        stepCount: () => stepNodeIds.length,
        goToStep,
        debug: () => renderer ? renderer.debugCounts() : {},
    };
}

function findNodeAtScreen(px, py) {
    if (!sim) return null;
    const t = viewTransform;
    const wx = (px - t.x) / t.k, wy = (py - t.y) / t.k;
    const cand = sim.find(wx, wy, 50 / t.k);
    if (!cand) return null;
    const dx = cand.x * t.k + t.x - px, dy = cand.y * t.k + t.y - py;
    const hitR = Math.max(24, nr(cand) + 12);
    return (dx * dx + dy * dy) <= hitR * hitR ? cand : null;
}

// Centre the focused node in the area the panel leaves free: shift X for the
// right-docked panel (desktop) or Y for the bottom sheet (mobile), so the star
// never sits behind the panel.
function centerViewOnNode(node, duration = 600) {
    if (!canvasSel || !zoomBehavior || !node || !Number.isFinite(node.x)) return;
    const W = window.innerWidth, H = window.innerHeight;
    let centerX = W / 2, centerY = H / 2;
    const panel = document.getElementById('wonder-panel');
    if (panel && !panel.hidden) {
        const r = panel.getBoundingClientRect();
        const sideDock = r.top < H * 0.4 && r.width < W * 0.7;
        if (sideDock) centerX = Math.max(140, (W - r.width) / 2);   // right dock → free left area
        else centerY = Math.max(140, r.top / 2);                   // bottom sheet → free area above
    }
    const dur = prefersReducedMotion ? 0 : duration;
    const transform = d3.zoomIdentity.translate(centerX, centerY).scale(1.7).translate(-node.x, -node.y);
    if (dur > 0) canvasSel.transition().duration(dur).call(zoomBehavior.transform, transform);
    else canvasSel.call(zoomBehavior.transform, transform);
}

function fitView(duration = 0) {
    if (!nodes.length) return;
    const W = window.innerWidth, H = window.innerHeight;
    const xs = nodes.map(n => n.x).filter(Number.isFinite);
    const ys = nodes.map(n => n.y).filter(Number.isFinite);
    if (!xs.length) return;
    const x0 = Math.min(...xs) - 60, x1 = Math.max(...xs) + 60;
    const y0 = Math.min(...ys) - 60, y1 = Math.max(...ys) + 60;
    const scale = Math.min(W / (x1 - x0), H / (y1 - y0), 1.6) * 0.9;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const transform = d3.zoomIdentity.translate(W / 2, H / 2).scale(scale).translate(-cx, -cy);
    if (duration > 0) canvasSel.transition().duration(duration).call(zoomBehavior.transform, transform);
    else canvasSel.call(zoomBehavior.transform, transform);
}

// ===== NARRATIVE =====
function setStepVisuals(i) {
    const curId = stepNodeIds[i];
    const neighbors = adjacency[curId] || new Set();
    // Focus: only the current concept and its direct links stay lit + labelled;
    // everything else recedes so the eye knows exactly what this step is about.
    for (const n of nodes) {
        const v = ensureVis(n);
        v.selected = n.id === curId;
        v.related = neighbors.has(n.id);
        v.dimmed = !(v.selected || v.related);
    }
    for (const e of edges) {
        const v = ensureVis(e);
        const sId = e.source.id || e.source, tId = e.target.id || e.target;
        v.highlight = sId === curId || tId === curId;
        v.dimmed = !v.highlight;
    }
    if (renderer) renderer.setSelected(nodeById[curId]);
}

// ===== ENDGAME (outward live links + next-tour recommendations) =====
function escapeHtml(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Render the outward paragraph with the first occurrence of each configured
// match phrase (current language) wrapped in a link to that node on the graph.
// Everything is escaped; only the anchors we build are inserted as markup. A
// tour with no `outward_links` (or whose phrase isn't in this language) renders
// as plain prose — byte-identical to the old inert outward.
function outwardHTML(text, links) {
    const spans = [];
    for (const l of (links || [])) {
        const phrase = l.match && l.match[LANG];
        if (!phrase) continue;
        const idx = text.indexOf(phrase);
        if (idx < 0) continue;                     // phrase not present in this language → skip
        spans.push({ start: idx, end: idx + phrase.length, node: l.node });
    }
    spans.sort((a, b) => a.start - b.start);
    let html = '', pos = 0;
    for (const s of spans) {
        if (s.start < pos) continue;               // drop overlaps, keep the earliest
        html += escapeHtml(text.slice(pos, s.start));
        html += `<a class="wp-outlink" href="app.html?node=${encodeURIComponent(s.node)}">${escapeHtml(text.slice(s.start, s.end))}</a>`;
        pos = s.end;
    }
    html += escapeHtml(text.slice(pos));
    return html;
}

function viaLabel(id) {
    if (LANG !== 'en' && labelMap[id]) return labelMap[id];
    return graphLabelById[id] || id;
}

// Endgame "next tour" cards, from tour-index.related. Async (fetches the related
// tours' titles) and progressive — if the index or a tour file is missing the
// cards simply don't appear (ironclad rule 1). Guards against the reader leaving
// the last step mid-fetch.
async function renderRecs() {
    const box = document.getElementById('wp-recs');
    if (!box) return;
    const myWonder = wonderId;
    const rel = tourIndex && tourIndex.related && tourIndex.related[myWonder];
    if (!rel || !rel.length) { box.hidden = true; box.innerHTML = ''; return; }

    const items = await Promise.all(rel.slice(0, 2).map(async r => {
        let w = relatedWonderCache[r.tour];
        if (w === undefined) {
            try { w = await fetchJson(`/data/wonders/${r.tour}.json`); }
            catch { w = null; }
            relatedWonderCache[r.tour] = w;
        }
        return { tour: r.tour, via: r.via, wonder: w };
    }));

    // Fetches are async — bail if the reader has since left the last step.
    if (wonderId !== myWonder || stepIndex !== wonder.steps.length - 1) return;

    box.innerHTML = '';
    for (const it of items) {
        if (!it.wonder) continue;
        const a = document.createElement('a');
        a.className = 'wp-rec';
        a.href = `wonders.html?w=${it.tour}`;
        const cue = document.createElement('span');
        cue.className = 'wp-rec-cue';
        cue.textContent = t('cueNext');
        const title = document.createElement('span');
        title.className = 'wp-rec-title';
        title.textContent = pick(it.wonder.title);
        const why = document.createElement('span');
        why.className = 'wp-rec-why';
        why.textContent = t('recWhy').replace('{via}', viaLabel(it.via));
        a.append(cue, title, why);
        box.appendChild(a);
    }
    box.hidden = box.children.length === 0;
}

function renderStep(i, recenter = true) {
    const step = wonder.steps[i];
    if (!step) return;
    const last = i === wonder.steps.length - 1;
    const $ = id => document.getElementById(id);

    // Orientation: which tour, where in it, and what concept this step is about.
    $('wp-kicker').textContent = `${pick(wonder.title)}  ·  ${i + 1} / ${wonder.steps.length}`;
    $('wp-title').textContent = nodeLabel(nodeById[stepNodeIds[i]]);
    $('wp-count').textContent = `${i + 1} / ${wonder.steps.length}`;
    // Fill each block and hide it when this step omits that field, so a wonder
    // can skip (say) the example or surprise without leaving an empty box.
    const setBlock = (pid, val) => {
        const p = $(pid);
        p.textContent = val;
        const block = p.closest('.wp-block');
        if (block) block.hidden = !val;
    };
    setBlock('wp-hook', pick(step.hook));
    setBlock('wp-reveal', pick(step.reveal));
    setBlock('wp-example', pick(step.example));
    setBlock('wp-surprise', pick(step.surprise));

    // Thread / closing CTA. Mid-tour, #wp-thread is the "up next" teaser (click to
    // advance). On the last step it gives way to #wp-outward — readable outward
    // prose carrying live links into the graph — plus next-tour recommendations.
    const thread = $('wp-thread');
    const outward = $('wp-outward');
    const recs = $('wp-recs');
    if (last) {
        thread.hidden = true;
        thread.onclick = null;
        const outwardText = pick(wonder.outward) || pick(step.thread);
        outward.hidden = !outwardText;
        outward.dataset.cue = t('cueOutward');
        outward.innerHTML = outwardHTML(outwardText, wonder.outward_links);
        renderRecs();                                  // async + progressive
    } else {
        thread.hidden = false;
        thread.textContent = pick(step.thread);
        thread.dataset.cue = t('cueNext');
        thread.onclick = ev => { ev.preventDefault(); goToStep(i + 1); };
        thread.tabIndex = 0;
        outward.hidden = true; outward.innerHTML = '';
        recs.hidden = true; recs.innerHTML = '';
    }

    // Nav buttons. On the last step the primary exit loops back to the picker
    // ("explore other wonders"); the graph becomes a secondary link.
    $('wp-prev').disabled = i === 0;
    const next = $('wp-next');
    const alt = $('wp-alt');
    if (last) {
        next.textContent = t('otherTours'); next.classList.add('is-wander'); next.disabled = false;
        alt.textContent = t('wander'); alt.hidden = false;
    } else {
        next.textContent = '→'; next.classList.remove('is-wander'); next.disabled = false;
        alt.hidden = true;
    }

    // Progress dots. Keep keyboard focus from dropping to <body> when the dots
    // are rebuilt — a keyboard user mid-tour stays on the (new) active dot.
    const prog = $('wp-progress');
    const dotsHadFocus = prog.contains(document.activeElement);
    prog.innerHTML = '';
    let activeDot = null;
    for (let k = 0; k < wonder.steps.length; k++) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'wp-dot' + (k === i ? ' is-active' : '') + (k < i ? ' is-past' : '');
        dot.setAttribute('aria-label', `${k + 1} / ${wonder.steps.length}`);
        if (k === i) { dot.setAttribute('aria-current', 'step'); activeDot = dot; }
        dot.onclick = () => goToStep(k);
        prog.appendChild(dot);
    }
    if (dotsHadFocus && activeDot) activeDot.focus();
    // Announce the step to screen readers: the per-step title lives outside
    // #wp-body's live region, so prev/next would otherwise be silent.
    const live = $('wp-live');
    if (live) live.textContent = `${nodeLabel(nodeById[stepNodeIds[i]])} · ${i + 1} / ${wonder.steps.length}`;

    setStepVisuals(i);
    if (recenter) centerViewOnNode(nodeById[stepNodeIds[i]]);
}

// First-run nudge that the starfield is interactive. Auto-fades; dismissed on
// the first hover, jump, or step change so it never nags.
let hintTimer = 0, hintDone = false;
function showHint() {
    if (hintDone) return;
    const el = document.getElementById('wonder-hint');
    if (!el) return;
    el.textContent = t('hint');
    el.hidden = false;
    el.classList.remove('is-out');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(dismissHint, 8000);
}
function dismissHint() {
    const el = document.getElementById('wonder-hint');
    if (!el || el.hidden) return; // nothing showing yet → no-op (don't mark done)
    hintDone = true;
    clearTimeout(hintTimer);
    el.classList.add('is-out');
    setTimeout(() => { el.hidden = true; }, 400);
}

function goToStep(i) {
    dismissHint();
    i = Math.max(0, Math.min(wonder.steps.length - 1, i));
    stepIndex = i;
    renderStep(i);
    // Deep link: mirror the current step in the address bar (1-based) so the URL
    // is shareable and reload lands on this exact beat. replaceState (not push) —
    // stepping through a tour shouldn't stack browser-history entries.
    if (wonderId) {
        try { history.replaceState(null, '', `?w=${wonderId}&s=${i + 1}`); } catch {}
    }
}

function startTour(startStep = 0) {
    started = true;
    document.getElementById('wonder-intro').hidden = true;
    const panel = document.getElementById('wonder-panel');
    panel.hidden = false;
    goToStep(startStep);   // goToStep clamps, so an out-of-range deep link is safe
    // Move focus off the now-hidden start button onto the panel so keyboard /
    // screen-reader users land on the narrative.
    panel.focus();
    showHint();
}

// ===== UI / I18N WIRING =====
function applyStaticI18n() {
    const $ = id => document.getElementById(id);
    document.documentElement.lang = LANG === 'zh' ? 'zh-Hant' : LANG;
    $('hdr-title').textContent = t('hdrTitle');
    $('hdr-home-link').textContent = t('home');
    $('hdr-graph-link').textContent = t('graph');
    const toursLink = $('hdr-tours-link');
    if (toursLink) toursLink.textContent = t('tours');
    $('loading-text').textContent = t('loading');
    $('loading-retry').textContent = t('retry');
    $('wi-start').textContent = t('start');
    const progEl = $('wp-progress'); if (progEl) progEl.setAttribute('aria-label', t('progress'));
    document.querySelectorAll('.wp-tag').forEach(el => {
        const tag = el.getAttribute('data-tag');
        el.textContent = tag === 'hook' ? t('tagHook') : tag === 'example' ? t('tagExample') : t('tagSurprise');
    });
    // Active language button.
    document.querySelectorAll('.lang-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.lang === LANG);
    });
    if (wonder) {
        $('wi-kicker').textContent = `${wonder.steps.length} ${t('steps')}`;
        $('wi-title').textContent = pick(wonder.title);
        $('wi-text').textContent = pick(wonder.intro);
    }
}

function setupLangToggle() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            if (lang === LANG) return;
            LANG = lang;
            localStorage.setItem('neblux-lang', lang);
            // Instant: panel/picker copy already lives in the loaded wonder JSON,
            // so swap it right now — no fetch to await, and no camera re-pan
            // (the step hasn't changed, so don't re-run the 600ms fly-to).
            for (const n of nodes) if (n._labelLocal) n.label = pick(n._labelLocal);
            applyStaticI18n();
            if (started && stepIndex >= 0) renderStep(stepIndex, false);
            if (!document.getElementById('wonder-picker').hidden) renderPicker();
            // Only a tour has a graph to relabel; the picker needs no i18n fetch.
            if (renderer) {
                renderer.notify();
                // Background: star labels — and the endgame rec cards' via-labels —
                // need the i18n map (cached after first load). Once it's ready,
                // repaint and re-render the step so localized via-labels land.
                loadLabelMap(lang).then(() => {
                    if (LANG !== lang) return;
                    if (renderer) renderer.notify();
                    if (started && stepIndex >= 0) renderStep(stepIndex, false);
                });
            }
        });
    });
}

function setupKeyboard() {
    window.addEventListener('keydown', e => {
        if (!started) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startTour(); } return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); goToStep(stepIndex + 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); goToStep(stepIndex - 1); }
    });
}

function setLoading(msg, showRetry = false) {
    const wrap = document.getElementById('loading');
    if (!wrap) return;
    if (msg === null) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';
    document.getElementById('loading-text').textContent = msg;
    document.getElementById('loading-retry').style.display = showRetry ? '' : 'none';
}

// ===== PICKER =====
// Premium "alive" cards: a gentle 3-D tilt toward the cursor plus a specular
// sheen that tracks it. Pointer-fine devices only, and never under reduced
// motion. CSS reads --rx/--ry (tilt) and --mx/--my (sheen centre).
const CARD_TILT = !prefersReducedMotion &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;
function attachCardMotion(card) {
    if (!CARD_TILT) return;
    let raf = 0, rect = null;
    const refresh = () => { rect = card.getBoundingClientRect(); };
    // Cache the rect on enter (and promote to its own layer only while active)
    // so pointermove never forces a layout read or pins an idle compositor layer.
    card.addEventListener('pointerenter', () => { refresh(); card.style.willChange = 'transform'; });
    card.addEventListener('pointermove', e => {
        if (!rect) refresh();
        const lx = (e.clientX - rect.left) / rect.width;
        const ly = (e.clientY - rect.top) / rect.height;
        if (raf) return;
        raf = requestAnimationFrame(() => {
            raf = 0;
            const max = 5.5; // degrees
            card.style.setProperty('--ry', ((lx - 0.5) * 2 * max).toFixed(2) + 'deg');
            card.style.setProperty('--rx', (-(ly - 0.5) * 2 * max).toFixed(2) + 'deg');
            card.style.setProperty('--mx', (lx * 100).toFixed(1) + '%');
            card.style.setProperty('--my', (ly * 100).toFixed(1) + '%');
        });
    });
    card.addEventListener('pointerleave', () => {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        card.style.willChange = '';
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--mx', '50%');
        card.style.setProperty('--my', '0%');
    });
}
// The staggered fade-up entrance should play once, not re-cascade every time
// renderPicker() rebuilds the grid (e.g. on a language toggle).
let pickerHasEntered = false;
function renderPicker() {
    const $ = id => document.getElementById(id);
    $('wpk-kicker').textContent = t('pickerKicker');
    $('wpk-title').textContent = t('pickerTitle');
    $('wpk-subtitle').textContent = t('pickerSubtitle');
    const grid = $('wpk-grid');
    grid.innerHTML = '';
    (pickerMetas || []).forEach(({ id, wonder: w }, idx) => {
        const accent = DC[w.accent] || 'var(--accent)';
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'wpk-card';
        // Per-card domain accent + entrance-stagger index drive the CSS (accent
        // glow, sheen, breathing dot, fade-up). See .wpk-card in wonders.css.
        card.style.setProperty('--card-accent', accent);
        card.style.setProperty('--i', String(idx));
        if (!pickerHasEntered) card.classList.add('is-entering');
        const n = (w.steps || []).length;
        const top = document.createElement('div');
        top.className = 'wpk-card-top';
        top.innerHTML = `<span class="wpk-dot"></span><span class="wpk-card-eyebrow">${(w.accent || '').toUpperCase()} · ${n} ${t('steps')}</span>`;
        const title = document.createElement('div');
        title.className = 'wpk-card-title';
        title.textContent = pick(w.title);
        const intro = document.createElement('div');
        intro.className = 'wpk-card-intro';
        intro.textContent = pick(w.intro);
        // A row of N dots previews the journey's length (mirrors the in-tour dots).
        const dots = document.createElement('div');
        dots.className = 'wpk-card-dots';
        dots.setAttribute('aria-hidden', 'true');
        for (let k = 0; k < n; k++) { const d = document.createElement('span'); d.className = 'wpk-card-dot'; dots.appendChild(d); }
        const go = document.createElement('div');
        go.className = 'wpk-card-go';
        go.textContent = t('cardGo');
        card.append(top, title, intro, dots, go);
        card.addEventListener('click', () => {
            // Picker already showed the framing — flag this tour to skip its intro
            // gate and open straight on step one after the reload.
            try { sessionStorage.setItem('wonder-autostart', id); } catch {}
            window.location.search = '?w=' + id;
        });
        attachCardMotion(card);
        grid.appendChild(card);
    });
    pickerHasEntered = true;
}

async function showPicker() {
    document.getElementById('wonder-intro').hidden = true;
    document.getElementById('wonder-panel').hidden = true;
    const metas = await Promise.all(WONDER_IDS.map(id =>
        fetchJson(`/data/wonders/${id}.json`).then(w => ({ id, wonder: w })).catch(() => null)));
    pickerMetas = metas.filter(Boolean);
    renderPicker();
    setLoading(null);
    document.getElementById('wonder-picker').hidden = false;
}

// ===== LOAD A SINGLE WONDER =====
async function loadWonder(id) {
    // The full graph (~1MB) and the i18n label map are only needed for a tour —
    // the picker doesn't touch them, so load them lazily here, not at boot.
    if (!graphNodes) {
        const graph = await fetchJson('/data/all_nodes.json');
        graphNodes = Array.isArray(graph) ? graph : graph.nodes;
    }
    if (!Object.keys(graphLabelById).length) {
        for (const n of graphNodes) graphLabelById[n.id] = n.label;   // via labels for rec cards
    }
    // Reverse index for endgame recommendations — lazy, non-blocking, silent on
    // failure (a missing file just means no rec cards; ironclad rule 1). If it
    // lands after the reader is already at the finale (e.g. a ?s=last deep link),
    // re-render the recs then.
    if (!tourIndex) fetchJson('/data/tour-index.json').then(idx => {
        tourIndex = idx;
        if (started && wonder && stepIndex === wonder.steps.length - 1) renderRecs();
    }).catch(() => {});
    await loadLabelMap(LANG);
    wonder = await fetchJson(`/data/wonders/${id}.json`);
    wonderId = id;
    buildSubgraph(graphNodes);
    if (!nodes.length) throw new Error('empty subgraph');

    initGraph();
    applyStaticI18n();
    setLoading(null);

    // The renderer sizes its canvas from window.innerWidth at creation; if that
    // raced an unsized/hidden tab the backing store can be 0×0, so force a resize
    // once layout is settled before the first meaningful paint.
    renderer.resize();
    sim.alpha(1).restart();

    // Entry routing, in priority order (startStep -1 = show the intro gate):
    //   1. picker autostart (sessionStorage) — visitor already saw the card → step one
    //   2. deep-link ?s=<k> with a valid step — a shared step link → open on it
    //   3. plain ?w=<id> — a direct link with no step → intro card for context
    let startStep = -1;
    try {
        if (sessionStorage.getItem('wonder-autostart') === id) {
            sessionStorage.removeItem('wonder-autostart');
            startStep = 0;
        }
    } catch {}
    if (startStep < 0) {
        const sRaw = new URLSearchParams(window.location.search).get('s');
        const s = sRaw && /^\d+$/.test(sRaw) ? parseInt(sRaw, 10) : NaN;
        if (s >= 1 && s <= wonder.steps.length) startStep = s - 1;   // URL is 1-based
    }
    if (startStep < 0) document.getElementById('wonder-intro').hidden = false;

    // Let the layout settle briefly, then either frame the field (intro) or open
    // on the target step — never both, so the camera isn't yanked.
    setTimeout(() => {
        renderer.resize();
        if (!started) { startStep >= 0 ? startTour(startStep) : fitView(0); }
    }, 700);
}

// ===== BOOT =====
async function boot() {
    applyStaticI18n();
    setupLangToggle();
    setupKeyboard();
    document.getElementById('wp-prev').addEventListener('click', () => goToStep(stepIndex - 1));
    document.getElementById('wp-next').addEventListener('click', () => {
        if (!wonder) return;
        // Last step: loop back to the picker to pick another wonder.
        if (stepIndex === wonder.steps.length - 1) { window.location.href = 'wonders.html'; }
        else goToStep(stepIndex + 1);
    });
    document.getElementById('wp-alt').addEventListener('click', () => { window.location.href = 'app.html'; });
    document.getElementById('wi-start').addEventListener('click', () => startTour());
    document.getElementById('loading-retry').addEventListener('click', boot);

    try {
        setLoading(t('loading'));
        const wid = new URLSearchParams(window.location.search).get('w');
        // Tour loads the graph + labels lazily; picker stays lightweight.
        if (wid && WONDER_IDS.includes(wid)) await loadWonder(wid);
        else await showPicker();
    } catch (err) {
        console.error('wonders boot failed', err);
        setLoading(t('errLoad'), true);
    }
}

boot();
