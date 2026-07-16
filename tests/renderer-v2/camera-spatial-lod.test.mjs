import test from 'node:test';
import assert from 'node:assert/strict';
import { createCamera } from '../../frontend/src/engine-v2/camera.js';
import { buildDrawPlan } from '../../frontend/src/engine-v2/lod-policy.js';
import { createSpatialIndex } from '../../frontend/src/engine-v2/spatial-index.js';
import { DEFAULT_TOKENS } from '../../frontend/src/engine-v2/tokens.js';

const nodes = [
    { id: 'nucleus', x: 0, y: 0, label: 'Nucleus', archetype: 'galactic_nucleus', visualMagnitude: 'nucleus', labelPriority: 'critical', domains: [], overlays: [] },
    { id: 'a', x: 50, y: 50, label: 'A', archetype: 'concept_star', visualMagnitude: 'standard', labelPriority: 'standard', domains: [], overlays: [] },
    { id: 'b', x: 100, y: 100, label: 'B', archetype: 'concept_star', visualMagnitude: 'standard', labelPriority: 'standard', domains: [], overlays: [] },
    { id: 'far', x: 10000, y: 10000, label: 'Far', archetype: 'concept_star', visualMagnitude: 'faint', labelPriority: 'low', domains: [], overlays: [] },
];
const edges = [{ id: 'e1', source: 'nucleus', target: 'a', priority: 10 }, { id: 'e2', source: 'a', target: 'b', priority: 9 }, { id: 'e3', source: 'b', target: 'far', priority: 8 }];
function runtimeIndex(sourceNodes = nodes, sourceEdges = edges) {
    const adjacency = new Map(sourceNodes.map((node) => [node.id, []]));
    const edgeById = new Map(sourceEdges.map((edge) => [edge.id, edge]));
    const nodeById = new Map(sourceNodes.map((node) => [node.id, node]));
    for (const edge of sourceEdges) { adjacency.get(edge.source).push(edge); adjacency.get(edge.target).push(edge); }
    return { spatial: createSpatialIndex(sourceNodes), midEdges: sourceEdges.slice(0, 2), adjacency, edgeById, nodeById };
}

function denseIndex() {
    const denseNodes = [];
    const denseEdges = [];
    for (let y = 0; y < 7; y += 1) for (let x = 0; x < 8; x += 1) {
        const id = `n-${x}-${y}`;
        denseNodes.push({ id, x: (x - 3.5) * 30, y: (y - 3) * 30, label: id, archetype: 'concept_star', visualMagnitude: 'standard', labelPriority: x === 0 && y === 0 ? 'high' : 'standard', domains: [], overlays: [] });
        if (x) denseEdges.push({ id: `h-${x}-${y}`, source: `n-${x - 1}-${y}`, target: id, priority: (x + y) % 4 });
        if (y) denseEdges.push({ id: `v-${x}-${y}`, source: `n-${x}-${y - 1}`, target: id, priority: (x * 2 + y) % 4 });
    }
    return runtimeIndex(denseNodes, denseEdges);
}

function cameraAt({ x = 0, y = 0, zoom = 1, width = 400, height = 300 } = {}) {
    const camera = createCamera({ x, y, zoom });
    camera.setViewport({ width, height, dpr: 1 });
    return camera;
}

test('camera world/screen transform round-trips at DPR 1 and 2', () => {
    const camera = createCamera({ x: 12, y: -8, zoom: 1.7 });
    camera.setViewport({ width: 390, height: 844, dpr: 1 });
    const point = { x: 100, y: 200 };
    const first = camera.screenToWorld(camera.worldToScreen(point));
    assert.ok(Math.abs(first.x - point.x) < 1e-9 && Math.abs(first.y - point.y) < 1e-9);
    camera.setViewport({ width: 390, height: 844, dpr: 2 });
    const second = camera.screenToWorld(camera.worldToScreen(point));
    assert.ok(Math.abs(second.x - point.x) < 1e-9 && Math.abs(second.y - point.y) < 1e-9);
});

test('spatial queries return only candidates inside the query region', () => {
    const index = createSpatialIndex(nodes);
    assert.deepEqual(index.queryRect({ minX: -1, minY: -1, maxX: 1, maxY: 1 }).map((node) => node.id), ['nucleus']);
    assert.deepEqual(index.queryPoint(50, 50, 1).map((node) => node.id), ['a']);
});

test('overview has no canonical relations while retaining its viewport node candidates', () => {
    const camera = cameraAt({ zoom: 0.4 });
    const plan = buildDrawPlan({ index: runtimeIndex(), camera, interaction: {}, tokens: DEFAULT_TOKENS });
    assert.equal(plan.semanticMode, 'overview');
    assert.equal(plan.mode, 'far');
    assert.equal(plan.edgePlan.kind, 'none');
    assert.equal(plan.edges.length, 0);
    assert.ok(plan.nodeCandidates < nodes.length);
});

test('explore uses a deterministic screen-density budget rather than all visible adjacency', () => {
    const index = denseIndex();
    const camera = cameraAt({ zoom: 1.35, width: 500, height: 360 });
    const first = buildDrawPlan({ index, camera, interaction: {}, tokens: DEFAULT_TOKENS });
    assert.equal(first.semanticMode, 'explore');
    assert.equal(first.edgePlan.kind, 'explore-adaptive');
    assert.ok(first.edges.length > 0);
    assert.ok(first.edges.length < first.edgeCandidates, 'dense adjacency must be culled');
    assert.ok(first.edges.length <= first.edgePlan.budget.edgeCount);
    assert.equal(new Set(first.edges.map((edge) => edge.id)).size, first.edges.length);
    camera.set({ x: 12 / 1.35 });
    const nudged = buildDrawPlan({ index, camera, interaction: {}, tokens: DEFAULT_TOKENS });
    assert.deepEqual(nudged.edges.map((edge) => edge.id), first.edges.map((edge) => edge.id));
    assert.deepEqual(nudged.edgePlan.edgeKinds, first.edgePlan.edgeKinds);
});

test('focus always takes the local one-hop plan at every zoom, with bounded two-hop context', () => {
    const index = runtimeIndex();
    const farFocus = buildDrawPlan({ index, camera: cameraAt({ zoom: 0.4 }), interaction: { focusedNodeId: 'a' }, tokens: DEFAULT_TOKENS });
    const closeFocus = buildDrawPlan({ index, camera: cameraAt({ zoom: 3 }), interaction: { focusedNodeId: 'a' }, tokens: DEFAULT_TOKENS });
    for (const plan of [farFocus, closeFocus]) {
        assert.equal(plan.semanticMode, 'focused');
        assert.equal(plan.mode, 'focus');
        assert.equal(plan.edgePlan.kind, 'focus-local');
        assert.ok(plan.edgePlan.primaryEdgeIds.includes('e1'));
        assert.ok(plan.edgePlan.primaryEdgeIds.includes('e2'));
        assert.ok(plan.edgePlan.secondaryEdgeIds.includes('e3'));
        assert.ok(plan.edgePlan.secondaryEdgeIds.length <= plan.edgePlan.budget.secondary);
        assert.equal(plan.edgePlan.edgeKinds.e1, 'focus-primary');
        assert.equal(plan.edgePlan.edgeKinds.e3, 'focus-context');
    }
});

test('active Wonder is semantic state without treating hover as active, and marks its local context', () => {
    const camera = cameraAt({ zoom: 1.4 });
    const hover = buildDrawPlan({ index: runtimeIndex(), camera, interaction: { hoveredConstellationId: 'wonder-a' }, tokens: DEFAULT_TOKENS });
    assert.equal(hover.semanticMode, 'explore');
    const active = buildDrawPlan({
        index: runtimeIndex(),
        camera,
        interaction: { activeConstellationId: 'wonder-a', activeConstellationNodeIds: ['a', 'b'] },
        tokens: DEFAULT_TOKENS,
    });
    assert.equal(active.semanticMode, 'wonder-active');
    assert.equal(active.edgePlan.kind, 'wonder-adaptive');
    assert.equal(active.edgePlan.edgeKinds.e2, 'wonder-context');
});
