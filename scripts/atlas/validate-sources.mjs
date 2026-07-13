import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    CONNECTION_BOOLEAN_FIELDS, DOMAIN_CODES, NODE_TYPES, RELATION_TYPES, REPO_ROOT,
    SOURCE_INPUTS, connectionKey, exitCodeFor, issue, normalizeConnection,
    printIssues, projectTopology, readJson, sortIssues,
} from './contract.mjs';
import {
    DEPTH_QA_KEYS, DEPTH_REVIEW_STATUSES, DEPTH_STATUSES, isDepthPublishable,
} from '../../neblux-depth/depth-contract.mjs';

const relationSet = new Set(RELATION_TYPES);
const nodeTypeSet = new Set(NODE_TYPES);
const domainSet = new Set(DOMAIN_CODES);
const connectionFields = new Set(['target', 'relation_type', 'relation', ...CONNECTION_BOOLEAN_FIELDS]);

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateGraph(raw, file = resolve(REPO_ROOT, SOURCE_INPUTS.graph)) {
    const issues = [];
    const nodes = Array.isArray(raw) ? raw : raw?.nodes;
    if (!Array.isArray(nodes)) return { issues: [issue(file, '$.nodes', 'must be an array')], nodes: [], records: [], topology: [] };

    const ids = new Set();
    const records = [];
    const recordKeys = new Map();
    for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        const base = `$.nodes[${index}]`;
        if (!isObject(node)) {
            issues.push(issue(file, base, 'must be an object'));
            continue;
        }
        if (typeof node.id !== 'string' || !node.id) issues.push(issue(file, `${base}.id`, 'must be a non-empty string'));
        else if (ids.has(node.id)) issues.push(issue(file, `${base}.id`, `duplicate node id ${node.id}`));
        else ids.add(node.id);
        if (!nodeTypeSet.has(node.type)) issues.push(issue(file, `${base}.type`, `must be one of ${NODE_TYPES.join(', ')}`));
        if (!Array.isArray(node.domain) || node.domain.length === 0) issues.push(issue(file, `${base}.domain`, 'must be a non-empty array'));
        else node.domain.forEach((domain, domainIndex) => {
            if (!domainSet.has(domain)) issues.push(issue(file, `${base}.domain[${domainIndex}]`, `unknown domain ${String(domain)}`));
        });
        if (!Array.isArray(node.connections)) {
            issues.push(issue(file, `${base}.connections`, 'must be an array'));
            continue;
        }
        for (let connectionIndex = 0; connectionIndex < node.connections.length; connectionIndex += 1) {
            const connection = node.connections[connectionIndex];
            const connectionPath = `${base}.connections[${connectionIndex}]`;
            if (!isObject(connection)) {
                issues.push(issue(file, connectionPath, 'must be an object'));
                continue;
            }
            for (const key of Object.keys(connection)) {
                if (!connectionFields.has(key)) issues.push(issue(file, `${connectionPath}.${key}`, 'unknown connection property'));
            }
            let valid = true;
            if (typeof connection.target !== 'string' || !connection.target) {
                issues.push(issue(file, `${connectionPath}.target`, 'must be a non-empty string'));
                valid = false;
            }
            if (connection.target === node.id) {
                issues.push(issue(file, `${connectionPath}.target`, 'canonical self-loop is not allowed'));
                valid = false;
            }
            if (!relationSet.has(connection.relation_type)) {
                issues.push(issue(file, `${connectionPath}.relation_type`, `must be one of ${RELATION_TYPES.join(', ')}`));
                valid = false;
            }
            if (typeof connection.relation !== 'string' || !connection.relation.trim()) {
                issues.push(issue(file, `${connectionPath}.relation`, 'must be a non-empty string'));
                valid = false;
            }
            for (const key of CONNECTION_BOOLEAN_FIELDS) {
                if (connection[key] !== undefined && typeof connection[key] !== 'boolean') {
                    issues.push(issue(file, `${connectionPath}.${key}`, 'must be boolean when present'));
                    valid = false;
                }
            }
            if (!valid) continue;
            const record = normalizeConnection(node.id, connection);
            const key = connectionKey(record);
            if (recordKeys.has(key)) {
                issues.push(issue(file, connectionPath, `exact duplicate semantic record; first seen at ${recordKeys.get(key)}`));
            } else {
                recordKeys.set(key, connectionPath);
                records.push(record);
            }
        }
    }
    for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        if (!isObject(node) || !Array.isArray(node.connections)) continue;
        node.connections.forEach((connection, connectionIndex) => {
            if (isObject(connection) && typeof connection.target === 'string' && !ids.has(connection.target)) {
                issues.push(issue(file, `$.nodes[${index}].connections[${connectionIndex}].target`, `target ${connection.target} does not exist`));
            }
        });
    }
    return { issues: sortIssues(issues), nodes, records, topology: projectTopology(records) };
}

export function validateWonder(wonder, graphIds, file) {
    const issues = [];
    if (!isObject(wonder)) return [issue(file, '$', 'must be an object')];
    if (typeof wonder.id !== 'string' || !wonder.id) issues.push(issue(file, '$.id', 'must be a non-empty string'));
    if (!Array.isArray(wonder.steps)) return [issue(file, '$.steps', 'must be an array')];
    const canonicalMembers = new Set();
    const localMembers = new Set();
    wonder.steps.forEach((step, index) => {
        const path = `$.steps[${index}]`;
        if (!isObject(step)) {
            issues.push(issue(file, path, 'must be an object'));
            return;
        }
        const hasRef = Object.hasOwn(step, 'ref');
        const hasLocal = Object.hasOwn(step, 'local');
        if (hasRef === hasLocal) {
            issues.push(issue(file, path, 'must contain exactly one of ref or local'));
            return;
        }
        if (hasRef) {
            if (typeof step.ref !== 'string' || !graphIds.has(step.ref)) issues.push(issue(file, `${path}.ref`, `canonical ref ${String(step.ref)} does not exist`));
            else canonicalMembers.add(step.ref);
        } else {
            const id = step.local?.id;
            if (typeof id !== 'string' || !id) issues.push(issue(file, `${path}.local.id`, 'must be a non-empty string'));
            else if (graphIds.has(id)) issues.push(issue(file, `${path}.local.id`, `local id ${id} collides with canonical node`));
            else if (localMembers.has(id)) issues.push(issue(file, `${path}.local.id`, `duplicate local id ${id}`));
            else localMembers.add(id);
        }
    });
    const contextRefs = wonder.cluster?.context_refs ?? [];
    if (wonder.cluster !== undefined && !isObject(wonder.cluster)) issues.push(issue(file, '$.cluster', 'must be an object'));
    if (!Array.isArray(contextRefs)) issues.push(issue(file, '$.cluster.context_refs', 'must be an array'));
    else contextRefs.forEach((id, index) => {
        if (typeof id !== 'string' || !graphIds.has(id)) issues.push(issue(file, `$.cluster.context_refs[${index}]`, `canonical ref ${String(id)} does not exist`));
        else canonicalMembers.add(id);
    });
    const featured = wonder.cluster?.featured_portals ?? [];
    if (!Array.isArray(featured)) issues.push(issue(file, '$.cluster.featured_portals', 'must be an array'));
    else featured.forEach((id, index) => {
        if (!canonicalMembers.has(id)) issues.push(issue(file, `$.cluster.featured_portals[${index}]`, `featured portal ${String(id)} is not a canonical member`));
    });
    if (!Array.isArray(wonder.edges)) issues.push(issue(file, '$.edges', 'must be an array'));
    else {
        const edgeKeys = new Set();
        const members = new Set([...canonicalMembers, ...localMembers]);
        wonder.edges.forEach((edge, index) => {
            const path = `$.edges[${index}]`;
            if (!isObject(edge)) {
                issues.push(issue(file, path, 'must be an object'));
                return;
            }
            for (const key of Object.keys(edge)) {
                if (!['source', 'target', 'relation_type'].includes(key)) issues.push(issue(file, `${path}.${key}`, 'unknown authored edge property'));
            }
            if (typeof edge.source !== 'string' || !edge.source) issues.push(issue(file, `${path}.source`, 'must be a non-empty string'));
            if (typeof edge.target !== 'string' || !edge.target) issues.push(issue(file, `${path}.target`, 'must be a non-empty string'));
            if (!members.has(edge.source)) issues.push(issue(file, `${path}.source`, `endpoint ${String(edge.source)} is not a Wonder member`));
            if (!members.has(edge.target)) issues.push(issue(file, `${path}.target`, `endpoint ${String(edge.target)} is not a Wonder member`));
            if (edge.source === edge.target) issues.push(issue(file, `${path}.target`, 'Wonder self-loop is not allowed'));
            if (!relationSet.has(edge.relation_type)) issues.push(issue(file, `${path}.relation_type`, `must be one of ${RELATION_TYPES.join(', ')}`));
            const key = JSON.stringify([edge.source, edge.target, edge.relation_type]);
            if (edgeKeys.has(key)) issues.push(issue(file, path, 'exact duplicate authored spine edge'));
            edgeKeys.add(key);
        });
    }
    return sortIssues(issues);
}

export function validateDepthManifest(manifest, graphIds, file) {
    const issues = [];
    if (!isObject(manifest) || !Array.isArray(manifest.entries)) return [issue(file, '$.entries', 'must be an array')];
    const ids = new Set();
    manifest.entries.forEach((entry, index) => {
        const path = `$.entries[${index}]`;
        if (!isObject(entry)) {
            issues.push(issue(file, path, 'must be an object'));
            return;
        }
        if (typeof entry.id !== 'string' || !entry.id) issues.push(issue(file, `${path}.id`, 'must be a non-empty string'));
        else if (ids.has(entry.id)) issues.push(issue(file, `${path}.id`, `duplicate Depth id ${entry.id}`));
        else ids.add(entry.id);
        if (!graphIds.has(entry.node_id)) issues.push(issue(file, `${path}.node_id`, `canonical node ${String(entry.node_id)} does not exist`));
        if (!DEPTH_STATUSES.includes(entry.status)) issues.push(issue(file, `${path}.status`, `invalid Depth status ${String(entry.status)}`));
        if (!DEPTH_REVIEW_STATUSES.includes(entry.review_status)) issues.push(issue(file, `${path}.review_status`, `invalid review_status ${String(entry.review_status)}`));
        if (typeof entry.public !== 'boolean') issues.push(issue(file, `${path}.public`, 'must be boolean'));
        for (const key of DEPTH_QA_KEYS) if (typeof entry.qa?.[key] !== 'boolean') issues.push(issue(file, `${path}.qa.${key}`, 'must be boolean'));
        if (entry.public && !isDepthPublishable(entry)) issues.push(issue(file, path, 'public entry does not satisfy shared publication predicate'));
    });
    return sortIssues(issues);
}

export function sourceFiles() {
    const graph = resolve(REPO_ROOT, SOURCE_INPUTS.graph);
    const wonderRoot = resolve(REPO_ROOT, SOURCE_INPUTS.wonderDirectory);
    const wonders = readdirSync(wonderRoot)
        .filter((name) => name.endsWith('.json'))
        .sort()
        .map((name) => resolve(wonderRoot, name));
    const depth = resolve(REPO_ROOT, SOURCE_INPUTS.depthManifest);
    return { graph, wonders, depth };
}

export function validateRealSources() {
    const files = sourceFiles();
    const graphRead = readJson(files.graph);
    const issues = [...graphRead.issues];
    const graph = graphRead.value ? validateGraph(graphRead.value, files.graph) : { issues: [], nodes: [], records: [], topology: [] };
    issues.push(...graph.issues);
    const graphIds = new Set(graph.nodes.map((node) => node?.id).filter(Boolean));
    for (const file of files.wonders) {
        const read = readJson(file);
        issues.push(...read.issues);
        if (read.value) issues.push(...validateWonder(read.value, graphIds, file));
    }
    const depthRead = readJson(files.depth);
    issues.push(...depthRead.issues);
    if (depthRead.value) issues.push(...validateDepthManifest(depthRead.value, graphIds, files.depth));
    return { issues: sortIssues(issues), graph, files };
}

async function main() {
    if (process.argv.length > 2 && !process.argv.includes('--real')) {
        const value = issue('scripts/atlas/validate-sources.mjs', '$', 'usage: node scripts/atlas/validate-sources.mjs [--real]', 'error', 'usage');
        printIssues([value]);
        process.exitCode = 2;
        return;
    }
    const result = validateRealSources();
    printIssues(result.issues);
    const code = exitCodeFor(result.issues);
    if (code === 0) {
        process.stdout.write(`atlas source validation: PASS nodes=${result.graph.nodes.length} records=${result.graph.records.length} activePairs=${result.graph.topology.length}\n`);
    }
    process.exitCode = code;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
