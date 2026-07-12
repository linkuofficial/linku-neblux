import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, exitCodeFor, issue, printIssues, readJson, repoPath, sortIssues } from './contract.mjs';

export function auditDomains(graphRaw, anchorsRaw, graphFile = 'graph.json', anchorsFile = 'anchors.json') {
    const issues = [];
    const nodes = Array.isArray(graphRaw) ? graphRaw : graphRaw?.nodes;
    const anchors = anchorsRaw?.anchors ?? anchorsRaw;
    if (!Array.isArray(nodes)) return [issue(graphFile, '$.nodes', 'must be an array')];
    if (!anchors || typeof anchors !== 'object' || Array.isArray(anchors)) return [issue(anchorsFile, '$.anchors', 'must be an object')];
    const domains = [...new Set(nodes.flatMap((node) => Array.isArray(node?.domain) ? node.domain : []))].sort();
    const anchorDomains = Object.keys(anchors).sort();
    for (const domain of domains) if (!Object.hasOwn(anchors, domain)) issues.push(issue(anchorsFile, `$.anchors.${domain}`, 'domain anchor is missing'));
    for (const domain of anchorDomains) if (!domains.includes(domain)) issues.push(issue(anchorsFile, `$.anchors.${domain}`, 'anchor has no domain in graph'));
    const byId = new Map(nodes.map((node) => [node.id, node]));
    for (const [domain, anchor] of Object.entries(anchors)) {
        const node = byId.get(anchor?.nodeId);
        if (!node) issues.push(issue(anchorsFile, `$.anchors.${domain}.nodeId`, `anchor node ${String(anchor?.nodeId)} does not exist`));
        else {
            if (node.type !== 'field') issues.push(issue(anchorsFile, `$.anchors.${domain}.nodeId`, 'anchor node must have type field'));
            if (!node.domain?.includes(domain)) issues.push(issue(anchorsFile, `$.anchors.${domain}.nodeId`, `anchor node does not carry domain ${domain}`));
        }
    }
    return sortIssues(issues);
}

async function main() {
    const graphArg = process.argv[process.argv.indexOf('--graph') + 1];
    const anchorsArg = process.argv[process.argv.indexOf('--anchors') + 1];
    if (!graphArg || !anchorsArg) {
        printIssues([issue('scripts/atlas/audit-domains.mjs', '$', 'usage: --graph <fixture> --anchors <fixture>', 'error', 'usage')]);
        process.exitCode = 2; return;
    }
    const graphFile = resolve(REPO_ROOT, graphArg);
    const anchorsFile = resolve(REPO_ROOT, anchorsArg);
    if (![graphFile, anchorsFile].every((file) => repoPath(file).startsWith('tests/atlas/fixtures/'))) {
        printIssues([issue('scripts/atlas/audit-domains.mjs', '$', 'WP1 audit only accepts tests/atlas/fixtures', 'error', 'usage')]);
        process.exitCode = 2; return;
    }
    const graph = readJson(graphFile); const anchors = readJson(anchorsFile);
    const issues = [...graph.issues, ...anchors.issues];
    if (graph.value && anchors.value) issues.push(...auditDomains(graph.value, anchors.value, graphFile, anchorsFile));
    printIssues(issues); process.exitCode = exitCodeFor(issues);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
