import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { RENDERER_CONTRACT_VERSION, SCENE_SCHEMA_VERSION } from '../../frontend/src/engine-v2/index.js';
import { buildAtlasScene } from '../../frontend/src/atlas/atlas-scene-adapter.js';

const fixture = {
    schemaVersion: '1.0.0',
    layoutVersion: 'test',
    mainGalaxy: { id: 'main', x: 0, y: 0, route: '/app.html', title: { en: 'Main Galaxy' }, scale: 'large' },
    wonders: [
        { id: 'light', x: 200, y: -100, route: '/wonders.html?w=light', title: { en: 'Light' }, scale: 'medium', domains: ['PHY'] },
    ],
    roads: [{ id: 'main-light', from: 'main', to: 'wonder:light', strength: 'strong' }],
};

test('Atlas maps its presentation index to the public engine-v2 contract', () => {
    const { scene, routes } = buildAtlasScene(fixture, 'en');
    assert.equal(scene.schemaVersion, SCENE_SCHEMA_VERSION);
    assert.equal(scene.rendererContractVersion, RENDERER_CONTRACT_VERSION);
    assert.deepEqual(scene.nodes.map(({ id, archetype, visualMagnitude }) => ({ id, archetype, visualMagnitude })), [
        { id: 'main', archetype: 'galactic_nucleus', visualMagnitude: 'nucleus' },
        { id: 'light', archetype: 'subfield_giant', visualMagnitude: 'bright' },
    ]);
    assert.deepEqual(scene.edges[0], {
        id: 'atlas-road:main-light', source: 'main', target: 'light', priority: 10,
        lodClass: 'bridge', directed: false, styleToken: 'guided', overlays: [],
    });
    assert.equal(routes.get('light'), '/wonders.html?w=light');
});

test('Atlas refuses routes outside its public Main and Wonders allowlist', () => {
    const unsafe = structuredClone(fixture);
    unsafe.wonders[0].route = 'https://example.com/';
    assert.throws(() => buildAtlasScene(unsafe), /Invalid Atlas route/);
});

test('Atlas page adapter contains no parallel Canvas drawing implementation', async () => {
    const source = await readFile(new URL('../../frontend/src/atlas/atlas-engine-adapter.js', import.meta.url), 'utf8');
    assert.match(source, /createRendererV2/);
    assert.doesNotMatch(source, /createRadialGradient|fillRect|arc\(|fillText|drawImage/);
    assert.doesNotMatch(source, /#[0-9a-f]{3,8}/i);
});

test('Atlas preserves engine-v2 across BFCache and destroys it on real unload', async () => {
    const source = await readFile(new URL('../../frontend/src/atlas/atlas-main.js', import.meta.url), 'utf8');
    assert.match(source, /pagehide[\s\S]*if \(!event\.persisted\) renderer\.destroy\(\)/);
    assert.doesNotMatch(source, /pagehide[\s\S]*\{ once: true \}/);
});
