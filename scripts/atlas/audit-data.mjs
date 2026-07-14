import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exitCodeFor, issue, printIssues, sortIssues } from './contract.mjs';
import {
    stableJson, validateAtlasIndex, validateConstellationIndex, validateDepthIndex, validatePortalIndex,
    validateWonderCore, validateWonderLocale,
} from './artifact-contract.mjs';
import { ATLAS_DATA_ROOT, buildArtifactMap, expectedArtifactPaths, loadArtifactInputs } from './artifact-sources.mjs';

function listFiles(root, current = root) {
    if (!existsSync(current)) return [];
    const files = [];
    for (const name of readdirSync(current).sort()) {
        const path = resolve(current, name);
        if (statSync(path).isDirectory()) files.push(...listFiles(root, path));
        else files.push(relative(root, path).replaceAll('\\', '/'));
    }
    return files;
}

function forbiddenMetadata(value, file, path = '$', issues = []) {
    if (Array.isArray(value)) value.forEach((entry, index) => forbiddenMetadata(entry, file, `${path}[${index}]`, issues));
    else if (value && typeof value === 'object') {
        for (const [key, entry] of Object.entries(value)) {
            if (key === 'generatedAt' || key === 'buildId') issues.push(issue(file, `${path}.${key}`, 'non-deterministic metadata is forbidden'));
            forbiddenMetadata(entry, file, `${path}.${key}`, issues);
        }
    }
    return issues;
}

function parseArtifact(root, path, issues) {
    const file = resolve(root, path);
    try {
        return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    } catch (error) {
        issues.push(issue(file, '$', `cannot parse artifact: ${error.message}`, 'error', 'parse'));
        return null;
    }
}

export function auditGeneratedData(root = ATLAS_DATA_ROOT, inputs = loadArtifactInputs()) {
    const issues = [];
    const expected = expectedArtifactPaths(inputs.wonders);
    const optional = ['index.json'];
    const actual = listFiles(root);
    for (const path of expected.filter((value) => !actual.includes(value))) issues.push(issue(resolve(root, path), '$', 'expected artifact is missing', 'error', 'io'));
    for (const path of actual.filter((value) => !expected.includes(value) && !optional.includes(value))) issues.push(issue(resolve(root, path), '$', 'unexpected or stale artifact'));

    const generated = buildArtifactMap(inputs);
    const parsed = new Map();
    for (const path of expected.filter((value) => actual.includes(value))) {
        const value = parseArtifact(root, path, issues);
        if (!value) continue;
        parsed.set(path, value);
        issues.push(...forbiddenMetadata(value, resolve(root, path)));
        const desired = generated.artifacts.get(path);
        if (stableJson(value) !== stableJson(desired)) issues.push(issue(resolve(root, path), '$', 'artifact does not match canonical sources'));
    }

    for (const path of optional.filter((value) => actual.includes(value))) {
        const value = parseArtifact(root, path, issues);
        if (!value) continue;
        parsed.set(path, value);
        issues.push(...forbiddenMetadata(value, resolve(root, path)));
        issues.push(...validateAtlasIndex(value, inputs.wonderIds, resolve(root, path), { graphIds: inputs.graphIds }));
    }

    for (const wonder of inputs.wonders) {
        const corePath = `wonders/${wonder.id}.core.json`;
        const core = parsed.get(corePath);
        if (!core) continue;
        issues.push(...validateWonderCore(core, inputs.graphIds, resolve(root, corePath)));
        for (const locale of ['en', 'zh', 'ja']) {
            const path = `wonders/${wonder.id}.${locale}.json`;
            const sidecar = parsed.get(path);
            if (sidecar) issues.push(...validateWonderLocale(sidecar, core, resolve(root, path)));
        }
    }
    const depth = parsed.get('depth-index.json');
    if (depth) issues.push(...validateDepthIndex(depth, inputs.graphIds, resolve(root, 'depth-index.json')));
    const portal = parsed.get('portal-index.json');
    if (portal) issues.push(...validatePortalIndex(portal, inputs.graphIds, inputs.wonderIds, resolve(root, 'portal-index.json')));
    const constellation = parsed.get('constellation-index.json');
    if (constellation) issues.push(...validateConstellationIndex(constellation, inputs.wonderIds, resolve(root, 'constellation-index.json')));
    return { issues: sortIssues(issues), fileCount: actual.length, warnings: generated.warnings };
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length > 2 || args.length === 1 || (args.length && args[0] !== '--root')) {
        printIssues([issue('scripts/atlas/audit-data.mjs', '$', 'usage: node scripts/atlas/audit-data.mjs [--root <directory>]', 'error', 'usage')]);
        process.exitCode = 2;
        return;
    }
    const root = args[0] === '--root' && args[1] ? resolve(args[1]) : ATLAS_DATA_ROOT;
    const result = auditGeneratedData(root);
    printIssues(result.issues);
    for (const warning of result.warnings) process.stderr.write(`warning: ${warning}\n`);
    process.exitCode = exitCodeFor(result.issues);
    if (process.exitCode === 0) process.stdout.write(`atlas artifact audit: PASS files=${result.fileCount}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
