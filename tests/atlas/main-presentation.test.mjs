import assert from 'node:assert/strict';
import test from 'node:test';

import { buildMainPresentation, buildMainPresentationFromRepo } from '../../scripts/atlas/main-presentation.mjs';

function scene(nodes, edges) {
    return {
        schemaVersion: '1.0.0',
        layoutVersion: 'main-2.0.0',
        rendererContractVersion: '2.0.0-alpha.1',
        nodes,
        edges,
    };
}

function atlas(roads = []) {
    return {
        schemaVersion: '1.0.0',
        layoutVersion: 'atlas-prototype-1.0.0',
        coordinateSystem: { width: 1000, height: 800, origin: 'center' },
        mainGalaxy: { route: '/app.html' },
        wonders: {},
        roads,
    };
}

test('builds deterministic cross-domain bundles without promoting Atlas roads to Main edges', () => {
    const input = {
        scene: scene([
            { id: 'mat', x: -100, y: 0, label: 'MAT', domains: ['MAT'], archetype: 'domain_core', visualMagnitude: 'bright', labelPriority: 'high', overlays: [] },
            { id: 'phy', x: 100, y: 0, label: 'PHY', domains: ['PHY'], archetype: 'domain_core', visualMagnitude: 'bright', labelPriority: 'high', overlays: [] },
            { id: 'bridge', x: 0, y: 100, label: 'Bridge', domains: ['MAT', 'PHY'], archetype: 'bridge_star', visualMagnitude: 'standard', labelPriority: 'standard', overlays: [] },
        ], [
            { id: 'edge-a', source: 'mat', target: 'phy' },
            { id: 'edge-b', source: 'bridge', target: 'phy' },
        ]),
        anchors: {
            schemaVersion: '1.0.0',
            layoutVersion: 'main-2.0.0',
            anchors: {
                MAT: { nodeId: 'mat', x: -100, y: 0 },
                PHY: { nodeId: 'phy', x: 100, y: 0 },
            },
        },
        atlas: atlas([
            { id: 'approved-road', from: 'wonder:a', to: 'wonder:b', via: 'bridge', strengthClass: 'strong', approved: true },
            { id: 'draft-road', from: 'wonder:a', to: 'wonder:b', via: 'bridge', strengthClass: 'weak', approved: false },
        ]),
    };
    const first = buildMainPresentation(input);
    const second = buildMainPresentation(structuredClone(input));
    assert.deepEqual(first, second);
    assert.equal(first.schemaVersion, '1.0.0');
    assert.equal(first.presentationVersion, 'main-presentation-1.0.0');
    assert.equal('scene' in first, false);
    assert.equal(first.metadata.canonicalNodeCount, 3);
    assert.equal(first.metadata.canonicalEdgeCount, 2);
    assert.equal(first.bundles.length, 1);
    assert.equal(first.bundles[0].source, 'mat');
    assert.equal(first.bundles[0].target, 'phy');
    assert.equal(first.bundles[0].count, 2);
    assert.equal(first.bundles[0].route.type, 'quadratic');
    assert.deepEqual(first.atlas.roads.map((road) => road.id), ['approved-road']);
    assert.equal(first.bundles.some((bundle) => bundle.id === 'approved-road'), false);
    assert.equal(first.metadata.activeCanonicalEdgeCount, 2);
    assert.equal(first.metadata.crossDomainCanonicalEdgeCount, 2);
});

test('uses scene anchor coordinates when compact fixtures omit duplicate coordinates', () => {
    const result = buildMainPresentation({
        scene: scene([
            { id: 'a', x: 0, y: 0, domains: ['MAT'], archetype: 'domain_core', visualMagnitude: 'bright', labelPriority: 'high', overlays: [] },
            { id: 'b', x: 100, y: 0, domains: ['PHY'], archetype: 'domain_core', visualMagnitude: 'bright', labelPriority: 'high', overlays: [] },
        ], [{ id: 'ab', source: 'a', target: 'b' }]),
        anchors: { anchors: { MAT: { nodeId: 'a' }, PHY: { nodeId: 'b' } } },
        atlas: atlas(),
    });
    assert.deepEqual(result.domainAnchors, { MAT: { nodeId: 'a', x: 0, y: 0 }, PHY: { nodeId: 'b', x: 100, y: 0 } });
    assert.equal(result.bundles[0].count, 1);
});

test('repo builder publishes the canonical scene and stable Main presentation counts', () => {
    const first = buildMainPresentationFromRepo();
    const second = buildMainPresentationFromRepo();
    assert.deepEqual(first, second);
    assert.equal(first.metadata.canonicalNodeCount, 687);
    assert.equal(first.metadata.canonicalEdgeCount, 3138);
    assert.equal(first.metadata.activeCanonicalEdgeCount, 3138);
    assert.ok(first.bundles.length > 0);
    assert.ok(first.bundles.every((bundle) => bundle.route.type === 'quadratic' && bundle.count > 0));
    assert.deepEqual(first.atlas.roads.map((road) => road.id), ['light-quantum']);
    assert.equal(first.bundles.some((bundle) => bundle.id === 'light-quantum'), false);
});
