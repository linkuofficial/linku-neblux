import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, exitCodeFor, issue, printIssues, readJson, repoPath, sortIssues } from './contract.mjs';

export function auditPortals(index, graphIds, file = 'portal-index.json') {
    const issues = [];
    if (!index?.nodes || typeof index.nodes !== 'object' || Array.isArray(index.nodes)) return [issue(file, '$.nodes', 'must be an object')];
    for (const [nodeId, entry] of Object.entries(index.nodes)) {
        const base = `$.nodes.${nodeId}`;
        if (!graphIds.has(nodeId)) issues.push(issue(file, base, 'portal node is not canonical'));
        if (!Array.isArray(entry?.destinations) || entry.destinations.length === 0) {
            issues.push(issue(file, `${base}.destinations`, 'must be a non-empty array')); continue;
        }
        const destinationKeys = new Set();
        entry.destinations.forEach((destination, indexValue) => {
            const path = `${base}.destinations[${indexValue}]`;
            if (!['main', 'wonder'].includes(destination?.view)) issues.push(issue(file, `${path}.view`, 'must be main or wonder'));
            if (destination?.view === 'wonder' && (typeof destination.id !== 'string' || !destination.id)) issues.push(issue(file, `${path}.id`, 'Wonder destination requires id'));
            if (typeof destination?.route !== 'string' || !destination.route.startsWith('/')) issues.push(issue(file, `${path}.route`, 'must be a root-relative route'));
            const key = JSON.stringify([destination?.view, destination?.id ?? '']);
            if (destinationKeys.has(key)) issues.push(issue(file, path, 'duplicate portal destination'));
            destinationKeys.add(key);
        });
    }
    return sortIssues(issues);
}

async function main() {
    const graphArg = process.argv[process.argv.indexOf('--graph') + 1];
    const portalArg = process.argv[process.argv.indexOf('--portal') + 1];
    if (!graphArg || !portalArg) {
        printIssues([issue('scripts/atlas/audit-portals.mjs', '$', 'usage: --graph <fixture> --portal <fixture>', 'error', 'usage')]);
        process.exitCode = 2; return;
    }
    const graphFile = resolve(REPO_ROOT, graphArg); const portalFile = resolve(REPO_ROOT, portalArg);
    if (![graphFile, portalFile].every((file) => repoPath(file).startsWith('tests/atlas/fixtures/'))) {
        printIssues([issue('scripts/atlas/audit-portals.mjs', '$', 'WP1 audit only accepts tests/atlas/fixtures', 'error', 'usage')]);
        process.exitCode = 2; return;
    }
    const graph = readJson(graphFile); const portal = readJson(portalFile);
    const issues = [...graph.issues, ...portal.issues];
    const nodes = Array.isArray(graph.value) ? graph.value : graph.value?.nodes;
    if (Array.isArray(nodes) && portal.value) issues.push(...auditPortals(portal.value, new Set(nodes.map((node) => node.id)), portalFile));
    printIssues(issues); process.exitCode = exitCodeFor(issues);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
