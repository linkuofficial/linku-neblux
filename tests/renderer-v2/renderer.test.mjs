import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeterministicLabScene } from '../../frontend/src/engine-v2/lab-scene.js';
import { createRendererV2 } from '../../frontend/src/engine-v2/index.js';
import { resolvePresentationAccent } from '../../frontend/src/engine-v2/renderer.js';
import { normalizeScene, stableSceneHash } from '../../frontend/src/engine-v2/contract.js';
import { mergeTokens } from '../../frontend/src/engine-v2/tokens.js';
import { readFileSync } from 'node:fs';

function fakeContext() {
    return new Proxy({ globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', setLineDash() {}, createRadialGradient() { return { addColorStop() {} }; } }, {
        get(target, key) {
            if (key in target) return target[key];
            if (key === 'measureText') return (text) => ({ width: String(text).length * 6 });
            return () => {};
        },
    });
}

function fakeCanvas() { return { width: 400, height: 300, clientWidth: 400, clientHeight: 300, getContext: () => fakeContext() }; }

test('renderer accepts the stress scene, paints synchronously and exposes structural stats', () => {
    const renderer = createRendererV2({ canvas: fakeCanvas(), reducedMotion: true, schedulerOptions: { raf: (callback) => { callback(); return 1; }, caf: () => {} } });
    renderer.setViewport({ width: 400, height: 300, dpr: 2 });
    renderer.setScene(createDeterministicLabScene(7));
    renderer.renderNow();
    const stats = renderer.getDebugStats();
    assert.equal(stats.sceneHash.length, 8);
    assert.ok(stats.redrawCount >= 1);
    assert.ok(stats.drawnNodes <= stats.nodeCandidates);
    assert.equal(stats.unknownArchetypes, 0);
    assert.equal(stats.unknownOverlays, 0);
    const secondPaint = renderer.getDebugStats();
    renderer.renderNow();
    const thirdPaint = renderer.getDebugStats();
    assert.equal(secondPaint.spriteCacheSize, thirdPaint.spriteCacheSize);
    assert.equal(secondPaint.atmosphereCacheSize, thirdPaint.atmosphereCacheSize);
    assert.doesNotMatch(readFileSync(new URL('../../frontend/src/engine-v2/renderer.js', import.meta.url), 'utf8'), /shadowBlur/);
    renderer.destroy();
    assert.equal(renderer.getDebugStats().schedulerState, 'destroyed');
});

test('visual tokens do not alter the locked scene hash and quadtree hit test uses the effective target', () => {
    const scene = {
        schemaVersion: '1.0.0', layoutVersion: 'test-1.0.0', rendererContractVersion: '2.0.0-alpha.1',
        nodes: [{ id: 'a', x: 0, y: 0, label: 'A', domains: ['MAT'], archetype: 'concept_star', visualMagnitude: 'standard', labelPriority: 'critical', overlays: [] }, { id: 'b', x: 1000, y: 1000, label: 'B', domains: ['PHY'], archetype: 'concept_star', visualMagnitude: 'faint', labelPriority: 'low', overlays: [] }], edges: [],
    };
    const normalized = normalizeScene(scene);
    assert.equal(stableSceneHash(normalized), stableSceneHash(normalizeScene(scene)));
    assert.equal(stableSceneHash(normalized), stableSceneHash(normalizeScene(scene)));
    assert.notEqual(mergeTokens({ colors: { MAT: '#ffffff' } }).colors.MAT, mergeTokens().colors.MAT);
    const renderer = createRendererV2({ canvas: fakeCanvas(), reducedMotion: true, schedulerOptions: { raf: (callback) => { callback(); return 1; }, caf: () => {} } });
    renderer.setViewport({ width: 400, height: 300, dpr: 1 }); renderer.setScene(scene); renderer.renderNow();
    assert.equal(renderer.hitTest({ x: 200, y: 150, pointerType: 'touch' }).id, 'a');
    renderer.destroy();
});

test('presentation-only bundles and guided segments are accepted without changing the scene contract', () => {
    const renderer = createRendererV2({ canvas: fakeCanvas(), reducedMotion: true, schedulerOptions: { raf: (callback) => { callback(); return 1; }, caf: () => {} } });
    renderer.setViewport({ width: 400, height: 300, dpr: 1 });
    renderer.setScene(createDeterministicLabScene(7));
    renderer.setCamera({ zoom: 0.7 });
    renderer.setPresentation({
        bundles: [{ source: 'node-000', target: 'node-001', count: 4, route: { cx: 120, cy: -80 } }],
        guidedSegments: [{ source: 'node-001', target: 'node-002' }],
    });
    renderer.renderNow();
    const stats = renderer.getDebugStats();
    assert.equal(stats.sceneHash.length, 8);
    assert.ok(stats.bundlesDrawn <= 1);
    assert.ok(stats.guidedSegmentsDrawn <= 1);
    renderer.destroy();
});

test('Wonder presentation resolves domain-code accents without accepting invalid Canvas identifiers', () => {
    assert.equal(resolvePresentationAccent('PHY'), '#c97a5b');
    assert.equal(resolvePresentationAccent('phy'), '#c97a5b');
    assert.equal(resolvePresentationAccent('#123456'), '#123456');
    assert.equal(resolvePresentationAccent('not-a-colour'), mergeTokens().guided);
    assert.equal(resolvePresentationAccent(null), mergeTokens().guided);
});
