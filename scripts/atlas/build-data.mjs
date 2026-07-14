import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stableJson } from './artifact-contract.mjs';
import { ATLAS_DATA_ROOT, buildArtifactMap, loadArtifactInputs } from './artifact-sources.mjs';
import { auditGeneratedData } from './audit-data.mjs';
import { exitCodeFor } from './contract.mjs';

let stagingSequence = 0;

export function replaceDirectory(staging, target) {
    const backup = `${target}.backup-${process.pid}-${stagingSequence += 1}`;
    const hadTarget = existsSync(target);
    try {
        if (hadTarget) renameSync(target, backup);
        renameSync(staging, target);
        if (hadTarget) rmSync(backup, { recursive: true, force: true });
    } catch (error) {
        try {
            if (existsSync(target)) rmSync(target, { recursive: true, force: true });
            if (hadTarget && existsSync(backup)) renameSync(backup, target);
        } catch (rollbackError) {
            throw new AggregateError([error, rollbackError], `Atlas artifact replacement failed and backup remains at ${backup}`);
        }
        throw error;
    } finally {
        if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });
    }
}

export function buildData(target = ATLAS_DATA_ROOT, inputs = loadArtifactInputs()) {
    const parent = dirname(target);
    const staging = resolve(parent, `.atlas-staging-${process.pid}-${stagingSequence += 1}`);
    rmSync(staging, { recursive: true, force: true });
    mkdirSync(staging, { recursive: true });
    try {
        const indexPath = resolve(target, 'index.json');
        const hasPresentationIndex = existsSync(indexPath);
        const generated = buildArtifactMap(inputs);
        for (const [path, value] of [...generated.artifacts].sort(([a], [b]) => a.localeCompare(b))) {
            const file = resolve(staging, path);
            mkdirSync(dirname(file), { recursive: true });
            writeFileSync(file, stableJson(value), 'utf8');
        }
        if (hasPresentationIndex) {
            const index = JSON.parse(readFileSync(indexPath, 'utf8').replace(/^\uFEFF/, ''));
            writeFileSync(resolve(staging, 'index.json'), stableJson(index), 'utf8');
        }
        const audit = auditGeneratedData(staging, inputs);
        if (exitCodeFor(audit.issues) !== 0) throw new Error(`Staged Atlas artifact audit failed with ${audit.issues.length} issue(s)`);
        replaceDirectory(staging, target);
        return { fileCount: generated.artifacts.size + Number(hasPresentationIndex), warnings: generated.warnings };
    } catch (error) {
        rmSync(staging, { recursive: true, force: true });
        throw error;
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length > 2 || (args.length && args[0] !== '--output')) throw new Error('usage: node scripts/atlas/build-data.mjs [--output <directory>]');
    const target = args[0] === '--output' && args[1] ? resolve(args[1]) : ATLAS_DATA_ROOT;
    const result = buildData(target);
    for (const warning of result.warnings) process.stderr.write(`warning: ${warning}\n`);
    process.stdout.write(`atlas artifact build: PASS files=${result.fileCount}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try { await main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
