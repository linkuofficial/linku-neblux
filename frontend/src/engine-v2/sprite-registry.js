import { DEFAULT_TOKENS, mergeTokens } from './tokens.js';

function makeCanvas(documentRef, size) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(size, size);
    if (!documentRef?.createElement) return null;
    const canvas = documentRef.createElement('canvas');
    canvas.width = size; canvas.height = size;
    return canvas;
}

function colorFor(node, tokens) { return tokens.colors[node.domains[0]] || tokens.colors.default; }

function paintSilhouette(ctx, archetype, radius, color) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, radius * 0.12);
    ctx.globalAlpha = 0.88;
    if (archetype === 'galactic_nucleus') {
        ctx.beginPath(); ctx.arc(48, 48, radius * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.ellipse(48, 48, radius * 1.4, radius * 0.46, -0.2, 0, Math.PI * 2); ctx.stroke();
    } else if (archetype === 'domain_core') {
        ctx.beginPath(); ctx.arc(48, 48, radius * 0.82, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.arc(48, 48, radius * 1.3, 0, Math.PI * 2); ctx.stroke();
    } else if (archetype === 'subfield_giant') {
        ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.arc(48, 48, radius * 1.45, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(48, 48, radius * 0.86, 0, Math.PI * 2); ctx.fill();
    } else if (archetype === 'bridge_star') {
        ctx.beginPath(); ctx.moveTo(48, 48 - radius); ctx.lineTo(48 + radius, 48); ctx.lineTo(48, 48 + radius); ctx.lineTo(48 - radius, 48); ctx.closePath(); ctx.fill();
    } else if (archetype === 'beacon_star') {
        ctx.beginPath(); ctx.moveTo(48, 48 - radius * 1.2); ctx.lineTo(48 + radius * 0.72, 48 + radius * 0.62); ctx.lineTo(48 - radius * 0.72, 48 + radius * 0.62); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(48, 48 - radius * 1.8); ctx.lineTo(48, 48 + radius * 1.4); ctx.stroke();
    } else if (archetype === 'event_remnant') {
        ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(48, 48, radius, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(48, 48, radius * 0.28, 0, Math.PI * 2); ctx.fill();
    } else if (archetype === 'local_protostar') {
        ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(48, 48, radius * 1.3, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(48, 48, radius * 0.58, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(35, 42, radius * 0.18, 0, Math.PI * 2); ctx.fill();
    } else {
        ctx.beginPath(); ctx.arc(48, 48, radius * 0.72, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
}

export function createSpriteRegistry({ documentRef = globalThis.document, tokens: inputTokens = DEFAULT_TOKENS } = {}) {
    const tokens = mergeTokens(inputTokens);
    const cache = new Map();
    function get(node, dpr = 1) {
        const magnitude = tokens.magnitude[node.visualMagnitude] || tokens.magnitude.standard;
        const color = colorFor(node, tokens);
        const key = `${node.archetype}|${node.visualMagnitude}|${color}|${dpr}`;
        if (cache.has(key)) return cache.get(key);
        const size = Math.ceil(96 * dpr);
        const canvas = makeCanvas(documentRef, size);
        if (!canvas) return { canvas: null, radius: magnitude.core, size: 0 };
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        const radius = Math.min(30, Math.max(2, magnitude.core * 1.8));
        paintSilhouette(ctx, node.archetype, radius, color);
        const entry = { canvas, radius, size: 96 };
        cache.set(key, entry);
        return entry;
    }
    return {
        get,
        draw(ctx, node, x, y, dpr = 1, alpha = 1) {
            const sprite = get(node, dpr);
            if (sprite.canvas) {
                ctx.globalAlpha = alpha;
                ctx.drawImage(sprite.canvas, x - 48, y - 48, 96, 96);
                ctx.globalAlpha = 1;
            } else {
                ctx.fillStyle = colorFor(node, tokens); ctx.globalAlpha = alpha;
                ctx.beginPath(); ctx.arc(x, y, sprite.radius, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
            }
        },
        clear() { cache.clear(); },
        size() { return cache.size; },
    };
}
