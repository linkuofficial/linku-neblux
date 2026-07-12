import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleCliError, loadMainInputs } from './io.mjs';
import { classifyProposal, stableJson } from './policy.mjs';

async function main() {
    try {
        if (process.argv.includes('--write')) throw new Error('classification is proposal-only; --write is forbidden');
        const input = loadMainInputs();
        process.stdout.write(stableJson({ schemaVersion: '1.0.0', classificationVersion: 'proposal-1.0.0', nodes: classifyProposal(input.nodes, input.records, input.anchors) }));
    } catch (error) { handleCliError('scripts/atlas/layout/classify-celestial.mjs', error, { alreadyReported: Boolean(error.exitCode) }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
