export function createCamera(initial = {}) {
    const state = { x: Number(initial.x) || 0, y: Number(initial.y) || 0, zoom: Number(initial.zoom) || 1 };
    let viewport = { width: 1, height: 1, dpr: 1 };
    let bounds = null;

    function clamp(value) {
        if (!bounds) return value;
        return {
            x: Math.max(bounds.minX, Math.min(bounds.maxX, value.x)),
            y: Math.max(bounds.minY, Math.min(bounds.maxY, value.y)),
            zoom: Math.max(bounds.minZoom, Math.min(bounds.maxZoom, value.zoom)),
        };
    }

    return {
        setViewport(next) {
            viewport = { ...viewport, ...next, dpr: next.dpr || viewport.dpr || 1 };
            return this.get();
        },
        setBounds(next) { bounds = next ? { ...next } : null; Object.assign(state, clamp(state)); },
        set(next) { Object.assign(state, clamp({ ...state, ...next })); return this.get(); },
        get() { return { ...state }; },
        viewport() { return { ...viewport }; },
        bounds() { return bounds ? { ...bounds } : null; },
        worldToScreen(point) {
            return { x: (point.x - state.x) * state.zoom + viewport.width / 2, y: (point.y - state.y) * state.zoom + viewport.height / 2 };
        },
        screenToWorld(point) {
            return { x: (point.x - viewport.width / 2) / state.zoom + state.x, y: (point.y - viewport.height / 2) / state.zoom + state.y };
        },
        viewportBounds(padding = 0) {
            const nw = this.screenToWorld({ x: -padding, y: -padding });
            const se = this.screenToWorld({ x: viewport.width + padding, y: viewport.height + padding });
            return { minX: Math.min(nw.x, se.x), minY: Math.min(nw.y, se.y), maxX: Math.max(nw.x, se.x), maxY: Math.max(nw.y, se.y) };
        },
    };
}
