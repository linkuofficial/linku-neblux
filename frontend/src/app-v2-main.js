import { createRendererV2 } from './engine-v2/index.js';
import { I18N, getLang, isValidLang, TAG_LABELS } from './i18n.js';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#v2-canvas');
const status = $('#v2-status');
const card = $('#v2-card');
const search = $('#v2-search');
const searchInput = $('#v2-search-input');
const searchResults = $('#v2-search-results');
const domainRoot = $('#v2-domains');
const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
// Production domain palette — same source of truth as app.html (neblux-tokens.js).
const DOMAIN_COLORS = (window.NebluxTokens && window.NebluxTokens.DOMAIN_COLORS) || {
    MAT: '#5b9bd5', PHY: '#c97a5b', CHE: '#c9c05b', BIO: '#5bc97a',
    MED: '#5bc9b8', ENG: '#9b7bc9', TEC: '#c95b9b', SOC: '#c9a05a',
    HUM: '#7ba5c9', PHI: '#9bc95b', ART: '#c95b5b', HIS: '#a07850',
};
const renderer = createRendererV2({
    canvas,
    reducedMotion: reducedMotionQuery.matches,
    // The engine defaults already carry the Deep Field look (production
    // palette, gold accents, mono labels, nebula/vignette). Page-specific:
    // a transparent canvas lets the body's layered gradients show through,
    // and the palette follows neblux-tokens.js when it is present.
    tokens: {
        background: 'rgba(0, 0, 0, 0)',
        colors: { ...DOMAIN_COLORS, default: '#888888' },
    },
});

let canonical = null;
let appReady = false;
let interaction = null;
let nodeById = new Map();
let detailById = new Map();
let degreeById = new Map();
let prerequisite = { parents: {}, children: {} };
let activeDomain = null;
let selectedId = null;
let descriptions = {};
let englishSections = {};
let localeSections = {};
let labelMap = {};
let depthIndex = null;
let portalIndex = null;
let constellationIndex = null;
let mainPresentation = null;
let constellationOverrides = null;
let activeConstellation = null;
let hoveredConstellationId = null;
let lang = getLang();
let learned = new Set();
let learningMode = false;
let sceneMounted = false;
let keyboardNodeId = null;
let dragging = false;
let lastPointer = null;
let dragStart = null;
let dragDistance = 0;
let hoveredId = null;
let languageRequest = 0;
let searchMatches = [];
let searchActiveIndex = -1;
let navHistory = [];
let cameraAnimationFrame = null;
let cameraAnimationToken = 0;
const activePointers = new Map();
let pinchState = null;
let gestureWasPinch = false;
const NAV_HISTORY_STORAGE_KEY = 'neblux-v2-nav-history';
const LEARNED_STORAGE_KEY = 'neblux-learned';
const LEARNING_MODE_STORAGE_KEY = 'neblux-learning-mode';
const LEARNING_STATE_VERSION_STORAGE_KEY = 'neblux-learning-state-version';
const LEARNING_STATE_VERSION = '2';

const UI = {
    en: { all: 'All', find: 'Find', searching: 'Find a concept', retry: 'Retry', connections: 'Connections', prerequisites: 'Prerequisites', unlocks: 'Unlocks', stations: 'Wonder stations', depth: 'Depth', elsewhere: 'Elsewhere in Neblux', invalid: 'The requested view is unavailable; showing the overview.', learningMode: 'Learning Path', learningModeOn: 'Learning Path on', learningAdd: 'Add to Learning Path', learningRemove: 'Remove from Learning Path', learningNext: 'Next: {name}', learningComplete: 'Learning path complete.' },
    zh: { all: '全部', find: '搜尋', searching: '尋找概念', retry: '重試', connections: '連結', prerequisites: '先備概念', unlocks: '延伸概念', stations: '驚奇之旅站點', depth: '深入觀測', elsewhere: 'Neblux 其他入口', invalid: '指定內容無法使用，已顯示總覽。', learningMode: '學習路徑', learningModeOn: '學習路徑開啟', learningAdd: '加入學習路徑', learningRemove: '從學習路徑移除', learningNext: '下一步：{name}', learningComplete: '學習路徑已完成。' },
    ja: { all: 'すべて', find: '検索', searching: '概念を探す', retry: '再試行', connections: 'つながり', prerequisites: '前提となる概念', unlocks: '次に開ける概念', stations: 'Wonder のステーション', depth: 'Depth', elsewhere: 'Neblux のほかの場所', invalid: '指定した内容は利用できません。全体表示に戻りました。', learningMode: '学習パス', learningModeOn: '学習パス表示中', learningAdd: '学習パスに追加', learningRemove: '学習パスから外す', learningNext: '次：{name}', learningComplete: '学習パスを完了しました。' },
};
function text(key) { return UI[lang]?.[key] || UI.en[key] || key; }
function i18n(key) { return I18N[lang]?.[key] || I18N.en?.[key] || key; }
function nodeLabel(node) { return lang !== 'en' && labelMap[node.id] ? labelMap[node.id] : node.label; }
function tagLabel(tag) { return TAG_LABELS[lang]?.[tag] || String(tag).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function domainName(domain) { return I18N[lang]?.[`domain${domain}`] || domain; }
function eraLabel(era) {
    if (!era || era.start == null) return '';
    const year = (value) => value < 0 ? `${Math.abs(value)} ${i18n('bce')}` : String(value);
    return `${i18n('era')}: ${year(era.start)} — ${era.end != null ? year(era.end) : i18n('present')}`;
}
function sectionLabel(kind, type) {
    const person = type === 'person'; const event = type === 'event';
    const labels = {
        lead: { en: 'In precise terms', zh: '更精確地說', ja: 'より正確に言うと' },
        core: { en: person ? 'Key contributions' : event ? 'What led to it' : 'The core idea', zh: person ? '主要貢獻' : event ? '背景與起因' : '核心概念', ja: person ? '主な業績' : event ? '背景と原因' : '核心概念' },
        works: { en: person ? 'Notable works & ideas' : event ? 'Key moments' : 'Key examples', zh: person ? '代表著作與貢獻' : event ? '經過與關鍵時刻' : '代表案例', ja: person ? '代表的な著作・業績' : event ? '経過と主な出来事' : '代表例' },
        impact: { en: person ? 'Legacy' : event ? 'Aftermath' : 'What it changed', zh: person ? '影響與遺產' : event ? '後續影響' : '改變了什麼', ja: person ? '影響と遺産' : event ? 'その後の影響' : '変えたもの' },
        links: { en: 'Connections across fields', zh: '跨領域連結', ja: '分野とのつながり' },
    };
    return labels[kind]?.[lang] || labels[kind]?.en || kind;
}
function viewport() { const rect = canvas.getBoundingClientRect(); return { width: Math.max(1, rect.width), height: Math.max(1, rect.height), dpr: Math.min(2, devicePixelRatio || 1) }; }
function screenPos(node) { const camera = renderer.getCamera(); const view = viewport(); return { x: (node.x - camera.x) * camera.zoom + view.width / 2, y: (node.y - camera.y) * camera.zoom + view.height / 2 }; }
function screenToWorld(point, camera = renderer.getCamera()) { const view = viewport(); return { x: (point.x - view.width / 2) / camera.zoom + camera.x, y: (point.y - view.height / 2) / camera.zoom + camera.y }; }
function sceneBounds() {
    const nodes = canonical?.nodes || [];
    if (!nodes.length) return null;
    return nodes.reduce((bounds, node) => ({
        minX: Math.min(bounds.minX, node.x), maxX: Math.max(bounds.maxX, node.x),
        minY: Math.min(bounds.minY, node.y), maxY: Math.max(bounds.maxY, node.y),
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
}
function overviewCamera({ panelAware = !card.hidden } = {}) {
    const bounds = sceneBounds();
    if (!bounds) return { x: 0, y: 0, zoom: 1 };
    const view = viewport();
    const mobile = matchMedia('(max-width: 760px)').matches;
    const insets = mobile
        ? { left: 20, right: 20, top: 148, bottom: 76 }
        : { left: 36, right: panelAware ? 384 : 36, top: 82, bottom: 74 };
    const usableWidth = Math.max(80, view.width - insets.left - insets.right);
    const usableHeight = Math.max(80, view.height - insets.top - insets.bottom);
    const width = Math.max(1, bounds.maxX - bounds.minX);
    const height = Math.max(1, bounds.maxY - bounds.minY);
    const zoom = Math.max(.18, Math.min(8, Math.min(usableWidth / width, usableHeight / height)));
    const usableCenter = { x: insets.left + usableWidth / 2, y: insets.top + usableHeight / 2 };
    return {
        x: (bounds.minX + bounds.maxX) / 2 - (usableCenter.x - view.width / 2) / zoom,
        y: (bounds.minY + bounds.maxY) / 2 - (usableCenter.y - view.height / 2) / zoom,
        zoom,
    };
}
function constellationList() {
    const source = constellationOverrides || constellationIndex?.tours || {};
    const items = Array.isArray(source) ? source : Object.entries(source).map(([id, tour]) => ({ id, ...tour }));
    return items.map((tour) => {
        const nodeIds = (tour.nodeIds || tour.steps || []).filter((id) => nodeById.has(id));
        return { id: tour.id, nodeIds, segments: Array.isArray(tour.segments) && tour.segments.length ? tour.segments : nodeIds.slice(1).map((target, index) => ({ source: nodeIds[index], target })), name: tour.name || tour.title?.[lang] || tour.title?.en || tour.id, accent: tour.accent || null };
    }).filter((tour) => tour.id && tour.nodeIds.length);
}
function currentConstellation() { return constellationList().find((tour) => tour.id === activeConstellation) || null; }
function currentLearningChain() {
    const members = new Set();
    const visit = (id) => {
        if (!nodeById.has(id) || members.has(id)) return;
        members.add(id);
        for (const parent of prerequisite.parents[id] || []) visit(parent);
    };
    if (selectedId) visit(selectedId);
    return members;
}
function learningVisualState() {
    const chain = currentLearningChain();
    return { enabled: learningMode, hasContext: learningMode && chain.size > 0, chain };
}
function learningSegments() {
    const state = learningVisualState();
    if (!state.hasContext) return [];
    const { chain } = state;
    const segments = [];
    for (const [target, parents] of Object.entries(prerequisite.parents)) {
        const targetAvailable = isAvailable(target) && !learned.has(target);
        for (const source of parents) {
            const onChain = chain.has(source) && chain.has(target);
            const onFrontier = learned.has(source) && targetAvailable;
            if (onChain || onFrontier) segments.push({ source, target, onChain, active: onChain });
        }
    }
    return segments;
}
function uiSafeRects() {
    const canvasRect = canvas.getBoundingClientRect();
    const selectors = ['.v2-brand', '#v2-search', '#v2-domains', '#v2-languages', '.v2-controls', '#v2-status', '#v2-retry', '#v2-fallback', '#v2-card'];
    return selectors.map((selector) => document.querySelector(selector)).filter((element) => element && !element.hidden).map((element) => {
        const rect = element.getBoundingClientRect();
        const x = Math.max(0, rect.left - canvasRect.left); const y = Math.max(0, rect.top - canvasRect.top);
        const right = Math.min(canvasRect.width, rect.right - canvasRect.left); const bottom = Math.min(canvasRect.height, rect.bottom - canvasRect.top);
        return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
    }).filter((rect) => rect.width > 0 && rect.height > 0);
}
function updatePresentation() {
    const constellations = constellationList();
    const learning = learningVisualState();
    renderer.setPresentation({
        bundles: mainPresentation?.bundles || [],
        guidedSegments: currentConstellation()?.segments || [],
        constellations,
        learningSegments: learningSegments(),
        activeConstellationId: activeConstellation,
        hoveredConstellationId,
        safeRects: uiSafeRects(),
        learning: { enabled: learning.enabled, hasContext: learning.hasContext, chainNodeIds: [...learning.chain] },
    });
}
function section(root, title, entries, onPick) {
    root.replaceChildren(); root.hidden = !entries.length;
    if (!entries.length) return;
    const box = document.createElement('section'); const heading = document.createElement('h3'); heading.textContent = title; const list = document.createElement('ul');
    for (const entry of entries) { const item = document.createElement('li'); const button = document.createElement('button'); button.type = 'button'; button.textContent = entry.label; button.addEventListener('click', () => onPick(entry)); item.append(button); list.append(item); }
    box.append(heading, list); root.append(box);
}
function appendParagraph(root, value, className = '') {
    if (!value) return;
    const paragraph = document.createElement('p'); paragraph.textContent = value; if (className) paragraph.className = className; root.append(paragraph);
}
function appendDescriptionDetails(root, title, content) {
    const details = document.createElement('details'); details.className = 'v2-description-section';
    const summary = document.createElement('summary'); summary.textContent = title;
    const body = document.createElement('div'); body.className = 'v2-description-section__body';
    content(body); details.append(summary, body); root.append(details);
}
function nodeSections(node) {
    const english = englishSections[node.id] || null;
    const localized = lang === 'en' ? null : localeSections[node.id];
    if (!english && !localized) return null;
    return { ...(english || {}), ...(localized || {}), links: localized?.links || english?.links || [] };
}
function renderDescription(node) {
    const root = $('#v2-card-description'); root.replaceChildren();
    const detail = detailById.get(node.id) || node;
    const structured = nodeSections(node);
    if (!structured) {
        appendParagraph(root, descriptions[node.id] || 'Description is unavailable.', 'v2-description-lead');
        return;
    }
    if (structured.spark) {
        appendParagraph(root, structured.spark, 'v2-description-lead v2-description-spark');
        if (structured.lead) appendDescriptionDetails(root, sectionLabel('lead', detail.type || node.type), (body) => appendParagraph(body, structured.lead));
    } else {
        appendParagraph(root, structured.lead || descriptions[node.id] || 'Description is unavailable.', 'v2-description-lead');
    }
    if (structured.core) appendDescriptionDetails(root, sectionLabel('core', detail.type || node.type), (body) => appendParagraph(body, structured.core));
    if (Array.isArray(structured.works) && structured.works.length) appendDescriptionDetails(root, sectionLabel('works', detail.type || node.type), (body) => {
        const list = document.createElement('ul'); for (const item of structured.works) { const entry = document.createElement('li'); entry.textContent = item; list.append(entry); } body.append(list);
    });
    if (structured.impact) appendDescriptionDetails(root, sectionLabel('impact', detail.type || node.type), (body) => appendParagraph(body, structured.impact));
    if (Array.isArray(structured.links) && structured.links.length) appendDescriptionDetails(root, sectionLabel('links', detail.type || node.type), (body) => {
        const list = document.createElement('ul');
        for (const link of structured.links) { const item = document.createElement('li'); const domain = document.createElement('span'); domain.className = 'v2-description-domain'; domain.textContent = domainName(link.d); domain.style.color = DOMAIN_COLORS[link.d] || 'var(--panel-ink)'; item.append(domain, document.createTextNode(` ${link.t || ''}`)); list.append(item); }
        body.append(list);
    });
}
function saveNavHistory() { try { sessionStorage.setItem(NAV_HISTORY_STORAGE_KEY, JSON.stringify(navHistory.slice(-10))); } catch {} }
function loadNavHistory() { try { const saved = JSON.parse(sessionStorage.getItem(NAV_HISTORY_STORAGE_KEY) || '[]'); navHistory = Array.isArray(saved) ? saved.filter((id) => typeof id === 'string' && nodeById.has(id)).slice(-10) : []; } catch { navHistory = []; } }
function rememberNode(id) { navHistory = navHistory.filter((entry) => entry !== id); navHistory.push(id); if (navHistory.length > 10) navHistory.shift(); saveNavHistory(); }
function renderBreadcrumb() {
    const root = $('#v2-card-breadcrumb'); root.replaceChildren(); const recent = navHistory.slice(-3).map((id) => nodeById.get(id)).filter(Boolean); root.hidden = !recent.length;
    if (navHistory.length > 3) { const ellipsis = document.createElement('span'); ellipsis.textContent = '…'; ellipsis.setAttribute('aria-hidden', 'true'); root.append(ellipsis); }
    for (const [index, node] of recent.entries()) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = nodeLabel(node); button.setAttribute('aria-current', index === recent.length - 1 ? 'page' : 'false'); button.addEventListener('click', () => focusNode(node.id)); root.append(button);
        if (index < recent.length - 1) { const separator = document.createElement('span'); separator.textContent = '›'; separator.setAttribute('aria-hidden', 'true'); root.append(separator); }
    }
}
function updateScene() {
    if (!canonical) return;
    const related = selectedId ? new Set((detailById.get(selectedId)?.connections || []).filter((edge) => !edge.pending).map((edge) => edge.target)) : new Set();
    const constellationMembers = activeConstellation ? new Set(currentConstellation()?.nodeIds || []) : null;
    const learning = learningVisualState();
    const learningFrontier = new Set(learning.hasContext ? (prerequisite.children[selectedId] || []).filter((id) => isAvailable(id) && !learned.has(id)) : []);
    const visualNodes = canonical.nodes.map((node) => {
        const overlays = [];
        if (activeDomain && !node.domains.includes(activeDomain)) overlays.push('filtered');
        if (learning.hasContext && learned.has(node.id) && learning.chain.has(node.id)) overlays.push('learned');
        else if (learning.hasContext && (node.id === selectedId || learningFrontier.has(node.id)) && isAvailable(node.id)) overlays.push('available');
        if (selectedId === node.id) overlays.push('selected');
        else if (related.has(node.id) || (constellationMembers && constellationMembers.has(node.id))) overlays.push('related');
        // Focus owns the scene: with a selection or constellation active the
        // rest of the sky recedes (the production dim-others behaviour).
        else if (constellationMembers || selectedId || (learning.hasContext && !learning.chain.has(node.id) && !learningFrontier.has(node.id))) overlays.push('dimmed');
        return { ...node, label: nodeLabel(node), overlays };
    });
    if (!sceneMounted || typeof renderer.setNodeVisuals !== 'function') {
        renderer.setScene({ ...canonical, nodes: visualNodes });
        sceneMounted = true;
    } else {
        renderer.setNodeVisuals(visualNodes);
    }
    syncInteraction();
    updatePresentation();
    renderer.renderNow();
}
function syncInteraction() { renderer.setInteraction({ focusedNodeId: selectedId, keyboardNodeId, hoveredNodeId: hoveredId, activeConstellationId: activeConstellation, hoveredConstellationId }); }
function setCardVisible(visible) {
    card.hidden = !visible;
    document.body.classList.toggle('v2-panel-open', visible);
}
function setHoveredNode(nodeId) {
    if (hoveredId === nodeId) return;
    hoveredId = nodeId;
    syncInteraction();
    canvas.style.cursor = nodeId ? 'pointer' : 'grab';
    renderer.renderNow();
}
function setHoveredConstellation(id) {
    if (hoveredConstellationId === id) return;
    hoveredConstellationId = id;
    syncInteraction(); updatePresentation();
    canvas.style.cursor = id ? 'pointer' : 'grab';
    renderer.renderNow();
}
function stopCameraAnimation() {
    cameraAnimationToken += 1;
    if (cameraAnimationFrame != null) cancelAnimationFrame(cameraAnimationFrame);
    cameraAnimationFrame = null;
}
function animateCamera(next, duration = 500) {
    stopCameraAnimation();
    const from = renderer.getCamera();
    const target = { ...from, ...next };
    if (reducedMotionQuery.matches || duration <= 0) {
        renderer.setCamera(target); renderer.renderNow(); return;
    }
    const token = cameraAnimationToken;
    const started = performance.now();
    const step = (now) => {
        if (token !== cameraAnimationToken) return;
        const t = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        renderer.setCamera({
            x: from.x + (target.x - from.x) * eased,
            y: from.y + (target.y - from.y) * eased,
            zoom: from.zoom + (target.zoom - from.zoom) * eased,
        });
        renderer.renderNow();
        if (t < 1) cameraAnimationFrame = requestAnimationFrame(step);
        else cameraAnimationFrame = null;
    };
    cameraAnimationFrame = requestAnimationFrame(step);
}
function showOverview({ writeUrl = false, resetCamera = false, animate = true } = {}) {
    selectedId = null;
    activeConstellation = null;
    hoveredId = null;
    hoveredConstellationId = null;
    // Reset closes the detail card before measuring: the overview uses the
    // whole canvas, while a panel-aware fit remains available for callers
    // that intentionally keep the card open.
    setCardVisible(false);
    updateScene();
    if (resetCamera) {
        const target = overviewCamera({ panelAware: false });
        if (animate) animateCamera(target); else { stopCameraAnimation(); renderer.setCamera(target); renderer.renderNow(); }
    }
    if (writeUrl) setUrl({ node: null, constellation: null, search: null });
    renderer.renderNow();
}
function setUrl(next, mode = 'push') { const url = new URL(location.href); for (const [key, value] of Object.entries(next)) { if (value == null || value === '') url.searchParams.delete(key); else url.searchParams.set(key, value); } history[mode === 'replace' ? 'replaceState' : 'pushState'](null, '', url); }
function renderOptional(node) {
    const depths = depthIndex?.nodes?.[node.id] || [];
    const portals = (portalIndex?.nodes?.[node.id]?.destinations || []).filter((entry) => entry.view !== 'main');
    section($('#v2-card-depth'), text('depth'), depths.map((entry) => ({ label: entry.id, href: entry.path })), (entry) => { location.href = entry.href; });
    section($('#v2-card-portals'), text('elsewhere'), portals.map((entry) => ({ label: entry.view === 'wonder' ? `Wonder: ${entry.id}` : 'Depth', href: entry.route })), (entry) => { location.href = entry.href; });
}
function renderCard(node) {
    const detail = detailById.get(node.id) || node;
    setCardVisible(true);
    rememberNode(node.id); renderBreadcrumb();
    card.style.setProperty('--node-accent', DOMAIN_COLORS[(detail.domain || node.domains || [])[0]] || '#8fa0b8');
    $('#v2-card-title').textContent = nodeLabel(node);
    $('#v2-card-domain').textContent = (detail.domain || node.domains).map(domainName).join(' · ');
    $('#v2-card-type').textContent = i18n(detail.type || node.type || '');
    renderDescription(node);
    const tags = $('#v2-card-tags'); tags.replaceChildren(); for (const tag of detail.display_tags || []) { const pill = document.createElement('span'); pill.textContent = tagLabel(tag); tags.append(pill); }
    $('#v2-card-era').textContent = eraLabel(detail.era);
    renderLearning(node);
    const makeNodes = (ids) => ids.map((id) => nodeById.get(id)).filter(Boolean).map((item) => ({ label: nodeLabel(item), id: item.id }));
    section($('#v2-card-prereqs'), text('prerequisites'), makeNodes(prerequisite.parents[node.id] || []), (entry) => focusNode(entry.id));
    section($('#v2-card-unlocks'), text('unlocks'), makeNodes(prerequisite.children[node.id] || []), (entry) => focusNode(entry.id));
    section($('#v2-card-connections'), text('connections'), (detail.connections || []).filter((edge) => !edge.pending && nodeById.has(edge.target)).map((edge) => ({ label: `${nodeLabel(nodeById.get(edge.target))} · ${edge.relation_type}`, id: edge.target })), (entry) => focusNode(entry.id));
    const stations = constellationIndex?.nodes?.[node.id] || [];
    section($('#v2-card-stations'), text('stations'), stations.map((entry) => {
        const tour = constellationIndex?.tours?.[entry.tour]; const title = tour?.title?.[lang] || tour?.title?.en || entry.tour;
        return { label: `${title} · ${entry.step}`, href: `/wonders.html?w=${encodeURIComponent(entry.tour)}&s=${entry.step}` };
    }), (entry) => { location.href = entry.href; });
    renderOptional(node);
}
function isAvailable(id) { const parents = prerequisite.parents[id] || []; return parents.every((parent) => learned.has(parent)); }
function renderLearningMode() {
    const button = $('#v2-learning-mode');
    button.classList.toggle('is-active', learningMode);
    button.setAttribute('aria-pressed', String(learningMode));
    button.setAttribute('aria-label', learningMode ? text('learningModeOn') : text('learningMode'));
    button.textContent = learningMode ? text('learningModeOn') : text('learningMode');
}
function saveLearningState() {
    localStorage.setItem(LEARNED_STORAGE_KEY, JSON.stringify([...learned].sort()));
    localStorage.setItem(LEARNING_MODE_STORAGE_KEY, String(learningMode));
    localStorage.setItem(LEARNING_STATE_VERSION_STORAGE_KEY, LEARNING_STATE_VERSION);
}
function renderLearning(node) {
    const button = $('#v2-learning-toggle'); const next = $('#v2-learning-next'); const known = learned.has(node.id); const available = isAvailable(node.id);
    button.hidden = false; button.textContent = known ? text('learningRemove') : text('learningAdd'); button.disabled = !known && !available;
    const candidates = [...nodeById.values()].filter((entry) => isAvailable(entry.id) && !learned.has(entry.id)).sort((a, b) => (prerequisite.children[b.id] || []).length - (prerequisite.children[a.id] || []).length || nodeLabel(a).localeCompare(nodeLabel(b)));
    next.hidden = false; next.textContent = candidates[0] ? text('learningNext').replace('{name}', nodeLabel(candidates[0])) : text('learningComplete');
}
function focusNode(nodeId, { writeUrl = true, animate = true } = {}) {
    const node = nodeById.get(nodeId); if (!node) return false;
    selectedId = nodeId; activeConstellation = null; hoveredConstellationId = null; updateScene();
    const view = viewport(); const zoom = Math.max(2.35, renderer.getCamera().zoom);
    // The mobile detail card is a bottom sheet. Aim at the exposed upper
    // portion of the canvas rather than the geometric viewport centre.
    const targetY = matchMedia('(max-width: 760px)').matches ? view.height * 0.21 : view.height / 2;
    const cameraY = node.y - (targetY - view.height / 2) / zoom;
    if (animate) animateCamera({ x: node.x, y: cameraY, zoom }); else { stopCameraAnimation(); renderer.setCamera({ x: node.x, y: cameraY, zoom }); renderer.renderNow(); }
    if (writeUrl) setUrl({ node: nodeId, constellation: null, search: null });
    renderCard(node); return true;
}
function findNodes(query) {
    const value = query.trim().toLocaleLowerCase(); if (!value) return [];
    const scored = [...nodeById.values()].map((node) => { const detail = detailById.get(node.id) || {}; const label = nodeLabel(node).toLocaleLowerCase(); const fallback = node.label.toLocaleLowerCase(); let score = label === value || node.id === value || fallback === value ? 120 : label.startsWith(value) || node.id.startsWith(value) || fallback.startsWith(value) ? 90 : label.includes(value) || fallback.includes(value) || node.id.includes(value) ? 70 : (detail.display_tags || []).join(' ').toLocaleLowerCase().includes(value) ? 55 : (descriptions[node.id] || '').toLocaleLowerCase().includes(value) ? 35 : 0; return { node, score }; }).filter((entry) => entry.score).sort((a, b) => b.score - a.score || nodeLabel(a.node).localeCompare(nodeLabel(b.node))).slice(0, 12);
    return scored.map((entry) => entry.node);
}
function showSearchResults(matches) {
    searchMatches = matches; searchActiveIndex = matches.length ? 0 : -1;
    searchResults.replaceChildren(); searchResults.hidden = matches.length === 0; searchInput.setAttribute('aria-expanded', String(matches.length > 0));
    for (const [index, node] of matches.entries()) { const button = document.createElement('button'); button.type = 'button'; button.id = `v2-search-option-${index}`; button.role = 'option'; button.setAttribute('aria-selected', String(index === searchActiveIndex)); button.textContent = `${nodeLabel(node)} · ${node.type || detailById.get(node.id)?.type || ''}`; button.addEventListener('mousedown', (event) => { event.preventDefault(); focusNode(node.id); searchResults.hidden = true; searchInput.setAttribute('aria-expanded', 'false'); }); searchResults.append(button); }
    if (searchActiveIndex >= 0) searchInput.setAttribute('aria-activedescendant', `v2-search-option-${searchActiveIndex}`); else searchInput.removeAttribute('aria-activedescendant');
}
function renderDomains() {
    const domains = [...new Set(canonical.nodes.flatMap((node) => node.domains))].sort(); domainRoot.replaceChildren();
    for (const domain of [null, ...domains]) { const button = document.createElement('button'); button.type = 'button'; button.textContent = domain ? domainName(domain) : text('all'); button.classList.toggle('is-active', domain === activeDomain); button.setAttribute('aria-pressed', String(domain === activeDomain)); button.addEventListener('click', () => { activeDomain = domain; renderDomains(); updateScene(); }); domainRoot.append(button); }
}
function renderLanguages() { const root = $('#v2-languages'); root.replaceChildren(); const display = { en: 'EN', zh: '中', ja: '日' }; for (const candidate of ['en', 'zh', 'ja']) { const button = document.createElement('button'); button.type = 'button'; button.textContent = display[candidate]; button.setAttribute('aria-label', `Switch language to ${candidate}`); button.classList.toggle('is-active', candidate === lang); button.addEventListener('click', () => setLanguage(candidate)); root.append(button); } renderLearningMode(); }
function refreshLocalizedUi() {
    $('#v2-search-input').placeholder = text('searching');
    $('#v2-search button[type="submit"]').textContent = text('find');
    $('#v2-retry').textContent = text('retry');
    renderLanguages();
    if (!canonical) return;
    renderDomains(); updateScene(); renderMirror();
    if (selectedId) renderCard(nodeById.get(selectedId));
}
async function loadLanguageAssets(locale) {
    const [nextLabels, englishDescriptions, localeDescriptions, nextEnglishSections, nextLocaleSections] = await Promise.all([
        locale === 'en' ? Promise.resolve({}) : optionalJson(`/data/i18n/${locale}.json`),
        optionalJson('/data/descriptions.json'),
        locale === 'en' ? Promise.resolve({}) : optionalJson(`/data/i18n/${locale}_descriptions.json`).then((value) => value || optionalJson(`/data/i18n/${locale}_descriptions_batch1.json`)),
        optionalJson('/data/sections.json'),
        locale === 'en' ? Promise.resolve({}) : optionalJson(`/data/i18n/${locale}_sections.json`),
    ]);
    return { nextLabels, englishDescriptions, localeDescriptions, nextEnglishSections, nextLocaleSections };
}
function applyLanguageAssets(assets) {
    labelMap = assets.nextLabels || {};
    const localized = assets.localeDescriptions?.descriptions || assets.localeDescriptions || {};
    // English is the durable fallback, so a failed/partial locale request can
    // never leave the previous language's descriptions on screen.
    descriptions = { ...(assets.englishDescriptions || {}), ...localized };
    englishSections = assets.nextEnglishSections || {};
    localeSections = assets.nextLocaleSections || {};
}
async function setLanguage(next) {
    if (!isValidLang(next)) return;
    const request = ++languageRequest;
    lang = next; localStorage.setItem('neblux-lang', lang); document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : lang;
    refreshLocalizedUi();
    const assets = await loadLanguageAssets(lang);
    if (request !== languageRequest) return;
    applyLanguageAssets(assets);
    refreshLocalizedUi();
}
async function optionalJson(path, timeoutMs = 5000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(path, { signal: controller.signal });
        return response.ok ? await response.json() : null;
    } catch { return null; } finally { clearTimeout(timeout); }
}
function buildPrerequisites(nodes) { const parents = {}, children = {}; for (const node of nodes) for (const edge of node.connections || []) if (nodeById.has(edge.target) && (edge.learning_prerequisite || (edge.directed && ['logical', 'causal'].includes(edge.relation_type)))) { (parents[node.id] ||= []).push(edge.target); (children[edge.target] ||= []).push(node.id); } return { parents, children }; }
function renderMirror() {
    const mirror = $('#v2-node-mirror'); mirror.replaceChildren(); const nodes = canonical.nodes;
    for (const [index, node] of nodes.entries()) {
        const button = document.createElement('button'); button.type = 'button'; button.tabIndex = index === 0 ? 0 : -1; button.textContent = nodeLabel(node);
        button.addEventListener('focus', () => { keyboardNodeId = node.id; syncInteraction(); renderer.renderNow(); });
        button.addEventListener('blur', () => { if (keyboardNodeId === node.id) { keyboardNodeId = null; syncInteraction(); renderer.renderNow(); } });
        button.addEventListener('click', () => focusNode(node.id));
        button.addEventListener('keydown', (event) => { const offset = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0; if (!offset && event.key !== 'Home' && event.key !== 'End') return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? nodes.length - 1 : (index + offset + nodes.length) % nodes.length; mirror.children[index].tabIndex = -1; mirror.children[next].tabIndex = 0; mirror.children[next].focus(); });
        mirror.append(button);
    }
}
function focusConstellation(id, { writeUrl = true, animate = true } = {}) { const tour = constellationList().find((entry) => entry.id === id); const steps = tour?.nodeIds || []; if (!steps.length) return false; selectedId = null; activeConstellation = id; hoveredConstellationId = null; updateScene(); const positions = steps.map((nodeId) => nodeById.get(nodeId)); const minX = Math.min(...positions.map((node) => node.x)); const maxX = Math.max(...positions.map((node) => node.x)); const minY = Math.min(...positions.map((node) => node.y)); const maxY = Math.max(...positions.map((node) => node.y)); const view = viewport(); const x = (minX + maxX) / 2; const y = (minY + maxY) / 2; const zoom = Math.max(.18, Math.min(1.8, Math.min(view.width / Math.max(360, maxX - minX + 300), view.height / Math.max(360, maxY - minY + 260)))); if (animate) animateCamera({ x, y, zoom }); else { stopCameraAnimation(); renderer.setCamera({ x, y, zoom }); renderer.renderNow(); } if (writeUrl) setUrl({ constellation: id, node: null, search: null }); setCardVisible(false); return true; }
function pointSegmentDistance(point, start, end) {
    const dx = end.x - start.x; const dy = end.y - start.y;
    if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
}
function constellationAtScreen(x, y) {
    if (!canonical || renderer.getCamera().zoom >= .9) return null;
    const point = { x, y }; let best = null;
    for (const tour of constellationList()) {
        const center = constellationScreen(tour.id);
        let distance = center ? Math.hypot(center.x - x, center.y - y) : Infinity;
        for (const segment of tour.segments) {
            const source = nodeById.get(segment.source); const target = nodeById.get(segment.target);
            if (source && target) distance = Math.min(distance, pointSegmentDistance(point, screenPos(source), screenPos(target)));
        }
        if (distance <= (center && Math.hypot(center.x - x, center.y - y) === distance ? 56 : 14) && (!best || distance < best.distance)) best = { tour, distance };
    }
    return best?.tour || null;
}
function applyUrl({ animate = true } = {}) {
    const params = new URL(location.href).searchParams; const node = params.get('node'); const constellation = params.get('constellation'); const query = params.get('search');
    if (node !== null) { if (node && focusNode(node, { writeUrl: false, animate })) return; showOverview({ resetCamera: true, animate }); setUrl({ node: null, constellation: null, search: null }, 'replace'); status.textContent = text('invalid'); return; }
    if (constellation !== null) { if (constellation && focusConstellation(constellation, { writeUrl: false, animate })) return; showOverview({ resetCamera: true, animate }); setUrl({ constellation: null, search: null }, 'replace'); status.textContent = text('invalid'); return; }
    if (query !== null) { if (!query || query.length > 120) { showOverview({ resetCamera: true, animate }); setUrl({ search: null }, 'replace'); status.textContent = text('invalid'); return; } searchInput.value = query; const matches = findNodes(query); const match = matches[0]; if (match) focusNode(match.id, { writeUrl: false, animate }); else { showOverview({ resetCamera: true, animate }); showSearchResults(matches); } return; }
    showOverview({ resetCamera: true, animate });
}
function resize() { renderer.setViewport(viewport()); updatePresentation(); renderer.renderNow(); }
async function boot() {
    appReady = false;
    status.textContent = 'Loading canonical scene…'; $('#v2-retry').hidden = true; $('#v2-fallback').hidden = true;
    // Only topology and interaction are required to draw and explore Main.
    // Descriptions, presentation and cross-surface indices hydrate later.
    const [scenePayload, interactionPayload] = await Promise.all([
        optionalJson('/data/atlas/main-scene.json', 12000),
        optionalJson('/data/atlas/main-interaction.json', 12000),
    ]);
    if (!scenePayload?.scene || !Array.isArray(interactionPayload?.nodes) || scenePayload.scene.schemaVersion !== '1.0.0' || !String(scenePayload.scene.rendererContractVersion || '').startsWith('2.')) { status.textContent = 'Main Galaxy v2 is temporarily unavailable.'; $('#v2-retry').hidden = false; $('#v2-fallback').hidden = false; return; }
    canonical = scenePayload.scene; interaction = interactionPayload; mainPresentation = null; sceneMounted = false; nodeById = new Map(canonical.nodes.map((node) => [node.id, node])); detailById = new Map(interaction.nodes.map((node) => [node.id, node])); degreeById = new Map(canonical.nodes.map((node) => [node.id, 0])); for (const edge of canonical.edges) { degreeById.set(edge.source, (degreeById.get(edge.source) || 0) + 1); degreeById.set(edge.target, (degreeById.get(edge.target) || 0) + 1); }
    prerequisite = buildPrerequisites(interaction.nodes); loadNavHistory(); try { learned = new Set((JSON.parse(localStorage.getItem(LEARNED_STORAGE_KEY) || '[]') || []).filter((id) => nodeById.has(id))); } catch { learned = new Set(); }
    const storedLearningVersion = localStorage.getItem(LEARNING_STATE_VERSION_STORAGE_KEY);
    learningMode = storedLearningVersion === LEARNING_STATE_VERSION && localStorage.getItem(LEARNING_MODE_STORAGE_KEY) === 'true';
    if (storedLearningVersion !== LEARNING_STATE_VERSION) saveLearningState();
    resize();
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : lang;
    refreshLocalizedUi();
    status.textContent = `Canonical scene ready · ${canonical.nodes.length} nodes · ${canonical.edges.length} active pairs`;
    const initialParams = new URL(location.href).searchParams;
    const waitsForConstellation = !initialParams.has('node') && initialParams.has('constellation');
    if (!waitsForConstellation) applyUrl({ animate: false });
    appReady = true;

    const initialLanguageRequest = ++languageRequest;
    void loadLanguageAssets(lang).then((assets) => {
        if (initialLanguageRequest !== languageRequest) return;
        applyLanguageAssets(assets); refreshLocalizedUi();
        // A localized URL search can only be resolved after its label map
        // arrives. Re-run that initial query once without delaying first draw.
        if (initialParams.has('search') && !selectedId && !activeConstellation) applyUrl({ animate: false });
    });
    void optionalJson('/data/atlas/main-presentation.json').then((presentation) => {
        mainPresentation = presentation?.schemaVersion === '1.0.0' ? presentation : null;
        updatePresentation(); renderer.renderNow();
    });
    Promise.all([optionalJson('/data/atlas/depth-index.json'), optionalJson('/data/atlas/portal-index.json'), optionalJson('/data/atlas/constellation-index.json')]).then(([depth, portal, constellations]) => {
        depthIndex = depth; portalIndex = portal; constellationIndex = constellations;
        if (waitsForConstellation) applyUrl({ animate: false });
        else { updatePresentation(); renderer.renderNow(); if (selectedId) renderCard(nodeById.get(selectedId)); }
    });
}

canvas.style.cursor = 'grab';
canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault(); stopCameraAnimation();
    const point = { x: event.clientX, y: event.clientY };
    activePointers.set(event.pointerId, point); canvas.setPointerCapture(event.pointerId);
    if (activePointers.size === 1) {
        dragging = true; dragStart = point; lastPointer = point; dragDistance = 0; gestureWasPinch = false;
    } else if (activePointers.size === 2) {
        const [a, b] = [...activePointers.values()]; const rect = canvas.getBoundingClientRect();
        const midpoint = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
        pinchState = { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), zoom: renderer.getCamera().zoom, anchor: screenToWorld(midpoint) };
        gestureWasPinch = true; dragging = false;
    }
    canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('pointermove', (event) => {
    if (!activePointers.has(event.pointerId)) {
        const rect = canvas.getBoundingClientRect(); const local = { x: event.clientX - rect.left, y: event.clientY - rect.top }; const nodeId = renderer.hitTest(local)?.id || null;
        // A physical star always owns the pointer; Wonder entrances are only
        // considered in unclaimed canvas space.
        setHoveredNode(nodeId);
        setHoveredConstellation(nodeId ? null : constellationAtScreen(local.x, local.y)?.id || null);
        return;
    }
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.size >= 2 && pinchState) {
        const [a, b] = [...activePointers.values()]; const rect = canvas.getBoundingClientRect();
        const midpoint = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
        const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)); const zoom = Math.max(.18, Math.min(8, pinchState.zoom * distance / pinchState.distance)); const view = viewport();
        renderer.setCamera({ zoom, x: pinchState.anchor.x - (midpoint.x - view.width / 2) / zoom, y: pinchState.anchor.y - (midpoint.y - view.height / 2) / zoom }); renderer.renderNow();
        dragDistance = Math.max(dragDistance, Math.abs(distance - pinchState.distance)); return;
    }
    if (!dragging || !lastPointer || !dragStart) return;
    const camera = renderer.getCamera(); const dx = event.clientX - lastPointer.x; const dy = event.clientY - lastPointer.y;
    dragDistance = Math.max(dragDistance, Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y));
    renderer.setCamera({ x: camera.x - dx / Math.max(.2, camera.zoom), y: camera.y - dy / Math.max(.2, camera.zoom) }); lastPointer = { x: event.clientX, y: event.clientY }; renderer.renderNow();
});
canvas.addEventListener('pointerup', (event) => {
    const rect = canvas.getBoundingClientRect(); const moved = dragDistance > 4 || gestureWasPinch; const local = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    activePointers.delete(event.pointerId); canvas.releasePointerCapture?.(event.pointerId);
    if (activePointers.size === 1) { const remaining = [...activePointers.values()][0]; dragging = true; dragStart = remaining; lastPointer = remaining; dragDistance = 0; pinchState = null; }
    else { dragging = false; lastPointer = null; dragStart = null; dragDistance = 0; pinchState = null; }
    if (!activePointers.size && !moved) { const node = renderer.hitTest(local); const constellation = node ? null : constellationAtScreen(local.x, local.y); if (node) focusNode(node.id); else if (constellation) focusConstellation(constellation.id); else showOverview({ writeUrl: true }); }
    if (!activePointers.size) gestureWasPinch = false;
    canvas.style.cursor = activePointers.size ? 'grabbing' : 'grab';
});
canvas.addEventListener('pointercancel', (event) => { activePointers.delete(event.pointerId); if (!activePointers.size) { dragging = false; lastPointer = null; dragStart = null; dragDistance = 0; pinchState = null; gestureWasPinch = false; canvas.style.cursor = 'grab'; } });
canvas.addEventListener('pointerleave', () => { if (!activePointers.size) { setHoveredNode(null); setHoveredConstellation(null); } });
canvas.addEventListener('wheel', (event) => {
    event.preventDefault(); stopCameraAnimation();
    const rect = canvas.getBoundingClientRect(); const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }; const camera = renderer.getCamera(); const anchor = screenToWorld(point, camera); const view = viewport(); const zoom = Math.max(.18, Math.min(8, camera.zoom * (event.deltaY < 0 ? 1.12 : .89)));
    renderer.setCamera({ zoom, x: anchor.x - (point.x - view.width / 2) / zoom, y: anchor.y - (point.y - view.height / 2) / zoom }); renderer.renderNow();
}, { passive: false });
search.addEventListener('submit', (event) => { event.preventDefault(); const match = findNodes(searchInput.value)[0]; if (match) focusNode(match.id); else showSearchResults([]); });
searchInput.addEventListener('input', () => showSearchResults(searchInput.value.trim().length > 1 ? findNodes(searchInput.value) : []));
searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { searchResults.hidden = true; searchInput.value = ''; searchInput.setAttribute('aria-expanded', 'false'); return; }
    if (!searchMatches.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); searchActiveIndex = (searchActiveIndex + (event.key === 'ArrowDown' ? 1 : -1) + searchMatches.length) % searchMatches.length; [...searchResults.children].forEach((item, index) => item.setAttribute('aria-selected', String(index === searchActiveIndex))); searchInput.setAttribute('aria-activedescendant', `v2-search-option-${searchActiveIndex}`); }
    if (event.key === 'Enter' && searchActiveIndex >= 0) { event.preventDefault(); focusNode(searchMatches[searchActiveIndex].id); searchResults.hidden = true; searchInput.setAttribute('aria-expanded', 'false'); }
});
$('#v2-zoom-in').addEventListener('click', () => { stopCameraAnimation(); renderer.setCamera({ zoom: renderer.getCamera().zoom * 1.16 }); renderer.renderNow(); });
$('#v2-zoom-out').addEventListener('click', () => { stopCameraAnimation(); renderer.setCamera({ zoom: renderer.getCamera().zoom * .86 }); renderer.renderNow(); });
$('#v2-reset').addEventListener('click', () => showOverview({ writeUrl: true, resetCamera: true }));
$('#v2-card-close').addEventListener('click', () => showOverview({ writeUrl: true }));
$('#v2-learning-mode').addEventListener('click', () => { learningMode = !learningMode; saveLearningState(); renderLearningMode(); updateScene(); });
$('#v2-learning-toggle').addEventListener('click', () => { if (!selectedId) return; if (learned.has(selectedId)) learned.delete(selectedId); else if (isAvailable(selectedId)) learned.add(selectedId); saveLearningState(); updateScene(); renderCard(nodeById.get(selectedId)); });
$('#v2-retry').addEventListener('click', boot); window.addEventListener('resize', resize); window.addEventListener('popstate', applyUrl);
window.addEventListener('keydown', (event) => { if ((event.key === '/' || event.key.toLowerCase() === 'f') && document.activeElement !== searchInput) { event.preventDefault(); searchInput.focus(); } if (event.key === 'Escape') { searchResults.hidden = true; searchInput.blur(); const params = new URL(location.href).searchParams; if (!card.hidden || selectedId || activeConstellation || params.has('node') || params.has('constellation')) showOverview({ writeUrl: true }); } });

function constellationScreen(id) { const tour = constellationList().find((entry) => entry.id === id); if (!tour) return null; const points = tour.nodeIds.map((nodeId) => nodeById.get(nodeId)).filter(Boolean).map(screenPos); return points.length ? { x: points.reduce((sum, point) => sum + point.x, 0) / points.length, y: points.reduce((sum, point) => sum + point.y, 0) / points.length } : null; }
function debugStats() { const base = renderer.getDebugStats(); const members = new Set(currentConstellation()?.nodeIds || []); const learning = learningVisualState(); return { ...base, activeEdges: base.drawnEdges, prereqEdges: Object.values(prerequisite.parents).reduce((sum, parents) => sum + parents.length, 0), dimmedNodes: members.size ? Math.max(0, canonical.nodes.length - members.size) : 0, hasRing: Boolean(selectedId), hoveredNodeId: hoveredId, hoveredConstellationId, activeConstellationId: activeConstellation, keyboardNodeId, learningMode, learningHasContext: learning.hasContext, learnedNodes: learned.size, learningSegments: learningSegments().length, safeRectCount: uiSafeRects().length }; }
window.__nebluxApp = Object.freeze({
    ready: () => appReady,
    nodeIds: () => canonical?.nodes.map((node) => node.id) || [],
    hubId: () => [...degreeById.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null,
    screenPos: (id) => { const node = nodeById.get(id); return node ? screenPos(node) : null; },
    camera: () => renderer.getCamera(),
    screenToWorld: (x, y) => renderer.screenToWorld({ x, y }),
    worldToScreen: (x, y) => renderer.worldToScreen({ x, y }),
    worldPos: (id) => { const node = nodeById.get(id); return node ? { x: node.x, y: node.y } : null; },
    camera: () => renderer.getCamera(),
    camera: () => renderer.getCamera(),
    degree: (id) => degreeById.get(id) || 0,
    selectNode: (id) => focusNode(id, { writeUrl: false }),
    debug: debugStats, stats: debugStats,
    constellationCount: () => constellationList().length,
    constellationT: () => Math.max(0, Math.min(1, (.9 - renderer.getCamera().zoom) / .35)),
    constellationNameAt: (x, y) => constellationAtScreen(x, y)?.name || null,
    constellations: () => constellationList(),
    setConstellations: (value) => { constellationOverrides = Array.isArray(value) ? value : null; if (activeConstellation && !currentConstellation()) activeConstellation = null; updateScene(); return constellationList(); },
    nodeAtScreen: (x, y) => renderer.hitTest({ x, y })?.id || null,
    constellationScreen,
    focusConstellation: (id) => focusConstellation(id, { writeUrl: false }),
    learningMode: () => learningMode,
    setLearningMode: (enabled) => { learningMode = Boolean(enabled); saveLearningState(); renderLearningMode(); updateScene(); return learningMode; },
    zoomTo: (zoom) => { const nodes = canonical?.nodes || []; const x = nodes.reduce((sum, node) => sum + node.x, 0) / Math.max(1, nodes.length); const y = nodes.reduce((sum, node) => sum + node.y, 0) / Math.max(1, nodes.length); renderer.setCamera({ x, y, zoom }); renderer.renderNow(); },
    sceneSize: () => ({ nodes: canonical?.nodes.length || 0, edges: canonical?.edges.length || 0 }),
});
boot();
