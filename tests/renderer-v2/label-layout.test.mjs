import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutLabelCandidates } from '../../frontend/src/engine-v2/label-layout.js';

function candidate(id, x, y, overrides = {}) {
    return {
        id,
        kind: 'node',
        text: id,
        anchor: { x, y },
        context: { contextual: true },
        ...overrides,
    };
}

function assertNoOverlap(items) {
    for (let left = 0; left < items.length; left += 1) {
        for (let right = left + 1; right < items.length; right += 1) {
            const a = items[left].paddedBox; const b = items[right].paddedBox;
            assert.equal(a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y, false, `${items[left].id} overlaps ${items[right].id}`);
        }
    }
}

test('shared allocator gives selected, hovered and active Wonder labels semantic precedence', () => {
    const result = layoutLabelCandidates([
        candidate('ambient', 100, 100),
        candidate('related', 100, 100, { context: { related: true } }),
        candidate('domain', 100, 100, { context: { domainCore: true } }),
        candidate('station', 100, 100, { kind: 'wonder', context: { activeWonderStation: true } }),
        candidate('hovered', 100, 100, { context: { hovered: true } }),
        candidate('selected', 100, 100, { context: { selected: true } }),
    ], { viewport: { width: 300, height: 200 } });
    assert.equal(result.acceptedIds[0], 'selected');
    assert.equal(result.acceptedIds.includes('hovered'), false);
});

test('node, Wonder and reserved UI rectangles share one collision space', () => {
    const result = layoutLabelCandidates([
        candidate('node', 80, 90, { context: { domainCore: true } }),
        candidate('wonder', 80, 90, { kind: 'wonder', text: 'A Wonder', context: { wonder: true } }),
        candidate('blocked', 230, 28, { context: { selected: true } }),
    ], {
        viewport: { width: 320, height: 180 },
        safeRect: { x: 20, y: 20, width: 280, height: 140 },
        reservedRects: [{ x: 180, y: 0, width: 140, height: 70 }],
    });
    assert.equal(result.acceptedIds.includes('blocked'), false);
    assert.equal(result.acceptedIds.includes('node'), true);
    assert.equal(result.acceptedIds[0], 'node');
    assert.equal(result.acceptedIds.includes('wonder'), true);
    assertNoOverlap(result.accepted);
    for (const item of result.accepted) {
        assert.ok(item.paddedBox.x >= 20 && item.paddedBox.y >= 20);
        assert.ok(item.paddedBox.x + item.paddedBox.width <= 300 && item.paddedBox.y + item.paddedBox.height <= 160);
    }
});

test('allocator has no count cap: larger safe space accepts additional labels', () => {
    const labels = [
        candidate('left', 26, 60),
        candidate('right', 188, 60),
        candidate('lower', 104, 122),
    ];
    const compact = layoutLabelCandidates(labels, { viewport: { width: 130, height: 110 } });
    const spacious = layoutLabelCandidates(labels, { viewport: { width: 260, height: 180 } });
    assert.ok(spacious.accepted.length > compact.accepted.length);
    assert.deepEqual(spacious.acceptedIds, ['left', 'lower', 'right']);
});

test('same candidates are deterministic regardless of input order', () => {
    const candidates = [
        candidate('c', 60, 80), candidate('a', 60, 80), candidate('b', 180, 80),
        candidate('wonder', 250, 100, { kind: 'wonder', text: 'Wonder', context: { wonder: true } }),
    ];
    const options = { viewport: { width: 360, height: 220 } };
    const first = layoutLabelCandidates(candidates, options);
    const second = layoutLabelCandidates([...candidates].reverse(), options);
    assert.deepEqual(first.acceptedIds, second.acceptedIds);
    assertNoOverlap(first.accepted);
});

test('previous accepted labels retain equal-priority collision ownership after a small camera move', () => {
    const first = layoutLabelCandidates([
        candidate('a', 120, 100),
        candidate('b', 122, 100),
    ], { viewport: { width: 300, height: 180 }, previous: ['b'] });
    assert.deepEqual(first.acceptedIds, ['b']);

    const shifted = layoutLabelCandidates([
        candidate('a', 122, 101),
        candidate('b', 124, 101),
    ], { viewport: { width: 300, height: 180 }, previous: first.state });
    assert.deepEqual(shifted.acceptedIds, ['b']);
    assertNoOverlap(shifted.accepted);
});
