const COPY = {
    en: {
        eyebrow: 'NAVIGATION FIRST',
        title: 'Graph Atlas',
        subtitle: 'A quiet map for tracing how fields and ideas meet.',
        controls: 'Atlas controls',
        zoomIn: 'Zoom in',
        zoomOut: 'Zoom out',
        reset: 'Reset view',
        directory: 'Atlas directory',
        regions: 'Featured regions',
        allWonders: 'All Wonder routes',
        loading: 'Loading the Atlas presentation data…',
        ready: 'Atlas ready. Use the directory to open a region.',
        unavailable: 'Atlas data is unavailable. The static Wonder directory remains available.',
        canvasUnavailable: 'Your browser cannot draw the Atlas. The static directory remains available.',
        main: 'Main Galaxy',
        open: 'Open route',
        skipToDirectory: 'Skip to Atlas directory',
        language: 'Language',
        visualMap: 'Graph Atlas visual map',
        interactiveMap: 'Interactive Graph Atlas. Drag to pan, scroll to zoom, or use the directory.',
    },
    zh: {
        eyebrow: '先導航，再探索',
        title: '圖譜星圖',
        subtitle: '一張安靜的地圖，循著領域與想法相遇的軌跡前行。',
        controls: '星圖控制項',
        zoomIn: '放大',
        zoomOut: '縮小',
        reset: '重設視角',
        directory: '星圖目錄',
        regions: '精選區域',
        allWonders: '所有驚奇之旅路徑',
        loading: '正在載入星圖展示資料…',
        ready: '星圖已就緒。可從目錄開啟一個區域。',
        unavailable: '星圖資料暫時無法取得；靜態驚奇之旅目錄仍可使用。',
        canvasUnavailable: '此瀏覽器無法繪製星圖；靜態目錄仍可使用。',
        main: '主星系',
        open: '開啟路徑',
        skipToDirectory: '跳至星圖目錄',
        language: '語言',
        visualMap: '圖譜星圖視覺地圖',
        interactiveMap: '可互動的圖譜星圖。可拖曳平移、滾動縮放，或使用目錄。',
    },
    ja: {
        eyebrow: 'まず航路を',
        title: 'グラフ・アトラス',
        subtitle: '分野とアイデアの出会いをたどる、静かな地図。',
        controls: 'アトラス操作',
        zoomIn: '拡大',
        zoomOut: '縮小',
        reset: '表示をリセット',
        directory: 'アトラス目録',
        regions: '注目の領域',
        allWonders: 'すべてのツアールート',
        loading: 'アトラス表示データを読み込み中…',
        ready: 'アトラスの準備ができました。目録からリージョンを開けます。',
        unavailable: 'アトラスのデータを読み込めません。静的なツアー目録は利用できます。',
        canvasUnavailable: 'このブラウザーではアトラスを描画できません。静的な目録は利用できます。',
        main: 'メイン銀河',
        open: 'ルートを開く',
        skipToDirectory: 'アトラス目録へ移動',
        language: '言語',
        visualMap: 'グラフ・アトラスの地図',
        interactiveMap: '操作可能なグラフ・アトラス。ドラッグで移動、スクロールで拡大縮小、または目録を使えます。',
    },
};

export const WONDER_FALLBACKS = {
    'arrow-of-time': { en: 'The Arrow of Time', zh: '時間之箭', ja: '時間の矢' },
    'black-holes': { en: 'Black Holes & Spacetime', zh: '黑洞與時空', ja: 'ブラックホールと時空' },
    chaos: { en: 'Chaos', zh: '混沌', ja: 'カオス' },
    computation: { en: 'Computation', zh: '計算', ja: '計算' },
    'edge-ai': { en: 'Edge AI', zh: '邊緣 AI', ja: 'エッジ AI' },
    emergence: { en: 'Emergence', zh: '湧現', ja: '創発' },
    germs: { en: 'Germs', zh: '病菌', ja: '病原菌' },
    'ideas-that-spread': { en: 'How Ideas Spread', zh: '思想如何傳播', ja: '思想はいかに広がるか' },
    infinity: { en: 'Infinity', zh: '無限', ja: '無限' },
    language: { en: 'Language', zh: '語言', ja: '言語' },
    light: { en: 'Light', zh: '光', ja: '光' },
    markets: { en: 'Markets', zh: '市場', ja: '市場' },
    music: { en: 'Music', zh: '音樂', ja: '音楽' },
    networks: { en: 'Networks', zh: '網路', ja: 'ネットワーク' },
    quantum: { en: 'Quantum Reality', zh: '量子真實', ja: '量子の世界' },
    symmetry: { en: 'Symmetry', zh: '對稱', ja: '対称性' },
    'the-atom': { en: 'The Atom', zh: '原子', ja: '原子' },
    'the-gene': { en: 'The Gene', zh: '基因', ja: '遺伝子' },
    'the-mind': { en: 'The Mind', zh: '心智', ja: '心' },
};

export function normalizeLang(value) {
    if (value === 'zh-TW') return 'zh';
    return Object.hasOwn(COPY, value) ? value : 'en';
}

export function getInitialLang() {
    try {
        const saved = normalizeLang(localStorage.getItem('neblux-lang'));
        if (saved !== 'en' || localStorage.getItem('neblux-lang') === 'en') return saved;
    } catch {
        // Storage is optional for the static presentation route.
    }
    const browserLang = (navigator.language || '').toLowerCase();
    if (browserLang.startsWith('zh')) return 'zh';
    if (browserLang.startsWith('ja')) return 'ja';
    return 'en';
}

export function t(lang, key) {
    return COPY[normalizeLang(lang)][key] || COPY.en[key] || key;
}

export function localizedText(value, lang, fallback = '') {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return fallback;
    return value[normalizeLang(lang)] || value.en || fallback;
}
