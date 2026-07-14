import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCanonicalSceneFromRepo, mapClassification } from '../../scripts/atlas/canonical-scene.mjs';

test('canonical scene deterministically joins the 687-node graph, layout and celestial lock', () => {
    const first = buildCanonicalSceneFromRepo();
    const second = buildCanonicalSceneFromRepo();
    assert.equal(first.scene.nodes.length, 687);
    assert.equal(first.scene.edges.length, 3138);
    assert.deepEqual(first.scene, second.scene);
    assert.deepEqual(first.metadata, second.metadata);
    assert.equal(first.metadata.sceneHash, '09fb8f3c');
    assert.equal(new Set(first.scene.nodes.map((node) => node.archetype)).has('concept_star'), true);
    assert.equal(first.scene.nodes.filter((node) => node.archetype === 'galactic_nucleus').length, 2);
    assert.equal(first.scene.nodes.some((node) => node.archetype === 'future'), false);
});

test('celestial adapter maps lock enums explicitly and rejects unsupported values', () => {
    assert.deepEqual(mapClassification({ archetype: 'galactic_nucleus', visualMagnitudeClass: 'landmark', labelPriorityClass: 'critical' }), {
        archetype: 'galactic_nucleus', visualMagnitude: 'nucleus', labelPriority: 'critical',
    });
    assert.throws(() => mapClassification({ archetype: 'concept_star', visualMagnitudeClass: 'unknown', labelPriorityClass: 'standard' }), /unsupported celestial magnitude mapping/);
});
