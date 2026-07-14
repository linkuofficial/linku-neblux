import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, readJson, repoPath } from '../contract.mjs';
import { diffLayouts, stableJson } from './policy.mjs';

function allowed(path) {
    const rel = repoPath(path); return rel.startsWith('config/atlas/layout/') || rel.startsWith('tests/atlas/fixtures/');
}

async function main() {
    try {
        const beforeArg = process.argv[process.argv.indexOf('--before') + 1]; const afterArg = process.argv[process.argv.indexOf('--after') + 1];
        if (!beforeArg || !afterArg) throw new Error('usage: --before <layout> --after <layout>');
        const beforePath = resolve(REPO_ROOT, beforeArg); const afterPath = resolve(REPO_ROOT, afterArg);
        if (!allowed(beforePath) || !allowed(afterPath)) throw new Error('layout diff input is outside the whitelist');
        const before = readJson(beforePath); const after = readJson(afterPath);
        if (before.issues.length || after.issues.length) throw new Error('failed to read layout input');
        const result = diffLayouts(before.value, after.value); process.stdout.write(stableJson(result)); process.exitCode = result.passed ? 0 : 1;
    } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 2; }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
