import test from 'node:test';
import assert from 'node:assert/strict';
import { drawNodeOverlays, overlayOrder } from '../../frontend/src/engine-v2/overlay-compositor.js';
import { layoutConstellationLabels, layoutLabels } from '../../frontend/src/engine-v2/label-layout.js';
import { createSpriteRegistry, twinkleAlpha } from '../../frontend/src/engine-v2/sprite-registry.js';
import { DEFAULT_TOKENS, OVERLAYS } from '../../frontend/src/engine-v2/tokens.js';

function context() {
    return new Proxy({ globalAlpha: 1, lineWidth: 1, strokeStyle: '', fillStyle: '', setLineDash() {} }, { get(target, key) { return key in target ? target[key] : () => {}; } });
}

test('all overlay combinations are body-safe and preserve fixed layer order', () => {
    const node = { id: 'n', overlays: [], domains: ['MAT'], visualMagnitude: 'standard', archetype: 'concept_star' };
    for (let mask = 0; mask < (1 << OVERLAYS.length); mask += 1) {
        node.overlays = OVERLAYS.filter((_, index) => mask & (1 << index));
        assert.doesNotThrow(() => drawNodeOverlays(context(), node, 20, 20, 8, DEFAULT_TOKENS));
    }
    assert.deepEqual(overlayOrder(['selected', 'depth_lens', 'portal_ring', 'guided_spine']), ['guided_spine', 'depth_lens', 'portal_ring', 'selected']);
    node.overlays = ['future-overlay'];
    assert.doesNotThrow(() => drawNodeOverlays(context(), node, 20, 20, 8, DEFAULT_TOKENS));
});

test('twinkle is deterministic, low-amplitude and disabled by reduced motion', () => {
    const node = { id: 'stable-star' };
    const samples = Array.from({ length: 121 }, (_, index) => twinkleAlpha(node, index * 173));
    assert.deepEqual(samples, Array.from({ length: 121 }, (_, index) => twinkleAlpha({ id: 'stable-star' }, index * 173)));
    assert.ok(Math.min(...samples) >= 0.85 - Number.EPSILON);
    assert.ok(Math.max(...samples) <= 1 + Number.EPSILON);
    assert.ok(Math.max(...samples) - Math.min(...samples) >= 0.14);
    assert.notEqual(twinkleAlpha({ id: 'other-star' }, 1730), twinkleAlpha(node, 1730));
    assert.equal(twinkleAlpha(node, 1730, true), 1);
});

test('Depth and portal rings remain distinct while selected uses a layered focus corona', () => {
    const radii = [];
    const ctx = new Proxy({
        globalAlpha: 1, lineWidth: 1, strokeStyle: '', fillStyle: '', setLineDash() {},
        arc: (_x, _y, radius) => radii.push(radius),
    }, { get(target, key) { return key in target ? target[key] : () => {}; } });
    drawNodeOverlays(ctx, { overlays: ['selected', 'depth_lens', 'portal_ring'], domains: ['MAT'], visualMagnitude: 'standard', archetype: 'concept_star' }, 20, 20, 8, DEFAULT_TOKENS);
    assert.deepEqual(radii, [14, 20, 36, 31, 27, 23, 19]);
});

test('learning overlays keep learned before available and pulse opacity without changing geometry', () => {
    const arcs = []; const dashes = [];
    const ctx = new Proxy({
        globalAlpha: 1, lineWidth: 1, strokeStyle: '', fillStyle: '',
        setLineDash: (dash) => dashes.push([...dash]),
        arc(_x, _y, radius, start, end) {
            arcs.push({ radius, start, end, alpha: this.globalAlpha, stroke: this.strokeStyle, width: this.lineWidth });
        },
    }, { get(target, key) { return key in target ? target[key] : () => {}; } });
    const node = { overlays: ['available', 'learned'], domains: ['MAT'], visualMagnitude: 'standard', archetype: 'concept_star' };
    drawNodeOverlays(ctx, node, 20, 20, 8, DEFAULT_TOKENS, { availablePulse: 0.5 });

    assert.deepEqual(overlayOrder(node.overlays), ['learned', 'available']);
    assert.equal(arcs.length, 2);
    assert.deepEqual(arcs.map(({ radius }) => radius), [16, 18]);
    assert.equal(arcs[0].stroke, DEFAULT_TOKENS.learned);
    assert.equal(arcs[0].alpha, 0.82);
    assert.equal(arcs[0].width, 2);
    assert.ok(arcs[0].start > 0 && arcs[0].end < Math.PI);
    assert.equal(arcs[1].stroke, DEFAULT_TOKENS.available);
    assert.equal(arcs[1].alpha, 0.21);
    assert.equal(arcs[1].start, 0);
    assert.equal(arcs[1].end, Math.PI * 2);
    assert.deepEqual(dashes.at(-1), [2, 5]);
});

test('available learning marks recede in far view and become three quiet ticks at mid LOD', () => {
    const arcs = [];
    const ctx = new Proxy({
        globalAlpha: 1, lineWidth: 1, strokeStyle: '', setLineDash() {},
        arc(_x, _y, radius, start, end) { arcs.push({ radius, start, end, alpha: this.globalAlpha }); },
    }, { get(target, key) { return key in target ? target[key] : () => {}; } });
    const node = { overlays: ['available'], domains: ['MAT'], visualMagnitude: 'standard', archetype: 'concept_star' };
    drawNodeOverlays(ctx, node, 20, 20, 8, DEFAULT_TOKENS, { mode: 'far', availablePulse: 1 });
    assert.equal(arcs.length, 0);
    drawNodeOverlays(ctx, node, 20, 20, 8, DEFAULT_TOKENS, { mode: 'mid', availablePulse: 1 });
    assert.equal(arcs.length, 3);
    assert.deepEqual(arcs.map(({ radius }) => radius), [18, 18, 18]);
    assert.ok(arcs.every(({ start, end }) => end - start < 0.2));
});

test('focus labels suppress ambient dimmed and filtered labels while preserving active hierarchy', () => {
    const camera = { viewport: () => ({ width: 400, height: 300 }), worldToScreen: (point) => ({ x: point.x, y: point.y }) };
    const nodes = [
        { id: 'ambient', x: 200, y: 150, label: 'Ambient', labelPriority: 'critical', overlays: ['dimmed'], visualMagnitude: 'standard' },
        { id: 'filtered', x: 200, y: 150, label: 'Filtered', labelPriority: 'critical', overlays: ['filtered'], visualMagnitude: 'standard' },
        { id: 'related', x: 200, y: 150, label: 'Related', labelPriority: 'low', overlays: ['related'], visualMagnitude: 'standard' },
        { id: 'guided', x: 200, y: 150, label: 'Guided', labelPriority: 'low', overlays: ['guided_spine'], visualMagnitude: 'standard' },
        { id: 'selected', x: 200, y: 150, label: 'Selected', labelPriority: 'low', overlays: ['selected'], visualMagnitude: 'standard' },
    ];
    const layout = layoutLabels(nodes, camera, { focusedNodeId: 'selected' });
    assert.deepEqual(layout.acceptedIds, ['selected']);

    const separate = layoutLabels(nodes.map((node, index) => ({ ...node, x: index * 90, y: 150 })), camera, { focusedNodeId: 'selected' });
    assert.deepEqual(separate.acceptedIds, ['selected', 'related', 'guided']);
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

test('far Wonder labels use deterministic priority and never overlap after placement', () => {
    const items = [
        { id: 'small', name: 'Small Wonder', x: 200, y: 150, priority: 10 },
        { id: 'large', name: 'Large Wonder', x: 200, y: 150, priority: 100 },
        { id: 'nearby', name: 'Nearby Wonder', x: 210, y: 152, priority: 50 },
    ];
    const first = layoutConstellationLabels(items);
    const second = layoutConstellationLabels([...items].reverse());
    assert.deepEqual(first.acceptedIds, second.acceptedIds);
    assert.equal(first.acceptedIds[0], 'large');
    for (let i = 0; i < first.accepted.length; i += 1) {
        for (let j = i + 1; j < first.accepted.length; j += 1) {
            const a = first.accepted[i].box; const b = first.accepted[j].box;
            assert.equal(a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y, false);
        }
    }
});
