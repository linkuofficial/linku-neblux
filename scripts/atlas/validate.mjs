import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, exitCodeFor, issue, printIssues, readJson, sortIssues } from './contract.mjs';
import { buildCanonicalSceneFromRepo } from './canonical-scene.mjs';
import { validateAllSchemas, validateConfig } from './validate-config.mjs';
import { validateRealSources } from './validate-sources.mjs';

export const ATLAS_PRESENTATION_CONFIG = resolve(REPO_ROOT, 'config', 'atlas', 'atlas-layout.json');

export function validateAtlas({ configFile = ATLAS_PRESENTATION_CONFIG } = {}) {
    const sourceResult = validateRealSources();
    const configRead = readJson(configFile);
    const graphIds = new Set(sourceResult.graph.nodes.map((node) => node?.id).filter(Boolean));
    const issues = [...sourceResult.issues, ...validateAllSchemas(), ...configRead.issues];
    if (configRead.value) issues.push(...validateConfig('atlas-layout', configRead.value, configFile, { graphIds }));
    try { buildCanonicalSceneFromRepo(); } catch (error) { issues.push(issue('config/atlas/celestial-lock.json', '$', error.message)); }
    return { issues: sortIssues(issues), sourceResult };
}

function main() {
    const result = validateAtlas();
    printIssues(result.issues);
    const code = exitCodeFor(result.issues);
    if (code === 0) {
        const { graph } = result.sourceResult;
        process.stdout.write(`atlas validation: PASS nodes=${graph.nodes.length} records=${graph.records.length} activePairs=${graph.topology.length} schemas=4 atlasConfig=validated celestialLock=validated\n`);
    }
    process.exitCode = code;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
