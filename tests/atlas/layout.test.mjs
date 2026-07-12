import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateGraph } from '../../scripts/atlas/validate-sources.mjs';
import { checkMainLayout, checkWonderLayouts } from '../../scripts/atlas/layout/check-layout.mjs';
import {
    activeNeighborIds, addNodeLocally, anchorFingerprint, classifyProposal, diffLayouts, finalizeNewLocks,
    fingerprint, layoutDebt, layoutInputsFingerprint, localInitialTarget, makeInitialMainLayout,
    makeWonderLayout, nodeSetFingerprint, overlapCount, stableJson,
} from '../../scripts/atlas/layout/policy.mjs';
import { atomicWriteLayout } from '../../scripts/atlas/layout/io.mjs';
import { bumpWonderPatch } from '../../scripts/atlas/layout/bake-wonder.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const read = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const graphRaw = read('data/all_nodes.json');
const graph = validateGraph(graphRaw, 'data/all_nodes.json');
const anchors = read('config/atlas/domain-anchors.json');
const mainLayout = read('config/atlas/layout/main.json');

test('real Main layout is deterministic, complete and overlap-free', { timeout: 20000 }, () => {
    const first = makeInitialMainLayout(graph.nodes, graph.records, anchors);
    const second = makeInitialMainLayout(graph.nodes, graph.records, anchors);
    assert.equal(stableJson(first), stableJson(second));
    assert.equal(stableJson(first), stableJson(mainLayout));
    assert.equal(Object.keys(first.nodes).length, 687);
    assert.equal(overlapCount(graph.nodes, first), 0);
    assert.deepEqual(checkMainLayout(graph.nodes, first, anchors), []);
    for (const anchor of Object.values(anchors.anchors)) assert.deepEqual(first.nodes[anchor.nodeId], { x: anchor.x, y: anchor.y, lock: 'hard' });
});

test('fingerprints ignore copy and relation prose but react to node and anchor changes', () => {
    const relabeled = structuredClone(graph.nodes); relabeled[0].label = 'Changed copy';
    assert.equal(nodeSetFingerprint(graph.nodes), nodeSetFingerprint(relabeled));
    const changedNodes = structuredClone(graph.nodes); changedNodes.push({ id: 'new-id' });
    assert.notEqual(nodeSetFingerprint(graph.nodes), nodeSetFingerprint(changedNodes));
    const changedAnchors = structuredClone(anchors); changedAnchors.anchors.MAT.x += 1;
    assert.notEqual(anchorFingerprint(anchors), anchorFingerprint(changedAnchors));
    const proseChanged = structuredClone(graph.records); proseChanged[0].relation = 'Different prose';
    assert.equal(stableJson(makeInitialMainLayout(graph.nodes, graph.records, anchors)), stableJson(makeInitialMainLayout(graph.nodes, proseChanged, anchors)));
});

test('local add changes only the new node and one-hop soft neighbours, never hard anchors', () => {
    const nodes = [
        { id: 'anchor', type: 'field', domain: ['MAT'], connections: [] },
        { id: 'near', type: 'concept', domain: ['MAT'], connections: [{ target: 'new-node', relation_type: 'logical', relation: 'near to new' }] },
        { id: 'far', type: 'concept', domain: ['MAT'], connections: [] },
        { id: 'new-node', type: 'concept', domain: ['MAT'], connections: [{ target: 'near', relation_type: 'logical', relation: 'new to near' }] },
    ];
    const config = { anchors: { MAT: { nodeId: 'anchor', x: 0, y: 0 } } };
    const before = { layoutVersion: 'main-2.0.0', nodeSetFingerprint: 'old', nodes: {
        anchor: { x: 0, y: 0, lock: 'hard' }, near: { x: 120, y: 0, lock: 'soft', radius: 90 }, far: { x: 500, y: 0, lock: 'soft', radius: 90 },
    } };
    const records = validateGraph({ nodes }, 'local-add.json').records;
    const after = addNodeLocally(nodes, records, before, config, 'new-node');
    assert.deepEqual(after.nodes.anchor, before.nodes.anchor);
    assert.deepEqual(after.nodes.far, before.nodes.far);
    assert.ok(after.nodes['new-node']);
    assert.ok(Math.hypot(after.nodes.near.x - before.nodes.near.x, after.nodes.near.y - before.nodes.near.y) <= 90.01);
    assert.deepEqual(new Set(diffLayouts(before, after).moved.map((entry) => entry.id)), new Set(['near']));
});

test('local target normalizes position weights and active topology deduplicates neighbours', () => {
    const target = localInitialTarget({ x: 900, y: 600 }, [{ x: 900, y: 600 }, { x: 902, y: 598 }], { x: 0, y: 0 });
    assert.ok(Math.hypot(target.x - 901, target.y - 599) < 1);
    const records = [
        { source: 'new', target: 'a', pending: true },
        { source: 'new', target: 'b', pending: false },
        { source: 'b', target: 'new', pending: false },
    ];
    assert.deepEqual([...activeNeighborIds(records, 'new')], ['b']);
});

test('new locks are proposal-only and persist as soft', () => {
    const proposal = { nodes: { a: { x: 0, y: 0, lock: 'new', radius: 90 } } };
    assert.equal(finalizeNewLocks(proposal).nodes.a.lock, 'soft');
    assert.equal(proposal.nodes.a.lock, 'new');
});

test('two adjacent local additions see the first persisted soft lock and do not overlap', () => {
    const nodes = [
        { id: 'anchor', type: 'field', domain: ['MAT'] },
        { id: 'n1', type: 'concept', domain: ['MAT'] },
        { id: 'n2', type: 'concept', domain: ['MAT'] },
    ];
    const records = [{ source: 'n1', target: 'n2', pending: false }];
    const config = { anchors: { MAT: { nodeId: 'anchor', x: 900, y: 600 } } };
    const before = { nodes: { anchor: { x: 900, y: 600, lock: 'hard' } } };
    const first = finalizeNewLocks(addNodeLocally(nodes, records, before, config, 'n1'));
    const second = finalizeNewLocks(addNodeLocally(nodes, records, first, config, 'n2'));
    assert.equal(first.nodes.n1.lock, 'soft');
    assert.ok(second.nodes.n1);
    assert.equal(overlapCount(nodes, second), 0);
});

test('layout diff rejects hard movement and movement above five percent', () => {
    const before = { layoutVersion: 'a', nodes: { a: { x: 0, y: 0, lock: 'hard' }, b: { x: 100, y: 0, lock: 'soft' }, c: { x: 200, y: 0, lock: 'soft' } } };
    const hard = structuredClone(before); hard.layoutVersion = 'b'; hard.nodes.a.x = 1;
    assert.equal(diffLayouts(before, hard).passed, false);
    const far = structuredClone(before); far.layoutVersion = 'b'; far.nodes.b.x = 150;
    assert.equal(diffLayouts(before, far).passed, false);
    const many = { layoutVersion: 'a', nodes: Object.fromEntries(Array.from({ length: 100 }, (_, index) => [`n${index}`, { x: index * 10, y: 0, lock: 'soft' }])) };
    const crowded = structuredClone(many); crowded.layoutVersion = 'b';
    for (let index = 0; index < 6; index += 1) crowded.nodes[`n${index}`].y = 30;
    assert.equal(diffLayouts(many, crowded).passed, false);
    assert.ok(diffLayouts(many, crowded).withinTwoPercentRatio < 0.95);
});

test('all 19 Wonder locks are deterministic and isolated per source', () => {
    assert.deepEqual(checkWonderLayouts(), []);
    const names = readdirSync(resolve(root, 'data/wonders')).filter((name) => name.endsWith('.json')).sort();
    assert.equal(names.length, 19);
    for (const name of names) {
        const source = read(`data/wonders/${name}`); const lock = read(`config/atlas/layout/wonders/${name}`);
        assert.equal(stableJson(makeWonderLayout(source)), stableJson(lock));
    }
    const light = read('data/wonders/light.json'); const quantum = read('data/wonders/quantum.json');
    const quantumHash = fingerprint(makeWonderLayout(quantum));
    light.cluster = { context_refs: ['mathematics_field'] };
    assert.throws(() => makeWonderLayout(light), /centroid-aware WP7/);
    assert.equal(fingerprint(makeWonderLayout(quantum)), quantumHash);
});

test('Wonder spine changes fail the normal budget and have an explicit patch-bump path', () => {
    const source = read('data/wonders/light.json');
    const before = makeWonderLayout(source);
    source.steps.splice(1, 0, { local: { id: 'review-only-step' } });
    const after = makeWonderLayout(source);
    assert.equal(diffLayouts(before, after).passed, false);
    assert.equal(bumpWonderPatch(before.layoutVersion, source.id), `wonder-${source.id}-1.0.1`);
});

test('layout input fingerprint and check identify domain or type mutations', () => {
    const changed = structuredClone(graph.nodes);
    changed[0].domain = ['BIO'];
    assert.notEqual(layoutInputsFingerprint(changed), mainLayout.layoutInputsFingerprint);
    assert.match(checkMainLayout(changed, mainLayout, anchors).find((entry) => entry.path === '$.layoutInputsFingerprint').message, new RegExp(changed[0].id));
    const changedType = structuredClone(graph.nodes);
    changedType[1].type = changedType[1].type === 'concept' ? 'event' : 'concept';
    assert.match(checkMainLayout(changedType, mainLayout, anchors).find((entry) => entry.path === '$.layoutInputsFingerprint').message, new RegExp(changedType[1].id));
    const changedParams = structuredClone(mainLayout); changedParams.algorithmParamsHash = 'sha256:changed';
    assert.match(checkMainLayout(graph.nodes, changedParams, anchors).find((entry) => entry.path === '$.algorithmParamsHash').message, /solver parameters changed/);
});

test('layout debt is deterministic and raises every migration signal without writing', () => {
    const nodes = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, type: 'concept', domain: ['MAT'] }));
    const records = [{ source: 'a', target: 'b', pending: false }];
    const layout = { layoutVersion: 'main-2.0.0', nodes: {
        a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, c: { x: 200, y: 0 },
        d: { x: 200, y: 0 }, e: { x: 400, y: 0 }, f: { x: 500, y: 0 },
    } };
    const config = { anchors: { MAT: { x: 0, y: 0 } } };
    const baseline = { edgeKeys: Array.from({ length: 10 }, (_, index) => `x${index}\u0000y${index}`), nodeCount: 1, p95NormalizedEdgeLength: 0.001, knnDensityP95: 0.001, relationFingerprint: 'sha256:baseline' };
    const first = layoutDebt(nodes, records, layout, config, baseline, { localSolveFailures: 2 });
    const second = layoutDebt(nodes, records, layout, config, baseline, { localSolveFailures: 2 });
    assert.equal(stableJson(first), stableJson(second));
    assert.equal(first.recommendMigration, true);
    for (const reason of ['edge-set-change>=10%', 'node-set-change>=5%', 'edge-length-p95>=125%-baseline', 'knn-density-p95>=125%-baseline', 'overlap-count>0', 'local-solve-failed-twice']) assert.ok(first.reasons.includes(reason));
});

test('layout debt never self-baselines and names drifting domains', () => {
    const nodes = [{ id: 'a', type: 'concept', domain: ['MAT'] }];
    const layout = { layoutVersion: 'x', nodes: { a: { x: 200, y: 0 } } };
    const config = { anchors: { MAT: { x: 0, y: 0 } } };
    const noBaseline = layoutDebt(nodes, [], layout, config);
    assert.equal(noBaseline.baselineStatus, 'NO_BASELINE');
    assert.ok(noBaseline.reasons.includes('baseline-missing'));
    const baseline = { edgeKeys: [], nodeCount: 1, p95NormalizedEdgeLength: 0, knnDensityP95: 0, domainCentroidDrifts: { MAT: 0 } };
    assert.ok(layoutDebt(nodes, [], layout, config, baseline).reasons.some((reason) => reason.startsWith('domain-centroid-drift:MAT:')));
});

test('atomic layout write preserves the original when interrupted before rename', () => {
    const directory = mkdtempSync(resolve(root, 'config/atlas/layout/wonders/.atomic-test-'));
    const path = resolve(directory, 'candidate.json');
    writeFileSync(path, '{"original":true}\n');
    try {
        const valid = stableJson(makeWonderLayout(read('data/wonders/light.json')));
        assert.throws(() => atomicWriteLayout(path, valid, { beforeRename: () => { throw new Error('injected interruption'); } }), /injected interruption/);
        assert.equal(readFileSync(path, 'utf8'), '{"original":true}\n');
        atomicWriteLayout(path, valid);
        assert.equal(readFileSync(path, 'utf8'), valid);
    } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('classification proposal is deterministic and proposal CLI refuses writes', () => {
    const proposal = classifyProposal(graph.nodes, graph.records, anchors);
    assert.equal(fingerprint(proposal), fingerprint(classifyProposal(graph.nodes, graph.records, anchors)));
    assert.equal(proposal.mathematics_field.archetype, 'galactic_nucleus');
    assert.equal(proposal.physics_field.layoutMassClass, 'nucleus');
    const result = spawnSync(process.execPath, ['scripts/atlas/layout/classify-celestial.mjs', '--write'], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /proposal-only/);
});

test('proposal-only Wonder CLI performs zero repository writes', () => {
    const file = resolve(root, 'config/atlas/layout/wonders/light.json');
    const before = createHash('sha256').update(readFileSync(file)).digest('hex');
    const result = spawnSync(process.execPath, ['scripts/atlas/layout/bake-wonder.mjs', '--id', 'light'], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0);
    const after = createHash('sha256').update(readFileSync(file)).digest('hex');
    assert.equal(after, before);
});

test('Wonder CLI rejects unsafe ids as usage errors', () => {
    const result = spawnSync(process.execPath, ['scripts/atlas/layout/bake-wonder.mjs', '--id', '../x'], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^scripts\/atlas\/layout\/bake-wonder\.mjs:\$:/);
});

test('initial --write refuses to overwrite the accepted Main lock', () => {
    const file = resolve(root, 'config/atlas/layout/main.json');
    const before = createHash('sha256').update(readFileSync(file)).digest('hex');
    const result = spawnSync(process.execPath, ['scripts/atlas/layout/bake-main.mjs', '--write'], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /migration requires a separate brief/);
    assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), before);
});
