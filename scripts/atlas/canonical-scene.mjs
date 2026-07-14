import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeScene, stableSceneHash, SCENE_SCHEMA_VERSION, RENDERER_CONTRACT_VERSION } from '../../frontend/src/engine-v2/contract.js';
import { REPO_ROOT, parseVersion, readJson } from './contract.mjs';
import { projectTopology } from './contract.mjs';
import { validateConfig } from './validate-config.mjs';
import { loadMainInputs } from './layout/io.mjs';
import { anchorFingerprint, classificationInputsFingerprint, fingerprint, nodeSetFingerprint } from './layout/policy.mjs';
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
    const issues = validateConfig('celestial-lock', result.value, CELESTIAL_LOCK_PATH).filter((issue) => issue.severity === 'error');
    if (issues.length) throw new Error(`celestial lock is invalid: ${issues[0].path} ${issues[0].message}`);
    return result.value;
}

function assertSupportedMajor(value, expected, field) {
    const actual = parseVersion(value);
    const supported = parseVersion(expected);
    if (!actual || !supported || actual.major !== supported.major) throw new Error(`unsupported ${field} major version`);
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

export function validateCelestialLock({ graph, records, anchors, lock }) {
    if (!lock || lock.schemaVersion !== '1.0.0') throw new Error('unsupported celestial lock schema version');
    assertSupportedMajor(lock.classificationVersion, '1.0.0', 'classification');
    assertSupportedMajor(lock.adapterVersion, CELESTIAL_ADAPTER_VERSION, 'celestial adapter');
    const sourceNodes = [...graph].sort((a, b) => a.id.localeCompare(b.id));
    const lockIds = Object.keys(lock.nodes || {}).sort();
    if (lockIds.length !== sourceNodes.length || lockIds.some((id, index) => id !== sourceNodes[index].id)) throw new Error('celestial lock must cover exactly the canonical node set');
    if (lock.nodeSetFingerprint !== nodeSetFingerprint(sourceNodes)) throw new Error('celestial lock node set fingerprint is stale');
    if (lock.classificationInputsFingerprint !== classificationInputsFingerprint(sourceNodes, records)) throw new Error('celestial lock classification inputs fingerprint is stale');
    if (lock.anchorConfigFingerprint !== anchorFingerprint(anchors)) throw new Error('celestial lock anchor fingerprint is stale');
    for (const node of sourceNodes) {
        const classification = lock.nodes[node.id];
        mapClassification(classification);
        if (classification.archetype === 'local_protostar') throw new Error(`canonical node ${node.id} cannot use local_protostar`);
    }
    for (const [domain, anchor] of Object.entries(anchors.anchors)) {
        const classification = lock.nodes[anchor.nodeId];
        const magnitude = anchor.massClass === 'nucleus' ? 'landmark' : 'bright';
        const priority = anchor.massClass === 'nucleus' ? 'critical' : 'high';
        if (!classification || classification.archetype !== anchor.archetype || classification.layoutMassClass !== anchor.massClass || classification.visualMagnitudeClass !== magnitude || classification.labelPriorityClass !== priority) {
            throw new Error(`celestial lock does not preserve ${domain} anchor classification`);
        }
    }
}

export function buildCanonicalScene({ graph, records, anchors, layout, lock }) {
    validateCelestialLock({ graph, records, anchors, lock });
    const sourceNodes = [...graph].sort((a, b) => a.id.localeCompare(b.id));
    const sourceIds = new Set(sourceNodes.map((node) => node.id));
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
            nodeSetFingerprint: nodeSetFingerprint(sourceNodes),
            layoutFingerprint: fingerprint(Object.entries(layoutNodes).sort(([a], [b]) => a.localeCompare(b))),
            classificationFingerprint: fingerprint(lock),
            classificationInputsFingerprint: classificationInputsFingerprint(sourceNodes, records),
            relationFingerprint: fingerprint(projectTopology(records).map(({ source, target }) => [source, target])),
            anchorFingerprint: anchorFingerprint(anchors),
            sceneLayoutHash: fingerprint({
                nodes: normalized.nodes.map(({ id, x, y }) => [id, x, y]),
                edges: normalized.edges.map(({ source, target }) => [source, target]),
            }),
            sceneHash: stableSceneHash(normalized),
        },
    };
}

export function buildCanonicalSceneFromRepo(lock = loadLock()) {
    const inputs = loadMainInputs({ requireLayout: true });
    return buildCanonicalScene({ graph: inputs.nodes, records: inputs.records, anchors: inputs.anchors, layout: inputs.layout, lock });
}

export function readCanonicalLock() { return JSON.parse(readFileSync(CELESTIAL_LOCK_PATH, 'utf8')); }
