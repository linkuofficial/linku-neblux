import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeterministicLabScene } from '../../frontend/src/engine-v2/lab-scene.js';
import { countUnknownTokens, normalizeScene, stableSceneHash } from '../../frontend/src/engine-v2/contract.js';

test('deterministic lab scene has the fixed stress shape and stable hash', () => {
    const first = createDeterministicLabScene(42);
    const second = createDeterministicLabScene(42);
    assert.equal(first.nodes.length, 1000);
    assert.equal(first.edges.length, 7000);
    assert.deepEqual(first, second);
    assert.equal(stableSceneHash(normalizeScene(first)), stableSceneHash(normalizeScene(second)));
    assert.deepEqual(new Set(first.nodes.map((node) => node.archetype)), new Set([
        'galactic_nucleus', 'domain_core', 'subfield_giant', 'concept_star', 'bridge_star', 'beacon_star', 'event_remnant', 'local_protostar',
    ]));
    assert.deepEqual(new Set(first.nodes.flatMap((node) => node.overlays)), new Set(['selected', 'related', 'guided_spine', 'depth_lens', 'portal_ring', 'multi_portal', 'filtered', 'dimmed']));
});

test('normalization copies input and safely falls back unknown visual tokens', () => {
    const input = {
        schemaVersion: '1.0.0', layoutVersion: 'test-1.0.0', rendererContractVersion: '2.0.0-alpha.1',
        nodes: [{ id: 'a', x: 1, y: 2, archetype: 'future-archetype', overlays: ['future-overlay'] }, { id: 'b', x: 3, y: 4 }],
        edges: [{ id: 'e', source: 'a', target: 'b', route: { type: 'not-yet-known' } }],
    };
    const before = structuredClone(input);
    const normalized = normalizeScene(input);
    assert.deepEqual(input, before);
    assert.equal(normalized.nodes[0].archetype, 'concept_star');
    assert.deepEqual(countUnknownTokens(input), { unknownArchetypes: 1, unknownOverlays: 1 });
    assert.equal(normalized.edges[0].route, undefined);
});

test('invalid ids, coordinates and endpoints fail fast', () => {
    const base = { schemaVersion: '1.0.0', layoutVersion: 'test-1.0.0', rendererContractVersion: '2.0.0-alpha.1', nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 1, y: 1 }], edges: [{ id: 'e', source: 'a', target: 'b' }] };
    for (const mutate of [
        (scene) => { scene.nodes[1].id = 'a'; },
        (scene) => { scene.nodes[0].x = Infinity; },
        (scene) => { scene.edges[0].target = 'missing'; },
        (scene) => { scene.edges[0].id = ''; },
        (scene) => { scene.edges[0].source = 'a'; scene.edges[0].target = 'a'; },
    ]) {
        const scene = structuredClone(base); mutate(scene);
        assert.throws(() => normalizeScene(scene), /Invalid renderer v2 scene/);
    }
});
