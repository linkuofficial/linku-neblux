const RANK = { low: 0, standard: 1, high: 2, critical: 3 };
const MAGNITUDE_RANK = { faint: 0, standard: 1, bright: 2, major: 3, nucleus: 4 };

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function zoomBand(camera, tokens) {
    const zoom = camera.get().zoom;
    if (zoom < tokens.farZoom) return 'overview';
    if (zoom < tokens.midZoom) return 'mid';
    return zoom < tokens.nearZoom ? 'near' : 'close';
}

// Interaction owns the scene semantics. Zoom only decides how much ambient
// structure can fit around that semantic state. A focus must therefore never
// fall back to the old near/far adjacency paths.
function semanticMode(camera, interaction, tokens) {
    if (interaction.focusedNodeId) return 'focused';
    if (interaction.activeConstellationId || interaction.activeWonderId) return 'wonder-active';
    return zoomBand(camera, tokens) === 'overview' ? 'overview' : 'explore';
}

function visibleNodes(index, camera, tokens) {
    const candidates = index.spatial.queryRect(camera.viewportBounds(120));
    const band = zoomBand(camera, tokens);
    const nodes = band === 'overview'
        ? candidates.filter((node) => ['galactic_nucleus', 'domain_core', 'subfield_giant'].includes(node.archetype)
            || node.visualMagnitude === 'nucleus' || node.visualMagnitude === 'major')
        : candidates;
    return { band, candidates, nodes };
}

function nodeFor(index, id) { return index.nodeById?.get(id); }

function uniqueNodes(nodes) {
    const byId = new Map();
    for (const node of nodes) if (node?.id) byId.set(node.id, node);
    return [...byId.values()];
}

function stableProjection(camera) {
    const state = camera.get();
    const viewport = camera.viewport();
    // Pick selection geometry from small screen-space buckets. This is an
    // equivalent to hysteresis for a pure draw-plan function: a slight pan or
    // scroll does not reshuffle the chosen bridges simply because their
    // midpoints crossed an arbitrary pixel boundary.
    const positionStep = 56 / Math.max(state.zoom, 0.01);
    const zoom = Math.exp(Math.round(Math.log(Math.max(state.zoom, 0.01)) / 0.045) * 0.045);
    const x = Math.round(state.x / positionStep) * positionStep;
    const y = Math.round(state.y / positionStep) * positionStep;
    return {
        viewport,
        zoom,
        x,
        y,
        point(node) { return { x: (node.x - x) * zoom + viewport.width / 2, y: (node.y - y) * zoom + viewport.height / 2 }; },
        key: `${x.toFixed(3)}:${y.toFixed(3)}:${zoom.toFixed(4)}:${viewport.width}x${viewport.height}`,
    };
}

function edgeMetric(edge, index, projection) {
    const source = nodeFor(index, edge.source);
    const target = nodeFor(index, edge.target);
    if (!source || !target) return null;
    const start = projection.point(source);
    const end = projection.point(target);
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    const degree = Math.min(index.adjacency.get(edge.source)?.length || 0, index.adjacency.get(edge.target)?.length || 0);
    const nodeImportance = (RANK[source.labelPriority] ?? 0) + (RANK[target.labelPriority] ?? 0)
        + (MAGNITUDE_RANK[source.visualMagnitude] ?? 0) + (MAGNITUDE_RANK[target.visualMagnitude] ?? 0);
    return { edge, start, end, length, degree, nodeImportance, priority: Number(edge.priority) || 0 };
}

function compareMetrics(a, b) {
    return b.priority - a.priority
        || b.nodeImportance - a.nodeImportance
        || b.degree - a.degree
        || a.length - b.length
        || a.edge.id.localeCompare(b.edge.id);
}

function segmentCells(metric, cellSize) {
    const distance = Math.max(1, metric.length);
    const steps = clamp(Math.ceil(distance / cellSize), 1, 5);
    const cells = new Set();
    for (let step = 0; step <= steps; step += 1) {
        const t = step / steps;
        const x = metric.start.x + (metric.end.x - metric.start.x) * t;
        const y = metric.start.y + (metric.end.y - metric.start.y) * t;
        cells.add(`${Math.floor(x / cellSize)}:${Math.floor(y / cellSize)}`);
    }
    return [...cells];
}

function exploreBudget(camera) {
    const { width, height } = camera.viewport();
    const area = Math.max(1, width * height);
    const zoom = camera.get().zoom;
    const viewportScale = clamp(Math.sqrt(area) / 900, 0.65, 1.45);
    const zoomScale = clamp(1 / Math.sqrt(Math.max(zoom, 0.2)), 0.55, 1.45);
    return {
        edgeCount: clamp(Math.round(48 * viewportScale * zoomScale), 12, 80),
        screenLength: clamp(Math.round(area * 0.024), 3200, 36000),
        cellSize: clamp(Math.round(150 / Math.sqrt(Math.max(zoom, 0.25))), 96, 180),
        cellCapacity: clamp(Math.round(area / 550000), 1, 3),
    };
}

function edgeKind(edge, activeNodeIds) {
    if (activeNodeIds.size && activeNodeIds.has(edge.source) && activeNodeIds.has(edge.target)) return 'wonder-context';
    return 'explore-bridge';
}

function selectExploreEdges(index, camera, activeNodeIds = new Set()) {
    // The wider-than-visible pool prevents an edge from being repeatedly
    // admitted/removed at the viewport boundary during a small pan.
    const padded = index.spatial.queryRect(camera.viewportBounds(240));
    const paddedIds = new Set(padded.map((node) => node.id));
    const edgeIds = new Set();
    for (const node of padded) for (const edge of index.adjacency.get(node.id) || []) {
        if (paddedIds.has(edge.source) && paddedIds.has(edge.target)) edgeIds.add(edge.id);
    }
    const projection = stableProjection(camera);
    const ranked = [...edgeIds]
        .map((id) => index.edgeById.get(id))
        .filter(Boolean)
        .map((edge) => edgeMetric(edge, index, projection))
        .filter(Boolean)
        .sort((a, b) => {
            const wonderBoostA = activeNodeIds.has(a.edge.source) && activeNodeIds.has(a.edge.target) ? 1 : 0;
            const wonderBoostB = activeNodeIds.has(b.edge.source) && activeNodeIds.has(b.edge.target) ? 1 : 0;
            return wonderBoostB - wonderBoostA || compareMetrics(a, b);
        });
    const budget = exploreBudget(camera);
    const occupancy = new Map();
    let usedLength = 0;
    const selected = [];
    for (const metric of ranked) {
        if (selected.length >= budget.edgeCount || usedLength + metric.length > budget.screenLength) continue;
        const cells = segmentCells(metric, budget.cellSize);
        if (cells.some((cell) => (occupancy.get(cell) || 0) >= budget.cellCapacity)) continue;
        selected.push(metric.edge);
        usedLength += metric.length;
        for (const cell of cells) occupancy.set(cell, (occupancy.get(cell) || 0) + 1);
    }
    return {
        edges: selected,
        edgeKinds: Object.fromEntries(selected.map((edge) => [edge.id, edgeKind(edge, activeNodeIds)])),
        budget: { ...budget, usedScreenLength: Math.round(usedLength), densityCells: occupancy.size },
        candidateCount: ranked.length,
        stabilityKey: projection.key,
    };
}

function focusBudget(camera, tokens) {
    const { width, height } = camera.viewport();
    const area = Math.max(1, width * height);
    const configured = Number.isFinite(tokens.focusStaticCount) ? tokens.focusStaticCount : 16;
    const primary = clamp(Math.round(Math.sqrt(area) / 75), 8, configured);
    return { primary, secondary: clamp(Math.floor(primary * 0.35), 2, 6) };
}

function selectFocusedEdges(index, camera, focusedNodeId, tokens) {
    const focusEdges = [...(index.adjacency.get(focusedNodeId) || [])];
    const projection = stableProjection(camera);
    const rankedFocus = focusEdges
        .map((edge) => edgeMetric(edge, index, projection))
        .filter(Boolean)
        .sort(compareMetrics);
    const budget = focusBudget(camera, tokens);
    const primary = rankedFocus.slice(0, budget.primary).map((metric) => metric.edge);
    const primaryIds = new Set(primary.map((edge) => edge.id));
    const directNeighbors = new Set(primary.map((edge) => edge.source === focusedNodeId ? edge.target : edge.source));
    const secondaryIds = new Set();
    for (const id of directNeighbors) for (const edge of index.adjacency.get(id) || []) {
        if (!primaryIds.has(edge.id) && edge.source !== focusedNodeId && edge.target !== focusedNodeId) secondaryIds.add(edge.id);
    }
    const secondary = [...secondaryIds]
        .map((id) => index.edgeById.get(id))
        .filter(Boolean)
        .map((edge) => edgeMetric(edge, index, projection))
        .filter(Boolean)
        .sort(compareMetrics)
        .slice(0, budget.secondary)
        .map((metric) => metric.edge);
    return {
        edges: [...primary, ...secondary],
        edgeKinds: Object.fromEntries([
            ...primary.map((edge) => [edge.id, 'focus-primary']),
            ...secondary.map((edge) => [edge.id, 'focus-context']),
        ]),
        primaryEdgeIds: primary.map((edge) => edge.id),
        secondaryEdgeIds: secondary.map((edge) => edge.id),
        budget,
        candidateCount: focusEdges.length + secondaryIds.size,
        stabilityKey: projection.key,
    };
}

function legacyMode(semantic, band) {
    if (semantic === 'focused') return 'focus';
    if (semantic === 'overview') return 'far';
    return band === 'mid' ? 'mid' : 'near';
}

export function buildDrawPlan({ index, camera, interaction = {}, tokens }) {
    const { band, candidates, nodes: visible } = visibleNodes(index, camera, tokens);
    const semantic = semanticMode(camera, interaction, tokens);
    const activeNodeIds = new Set(Array.isArray(interaction.activeConstellationNodeIds) ? interaction.activeConstellationNodeIds : []);
    let selection = { edges: [], edgeKinds: {}, budget: null, candidateCount: 0, stabilityKey: null, primaryEdgeIds: [], secondaryEdgeIds: [] };
    if (semantic === 'focused') {
        selection = selectFocusedEdges(index, camera, interaction.focusedNodeId, tokens);
    } else if (semantic === 'explore' || semantic === 'wonder-active') {
        selection = selectExploreEdges(index, camera, activeNodeIds);
    }
    const edgeNodeIds = new Set(selection.edges.flatMap((edge) => [edge.source, edge.target]));
    const edgeNodes = [...edgeNodeIds].map((id) => nodeFor(index, id)).filter(Boolean);
    const focusedNode = semantic === 'focused' ? nodeFor(index, interaction.focusedNodeId) : null;
    const nodes = uniqueNodes([...visible, ...edgeNodes, focusedNode]);
    return {
        // `mode` stays on the legacy vocabulary until renderer integration is
        // complete. New rendering code must read semanticMode/zoomBand.
        mode: legacyMode(semantic, band),
        semanticMode: semantic,
        zoomBand: band,
        nodes,
        edges: selection.edges,
        edgePlan: {
            kind: semantic === 'focused' ? 'focus-local' : semantic === 'overview' ? 'none' : semantic === 'wonder-active' ? 'wonder-adaptive' : 'explore-adaptive',
            primaryEdgeIds: selection.primaryEdgeIds || selection.edges.map((edge) => edge.id),
            secondaryEdgeIds: selection.secondaryEdgeIds || [],
            edgeKinds: selection.edgeKinds,
            budget: selection.budget,
            candidateCount: selection.candidateCount,
            stabilityKey: selection.stabilityKey,
        },
        nodeCandidates: candidates.length,
        edgeCandidates: selection.candidateCount,
    };
}

export function labelRank(node, interaction = {}) {
    if (node.id === interaction.keyboardNodeId || node.id === interaction.focusedNodeId) return 100;
    if (node.overlays.includes('selected')) return 90;
    if (node.overlays.includes('guided_spine')) return 80;
    return RANK[node.labelPriority] ?? 1;
}
