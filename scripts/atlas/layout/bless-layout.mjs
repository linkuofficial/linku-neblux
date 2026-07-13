import {
    closeSync, existsSync, fsyncSync, mkdirSync, openSync, renameSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAIN_BASELINE_PATH, loadMainInputs } from './io.mjs';
import { buildInitialProposal } from './bake-main.mjs';
import { fingerprint, layoutDebt, stableJson } from './policy.mjs';

function atomicWrite(path, content) {
    mkdirSync(dirname(path), { recursive: true });
    const temp = resolve(dirname(path), `.main-v1.${process.pid}.tmp`); let handle;
    try {
        JSON.parse(content);
        handle = openSync(temp, 'wx'); writeFileSync(handle, content, 'utf8'); fsyncSync(handle); closeSync(handle); handle = undefined;
        JSON.parse(content); renameSync(temp, path);
    } catch (error) {
        if (handle !== undefined) closeSync(handle);
        if (existsSync(temp)) unlinkSync(temp);
        throw error;
    }
}

export function buildBlessing() {
    const input = loadMainInputs({ requireLayout: true }); const baked = buildInitialProposal();
    if (stableJson(baked.layout) !== stableJson(input.layout)) throw new Error('accepted Main lock differs from deterministic solver output');
    const convergenceGate = { maxTailStep: 0.01, finalKineticEnergy: 0.001, finalMaxSpeed: 0.01 };
    const converged = baked.diagnostics.maxTailStep <= convergenceGate.maxTailStep
        && baked.diagnostics.finalKineticEnergy <= convergenceGate.finalKineticEnergy
        && baked.diagnostics.finalMaxSpeed <= convergenceGate.finalMaxSpeed;
    if (!converged) throw new Error(`convergence gate failed: ${JSON.stringify(baked.diagnostics)}`);
    const debt = layoutDebt(input.nodes, input.records, input.layout, input.anchors, null, { includeBaseline: true });
    return {
        schemaVersion: '1.0.0', baselineVersion: 'main-v1', layoutVersion: input.layout.layoutVersion,
        blessedAt: '2026-07-12', layoutFingerprint: fingerprint(input.layout),
        layoutInputsFingerprint: input.layout.layoutInputsFingerprint,
        anchorConfigFingerprint: input.layout.anchorConfigFingerprint,
        relationFingerprint: debt.baseline.relationFingerprint,
        solverVersion: input.layout.solverVersion, algorithmParamsHash: input.layout.algorithmParamsHash,
        toolchain: input.layout.toolchain, convergenceGate, convergence: baked.diagnostics,
        nodeCount: debt.baseline.nodeCount, edgeKeys: debt.baseline.edgeKeys,
        p95NormalizedEdgeLength: debt.baseline.p95NormalizedEdgeLength,
        knnDensityP95: debt.baseline.knnDensityP95,
        domainCentroidDrifts: debt.baseline.domainCentroidDrifts,
    };
}

async function main() {
    try {
        if (!process.argv.includes('--write')) throw new Error('usage: --write');
        if (existsSync(MAIN_BASELINE_PATH) && !process.argv.includes('--replace-v1')) throw new Error('main-v1 baseline already exists; use --replace-v1 only during an authorized blessing pass');
        const blessing = buildBlessing(); atomicWrite(MAIN_BASELINE_PATH, stableJson(blessing));
        process.stdout.write(`atlas layout blessing: WROTE config/atlas/layout-baselines/main-v1.json layout=${blessing.layoutFingerprint}\n`);
    } catch (error) { process.stderr.write(`scripts/atlas/layout/bless-layout.mjs:$: ${error.message}\n`); process.exitCode = /usage/.test(error.message) ? 2 : 1; }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
