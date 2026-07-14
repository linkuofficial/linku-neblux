import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAIN_LAYOUT_PATH, atomicWriteLayout, handleCliError, loadMainInputs, usageError } from './io.mjs';
import { addNodeLocally, diffLayouts, finalizeNewLocks, stableJson } from './policy.mjs';

async function main() {
    try {
        const at = process.argv.indexOf('--node'); const id = at >= 0 ? process.argv[at + 1] : null;
        if (!id) throw usageError('usage: --node <canonical-id> [--write]');
        const input = loadMainInputs({ requireLayout: true });
        const proposal = addNodeLocally(input.nodes, input.records, input.layout, input.anchors, id);
        const diff = diffLayouts(input.layout, proposal);
        if (!diff.passed) throw new Error(`movement budget failed: ${stableJson(diff).trim()}`);
        if (process.argv.includes('--write')) {
            const persisted = finalizeNewLocks(proposal);
            atomicWriteLayout(MAIN_LAYOUT_PATH, stableJson(persisted));
            process.stdout.write(`atlas local layout: WROTE node=${id}\n`);
        } else process.stdout.write(stableJson({ proposal, diff }));
    } catch (error) { handleCliError('scripts/atlas/layout/add-node.mjs', error, { alreadyReported: Boolean(error.exitCode && error.exitCode !== 2) }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
