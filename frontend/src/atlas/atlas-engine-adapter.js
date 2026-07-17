import { createRendererV2 } from '../engine-v2/index.js';
import { allRegions, regionById } from './atlas-state.js';
import { buildAtlasScene, labelsForAtlas } from './atlas-scene-adapter.js';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.4;

function clampZoom(value) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function createAtlasEngineAdapter(canvas, initialIndex, initialLang) {
    let engine = null;
    try {
        engine = createRendererV2({
            canvas,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            tokens: {
                background: 'rgba(0, 0, 0, 0)',
                ambientFps: 0,
                mobileAmbientFps: 0,
            },
        });
    } catch {
        // The DOM directory is the required fallback when Canvas 2D is absent.
    }

    let index = initialIndex;
    let lang = initialLang;
    let routes = new Map();
    let viewport = { width: 1, height: 1, dpr: 1 };
    let sceneSize = { nodes: 0, edges: 0 };
    let fitted = false;

    function stopAmbient() {
        engine?.setAmbientAnimation(false);
    }

    function fitOverview() {
        if (!engine || !index) return;
        const regions = allRegions(index);
        if (!regions.length) return;
        const minX = Math.min(...regions.map((region) => region.x));
        const maxX = Math.max(...regions.map((region) => region.x));
        const minY = Math.min(...regions.map((region) => region.y));
        const maxY = Math.max(...regions.map((region) => region.y));
        const width = Math.max(360, maxX - minX + 360);
        const height = Math.max(320, maxY - minY + 320);
        const zoom = clampZoom(Math.min(viewport.width / width, viewport.height / height));
        engine.setCamera({ x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom });
        fitted = true;
    }

    function setIndex(nextIndex, nextLang = lang, { resetView = false } = {}) {
        if (!engine) return false;
        const built = buildAtlasScene(nextIndex, nextLang);
        index = nextIndex;
        lang = nextLang;
        routes = built.routes;
        sceneSize = { nodes: built.scene.nodes.length, edges: built.scene.edges.length };
        engine.setScene(built.scene);
        engine.setInteraction({ hoveredNodeId: null, focusedNodeId: null, keyboardNodeId: null });
        if (resetView || !fitted) fitOverview();
        stopAmbient();
        engine.renderNow();
        return true;
    }

    function setLanguage(nextLang) {
        if (!engine || !index) return;
        lang = nextLang;
        engine.setNodeVisuals(labelsForAtlas(index, lang));
        stopAmbient();
        engine.renderNow();
    }

    function resize() {
        if (!engine) return false;
        const rect = canvas.getBoundingClientRect();
        const next = {
            width: Math.max(1, rect.width),
            height: Math.max(1, rect.height),
            dpr: Math.min(window.devicePixelRatio || 1, 2),
        };
        const changed = next.width !== viewport.width || next.height !== viewport.height || next.dpr !== viewport.dpr;
        if (!changed) return false;
        viewport = next;
        engine.setViewport(viewport);
        stopAmbient();
        if (!fitted) fitOverview();
        return true;
    }

    function render() {
        if (!engine) return false;
        stopAmbient();
        engine.renderNow();
        return true;
    }

    function localPoint(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function boundedCamera(camera) {
        const main = regionById(index, 'main');
        if (!main) return camera;
        const zoom = clampZoom(camera.zoom);
        const margin = 43;
        const xSpan = Math.max(0, viewport.width / 2 - margin) / zoom;
        const ySpan = Math.max(0, viewport.height / 2 - margin) / zoom;
        return {
            ...camera,
            zoom,
            x: Math.max(main.x - xSpan, Math.min(main.x + xSpan, camera.x)),
            y: Math.max(main.y - ySpan, Math.min(main.y + ySpan, camera.y)),
        };
    }

    function hitTest(clientX, clientY) {
        if (!engine) return null;
        const node = engine.hitTest(localPoint(clientX, clientY));
        return node ? regionById(index, node.id) : null;
    }

    function setHovered(regionId) {
        if (!engine) return;
        engine.setInteraction({ hoveredNodeId: regionId || null, focusedNodeId: null, keyboardNodeId: null });
        render();
    }

    function panByScreenDelta(deltaX, deltaY) {
        if (!engine) return;
        const camera = engine.getCamera();
        engine.setCamera(boundedCamera({
            x: camera.x - deltaX / Math.max(camera.zoom, MIN_ZOOM),
            y: camera.y - deltaY / Math.max(camera.zoom, MIN_ZOOM),
            zoom: camera.zoom,
        }));
        render();
    }

    function zoomBy(factor, clientX, clientY) {
        if (!engine) return;
        const camera = engine.getCamera();
        const zoom = clampZoom(camera.zoom * factor);
        if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
            engine.setCamera(boundedCamera({ ...camera, zoom }));
            render();
            return;
        }
        const point = localPoint(clientX, clientY);
        const anchor = engine.screenToWorld(point);
        engine.setCamera(boundedCamera({
            zoom,
            x: anchor.x - (point.x - viewport.width / 2) / zoom,
            y: anchor.y - (point.y - viewport.height / 2) / zoom,
        }));
        render();
    }

    function reset() {
        fitted = false;
        fitOverview();
        render();
    }

    function regionScreenPosition(id) {
        if (!engine) return null;
        const region = regionById(index, id);
        if (!region) return null;
        const point = engine.worldToScreen(region);
        return { ...point, radius: 22, hitRadius: 22 };
    }

    function routeFor(id) {
        return routes.get(id) || regionById(index, id)?.route || null;
    }

    if (engine) {
        resize();
        setIndex(initialIndex, initialLang, { resetView: true });
    }

    return {
        available: Boolean(engine),
        resize,
        render,
        setIndex,
        setLanguage,
        hitTest,
        setHovered,
        panByScreenDelta,
        zoomBy,
        reset,
        regionScreenPosition,
        routeFor,
        camera: () => engine?.getCamera() || { x: 0, y: 0, zoom: 1 },
        stats: () => engine?.getDebugStats() || {},
        sceneSize: () => ({ ...sceneSize }),
        rendererKind: () => 'engine-v2',
        destroy: () => engine?.destroy(),
        get redrawCount() { return engine?.getDebugStats().redrawCount || 0; },
    };
}
