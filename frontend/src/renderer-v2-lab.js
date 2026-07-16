import { createDeterministicLabScene } from './engine-v2/lab-scene.js';
import { createRendererV2 } from './engine-v2/index.js';

const canvas = document.querySelector('#renderer-v2-canvas');
const status = document.querySelector('#renderer-status');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer = createRendererV2({ canvas, reducedMotion });
const scene = createDeterministicLabScene();
const bootStarted = performance.now();
const longTasks = [];
let longTaskObserver = null;
let dragging = false;
let lastPointer = null;

if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
    longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) longTasks.push({ startTime: entry.startTime, duration: entry.duration });
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
}

function viewport() {
    const rect = canvas.getBoundingClientRect();
    return { width: Math.max(1, rect.width), height: Math.max(1, rect.height), dpr: Math.min(2, devicePixelRatio || 1) };
}

function updateStats() {
    const stats = renderer.getDebugStats();
    document.querySelector('#renderer-mode').textContent = stats.mode;
    document.querySelector('#renderer-nodes').textContent = `${stats.drawnNodes} / ${stats.nodeCandidates}`;
    document.querySelector('#renderer-edges').textContent = `${stats.drawnEdges} / ${stats.edgeCandidates}`;
    document.querySelector('#renderer-candidates').textContent = `${stats.nodeCandidates} nodes · ${stats.hitCandidates} hit`;
    document.querySelector('#renderer-scheduler').textContent = `${stats.schedulerState} · ${stats.redrawCount} redraws`;
}

function resize() { renderer.setViewport(viewport()); renderer.renderNow(); updateStats(); }

renderer.setViewport(viewport());
renderer.setScene(scene);
renderer.renderNow();
const firstMeaningfulSceneMs = performance.now() - bootStarted;
status.textContent = `Ready · scene ${renderer.getDebugStats().sceneHash} · ${reducedMotion ? 'reduced motion' : 'normal motion'}`;
updateStats();

function overlayScene(overlays) {
    return {
        schemaVersion: '1.0.0',
        layoutVersion: 'overlay-matrix-1.0.0',
        rendererContractVersion: '2.0.0-alpha.1',
        nodes: [{
            id: 'overlay-subject', x: 0, y: 0, label: 'Overlay subject', domains: ['PHY'],
            archetype: 'concept_star', visualMagnitude: 'bright', labelPriority: 'critical', overlays: [...overlays],
        }],
        edges: [],
    };
}

function percentile(values, fraction) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))] || 0;
}

async function benchmark({ samples = 30 } = {}) {
    renderer.setScene(scene);
    renderer.setInteraction({ hoveredNodeId: null, focusedNodeId: null, keyboardNodeId: null });
    const started = performance.now();
    const frameMs = [];
    const lodSamples = {};
    for (let index = 0; index < samples; index += 1) {
        await new Promise((resolve) => requestAnimationFrame(() => {
            const zooms = [0.42, 0.82, 1.42, 2.6];
            renderer.setCamera({
                x: Math.sin(index * 0.61) * 2100,
                y: Math.cos(index * 0.47) * 1300,
                zoom: zooms[index % zooms.length],
            });
            const before = performance.now();
            renderer.renderNow();
            frameMs.push(performance.now() - before);
            const frameStats = renderer.getDebugStats();
            const sample = lodSamples[frameStats.mode] || { samples: 0, maxDrawnNodes: 0, maxDrawnEdges: 0, maxNodeCandidates: 0, maxEdgeCandidates: 0 };
            sample.samples += 1;
            sample.maxDrawnNodes = Math.max(sample.maxDrawnNodes, frameStats.drawnNodes);
            sample.maxDrawnEdges = Math.max(sample.maxDrawnEdges, frameStats.drawnEdges);
            sample.maxNodeCandidates = Math.max(sample.maxNodeCandidates, frameStats.nodeCandidates);
            sample.maxEdgeCandidates = Math.max(sample.maxEdgeCandidates, frameStats.edgeCandidates);
            lodSamples[frameStats.mode] = sample;
            resolve();
        }));
    }
    const focusNode = scene.nodes[500];
    await new Promise((resolve) => requestAnimationFrame(() => {
        renderer.setCamera({ x: focusNode.x, y: focusNode.y, zoom: 2.8 });
        renderer.renderNow();
        resolve();
    }));
    let focusLatencyMs = 0;
    await new Promise((resolve) => requestAnimationFrame(() => {
        const focusStarted = performance.now();
        renderer.setInteraction({ focusedNodeId: focusNode.id });
        renderer.renderNow();
        focusLatencyMs = performance.now() - focusStarted;
        // Keep the historical performance-matrix key while the renderer now
        // exposes the richer semantic mode vocabulary. This captures the
        // actual focused local-plan frame rather than inferring it from zoom.
        const focusStats = renderer.getDebugStats();
        const focusSample = lodSamples.focus || { samples: 0, maxDrawnNodes: 0, maxDrawnEdges: 0, maxNodeCandidates: 0, maxEdgeCandidates: 0 };
        focusSample.samples += 1;
        focusSample.maxDrawnNodes = Math.max(focusSample.maxDrawnNodes, focusStats.drawnNodes);
        focusSample.maxDrawnEdges = Math.max(focusSample.maxDrawnEdges, focusStats.drawnEdges);
        focusSample.maxNodeCandidates = Math.max(focusSample.maxNodeCandidates, focusStats.nodeCandidates);
        focusSample.maxEdgeCandidates = Math.max(focusSample.maxEdgeCandidates, focusStats.edgeCandidates);
        lodSamples.focus = focusSample;
        resolve();
    }));
    await new Promise((resolve) => requestAnimationFrame(() => {
        renderer.setInteraction({ hoveredNodeId: null, focusedNodeId: null, keyboardNodeId: null });
        renderer.setCamera({ x: 0, y: 0, zoom: 1 });
        renderer.renderNow();
        resolve();
    }));
    const ended = performance.now();
    await new Promise((resolve) => setTimeout(resolve, 0));
    updateStats();
    return {
        samples,
        frameMs,
        p50Ms: percentile(frameMs, 0.5),
        p95Ms: percentile(frameMs, 0.95),
        maxMs: Math.max(...frameMs),
        focusLatencyMs,
        firstMeaningfulSceneMs,
        rendererFramesOver100Ms: frameMs.filter((value) => value > 100).length + (focusLatencyMs > 100 ? 1 : 0),
        observedLongTasks: longTasks.filter((entry) => entry.startTime >= started && entry.startTime <= ended + 1 && entry.duration > 100),
        lodSamples,
        stats: renderer.getDebugStats(),
    };
}

canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const currentZoom = renderer.getCamera().zoom;
    renderer.setCamera({ zoom: (event.deltaY < 0 ? 1.12 : 0.89) * currentZoom });
    renderer.renderNow(); updateStats();
}, { passive: false });
canvas.addEventListener('pointerdown', (event) => { dragging = true; lastPointer = { x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    if (dragging && lastPointer) {
        const camera = renderer.getCamera();
        renderer.setCamera({ x: camera.x - (event.clientX - lastPointer.x) / Math.max(0.2, camera.zoom), y: camera.y - (event.clientY - lastPointer.y) / Math.max(0.2, camera.zoom) });
        lastPointer = { x: event.clientX, y: event.clientY }; renderer.renderNow(); updateStats();
    }
    const point = renderer.hitTest({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    canvas.dataset.hoveredNode = point?.id || '';
});
canvas.addEventListener('pointerup', (event) => { dragging = false; lastPointer = null; canvas.releasePointerCapture?.(event.pointerId); });
window.addEventListener('resize', resize);
document.querySelector('#renderer-zoom-in').addEventListener('click', () => { renderer.setCamera({ zoom: 1.15 * renderer.getCamera().zoom }); renderer.renderNow(); updateStats(); });
document.querySelector('#renderer-zoom-out').addEventListener('click', () => { renderer.setCamera({ zoom: 0.87 * renderer.getCamera().zoom }); renderer.renderNow(); updateStats(); });
document.querySelector('#renderer-reset').addEventListener('click', () => { renderer.setCamera({ x: 0, y: 0, zoom: 1 }); renderer.renderNow(); updateStats(); });

window.__nebluxRendererV2 = Object.freeze({
    ready: () => true,
    sceneSize: () => ({ nodes: scene.nodes.length, edges: scene.edges.length }),
    stats: () => renderer.getDebugStats(),
    camera: () => renderer.getCamera(),
    hitTest: (point) => renderer.hitTest(point)?.id || null,
    setOverlayCase: (overlays) => {
        renderer.setAmbientAnimation(false);
        renderer.setScene(overlayScene(overlays));
        renderer.setInteraction({ hoveredNodeId: null, focusedNodeId: null, keyboardNodeId: null });
        renderer.setCamera({ x: 0, y: 0, zoom: 2.8 });
        renderer.renderNow();
        updateStats();
        return renderer.getDebugStats();
    },
    restoreStressScene: () => {
        renderer.setScene(scene);
        renderer.setInteraction({ hoveredNodeId: null, focusedNodeId: null, keyboardNodeId: null });
        renderer.setCamera({ x: 0, y: 0, zoom: 1 });
        renderer.renderNow();
        updateStats();
    },
    benchmark,
    firstMeaningfulSceneMs: () => firstMeaningfulSceneMs,
    longTasks: () => longTasks.map((entry) => ({ ...entry })),
    destroy: () => { longTaskObserver?.disconnect(); renderer.destroy(); },
});
