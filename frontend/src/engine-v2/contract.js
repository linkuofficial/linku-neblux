import { ARCHETYPES, LABEL_PRIORITIES, MAGNITUDES, OVERLAYS } from './tokens.js';

export const SCENE_SCHEMA_VERSION = '1.0.0';
export const RENDERER_CONTRACT_VERSION = '2.0.0-alpha.1';

const archetypeSet = new Set(ARCHETYPES);
const magnitudeSet = new Set(MAGNITUDES);
const prioritySet = new Set(LABEL_PRIORITIES);
const overlaySet = new Set(OVERLAYS);

function fail(message) {
    throw new TypeError(`Invalid renderer v2 scene: ${message}`);
}

function requiredString(value, path) {
    if (typeof value !== 'string' || value.length === 0) fail(`${path} must be a non-empty string`);
    return value;
}

function finite(value, path) {
    if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${path} must be finite`);
    return value;
}

function copyNode(node, index) {
    if (!node || typeof node !== 'object') fail(`nodes[${index}] must be an object`);
    const id = requiredString(node.id, `nodes[${index}].id`);
    const domains = Array.isArray(node.domains) ? node.domains.filter((value) => typeof value === 'string') : [];
    const overlays = Array.isArray(node.overlays) ? node.overlays.filter((value) => typeof value === 'string') : [];
    return {
        id,
        x: finite(node.x, `nodes[${index}].x`),
        y: finite(node.y, `nodes[${index}].y`),
        label: typeof node.label === 'string' ? node.label : id,
        domains,
        archetype: archetypeSet.has(node.archetype) ? node.archetype : 'concept_star',
        visualMagnitude: magnitudeSet.has(node.visualMagnitude) ? node.visualMagnitude : 'standard',
        labelPriority: prioritySet.has(node.labelPriority) ? node.labelPriority : 'standard',
        overlays,
    };
}

function copyRoute(route) {
    if (!route || typeof route !== 'object') return undefined;
    if (route.type === 'line') return { type: 'line' };
    if (route.type === 'quadratic') {
        if (Number.isFinite(route.cx) && Number.isFinite(route.cy)) return { type: 'quadratic', cx: route.cx, cy: route.cy };
        return undefined;
    }
    if (route.type === 'polyline' && Array.isArray(route.points) && route.points.length >= 2) {
        const points = route.points.map((point) => [Number(point[0]), Number(point[1])]);
        if (points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))) return { type: 'polyline', points };
    }
    return undefined;
}

export function normalizeScene(scene) {
    if (!scene || typeof scene !== 'object') fail('scene must be an object');
    if (scene.schemaVersion !== SCENE_SCHEMA_VERSION) fail(`schemaVersion must be ${SCENE_SCHEMA_VERSION}`);
    if (typeof scene.layoutVersion !== 'string' || scene.layoutVersion.length === 0) fail('layoutVersion must be a non-empty string');
    if (scene.rendererContractVersion !== RENDERER_CONTRACT_VERSION) fail(`rendererContractVersion must be ${RENDERER_CONTRACT_VERSION}`);
    if (!Array.isArray(scene.nodes) || !Array.isArray(scene.edges)) fail('nodes and edges must be arrays');

    const nodes = scene.nodes.map(copyNode);
    const nodeIds = new Set();
    for (const node of nodes) {
        if (nodeIds.has(node.id)) fail(`duplicate node id ${node.id}`);
        nodeIds.add(node.id);
    }

    const edgeIds = new Set();
    const edges = scene.edges.map((edge, index) => {
        if (!edge || typeof edge !== 'object') fail(`edges[${index}] must be an object`);
        const id = requiredString(edge.id, `edges[${index}].id`);
        const source = requiredString(edge.source, `edges[${index}].source`);
        const target = requiredString(edge.target, `edges[${index}].target`);
        if (source === target) fail(`edges[${index}] cannot be a self-loop`);
        if (!nodeIds.has(source) || !nodeIds.has(target)) fail(`edges[${index}] has dangling endpoint`);
        if (edgeIds.has(id)) fail(`duplicate edge id ${id}`);
        edgeIds.add(id);
        return {
            id, source, target,
            priority: Number.isFinite(edge.priority) ? edge.priority : 0,
            lodClass: typeof edge.lodClass === 'string' ? edge.lodClass : 'standard',
            directed: Boolean(edge.directed),
            styleToken: typeof edge.styleToken === 'string' ? edge.styleToken : 'default',
            route: copyRoute(edge.route),
            overlays: Array.isArray(edge.overlays) ? edge.overlays.filter((value) => typeof value === 'string') : [],
        };
    });

    return {
        schemaVersion: SCENE_SCHEMA_VERSION,
        layoutVersion: scene.layoutVersion,
        rendererContractVersion: RENDERER_CONTRACT_VERSION,
        nodes,
        edges,
    };
}

export function countUnknownTokens(scene) {
    return scene.nodes.reduce((result, node) => {
        for (const overlay of Array.isArray(node.overlays) ? node.overlays : []) if (!overlaySet.has(overlay)) result.unknownOverlays += 1;
        if (node.archetype != null && !archetypeSet.has(node.archetype)) result.unknownArchetypes += 1;
        return result;
    }, { unknownArchetypes: 0, unknownOverlays: 0 });
}

export function stableSceneHash(scene) {
    const json = JSON.stringify(scene);
    let hash = 2166136261;
    for (let i = 0; i < json.length; i++) hash = Math.imul(hash ^ json.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(16).padStart(8, '0');
}
