import { labelRank } from './lod-policy.js';

const CONTEXT_RANK = Object.freeze({
    selected: 800,
    keyboard: 800,
    hovered: 790,
    activeWonderStation: 700,
    // A rest-state Wonder remains discoverable, but it must not evict a
    // Domain core or a direct local relation. An *active station* is the
    // stronger navigation state and therefore has its own rank above.
    wonder: 450,
    domainCore: 600,
    related: 500,
    guided: 490,
    contextualCritical: 400,
    contextualHigh: 350,
    contextual: 300,
    ambient: 100,
});

const NODE_PLACEMENTS = Object.freeze([{ dx: 10, dy: 0, align: 'start' }]);
const WONDER_PLACEMENTS = Object.freeze([
    { dx: 0, dy: -14, align: 'center' }, { dx: 0, dy: -34, align: 'center' },
    { dx: 22, dy: -8, align: 'start' }, { dx: -22, dy: -8, align: 'end' },
    { dx: 0, dy: 18, align: 'center' }, { dx: 42, dy: -25, align: 'start' },
    { dx: -42, dy: -25, align: 'end' }, { dx: 0, dy: 38, align: 'center' },
]);

function overlaps(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function contains(rect, box) {
    return box.x >= rect.x && box.y >= rect.y
        && box.x + box.width <= rect.x + rect.width && box.y + box.height <= rect.y + rect.height;
}

function normalizedRect(rect) {
    if (!rect || !Number.isFinite(rect.width) || !Number.isFinite(rect.height)) return null;
    const x = Number.isFinite(rect.x) ? rect.x : 0;
    const y = Number.isFinite(rect.y) ? rect.y : 0;
    return { x, y, width: Math.max(0, rect.width), height: Math.max(0, rect.height) };
}

function estimatedTextWidth(text, fontSize) {
    // Canvas measurement is deliberately avoided: this module must be fully
    // deterministic in the Node test harness as well as in Canvas.
    return Math.max(28, String(text).length * fontSize * 0.66 + 10);
}

function overlaySet(node) { return new Set(Array.isArray(node?.overlays) ? node.overlays : []); }
function hasOverlay(node, overlay) { return overlaySet(node).has(overlay); }

function labelState(node, interaction) {
    const selected = node.id === interaction.keyboardNodeId || node.id === interaction.focusedNodeId || hasOverlay(node, 'selected');
    const hovered = node.id === interaction.hoveredNodeId;
    const related = hasOverlay(node, 'related');
    const guided = hasOverlay(node, 'guided_spine');
    return { selected, hovered, related, guided, emphasized: selected || hovered || related || guided };
}

function shouldDrawLabel(node, interaction) {
    const state = labelState(node, interaction);
    if (hasOverlay(node, 'filtered')) return state.selected;
    if (hasOverlay(node, 'dimmed')) return state.emphasized;
    return true;
}

function nodeContext(node, interaction) {
    const state = labelState(node, interaction);
    if (state.selected) return 'selected';
    if (node.id === interaction.keyboardNodeId) return 'keyboard';
    if (state.hovered) return 'hovered';
    if (state.related || state.guided) return 'related';
    if (node.archetype === 'domain_core' || node.archetype === 'galactic_nucleus') return 'domainCore';
    if (node.labelPriority === 'critical') return 'contextualCritical';
    if (node.labelPriority === 'high') return 'contextualHigh';
    if (node.labelPriority === 'standard') return 'contextual';
    return 'ambient';
}

function contextRank(candidate) {
    const explicit = candidate.context?.priority;
    if (Number.isFinite(explicit)) return explicit;
    const context = candidate.context || {};
    if (context.selected || context.keyboard) return CONTEXT_RANK.selected;
    if (context.hovered) return CONTEXT_RANK.hovered;
    if (context.activeWonderStation) return CONTEXT_RANK.activeWonderStation;
    if (context.wonder || candidate.kind === 'wonder') return CONTEXT_RANK.wonder;
    if (context.domainCore) return CONTEXT_RANK.domainCore;
    if (context.related) return CONTEXT_RANK.related;
    if (context.guided) return CONTEXT_RANK.guided;
    if (context.contextual === 'critical') return CONTEXT_RANK.contextualCritical;
    if (context.contextual === 'high') return CONTEXT_RANK.contextualHigh;
    if (context.contextual) return CONTEXT_RANK.contextual;
    return CONTEXT_RANK.ambient;
}

function normalizeAnchor(candidate) {
    const anchor = candidate?.anchor || candidate;
    if (!Number.isFinite(anchor?.x) || !Number.isFinite(anchor?.y)) return null;
    return { x: anchor.x, y: anchor.y };
}

function normalizeCandidate(input, index, defaults) {
    if (!input || typeof input !== 'object') return null;
    const anchor = normalizeAnchor(input);
    const text = String(input.text ?? input.label ?? input.name ?? '');
    const id = typeof input.id === 'string' && input.id ? input.id : null;
    if (!anchor || !text || !id) return null;
    const fontSize = Number.isFinite(input.fontSize) && input.fontSize > 0 ? input.fontSize : defaults.fontSize;
    const padding = Number.isFinite(input.padding) && input.padding >= 0 ? input.padding : defaults.padding;
    const kind = input.kind || 'node';
    const placements = Array.isArray(input.placements) && input.placements.length
        ? input.placements : kind === 'wonder' ? WONDER_PLACEMENTS : NODE_PLACEMENTS;
    return {
        ...input,
        id,
        text,
        kind,
        anchor,
        fontSize,
        padding,
        width: Number.isFinite(input.width) && input.width > 0 ? input.width : estimatedTextWidth(text, fontSize),
        height: Number.isFinite(input.height) && input.height > 0 ? input.height : fontSize + 8,
        placements,
        semanticRank: contextRank(input),
        priority: Number.isFinite(input.priority) ? input.priority : 0,
        sourceIndex: index,
    };
}

function placementBox(candidate, placement) {
    const x = candidate.anchor.x + (Number(placement.dx) || 0);
    const y = candidate.anchor.y + (Number(placement.dy) || 0);
    const align = placement.align === 'center' || placement.align === 'end' ? placement.align : 'start';
    const left = align === 'center' ? x - candidate.width / 2 : align === 'end' ? x - candidate.width : x;
    // Wonder labels use a baseline; node labels are vertically centred on the
    // star. The small convention difference is expressed by placement dy,
    // while collision always works with the same screen-space box.
    const top = candidate.kind === 'wonder' ? y - candidate.height + 2 : y - candidate.height / 2;
    return { x: left - candidate.padding, y: top - candidate.padding, width: candidate.width + candidate.padding * 2, height: candidate.height + candidate.padding * 2, baselineX: x, baselineY: y, align };
}

function gridKeys(box, cellSize) {
    const keys = [];
    const minX = Math.floor(box.x / cellSize); const maxX = Math.floor((box.x + box.width) / cellSize);
    const minY = Math.floor(box.y / cellSize); const maxY = Math.floor((box.y + box.height) / cellSize);
    for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) keys.push(`${x}:${y}`);
    return keys;
}

function normalizedPrevious(state) {
    if (state instanceof Set) return state;
    if (Array.isArray(state)) return new Set(state);
    if (Array.isArray(state?.acceptedIds)) return new Set(state.acceptedIds);
    return new Set();
}

/**
 * Shared, deterministic screen-space label allocator.
 *
 * Candidate contract:
 * { id, kind: 'node'|'wonder'|string, text, anchor:{x,y}, priority?,
 *   context?: { selected, keyboard, hovered, activeWonderStation, wonder,
 *     domainCore, related, guided, contextual:'critical'|'high'|true,
 *     priority? }, fontSize?, padding?, width?, height?, placements? }
 *
 * `reservedRects` and `safeRect` are CSS-pixel rectangles. Retain the
 * returned `state` and feed it back as `previous` on the next camera frame:
 * it gives equal-priority labels a small deterministic retention advantage
 * without ever allowing overlap or overriding a higher semantic context.
 */
export function layoutLabelCandidates(inputCandidates, {
    viewport,
    safeRect,
    constrainToViewport = true,
    reservedRects = [],
    previous,
    cellSize = 96,
    fontSize = 12,
    padding = 2,
    hysteresis = 8,
} = {}) {
    const normalizedViewport = normalizedRect(viewport) || { x: 0, y: 0, width: Infinity, height: Infinity };
    const safe = normalizedRect(safeRect) || (constrainToViewport ? normalizedViewport : null);
    const reserved = reservedRects.map(normalizedRect).filter(Boolean);
    const retainedIds = normalizedPrevious(previous);
    const candidates = (Array.isArray(inputCandidates) ? inputCandidates : [])
        .map((candidate, index) => normalizeCandidate(candidate, index, { fontSize, padding }))
        .filter(Boolean)
        .sort((a, b) => {
            const retentionA = retainedIds.has(a.id) ? hysteresis : 0;
            const retentionB = retainedIds.has(b.id) ? hysteresis : 0;
            return (b.semanticRank - a.semanticRank)
                || ((b.priority + retentionB) - (a.priority + retentionA))
                || a.id.localeCompare(b.id);
        });
    const grid = new Map();
    const accepted = [];
    const size = Math.max(16, Number(cellSize) || 96);

    for (const candidate of candidates) {
        let placed = null;
        for (const placement of candidate.placements) {
            const paddedBox = placementBox(candidate, placement || {});
            const visibleBox = {
                x: paddedBox.x + candidate.padding, y: paddedBox.y + candidate.padding,
                width: paddedBox.width - candidate.padding * 2, height: paddedBox.height - candidate.padding * 2,
            };
            if ((safe && !contains(safe, paddedBox)) || reserved.some((rect) => overlaps(rect, paddedBox))) continue;
            const nearby = new Set(gridKeys(paddedBox, size).flatMap((key) => grid.get(key) || []));
            if ([...nearby].some((item) => overlaps(item.paddedBox, paddedBox))) continue;
            placed = {
                ...candidate,
                x: paddedBox.baselineX,
                y: paddedBox.baselineY,
                align: paddedBox.align,
                box: visibleBox,
                paddedBox,
                retained: retainedIds.has(candidate.id),
            };
            break;
        }
        if (!placed) continue;
        accepted.push(placed);
        for (const key of gridKeys(placed.paddedBox, size)) {
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key).push(placed);
        }
    }
    const acceptedIds = accepted.map((item) => item.id);
    return { accepted, acceptedIds, gridSize: grid.size, state: { acceptedIds } };
}

function nodeCandidate(node, camera, interaction, center, fontSize) {
    const point = camera.worldToScreen(node);
    const state = labelState(node, interaction);
    const contextual = node.labelPriority === 'critical' ? 'critical' : node.labelPriority === 'high' ? 'high' : node.labelPriority === 'standard';
    return {
        id: node.id,
        kind: 'node',
        text: node.label,
        anchor: point,
        node,
        fontSize,
        priority: labelRank(node, interaction) * 10 - Math.hypot(point.x - center.x, point.y - center.y) / 1000,
        context: {
            selected: state.selected,
            keyboard: node.id === interaction.keyboardNodeId,
            hovered: state.hovered,
            related: state.related,
            guided: state.guided,
            domainCore: nodeContext(node, interaction) === 'domainCore',
            contextual,
        },
    };
}

// Compatibility wrapper for the current renderer. WP-D can replace this with
// one `layoutLabelCandidates` call containing node and Wonder candidates.
export function layoutLabels(nodes, camera, interaction = {}, options = {}) {
    const viewport = camera.viewport();
    const center = { x: viewport.width / 2, y: viewport.height / 2 };
    const candidates = (Array.isArray(nodes) ? nodes : [])
        .filter((node) => node && typeof node.id === 'string' && typeof node.label === 'string' && shouldDrawLabel(node, interaction))
        .map((node) => nodeCandidate(node, camera, interaction, center, options.fontSize || 12));
    return layoutLabelCandidates(candidates, { ...options, viewport, constrainToViewport: options.constrainToViewport ?? Boolean(options.safeRect) });
}

// Compatibility wrapper for the current far-field renderer. It intentionally
// delegates to the same allocator, so node and Wonder labels share the exact
// same collision and hysteresis behaviour once WP-D submits one combined set.
export function layoutConstellationLabels(items, options = {}) {
    const candidates = (Array.isArray(items) ? items : []).map((item, index) => ({
        ...item,
        id: String(item?.id || item?.name || index),
        kind: 'wonder',
        text: String(item?.name || ''),
        anchor: { x: item?.x, y: item?.y },
        context: { wonder: true },
        priority: Number.isFinite(item?.priority) ? item.priority : 0,
        fontSize: options.fontSize || 11,
    }));
    return layoutLabelCandidates(candidates, { ...options, constrainToViewport: options.constrainToViewport ?? Boolean(options.safeRect) });
}
