export const ARCHETYPES = Object.freeze([
    'galactic_nucleus', 'domain_core', 'subfield_giant', 'concept_star',
    'bridge_star', 'beacon_star', 'event_remnant', 'local_protostar',
]);

export const MAGNITUDES = Object.freeze(['nucleus', 'major', 'bright', 'standard', 'faint']);
export const LABEL_PRIORITIES = Object.freeze(['low', 'standard', 'high', 'critical']);
export const OVERLAYS = Object.freeze([
    'selected', 'related', 'guided_spine', 'depth_lens',
    'portal_ring', 'multi_portal', 'learned', 'available', 'filtered', 'dimmed',
]);

export const DEFAULT_TOKENS = Object.freeze({
    background: '#050912',
    edge: 'rgba(170, 195, 230, 0.12)',
    edgeMid: 'rgba(190, 215, 245, 0.30)',
    // Focus lighting: edges touching the focused node get a gradient stroke
    // (bright endpoints, dim mid-span); the rest of the sky's edges recede.
    // Values mirror THEME.edges in the production engine.
    edgeFocus: '#cfe0f5',
    edgeFocusEnd: 0.42,
    edgeFocusMid: 0.10,
    restEdgeDim: 0.35,
    label: '#d4e4fa',
    labelFont: '12px "IBM Plex Mono", ui-monospace, monospace',
    labelStroke: 'rgba(4, 7, 12, 0.92)',
    labelSizeFocus: 14,
    labelSizeDomain: 13,
    labelSizeRelated: 12,
    labelSizeAmbient: 10,
    labelSizeWonder: 11,
    labelPadding: 2,
    labelHysteresis: 8,
    lodFadeMs: 180,
    accent: '#f0c050',
    selected: '#ffffff',
    related: '#b8dcff',
    guided: '#f0c050',
    guidedStroke: 'rgba(240, 192, 80, 0.55)',
    bundleStroke: 'rgba(240, 192, 80, 0.24)',
    learned: '#72d6c9',
    available: '#f0c050',
    learningStroke: 'rgba(240, 192, 80, 0.46)',
    depth: '#9de8ff',
    portal: '#d5b6ff',
    filtered: 0.18,
    dimmed: 0.22,
    // Atmosphere: per-domain nebula fog + edge-darkening vignette, mirroring
    // THEME.atmosphere in the production engine. Set alpha/strength to 0 to
    // disable a layer.
    nebulaAlpha: 0.16,
    nebulaWorldRadius: 230,
    nebulaMaxScreenRadius: 480,
    vignette: 0.45,
    vignetteColor: '2,4,9',
    topKBridges: 180,
    farZoom: 0.58,
    midZoom: 1.08,
    nearZoom: 2.15,
    labelCellSize: 96,
    hitTargetCssPx: 44,
    ambientFps: 24,
    mobileAmbientFps: 20,
    focusPhotonCount: 12,
    focusStaticCount: 16,
    photonDurationMs: 3600,
    // Domain palette — the canonical source of truth is
    // frontend/public/neblux-tokens.js (window.NebluxTokens.DOMAIN_COLORS,
    // shared with app.html/explorer/wonders). Mirrored here because that file
    // is a window-global script, not an ES module. Keep the two in sync.
    colors: Object.freeze({
        MAT: '#5b9bd5', PHY: '#c97a5b', CHE: '#c9c05b', BIO: '#5bc97a',
        MED: '#5bc9b8', ENG: '#9b7bc9', TEC: '#c95b9b', SOC: '#c9a05a',
        HUM: '#7ba5c9', PHI: '#9bc95b', ART: '#c95b5b', HIS: '#a07850',
        default: '#888888',
    }),
    // Star sprite families. A magnitude is not a scale factor: each tier is a
    // different kind of object, so `family` selects a distinct paint recipe and
    // the radii are tuned per tier rather than derived from one multiplier.
    //
    // Brightness buys over-exposure and scatter, not size. Across the tiers the
    // core grows ~8x (1.05 → 9) while the scatter halo grows from nothing to 34
    // — halo/core climbs 0 → 1.9 → 3.1 → 3.9, so a nucleus is a blown-out point
    // inside a wide bloom, not a magnified faint star.
    //
    // `ring` is the overlay geometry radius (selection corona, learning marks,
    // portal rings), deliberately decoupled from `halo`: those rings are UI
    // affordances sized for the pointer, so shrinking a star's optical scatter
    // must not shrink its focus corona. Values match the pre-family halo table.
    magnitude: Object.freeze({
        nucleus: { family: 'bloom', core: 9, glow: 16, halo: 34, corona: 72, spike: 76, ring: 34 },
        major: { family: 'bloom', core: 6.6, glow: 11, halo: 26, corona: 54, spike: 0, ring: 27 },
        bright: { family: 'tight', core: 3.6, glow: 5, halo: 11, corona: 0, spike: 0, ring: 19 },
        standard: { family: 'disc', core: 1.9, glow: 0, halo: 3.6, corona: 0, spike: 0, ring: 12 },
        faint: { family: 'point', core: 1.05, glow: 0, halo: 0, corona: 0, spike: 0, ring: 7 },
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
