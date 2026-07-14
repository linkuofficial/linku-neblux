import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { REPO_ROOT, exitCodeFor, printIssues, readJson, repoPath } from '../contract.mjs';
import { validateConfig } from '../validate-config.mjs';
import { validateGraph } from '../validate-sources.mjs';
import { auditDomains } from '../audit-domains.mjs';

export const GRAPH_PATH = resolve(REPO_ROOT, 'data/all_nodes.json');
export const ANCHOR_PATH = resolve(REPO_ROOT, 'config/atlas/domain-anchors.json');
export const MAIN_LAYOUT_PATH = resolve(REPO_ROOT, 'config/atlas/layout/main.json');
export const WONDER_LAYOUT_ROOT = resolve(REPO_ROOT, 'config/atlas/layout/wonders');
export const LAYOUT_ROOT = resolve(REPO_ROOT, 'config/atlas/layout');
export const MAIN_BASELINE_PATH = resolve(REPO_ROOT, 'config/atlas/layout-baselines/main-v1.json');

export function usageError(message) {
    const error = new Error(message); error.exitCode = 2; return error;
}

export function handleCliError(script, error, { alreadyReported = false } = {}) {
    if (!alreadyReported) process.stderr.write(`${script}:$: ${error.message}\n`);
    process.exitCode = error.exitCode || 1;
}

export function loadMainInputs({ requireLayout = false } = {}) {
    const graphRead = readJson(GRAPH_PATH); const anchorRead = readJson(ANCHOR_PATH);
    const issues = [...graphRead.issues, ...anchorRead.issues];
    const graph = graphRead.value ? validateGraph(graphRead.value, GRAPH_PATH) : { nodes: [], records: [], issues: [] };
    issues.push(...graph.issues);
    if (anchorRead.value) {
        issues.push(...validateConfig('domain-anchors', anchorRead.value, ANCHOR_PATH));
        issues.push(...auditDomains(graphRead.value, anchorRead.value, GRAPH_PATH, ANCHOR_PATH));
    }
    let layout = null;
    if (requireLayout) {
        const read = readJson(MAIN_LAYOUT_PATH); issues.push(...read.issues); layout = read.value;
        if (layout) issues.push(...validateConfig('layout', layout, MAIN_LAYOUT_PATH));
    }
    if (exitCodeFor(issues) !== 0) {
        printIssues(issues);
        const error = new Error('layout inputs failed validation'); error.exitCode = exitCodeFor(issues); throw error;
    }
    return { graphRaw: graphRead.value, nodes: graph.nodes, records: graph.records, anchors: anchorRead.value, layout };
}

export function assertWritableLayoutPath(path) {
    const rel = repoPath(path);
    if (!(rel === 'config/atlas/layout/main.json' || rel.startsWith('config/atlas/layout/wonders/'))) throw new Error(`refusing write outside layout whitelist: ${rel}`);
    if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error(`refusing to write symlink: ${rel}`);
    mkdirSync(dirname(path), { recursive: true });
    const root = realpathSync(LAYOUT_ROOT); const parent = realpathSync(dirname(path));
    if (!(parent === root || parent.startsWith(`${root}\\`) || parent.startsWith(`${root}/`))) throw new Error(`refusing realpath escape: ${rel}`);
}

export function atomicWriteLayout(path, content, { beforeRename } = {}) {
    assertWritableLayoutPath(path);
    let parsed;
    try { parsed = JSON.parse(content); } catch { throw new Error('refusing to write invalid layout JSON'); }
    const schemaIssues = validateConfig('layout', parsed, path).filter((value) => value.severity === 'error');
    if (schemaIssues.length) throw new Error(`refusing schema-invalid layout: ${schemaIssues[0].path} ${schemaIssues[0].message}`);
    const temp = resolve(dirname(path), `.${basename(path)}.${process.pid}.tmp`);
    let handle;
    try {
        handle = openSync(temp, 'wx'); writeFileSync(handle, content, 'utf8'); fsyncSync(handle); closeSync(handle); handle = undefined;
        const verified = readJson(temp); if (verified.issues.length) throw new Error('temp layout failed post-write parse verification');
        if (beforeRename) beforeRename(temp);
        renameSync(temp, path);
    } catch (error) {
        if (handle !== undefined) closeSync(handle);
        if (existsSync(temp)) unlinkSync(temp);
        throw error;
    }
}

export function writeNewLayout(path, content) {
    assertWritableLayoutPath(path);
    if (existsSync(path)) throw new Error(`refusing to overwrite existing layout lock: ${repoPath(path)}`);
    atomicWriteLayout(path, content);
}

export function wonderSourcePath(id) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw usageError(`invalid Wonder id ${id}`);
    return resolve(REPO_ROOT, 'data/wonders', `${id}.json`);
}
