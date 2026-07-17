const FALLBACK_LAYOUT = {
    layoutVersion: 'fallback',
    coordinateSpace: { width: 2400, height: 1600 },
    mainGalaxy: {
        id: 'main', x: 0, y: 0, radius: 260, hitRadius: 300, route: '/app.html',
        title: { en: 'Main Galaxy', zh: '主星系', ja: 'メイン銀河' },
        summary: { en: 'A navigable map of how fields and ideas connect.', zh: '探索不同領域與想法如何彼此連結的導航星系。', ja: '分野とアイデアのつながりをたどるための航行星系。' },
    },
    wonders: [
        { id: 'edge-ai', x: 650, y: 360, radius: 110, hitRadius: 140, route: '/wonders.html?w=edge-ai', domains: ['TEC', 'ENG'], scale: 'medium', title: { en: 'Edge AI', zh: '邊緣 AI', ja: 'エッジ AI' }, summary: { en: 'Intelligence close to the world it serves.', zh: '貼近它所服務世界的智慧。', ja: '役立つ現場のすぐそばにある知能。' } },
        { id: 'light', x: -700, y: -250, radius: 120, hitRadius: 150, route: '/wonders.html?w=light', domains: ['PHY'], scale: 'medium', title: { en: 'Light', zh: '光', ja: '光' }, summary: { en: 'A journey through waves, colour, and observation.', zh: '穿越波、色彩與觀測的一段旅程。', ja: '波、色、観測をたどる旅。' } },
        { id: 'quantum', x: -350, y: 500, radius: 115, hitRadius: 145, route: '/wonders.html?w=quantum', domains: ['PHY', 'MAT'], scale: 'medium', title: { en: 'Quantum Reality', zh: '量子真實', ja: '量子の世界' }, summary: { en: 'Where measurement changes what can be known.', zh: '測量會改變可知之事的地方。', ja: '測定が、知りうることを変える場所。' } },
    ],
    roads: [{ id: 'light-quantum', from: 'wonder:light', to: 'wonder:quantum', via: 'wave_particle_duality_concept', strength: 'strong' }],
};

export function createAtlasState(lang) {
    return {
        lang,
        loadState: 'loading',
        index: FALLBACK_LAYOUT,
        usingFallback: true,
        hoveredRegionId: null,
    };
}

// Generated Atlas artifacts intentionally use an object keyed by Wonder id, so
// the public contract is compact and easily auditable. The Canvas consumes this
// small normalized view only; it never receives graph nodes or graph edges.
export function normalizeAtlasIndex(index) {
    const main = index.mainGalaxy || {};
    const wonders = Array.isArray(index.wonders)
        ? index.wonders
        : Object.entries(index.wonders || {}).map(([id, wonder]) => ({ id, ...wonder }));
    return {
        ...index,
        coordinateSpace: index.coordinateSpace || index.coordinateSystem || { width: 2400, height: 1600 },
        mainGalaxy: {
            id: 'main',
            radius: main.radius || main.visualRadius || 260,
            ...main,
        },
        wonders: wonders.map((wonder) => ({
            radius: wonder.radius || wonder.visualRadius || 110,
            domains: wonder.domains || wonder.dominantDomains || [],
            scale: wonder.scale || wonder.visualScale,
            ...wonder,
        })),
        roads: (index.roads || []).map((road) => ({ strength: road.strength || road.strengthClass, ...road })),
    };
}

export function allRegions(index) {
    return [index.mainGalaxy, ...(index.wonders || [])].filter(Boolean);
}

export function regionById(index, id) {
    return allRegions(index).find((region) => region.id === id) || null;
}
