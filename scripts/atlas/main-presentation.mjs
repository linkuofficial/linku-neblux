import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeScene, RENDERER_CONTRACT_VERSION, SCENE_SCHEMA_VERSION } from '../../frontend/src/engine-v2/contract.js';
import { DOMAIN_CODES, REPO_ROOT, readJson } from './contract.mjs';
import { buildCanonicalSceneFromRepo } from './canonical-scene.mjs';
import { loadMainInputs } from './layout/io.mjs';
import { fingerprint, stableJson } from './layout/policy.mjs';
import { validateConfig } from './validate-config.mjs';

export const MAIN_PRESENTATION_SCHEMA_VERSION = '1.0.0';
export const MAIN_PRESENTATION_VERSION = 'main-presentation-1.0.0';
export const MAIN_PRESENTATION_OUTPUT = resolve(REPO_ROOT, 'frontend/public/data/atlas/main-presentation.json');
export const ATLAS_PRESENTATION_CONFIG = resolve(REPO_ROOT, 'config/atlas/atlas-layout.json');

const domainSet = new Set(DOMAIN_CODES);

function fail(message) {
    throw new Error(`Main presentation is invalid: ${message}`);
}

function object(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sortedUnique(values, label) {
    if (!Array.isArray(values)) fail(`${label} must be an array`);
    const result = [...new Set(values)];
    if (result.some((value) => typeof value !== 'string' || !value)) fail(`${label} must contain non-empty strings`);
    return result.sort((a, b) => a.localeCompare(b));
}

function unwrapScene(input) {
    const candidate = input?.scene || input?.canonicalScene || input;
    if (!object(candidate)) fail('canonical scene is required');
    if (candidate.schemaVersion !== SCENE_SCHEMA_VERSION) fail(`scene schemaVersion must be ${SCENE_SCHEMA_VERSION}`);
    if (candidate.rendererContractVersion !== RENDERER_CONTRACT_VERSION) fail(`scene rendererContractVersion must be ${RENDERER_CONTRACT_VERSION}`);
    if (typeof candidate.layoutVersion !== 'string' || !candidate.layoutVersion) fail('scene layoutVersion must be a non-empty string');
    if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) fail('scene nodes and edges must be arrays');

    // normalizeScene is intentionally used only as a strict structural check. The
    // canonical scene is returned below, so presentation building never changes its
    // node or canonical-edge payload.
    let normalized;
    try { normalized = normalizeScene(candidate); } catch (error) { fail(error.message.replace(/^Invalid renderer v2 scene: /, '')); }
    if (normalized.nodes.length !== candidate.nodes.length || normalized.edges.length !== candidate.edges.length) fail('scene normalization changed the canonical payload');
    for (let index = 0; index < candidate.nodes.length; index += 1) {
        const source = candidate.nodes[index];
        const checked = normalized.nodes[index];
        if (checked.archetype !== source.archetype || checked.visualMagnitude !== source.visualMagnitude || checked.labelPriority !== source.labelPriority) {
            fail(`scene node ${source.id} contains an unsupported renderer token`);
        }
    }
    return candidate;
}

function unwrapAnchors(input) {
    const value = input?.anchors && object(input.anchors) && object(input.anchors.anchors) ? input.anchors : input;
    const anchors = value?.anchors && object(value.anchors) ? value.anchors : value;
    if (!object(anchors)) fail('domain anchors are required');
    const domains = Object.keys(anchors).sort((a, b) => a.localeCompare(b));
    if (!domains.length) fail('domain anchors must not be empty');
    for (const domain of domains) {
        if (!domainSet.has(domain)) fail(`unknown domain anchor ${domain}`);
        const anchor = anchors[domain];
        if (!object(anchor) || typeof anchor.nodeId !== 'string' || !anchor.nodeId) fail(`${domain} anchor must contain nodeId`);
        if (anchor.x !== undefined && !Number.isFinite(anchor.x)) fail(`${domain} anchor x must be finite`);
        if (anchor.y !== undefined && !Number.isFinite(anchor.y)) fail(`${domain} anchor y must be finite`);
        if ((anchor.x === undefined) !== (anchor.y === undefined)) fail(`${domain} anchor must contain both x and y when coordinates are provided`);
    }
    return { source: input, anchors, domains };
}

function unwrapAtlas(input) {
    const atlas = input?.atlasLayout || input?.atlas || input;
    if (!object(atlas)) fail('Atlas presentation metadata is required');
    if (!Array.isArray(atlas.roads)) fail('Atlas presentation metadata must contain roads');
    const roads = atlas.roads.filter((road) => road?.approved === true).map((road) => structuredClone(road));
    const ids = new Set();
    for (const road of roads) {
        if (!object(road) || typeof road.id !== 'string' || !road.id) fail('approved Atlas roads require non-empty ids');
        if (ids.has(road.id)) fail(`duplicate approved Atlas road ${road.id}`);
        ids.add(road.id);
        if (typeof road.from !== 'string' || typeof road.to !== 'string' || typeof road.via !== 'string') fail(`approved Atlas road ${road.id} has invalid navigation metadata`);
    }
    roads.sort((a, b) => a.id.localeCompare(b.id));
    return {
        schemaVersion: atlas.schemaVersion,
        layoutVersion: atlas.layoutVersion,
        coordinateSystem: atlas.coordinateSystem,
        mainGalaxy: atlas.mainGalaxy,
        wonders: atlas.wonders,
        roads,
    };
}

function anchorEntries(scene, anchorInput) {
    const nodeById = new Map(scene.nodes.map((node) => [node.id, node]));
    const result = {};
    const usedNodeIds = new Set();
    for (const domain of anchorInput.domains) {
        const source = anchorInput.anchors[domain];
        const node = nodeById.get(source.nodeId);
        if (!node) fail(`${domain} anchor node ${source.nodeId} is not in the canonical scene`);
        if (usedNodeIds.has(source.nodeId)) fail(`domain anchors must use distinct nodes; ${source.nodeId} is reused`);
        usedNodeIds.add(source.nodeId);
        result[domain] = {
            nodeId: source.nodeId,
            x: source.x ?? node.x,
            y: source.y ?? node.y,
        };
    }
    return { entries: result, nodeById };
}

function curveDirection(source, target) {
    const key = source < target ? `${source}|${target}` : `${target}|${source}`;
    let hash = 0;
    for (let index = 0; index < key.length; index += 1) hash = ((hash << 5) - hash + key.charCodeAt(index)) | 0;
    return hash % 2 === 0 ? 1 : -1;
}

export function quadraticRoute(source, target) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.hypot(dx, dy) || 1;
    const offset = Math.min(42, Math.max(10, distance * 0.18));
    const direction = curveDirection(source.nodeId, target.nodeId);
    return {
        type: 'quadratic',
        cx: (source.x + target.x) / 2 - (dy / distance) * offset * direction,
        cy: (source.y + target.y) / 2 + (dx / distance) * offset * direction,
    };
}

function buildBundles(scene, anchorMap, domains) {
    const anchorByDomain = new Map(domains.map((domain) => [domain, anchorMap[domain]]));
    const domainPairs = new Map();
    const seenEdgeIds = new Set();
    const sceneNodeById = new Map(scene.nodes.map((node) => [node.id, node]));
    for (const edge of scene.edges) {
        if (!object(edge) || typeof edge.id !== 'string' || !edge.id) fail('canonical edges require non-empty ids');
        if (seenEdgeIds.has(edge.id)) fail(`duplicate canonical edge ${edge.id}`);
        seenEdgeIds.add(edge.id);
        if (edge.pending === true || edge.active === false) continue;
        const source = sceneNodeById.get(edge.source);
        const target = sceneNodeById.get(edge.target);
        if (!source || !target) fail(`canonical edge ${edge.id} has a dangling endpoint`);
        const sourceDomains = sortedUnique(source.domains, `node ${source.id} domains`);
        const targetDomains = sortedUnique(target.domains, `node ${target.id} domains`);
        for (const domain of [...sourceDomains, ...targetDomains]) if (!anchorByDomain.has(domain)) fail(`canonical edge ${edge.id} references domain ${domain} without an anchor`);
        const pairs = new Set();
        for (const sourceDomain of sourceDomains) for (const targetDomain of targetDomains) {
            if (sourceDomain === targetDomain) continue;
            const pair = [sourceDomain, targetDomain].sort((a, b) => a.localeCompare(b));
            pairs.add(pair.join('\u0000'));
        }
        for (const key of pairs) {
            const [sourceDomain, targetDomain] = key.split('\u0000');
            const bundle = domainPairs.get(key) || {
                id: `bundle:${sourceDomain}-${targetDomain}`,
                source: anchorByDomain.get(sourceDomain).nodeId,
                target: anchorByDomain.get(targetDomain).nodeId,
                domains: [sourceDomain, targetDomain],
                count: 0,
                canonicalEdgeIds: [],
                route: quadraticRoute(anchorByDomain.get(sourceDomain), anchorByDomain.get(targetDomain)),
            };
            bundle.count += 1;
            bundle.canonicalEdgeIds.push(edge.id);
            domainPairs.set(key, bundle);
        }
    }
    return [...domainPairs.values()]
        .map((bundle) => ({ ...bundle, canonicalEdgeIds: [...new Set(bundle.canonicalEdgeIds)].sort((a, b) => a.localeCompare(b)) }))
        .sort((a, b) => a.id.localeCompare(b.id));
}

function canonicalMetadata(input, scene, anchors, atlas) {
    const sourceMetadata = input?.metadata || input?.canonical?.metadata;
    return {
        canonicalSceneHash: sourceMetadata?.sceneHash || fingerprint(scene),
        canonicalSceneFingerprint: fingerprint(scene),
        domainAnchorsFingerprint: fingerprint(anchors),
        approvedRoadsFingerprint: fingerprint(atlas.roads),
    };
}

export function buildMainPresentation({ scene: sceneInput, canonicalScene, canonical, anchors, domainAnchors, atlas, atlasLayout } = {}) {
    const source = canonical || canonicalScene || sceneInput;
    const scene = unwrapScene(source);
    const anchorInput = unwrapAnchors(domainAnchors || anchors);
    const anchorData = anchorEntries(scene, anchorInput);
    const atlasData = unwrapAtlas(atlasLayout || atlas);
    const bundles = buildBundles(scene, anchorData.entries, anchorInput.domains);
    const activeEdgeCount = scene.edges.filter((edge) => edge?.pending !== true && edge?.active !== false).length;
    const crossDomainEdgeIds = new Set(bundles.flatMap((bundle) => bundle.canonicalEdgeIds));
    return {
        schemaVersion: MAIN_PRESENTATION_SCHEMA_VERSION,
        presentationVersion: MAIN_PRESENTATION_VERSION,
        layoutVersion: scene.layoutVersion,
        rendererContractVersion: scene.rendererContractVersion,
        domainAnchors: anchorData.entries,
        bundles,
        atlas: atlasData,
        metadata: {
            ...canonicalMetadata(source, scene, anchorData.entries, atlasData),
            canonicalNodeCount: scene.nodes.length,
            canonicalEdgeCount: scene.edges.length,
            activeCanonicalEdgeCount: activeEdgeCount,
            crossDomainCanonicalEdgeCount: crossDomainEdgeIds.size,
            bundleCount: bundles.length,
        },
    };
}

export function buildMainPresentationFromRepo(lock) {
    const canonical = buildCanonicalSceneFromRepo(lock);
    const inputs = loadMainInputs({ requireLayout: true });
    const atlasRead = readJson(ATLAS_PRESENTATION_CONFIG);
    if (atlasRead.issues.length) fail(atlasRead.issues[0].message);
    const atlasIssues = validateConfig('atlas-layout', atlasRead.value, ATLAS_PRESENTATION_CONFIG, { graphIds: new Set(inputs.nodes.map((node) => node.id)) });
    const errors = atlasIssues.filter((issue) => issue.severity === 'error');
    if (errors.length) fail(`${errors[0].path} ${errors[0].message}`);
    return buildMainPresentation({ canonical, anchors: inputs.anchors, atlas: atlasRead.value });
}

export function writeMainPresentationFromRepo(output = MAIN_PRESENTATION_OUTPUT, lock) {
    const artifact = buildMainPresentationFromRepo(lock);
    const directory = dirname(output);
    if (!existsSync(directory)) throw new Error(`Main presentation output directory does not exist: ${directory}`);
    writeFileSync(output, stableJson(artifact), 'utf8');
    return { artifact, output };
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length > 2 || (args.length && args[0] !== '--output')) throw new Error('usage: node scripts/atlas/main-presentation.mjs [--output <file>]');
    const output = args[0] === '--output' && args[1] ? resolve(args[1]) : MAIN_PRESENTATION_OUTPUT;
    const result = writeMainPresentationFromRepo(output);
    process.stdout.write(`Main presentation build: PASS bundles=${result.artifact.bundles.length} edges=${result.artifact.metadata.activeCanonicalEdgeCount}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try { await main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
