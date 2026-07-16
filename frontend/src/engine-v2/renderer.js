import { normalizeScene, countUnknownTokens, stableSceneHash } from './contract.js';
import { createCamera } from './camera.js';
import { createSpatialIndex } from './spatial-index.js';
import { buildDrawPlan } from './lod-policy.js';
import { drawRoute, normalizeRoute, routeBounds } from './edge-routes.js';
import { createSpriteRegistry, twinkleAlpha } from './sprite-registry.js';
import { drawNodeOverlays } from './overlay-compositor.js';
import { layoutLabelCandidates } from './label-layout.js';
import { createAtmosphereCache, createNebulaSprite } from './atmosphere-cache.js';
import { createFrameScheduler } from './frame-scheduler.js';
import { DEFAULT_TOKENS, mergeTokens } from './tokens.js';
import { hexA } from '../engine/geometry.js';

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
    if (node.overlays.includes('filtered')) return 0.10;
    if (node.overlays.includes('dimmed')) return 0.15;
    return 1;
}

function isFiltered(node) { return node?.overlays.includes('filtered') && !node.overlays.includes('selected'); }

function screenRouteFor(edge, index, camera) {
    const sourceNode = index.nodeById.get(edge.source);
    const targetNode = index.nodeById.get(edge.target);
    const route = normalizeRoute(edge, sourceNode, targetNode);
    if (route.type === 'quadratic') {
        const control = camera.worldToScreen({ x: route.cx, y: route.cy });
        return { ...route, cx: control.x, cy: control.y };
    }
    if (route.type === 'polyline') {
        return { ...route, points: route.points.map(([x, y]) => { const point = camera.worldToScreen({ x, y }); return [point.x, point.y]; }) };
    }
    return route;
}

function easePulse(nowMs, durationMs, low = 0.8, high = 1) {
    const phase = ((Number(nowMs) || 0) % durationMs) / durationMs;
    return low + (high - low) * ((1 - Math.cos(phase * Math.PI * 2)) / 2);
}

function shouldAllocateNodeLabel(node, interaction, semanticMode) {
    const selected = node.id === interaction.focusedNodeId || node.id === interaction.keyboardNodeId || node.overlays.includes('selected');
    const hovered = node.id === interaction.hoveredNodeId;
    const related = node.overlays.includes('related') || node.overlays.includes('guided_spine');
    const domainCore = node.archetype === 'domain_core' || node.archetype === 'galactic_nucleus';
    const spatialAnchor = node.archetype === 'subfield_giant' || node.visualMagnitude === 'nucleus' || node.visualMagnitude === 'major';
    // At the far overview, the stars still establish the whole field but
    // only its navigational anchors may speak. This is a priority decision,
    // not a fixed label cap: zooming in re-opens the shared allocator to
    // ordinary concepts wherever real screen space exists.
    if (semanticMode === 'overview') return selected || hovered || related || domainCore || spatialAnchor;
    if (node.overlays.includes('filtered')) return selected;
    if (node.overlays.includes('dimmed')) return selected || hovered || related;
    return true;
}

function nodeLabelCandidate(node, point, interaction, tokens) {
    const selected = node.id === interaction.focusedNodeId || node.id === interaction.keyboardNodeId || node.overlays.includes('selected');
    const hovered = node.id === interaction.hoveredNodeId;
    const related = node.overlays.includes('related');
    const guided = node.overlays.includes('guided_spine');
    const domainCore = node.archetype === 'domain_core' || node.archetype === 'galactic_nucleus';
    const contextual = node.labelPriority === 'critical' ? 'critical' : node.labelPriority === 'high' ? 'high' : node.labelPriority === 'standard';
    const fontSize = selected ? tokens.labelSizeFocus : domainCore ? tokens.labelSizeDomain : related || guided ? tokens.labelSizeRelated : tokens.labelSizeAmbient;
    const alpha = selected || hovered ? 0.98 : domainCore ? 0.90 : related || guided ? 0.86 : contextual === 'critical' ? 0.80 : contextual === 'high' ? 0.70 : 0.56;
    return {
        id: `node:${node.id}`,
        kind: 'node',
        text: node.label,
        anchor: point,
        fontSize,
        padding: tokens.labelPadding,
        alpha,
        weight: selected || hovered || domainCore ? 600 : related || guided ? 500 : 400,
        priority: Number(node.labelPriority === 'critical') * 3 + Number(node.labelPriority === 'high') * 2 + Number(node.labelPriority === 'standard'),
        context: { selected, keyboard: node.id === interaction.keyboardNodeId, hovered, domainCore, related, guided, contextual },
    };
}

// Tour bundles currently carry their accent as a domain code (for example
// PHY), while Canvas expects a CSS colour. Resolve that code against the
// renderer tokens at the boundary. Unknown bare identifiers intentionally
// fall back to the quiet guided colour: assigning an invalid Canvas colour
// would otherwise preserve the preceding constellation's strokeStyle.
export function resolvePresentationAccent(accent, tokens = DEFAULT_TOKENS) {
    if (typeof accent !== 'string') return tokens.guided;
    const value = accent.trim();
    if (!value) return tokens.guided;
    const domainColour = tokens.colors?.[value.toUpperCase()];
    if (domainColour) return domainColour;
    if (/^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(value)) return value;
    return tokens.guided;
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
    let presentation = { bundles: [], guidedSegments: [], learningSegments: [], constellations: [], activeConstellationId: null, hoveredConstellationId: null, safeRects: [], learning: { enabled: false, hasContext: false, chainNodeIds: [] } };
    let nebulae = [];
    const nebulaSprites = new Map(); // domain → baked sprite; colour/domain-dependent only, survives setScene
    let vignetteCache = null;
    let destroyed = false;
    let viewport = { width: canvas.clientWidth || canvas.width || 1, height: canvas.clientHeight || canvas.height || 1, dpr: 1 };
    let interaction = { hoveredNodeId: null, focusedNodeId: null, keyboardNodeId: null, activeConstellationId: null, hoveredConstellationId: null };
    let previousLabelState = null;
    let previousExploreEdges = new Map();
    let exploreEdgeFade = { key: null, startedAt: 0, trailing: [] };
    const stats = {
        drawnNodes: 0, drawnEdges: 0, nodeCandidates: 0, edgeCandidates: 0, hitCandidates: 0,
        unknownArchetypes: 0, unknownOverlays: 0, redrawCount: 0, sceneRebuilds: 0, schedulerState: 'clean', lastFrameMs: 0, mode: 'far', semanticMode: 'overview', edgePlanKind: 'none', sceneHash: null, bundlesDrawn: 0, guidedSegmentsDrawn: 0, photonsDrawn: 0, learningSegmentsDrawn: 0, constellationsDrawn: 0, nodeLabelsAccepted: 0, wonderLabelsAccepted: 0, activeWonderId: null, hoveredWonderId: null,
    };

    function setViewport(next = {}) {
        viewport = { ...viewport, ...next, dpr: Number(next.dpr) > 0 ? next.dpr : viewport.dpr };
        canvas.width = Math.max(1, Math.round(viewport.width * viewport.dpr));
        canvas.height = Math.max(1, Math.round(viewport.height * viewport.dpr));
        context.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
        camera.setViewport(viewport);
        if (index) applyCameraBounds();
        syncAmbient();
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

    function syncAmbient() {
        const visible = typeof document === 'undefined' || document.visibilityState !== 'hidden';
        const fps = viewport.width <= 768 ? tokens.mobileAmbientFps : tokens.ambientFps;
        scheduler.setAnimation('ambient', visible, fps);
    }

    function drawFrame(nowMs = 0) {
        if (destroyed) return;
        const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
        context.clearRect(0, 0, viewport.width, viewport.height);
        const cameraState = camera.get();
        atmosphere.draw(context, viewport.width, viewport.height, viewport.dpr, -cameraState.x, -cameraState.y);
        // Per-domain nebula fog — world-anchored, additive, under everything
        // else (the sky's depth layer, mirroring the production engine).
        if (nebulae.length && tokens.nebulaAlpha > 0) {
            context.save();
            context.globalCompositeOperation = 'lighter';
            context.globalAlpha = tokens.nebulaAlpha;
            const zoom = camera.get().zoom;
            const screenRadius = Math.min(tokens.nebulaMaxScreenRadius, tokens.nebulaWorldRadius * zoom);
            for (const nebula of nebulae) {
                const point = camera.worldToScreen(nebula);
                context.drawImage(nebula.sprite.canvas, point.x - screenRadius, point.y - screenRadius, screenRadius * 2, screenRadius * 2);
            }
            context.restore();
        }
        if (!scene || !index) {
            stats.drawnNodes = 0; stats.drawnEdges = 0; stats.bundlesDrawn = 0; stats.guidedSegmentsDrawn = 0; stats.photonsDrawn = 0; stats.learningSegmentsDrawn = 0; stats.constellationsDrawn = 0; stats.nodeCandidates = 0; stats.edgeCandidates = 0;
            stats.redrawCount += 1; stats.lastFrameMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started;
            stats.schedulerState = scheduler.state();
            return;
        }
        const plan = buildDrawPlan({ index, camera, interaction, tokens });
        stats.mode = plan.mode;
        const screenNodes = new Map(plan.nodes.map((node) => [node.id, camera.worldToScreen(node)]));
        context.save();
        let bundlesDrawn = 0;
        let guidedSegmentsDrawn = 0;
        let learningSegmentsDrawn = 0;
        let constellationsDrawn = 0;
        let photonsDrawn = 0;
        const wonderLabelCandidates = [];
        if (plan.semanticMode === 'explore' && Array.isArray(presentation.bundles)) {
            context.strokeStyle = tokens.bundleStroke || 'rgba(245, 210, 135, 0.24)';
            context.lineWidth = 1.25;
            context.setLineDash([5, 7]);
            for (const bundle of presentation.bundles) {
                const source = index.nodeById.get(bundle.source); const target = index.nodeById.get(bundle.target);
                if (!source || !target) continue;
                const start = camera.worldToScreen(source); const end = camera.worldToScreen(target);
                const control = camera.worldToScreen({ x: bundle.route?.cx ?? (source.x + target.x) / 2, y: bundle.route?.cy ?? (source.y + target.y) / 2 });
                context.globalAlpha = Math.min(.72, .18 + Math.log1p(bundle.count || 1) * .12);
                context.beginPath(); context.moveTo(start.x, start.y); context.quadraticCurveTo(control.x, control.y, end.x, end.y); context.stroke(); bundlesDrawn += 1;
            }
            context.setLineDash([]); context.globalAlpha = 1;
        }
        if (presentation.guidedSegments.length && plan.semanticMode === 'wonder-active') {
            context.strokeStyle = tokens.guidedStroke || 'rgba(164, 216, 255, 0.62)';
            context.lineWidth = 1.15;
            context.setLineDash([4, 6]);
            for (const segment of presentation.guidedSegments) {
                const source = index.nodeById.get(segment.source); const target = index.nodeById.get(segment.target);
                if (!source || !target) continue;
                const start = camera.worldToScreen(source); const end = camera.worldToScreen(target);
                const control = camera.worldToScreen({ x: segment.route?.cx ?? (source.x + target.x) / 2, y: segment.route?.cy ?? (source.y + target.y) / 2 });
                context.beginPath(); context.moveTo(start.x, start.y); context.quadraticCurveTo(control.x, control.y, end.x, end.y); context.stroke(); guidedSegmentsDrawn += 1;
            }
            context.setLineDash([]);
        }
        if (presentation.learning.hasContext && presentation.learningSegments.length && plan.semanticMode !== 'overview') {
            context.strokeStyle = tokens.learningStroke;
            context.lineWidth = 1;
            for (const segment of presentation.learningSegments) {
                const sourceNode = index.nodeById.get(segment.source); const targetNode = index.nodeById.get(segment.target);
                if (!sourceNode || !targetNode) continue;
                const source = camera.worldToScreen(sourceNode); const target = camera.worldToScreen(targetNode);
                context.globalAlpha = segment.onChain ? 0.78 : 0.22;
                context.setLineDash(segment.onChain ? [28, 120] : []);
                context.lineDashOffset = segment.onChain && !reducedMotion ? -((nowMs % tokens.photonDurationMs) / tokens.photonDurationMs) * 148 : 0;
                context.beginPath(); context.moveTo(source.x, source.y); context.lineTo(target.x, target.y); context.stroke();
                const angle = Math.atan2(target.y - source.y, target.x - source.x);
                context.setLineDash([]);
                context.beginPath();
                context.moveTo(target.x, target.y);
                context.lineTo(target.x - Math.cos(angle - 0.45) * 7, target.y - Math.sin(angle - 0.45) * 7);
                context.moveTo(target.x, target.y);
                context.lineTo(target.x - Math.cos(angle + 0.45) * 7, target.y - Math.sin(angle + 0.45) * 7);
                context.stroke();
                learningSegmentsDrawn += 1;
            }
            context.globalAlpha = 1;
            context.lineDashOffset = 0;
        }
        const baseEdgeStyle = plan.semanticMode === 'explore' ? tokens.edgeMid : tokens.edge;
        context.strokeStyle = baseEdgeStyle;
        context.lineWidth = plan.semanticMode === 'overview' ? 0 : 0.8;
        context.globalAlpha = plan.semanticMode === 'overview' ? 0 : 1;
        // The LOD policy already stabilizes selection against tiny camera
        // movements. Within Explore, retain only edges that just left the
        // budget briefly, so the structural bridge field does not hard-pop.
        if (plan.semanticMode === 'explore') {
            const nextEdges = new Map(plan.edges.map((edge) => [edge.id, edge]));
            const planKey = plan.edgePlan?.stabilityKey || [...nextEdges.keys()].join('|');
            if (exploreEdgeFade.key !== planKey) {
                exploreEdgeFade = {
                    key: planKey,
                    startedAt: nowMs,
                    trailing: [...previousExploreEdges.values()].filter((edge) => !nextEdges.has(edge.id)),
                };
            }
            previousExploreEdges = nextEdges;
            const fade = reducedMotion ? 1 : Math.min(1, Math.max(0, (nowMs - exploreEdgeFade.startedAt) / Math.max(1, tokens.lodFadeMs)));
            if (fade < 1 && exploreEdgeFade.trailing.length) {
                context.strokeStyle = baseEdgeStyle;
                context.lineWidth = 0.65;
                context.globalAlpha = (1 - fade) * 0.35;
                for (const edge of exploreEdgeFade.trailing) {
                    const source = index.nodeById.get(edge.source); const target = index.nodeById.get(edge.target);
                    if (!source || !target || isFiltered(source) || isFiltered(target)) continue;
                    const sourcePoint = camera.worldToScreen(source); const targetPoint = camera.worldToScreen(target);
                    drawRoute(context, screenRouteFor(edge, index, camera), sourcePoint, targetPoint);
                }
            }
        } else {
            previousExploreEdges = new Map();
            exploreEdgeFade = { key: null, startedAt: nowMs, trailing: [] };
        }
        // Focus lighting: edges touching the focused node brighten with a
        // gradient stroke (bright endpoints, dim mid-span) while the resting
        // sky's lines recede — the production focus behaviour, no animation.
        const focusedId = interaction.focusedNodeId;
        const focusedEdges = focusedId ? plan.edges.filter((edge) => edge.source === focusedId || edge.target === focusedId)
            .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id)) : [];
        const focusRank = new Map(focusedEdges.map((edge, rank) => [edge.id, rank]));
        let paintedEdges = 0;
        for (const edge of plan.edges) {
            const source = screenNodes.get(edge.source); const target = screenNodes.get(edge.target);
            if (!source || !target) continue;
            const sourceNode = index.nodeById.get(edge.source);
            const targetNode = index.nodeById.get(edge.target);
            const filteredEndpoint = isFiltered(sourceNode) || isFiltered(targetNode);
            const sourceWorld = camera.worldToScreen(index.nodeById.get(edge.source));
            const targetWorld = camera.worldToScreen(index.nodeById.get(edge.target));
            const screenRoute = screenRouteFor(edge, index, camera);
            if (filteredEndpoint) {
                // A domain filter is a scene constraint, not just a node
                // tint. Its incompatible links must recede with the star.
                context.strokeStyle = baseEdgeStyle;
                context.lineWidth = 0.6;
                context.globalAlpha = Math.min(tokens.filtered, 0.12);
            } else if (focusedId && plan.semanticMode === 'focused') {
                if (edge.source === focusedId || edge.target === focusedId) {
                    const rank = focusRank.get(edge.id) ?? Infinity;
                    const gradient = typeof context.createLinearGradient === 'function'
                        ? context.createLinearGradient(sourceWorld.x, sourceWorld.y, targetWorld.x, targetWorld.y) : null;
                    if (gradient && typeof gradient.addColorStop === 'function') {
                        gradient.addColorStop(0, hexA(tokens.edgeFocus, tokens.edgeFocusEnd));
                        gradient.addColorStop(0.5, hexA(tokens.edgeFocus, tokens.edgeFocusMid));
                        gradient.addColorStop(1, hexA(tokens.edgeFocus, tokens.edgeFocusEnd));
                        context.strokeStyle = gradient;
                    } else {
                        context.strokeStyle = hexA(tokens.edgeFocus, tokens.edgeFocusEnd);
                    }
                    context.lineWidth = rank < tokens.focusStaticCount ? 1.2 : 0.8;
                    context.globalAlpha = rank < tokens.focusStaticCount ? 1 : 0.4;
                } else {
                    context.strokeStyle = baseEdgeStyle;
                    context.lineWidth = 0.65;
                    // buildDrawPlan includes second-hop edges in focus mode;
                    // retaining them very faintly preserves local context
                    // without competing with the focused constellation.
                    context.globalAlpha = Math.min(tokens.restEdgeDim, 0.14);
                }
            }
            drawRoute(context, screenRoute, sourceWorld, targetWorld);
            paintedEdges += 1;
        }
        if (focusedId && plan.semanticMode === 'focused' && !reducedMotion) {
            context.strokeStyle = hexA(tokens.edgeFocus, 0.72);
            context.lineWidth = 1.1;
            context.setLineDash([48, 260]);
            context.lineDashOffset = -((nowMs % tokens.photonDurationMs) / tokens.photonDurationMs) * 308;
            const primaryEdgeIds = new Set(plan.edgePlan?.primaryEdgeIds || []);
            for (const edge of focusedEdges.filter((edge) => primaryEdgeIds.has(edge.id)).slice(0, tokens.focusPhotonCount)) {
                const source = camera.worldToScreen(index.nodeById.get(edge.source));
                const target = camera.worldToScreen(index.nodeById.get(edge.target));
                drawRoute(context, screenRouteFor(edge, index, camera), source, target);
                photonsDrawn += 1;
            }
            context.setLineDash([]); context.lineDashOffset = 0; context.globalAlpha = 1;
        }
        context.restore();

        if ((plan.zoomBand === 'overview' || plan.semanticMode === 'wonder-active' || presentation.hoveredConstellationId) && presentation.constellations.length) {
            const restAlpha = plan.semanticMode === 'wonder-active' ? 0.20 : Math.max(0.42, Math.min(0.72, (tokens.midZoom - cameraState.zoom) / Math.max(0.01, tokens.midZoom - tokens.farZoom)));
            context.save();
            for (const constellation of presentation.constellations) {
                const nodes = constellation.nodeIds.map((id) => index.nodeById.get(id)).filter(Boolean);
                if (!nodes.length) continue;
                const accent = resolvePresentationAccent(constellation.accent, tokens);
                const constellationId = constellation.id || constellation.name;
                const active = constellationId === presentation.activeConstellationId || constellationId === interaction.activeConstellationId;
                const hovered = constellationId === presentation.hoveredConstellationId || constellationId === interaction.hoveredConstellationId;
                const centroid = nodes.reduce((sum, node) => ({ x: sum.x + node.x, y: sum.y + node.y }), { x: 0, y: 0 });
                const labelAt = camera.worldToScreen({ x: centroid.x / nodes.length, y: centroid.y / nodes.length });
                // A resting Wonder is a small named entrance, not a second
                // edge layer. Hover/active earns the journey spine; active
                // leaves the other Wonders as quieter stations.
                context.fillStyle = accent;
                context.globalAlpha = active ? 0.96 : hovered ? 0.82 : restAlpha;
                context.beginPath(); context.arc(labelAt.x, labelAt.y, active ? 4 : hovered ? 3.2 : 2.1, 0, Math.PI * 2); context.fill();
                if (active || hovered) {
                    context.strokeStyle = accent;
                    context.globalAlpha = active ? 0.86 : 0.70;
                    context.lineWidth = active ? 1.2 : 1;
                    context.setLineDash(active ? [] : [2, 7]);
                    for (const segment of constellation.segments) {
                        const sourceNode = index.nodeById.get(segment.source); const targetNode = index.nodeById.get(segment.target);
                        if (!sourceNode || !targetNode) continue;
                        const source = camera.worldToScreen(sourceNode); const target = camera.worldToScreen(targetNode);
                        context.beginPath(); context.moveTo(source.x, source.y); context.lineTo(target.x, target.y); context.stroke();
                    }
                    context.setLineDash([]);
                }
                wonderLabelCandidates.push({
                    id: `wonder:${constellationId}`,
                    kind: 'wonder',
                    text: constellation.name,
                    anchor: labelAt,
                    accent,
                    alpha: active ? 0.96 : hovered ? 0.84 : restAlpha,
                    fontSize: tokens.labelSizeWonder + (active ? 1 : 0),
                    padding: tokens.labelPadding,
                    priority: nodes.length * 100 + constellation.segments.length,
                    context: { activeWonderStation: active || hovered, wonder: true },
                });
                constellationsDrawn += 1;
            }
            context.restore();
        }

        // Deep Field: star bodies composite additively so overlapping glow
        // accumulates like the production engine. The untouched sky keeps the
        // suppressed (ambient) rendition of its domain colour; interaction
        // earns the full colour plus an extra additive brightness stamp
        // (selected > hovered > related) — the production "restraint" rule.
        context.globalCompositeOperation = 'lighter';
        for (const node of plan.nodes) {
            const point = screenNodes.get(node.id);
            const isLit = node.id === interaction.hoveredNodeId || node.id === interaction.focusedNodeId || node.id === interaction.keyboardNodeId
                || node.overlays.includes('selected') || node.overlays.includes('related') || node.overlays.includes('guided_spine');
            const ambientAlpha = twinkleAlpha(node, nowMs, reducedMotion);
            spriteRegistry.draw(context, node, point.x, point.y, viewport.dpr, nodeAlpha(node) * ambientAlpha, isLit);
            const boost = node.overlays.includes('selected') ? 0.35
                : node.id === interaction.hoveredNodeId ? 0.3
                : node.overlays.includes('related') ? 0.25 : 0;
            if (boost) spriteRegistry.draw(context, node, point.x, point.y, viewport.dpr, boost, true);
        }
        context.globalCompositeOperation = 'source-over';
        const focusPulse = reducedMotion ? 1 : easePulse(nowMs, 3800, 0.80, 1);
        const availablePulse = reducedMotion ? 1 : easePulse(nowMs, 2400, 0.72, 1);
        for (const node of plan.nodes) {
            const point = screenNodes.get(node.id);
            const magnitude = tokens.magnitude[node.visualMagnitude] || tokens.magnitude.standard;
            // Overlay rings are pointer-scale affordances, not optical scatter,
            // so they ride on the tier's `ring` radius. Tightening a star's halo
            // must never shrink its selection corona.
            const ringRadius = Number.isFinite(magnitude.ring) ? magnitude.ring : magnitude.halo;
            drawNodeOverlays(context, node, point.x, point.y, ringRadius, tokens, { focusPulse, availablePulse, mode: plan.mode });
        }
        // Vignette above the stars, below the labels — the same layering as
        // the production engine, cached per viewport size.
        if (tokens.vignette > 0 && typeof context.createRadialGradient === 'function') {
            if (!vignetteCache || vignetteCache.width !== viewport.width || vignetteCache.height !== viewport.height) {
                const outer = Math.hypot(viewport.width / 2, viewport.height / 2);
                const gradient = context.createRadialGradient(viewport.width / 2, viewport.height / 2, outer * 0.42, viewport.width / 2, viewport.height / 2, outer);
                if (gradient && typeof gradient.addColorStop === 'function') {
                    gradient.addColorStop(0, `rgba(${tokens.vignetteColor},0)`);
                    gradient.addColorStop(1, `rgba(${tokens.vignetteColor},${tokens.vignette})`);
                    vignetteCache = { width: viewport.width, height: viewport.height, gradient };
                }
            }
            if (vignetteCache) {
                context.fillStyle = vignetteCache.gradient;
                context.fillRect(0, 0, viewport.width, viewport.height);
            }
        }
        const labelCandidates = [
            ...plan.nodes.filter((node) => shouldAllocateNodeLabel(node, interaction, plan.semanticMode))
                .map((node) => nodeLabelCandidate(node, screenNodes.get(node.id), interaction, tokens)),
            ...wonderLabelCandidates,
        ];
        const labels = layoutLabelCandidates(labelCandidates, {
            viewport: { x: 0, y: 0, width: viewport.width, height: viewport.height },
            reservedRects: presentation.safeRects,
            previous: previousLabelState,
            cellSize: tokens.labelCellSize,
            fontSize: tokens.labelSizeAmbient,
            padding: tokens.labelPadding,
            hysteresis: tokens.labelHysteresis,
        });
        previousLabelState = labels.state;
        context.lineJoin = 'round';
        context.lineWidth = 3;
        context.strokeStyle = tokens.labelStroke;
        for (const item of labels.accepted) {
            const isWonder = item.kind === 'wonder';
            context.font = isWonder
                ? `600 ${item.fontSize}px "IBM Plex Mono", ui-monospace, monospace`
                : `${item.weight || 400} ${item.fontSize}px "IBM Plex Mono", ui-monospace, monospace`;
            context.globalAlpha = isWonder ? Math.min(0.96, (item.alpha || 0.6) + 0.12) : (item.alpha || 0.72);
            context.textAlign = item.align;
            if (tokens.labelStroke) context.strokeText(item.text, item.x, item.y);
            context.fillStyle = isWonder ? item.accent : tokens.label;
            context.fillText(item.text, item.x, item.y);
            if (isWonder && item.align === 'center') {
                context.beginPath(); context.arc(item.x, item.y + 7, 1.5, 0, Math.PI * 2); context.fill();
            }
        }
        context.textAlign = 'start';
        context.globalAlpha = 1;
        // Candidate stats describe canonical node bodies accepted by the
        // final draw plan. They deliberately exclude labels, overlays and
        // Wonder markers, while including an off-viewport endpoint pulled in
        // for a selected structural edge; therefore drawnNodes is bounded by
        // this metric on every semantic plan.
        stats.drawnNodes = plan.nodes.length; stats.drawnEdges = paintedEdges; stats.bundlesDrawn = bundlesDrawn; stats.guidedSegmentsDrawn = guidedSegmentsDrawn; stats.photonsDrawn = photonsDrawn; stats.learningSegmentsDrawn = learningSegmentsDrawn; stats.constellationsDrawn = constellationsDrawn; stats.nodeCandidates = plan.nodes.length; stats.edgeCandidates = plan.edgeCandidates; stats.semanticMode = plan.semanticMode; stats.edgePlanKind = plan.edgePlan?.kind || 'none'; stats.nodeLabelsAccepted = labels.accepted.filter((item) => item.kind === 'node').length; stats.wonderLabelsAccepted = labels.accepted.filter((item) => item.kind === 'wonder').length; stats.activeWonderId = presentation.activeConstellationId || interaction.activeConstellationId; stats.hoveredWonderId = presentation.hoveredConstellationId || interaction.hoveredConstellationId;
        stats.redrawCount += 1; stats.lastFrameMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started; stats.schedulerState = scheduler.state();
    }

    const scheduler = createFrameScheduler({ ...schedulerOptions, reducedMotion, onFrame: drawFrame });
    const visibilityHandler = () => syncAmbient();
    if (typeof document !== 'undefined') document.addEventListener?.('visibilitychange', visibilityHandler);
    camera.setViewport(viewport);
    setViewport(viewport);

    return {
        setScene(input) {
            if (destroyed) return;
            const unknown = countUnknownTokens(input);
            scene = normalizeScene(input);
            stats.sceneHash = stableSceneHash(scene);
            index = buildIndex(scene, tokens);
            stats.sceneRebuilds += 1;
            stats.unknownArchetypes = unknown.unknownArchetypes; stats.unknownOverlays = unknown.unknownOverlays;
            // One nebula per domain, anchored on that domain's core star —
            // derived from the scene itself, deterministic across sessions.
            // Sprites depend only on domain + colour, so they are baked once
            // and reused across the page's per-interaction setScene calls.
            nebulae = [];
            if (tokens.nebulaAlpha > 0) {
                const seen = new Set();
                for (const node of scene.nodes) {
                    if (node.archetype !== 'galactic_nucleus' && node.archetype !== 'domain_core') continue;
                    const domain = node.domains[0];
                    if (!domain || seen.has(domain)) continue;
                    if (!nebulaSprites.has(domain)) nebulaSprites.set(domain, createNebulaSprite(domain, tokens.colors[domain] || tokens.colors.default));
                    const sprite = nebulaSprites.get(domain);
                    if (!sprite) continue;
                    seen.add(domain);
                    nebulae.push({ x: node.x, y: node.y, sprite });
                }
            }
            applyCameraBounds();
            scheduler.wake('scene');
        },
        setNodeVisuals(inputNodes = []) {
            if (!scene || !index || !Array.isArray(inputNodes)) return false;
            let changed = false;
            for (const next of inputNodes) {
                const node = index.nodeById.get(next?.id);
                if (!node) continue;
                if (Array.isArray(next.overlays)) node.overlays = [...next.overlays];
                if (typeof next.label === 'string') node.label = next.label;
                if (typeof next.labelPriority === 'string') node.labelPriority = next.labelPriority;
                changed = true;
            }
            if (changed) {
                const unknown = countUnknownTokens(scene);
                stats.unknownArchetypes = unknown.unknownArchetypes; stats.unknownOverlays = unknown.unknownOverlays;
                scheduler.wake('node-visuals');
            }
            return changed;
        },
        setViewport,
        getCamera() { return camera.get(); },
        worldToScreen(point) { return camera.worldToScreen(point); },
        screenToWorld(point) { return camera.screenToWorld(point); },
        setCamera(next) { camera.set(next); applyCameraBounds(); scheduler.wake('camera'); },
        setInteraction(next) { interaction = { ...interaction, ...next }; scheduler.wake('interaction'); },
        setAmbientAnimation(enabled) {
            const fps = viewport.width <= 768 ? tokens.mobileAmbientFps : tokens.ambientFps;
            scheduler.setAnimation('ambient', Boolean(enabled), fps);
        },
        setPresentation(input = {}) {
            const bundles = Array.isArray(input.bundles) ? input.bundles.filter((bundle) => bundle && typeof bundle.source === 'string' && typeof bundle.target === 'string' && bundle.source !== bundle.target && Number.isFinite(bundle.count) && bundle.count > 0) : [];
            const guidedSegments = Array.isArray(input.guidedSegments) ? input.guidedSegments.filter((segment) => segment && typeof segment.source === 'string' && typeof segment.target === 'string' && segment.source !== segment.target) : [];
            const learningSegments = Array.isArray(input.learningSegments) ? input.learningSegments.filter((segment) => segment && typeof segment.source === 'string' && typeof segment.target === 'string' && segment.source !== segment.target) : [];
            const constellations = Array.isArray(input.constellations) ? input.constellations.filter((item) => item && typeof item.name === 'string' && Array.isArray(item.nodeIds)) : [];
            const safeRects = Array.isArray(input.safeRects) ? input.safeRects.filter((rect) => Number.isFinite(rect?.x) && Number.isFinite(rect?.y) && Number.isFinite(rect?.width) && Number.isFinite(rect?.height) && rect.width > 0 && rect.height > 0) : [];
            presentation = {
                bundles: bundles.map((bundle) => ({ source: bundle.source, target: bundle.target, count: bundle.count, route: bundle.route && Number.isFinite(bundle.route.cx) && Number.isFinite(bundle.route.cy) ? { cx: bundle.route.cx, cy: bundle.route.cy } : undefined })),
                guidedSegments: guidedSegments.map((segment) => ({ source: segment.source, target: segment.target, route: segment.route && Number.isFinite(segment.route.cx) && Number.isFinite(segment.route.cy) ? { cx: segment.route.cx, cy: segment.route.cy } : undefined })),
                learningSegments: learningSegments.map((segment) => ({ source: segment.source, target: segment.target, onChain: Boolean(segment.onChain) })),
                constellations: constellations.map((item) => ({ id: typeof item.id === 'string' ? item.id : item.name, name: item.name, accent: item.accent, nodeIds: [...item.nodeIds], segments: Array.isArray(item.segments) ? item.segments.filter((segment) => segment && typeof segment.source === 'string' && typeof segment.target === 'string') : [] })),
                activeConstellationId: typeof input.activeConstellationId === 'string' ? input.activeConstellationId : null,
                hoveredConstellationId: typeof input.hoveredConstellationId === 'string' ? input.hoveredConstellationId : null,
                safeRects: safeRects.map((rect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })),
                learning: {
                    enabled: Boolean(input.learning?.enabled),
                    hasContext: Boolean(input.learning?.hasContext),
                    chainNodeIds: Array.isArray(input.learning?.chainNodeIds) ? input.learning.chainNodeIds.filter((id) => typeof id === 'string') : [],
                },
            };
            scheduler.wake('presentation');
        },
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
        getDebugStats() { return { ...stats, schedulerState: scheduler.state(), schedulerPending: scheduler.pending(), activeAnimations: scheduler.activeAnimations(), spriteCacheSize: spriteRegistry.size(), atmosphereCacheSize: atmosphere.size() }; },
        destroy() { if (destroyed) return; destroyed = true; if (typeof document !== 'undefined') document.removeEventListener?.('visibilitychange', visibilityHandler); scheduler.destroy(); spriteRegistry.clear(); atmosphere.clear(); scene = null; index = null; nebulae = []; nebulaSprites.clear(); vignetteCache = null; presentation = { bundles: [], guidedSegments: [], learningSegments: [], constellations: [], activeConstellationId: null, hoveredConstellationId: null, safeRects: [], learning: { enabled: false, hasContext: false, chainNodeIds: [] } }; },
    };
}
