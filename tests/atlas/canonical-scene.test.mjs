import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCanonicalSceneFromRepo, mapClassification, readCanonicalLock } from '../../scripts/atlas/canonical-scene.mjs';

test('canonical scene deterministically joins the 687-node graph, layout and celestial lock', () => {
    const first = buildCanonicalSceneFromRepo();
    const second = buildCanonicalSceneFromRepo();
    assert.equal(first.scene.nodes.length, 687);
    assert.equal(first.scene.edges.length, 3138);
    assert.deepEqual(first.scene, second.scene);
    assert.deepEqual(first.metadata, second.metadata);
    assert.match(first.metadata.sceneHash, /^[a-f0-9]{8}$/);
    assert.match(first.metadata.sceneLayoutHash, /^sha256:[a-f0-9]{64}$/);
    assert.equal(new Set(first.scene.nodes.map((node) => node.archetype)).has('concept_star'), true);
    assert.equal(first.scene.nodes.filter((node) => node.archetype === 'galactic_nucleus').length, 2);
    assert.equal(first.scene.nodes.some((node) => node.archetype === 'future'), false);
    assert.deepEqual(new Set(first.scene.nodes.map((node) => node.visualMagnitude)), new Set(['nucleus', 'major', 'bright', 'standard', 'faint']));
    assert.equal(first.scene.nodes.filter((node) => node.visualMagnitude === 'major').length, 10);
    assert.equal(first.scene.nodes.filter((node) => node.visualMagnitude === 'faint').length, 30);
    assert.equal(first.scene.edges.every((edge) => edge.priority > 0), true);
    assert.equal(new Set(first.scene.edges.map((edge) => edge.priority)).size > 10, true);
    assert.equal(first.scene.edges.every((edge) => edge.route?.type === 'quadratic'), true);

    const restyledLock = structuredClone(readCanonicalLock());
    const restyledEntry = Object.values(restyledLock.nodes).find((entry) => entry.archetype === 'concept_star');
    restyledEntry.visualMagnitudeClass = restyledEntry.visualMagnitudeClass === 'faint' ? 'standard' : 'faint';
    const restyled = buildCanonicalSceneFromRepo(restyledLock);
    assert.equal(restyled.metadata.sceneLayoutHash, first.metadata.sceneLayoutHash);
    assert.notEqual(restyled.metadata.sceneHash, first.metadata.sceneHash);
});

test('celestial lock retains sparse bridge semantics and source fingerprints', () => {
    const lock = readCanonicalLock();
    const entries = Object.values(lock.nodes);
    assert.equal(entries.length, 687);
    assert.equal(entries.filter((entry) => entry.archetype === 'bridge_star').length, 81);
    assert.equal(entries.filter((entry) => entry.layoutMassClass === 'bridge').length, 81);
    assert.equal(entries.filter((entry) => entry.archetype === 'local_protostar').length, 0);
    for (const key of ['nodeSetFingerprint', 'classificationInputsFingerprint', 'anchorConfigFingerprint']) assert.match(lock[key], /^sha256:[a-f0-9]{64}$/);
});

test('canonical scene fails before normalization on stale inputs or incompatible adapter majors', () => {
    const stale = structuredClone(readCanonicalLock());
    stale.classificationInputsFingerprint = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';
    assert.throws(() => buildCanonicalSceneFromRepo(stale), /classification inputs fingerprint is stale/);
    const incompatible = structuredClone(readCanonicalLock());
    incompatible.adapterVersion = '2.0.0';
    assert.throws(() => buildCanonicalSceneFromRepo(incompatible), /unsupported celestial adapter major version/);
});

test('celestial adapter maps lock enums explicitly and rejects unsupported values', () => {
    assert.deepEqual(mapClassification({ archetype: 'galactic_nucleus', visualMagnitudeClass: 'landmark', labelPriorityClass: 'critical' }), {
        archetype: 'galactic_nucleus', visualMagnitude: 'nucleus', labelPriority: 'critical',
    });
    assert.equal(mapClassification({ archetype: 'domain_core', visualMagnitudeClass: 'bright', labelPriorityClass: 'high' }).visualMagnitude, 'major');
    assert.equal(mapClassification({ archetype: 'event_remnant', visualMagnitudeClass: 'standard', labelPriorityClass: 'standard' }).visualMagnitude, 'faint');
    assert.throws(() => mapClassification({ archetype: 'concept_star', visualMagnitudeClass: 'unknown', labelPriorityClass: 'standard' }), /unsupported celestial magnitude mapping/);
});
