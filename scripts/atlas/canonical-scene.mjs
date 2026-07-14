import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeScene, stableSceneHash, SCENE_SCHEMA_VERSION, RENDERER_CONTRACT_VERSION } from '../../frontend/src/engine-v2/contract.js';
import { REPO_ROOT, readJson } from './contract.mjs';
import { projectTopology } from './contract.mjs';
import { loadMainInputs } from './layout/io.mjs';
import { fingerprint } from './layout/policy.mjs';
import { ARCHETYPES } from '../../frontend/src/engine-v2/tokens.js';

export const CELESTIAL_LOCK_PATH = resolve(REPO_ROOT, 'config/atlas/celestial-lock.json');
export const CANONICAL_SCENE_LAYOUT_VERSION = 'main-2.0.0';
export const CELESTIAL_ADAPTER_VERSION = '1.0.0';

const magnitudeMap = Object.freeze({ landmark: 'nucleus', faint: 'faint', standard: 'standard', bright: 'bright' });
const priorityMap = Object.freeze({ low: 'low', standard: 'standard', high: 'high', critical: 'critical' });
const archetypeSet = new Set(ARCHETYPES);

function loadLock() {
    const result = readJson(CELESTIAL_LOCK_PATH);
    if (result.issues.length) throw new Error(`celestial lock cannot be read: ${result.issues[0].message}`);
    return result.value;
}

export function mapClassification(classification) {
    if (!classification || !archetypeSet.has(classification.archetype)) throw new Error('unsupported celestial archetype mapping');
    if (!classification || !magnitudeMap[classification.visualMagnitudeClass]) throw new Error('unsupported celestial magnitude mapping');
    if (!priorityMap[classification.labelPriorityClass]) throw new Error('unsupported celestial label priority mapping');
    return {
        archetype: classification.archetype,
        visualMagnitude: magnitudeMap[classification.visualMagnitudeClass],
        labelPriority: priorityMap[classification.labelPriorityClass],
    };
}

export function buildCanonicalScene({ graph, records, anchors, layout, lock }) {
    if (!lock || lock.schemaVersion !== '1.0.0' || lock.adapterVersion !== CELESTIAL_ADAPTER_VERSION) throw new Error('unsupported celestial lock or adapter version');
    const sourceNodes = [...graph].sort((a, b) => a.id.localeCompare(b.id));
    const sourceIds = new Set(sourceNodes.map((node) => node.id));
    const lockIds = Object.keys(lock.nodes || {}).sort();
    if (lockIds.length !== sourceNodes.length || lockIds.some((id, index) => id !== sourceNodes[index].id)) throw new Error('celestial lock must cover exactly the canonical node set');
    const layoutNodes = layout?.nodes || {};
    const nodes = sourceNodes.map((node) => {
        const position = layoutNodes[node.id];
        if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) throw new Error(`main layout missing canonical node ${node.id}`);
        const classification = lock.nodes[node.id];
        const mapped = mapClassification(classification);
        return { id: node.id, x: position.x, y: position.y, label: node.label, domains: [...(node.domain || [])], ...mapped, overlays: [] };
    });
    const edges = projectTopology(records).map((pair) => {
        if (!sourceIds.has(pair.source) || !sourceIds.has(pair.target)) throw new Error(`active topology has dangling endpoint ${pair.source}/${pair.target}`);
        return { id: `${pair.source}::${pair.target}`, source: pair.source, target: pair.target, priority: 0, lodClass: 'standard', directed: false, styleToken: 'default', overlays: [] };
    });
    const raw = {
        schemaVersion: SCENE_SCHEMA_VERSION,
        layoutVersion: CANONICAL_SCENE_LAYOUT_VERSION,
        rendererContractVersion: RENDERER_CONTRACT_VERSION,
        nodes,
        edges,
    };
    const normalized = normalizeScene(raw);
    return {
        scene: normalized,
        metadata: {
            adapterVersion: CELESTIAL_ADAPTER_VERSION,
            nodeSetFingerprint: fingerprint(sourceNodes.map((node) => node.id)),
            layoutFingerprint: fingerprint(Object.entries(layoutNodes).sort(([a], [b]) => a.localeCompare(b))),
            classificationFingerprint: fingerprint(lock),
            relationFingerprint: fingerprint(projectTopology(records).map(({ source, target }) => [source, target])),
            anchorFingerprint: fingerprint(anchors),
            sceneHash: stableSceneHash(normalized),
        },
    };
}

export function buildCanonicalSceneFromRepo(lock = loadLock()) {
    const inputs = loadMainInputs({ requireLayout: true });
    return buildCanonicalScene({ graph: inputs.nodes, records: inputs.records, anchors: inputs.anchors, layout: inputs.layout, lock });
}

export function readCanonicalLock() { return JSON.parse(readFileSync(CELESTIAL_LOCK_PATH, 'utf8')); }
