import test from 'node:test';
import assert from 'node:assert/strict';
import { drawRoute, normalizeRoute, routeBounds } from '../../frontend/src/engine-v2/edge-routes.js';
import { createFrameScheduler } from '../../frontend/src/engine-v2/frame-scheduler.js';

test('route consumer supports line, quadratic and polyline with deterministic fallback', () => {
    const source = { id: 'a', x: 0, y: 0 }; const target = { id: 'b', x: 100, y: 50 };
    assert.equal(normalizeRoute({ route: { type: 'line' }, source: 'a', target: 'b' }, source, target).type, 'line');
    assert.equal(normalizeRoute({ route: { type: 'quadratic', cx: 40, cy: 20 }, source: 'a', target: 'b' }, source, target).type, 'quadratic');
    assert.equal(normalizeRoute({ route: { type: 'polyline', points: [[0, 0], [40, 20], [100, 50]] }, source: 'a', target: 'b' }, source, target).type, 'polyline');
    const fallback = normalizeRoute({ id: 'e', source: 'a', target: 'b', route: { type: 'broken' } }, source, target);
    assert.equal(fallback.type, 'quadratic');
    assert.deepEqual(routeBounds(fallback, source, target).minX, 0);
    const calls = []; const ctx = { beginPath: () => calls.push('begin'), moveTo: (...args) => calls.push(['move', ...args]), quadraticCurveTo: (...args) => calls.push(['quad', ...args]), lineTo: (...args) => calls.push(['line', ...args]), stroke: () => calls.push('stroke') };
    drawRoute(ctx, { type: 'line' }, source, target);
    assert.deepEqual(calls, ['begin', ['move', 0, 0], ['line', 100, 50], 'stroke']);
});

test('scheduler wakes once, enters resting after five seconds and wakes again', () => {
    let frameCallback; let timerCallback; let frames = 0;
    const scheduler = createFrameScheduler({ onFrame: () => { frames += 1; }, raf: (callback) => { frameCallback = callback; return 1; }, caf: () => {}, setTimeoutFn: (callback) => { timerCallback = callback; return 2; }, clearTimeoutFn: () => {} });
    scheduler.wake('scene');
    assert.equal(scheduler.state(), 'dirty');
    frameCallback();
    assert.equal(frames, 1);
    assert.equal(scheduler.state(), 'clean');
    timerCallback();
    assert.equal(scheduler.state(), 'resting');
    scheduler.wake('pointer');
    assert.equal(scheduler.state(), 'dirty');
    frameCallback();
    assert.equal(frames, 2);
    scheduler.destroy();
    assert.equal(scheduler.state(), 'destroyed');
    assert.equal(scheduler.pending(), false);
});

test('reduced motion has no resting timer and remains on-demand', () => {
    let scheduled = 0; let timers = 0;
    const scheduler = createFrameScheduler({ reducedMotion: true, onFrame: () => {}, raf: (callback) => { scheduled += 1; callback(); return scheduled; }, caf: () => {}, setTimeoutFn: () => { timers += 1; return 1; }, clearTimeoutFn: () => {} });
    scheduler.wake('initial');
    assert.equal(scheduled, 1);
    assert.equal(timers, 0);
    assert.equal(scheduler.pending(), false);
});
