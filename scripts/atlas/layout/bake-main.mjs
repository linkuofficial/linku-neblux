import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { MAIN_LAYOUT_PATH, atomicWriteLayout, handleCliError, loadMainInputs, writeNewLayout } from './io.mjs';
import { makeInitialMainLayoutResult, stableJson } from './policy.mjs';

export function buildInitialProposal() {
    const input = loadMainInputs();
    return makeInitialMainLayoutResult(input.nodes, input.records, input.anchors);
}

async function main() {
    try {
        const write = process.argv.includes('--write');
        const bless = process.argv.includes('--bless-v1');
        if (write && existsSync(MAIN_LAYOUT_PATH) && !bless) throw new Error('initial layout already exists; layout migration requires a separate brief');
        const result = buildInitialProposal(); const json = stableJson(result.layout);
        if (write) {
            if (existsSync(MAIN_LAYOUT_PATH)) atomicWriteLayout(MAIN_LAYOUT_PATH, json); else writeNewLayout(MAIN_LAYOUT_PATH, json);
            process.stdout.write(`atlas main v1 layout: WROTE config/atlas/layout/main.json diagnostics=${JSON.stringify(result.diagnostics)}\n`);
        } else process.stdout.write(stableJson(result));
    } catch (error) { handleCliError('scripts/atlas/layout/bake-main.mjs', error, { alreadyReported: Boolean(error.exitCode) }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
