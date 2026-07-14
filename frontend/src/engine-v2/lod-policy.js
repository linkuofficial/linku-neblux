const RANK = { low: 0, standard: 1, high: 2, critical: 3 };

function visibleNodes(index, camera, interaction, tokens) {
    const bounds = camera.viewportBounds(120);
    const candidates = index.spatial.queryRect(bounds);
    const mode = camera.get().zoom < tokens.farZoom ? 'far' : camera.get().zoom < tokens.midZoom ? 'mid' : camera.get().zoom < tokens.nearZoom ? 'near' : 'focus';
    const nodes = candidates.filter((node) => mode !== 'far' || ['galactic_nucleus', 'domain_core', 'subfield_giant'].includes(node.archetype) || node.visualMagnitude === 'nucleus' || node.visualMagnitude === 'major');
    return { mode, candidates, nodes };
}

export function buildDrawPlan({ index, camera, interaction = {}, tokens }) {
    const { mode, candidates, nodes } = visibleNodes(index, camera, interaction, tokens);
    const nodeIds = new Set(nodes.map((node) => node.id));
    let edges = [];
    if (mode === 'mid') {
        edges = index.midEdges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
    } else if (mode === 'near') {
        const edgeIds = new Set();
        for (const node of candidates) for (const edge of index.adjacency.get(node.id) || []) edgeIds.add(edge.id);
        edges = [...edgeIds].map((id) => index.edgeById.get(id)).filter((edge) => edge && nodeIds.has(edge.source) && nodeIds.has(edge.target));
    } else if (mode === 'focus' && interaction.focusedNodeId) {
        const focusEdges = index.adjacency.get(interaction.focusedNodeId) || [];
        const secondHop = new Set(focusEdges.flatMap((edge) => [edge.source, edge.target]));
        edges = focusEdges.concat([...secondHop].flatMap((id) => index.adjacency.get(id) || [])).filter((edge, position, all) => all.findIndex((candidate) => candidate.id === edge.id) === position && (nodeIds.has(edge.source) || nodeIds.has(edge.target)));
    }
    return { mode, nodes, edges, nodeCandidates: candidates.length, edgeCandidates: edges.length };
}

export function labelRank(node, interaction = {}) {
    if (node.id === interaction.keyboardNodeId || node.id === interaction.focusedNodeId) return 100;
    if (node.overlays.includes('selected')) return 90;
    if (node.overlays.includes('guided_spine')) return 80;
    return RANK[node.labelPriority] ?? 1;
}
