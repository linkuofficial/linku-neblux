import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from '../contract.mjs';
import { validateGraph, validateWonder } from '../validate-sources.mjs';
import { GRAPH_PATH, WONDER_LAYOUT_ROOT, atomicWriteLayout, handleCliError, usageError, wonderSourcePath, writeNewLayout } from './io.mjs';
import { diffLayouts, makeWonderLayout, stableJson } from './policy.mjs';

export function buildWonderProposal(id, options) {
    const source = wonderSourcePath(id); const read = readJson(source); const graphRead = readJson(GRAPH_PATH);
    if (read.issues.length || graphRead.issues.length) throw new Error((read.issues[0] || graphRead.issues[0]).message);
    const graph = validateGraph(graphRead.value, GRAPH_PATH); if (graph.issues.length) throw new Error(graph.issues[0].message);
    const issues = validateWonder(read.value, new Set(graph.nodes.map((node) => node.id)), source); if (issues.length) throw new Error(issues[0].message);
    return makeWonderLayout(read.value, options);
}

export function bumpWonderPatch(version, id) {
    const match = new RegExp(`^wonder-${id}-(\\d+)\\.(\\d+)\\.(\\d+)$`).exec(version);
    if (!match) throw new Error(`cannot bump invalid Wonder layout version ${version}`);
    return `wonder-${id}-${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

async function main() {
    try {
        const at = process.argv.indexOf('--id'); const id = at >= 0 ? process.argv[at + 1] : null;
        if (!id) throw usageError('usage: --id <wonder> [--write] [--accept-spine-reflow]');
        let proposal = buildWonderProposal(id); let json = stableJson(proposal);
        if (process.argv.includes('--write')) {
            const output = resolve(WONDER_LAYOUT_ROOT, `${id}.json`);
            if (existsSync(output)) {
                const current = readJson(output); if (current.issues.length) throw new Error(current.issues[0].message);
                let diff = diffLayouts(current.value, proposal);
                if (!diff.passed && process.argv.includes('--accept-spine-reflow')) {
                    proposal = buildWonderProposal(id, { layoutVersion: bumpWonderPatch(current.value.layoutVersion, id) });
                    json = stableJson(proposal); diff = diffLayouts(current.value, proposal);
                    process.stdout.write(`atlas Wonder spine reflow accepted for ${id}: ${stableJson(diff)}`);
                } else if (!diff.passed) throw new Error('Wonder spine structure changed; rerun with --accept-spine-reflow after human review');
                atomicWriteLayout(output, json);
            } else writeNewLayout(output, json);
            process.stdout.write(`atlas Wonder layout: WROTE config/atlas/layout/wonders/${id}.json\n`);
        } else process.stdout.write(json);
    } catch (error) { handleCliError('scripts/atlas/layout/bake-wonder.mjs', error); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
