import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAtlasIndex, stableJson, validateAtlasIndex } from './artifact-contract.mjs';
import { REPO_ROOT, exitCodeFor, formatIssue } from './contract.mjs';
import { loadArtifactInputs } from './artifact-sources.mjs';

export const ATLAS_PRESENTATION_CONFIG = resolve(REPO_ROOT, 'config/atlas/atlas-layout.json');

export function buildIndex(config, wonderSummaries = {}) {
    return buildAtlasIndex(config, wonderSummaries);
}

async function main() {
    if (process.argv.length > 2) throw new Error('usage: node scripts/atlas/build-index.mjs');
    if (!existsSync(ATLAS_PRESENTATION_CONFIG)) {
        throw new Error('Atlas presentation config config/atlas/atlas-layout.json is not authorized yet; WP3 refuses to generate a placeholder index.');
    }
    const inputs = loadArtifactInputs();
    const config = JSON.parse(readFileSync(ATLAS_PRESENTATION_CONFIG, 'utf8'));
    const index = buildIndex(config);
    const issues = validateAtlasIndex(index, inputs.wonderIds, 'frontend/public/data/atlas/index.json');
    if (exitCodeFor(issues) !== 0) throw new Error(issues.map(formatIssue).join('\n'));
    const output = resolve(REPO_ROOT, 'frontend/public/data/atlas/index.json');
    writeFileSync(output, stableJson(index), 'utf8');
    process.stdout.write('atlas presentation index: PASS files=1\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try { await main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
