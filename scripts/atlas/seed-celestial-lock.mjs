import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from './contract.mjs';
import { loadMainInputs } from './layout/io.mjs';
import { classifyProposal, stableJson } from './layout/policy.mjs';

const target = resolve(REPO_ROOT, 'config/atlas/celestial-lock.json');
if (existsSync(target)) throw new Error('refusing to overwrite existing celestial lock');
const inputs = loadMainInputs();
const proposal = classifyProposal(inputs.nodes, inputs.records, inputs.anchors);
writeFileSync(target, stableJson({ schemaVersion: '1.0.0', classificationVersion: '1.0.0', adapterVersion: '1.0.0', nodes: proposal }), 'utf8');
process.stdout.write(`seeded ${Object.keys(proposal).length} canonical classifications\n`);
