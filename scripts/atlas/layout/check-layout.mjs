import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import { REPO_ROOT, issue, printIssues, readJson } from '../contract.mjs';
import { validateConfig } from '../validate-config.mjs';
import { WONDER_LAYOUT_ROOT, loadMainInputs } from './io.mjs';
import {
    D3_VERSION, LOCAL_SOLVER_PARAMS, MAIN_SOLVER_PARAMS, MAIN_SOLVER_VERSION, TOOLCHAIN, TYPE_RADIUS,
    WONDER_SOLVER_PARAMS, WONDER_SOLVER_VERSION, anchorFingerprint, fingerprint, layoutInputSnapshot,
    layoutInputsFingerprint, makeWonderLayout, nodeSetFingerprint, overlapCount, stableJson,
} from './policy.mjs';

export function checkMainLayout(nodes, layout, anchors) {
    const issues = []; const ids = new Set(nodes.map((node) => node.id)); const locked = new Set(Object.keys(layout.nodes));
    for (const id of [...ids].sort()) if (!locked.has(id)) issues.push(issue('config/atlas/layout/main.json', `$.nodes.${id}`, 'canonical node is missing layout lock'));
    for (const id of [...locked].sort()) if (!ids.has(id)) issues.push(issue('config/atlas/layout/main.json', `$.nodes.${id}`, 'layout lock has no canonical node'));
    if (layout.nodeSetFingerprint !== nodeSetFingerprint(nodes)) issues.push(issue('config/atlas/layout/main.json', '$.nodeSetFingerprint', 'does not match canonical node set'));
    if (layout.layoutInputsFingerprint !== layoutInputsFingerprint(nodes)) {
        const current = layoutInputSnapshot(nodes); const previous = layout.layoutInputSnapshot || {}; const changed = [...new Set([...Object.keys(current), ...Object.keys(previous)])].filter((id) => stableJson(current[id]) !== stableJson(previous[id])).sort();
        issues.push(issue('config/atlas/layout/main.json', '$.layoutInputsFingerprint', `domain/type inputs changed for: ${changed.join(', ') || '<unknown>'}`));
    }
    if (layout.solverVersion !== MAIN_SOLVER_VERSION) issues.push(issue('config/atlas/layout/main.json', '$.solverVersion', `expected ${MAIN_SOLVER_VERSION}`));
    if (layout.algorithmParamsHash !== fingerprint({ main: MAIN_SOLVER_PARAMS, local: LOCAL_SOLVER_PARAMS, typeRadius: TYPE_RADIUS })) issues.push(issue('config/atlas/layout/main.json', '$.algorithmParamsHash', 'solver parameters changed; v1 blessing or migration required'));
    if (layout.toolchain?.nodeMajor !== TOOLCHAIN.nodeMajor || layout.toolchain?.d3Version !== D3_VERSION) issues.push(issue('config/atlas/layout/main.json', '$.toolchain', `environment differs; expected Node ${TOOLCHAIN.nodeMajor}, d3 ${D3_VERSION}`));
    if (layout.anchorConfigFingerprint !== anchorFingerprint(anchors)) issues.push(issue('config/atlas/layout/main.json', '$.anchorConfigFingerprint', 'does not match domain anchors'));
    for (const [domain, anchor] of Object.entries(anchors.anchors)) {
        const lock = layout.nodes[anchor.nodeId];
        if (!lock || lock.lock !== 'hard' || lock.x !== anchor.x || lock.y !== anchor.y) issues.push(issue('config/atlas/layout/main.json', `$.nodes.${anchor.nodeId}`, `hard anchor ${domain} must remain at configured coordinates`));
    }
    for (const [id, lock] of Object.entries(layout.nodes)) if (!Number.isFinite(lock.x) || !Number.isFinite(lock.y)) issues.push(issue('config/atlas/layout/main.json', `$.nodes.${id}`, 'coordinates must be finite'));
    for (const [id, lock] of Object.entries(layout.nodes)) if (lock.lock === 'new') issues.push(issue('config/atlas/layout/main.json', `$.nodes.${id}.lock`, 'persisted lock cannot remain new; finalize as soft'));
    const overlaps = overlapCount(nodes, layout);
    if (overlaps) issues.push(issue('config/atlas/layout/main.json', '$.nodes', `layout has ${overlaps} overlaps`));
    return issues;
}

export function checkWonderLayouts() {
    const issues = [];
    const sources = readdirSync(resolve(REPO_ROOT, 'data/wonders')).filter((name) => name.endsWith('.json')).sort();
    const locks = readdirSync(WONDER_LAYOUT_ROOT).filter((name) => name.endsWith('.json')).sort();
    for (const sourceName of sources) {
        const sourcePath = resolve(REPO_ROOT, 'data/wonders', sourceName); const lockPath = resolve(WONDER_LAYOUT_ROOT, sourceName);
        const source = readJson(sourcePath); const lock = readJson(lockPath); issues.push(...source.issues, ...lock.issues);
        if (!source.value || !lock.value) continue;
        issues.push(...validateConfig('layout', lock.value, lockPath));
        if (lock.value.solverVersion !== WONDER_SOLVER_VERSION || lock.value.algorithmParamsHash !== fingerprint(WONDER_SOLVER_PARAMS)) issues.push(issue(lockPath, '$.solverVersion', 'Wonder solver envelope changed'));
        try {
            if (stableJson(lock.value) !== stableJson(makeWonderLayout(source.value, { layoutVersion: lock.value.layoutVersion }))) issues.push(issue(lockPath, '$', 'Wonder layout is stale or not byte-stable for current members'));
        } catch (error) { issues.push(issue(lockPath, '$', error.message)); }
    }
    for (const lockName of locks) if (!sources.includes(lockName)) issues.push(issue(resolve(WONDER_LAYOUT_ROOT, lockName), '$', 'Wonder layout has no source Wonder'));
    return issues;
}

async function main() {
    try {
        const input = loadMainInputs({ requireLayout: true }); const issues = [...checkMainLayout(input.nodes, input.layout, input.anchors), ...checkWonderLayouts()];
        if (issues.length) { printIssues(issues); process.exitCode = 1; }
        else process.stdout.write(`atlas layout check: PASS nodes=${input.nodes.length} wonders=19 overlaps=0\n`);
    } catch (error) { if (!error.exitCode) process.stderr.write(`${error.message}\n`); process.exitCode = error.exitCode || 1; }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
