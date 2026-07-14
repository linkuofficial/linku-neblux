import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateConfig } from '../../scripts/atlas/validate-config.mjs';
import { validateGraph } from '../../scripts/atlas/validate-sources.mjs';
import {
    buildAtlasIndex, buildDepthIndex, buildPortalIndex, buildWonderArtifacts, stableJson,
    validateAtlasIndex, validateWonderCore, validateWonderLocale,
} from '../../scripts/atlas/artifact-contract.mjs';
import { auditGeneratedData } from '../../scripts/atlas/audit-data.mjs';
import { buildData, replaceDirectory } from '../../scripts/atlas/build-data.mjs';
import { buildArtifactMap, expectedArtifactPaths, loadArtifactInputs } from '../../scripts/atlas/artifact-sources.mjs';
import { buildTourIndex } from '../../scripts/build_tour_index.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const fixture = (name) => JSON.parse(readFileSync(resolve(import.meta.dirname, 'fixtures', name), 'utf8'));
const atlasSummaries = (config, extras = {}) => Object.fromEntries(Object.keys(config.wonders).map((id) => [id, {
    title: { en: id, zh: id, ja: id },
    summary: { en: id, zh: id, ja: id },
    ...(extras[id] || {}),
}]));

function files(rootPath, current = rootPath) {
    const result = [];
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const path = join(current, entry.name);
        if (entry.isDirectory()) result.push(...files(rootPath, path));
        else result.push(path.slice(rootPath.length + 1).replaceAll('\\', '/'));
    }
    return result;
}

function hashes(rootPath) {
    return Object.fromEntries(files(rootPath).map((path) => [
        path,
        createHash('sha256').update(readFileSync(resolve(rootPath, path))).digest('hex'),
    ]));
}

function syntheticCluster(size = 20) {
    const graphNodes = Array.from({ length: size }, (_, index) => ({
        id: `n${String(index).padStart(2, '0')}`,
        label: `Node ${index}`,
        description: `Description ${index}`,
        sections: { lead: `Lead ${index}` },
        type: 'concept',
        domain: ['MAT'],
        connections: [],
    }));
    const steps = graphNodes.slice(0, 6).map((node) => ({
        ref: node.id,
        hook: { en: `Hook ${node.id}`, zh: `鉤子 ${node.id}`, ja: `フック ${node.id}` },
        reveal: { en: 'Reveal', zh: '揭示', ja: '説明' },
        example: { en: 'Example', zh: '例子', ja: '例' },
        surprise: { en: 'Surprise', zh: '驚奇', ja: '驚き' },
        thread: { en: 'Thread', zh: '線索', ja: '糸' },
    }));
    const wonder = {
        id: 'fixture-cluster', title: { en: 'Fixture', zh: '測試', ja: 'テスト' },
        intro: { en: 'Intro', zh: '介紹', ja: '紹介' }, outward: { en: 'Out', zh: '外', ja: '外' },
        reflect: { en: ['Why?'], zh: ['為何？'], ja: ['なぜ？'] }, steps,
        cluster: { context_refs: graphNodes.slice(6).map((node) => node.id), featured_portals: ['n06'] },
        edges: steps.slice(1).map((step, index) => ({ source: steps[index].ref, target: step.ref, relation_type: 'logical' })),
    };
    const layout = {
        wonderId: wonder.id, layoutVersion: 'wonder-fixture-cluster-1.0.0',
        nodes: Object.fromEntries(graphNodes.map((node, index) => [node.id, {
            x: index * 10, y: index % 2 ? 20 : -20, role: index < 6 ? 'spine' : 'context',
        }])),
    };
    const topology = [];
    for (let a = 0; a < graphNodes.length; a += 1) for (let b = a + 1; b < graphNodes.length; b += 1) {
        topology.push({ source: graphNodes[a].id, target: graphNodes[b].id, active: true });
    }
    const labels = Object.fromEntries(['en', 'zh', 'ja'].map((locale) => [locale, Object.fromEntries(graphNodes.map((node) => [node.id, `${locale}-${node.id}`]))]));
    return {
        wonder, layout, topology,
        graphById: new Map(graphNodes.map((node) => [node.id, node])),
        graphIds: new Set(graphNodes.map((node) => node.id),),
        localeData: { labels, descriptions: { zh: {}, ja: {} }, sections: { zh: {}, ja: {} } },
    };
}

test('real artifact map contains exactly 19 Wonder quartets plus three indices', () => {
    const inputs = loadArtifactInputs();
    const result = buildArtifactMap(inputs);
    assert.equal(inputs.wonders.length, 19);
    assert.equal(result.artifacts.size, 79);
    assert.deepEqual([...result.artifacts.keys()].sort(), expectedArtifactPaths(inputs.wonders));
    assert.equal(result.artifacts.has('index.json'), false);
    const edgeAi = result.artifacts.get('wonders/edge-ai.core.json');
    assert.deepEqual(edgeAi.nodes.find((node) => node.id === 'edge_model_compression').roles, ['local', 'spine']);
});

test('Wonder bundle supports a 20-node cluster and warns without truncating 190 graph edges', () => {
    const input = syntheticCluster();
    const first = buildWonderArtifacts({ ...input, portalNodeIds: new Set(['n06']) });
    const second = buildWonderArtifacts({ ...input, portalNodeIds: new Set(['n06']) });
    assert.equal(first.core.nodes.length, 20);
    assert.equal(first.core.graphEdges.length, 190);
    assert.equal(first.warnings.length, 1);
    assert.equal(stableJson(first), stableJson(second));
    assert.deepEqual(validateWonderCore(first.core, input.graphIds), []);
    for (const locale of ['en', 'zh', 'ja']) assert.deepEqual(validateWonderLocale(first.locales[locale], first.core), []);
});

test('label-only local Wonder members fail with an explicit type/domain contract error', () => {
    const input = syntheticCluster(12);
    const original = input.wonder.steps[2];
    input.wonder.steps[2] = {
        local: { id: 'local-label-only', label: { en: 'Local', zh: '在地', ja: 'ローカル' } },
        hook: original.hook,
        reveal: original.reveal,
        example: original.example,
        surprise: original.surprise,
        thread: original.thread,
    };
    delete input.layout.nodes.n02;
    input.layout.nodes['local-label-only'] = { x: 20, y: -20, role: 'spine' };
    assert.throws(
        () => buildWonderArtifacts(input),
        /local member local-label-only must declare a valid type and non-empty domain/,
    );
});

test('Wonder induced graph excludes pending-only pairs through the canonical topology projection', () => {
    const raw = { nodes: [
        { id: 'a', label: 'A', type: 'concept', domain: ['MAT'], connections: [{ target: 'b', relation_type: 'logical', relation: 'pending', pending: true }] },
        { id: 'b', label: 'B', type: 'concept', domain: ['MAT'], connections: [] },
    ] };
    const graph = validateGraph(raw, 'fixture.json');
    const wonder = {
        id: 'pending', title: { en: 'P', zh: 'P', ja: 'P' }, intro: { en: 'I', zh: 'I', ja: 'I' },
        outward: { en: 'O', zh: 'O', ja: 'O' }, reflect: { en: [], zh: [], ja: [] },
        steps: ['a', 'b'].map((id) => ({ ref: id, hook: { en: '', zh: '', ja: '' }, reveal: { en: '', zh: '', ja: '' }, example: { en: '', zh: '', ja: '' }, surprise: { en: '', zh: '', ja: '' }, thread: { en: '', zh: '', ja: '' } })),
        edges: [{ source: 'a', target: 'b', relation_type: 'logical' }],
    };
    const result = buildWonderArtifacts({
        wonder, layout: { wonderId: 'pending', layoutVersion: 'wonder-pending-1.0.0', nodes: { a: { x: 0, y: 0, role: 'spine' }, b: { x: 1, y: 1, role: 'spine' } } },
        graphById: new Map(raw.nodes.map((node) => [node.id, node])), topology: graph.topology,
        localeData: { labels: { en: {}, zh: {}, ja: {} }, descriptions: { zh: {}, ja: {} }, sections: { zh: {}, ja: {} } },
    });
    assert.deepEqual(graph.topology, []);
    assert.deepEqual(result.core.graphEdges, []);
});

test('Depth and Portal indices publish only shared-predicate entries and keep Main first', () => {
    const qa = { csp_safe: true, reference_notes: true, formula_walkthrough: true, mobile_canvas_check: true };
    const live = { id: 'live', node_id: 'a', depth_path: 'depth/live.html', focus: 'focus', public: true, status: 'live', review_status: 'published', qa };
    const draft = { ...live, id: 'draft', depth_path: 'depth/draft.html', review_status: 'in_review' };
    const depth = buildDepthIndex([draft, live]);
    assert.deepEqual(Object.keys(depth.nodes), ['a']);
    assert.deepEqual(depth.nodes.a.map((entry) => entry.id), ['live']);
    const portals = buildPortalIndex({ graphIds: new Set(['a']), wonders: [{ id: 'w', steps: [{ ref: 'a' }] }], depthEntries: [draft, live] });
    assert.deepEqual(portals.nodes.a.destinations.map((entry) => entry.view), ['main', 'wonder', 'depth']);
    assert.equal(portals.nodes.a.destinations.some((entry) => entry.id === 'draft'), false);
});

test('Constellation wrapper preserves all legacy v1 semantics exactly', () => {
    const inputs = loadArtifactInputs();
    const constellation = buildArtifactMap(inputs).artifacts.get('constellation-index.json');
    const parent = mkdtempSync(join(tmpdir(), 'neblux-tour-v1-'));
    try {
        const output = resolve(parent, 'tour-index.json');
        buildTourIndex(resolve(root, 'data'), [output]);
        const legacy = JSON.parse(readFileSync(output, 'utf8'));
        assert.deepEqual(constellation.tours, legacy.tours);
        assert.deepEqual(constellation.nodes, legacy.nodes);
        assert.deepEqual(constellation.related, legacy.related);
    } finally { rmSync(parent, { recursive: true, force: true }); }
});

test('Atlas fixture validates and index publishes only approved roads', () => {
    const config = fixture('atlas-layout.json');
    assert.deepEqual(validateConfig('atlas-layout', config, 'atlas-layout.json'), []);
    const summaries = atlasSummaries(config, { light: { ignored: 'not-public.json' } });
    const index = buildAtlasIndex(config, summaries);
    assert.equal(index.roads.length, 1);
    assert.equal(index.roads[0].id, 'light-quantum');
    assert.equal(index.wonders.light.ignored, undefined);
    assert.deepEqual(validateAtlasIndex(index, new Set(['light', 'quantum', 'edge-ai']), 'fixture', {
        graphIds: new Set(['wave_particle_duality_concept']),
    }), []);
});

test('Atlas presentation contract rejects incomplete copy, off-map roads and duplicate road ids', () => {
    const config = fixture('atlas-layout.json');
    const missingCopy = structuredClone(config);
    delete missingCopy.mainGalaxy.title;
    assert.match(validateConfig('atlas-layout', missingCopy, 'missing-copy.json').map((value) => value.message).join('\n'), /required property is missing/);

    const badConfig = structuredClone(config);
    badConfig.roads.push({ ...badConfig.roads[0], from: 'wonder:markets' });
    const configMessages = validateConfig('atlas-layout', badConfig, 'bad-roads.json').map((value) => value.message).join('\n');
    assert.match(configMessages, /not published/);
    assert.match(configMessages, /duplicate road id/);

    const index = buildAtlasIndex(config, atlasSummaries(config));
    index.roads.push({ ...index.roads[0], from: 'wonder:markets' });
    index.nodes = [{ id: 'must-not-leak' }];
    index.wonders.light.description = 'must not leak';
    delete index.mainGalaxy.summary.zh;
    const indexMessages = validateAtlasIndex(index, new Set([...Object.keys(config.wonders), 'markets']), 'bad-index.json', {
        graphIds: new Set(['wave_particle_duality_concept']),
    }).map((value) => value.message).join('\n');
    assert.match(indexMessages, /non-empty string/);
    assert.match(indexMessages, /not published in this Atlas index/);
    assert.match(indexMessages, /duplicate road id/);
    assert.match(indexMessages, /unknown Atlas presentation field/);

    const malformed = structuredClone(index);
    malformed.roads = {};
    assert.doesNotThrow(() => validateAtlasIndex(malformed, new Set(Object.keys(config.wonders)), 'malformed.json'));
    assert.match(validateAtlasIndex(malformed, new Set(Object.keys(config.wonders)), 'malformed.json').map((value) => value.message).join('\n'), /must contain/);
});

test('build-data is deterministic, removes stale files and audits the exact artifact set', () => {
    const parent = mkdtempSync(join(tmpdir(), 'neblux-wp3-'));
    const first = resolve(parent, 'first');
    const second = resolve(parent, 'second');
    try {
        buildData(first);
        writeFileSync(resolve(first, 'stale.json'), '{}', 'utf8');
        buildData(first);
        buildData(second);
        assert.deepEqual(hashes(first), hashes(second));
        const audit = auditGeneratedData(first);
        assert.equal(audit.fileCount, 79);
        assert.deepEqual(audit.issues, []);
        assert.equal(existsSync(resolve(first, 'stale.json')), false);
    } finally { rmSync(parent, { recursive: true, force: true }); }
});

test('optional Atlas index is audited and survives atomic data rebuilds', () => {
    const parent = mkdtempSync(join(tmpdir(), 'neblux-wp3-index-'));
    const target = resolve(parent, 'atlas');
    try {
        buildData(target);
        const indexPath = resolve(target, 'index.json');
        const config = fixture('atlas-layout.json');
        const indexText = stableJson(buildAtlasIndex(config, atlasSummaries(config)));
        writeFileSync(indexPath, indexText, 'utf8');
        writeFileSync(resolve(target, 'stale.json'), '{}', 'utf8');

        const before = auditGeneratedData(target);
        assert.equal(before.fileCount, 81);
        assert.equal(before.issues.some((value) => value.file.endsWith('index.json')), false);
        assert.match(before.issues.map((value) => value.message).join('\n'), /unexpected or stale artifact/);

        const rebuilt = buildData(target);
        assert.equal(rebuilt.fileCount, 80);
        assert.equal(readFileSync(indexPath, 'utf8'), indexText);
        assert.equal(existsSync(resolve(target, 'stale.json')), false);
        assert.deepEqual(auditGeneratedData(target).issues, []);
    } finally { rmSync(parent, { recursive: true, force: true }); }
});

test('failed staged generation leaves the previous valid target untouched', () => {
    const parent = mkdtempSync(join(tmpdir(), 'neblux-wp3-fail-'));
    const target = resolve(parent, 'atlas');
    try {
        buildData(target);
        const before = hashes(target);
        const inputs = loadArtifactInputs();
        inputs.layouts = new Map(inputs.layouts);
        inputs.layouts.delete('light');
        assert.throws(() => buildData(target, inputs));
        assert.deepEqual(hashes(target), before);
    } finally { rmSync(parent, { recursive: true, force: true }); }
});

test('a lock on the existing target preserves it and reports an actionable recovery', () => {
    const parent = mkdtempSync(join(tmpdir(), 'neblux-wp3-target-lock-'));
    const target = resolve(parent, 'atlas');
    const staging = resolve(parent, 'staging');
    try {
        mkdirSync(target);
        mkdirSync(staging);
        writeFileSync(resolve(target, 'old.json'), '{"version":"old"}', 'utf8');
        writeFileSync(resolve(staging, 'new.json'), '{"version":"new"}', 'utf8');
        const locked = Object.assign(new Error('directory is locked'), { code: 'EPERM' });

        assert.throws(
            () => replaceDirectory(staging, target, { rename: () => { throw locked; } }),
            /Stop the Vite dev server/,
        );
        assert.equal(readFileSync(resolve(target, 'old.json'), 'utf8'), '{"version":"old"}');
        assert.equal(existsSync(resolve(target, 'new.json')), false);
        assert.equal(existsSync(staging), false);
    } finally { rmSync(parent, { recursive: true, force: true }); }
});

test('a lock while installing staging restores the previous target', () => {
    const parent = mkdtempSync(join(tmpdir(), 'neblux-wp3-install-lock-'));
    const target = resolve(parent, 'atlas');
    const staging = resolve(parent, 'staging');
    let renameCount = 0;
    try {
        mkdirSync(target);
        mkdirSync(staging);
        writeFileSync(resolve(target, 'old.json'), '{"version":"old"}', 'utf8');
        writeFileSync(resolve(staging, 'new.json'), '{"version":"new"}', 'utf8');
        const locked = Object.assign(new Error('directory is locked'), { code: 'EBUSY' });

        assert.throws(
            () => replaceDirectory(staging, target, {
                rename: (source, destination) => {
                    renameCount += 1;
                    if (renameCount === 2) throw locked;
                    renameSync(source, destination);
                },
            }),
            /Stop the Vite dev server/,
        );
        assert.equal(readFileSync(resolve(target, 'old.json'), 'utf8'), '{"version":"old"}');
        assert.equal(existsSync(resolve(target, 'new.json')), false);
        assert.equal(existsSync(staging), false);
    } finally { rmSync(parent, { recursive: true, force: true }); }
});

test('artifact schema is draft 2020-12 and forbids generated timestamps by contract', () => {
    const schema = fixture('../../../config/atlas/artifact.schema.json');
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
    assert.equal(schema.$defs.envelope.properties.schemaVersion.const, '1.0.0');
    assert.match(schema.$comment, /Build-time enforcement/);
    assert.deepEqual(schema['x-neblux-enforced-by'], [
        'scripts/atlas/audit-data.mjs',
        'scripts/atlas/artifact-contract.mjs',
    ]);
    const parent = mkdtempSync(join(tmpdir(), 'neblux-wp3-meta-'));
    try {
        buildData(parent);
        const path = resolve(parent, 'depth-index.json');
        const depth = JSON.parse(readFileSync(path, 'utf8'));
        depth.generatedAt = 'now';
        writeFileSync(path, JSON.stringify(depth), 'utf8');
        assert.match(auditGeneratedData(parent).issues.map((value) => value.message).join('\n'), /non-deterministic metadata/);
    } finally { rmSync(parent, { recursive: true, force: true }); }
});

test('real Atlas index CLI derives pilot summaries and publishes only approved roads', () => {
    const output = resolve(root, 'frontend/public/data/atlas/index.json');
    rmSync(output, { force: true });
    try {
        const result = spawnSync(process.execPath, ['scripts/atlas/build-index.mjs'], { cwd: root, encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr);
        const index = JSON.parse(readFileSync(output, 'utf8'));
        assert.deepEqual(Object.keys(index.wonders).sort(), ['edge-ai', 'light', 'quantum']);
        assert.equal(index.wonders.light.title.en, 'Light');
        assert.equal(index.wonders.light.summary.en.startsWith('The thing you see'), true);
        assert.deepEqual(index.roads.map((road) => road.id), ['light-quantum']);
    } finally { rmSync(output, { force: true }); }
});
