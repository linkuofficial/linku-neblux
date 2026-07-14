export const ARCHETYPES = Object.freeze([
    'galactic_nucleus', 'domain_core', 'subfield_giant', 'concept_star',
    'bridge_star', 'beacon_star', 'event_remnant', 'local_protostar',
]);

export const MAGNITUDES = Object.freeze(['nucleus', 'major', 'bright', 'standard', 'faint']);
export const LABEL_PRIORITIES = Object.freeze(['low', 'standard', 'high', 'critical']);
export const OVERLAYS = Object.freeze([
    'selected', 'related', 'guided_spine', 'depth_lens',
    'portal_ring', 'multi_portal', 'filtered', 'dimmed',
]);

export const DEFAULT_TOKENS = Object.freeze({
    background: '#050912',
    edge: 'rgba(150, 180, 220, 0.22)',
    edgeMid: 'rgba(190, 215, 245, 0.42)',
    label: '#dfe9f8',
    accent: '#b9d7ff',
    selected: '#ffffff',
    related: '#b8dcff',
    guided: '#f3cc83',
    depth: '#9de8ff',
    portal: '#d5b6ff',
    filtered: 0.18,
    dimmed: 0.22,
    topKBridges: 180,
    farZoom: 0.58,
    midZoom: 1.08,
    nearZoom: 2.15,
    labelCellSize: 96,
    hitTargetCssPx: 44,
    colors: Object.freeze({
        MAT: '#d9e8ff', PHY: '#f1c4a2', CHE: '#b2e4cf', BIO: '#b7db9d',
        MED: '#f2b6c5', ENG: '#d8bdff', TEC: '#9fd8ff', SOC: '#e8d39a',
        HUM: '#efc2aa', PHI: '#c7c5f1', ART: '#efb1dc', HIS: '#d3bd9b',
        default: '#bfd0e8',
    }),
    magnitude: Object.freeze({
        nucleus: { core: 9, halo: 34, corona: 72 },
        major: { core: 7, halo: 27, corona: 56 },
        bright: { core: 4.5, halo: 19, corona: 38 },
        standard: { core: 2.6, halo: 12, corona: 25 },
        faint: { core: 1.5, halo: 7, corona: 15 },
    }),
});

export function mergeTokens(tokens = {}) {
    return {
        ...DEFAULT_TOKENS,
        ...tokens,
        colors: { ...DEFAULT_TOKENS.colors, ...(tokens.colors || {}) },
        magnitude: { ...DEFAULT_TOKENS.magnitude, ...(tokens.magnitude || {}) },
    };
}
