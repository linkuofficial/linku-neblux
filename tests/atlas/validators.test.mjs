import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
    SCHEMA_CONTRACTS, connectionKey, exitCodeFor, normalizeConnection, projectTopology,
    readJson, sortIssues,
} from '../../scripts/atlas/contract.mjs';
import { validateAllSchemas, validateConfig, validateSchemaContract } from '../../scripts/atlas/validate-config.mjs';
import { sourceFiles, validateDepthManifest, validateGraph, validateWonder } from '../../scripts/atlas/validate-sources.mjs';
import { auditDomains } from '../../scripts/atlas/audit-domains.mjs';
import { auditPortals } from '../../scripts/atlas/audit-portals.mjs';
import { auditArtifactEnvelope } from '../../scripts/atlas/audit-artifacts.mjs';
import { DEPTH_QA_KEYS, isDepthPublishable } from '../../neblux-depth/depth-contract.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const fixture = (name) => JSON.parse(readFileSync(resolve(import.meta.dirname, 'fixtures', name), 'utf8'));
const relation = 'A valid explanatory relation.';
const connection = (target, overrides = {}) => ({ target, relation_type: 'logical', relation, ...overrides });
const graph = (connectionsA = [], connectionsB = []) => ({ nodes: [
    { id: 'a', type: 'concept', domain: ['MAT'], connections: connectionsA },
    { id: 'b', type: 'concept', domain: ['PHY'], connections: connectionsB },
] });

test('normalization treats absent booleans as false and requires caller-validated relation', () => {
    const absent = normalizeConnection('a', connection('b'));
    const explicit = normalizeConnection('a', connection('b', { directed: false, learning_prerequisite: false, parallel_development: false, pending: false }));
    assert.equal(connectionKey(absent), connectionKey(explicit));
});

test('exact duplicate catches absent versus false but preserves reverse and heterogeneous records', () => {
    const duplicate = validateGraph(graph([
        connection('b'),
        connection('b', { directed: false, learning_prerequisite: false, parallel_development: false, pending: false }),
    ]), 'duplicate.json');
    assert.match(duplicate.issues.map((value) => value.message).join('\n'), /exact duplicate/);
    const legal = validateGraph(graph(
        [connection('b'), connection('b', { relation_type: 'applied' }), connection('b', { relation: 'A different sentence.' })],
        [connection('a')],
    ), 'legal.json');
    assert.equal(legal.issues.length, 0);
    assert.equal(legal.records.length, 4);
    assert.equal(legal.topology.length, 1);
});

test('relation null, empty and canonical self-loop fail', () => {
    const result = validateGraph(graph([
        connection('b', { relation: null }), connection('b', { relation: '' }), connection('a'),
    ]), 'invalid.json');
    const messages = result.issues.map((value) => value.message).join('\n');
    assert.match(messages, /non-empty string/);
    assert.match(messages, /self-loop/);
});

test('projectTopology keeps one active unordered pair and excludes pending-only', () => {
    const records = [
        normalizeConnection('a', connection('b', { pending: true })),
        normalizeConnection('b', connection('a', { pending: false })),
        normalizeConnection('a', connection('c', { pending: true })),
    ];
    assert.deepEqual(projectTopology(records), [{ source: 'a', target: 'b', active: true, semanticRecordCount: 2 }]);
});

test('Wonder membership includes steps and context, while local ids stay unique', () => {
    const valid = {
        id: 'sample',
        steps: [{ ref: 'a' }, { local: { id: 'local-one' } }],
        cluster: { context_refs: ['b'], featured_portals: ['b'] },
        edges: [{ source: 'a', target: 'local-one', relation_type: 'logical' }],
    };
    assert.equal(validateWonder(valid, new Set(['a', 'b']), 'wonder.json').length, 0);
    const invalid = structuredClone(valid);
    invalid.steps.push({ local: { id: 'local-one' } });
    invalid.edges.push({ source: 'missing', target: 'missing', relation_type: 'bad' });
    const messages = validateWonder(invalid, new Set(['a', 'b']), 'wonder.json').map((value) => value.message).join('\n');
    assert.match(messages, /duplicate local id/);
    assert.match(messages, /not a Wonder member/);
});

test('Depth publication predicate is shared and every required condition gates publication', () => {
    const base = { public: true, status: 'live', review_status: 'published', depth_path: 'depth/a.html', qa: Object.fromEntries(DEPTH_QA_KEYS.map((key) => [key, true])) };
    assert.equal(isDepthPublishable(base), true);
    for (const mutate of [
        (entry) => { entry.public = false; }, (entry) => { entry.status = 'review'; },
        (entry) => { entry.review_status = 'approved'; }, (entry) => { entry.depth_path = null; },
        ...DEPTH_QA_KEYS.map((key) => (entry) => { entry.qa[key] = false; }),
    ]) {
        const entry = structuredClone(base); mutate(entry); assert.equal(isDepthPublishable(entry), false);
    }
    const manifest = { entries: [{ id: 'd', node_id: 'a', ...base }] };
    assert.equal(validateDepthManifest(manifest, new Set(['a']), 'depth.json').length, 0);
});

test('four schemas match contract.mjs and enum drift is detected', () => {
    assert.deepEqual(validateAllSchemas(), []);
    const schema = JSON.parse(readFileSync(resolve(root, 'config/atlas/layout.schema.json'), 'utf8'));
    schema.properties.nodes.additionalProperties.properties.lock.enum.push('drift');
    assert.match(validateSchemaContract('layout', schema, 'layout.schema.json')[0].message, /enum does not match/);
    assert.equal(Object.keys(SCHEMA_CONTRACTS).length, 4);
});

function validAnchors(version = '1.0.0') {
    const anchors = {};
    for (const domain of ['ART', 'BIO', 'CHE', 'ENG', 'HIS', 'HUM', 'MAT', 'MED', 'PHI', 'PHY', 'SOC', 'TEC']) {
        anchors[domain] = { nodeId: `${domain.toLowerCase()}-anchor`, x: 0, y: 0, lock: 'hard', massClass: 'standard', archetype: 'domain_core' };
    }
    return { schemaVersion: version, layoutVersion: 'main-2.0.0', anchors };
}

test('same-version unknown fields fail, future minor warns, future major fails', () => {
    const same = { ...validAnchors(), extra: true };
    const future = { ...validAnchors('1.1.0'), extra: true };
    const major = validAnchors('2.0.0');
    assert.equal(exitCodeFor(validateConfig('domain-anchors', same)), 1);
    const futureIssues = validateConfig('domain-anchors', future);
    assert.equal(exitCodeFor(futureIssues), 0);
    assert.equal(futureIssues.find((value) => value.path === '$.extra').severity, 'warning');
    assert.equal(exitCodeFor(validateConfig('domain-anchors', major)), 1);
});

test('domain audit uses explicit mapping and accepts a non *_field anchor id', () => {
    const graphFixture = fixture('domain-graph.json');
    const anchors = fixture('domain-anchors.json');
    assert.deepEqual(auditDomains(graphFixture, anchors), []);
    const missing = structuredClone(anchors); delete missing.anchors.PHY;
    assert.match(auditDomains(graphFixture, missing)[0].message, /missing/);
    const bad = structuredClone(anchors); bad.anchors.MAT.nodeId = 'does-not-exist';
    assert.match(auditDomains(graphFixture, bad)[0].message, /does not exist/);
});

test('portal and artifact envelope audits validate refs without freezing draft payload', () => {
    const portal = fixture('portal-index.json');
    assert.deepEqual(auditPortals(portal, new Set(['core_alpha'])), []);
    assert.match(auditPortals(portal, new Set())[0].message, /not canonical/);
    const artifact = fixture('artifact-envelope.json');
    assert.equal(auditArtifactEnvelope(artifact, new Set(['core_alpha'])).filter((value) => value.severity === 'error').length, 0);
    const future = { ...artifact, schemaVersion: '1.1.0', unknownPayload: true };
    assert.equal(exitCodeFor(auditArtifactEnvelope(future, new Set(['core_alpha']))), 0);
    const major = { ...artifact, schemaVersion: '2.0.0' };
    assert.equal(exitCodeFor(auditArtifactEnvelope(major, new Set(['core_alpha']))), 1);
});

test('JSON reader strips BOM and maps parse errors; issue sorting is numeric', () => {
    const directory = mkdtempSync(join(tmpdir(), 'neblux-atlas-'));
    try {
        const bom = join(directory, 'bom.json'); const bad = join(directory, 'bad.json');
        writeFileSync(bom, '\uFEFF{"ok":true}', 'utf8'); writeFileSync(bad, '{\n"x": }', 'utf8');
        assert.deepEqual(readJson(bom).value, { ok: true });
        assert.match(readJson(bad).issues[0].message, /line 1 col 1|line 2 col/);
    } finally { rmSync(directory, { recursive: true, force: true }); }
    const sorted = sortIssues([
        { file: 'a', path: '$.connections[10]', message: 'x' },
        { file: 'a', path: '$.connections[2]', message: 'x' },
    ]);
    assert.equal(sorted[0].path, '$.connections[2]');
});

test('real source whitelist excludes generated public and dist copies', () => {
    const files = sourceFiles();
    const all = [files.graph, files.depth, ...files.wonders].map((file) => file.replaceAll('\\', '/'));
    assert.equal(all.some((file) => file.includes('/frontend/public/') || file.includes('/dist/')), false);
    assert.equal(all.every((file) => file.includes('/data/') || file.includes('/neblux-depth/')), true);
});

test('CLI rejects usage errors with exit code 2', () => {
    const result = spawnSync(process.execPath, ['scripts/atlas/validate-sources.mjs', '--unexpected'], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /usage/);
});
