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
    assert.equal(scheduler.setAnimation('ambient', true, 24), false);
    assert.deepEqual(scheduler.activeAnimations(), []);
});

test('scheduler animation leases redraw at the requested cadence and release to rest', () => {
    const callbacks = []; let frames = 0; let timerCallback;
    const scheduler = createFrameScheduler({
        onFrame: () => { frames += 1; },
        raf: (callback) => { callbacks.push(callback); return callbacks.length; },
        caf: () => {},
        setTimeoutFn: (callback) => { timerCallback = callback; return 10; },
        clearTimeoutFn: () => {},
    });
    assert.equal(scheduler.setAnimation('ambient', true, 24), true);
    assert.deepEqual(scheduler.activeAnimations(), ['ambient']);
    callbacks.shift()(0);
    assert.equal(frames, 1);
    callbacks.shift()(10);
    assert.equal(frames, 1);
    callbacks.shift()(50);
    assert.equal(frames, 2);
    assert.equal(scheduler.state(), 'animating');
    assert.equal(scheduler.setAnimation('ambient', false), false);
    timerCallback();
    assert.equal(scheduler.state(), 'resting');
});

test('multiple animation leases use the highest requested cadence until each owner releases', () => {
    const callbacks = []; const cancelled = []; let frames = 0;
    const scheduler = createFrameScheduler({
        onFrame: () => { frames += 1; },
        raf: (callback) => { callbacks.push(callback); return callbacks.length; },
        caf: (id) => { cancelled.push(id); },
        setTimeoutFn: () => 90,
        clearTimeoutFn: () => {},
    });
    scheduler.setAnimation('ambient', true, 20);
    scheduler.setAnimation('focus', true, 30);
    assert.deepEqual(scheduler.activeAnimations(), ['ambient', 'focus']);
    callbacks.shift()(0);
    callbacks.shift()(20);
    assert.equal(frames, 1);
    callbacks.shift()(34);
    assert.equal(frames, 2);

    scheduler.setAnimation('focus', false);
    assert.deepEqual(scheduler.activeAnimations(), ['ambient']);
    callbacks.shift()(60);
    assert.equal(frames, 2);
    callbacks.shift()(85);
    assert.equal(frames, 3);

    scheduler.setAnimation('ambient', false);
    assert.deepEqual(scheduler.activeAnimations(), []);
    assert.equal(scheduler.state(), 'clean');
    assert.ok(cancelled.length >= 1);
});
