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
function runtimeIndex() {
    const adjacency = new Map(nodes.map((node) => [node.id, []]));
    const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
    for (const edge of edges) { adjacency.get(edge.source).push(edge); adjacency.get(edge.target).push(edge); }
    return { spatial: createSpatialIndex(nodes), midEdges: edges.slice(0, 2), adjacency, edgeById };
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

test('LOD plan does not draw far edges and uses viewport candidates', () => {
    const camera = createCamera({ x: 0, y: 0, zoom: 0.4 });
    camera.setViewport({ width: 400, height: 300, dpr: 1 });
    const plan = buildDrawPlan({ index: runtimeIndex(), camera, interaction: {}, tokens: DEFAULT_TOKENS });
    assert.equal(plan.mode, 'far');
    assert.equal(plan.edges.length, 0);
    assert.ok(plan.nodeCandidates < nodes.length);
    camera.set({ zoom: 1.4 });
    const near = buildDrawPlan({ index: runtimeIndex(), camera, interaction: {}, tokens: DEFAULT_TOKENS });
    assert.equal(near.mode, 'near');
    assert.ok(near.edges.length <= edges.length);
    camera.set({ zoom: 3 });
    const focus = buildDrawPlan({ index: runtimeIndex(), camera, interaction: { focusedNodeId: 'a' }, tokens: DEFAULT_TOKENS });
    assert.equal(focus.mode, 'focus');
    assert.ok(focus.edges.some((edge) => edge.id === 'e1' || edge.id === 'e2'));
    assert.deepEqual(focus, buildDrawPlan({ index: runtimeIndex(), camera, interaction: { focusedNodeId: 'a' }, tokens: DEFAULT_TOKENS }));
});
