import { createAtlasEngineAdapter } from './atlas-engine-adapter.js';
import { getInitialLang, t } from './atlas-i18n.js';
import { setActiveRegion, setAtlasStatus, syncDirectory, syncStaticCopy } from './atlas-accessibility.js';
import { createAtlasState, normalizeAtlasIndex } from './atlas-state.js';

const root = document;
const canvas = root.querySelector('#atlas-canvas');
const stage = root.querySelector('#atlas-stage');
const fallback = root.querySelector('#atlas-fallback');
const tooltip = root.querySelector('#atlas-tooltip');
const state = createAtlasState(getInitialLang());
const renderer = createAtlasEngineAdapter(canvas, state.index, state.lang);
const canvasAvailable = renderer.available;
let drag = null;

function draw() {
    renderer.resize();
    renderer.render();
}

function updateCopy() {
    syncStaticCopy(root, state.lang);
    syncDirectory(root, state.index, state.lang);
    draw();
}

function showTooltip(region, event) {
    if (!region) {
        tooltip.hidden = true;
        setActiveRegion(root, null);
        return;
    }
    const link = root.querySelector(`[data-region-id="${region.id}"]`);
    const title = link?.querySelector('[data-region-title]')?.textContent || region.id;
    tooltip.textContent = title;
    tooltip.hidden = false;
    const stageRect = stage.getBoundingClientRect();
    const x = Math.min(stageRect.width - tooltip.offsetWidth - 8, Math.max(8, event.clientX - stageRect.left + 14));
    const y = Math.min(stageRect.height - tooltip.offsetHeight - 8, Math.max(8, event.clientY - stageRect.top + 14));
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    setActiveRegion(root, region.id);
}

function handlePointerMove(event) {
    if (drag) {
        renderer.panByScreenDelta(event.clientX - drag.x, event.clientY - drag.y);
        const moved = drag.moved || Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4;
        drag = { ...drag, x: event.clientX, y: event.clientY, moved };
        return;
    }
    const region = renderer.hitTest(event.clientX, event.clientY);
    if (state.hoveredRegionId !== region?.id || (region && tooltip.hidden)) {
        state.hoveredRegionId = region?.id || null;
        canvas.style.cursor = region ? 'pointer' : 'grab';
        showTooltip(region, event);
        renderer.setHovered(state.hoveredRegionId);
    }
}

function attachCanvasInteraction() {
    if (!canvasAvailable) {
        state.loadState = 'canvas-unavailable';
        fallback.hidden = false;
        setAtlasStatus(root, t(state.lang, 'canvasUnavailable'));
        return;
    }
    canvas.addEventListener('pointerdown', (event) => {
        canvas.setPointerCapture(event.pointerId);
        drag = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
        canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', (event) => {
        const completedDrag = drag;
        drag = null;
        canvas.style.cursor = 'grab';
        if (!completedDrag?.moved) {
            const region = renderer.hitTest(event.clientX, event.clientY);
            if (region) window.location.assign(renderer.routeFor(region.id));
        }
    });
    canvas.addEventListener('pointercancel', () => {
        drag = null;
        canvas.style.cursor = 'grab';
    });
    canvas.addEventListener('pointerleave', () => {
        if (!drag) {
            state.hoveredRegionId = null;
            tooltip.hidden = true;
            setActiveRegion(root, null);
            renderer.setHovered(null);
        }
    });
    canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        renderer.zoomBy(event.deltaY > 0 ? 0.9 : 1.1, event.clientX, event.clientY);
    }, { passive: false });
}

async function loadIndex() {
    try {
        const response = await fetch('/data/atlas/index.json', { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`Atlas index request failed (${response.status})`);
        const index = await response.json();
        if (!index?.mainGalaxy || !index.wonders || !Array.isArray(index.roads)) throw new Error('Atlas index has an invalid shape');
        const normalized = normalizeAtlasIndex(index);
        renderer.setIndex(normalized, state.lang, { resetView: true });
        state.index = normalized;
        state.usingFallback = false;
        state.loadState = canvasAvailable ? 'ready' : 'canvas-unavailable';
        fallback.hidden = canvasAvailable;
        syncDirectory(root, state.index, state.lang);
        setAtlasStatus(root, t(state.lang, canvasAvailable ? 'ready' : 'canvasUnavailable'));
    } catch (error) {
        state.loadState = canvasAvailable ? 'index-unavailable' : 'canvas-unavailable';
        state.usingFallback = true;
        fallback.hidden = false;
        setAtlasStatus(root, t(state.lang, 'unavailable'));
        console.warn('[atlas] presentation index unavailable; retaining static directory', error);
    }
    draw();
}

function setLanguage(lang) {
    state.lang = lang;
    try { localStorage.setItem('neblux-lang', lang); } catch { /* storage is optional */ }
    updateCopy();
    renderer.setLanguage(lang);
    if (state.loadState === 'ready') setAtlasStatus(root, t(state.lang, 'ready'));
}

function initControls() {
    root.querySelector('#atlas-zoom-in').addEventListener('click', () => renderer.zoomBy(1.16));
    root.querySelector('#atlas-zoom-out').addEventListener('click', () => renderer.zoomBy(0.86));
    root.querySelector('#atlas-reset').addEventListener('click', () => renderer.reset());
    root.querySelectorAll('[data-atlas-lang]').forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.atlasLang)));
    root.querySelectorAll('[data-region-id]').forEach((link) => {
        link.addEventListener('focus', () => {
            state.hoveredRegionId = link.dataset.regionId;
            setActiveRegion(root, state.hoveredRegionId);
            renderer.setHovered(state.hoveredRegionId);
        });
        link.addEventListener('blur', () => {
            state.hoveredRegionId = null;
            setActiveRegion(root, null);
            renderer.setHovered(null);
        });
    });
    window.addEventListener('resize', draw, { passive: true });
}

window.__nebluxAtlas = {
    ready: () => state.loadState === 'ready',
    loadState: () => state.loadState,
    regionIds: () => [state.index.mainGalaxy, ...state.index.wonders].map((region) => region.id),
    screenRegion: (id) => renderer.regionScreenPosition(id),
    camera: () => renderer.camera(),
    redrawCount: () => renderer.redrawCount,
    canvasAvailable: () => canvasAvailable,
    rendererKind: () => renderer.rendererKind(),
    sceneSize: () => renderer.sceneSize(),
    stats: () => renderer.stats(),
};

syncStaticCopy(root, state.lang);
syncDirectory(root, state.index, state.lang);
setAtlasStatus(root, t(state.lang, 'loading'));
attachCanvasInteraction();
initControls();
draw();
loadIndex();
window.addEventListener('pagehide', (event) => {
    if (!event.persisted) renderer.destroy();
});
