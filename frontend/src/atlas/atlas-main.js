import { createAtlasRenderer } from './atlas-renderer.js';
import { getInitialLang, t } from './atlas-i18n.js';
import { setActiveRegion, setAtlasStatus, syncDirectory, syncStaticCopy } from './atlas-accessibility.js';
import { createAtlasState, normalizeAtlasIndex, resetCamera, setCameraZoom } from './atlas-state.js';

const root = document;
const canvas = root.querySelector('#atlas-canvas');
const stage = root.querySelector('#atlas-stage');
const fallback = root.querySelector('#atlas-fallback');
const tooltip = root.querySelector('#atlas-tooltip');
const state = createAtlasState(getInitialLang());
const renderer = createAtlasRenderer(canvas, () => state);
const canvasAvailable = renderer.available;
let drag = null;

function draw() {
    renderer.resize();
    renderer.draw();
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
    tooltip.style.left = `${event.clientX - stage.getBoundingClientRect().left + 14}px`;
    tooltip.style.top = `${event.clientY - stage.getBoundingClientRect().top + 14}px`;
    tooltip.hidden = false;
    setActiveRegion(root, region.id);
}

function handlePointerMove(event) {
    if (drag) {
        state.camera.x += (event.clientX - drag.x) / Math.max(0.001, drag.scale);
        state.camera.y += (event.clientY - drag.y) / Math.max(0.001, drag.scale);
        drag = { x: event.clientX, y: event.clientY, scale: drag.scale, moved: true };
        draw();
        return;
    }
    const region = renderer.hitTest(event.clientX, event.clientY);
    if (state.hoveredRegionId !== region?.id) {
        state.hoveredRegionId = region?.id || null;
        canvas.style.cursor = region ? 'pointer' : 'grab';
        showTooltip(region, event);
        draw();
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
        drag = { x: event.clientX, y: event.clientY, scale: 1, moved: false };
        canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', (event) => {
        const completedDrag = drag;
        drag = null;
        canvas.style.cursor = 'grab';
        if (!completedDrag?.moved) {
            const region = renderer.hitTest(event.clientX, event.clientY);
            if (region) window.location.assign(region.route);
        }
    });
    canvas.addEventListener('pointerleave', () => {
        if (!drag) {
            state.hoveredRegionId = null;
            tooltip.hidden = true;
            setActiveRegion(root, null);
            draw();
        }
    });
    canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        setCameraZoom(state, state.camera.zoom * (event.deltaY > 0 ? 0.9 : 1.1));
        draw();
    }, { passive: false });
}

async function loadIndex() {
    try {
        const response = await fetch('/data/atlas/index.json', { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`Atlas index request failed (${response.status})`);
        const index = await response.json();
        if (!index?.mainGalaxy || !index.wonders || !Array.isArray(index.roads)) throw new Error('Atlas index has an invalid shape');
        state.index = normalizeAtlasIndex(index);
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
    if (state.loadState === 'ready') setAtlasStatus(root, t(state.lang, 'ready'));
}

function initControls() {
    root.querySelector('#atlas-zoom-in').addEventListener('click', () => { setCameraZoom(state, state.camera.zoom * 1.16); draw(); });
    root.querySelector('#atlas-zoom-out').addEventListener('click', () => { setCameraZoom(state, state.camera.zoom * 0.86); draw(); });
    root.querySelector('#atlas-reset').addEventListener('click', () => { resetCamera(state); draw(); });
    root.querySelectorAll('[data-atlas-lang]').forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.atlasLang)));
    window.addEventListener('resize', draw, { passive: true });
}

window.__nebluxAtlas = {
    loadState: () => state.loadState,
    regionIds: () => [state.index.mainGalaxy, ...state.index.wonders].map((region) => region.id),
    screenRegion: (id) => renderer.regionScreenPosition(id),
    camera: () => ({ ...state.camera }),
    redrawCount: () => renderer.redrawCount,
    canvasAvailable: () => canvasAvailable,
};

syncStaticCopy(root, state.lang);
syncDirectory(root, state.index, state.lang);
setAtlasStatus(root, t(state.lang, 'loading'));
attachCanvasInteraction();
initControls();
draw();
loadIndex();
