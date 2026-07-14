import { buildCanonicalSceneFromRepo, readCanonicalLock } from './canonical-scene.mjs';

const lock = readCanonicalLock();
const entries = Object.values(lock.nodes);
const count = (key) => Object.fromEntries([...new Set(entries.map((entry) => entry[key]))].sort().map((value) => [value, entries.filter((entry) => entry[key] === value).length]));
const scene = buildCanonicalSceneFromRepo();

process.stdout.write(`${JSON.stringify({
    nodes: entries.length,
    archetypes: count('archetype'),
    magnitudes: count('visualMagnitudeClass'),
    layoutMasses: count('layoutMassClass'),
    labelPriorities: count('labelPriorityClass'),
    metadata: scene.metadata,
}, null, 2)}\n`);
