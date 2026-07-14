import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, repoPath } from '../contract.mjs';
import { MAIN_BASELINE_PATH, handleCliError, loadMainInputs, usageError } from './io.mjs';
import { layoutDebt, stableJson } from './policy.mjs';

async function main() {
    try {
        const input = loadMainInputs({ requireLayout: true }); const baselineAt = process.argv.indexOf('--baseline');
        if (baselineAt >= 0 && !process.argv[baselineAt + 1]) throw usageError('usage: --baseline <repo-relative-path>');
        const baselinePath = baselineAt >= 0 ? resolve(REPO_ROOT, process.argv[baselineAt + 1]) : (existsSync(MAIN_BASELINE_PATH) ? MAIN_BASELINE_PATH : null);
        if (baselinePath && !(repoPath(baselinePath).startsWith('config/atlas/layout-baselines/') || repoPath(baselinePath).startsWith('tests/atlas/fixtures/'))) throw usageError('baseline path is outside the diagnostic whitelist');
        const baseline = baselinePath ? JSON.parse(readFileSync(baselinePath, 'utf8')) : null;
        const failureAt = process.argv.indexOf('--local-solve-failures'); const localSolveFailures = failureAt >= 0 ? Number(process.argv[failureAt + 1]) : 0;
        const report = layoutDebt(input.nodes, input.records, input.layout, input.anchors, baseline, { localSolveFailures, includeBaseline: process.argv.includes('--include-baseline') });
        process.stdout.write(stableJson(report));
        if (report.baselineStatus === 'NO_BASELINE') process.exitCode = 1;
    } catch (error) { handleCliError('scripts/atlas/layout/report-layout-debt.mjs', error, { alreadyReported: Boolean(error.exitCode && error.exitCode !== 2) }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
