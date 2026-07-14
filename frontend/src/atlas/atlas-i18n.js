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
        regions: 'Pilot regions',
        allWonders: 'All Wonder routes',
        loading: 'Loading the Atlas presentation data…',
        ready: 'Atlas ready. Use the directory to open a region.',
        unavailable: 'Atlas data is unavailable. The static Wonder directory remains available.',
        canvasUnavailable: 'Your browser cannot draw the Atlas. The static directory remains available.',
        main: 'Main Galaxy',
        open: 'Open route',
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
        regions: '試行區域',
        allWonders: '所有 Wonders 路徑',
        loading: '正在載入星圖展示資料…',
        ready: '星圖已就緒。可從目錄開啟一個區域。',
        unavailable: '星圖資料暫時無法取得；靜態 Wonders 目錄仍可使用。',
        canvasUnavailable: '此瀏覽器無法繪製星圖；靜態目錄仍可使用。',
        main: '主星系',
        open: '開啟路徑',
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
        regions: '試作リージョン',
        allWonders: 'すべての Wonders ルート',
        loading: 'アトラス表示データを読み込み中…',
        ready: 'アトラスの準備ができました。目録からリージョンを開けます。',
        unavailable: 'アトラスのデータを読み込めません。静的な Wonders 目録は利用できます。',
        canvasUnavailable: 'このブラウザーではアトラスを描画できません。静的な目録は利用できます。',
        main: 'メイン銀河',
        open: 'ルートを開く',
    },
};

export const WONDER_FALLBACKS = {
    'arrow-of-time': 'The Arrow of Time',
    'black-holes': 'Black Holes',
    chaos: 'Chaos',
    computation: 'Computation',
    'edge-ai': 'Edge AI',
    emergence: 'Emergence',
    germs: 'Germs',
    'ideas-that-spread': 'Ideas That Spread',
    infinity: 'Infinity',
    language: 'Language',
    light: 'Light',
    markets: 'Markets',
    music: 'Music',
    networks: 'Networks',
    quantum: 'Quantum Reality',
    symmetry: 'Symmetry',
    'the-atom': 'The Atom',
    'the-gene': 'The Gene',
    'the-mind': 'The Mind',
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
