import test from 'node:test';
import assert from 'node:assert/strict';
import { drawNodeOverlays, overlayOrder } from '../../frontend/src/engine-v2/overlay-compositor.js';
import { layoutLabels } from '../../frontend/src/engine-v2/label-layout.js';
import { createSpriteRegistry } from '../../frontend/src/engine-v2/sprite-registry.js';
import { DEFAULT_TOKENS } from '../../frontend/src/engine-v2/tokens.js';

function context() {
    return new Proxy({ globalAlpha: 1, lineWidth: 1, strokeStyle: '', fillStyle: '', setLineDash() {} }, { get(target, key) { return key in target ? target[key] : () => {}; } });
}

test('all 256 overlay combinations are body-safe and preserve fixed layer order', () => {
    const node = { id: 'n', overlays: [], domains: ['MAT'], visualMagnitude: 'standard', archetype: 'concept_star' };
    for (let mask = 0; mask < 256; mask += 1) {
        node.overlays = Object.keys({ selected: 1, related: 1, guided_spine: 1, depth_lens: 1, portal_ring: 1, multi_portal: 1, filtered: 1, dimmed: 1 }).filter((_, index) => mask & (1 << index));
        assert.doesNotThrow(() => drawNodeOverlays(context(), node, 20, 20, 8, DEFAULT_TOKENS));
    }
    assert.deepEqual(overlayOrder(['selected', 'depth_lens', 'portal_ring', 'guided_spine']), ['guided_spine', 'depth_lens', 'portal_ring', 'selected']);
    node.overlays = ['future-overlay'];
    assert.doesNotThrow(() => drawNodeOverlays(context(), node, 20, 20, 8, DEFAULT_TOKENS));
});

test('Depth, portal and selected rings occupy distinct inner-to-outer radii', () => {
    const radii = [];
    const ctx = new Proxy({
        globalAlpha: 1, lineWidth: 1, strokeStyle: '', fillStyle: '', setLineDash() {},
        arc: (_x, _y, radius) => radii.push(radius),
    }, { get(target, key) { return key in target ? target[key] : () => {}; } });
    drawNodeOverlays(ctx, { overlays: ['selected', 'depth_lens', 'portal_ring'], domains: ['MAT'], visualMagnitude: 'standard', archetype: 'concept_star' }, 20, 20, 8, DEFAULT_TOKENS);
    assert.deepEqual(radii, [14, 20, 28]);
});

test('all archetype sprites have a safe fallback without a DOM', () => {
    const registry = createSpriteRegistry({ documentRef: null });
    const archetypes = ['galactic_nucleus', 'domain_core', 'subfield_giant', 'concept_star', 'bridge_star', 'beacon_star', 'event_remnant', 'local_protostar', 'future'];
    for (const archetype of archetypes) {
        const node = { id: archetype, archetype, visualMagnitude: 'standard', domains: ['MAT'], label: archetype, overlays: [] };
        assert.doesNotThrow(() => registry.draw(context(), node, 10, 10, 1));
    }
    assert.equal(registry.size(), 0);
});

test('label collision output is deterministic for a static camera', () => {
    const camera = { viewport: () => ({ width: 400, height: 300 }), worldToScreen: (point) => ({ x: point.x, y: point.y }) };
    const nodes = [
        { id: 'b', x: 200, y: 150, label: 'B', labelPriority: 'standard', overlays: [], visualMagnitude: 'standard' },
        { id: 'a', x: 200, y: 150, label: 'A', labelPriority: 'standard', overlays: [], visualMagnitude: 'standard' },
        { id: 'focus', x: 200, y: 150, label: 'Focus', labelPriority: 'low', overlays: [], visualMagnitude: 'standard' },
    ];
    const first = layoutLabels(nodes, camera, { focusedNodeId: 'focus' });
    const second = layoutLabels(nodes, camera, { focusedNodeId: 'focus' });
    assert.deepEqual(first.acceptedIds, second.acceptedIds);
    assert.equal(first.acceptedIds[0], 'focus');
});
