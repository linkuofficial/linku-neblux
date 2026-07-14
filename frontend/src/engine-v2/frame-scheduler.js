export function createFrameScheduler({ onFrame, reducedMotion = false, restMs = 5000, raf = globalThis.requestAnimationFrame, caf = globalThis.cancelAnimationFrame, setTimeoutFn = globalThis.setTimeout, clearTimeoutFn = globalThis.clearTimeout } = {}) {
    let state = 'clean';
    let frameId = null;
    let restId = null;
    let dirty = false;
    let destroyed = false;

    const scheduleRest = () => {
        if (reducedMotion || destroyed) { state = reducedMotion ? 'clean' : state; return; }
        if (restId !== null) clearTimeoutFn(restId);
        restId = setTimeoutFn(() => { restId = null; if (!destroyed && !dirty && frameId === null) state = 'resting'; }, restMs);
    };
    const schedule = () => {
        if (frameId !== null || destroyed || !raf) return;
        let callbackFinished = false;
        frameId = raf(() => {
            frameId = null;
            callbackFinished = true;
            if (destroyed || !dirty) return;
            dirty = false;
            onFrame?.();
            state = 'clean';
            scheduleRest();
        });
        // Test/fallback RAF implementations may invoke synchronously before
        // returning an id. Do not leave a stale pending frame in that case.
        if (callbackFinished) frameId = null;
    };
    return {
        wake(reason = 'unknown') {
            if (destroyed) return;
            dirty = true; state = 'dirty';
            if (restId !== null) { clearTimeoutFn(restId); restId = null; }
            schedule();
            return reason;
        },
        flush() {
            if (destroyed || !dirty) return false;
            if (frameId !== null && caf) caf(frameId);
            frameId = null;
            dirty = false;
            onFrame?.();
            state = 'clean';
            scheduleRest();
            return true;
        },
        state() { return state; },
        pending() { return frameId !== null || restId !== null; },
        destroy() {
            destroyed = true; dirty = false; state = 'destroyed';
            if (frameId !== null && caf) caf(frameId);
            if (restId !== null) clearTimeoutFn(restId);
            frameId = null; restId = null;
        },
    };
}
