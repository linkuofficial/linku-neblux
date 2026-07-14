import { RENDERER_CONTRACT_VERSION, SCENE_SCHEMA_VERSION } from './contract.js';

const ARCHETYPES = ['galactic_nucleus', 'domain_core', 'subfield_giant', 'concept_star', 'bridge_star', 'beacon_star', 'event_remnant', 'local_protostar'];
const MAGNITUDES = ['nucleus', 'major', 'bright', 'standard', 'faint'];
const PRIORITIES = ['low', 'standard', 'high', 'critical'];
const OVERLAYS = ['selected', 'related', 'guided_spine', 'depth_lens', 'portal_ring', 'multi_portal', 'filtered', 'dimmed'];

function hash(seed, index) {
    let value = 2166136261 ^ seed;
    value = Math.imul(value ^ index, 16777619);
    value ^= value >>> 13;
    value = Math.imul(value, 1274126177);
    return (value >>> 0) / 4294967296;
}

export function createDeterministicLabScene(seed = 20260714) {
    const nodes = [];
    const columns = 40;
    for (let index = 0; index < 1000; index += 1) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const jitterX = (hash(seed, index * 3) - 0.5) * 120;
        const jitterY = (hash(seed, index * 3 + 1) - 0.5) * 120;
        const archetype = ARCHETYPES[index % ARCHETYPES.length];
        const mask = index % 256;
        nodes.push({
            id: `lab-${String(index).padStart(4, '0')}`,
            x: (column - 19.5) * 300 + jitterX,
            y: (row - 12) * 300 + jitterY,
            label: `Lab node ${index}`,
            domains: [['MAT', 'PHY', 'TEC', 'ENG'][index % 4]],
            archetype,
            visualMagnitude: MAGNITUDES[index % MAGNITUDES.length],
            labelPriority: PRIORITIES[index % PRIORITIES.length],
            overlays: OVERLAYS.filter((_, overlayIndex) => (mask & (1 << overlayIndex)) !== 0),
        });
    }

    const edges = [];
    for (let index = 0; index < 7000; index += 1) {
        const sourceIndex = index % 1000;
        let offset = 1 + ((index * 17) % 997);
        let targetIndex = (sourceIndex + offset) % 1000;
        if (targetIndex === sourceIndex) targetIndex = (targetIndex + 1) % 1000;
        const type = index % 3;
        const source = nodes[sourceIndex];
        const target = nodes[targetIndex];
        const route = type === 0 ? { type: 'line' } : type === 1
            ? { type: 'quadratic', cx: (source.x + target.x) / 2, cy: (source.y + target.y) / 2 + ((index % 2 ? 1 : -1) * 42) }
            : { type: 'polyline', points: [[source.x, source.y], [(source.x + target.x) / 2, (source.y + target.y) / 2], [target.x, target.y]] };
        edges.push({
            id: `lab-edge-${String(index).padStart(4, '0')}`,
            source: source.id,
            target: target.id,
            priority: 7000 - index,
            lodClass: index % 5 === 0 ? 'bridge' : 'standard',
            directed: index % 2 === 0,
            styleToken: ['conceptual', 'logical', 'applied'][type],
            route,
            overlays: index % 11 === 0 ? ['guided_spine'] : [],
        });
    }

    return {
        schemaVersion: SCENE_SCHEMA_VERSION,
        layoutVersion: 'lab-grid-1.0.0',
        rendererContractVersion: RENDERER_CONTRACT_VERSION,
        nodes,
        edges,
    };
}
