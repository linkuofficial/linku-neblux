import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stableJson } from './artifact-contract.mjs';
import { ATLAS_DATA_ROOT, buildArtifactMap, loadArtifactInputs } from './artifact-sources.mjs';
import { auditGeneratedData } from './audit-data.mjs';
import { exitCodeFor } from './contract.mjs';

let stagingSequence = 0;

const LOCK_ERROR_CODES = new Set(['EACCES', 'EBUSY', 'EPERM']);

function actionableReplacementError(error, target) {
    if (!LOCK_ERROR_CODES.has(error?.code)) return error;
    const wrapped = new Error(
        `Atlas artifact replacement could not update ${target} because the directory is locked or access was denied. `
        + 'Stop the Vite dev server and any process using the Atlas artifacts, then rerun atlas:build-data.',
        { cause: error },
    );
    wrapped.code = error.code;
    return wrapped;
}

export function replaceDirectory(staging, target, overrides = {}) {
    const operations = {
        exists: existsSync,
        rename: renameSync,
        remove: rmSync,
        ...overrides,
    };
    const backup = `${target}.backup-${process.pid}-${stagingSequence += 1}`;
    const hadTarget = operations.exists(target);
    let previousMoved = false;
    let stagedInstalled = false;
    try {
        if (hadTarget) {
            operations.rename(target, backup);
            previousMoved = true;
        }
        operations.rename(staging, target);
        stagedInstalled = true;
        if (previousMoved) operations.remove(backup, { recursive: true, force: true });
    } catch (error) {
        try {
            // Only remove target after staging was actually installed. If the first
            // rename failed, target is still the previous valid artifact directory.
            if (stagedInstalled && operations.exists(target)) {
                operations.remove(target, { recursive: true, force: true });
            }
            if (previousMoved && operations.exists(backup)) operations.rename(backup, target);
        } catch (rollbackError) {
            throw new AggregateError(
                [error, rollbackError],
                `Atlas artifact replacement and rollback failed; backup remains at ${backup}. `
                + 'Stop the Vite dev server and restore the backup before retrying.',
            );
        }
        throw actionableReplacementError(error, target);
    } finally {
        if (operations.exists(staging)) operations.remove(staging, { recursive: true, force: true });
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
