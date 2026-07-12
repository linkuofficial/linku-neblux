import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, exitCodeFor, issue, printIssues, readJson, repoPath, sortIssues, versionCompatibility } from './contract.mjs';

const SUPPORTED = Object.freeze({ schemaVersion: '1.0.0', layoutVersion: '2.0.0', rendererContractVersion: '2.0.0' });

export function auditArtifactEnvelope(artifact, validRefs = new Set(), file = 'artifact.json') {
    const issues = [];
    if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) return [issue(file, '$', 'must be an object')];
    for (const [key, supported] of Object.entries(SUPPORTED)) {
        const compatibility = versionCompatibility(artifact[key], supported);
        if (compatibility === 'invalid') issues.push(issue(file, `$.${key}`, 'must be semantic version X.Y.Z'));
        else if (compatibility === 'major') issues.push(issue(file, `$.${key}`, `unsupported major version; supported ${supported}`));
        else if (compatibility === 'future-minor') issues.push(issue(file, `$.${key}`, `future minor version ${artifact[key]}`, 'warning'));
    }
    if (artifact.refs !== undefined) {
        if (!Array.isArray(artifact.refs)) issues.push(issue(file, '$.refs', 'must be an array when present'));
        else artifact.refs.forEach((ref, index) => {
            if (!validRefs.has(ref)) issues.push(issue(file, `$.refs[${index}]`, `reverse reference ${String(ref)} does not exist`));
        });
    }
    return sortIssues(issues);
}

async function main() {
    const artifactArg = process.argv[process.argv.indexOf('--artifact') + 1];
    if (!artifactArg) {
        printIssues([issue('scripts/atlas/audit-artifacts.mjs', '$', 'usage: --artifact <fixture>', 'error', 'usage')]);
        process.exitCode = 2; return;
    }
    const file = resolve(REPO_ROOT, artifactArg);
    if (!repoPath(file).startsWith('tests/atlas/fixtures/')) {
        printIssues([issue(file, '$', 'WP1 audit only accepts tests/atlas/fixtures', 'error', 'usage')]);
        process.exitCode = 2; return;
    }
    const read = readJson(file); const issues = [...read.issues];
    if (read.value) issues.push(...auditArtifactEnvelope(read.value, new Set(read.value.fixtureValidRefs || []), file));
    printIssues(issues); process.exitCode = exitCodeFor(issues);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
