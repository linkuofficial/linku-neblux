import { normalizeScene, countUnknownTokens, stableSceneHash } from './contract.js';
import { createCamera } from './camera.js';
import { createSpatialIndex } from './spatial-index.js';
import { buildDrawPlan } from './lod-policy.js';
import { drawRoute, normalizeRoute, routeBounds } from './edge-routes.js';
import { createSpriteRegistry } from './sprite-registry.js';
import { drawNodeOverlays } from './overlay-compositor.js';
import { layoutLabels } from './label-layout.js';
import { createAtmosphereCache } from './atmosphere-cache.js';
import { createFrameScheduler } from './frame-scheduler.js';
import { DEFAULT_TOKENS, mergeTokens } from './tokens.js';

function buildIndex(scene, tokens) {
    const nodeById = new Map(scene.nodes.map((node) => [node.id, node]));
    const edgeById = new Map(scene.edges.map((edge) => [edge.id, edge]));
    const adjacency = new Map(scene.nodes.map((node) => [node.id, []]));
    for (const edge of scene.edges) {
        adjacency.get(edge.source).push(edge); adjacency.get(edge.target).push(edge);
    }
    const midEdges = [...scene.edges].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id)).slice(0, tokens.topKBridges);
    const worldBounds = scene.nodes.reduce((bounds, node) => ({ minX: Math.min(bounds.minX, node.x), minY: Math.min(bounds.minY, node.y), maxX: Math.max(bounds.maxX, node.x), maxY: Math.max(bounds.maxY, node.y) }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    const routeBoundsById = new Map();
    for (const edge of scene.edges) routeBoundsById.set(edge.id, routeBounds(normalizeRoute(edge, nodeById.get(edge.source), nodeById.get(edge.target)), nodeById.get(edge.source), nodeById.get(edge.target)));
    return { nodeById, edgeById, adjacency, midEdges, spatial: createSpatialIndex(scene.nodes), worldBounds, routeBoundsById };
}

function nodeAlpha(node) {
    if (node.overlays.includes('dimmed') || node.overlays.includes('filtered')) return 0.22;
    return 1;
}

export function createRendererV2({ canvas, tokens: inputTokens = DEFAULT_TOKENS, reducedMotion = false, schedulerOptions = {} } = {}) {
    if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('Renderer v2 requires a Canvas element');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Renderer v2 requires a 2D Canvas context');
    const tokens = mergeTokens(inputTokens);
    const camera = createCamera();
    const spriteRegistry = createSpriteRegistry({ tokens });
    const atmosphere = createAtmosphereCache({ tokens });
    let scene = null;
    let index = null;
    let destroyed = false;
    let viewport = { width: canvas.clientWidth || canvas.width || 1, height: canvas.clientHeight || canvas.height || 1, dpr: 1 };
    let interaction = { hoveredNodeId: null, focusedNodeId: null, keyboardNodeId: null };
    const stats = {
        drawnNodes: 0, drawnEdges: 0, nodeCandidates: 0, edgeCandidates: 0, hitCandidates: 0,
        unknownArchetypes: 0, unknownOverlays: 0, redrawCount: 0, schedulerState: 'clean', lastFrameMs: 0, mode: 'far', sceneHash: null,
    };

    function setViewport(next = {}) {
        viewport = { ...viewport, ...next, dpr: Number(next.dpr) > 0 ? next.dpr : viewport.dpr };
        canvas.width = Math.max(1, Math.round(viewport.width * viewport.dpr));
        canvas.height = Math.max(1, Math.round(viewport.height * viewport.dpr));
        context.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
        camera.setViewport(viewport);
        if (index) applyCameraBounds();
        scheduler.wake('resize');
        return { ...viewport };
    }

    function applyCameraBounds() {
        if (!index || !Number.isFinite(index.worldBounds.minX)) return;
        const zoom = camera.get().zoom;
        const halfWidth = viewport.width / (2 * zoom);
        const halfHeight = viewport.height / (2 * zoom);
        camera.setBounds({
            minX: index.worldBounds.minX - halfWidth,
            maxX: index.worldBounds.maxX + halfWidth,
            minY: index.worldBounds.minY - halfHeight,
            maxY: index.worldBounds.maxY + halfHeight,
            minZoom: 0.18,
            maxZoom: 8,
        });
    }

    function drawFrame() {
        if (destroyed) return;
        const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
        context.clearRect(0, 0, viewport.width, viewport.height);
        atmosphere.draw(context, viewport.width, viewport.height, viewport.dpr);
        if (!scene || !index) {
            stats.drawnNodes = 0; stats.drawnEdges = 0; stats.nodeCandidates = 0; stats.edgeCandidates = 0;
            stats.redrawCount += 1; stats.lastFrameMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started;
            stats.schedulerState = scheduler.state();
            return;
        }
        const plan = buildDrawPlan({ index, camera, interaction, tokens });
        stats.mode = plan.mode;
        const screenNodes = new Map(plan.nodes.map((node) => [node.id, camera.worldToScreen(node)]));
        context.save();
        context.strokeStyle = plan.mode === 'mid' ? tokens.edgeMid : tokens.edge;
        context.lineWidth = plan.mode === 'far' ? 0 : 0.8;
        context.globalAlpha = plan.mode === 'far' ? 0 : 1;
        let paintedEdges = 0;
        for (const edge of plan.edges) {
            const source = screenNodes.get(edge.source); const target = screenNodes.get(edge.target);
            if (!source || !target) continue;
            const route = normalizeRoute(edge, index.nodeById.get(edge.source), index.nodeById.get(edge.target));
            const sourceWorld = camera.worldToScreen(index.nodeById.get(edge.source));
            const targetWorld = camera.worldToScreen(index.nodeById.get(edge.target));
            const screenRoute = route.type === 'quadratic' ? { ...route, cx: camera.worldToScreen({ x: route.cx, y: route.cy }).x, cy: camera.worldToScreen({ x: route.cx, y: route.cy }).y } : route.type === 'polyline' ? { ...route, points: route.points.map(([x, y]) => { const point = camera.worldToScreen({ x, y }); return [point.x, point.y]; }) } : route;
            drawRoute(context, screenRoute, sourceWorld, targetWorld);
            paintedEdges += 1;
        }
        context.restore();

        for (const node of plan.nodes) {
            const point = screenNodes.get(node.id);
            const magnitude = tokens.magnitude[node.visualMagnitude] || tokens.magnitude.standard;
            const radius = magnitude.halo;
            spriteRegistry.draw(context, node, point.x, point.y, viewport.dpr, nodeAlpha(node));
            drawNodeOverlays(context, node, point.x, point.y, radius, tokens);
        }
        const labels = layoutLabels(plan.nodes, camera, interaction, { cellSize: tokens.labelCellSize });
        context.fillStyle = tokens.label;
        context.font = '12px system-ui, sans-serif';
        for (const item of labels.accepted) { context.globalAlpha = item.node.overlays.includes('dimmed') ? 0.3 : 0.92; context.fillText(item.node.label, item.box.x, item.box.y + item.box.height - 3); }
        context.globalAlpha = 1;
        stats.drawnNodes = plan.nodes.length; stats.drawnEdges = paintedEdges; stats.nodeCandidates = plan.nodeCandidates; stats.edgeCandidates = plan.edgeCandidates;
        stats.redrawCount += 1; stats.lastFrameMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started; stats.schedulerState = scheduler.state();
    }

    const scheduler = createFrameScheduler({ ...schedulerOptions, reducedMotion, onFrame: drawFrame });
    camera.setViewport(viewport);
    setViewport(viewport);

    return {
        setScene(input) {
            if (destroyed) return;
            const unknown = countUnknownTokens(input);
            scene = normalizeScene(input);
            stats.sceneHash = stableSceneHash(scene);
            index = buildIndex(scene, tokens);
            stats.unknownArchetypes = unknown.unknownArchetypes; stats.unknownOverlays = unknown.unknownOverlays;
            applyCameraBounds();
            spriteRegistry.clear(); atmosphere.clear(); scheduler.wake('scene');
        },
        setViewport,
        getCamera() { return camera.get(); },
        setCamera(next) { camera.set(next); applyCameraBounds(); scheduler.wake('camera'); },
        setInteraction(next) { interaction = { ...interaction, ...next }; scheduler.wake('interaction'); },
        hitTest({ x, y, pointerType = 'mouse' } = {}) {
            if (!index) return null;
            const world = camera.screenToWorld({ x, y });
            const radius = Math.max(tokens.hitTargetCssPx / 2 / camera.get().zoom, 24 / camera.get().zoom);
            const candidates = index.spatial.queryPoint(world.x, world.y, radius);
            stats.hitCandidates = candidates.length;
            return candidates.sort((a, b) => {
                const selected = (node) => node.id === interaction.focusedNodeId || node.id === interaction.keyboardNodeId || node.overlays.includes('selected') ? 1 : 0;
                return selected(b) - selected(a) || (b.labelPriority === 'critical' ? 1 : 0) - (a.labelPriority === 'critical' ? 1 : 0) || Math.hypot(a.x - world.x, a.y - world.y) - Math.hypot(b.x - world.x, b.y - world.y) || a.id.localeCompare(b.id);
            })[0] || null;
        },
        wake(reason) { scheduler.wake(reason); },
        renderNow() { if (!scheduler.flush()) drawFrame(); stats.schedulerState = scheduler.state(); },
        getDebugStats() { return { ...stats, schedulerState: scheduler.state(), schedulerPending: scheduler.pending(), spriteCacheSize: spriteRegistry.size(), atmosphereCacheSize: atmosphere.size() }; },
        destroy() { if (destroyed) return; destroyed = true; scheduler.destroy(); spriteRegistry.clear(); atmosphere.clear(); scene = null; index = null; },
    };
}
