// ===== I18N =====
const I18N = {
    en: {
        title: 'Knowledge Graph',
        loading: 'Loading graph...',
        searchPlaceholder: 'Search nodes...',
        searchNoResults: 'No matching nodes. Try broader terms like calculus, quantum, or evolution.',
        searchTopHint: 'Press Enter to open top result',
        searchResultsLabel: 'Search results',
        learningPath: 'Learning Path',
        addToLearningPath: 'Add to Learning Path',
        removeFromLearningPath: 'Mark as Not Learned',
        nextStepReady: 'Ready now',
        nextStepLabel: 'Next step',
        nextStepWillAppear: 'Next step will appear in Learning Path mode.',
        nextStepLocked: 'Finish prerequisites to unlock a recommended next step.',
        learningComplete: 'Great progress. No next prerequisite step from this node.',
        searchOnGoogle: 'Search on Google \u2192',
        prerequisites: '\u2191 Prerequisites',
        unlocks: '\u2193 Unlocks',
        allConnections: 'All Connections',
        noneFoundational: 'None \u2014 foundational',
        noneDetected: 'None detected',
        pending: 'pending',
        era: 'Era',
        present: 'present',
        bce: 'BCE',
        nodes: 'nodes',
        edges: 'edges',
        prereqs: 'prereqs',
        learned: 'learned',
        available: 'available',
        filterAll: 'ALL',
        // Legend
        logical: 'logical',
        historical: 'historical',
        applied: 'applied',
        conceptual: 'conceptual',
        causal: 'causal',
        prerequisite: 'prerequisite',
        // Node types
        field: 'FIELD',
        concept: 'CONCEPT',
        person: 'PERSON',
        event: 'EVENT'
    },
    zh: {
        title: '\u77e5\u8b58\u5716\u8b5c',
        loading: '\u8f09\u5165\u5716\u8b5c\u4e2d...',
        searchPlaceholder: '\u641c\u5c0b\u7bc0\u9ede...',
        searchNoResults: '\u627e\u4e0d\u5230\u76f8\u7b26\u7bc0\u9ede\u3002\u8acb\u5617\u8a66\u66f4\u5bec\u7684\u95dc\u9375\u8a5e\uff0c\u4f8b\u5982 calculus\u3001quantum\u3001evolution\u3002',
        searchTopHint: '\u6309 Enter \u53ef\u76f4\u63a5\u958b\u555f\u7b2c\u4e00\u500b\u7d50\u679c',
        searchResultsLabel: '\u641c\u5c0b\u7d50\u679c',
        learningPath: '\u5b78\u7fd2\u8def\u5f91',
        addToLearningPath: '\u52a0\u5165\u5b78\u7fd2\u8def\u5f91',
        removeFromLearningPath: '\u6a19\u8a18\u70ba\u672a\u5b78\u7fd2',
        nextStepReady: '\u73fe\u5728\u53ef\u5b78',
        nextStepLabel: '\u4e0b\u4e00\u6b65',
        nextStepWillAppear: '\u958b\u555f\u5b78\u7fd2\u8def\u5f91\u6a21\u5f0f\u5f8c\u6703\u986f\u793a\u4e0b\u4e00\u6b65\u5efa\u8b70\u3002',
        nextStepLocked: '\u5148\u5b8c\u6210\u524d\u7f6e\u77e5\u8b58\uff0c\u5c31\u6703\u89e3\u9396\u4e0b\u4e00\u6b65\u5efa\u8b70\u3002',
        learningComplete: '\u9032\u5ea6\u4e0d\u932f\u3002\u9019\u500b\u7bc0\u9ede\u7684\u5148\u4fee\u5ef6\u4f38\u5df2\u5168\u90e8\u5b8c\u6210\u3002',
        searchOnGoogle: '\u5728 Google \u641c\u5c0b \u2192',
        prerequisites: '\u2191 \u524d\u7f6e\u77e5\u8b58',
        unlocks: '\u2193 \u89e3\u9396',
        allConnections: '\u6240\u6709\u9023\u7d50',
        noneFoundational: '\u7121 \u2014 \u57fa\u790e\u77e5\u8b58',
        noneDetected: '\u672a\u5075\u6e2c\u5230',
        pending: '\u5f85\u78ba\u8a8d',
        era: '\u5e74\u4ee3',
        present: '\u81f3\u4eca',
        bce: '\u524d',
        nodes: '\u7bc0\u9ede',
        edges: '\u908a',
        prereqs: '\u5148\u4fee',
        learned: '\u5df2\u5b78',
        available: '\u53ef\u5b78',
        filterAll: '\u5168\u90e8',
        // Legend
        logical: '\u908f\u8f2f',
        historical: '\u6b77\u53f2',
        applied: '\u61c9\u7528',
        conceptual: '\u6982\u5ff5',
        causal: '\u56e0\u679c',
        prerequisite: '\u5148\u4fee',
        // Node types
        field: '\u9818\u57df',
        concept: '\u6982\u5ff5',
        person: '\u4eba\u7269',
        event: '\u4e8b\u4ef6'
    },
    ja: {
        title: '\u30ca\u30ec\u30c3\u30b8\u30b0\u30e9\u30d5',
        loading: '\u30b0\u30e9\u30d5\u3092\u8aad\u307f\u8fbc\u307f\u4e2d...',
        searchPlaceholder: '\u30ce\u30fc\u30c9\u3092\u691c\u7d22...',
        searchNoResults: '\u4e00\u81f4\u3059\u308b\u30ce\u30fc\u30c9\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3002calculus\u3001quantum\u3001evolution \u306a\u3069\u306e\u3088\u308a\u5e45\u5e83\u3044\u8a9e\u3067\u8a66\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
        searchTopHint: 'Enter \u3067\u5148\u982d\u7d50\u679c\u3092\u958b\u304f',
        searchResultsLabel: '\u691c\u7d22\u7d50\u679c',
        learningPath: '\u5b66\u7fd2\u30d1\u30b9',
        addToLearningPath: '\u5b66\u7fd2\u30d1\u30b9\u306b\u8ffd\u52a0',
        removeFromLearningPath: '\u672a\u5b66\u7fd2\u306b\u623b\u3059',
        nextStepReady: '\u4eca\u3059\u3050\u53ef\u80fd',
        nextStepLabel: '\u6b21\u306e\u30b9\u30c6\u30c3\u30d7',
        nextStepWillAppear: '\u5b66\u7fd2\u30d1\u30b9\u30e2\u30fc\u30c9\u3067\u6b21\u306e\u63a8\u5968\u30b9\u30c6\u30c3\u30d7\u304c\u8868\u793a\u3055\u308c\u307e\u3059\u3002',
        nextStepLocked: '\u6b21\u3092\u89e3\u653e\u3059\u308b\u306b\u306f\u5148\u4fee\u3092\u5b8c\u4e86\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
        learningComplete: '\u826f\u3044\u9032\u6357\u3067\u3059\u3002\u3053\u306e\u30ce\u30fc\u30c9\u306b\u6b21\u306e\u5148\u4fee\u30b9\u30c6\u30c3\u30d7\u306f\u3042\u308a\u307e\u305b\u3093\u3002',
        searchOnGoogle: 'Google \u3067\u691c\u7d22 \u2192',
        prerequisites: '\u2191 \u5148\u4fee',
        unlocks: '\u2193 \u89e3\u653e',
        allConnections: '\u3059\u3079\u3066\u306e\u63a5\u7d9a',
        noneFoundational: '\u306a\u3057 \u2014 \u57fa\u790e',
        noneDetected: '\u691c\u51fa\u306a\u3057',
        pending: '\u4fdd\u7559',
        era: '\u6642\u4ee3',
        present: '\u73fe\u4ee3',
        bce: '\u7d00\u5143\u524d',
        nodes: '\u30ce\u30fc\u30c9',
        edges: '\u30a8\u30c3\u30b8',
        prereqs: '\u5148\u4fee',
        learned: '\u5b66\u7fd2\u6e08\u307f',
        available: '\u5b66\u7fd2\u53ef\u80fd',
        filterAll: '\u5168\u3066',
        // Legend
        logical: '\u8ad6\u7406',
        historical: '\u6b74\u53f2',
        applied: '\u5fdc\u7528',
        conceptual: '\u6982\u5ff5',
        causal: '\u56e0\u679c',
        prerequisite: '\u5148\u4fee',
        // Node types
        field: '\u5206\u91ce',
        concept: '\u6982\u5ff5',
        person: '\u4eba\u7269',
        event: '\u4e8b\u4ef6'
    }
};

function isValidLang(lang) {
    return typeof lang === 'string' && Object.prototype.hasOwnProperty.call(I18N, lang);
}

function getLang() {
    const saved = localStorage.getItem('nexus-lang');
    if (saved === 'zh-TW') return 'zh';
    if (isValidLang(saved)) return saved;
    const nav = (navigator.language || '').toLowerCase();
    if (nav.startsWith('ja')) return 'ja';
    if (nav.startsWith('zh')) return 'zh';
    return 'en';
}

let LANG = getLang();
function t(key) { return I18N[LANG][key] || I18N['en'][key] || key; }

const TAG_LABELS = {
    zh: {
        foundational: '基礎',
        abstract: '抽象',
        axiomatic: '公理化',
        ancient: '古代',
        experimental: '實驗',
        natural_world: '自然世界',
        molecular_scale: '分子尺度',
        interdisciplinary: '跨領域',
        field: '領域',
        applied: '應用',
        theoretical: '理論',
        empirical: '實證',
        modern: '現代',
        contemporary: '當代',
        historical_timescale: '歷史尺度',
        historically_significant: '歷史重要',
        unifying_concept: '統一概念',
        well_established: '成熟理論',
        currently_active_research: '目前活躍研究'
    },
    ja: {
        foundational: '基礎',
        abstract: '抽象',
        axiomatic: '公理化',
        ancient: '古代',
        experimental: '実験',
        natural_world: '自然界',
        molecular_scale: '分子スケール',
        interdisciplinary: '学際的',
        field: '分野',
        applied: '応用',
        theoretical: '理論',
        empirical: '実証',
        modern: '近代',
        contemporary: '現代',
        historical_timescale: '歴史スケール',
        historically_significant: '歴史的重要',
        unifying_concept: '統一概念',
        well_established: '確立された理論',
        currently_active_research: '現在進行中の研究'
    }
};

const TAG_TOKEN_ZH = {
    age: '時代',
    ancient: '古代',
    modern: '現代',
    contemporary: '當代',
    early: '早期',
    middle: '中期',
    post: '後',
    digital: '數位',
    industrial: '工業',
    cold: '冷',
    war: '戰爭',
    exploration: '探索',
    revolution: '革命',
    enlightenment: '啟蒙',
    renaissance: '文藝復興',
    ancient_greek: '古希臘',
    islamic: '伊斯蘭',
    golden: '黃金',
    world: '世界',
    history: '歷史',
    historical: '歷史',
    historiography: '史學方法',
    studies: '研究',
    science: '科學',
    technology: '科技',
    engineering: '工程',
    application: '應用',
    applied: '應用',
    practical: '實務',
    theoretical: '理論',
    theory: '理論',
    model: '模型',
    methodology: '方法論',
    framework: '框架',
    concept: '概念',
    foundational: '基礎',
    abstract: '抽象',
    axiomatic: '公理化',
    empirical: '實證',
    experimental: '實驗',
    observational: '觀測',
    analytical: '分析',
    analysis: '分析',
    quantitative: '量化',
    qualitative: '質化',
    logic: '邏輯',
    algebra: '代數',
    calculus: '微積分',
    geometry: '幾何',
    topology: '拓撲',
    probability: '機率',
    statistics: '統計',
    differential: '微分',
    equations: '方程',
    number: '數論',
    graph: '圖',
    set: '集合',
    field: '領域',
    interdisciplinary: '跨領域',
    cross: '跨',
    domain: '領域',
    molecular: '分子',
    atomic: '原子',
    cellular: '細胞',
    ecological: '生態',
    planetary: '行星',
    cosmic: '宇宙',
    scale: '尺度',
    ethics: '倫理',
    policy: '政策',
    society: '社會',
    social: '社會',
    culture: '文化',
    cultural: '文化',
    cognitive: '認知',
    medical: '醫學',
    biomedical: '生醫',
    chemistry: '化學',
    physics: '物理',
    biology: '生物',
    linguistics: '語言學',
    philosophy: '哲學',
    art: '藝術',
    music: '音樂',
    design: '設計',
    law: '法律',
    cybersecurity: '資安',
    machine: '機器',
    learning: '學習',
    network: '網路',
    systems: '系統',
    system: '系統',
    computing: '計算',
    computer: '電腦',
    language: '語言',
    processing: '處理',
    public: '公共',
    health: '健康',
    significant: '重要',
    established: '成熟',
    unifying: '統一',
};

function localizeTag(tag) {
    const mapped = TAG_LABELS[LANG] && TAG_LABELS[LANG][tag];
    if (mapped) return mapped;

    const centuryMatch = tag.match(/^(\d{1,2})th_century$/);
    if (centuryMatch) {
        if (LANG === 'zh') return `${centuryMatch[1]}世紀`;
        if (LANG === 'ja') return `${centuryMatch[1]}世紀`;
    }

    if (LANG === 'en') {
        return humanizeTag(tag);
    }

    if (LANG === 'zh') {
        const rangeMatch = tag.match(/^(\d+)bce_to_(\d+)ce$/);
        if (rangeMatch) {
            return `${rangeMatch[1]}公元前至${rangeMatch[2]}公元`;
        }
        const tokens = tag.split('_').filter(Boolean);
        const converted = tokens.map((token) => TAG_TOKEN_ZH[token] || token);
        if (converted.every((value, idx) => value === tokens[idx])) {
            return humanizeTag(tag);
        }
        return converted.join('');
    }

    return humanizeTag(tag);
}

function humanizeTag(tag) {
    return String(tag)
        .replace(/_/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function sectionLabel(kind) {
    const labels = {
        en: { definition: 'Definition', applications: 'Applications', theory: 'Theory' },
        zh: { definition: '定義', applications: '應用', theory: '理論' },
        ja: { definition: '定義', applications: '応用', theory: '理論' },
    };
    const set = labels[LANG] || labels.en;
    return set[kind] || kind;
}

function renderPanelDescription(node) {
    const raw = nodeDescription(node).trim();
    if (!raw) return '';

    if (node.id !== 'machine_learning_concept') {
        return `<p>${escHtml(raw)}</p>`;
    }

    const sentences = raw
        .split(/(?<=[。！？.!?])\s*/)
        .map((part) => part.trim())
        .filter(Boolean);

    const definition = sentences[0] || raw;
    const applications = sentences[1] || '';
    const theory = sentences.slice(2).join(' ') || '';

    const blocks = [
        { title: sectionLabel('definition'), body: definition },
        { title: sectionLabel('applications'), body: applications },
        { title: sectionLabel('theory'), body: theory },
    ].filter((block) => block.body);

    return blocks
        .map((block) => `<p><strong>${escHtml(block.title)}:</strong> ${escHtml(block.body)}</p>`)
        .join('');
}

async function setLang(lang) {
    if (!isValidLang(lang)) return;
    LANG = lang;
    localStorage.setItem('nexus-lang', lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : lang;
    // Load/clear label translations
    if (lang !== 'en') {
        try {
            labelMap = await window.NexusApi.fetchLocaleLabels(lang);
        } catch (e) { labelMap = {}; }
    } else {
        labelMap = {};
    }
    if (lang !== 'en') {
        try {
            descriptionMap = await window.NexusApi.fetchLocaleDescriptions(lang);
        } catch (e) {
            descriptionMap = {};
        }
    } else {
        descriptionMap = {};
    }
    applyI18n();
    // Update graph node labels
    if (nodeEls) nodeEls.select('text').text(d => nodeLabel(d));
}

function applyI18n() {
    document.querySelector('#hdr h1').textContent = t('title');
    document.getElementById('search-input').placeholder = t('searchPlaceholder');
    document.getElementById('search-results').setAttribute('aria-label', t('searchResultsLabel'));
    document.getElementById('lp-btn').lastChild.textContent = t('learningPath');
    document.getElementById('p-search').textContent = t('searchOnGoogle');
    const lpActionBtn = document.getElementById('p-lp-action');
    if (lpActionBtn) {
        if (currentPanelNodeId && nodeMap[currentPanelNodeId]) {
            updatePanelLearningControls(nodeMap[currentPanelNodeId]);
        } else {
            lpActionBtn.textContent = t('addToLearningPath');
        }
    }
    const nextStep = document.getElementById('p-next-step');
    if (nextStep && !currentPanelNodeId) {
        nextStep.textContent = t('nextStepWillAppear');
    }
    document.querySelector('#p-prereqs h4').textContent = t('prerequisites');
    document.querySelector('#p-unlocks h4').textContent = t('unlocks');
    document.querySelector('#p-conns h3').textContent = t('allConnections');
    // Legend
    const legendItems = document.querySelectorAll('#legend .li');
    const legendKeys = ['logical', 'historical', 'applied', 'conceptual', 'causal', 'prerequisite'];
    legendItems.forEach((li, i) => { if (legendKeys[i]) li.lastChild.textContent = t(legendKeys[i]); });
    // Filter bar "ALL" button
    const allBtn = document.querySelector('.filter-btn');
    if (allBtn) allBtn.textContent = t('filterAll');
    // Stats
    if (allNodes.length) {
        document.getElementById('stats').textContent = `${allNodes.length} ${t('nodes')} \u00b7 ${allEdges.length} ${t('edges')} \u00b7 ${prereqEdges.length} ${t('prereqs')}`;
    }
    // Lang toggle active state
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === LANG));
    // Update learned info if visible
    if (lpMode) updateLearnedInfo();

    // Re-render panel content so localized descriptions/tags apply immediately.
    if (currentPanelNodeId && nodeMap[currentPanelNodeId]) {
        openPanel(nodeMap[currentPanelNodeId]);
    }
}

function setLoadingState(message, isError = false, showRetry = false) {
    const loading = document.getElementById('loading');
    const text = document.getElementById('loading-text');
    const retry = document.getElementById('loading-retry');
    text.textContent = message;
    text.style.color = isError ? '#fda4af' : '#94a7bf';
    retry.style.display = showRetry ? 'inline-block' : 'none';
    loading.style.display = 'block';
}

function hideLoadingState() {
    document.getElementById('loading').style.display = 'none';
}

// ===== CONSTANTS =====
const DC = { MAT: '#5b9bd5', PHY: '#c97a5b', CHE: '#c9c05b', BIO: '#5bc97a', MED: '#5bc9b8', ENG: '#9b7bc9', TEC: '#c95b9b', SOC: '#c9a05a', HUM: '#7ba5c9', PHI: '#9bc95b', ART: '#c95b5b', HIS: '#a07850' };
const RC = { logical: '#5b9bd5', historical: '#c9a05a', applied: '#5bc97a', conceptual: '#9b7bc9', causal: '#c95b5b' };
const TYPE_SIZE = { field: 16, concept: 6, person: 9, event: 11 };

let allNodes = [], allEdges = [], nodeMap = {}, sim, nodeEls, linkEls, g, svgEl, zoomBehavior;
let focusCurveEls;
let linkNodeRefs = [];
let activeFilter = null;
let lpMode = false;
let learnedSet = new Set();
let prereqEdges = [];
let prereqGraph = { parents: {}, children: {} };
let navHistory = [];
let currentZoom = 1;
let labelMap = {};
let descriptionMap = {};
let enDescriptionMap = {}; // English descriptions loaded from /api/graph/descriptions
let _searchIndex = null; // Pre-built lowercase index for fast search
let currentPanelNodeId = null;
let relatedLabelIds = new Set();
const EDGE_CURVE_DISTANCE_FACTOR = 0.18;
const EDGE_CURVE_MIN_OFFSET = 10;
const EDGE_CURVE_MAX_OFFSET = 42;
const TOP_CHROME_EXPAND_DELAY = 90;
const TOP_CHROME_COLLAPSE_DELAY = 260;
function isSafeNodeId(id) {
    return window.NexusState.isSafeNodeId(id);
}

function parseLearnedSet(rawValue) {
    return window.NexusState.parseLearnedSet(rawValue, nodeMap);
}

function normalizeGraphData(data) {
    return window.NexusApi.normalizeGraphData(data);
}

function sleep(ms) {
    return window.NexusApi.sleep(ms);
}

async function fetchJsonWithRetry(url, retries = 2) {
    return window.NexusApi.fetchJsonWithRetry(url, retries);
}

async function loadGraphData() {
    return window.NexusApi.loadGraphData();
}

function nodeLabel(n) {
    if (LANG !== 'en' && labelMap[n.id]) return labelMap[n.id];
    return n.label;
}

function nodeDescription(n) {
    if (!n) return '';
    if (LANG !== 'en' && descriptionMap[n.id]) return descriptionMap[n.id];
    return n.description || enDescriptionMap[n.id] || '';
}

// ===== INIT =====
async function init() {
    // Setup lang toggle
    document.getElementById('lang-toggle').addEventListener('click', e => {
        const btn = e.target.closest('.lang-btn');
        if (btn) setLang(btn.dataset.lang);
    });
    document.getElementById('lang-toggle').addEventListener('keydown', e => {
        const btn = e.target.closest('.lang-btn');
        if (!btn) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setLang(btn.dataset.lang);
        }
    });
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === LANG));
    setLoadingState(t('loading'));

    document.getElementById('loading-retry').onclick = () => {
        setLoadingState(t('loading'));
        init();
    };

    // Load translations if not English
    if (LANG !== 'en') {
        try {
            labelMap = await window.NexusApi.fetchLocaleLabels(LANG);
        } catch (e) { /* fallback to English labels */ }
    }
    if (LANG !== 'en') {
        try {
            descriptionMap = await window.NexusApi.fetchLocaleDescriptions(LANG);
        } catch (e) {
            descriptionMap = {};
        }
    }

    // Load graph data from API (fallback to static JSON)
    // Load descriptions in parallel (non-blocking)
    let data;
    try {
        const [graphResult, descResult] = await Promise.all([
            loadGraphData(),
            window.NexusApi.fetchGraphDescriptions(),
        ]);
        data = graphResult;
        enDescriptionMap = descResult;
    } catch (e) {
        setLoadingState('Unable to load graph data. Please retry.', true, true);
        return;
    }
    const raw = data.nodes;

    const idSet = new Set(raw.map(n => n.id));
    allNodes = raw.map(n => ({ ...n }));
    nodeMap = Object.fromEntries(allNodes.map(n => [n.id, n]));

    // Pre-build search index (lowercase once, avoid repeated .toLowerCase() per keystroke)
    _searchIndex = allNodes.map(n => ({
        node: n,
        label: (n.label || '').toLowerCase(),
        id: (n.id || '').toLowerCase(),
        tags: (n.display_tags || []).join(' ').toLowerCase(),
        desc: (enDescriptionMap[n.id] || n.description || '').toLowerCase(),
        domains: (n.domain || []).map(d => d.toLowerCase()),
    }));

    // Use API edges directly, or build from connections as fallback
    if (data.edges && data.edges.length > 0) {
        allEdges = data.edges.map(e => ({
            source: e.source, target: e.target,
            relation_type: e.relation_type,
            pending: e.pending || false,
            learning_prerequisite: e.learning_prerequisite || false,
            directed: e.directed || false
        }));
    } else {
        const edgeSet = new Set();
        allEdges = [];
        for (const n of raw) {
            for (const c of (n.connections || [])) {
                if (!idSet.has(c.target)) continue;
                const key = [n.id, c.target].sort().join('|') + c.relation_type;
                if (edgeSet.has(key)) continue;
                edgeSet.add(key);
                allEdges.push({
                    source: n.id, target: c.target,
                    relation_type: c.relation_type,
                    pending: c.pending || false,
                    learning_prerequisite: c.learning_prerequisite || false,
                    directed: c.directed || false
                });
            }
        }
    }

    // Build prerequisite graph
    buildPrereqGraph(raw);

    // Load learning progress
    await loadLearningProgress();

    hideLoadingState();
    document.getElementById('stats').textContent = allNodes.length + ' ' + t('nodes') + ' \u00b7 ' + allEdges.length + ' ' + t('edges') + ' \u00b7 ' + prereqEdges.length + ' ' + t('prereqs');

    buildFilters();
    setupTopChrome();
    buildGraph();
    setupSearch();
    setupLPMode();
    applyI18n();
}

function setupTopChrome() {
    const trigger = document.getElementById('top-chrome-trigger');
    const searchBox = document.getElementById('search-box');
    const filterBar = document.getElementById('filter-bar');
    const hdr = document.getElementById('hdr');
    const langToggle = document.getElementById('lang-toggle');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    if (!trigger || !searchBox || !filterBar || !hdr || !langToggle) return;

    const pointerSupportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hoverNoneQuery = window.matchMedia('(hover: none)');
    const desktopQuery = window.matchMedia('(min-width: 761px)');
    const proximityEnabled = () => {
        if (!desktopQuery.matches) return false;
        if (pointerSupportsHover) return true;
        // Fallback for browsers that report hover capability conservatively on desktop.
        return !hoverNoneQuery.matches;
    };

    const interactiveAreas = [trigger, searchBox, filterBar, hdr, langToggle];
    let handlersBound = false;
    let expandTimer = null;
    let collapseTimer = null;

    const clearTimers = () => {
        if (expandTimer) { clearTimeout(expandTimer); expandTimer = null; }
        if (collapseTimer) { clearTimeout(collapseTimer); collapseTimer = null; }
    };

    const shouldStayExpanded = () => {
        if (searchInput === document.activeElement) return true;
        if (searchResults && searchResults.style.display === 'block') return true;
        return false;
    };

    const setCollapsed = (collapsed) => {
        document.body.classList.toggle('top-ui-collapsed', collapsed);
        trigger.setAttribute('aria-expanded', String(!collapsed));
    };

    const scheduleExpand = () => {
        if (!proximityEnabled()) return;
        if (expandTimer) clearTimeout(expandTimer);
        if (collapseTimer) { clearTimeout(collapseTimer); collapseTimer = null; }
        expandTimer = setTimeout(() => setCollapsed(false), TOP_CHROME_EXPAND_DELAY);
    };

    const scheduleCollapse = () => {
        if (!proximityEnabled()) return;
        if (shouldStayExpanded()) return;
        if (collapseTimer) clearTimeout(collapseTimer);
        if (expandTimer) { clearTimeout(expandTimer); expandTimer = null; }
        collapseTimer = setTimeout(() => {
            if (!shouldStayExpanded()) setCollapsed(true);
        }, TOP_CHROME_COLLAPSE_DELAY);
    };

    const bindHandlers = () => {
        if (handlersBound) return;
        interactiveAreas.forEach((el) => {
            el.addEventListener('pointerenter', scheduleExpand);
            el.addEventListener('pointerleave', scheduleCollapse);
        });
        searchInput.addEventListener('focus', scheduleExpand);
        searchInput.addEventListener('blur', () => setTimeout(scheduleCollapse, 120));
        handlersBound = true;
    };

    const unbindHandlers = () => {
        if (!handlersBound) return;
        interactiveAreas.forEach((el) => {
            el.removeEventListener('pointerenter', scheduleExpand);
            el.removeEventListener('pointerleave', scheduleCollapse);
        });
        searchInput.removeEventListener('focus', scheduleExpand);
        handlersBound = false;
    };

    const syncMode = () => {
        clearTimers();
        if (!proximityEnabled()) {
            unbindHandlers();
            setCollapsed(false);
            return;
        }
        bindHandlers();
        setCollapsed(true);
    };

    if (typeof desktopQuery.addEventListener === 'function') {
        desktopQuery.addEventListener('change', syncMode);
    } else if (typeof desktopQuery.addListener === 'function') {
        desktopQuery.addListener(syncMode);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') scheduleCollapse();
    });

    syncMode();
}

function buildPrereqGraph(raw) {
    const built = window.NexusGraph.buildPrerequisiteGraph(raw, nodeMap);
    prereqEdges = built.prereqEdges;
    prereqGraph = built.prereqGraph;
}

// ===== FILTERS =====
function buildFilters() {
    const bar = document.getElementById('filter-bar');
    const domains = ['ALL', 'MAT', 'PHY', 'CHE', 'BIO', 'MED', 'ENG', 'TEC', 'SOC', 'HUM', 'PHI', 'ART', 'HIS'];
    domains.forEach(d => {
        const btn = document.createElement('div');
        btn.className = 'filter-btn' + (d === 'ALL' ? ' active' : '');
        btn.textContent = d === 'ALL' ? t('filterAll') : d;
        btn.style.color = d === 'ALL' ? '#c8d0dc' : (DC[d] || '#556');
        btn.dataset.domain = d;
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = d === 'ALL' ? null : d;
            applyVisibility();
        };
        bar.appendChild(btn);
    });
}

function applyVisibility() {
    if (lpMode) { applyLPVisibility(); return; }
    if (!activeFilter) {
        nodeEls.classed('dimmed', false);
        linkEls.classed('dimmed-link', false);
        refreshFocusCurves();
        return;
    }
    const visible = new Set(allNodes.filter(n => n.domain.includes(activeFilter)).map(n => n.id));
    nodeEls.classed('dimmed', d => !visible.has(d.id));
    linkEls.classed('dimmed-link', d => !(visible.has(d.source.id) && visible.has(d.target.id)));
    refreshFocusCurves();
}

// ===== GRAPH =====
function nc(n) { return DC[n.domain[0]] || '#888' }
function nr(n) { return TYPE_SIZE[n.type] || 6 }
function edgeCurveDirection(edge) {
    const s = String(edge.source.id || edge.source || '');
    const t = String(edge.target.id || edge.target || '');
    let hash = 0;
    const key = s < t ? s + '|' + t : t + '|' + s;
    for (let i = 0; i < key.length; i++) hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
    return hash % 2 === 0 ? 1 : -1;
}

function curvedEdgePath(edge) {
    const sx = edge.source.x ?? 0;
    const sy = edge.source.y ?? 0;
    const tx = edge.target.x ?? 0;
    const ty = edge.target.y ?? 0;
    const dx = tx - sx;
    const dy = ty - sy;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist;
    const ny = dx / dist;
    const baseOffset = Math.min(EDGE_CURVE_MAX_OFFSET, Math.max(EDGE_CURVE_MIN_OFFSET, dist * EDGE_CURVE_DISTANCE_FACTOR));
    const dir = edgeCurveDirection(edge);
    const cx = (sx + tx) * 0.5 + nx * baseOffset * dir;
    const cy = (sy + ty) * 0.5 + ny * baseOffset * dir;
    return `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;
}

function refreshFocusCurves() {
    if (!focusCurveEls || !linkNodeRefs.length) return;
    focusCurveEls
        .classed('active', (d, i) => {
            const baseLink = linkNodeRefs[i];
            if (!baseLink) return false;
            return baseLink.classList.contains('highlight') || baseLink.classList.contains('prereq-path');
        })
        .classed('highlight', (d, i) => {
            const baseLink = linkNodeRefs[i];
            return !!baseLink && baseLink.classList.contains('highlight') && !baseLink.classList.contains('prereq-path');
        })
        .classed('prereq-path', (d, i) => {
            const baseLink = linkNodeRefs[i];
            return !!baseLink && baseLink.classList.contains('prereq-path');
        })
        .attr('marker-end', (d, i) => {
            const baseLink = linkNodeRefs[i];
            return baseLink && baseLink.classList.contains('prereq-path') ? 'url(#arrow)' : null;
        });
}

function buildGraph() {
    const W = window.innerWidth, H = window.innerHeight;
    svgEl = d3.select('#canvas').attr('width', W).attr('height', H);
    g = svgEl.append('g');

    // Defs: gradients + glow filter + arrow marker
    const defs = svgEl.append('defs');
    // Radial gradients per domain color
    Object.entries(DC).forEach(([key, color]) => {
        const grad = defs.append('radialGradient').attr('id', 'grad-' + key);
        grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.9);
        grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.25);
    });
    // Glow filter
    const glow = defs.append('filter').attr('id', 'node-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    glow.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '3').attr('result', 'blur');
    const merge = glow.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');
    // Arrow marker
    defs.append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 20).attr('refY', 5)
        .attr('markerWidth', 6).attr('markerHeight', 6)
        .attr('orient', 'auto-start-reverse')
        .append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z').attr('class', 'arrow-marker');

    let _labelRaf = 0;
    zoomBehavior = d3.zoom().scaleExtent([0.1, 6]).on('zoom', e => {
        g.attr('transform', e.transform);
        currentZoom = e.transform.k;
        if (!_labelRaf) {
            _labelRaf = requestAnimationFrame(() => {
                updateLabelVisibility();
                _labelRaf = 0;
            });
        }
    });
    svgEl.call(zoomBehavior);

    sim = d3.forceSimulation(allNodes)
        .force('link', d3.forceLink(allEdges).id(d => d.id).distance(d => {
            const s = nodeMap[d.source.id || d.source], t = nodeMap[d.target.id || d.target];
            if (s && t && s.type === 'field' && t.type === 'field') return 180;
            if ((s && s.type === 'field') || (t && t.type === 'field')) return 100;
            return 60;
        }).strength(d => {
            const s = nodeMap[d.source.id || d.source], t = nodeMap[d.target.id || d.target];
            if (s && t && s.type === 'field' && t.type === 'field') return 0.3;
            return 0.15;
        }))
        .force('charge', d3.forceManyBody().strength(d => d.type === 'field' ? -600 : -120).theta(0.9))
        .force('center', d3.forceCenter(W / 2, H / 2))
        .force('collision', d3.forceCollide(d => nr(d) + 4))
        .alphaDecay(0.03)
        .alphaMin(0.005)
        .velocityDecay(0.4);

    linkEls = g.append('g').attr('class', 'links').selectAll('line').data(allEdges).enter().append('line')
        .attr('class', d => 'link ' + d.relation_type + (d.pending ? ' pending' : ''));
    linkNodeRefs = linkEls.nodes();

    focusCurveEls = g.append('g').attr('class', 'focus-curves').selectAll('path').data(allEdges).enter().append('path')
        .attr('class', d => 'link focus-curve ' + d.relation_type + (d.pending ? ' pending' : ''));

    nodeEls = g.append('g').attr('class', 'nodes').selectAll('.node').data(allNodes).enter().append('g')
        .attr('class', 'node')
        .call(d3.drag()
            .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
            .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
            .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null }))
        .on('click', (e, d) => { e.stopPropagation(); handleNodeClick(e, d); });

    nodeEls.append('circle')
        .attr('class', 'glow')
        .attr('r', d => nr(d) + 3)
        .style('fill', d => nc(d))
        .style('filter', 'url(#node-glow)');

    nodeEls.append('circle')
        .attr('class', 'core')
        .attr('r', d => nr(d))
        .style('fill', d => `url(#grad-${d.domain[0]})`)
        .style('stroke', d => nc(d));

    nodeEls.append('text')
        .text(d => nodeLabel(d))
        .attr('dy', d => nr(d) + 10)
        .style('font-size', d => d.type === 'field' ? '10px' : '8px')
        .style('fill', d => nc(d))
        .style('opacity', d => d.type === 'field' ? 0.8 : 0);

    // Hover labels
    nodeEls.on('mouseenter', (e, d) => {
        d3.select(e.currentTarget).select('text').style('opacity', 0.9);
    }).on('mouseleave', (e, d) => {
        d3.select(e.currentTarget).select('text').style('opacity', shouldShowLabel(d) ? 0.88 : 0);
    });

    let _tickFrame = null;
    sim.on('tick', () => {
        if (_tickFrame) return;
        _tickFrame = requestAnimationFrame(() => {
            linkEls.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
            if (focusCurveEls) focusCurveEls.attr('d', d => curvedEdgePath(d));
            nodeEls.attr('transform', d => `translate(${d.x},${d.y})`);
            _tickFrame = null;
        });
    });

    svgEl.on('click', () => {
        document.getElementById('panel').classList.remove('open');
        clearHighlights();
    });
}

// ===== SEMANTIC ZOOM =====
function shouldShowLabel(d) {
    if (relatedLabelIds.has(d.id)) return true;
    if (d.type === 'field') return true;
    if (currentZoom > 1.8 && (d.type === 'event' || d.type === 'person')) return true;
    if (currentZoom > 3) return true;
    if (lpMode && (learnedSet.has(d.id) || isAvailable(d.id))) return true;
    return false;
}

function updateLabelVisibility() {
    if (!nodeEls) return;
    nodeEls
        .classed('related-node', d => relatedLabelIds.has(d.id))
        .select('text')
        .style('opacity', d => shouldShowLabel(d) ? 0.88 : 0);
}

function getRelatedNodeIds(nodeId) {
    const ids = new Set([nodeId]);
    for (const edge of allEdges) {
        const sId = edge.source.id || edge.source;
        const tId = edge.target.id || edge.target;
        if (sId === nodeId) ids.add(tId);
        else if (tId === nodeId) ids.add(sId);
    }
    return ids;
}

// ===== NODE CLICK =====
function handleNodeClick(e, d) {
    if (lpMode && e.shiftKey) {
        toggleLearned(d.id);
        return;
    }
    openPanel(d);
    centerViewOnNode(d, 420);
}

function percentile(sortedValues, p) {
    if (!sortedValues.length) return 0;
    const idx = Math.min(sortedValues.length - 1, Math.max(0, Math.floor((sortedValues.length - 1) * p)));
    return sortedValues[idx];
}

function connectedPointsForNode(nodeId) {
    const points = [];
    for (const edge of allEdges) {
        const sId = edge.source.id || edge.source;
        const tId = edge.target.id || edge.target;
        let neighbor = null;
        if (sId === nodeId) neighbor = nodeMap[tId];
        else if (tId === nodeId) neighbor = nodeMap[sId];
        if (!neighbor) continue;
        if (!Number.isFinite(neighbor.x) || !Number.isFinite(neighbor.y)) continue;
        points.push(neighbor);
    }
    return points;
}

function estimateAdaptiveScale(node, availableWidth, availableHeight) {
    const neighbors = connectedPointsForNode(node.id);
    if (!neighbors.length) return Math.max(0.9, Math.min(2.2, currentZoom || 1.2));

    const distances = neighbors
        .map(n => Math.hypot((n.x - node.x), (n.y - node.y)))
        .filter(d => Number.isFinite(d) && d > 0)
        .sort((a, b) => a - b);

    if (!distances.length) return Math.max(0.9, Math.min(2.2, currentZoom || 1.2));

    // Sacrifice far boundary nodes: keep only the nearest neighborhood for framing.
    const nearestCount = Math.max(10, Math.min(28, Math.floor(distances.length * 0.55)));
    const nearestDistances = distances.slice(0, nearestCount);
    const focusRadius = Math.max(28, percentile(nearestDistances, 0.82));
    const targetRadiusPx = Math.min(availableWidth * 0.42, availableHeight * 0.44);
    const nextScale = targetRadiusPx / focusRadius;
    return Math.max(0.95, Math.min(3.6, nextScale));
}

function centerViewOnNode(node, duration = 500) {
    if (!svgEl || !zoomBehavior || !node || Number.isNaN(node.x) || Number.isNaN(node.y)) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const panel = document.getElementById('panel');
    const panelOpen = !!(panel && panel.classList.contains('open') && window.innerWidth > 760);
    const panelWidth = panelOpen ? (panel.getBoundingClientRect().width || 364) : 0;
    const availableWidth = Math.max(260, W - panelWidth);
    const centerX = availableWidth / 2;
    const scale = estimateAdaptiveScale(node, availableWidth, H);
    const transform = d3.zoomIdentity
        .translate(centerX, H / 2)
        .scale(scale)
        .translate(-node.x, -node.y);
    svgEl.transition().duration(duration).call(zoomBehavior.transform, transform);
}

// ===== PANEL =====
function openPanel(d) {
    currentPanelNodeId = d.id;
    navHistory.push(d.id);
    if (navHistory.length > 10) navHistory.shift();
    renderBreadcrumb();

    document.getElementById('p-type').textContent = t(d.type);
    document.getElementById('p-type').style.color = nc(d);
    document.getElementById('p-label').textContent = nodeLabel(d);
    document.getElementById('p-domains').innerHTML = d.domain.map(dm =>
        `<span class="d-badge" style="color:${DC[dm]}">${escHtml(dm)}</span>`
    ).join('');
    document.getElementById('p-desc').innerHTML = renderPanelDescription(d);
    document.getElementById('p-tags').innerHTML = (d.display_tags || []).map((tag) =>
        `<span class="tag">${escHtml(localizeTag(tag))}</span>`
    ).join('');

    // Era display (fixed)
    const era = d.era;
    if (era && era.start != null) {
        const s = era.start < 0 ? `${Math.abs(era.start)} ${t('bce')}` : String(era.start);
        const end = era.end != null ? (era.end < 0 ? `${Math.abs(era.end)} ${t('bce')}` : String(era.end)) : t('present');
        document.getElementById('p-era').textContent = `${t('era')}: ${s} \u2014 ${end}`;
    } else {
        document.getElementById('p-era').textContent = '';
    }

    document.getElementById('p-search').href = 'https://www.google.com/search?q=' + encodeURIComponent(nodeLabel(d));
    updatePanelLearningControls(d);

    // Prerequisites & Unlocks
    const parents = (prereqGraph.parents[d.id] || []).map(id => nodeMap[id]).filter(Boolean);
    const children = (prereqGraph.children[d.id] || []).map(id => nodeMap[id]).filter(Boolean);

    const prereqSection = document.getElementById('p-prereqs');
    const unlockSection = document.getElementById('p-unlocks');

    if (parents.length || children.length) {
        prereqSection.style.display = 'block';
        unlockSection.style.display = 'block';
        document.getElementById('p-prereq-list').innerHTML = parents.length
            ? parents.map(n => connItem(n, 'prerequisite', false)).join('')
            : `<div style="font-size:10px;color:#334;padding:2px 0">${t('noneFoundational')}</div>`;
        document.getElementById('p-unlock-list').innerHTML = children.length
            ? children.map(n => connItem(n, 'unlocks', false)).join('')
            : `<div style="font-size:10px;color:#334;padding:2px 0">${t('noneDetected')}</div>`;
    } else {
        prereqSection.style.display = 'none';
        unlockSection.style.display = 'none';
    }

    // All connections
    const conns = (d.connections || []).map(c => {
        const o = nodeMap[c.target];
        return { node: o, rel: c.relation_type, pending: c.pending };
    }).filter(c => c.node);

    document.getElementById('p-conn-list').innerHTML = conns.map(c =>
        connItem(c.node, c.rel, c.pending)
    ).join('');

    document.getElementById('panel').classList.add('open');

    // Highlight
    clearHighlights();
    relatedLabelIds = getRelatedNodeIds(d.id);
    updateLabelVisibility();
    if (lpMode) {
        highlightPrereqChain(d.id);
    } else {
        linkEls.classed('highlight', l => (l.source.id === d.id || l.target.id === d.id));
    }
    refreshFocusCurves();
}

function connItem(node, rel, pending) {
    const cls = pending ? 'ci cp' : (rel === 'prerequisite' || rel === 'unlocks' ? 'ci ci-prereq' : 'ci');
    const relLabel = t(rel) || escHtml(rel);
    const pendingLabel = pending ? ` (${t('pending')})` : '';
    return `<div class="${cls}" data-node-id="${escAttr(node.id)}"><div class="cd" style="background:${nc(node)}"></div><span>${escHtml(nodeLabel(node))}${pendingLabel}</span><span class="cr" style="color:${RC[rel] || '#f0c050'}">${relLabel}</span></div>`;
}

function renderBreadcrumb() {
    const el = document.getElementById('p-breadcrumb');
    if (currentPanelNodeId === 'machine_learning_concept') {
        const mlPath = [
            { id: 'computer_science_field', label: 'Computer Science' },
            { id: 'artificial_intelligence_concept', label: 'Artificial Intelligence' },
            { id: 'machine_learning_concept', label: 'Machine Learning' },
        ];
        el.innerHTML = mlPath.map((item, i) => {
            const sep = i < mlPath.length - 1 ? '<span class="bc-sep">\u203a</span>' : '';
            return `<span class="bc-item" data-node-id="${escAttr(item.id)}">${escHtml(item.label)}</span>${sep}`;
        }).join('');
        return;
    }
    const last5 = navHistory.slice(-5);
    el.innerHTML = last5.map((id, i) => {
        const n = nodeMap[id];
        if (!n) return '';
        const sep = i < last5.length - 1 ? '<span class="bc-sep">\u203a</span>' : '';
        return `<span class="bc-item" data-node-id="${escAttr(id)}">${escHtml(nodeLabel(n))}</span>${sep}`;
    }).join('');
}

function getNextRecommendedNodeId(currentNodeId) {
    const childIds = prereqGraph.children[currentNodeId] || [];
    const childCandidates = childIds
        .map(id => nodeMap[id])
        .filter(Boolean)
        .filter(node => isAvailable(node.id) && !learnedSet.has(node.id))
        .sort((a, b) => {
            const unlockA = (prereqGraph.children[a.id] || []).length;
            const unlockB = (prereqGraph.children[b.id] || []).length;
            return unlockB - unlockA || nodeLabel(a).localeCompare(nodeLabel(b));
        });

    if (childCandidates.length) {
        return childCandidates[0].id;
    }

    if (!learnedSet.has(currentNodeId) && isAvailable(currentNodeId)) {
        return currentNodeId;
    }

    return null;
}

function updatePanelLearningControls(node) {
    const lpBtn = document.getElementById('p-lp-action');
    const nextStepEl = document.getElementById('p-next-step');
    if (!lpBtn || !nextStepEl || !node) return;

    const learned = learnedSet.has(node.id);
    lpBtn.dataset.nodeId = node.id;
    lpBtn.textContent = learned ? t('removeFromLearningPath') : t('addToLearningPath');
    lpBtn.classList.toggle('is-learned', learned);

    if (!lpMode) {
        nextStepEl.textContent = t('nextStepWillAppear');
        return;
    }

    const nextId = getNextRecommendedNodeId(node.id);
    if (nextId) {
        if (nextId === node.id) {
            nextStepEl.textContent = `${t('nextStepLabel')}: ${t('nextStepReady')}`;
            return;
        }
        const nextNode = nodeMap[nextId];
        nextStepEl.innerHTML = `${escHtml(t('nextStepLabel'))}: <span class="next-link" data-node-id="${escAttr(nextNode.id)}">${escHtml(nodeLabel(nextNode))}</span>`;
        return;
    }

    nextStepEl.textContent = learned ? t('learningComplete') : t('nextStepLocked');
}

// ===== LEARNING PATH MODE =====
function setupLPMode() {
    const btn = document.getElementById('lp-btn');
    const toggle = () => {
        lpMode = !lpMode;
        btn.classList.toggle('active', lpMode);
        btn.setAttribute('aria-pressed', String(lpMode));
        document.getElementById('learned-info').style.display = lpMode ? 'block' : 'none';
        if (lpMode) {
            applyLPVisibility();
        } else {
            clearLPState();
            applyVisibility();
        }
        updateLabelVisibility();
        updateLearnedInfo();
        if (currentPanelNodeId && nodeMap[currentPanelNodeId]) {
            updatePanelLearningControls(nodeMap[currentPanelNodeId]);
        }
    };
    btn.onclick = toggle;
    btn.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
        }
    };
}

function applyLPVisibility() {
    const prereqNodes = new Set();
    for (const e of prereqEdges) {
        prereqNodes.add(e.source);
        prereqNodes.add(e.target);
    }

    nodeEls.classed('dimmed', d => !prereqNodes.has(d.id) && !learnedSet.has(d.id));
    linkEls.classed('dimmed-link', true).classed('prereq-path', false).attr('marker-end', null);

    // Show prereq edges with arrows
    linkEls.each(function (d) {
        const sId = d.source.id || d.source;
        const tId = d.target.id || d.target;
        const isPrereq = prereqEdges.some(pe =>
            (pe.source === sId && pe.target === tId) ||
            (pe.source === tId && pe.target === sId)
        );
        if (isPrereq) {
            d3.select(this).classed('dimmed-link', false).classed('prereq-path', true)
                .attr('marker-end', 'url(#arrow)');
        }
    });

    nodeEls.classed('learned', d => learnedSet.has(d.id));
    nodeEls.classed('available', d => isAvailable(d.id));
    updateLabelVisibility();
    refreshFocusCurves();
}

function clearLPState() {
    nodeEls.classed('learned', false).classed('available', false).classed('on-path', false);
    linkEls.classed('prereq-path', false).classed('dimmed-link', false).attr('marker-end', null);
    refreshFocusCurves();
}

function toggleLearned(id) {
    if (learnedSet.has(id)) learnedSet.delete(id);
    else learnedSet.add(id);
    applyLPVisibility();
    updateLearnedInfo();
    saveLearningProgress(id);
    if (currentPanelNodeId && nodeMap[currentPanelNodeId]) {
        updatePanelLearningControls(nodeMap[currentPanelNodeId]);
    }
}

// --- Learning Progress Persistence ---
async function loadLearningProgress() {
    // Prefer local state as baseline, then merge server state when available.
    const localLearned = window.NexusState.loadStoredLearned('nexus-learned', nodeMap);
    learnedSet = new Set(localLearned);

    try {
        const data = await window.NexusApi.fetchLearningProgress();
        if (data) {
            const serverLearned = (data.learned || []).filter(id => isSafeNodeId(id) && nodeMap[id]);
            for (const id of serverLearned) {
                learnedSet.add(id);
            }
            window.NexusState.saveStoredLearned('nexus-learned', learnedSet);
            return;
        }
    } catch (e) { /* API unavailable */ }
}

function saveLearningProgress(toggledId) {
    // Save to localStorage immediately
    try {
        window.NexusState.saveStoredLearned('nexus-learned', learnedSet);
    } catch (e) { }
    // Sync to backend (fire-and-forget)
    window.NexusApi.postLearningToggle(toggledId).catch(() => { });
}

function isAvailable(id) {
    if (learnedSet.has(id)) return false;
    const parents = prereqGraph.parents[id];
    if (!parents || parents.length === 0) {
        // Root node in prereq graph — available if it has children (is part of prereq graph)
        return (prereqGraph.children[id] || []).length > 0;
    }
    return parents.every(p => learnedSet.has(p));
}

function updateLearnedInfo() {
    const el = document.getElementById('learned-info');
    if (!lpMode) { el.style.display = 'none'; return; }
    const availableNodes = allNodes.filter(n => isAvailable(n.id) && !learnedSet.has(n.id));
    const avail = availableNodes.length;
    const next = availableNodes
        .sort((a, b) => {
            const unlockA = (prereqGraph.children[a.id] || []).length;
            const unlockB = (prereqGraph.children[b.id] || []).length;
            return unlockB - unlockA || nodeLabel(a).localeCompare(nodeLabel(b));
        })[0];
    const nextText = next ? `${t('nextStepLabel')}: ${nodeLabel(next)}` : t('learningComplete');
    el.textContent = `\u2713 ${learnedSet.size} ${t('learned')} \u00b7 ${avail} ${t('available')} \u00b7 ${nextText}`;
    el.style.display = 'block';
}

function highlightPrereqChain(id) {
    const ancestors = new Set();
    const descendants = new Set();

    function findAncestors(nid) {
        for (const p of (prereqGraph.parents[nid] || [])) {
            if (!ancestors.has(p)) { ancestors.add(p); findAncestors(p); }
        }
    }
    function findDescendants(nid) {
        for (const c of (prereqGraph.children[nid] || [])) {
            if (!descendants.has(c)) { descendants.add(c); findDescendants(c); }
        }
    }

    findAncestors(id);
    findDescendants(id);

    const onPath = new Set([...ancestors, ...descendants, id]);
    nodeEls.classed('on-path', d => onPath.has(d.id));

    linkEls.each(function (d) {
        const sId = d.source.id || d.source;
        const tId = d.target.id || d.target;
        const isOnChain = prereqEdges.some(pe =>
            (onPath.has(pe.source) && onPath.has(pe.target)) &&
            ((pe.source === sId && pe.target === tId) || (pe.source === tId && pe.target === sId))
        );
        if (isOnChain) d3.select(this).classed('prereq-path', true);
    });
    refreshFocusCurves();
}

function clearHighlights() {
    linkEls.classed('highlight', false);
    nodeEls.classed('on-path', false);
    relatedLabelIds = new Set();
    updateLabelVisibility();
    if (!lpMode) linkEls.classed('prereq-path', false);
    refreshFocusCurves();
}

// ===== SEARCH (fixed: event delegation, no XSS) =====
function setupSearch() {
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    let latestMatches = [];

    const rankMatches = (q) => {
        const index = _searchIndex || [];
        const scored = [];
        for (let i = 0; i < index.length; i++) {
            const entry = index[i];
            const n = entry.node;
            // Also check localized label if available
            const localLabel = (LANG !== 'en' && labelMap[n.id]) ? labelMap[n.id].toLowerCase() : '';
            let score = 0;

            if (entry.label === q || entry.id === q || localLabel === q) score = 120;
            else if (entry.label.startsWith(q) || entry.id.startsWith(q) || (localLabel && localLabel.startsWith(q))) score = 90;
            else if (entry.label.includes(q) || entry.id.includes(q) || (localLabel && localLabel.includes(q))) score = 70;
            else if (entry.tags.includes(q)) score = 55;
            else if (entry.desc.includes(q)) score = 35;

            if (!score && entry.domains.some(d => d === q)) {
                score = 50;
            }

            if (score > 0) {
                scored.push({ n, score });
            }
        }
        scored.sort((a, b) => b.score - a.score || nodeLabel(a.n).localeCompare(nodeLabel(b.n)));
        return scored.slice(0, 12).map(item => item.n);
    };

    const hideResults = () => {
        results.style.display = 'none';
        results.setAttribute('aria-hidden', 'true');
        input.setAttribute('aria-expanded', 'false');
        latestMatches = [];
    };

    const showNoResults = () => {
        results.style.display = 'block';
        results.setAttribute('aria-hidden', 'false');
        input.setAttribute('aria-expanded', 'true');
        results.innerHTML = `<div class="sr" style="opacity:0.75;color:#8fa0b8;cursor:default;line-height:1.5">${escHtml(t('searchNoResults'))}</div>`;
    };

    const showMatches = (matches) => {
        results.style.display = 'block';
        results.setAttribute('aria-hidden', 'false');
        input.setAttribute('aria-expanded', 'true');
        results.innerHTML = [
            `<div class="sr" style="opacity:0.6;color:#8fa0b8;cursor:default;font-size:10px;letter-spacing:0.04em">${escHtml(t('searchTopHint'))}</div>`,
            ...matches.map((n) =>
                `<div class="sr" style="color:${nc(n)}" data-node-id="${escAttr(n.id)}">${escHtml(nodeLabel(n))} <span style="opacity:0.4;font-size:9px">${escHtml(n.type)}</span></div>`
            )
        ].join('');
    };

    let _searchTimer = 0;
    input.addEventListener('input', () => {
        clearTimeout(_searchTimer);
        const q = input.value.toLowerCase().trim();
        if (q.length < 2) { hideResults(); return; }
        _searchTimer = setTimeout(() => {
            const matches = rankMatches(q);
            latestMatches = matches;
            if (!matches.length) {
                showNoResults();
                return;
            }
            showMatches(matches);
        }, 120);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const top = latestMatches[0];
            if (top) {
                e.preventDefault();
                focusNode(top.id);
                hideResults();
                input.value = '';
            }
        }
        if (e.key === 'Escape') {
            hideResults();
        }
    });

    // mousedown fires before blur — avoids race condition
    results.addEventListener('mousedown', (e) => {
        const sr = e.target.closest('.sr');
        if (!sr) return;
        e.preventDefault();
        const id = sr.dataset.nodeId;
        if (id) { focusNode(id); hideResults(); input.value = ''; }
    });

    input.addEventListener('blur', () => setTimeout(hideResults, 150));
}

// ===== EVENT DELEGATION for panel clicks =====
document.addEventListener('click', (e) => {
    const ci = e.target.closest('[data-node-id]');
    if (ci && (ci.closest('#p-conn-list') || ci.closest('#p-prereq-list') || ci.closest('#p-unlock-list') || ci.closest('#p-breadcrumb') || ci.closest('#p-next-step'))) {
        focusNode(ci.dataset.nodeId);
    }
});

const panelLpActionBtn = document.getElementById('p-lp-action');
if (panelLpActionBtn) {
    panelLpActionBtn.addEventListener('click', () => {
        const id = panelLpActionBtn.dataset.nodeId;
        if (!id || !nodeMap[id]) return;
        toggleLearned(id);
    });
}

// ===== FOCUS NODE =====
function focusNode(id) {
    if (!isSafeNodeId(id)) return;
    const d = allNodes.find(n => n.id === id);
    if (d) {
        openPanel(d);
        centerViewOnNode(d, 500);
    }
}

// ===== CLOSE PANEL =====
document.getElementById('close').onclick = () => {
    document.getElementById('panel').classList.remove('open');
    clearHighlights();
    if (lpMode) applyLPVisibility();
};

// ===== UTILITIES =====
function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function escAttr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

// ===== URL PARAMS =====
function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const nodeId = params.get('node');
    const searchQuery = params.get('search');

    if (nodeId && isSafeNodeId(nodeId) && nodeMap[nodeId]) {
        setTimeout(() => focusNode(nodeId), 600);
    } else if (searchQuery && searchQuery.length <= 120) {
        const input = document.getElementById('search-input');
        input.value = searchQuery;
        input.dispatchEvent(new Event('input'));
    }
}

// ===== START =====
init().then(() => handleUrlParams());

// ===== PARTICLE BACKGROUND (lazy loaded) =====
import('./particles.js').catch(() => {/* non-critical */ });
