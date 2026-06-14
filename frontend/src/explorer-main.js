import * as d3 from "d3";
import { createCanvasRenderer, ensureVis } from "./engine/canvas-renderer.js";

        // ===== CONSTANTS =====
        const DC = window.NodusTokens?.DOMAIN_COLORS || {
            MAT: '#5b9bd5', PHY: '#c97a5b', CHE: '#c9c05b', BIO: '#5bc97a',
            MED: '#5bc9b8', ENG: '#9b7bc9', TEC: '#c95b9b', SOC: '#c9a05a',
            HUM: '#7ba5c9', PHI: '#9bc95b', ART: '#c95b5b', HIS: '#a07850'
        };
        const RC = window.NodusTokens?.RELATION_COLORS || {
            logical: '#5b9bd5', historical: '#c9a05a', applied: '#5bc97a',
            conceptual: '#9b7bc9', causal: '#c95b5b'
        };
        const TYPE_SIZE = { field: 14, concept: 7, person: 10, event: 12 };
        const I18N = {
            en: {
                navHome: 'Home',
                navGraph: 'Graph',
                hdrTitle: 'Nodus Explorer',
                hdrSubtitle: 'Knowledge Graph',
                all: 'ALL',
                searchPlaceholder: 'Search a concept to begin…',
                welcomeTitle: 'Start with one concept — and let it pull in the rest.',
                welcomeSubtitle: 'Name a topic, person, or event, then open it up connection by connection.',
                recommended: 'Where to next',
                btnReset: 'Reset',
                btnFit: 'Fit',
                btnUndo: 'Undo',
                btnHelp: 'Help',
                btnGuide: 'Guide',
                btnResetTitle: 'Clear graph and start over',
                btnFitTitle: 'Fit view to all visible nodes',
                btnUndoTitle: 'Undo last expand (Ctrl+Z)',
                btnFocusTitle: 'Cycle focus depth: Off, 1-Hop, 2-Hop',
                btnHelpTitle: 'Open keyboard shortcuts and explorer help',
                btnGuideTitle: 'Replay quick guide',
                focusOff: 'Focus Off',
                focus1: 'Focus 1-Hop',
                focus2: 'Focus 2-Hop',
                connections: 'Connections',
                showAll: 'Show all',
                showLess: 'Show less',
                expand: 'Expand',
                collapse: 'Collapse',
                path: 'Path',
                inGraph: 'in graph',
                explored: 'explored',
                total: 'total',
                hiddenConnections: 'hidden connections',
                ctxExpand: 'Expand connections',
                ctxCollapse: 'Collapse node',
                ctxPath: 'Find path from selected',
                ctxFocus: 'Focus on this',
                shortcutsTitle: 'Keyboard Shortcuts',
                shortcutsIntro: 'A few keys to move through the field faster.',
                scSearch: 'Search',
                scSearchAlt: 'Search (alt)',
                scUndo: 'Undo',
                scClose: 'Close panel / shortcuts',
                scShow: 'Show shortcuts',
                scExpand: 'Expand selected',
                scContext: 'Node context menu',
                shortcutsClose: 'Close',
                onboardingSkip: 'Skip',
                onboardingNext: 'Next',
                onboardingDone: 'Done',
                onboardingEscHint: 'Press Esc to close',
                tourStep1: 'Step 1 of 3',
                tourTitle1: 'Pick a starting point',
                tourText1: 'Search any concept, person, or event to drop your first point into the field — by name, subject, or tag.',
                tourStep2: 'Step 2 of 3',
                tourTitle2: 'Open up the connections',
                tourText2: 'Click a point to read about it. Double-click or right-click to pull in everything it connects to.',
                tourStep3: 'Step 3 of 3',
                tourTitle3: 'Focus on one corner',
                tourText3: 'Select a point, then use Focus to dim the rest of the field so you can study one corner at a time.',
                relLogical: 'logical',
                relHistorical: 'historical',
                relApplied: 'applied',
                relConceptual: 'conceptual',
                relCausal: 'causal',
                typeField: 'field',
                typeConcept: 'concept',
                typePerson: 'person',
                typeEvent: 'event',
                eraBce: 'BCE',
                eraPresent: 'present'
            },
            zh: {
                navHome: '首頁',
                navGraph: '圖譜',
                hdrTitle: 'Nodus 探索器',
                hdrSubtitle: '知識圖譜',
                all: '全部',
                searchPlaceholder: '搜尋一個概念開始…',
                welcomeTitle: '先放下一個概念，其餘的會被牽引進來。',
                welcomeSubtitle: '輸入主題、人物或事件，再一條一條展開它的連結。',
                recommended: '接下來去哪',
                btnReset: '重置',
                btnFit: '適配',
                btnUndo: '復原',
                btnHelp: '說明',
                btnGuide: '指引',
                btnResetTitle: '清除圖形並從頭開始',
                btnFitTitle: '將視圖調整至所有可見節點',
                btnUndoTitle: '復原上一次展開 (Ctrl+Z)',
                btnFocusTitle: '切換聚焦層級：關閉、1 跳、2 跳',
                btnHelpTitle: '開啟快捷鍵與 explorer 說明',
                btnGuideTitle: '重播快速指引',
                focusOff: '無聚焦',
                focus1: '1 跳聚焦',
                focus2: '2 跳聚焦',
                connections: '連結',
                showAll: '顯示全部',
                showLess: '顯示較少',
                expand: '展開',
                collapse: '收合',
                path: '路徑',
                inGraph: '在圖中',
                explored: '已探索',
                total: '總計',
                hiddenConnections: '隱藏連結',
                ctxExpand: '展開關聯',
                ctxCollapse: '收合節點',
                ctxPath: '尋找與目前選取節點的路徑',
                ctxFocus: '聚焦此節點',
                shortcutsTitle: '鍵盤快速鍵',
                shortcutsIntro: '幾個按鍵，讓你更快穿越這片星空。',
                scSearch: '搜尋',
                scSearchAlt: '搜尋（備用）',
                scUndo: '復原',
                scClose: '關閉面板 / 快速鍵',
                scShow: '顯示快速鍵',
                scExpand: '展開已選節點',
                scContext: '節點右鍵選單',
                shortcutsClose: '關閉',
                onboardingSkip: '略過',
                onboardingNext: '下一步',
                onboardingDone: '完成',
                onboardingEscHint: '按 Esc 可關閉',
                tourStep1: '步驟 1 / 3',
                tourTitle1: '選一個起點',
                tourText1: '搜尋任何概念、人物或事件，把第一顆星放進這片星空——可用名稱、領域或關鍵詞。',
                tourStep2: '步驟 2 / 3',
                tourTitle2: '展開它的連結',
                tourText2: '點一顆星可閱讀它，雙擊或右鍵把它連到的一切都拉進來。',
                tourStep3: '步驟 3 / 3',
                tourTitle3: '聚焦在一角',
                tourText3: '選一顆星，再用聚焦讓星空其餘變暗，一次專注研究一角。',
                relLogical: '邏輯',
                relHistorical: '歷史',
                relApplied: '應用',
                relConceptual: '概念',
                relCausal: '因果',
                typeField: '領域',
                typeConcept: '概念',
                typePerson: '人物',
                typeEvent: '事件',
                eraBce: '公元前',
                eraPresent: '至今'
            },
            ja: {
                navHome: 'ホーム',
                navGraph: 'グラフ',
                hdrTitle: 'Nodus エクスプローラー',
                hdrSubtitle: '知識グラフ',
                all: 'すべて',
                searchPlaceholder: '探索を始める概念を検索…',
                welcomeTitle: 'ひとつの概念から始めれば、あとは引き寄せられてくる。',
                welcomeSubtitle: 'トピック、人物、出来事を入力し、ひとつずつつながりを開いていこう。',
                recommended: '次はどこへ',
                btnReset: 'リセット',
                btnFit: '全体表示',
                btnUndo: '元に戻す',
                btnHelp: 'ヘルプ',
                btnGuide: 'ガイド',
                btnResetTitle: 'グラフをリセットして最初からやり直す',
                btnFitTitle: '可視ノード全体が収まるように表示を調整',
                btnUndoTitle: '直前の展開を元に戻す (Ctrl+Z)',
                btnFocusTitle: 'フォーカス深度を切替：OFF・1ホップ・2ホップ',
                btnHelpTitle: 'キーボードショートカットと explorer ヘルプを開く',
                btnGuideTitle: 'クイックガイドを再生',
                focusOff: 'フォーカスOFF',
                focus1: 'フォーカス1ホップ',
                focus2: 'フォーカス2ホップ',
                connections: '接続',
                showAll: 'すべて表示',
                showLess: '折りたたむ',
                expand: '展開',
                collapse: '折りたたむ',
                path: 'パス',
                inGraph: 'グラフ内',
                explored: '探索済み',
                total: '合計',
                hiddenConnections: '非表示接続',
                ctxExpand: '接続を展開',
                ctxCollapse: 'ノードを折りたたむ',
                ctxPath: '選択中ノードからのパスを探す',
                ctxFocus: 'このノードにフォーカス',
                shortcutsTitle: 'キーボードショートカット',
                shortcutsIntro: 'いくつかのキーで、星空をより速く動けます。',
                scSearch: '検索',
                scSearchAlt: '検索（代替）',
                scUndo: '元に戻す',
                scClose: 'パネル / ショートカットを閉じる',
                scShow: 'ショートカットを表示',
                scExpand: '選択ノードを展開',
                scContext: 'ノードの右クリックメニュー',
                shortcutsClose: '閉じる',
                onboardingSkip: 'スキップ',
                onboardingNext: '次へ',
                onboardingDone: '完了',
                onboardingEscHint: 'Escで閉じる',
                tourStep1: 'ステップ 1 / 3',
                tourTitle1: '起点を選ぶ',
                tourText1: '概念・人物・出来事を検索して、最初の星をこの星空に置こう——名前・分野・タグで探せます。',
                tourStep2: 'ステップ 2 / 3',
                tourTitle2: 'つながりを開く',
                tourText2: '星をクリックして読み、ダブルクリックか右クリックで、つながる先をすべて引き寄せよう。',
                tourStep3: 'ステップ 3 / 3',
                tourTitle3: '一角に集中する',
                tourText3: '星を選び、フォーカスで残りの星空を暗くして、一度にひとつの場所に集中しよう。',
                relLogical: '論理',
                relHistorical: '歴史',
                relApplied: '応用',
                relConceptual: '概念',
                relCausal: '因果',
                typeField: '領域',
                typeConcept: '概念',
                typePerson: '人物',
                typeEvent: '出来事',
                eraBce: '紀元前',
                eraPresent: '現在'
            }
        };

        // ===== STATE =====
        let LANG = 'en';
        let labelMap = {};
        let descriptionMap = {};
        let enDescriptionMap = {};
        let enSectionsMap = {};
        let localeLoadSeq = 0;
        const localeMapsCache = { en: { labels: {}, descriptions: {} } };
        let allNodesRaw = [];
        let nodeMap = {};
        let adjacency = {};

        let visibleNodeIds = new Set();
        let expandedNodeIds = new Set();
        let visibleNodes = [];
        let visibleEdges = [];

        // Canvas rendering state
        let renderer = null;
        let canvasSel = null;
        let viewTransform = { k: 1, x: 0, y: 0 };
        let _explorerStarMeta = {};
        let focusKeepSet = new Set();

        let sim, zoomBehavior;
        let currentZoom = 1;
        let selectedNodeId = null;
        let relatedLabelIds = new Set();
        let undoStack = [];
        let explorationHistory = [];
        let activeFilter = null;
        let focusDepth = 0;
        let tourIndex = 0;
        let lastLoadError = null;
        const TOP_CHROME_EXPAND_DELAY = 90;
        const TOP_CHROME_COLLAPSE_DELAY = 260;
        const TOUR_KEY = 'nodus-explorer-tour-v1';

        function getTourSteps() {
            return [
                { step: t('tourStep1'), title: t('tourTitle1'), text: t('tourText1'), target: 'search-box' },
                { step: t('tourStep2'), title: t('tourTitle2'), text: t('tourText2'), target: 'controls' },
                { step: t('tourStep3'), title: t('tourTitle3'), text: t('tourText3'), target: 'btn-focus' }
            ];
        }

        // ===== HELPERS =====
        function nc(n) { return DC[n.domain[0]] || '#888'; }
        function nr(n) { return TYPE_SIZE[n.type] || 7; }

        // ===== STAR METADATA (canvas) =====
        // Degree-aware bloom radii, recomputed on each rebuildVisuals.
        // Uses a stable hash for twinkle so re-expand doesn't reset the phase.
        function buildExplorerStarMeta() {
            const degreeMap = {};
            for (const e of visibleEdges) {
                const sId = e.source.id || e.source;
                const tId = e.target.id || e.target;
                degreeMap[sId] = (degreeMap[sId] || 0) + 1;
                degreeMap[tId] = (degreeMap[tId] || 0) + 1;
            }
            for (const n of visibleNodes) {
                const d = degreeMap[n.id] || 0;
                const degCap = Math.min(d, 20);
                const tier = n.type === 'field' ? 'primary'
                    : (n.type === 'concept' ? 'secondary' : 'minor');
                const size = tier === 'primary' ? {
                    core: 4.0 + degCap * 0.28, glow: 15 + degCap * 0.8,
                    halo: 30 + degCap * 1.4, corona: 60 + degCap * 2.2,
                } : tier === 'secondary' ? {
                    core: 1.8 + degCap * 0.10, glow: 7.0 + degCap * 0.35,
                    halo: 15 + degCap * 0.7, corona: 30 + degCap * 1.0,
                } : { core: 1.1, glow: 3.4, halo: 7.5, corona: 16 };

                let h = 0;
                for (let i = 0; i < n.id.length; i++) h = ((h << 5) - h + n.id.charCodeAt(i)) | 0;
                h = Math.abs(h);
                const jitter = (h % 100) / 100 - 0.5;
                _explorerStarMeta[n.id] = {
                    ...size, degree: d, tier, jitter,
                    baseOp: tier === 'primary' ? 1.0
                        : tier === 'secondary' ? 0.78 + jitter * 0.12
                        : 0.42 + jitter * 0.16,
                    glowAlpha: tier === 'primary' ? 1.0 : tier === 'secondary' ? 0.86 : 0.62,
                    twDur: (6.5 + (h % 7) * 0.9).toFixed(2),
                    twDelay: ((h % 60) / 10).toFixed(2),
                };
            }
        }

        function sm(n) {
            return _explorerStarMeta[n.id] || {
                core: nr(n) * 0.3, glow: nr(n), halo: nr(n) * 2, corona: nr(n) * 4,
                glowAlpha: 0.6, baseOp: 0.8, twDur: '5', twDelay: '0', tier: 'minor', degree: 0
            };
        }

        // ===== CANVAS HIT TEST =====
        function findNodeAtScreen(px, py) {
            if (!sim) return null;
            const t = viewTransform;
            const wx = (px - t.x) / t.k;
            const wy = (py - t.y) / t.k;
            const candidate = sim.find(wx, wy, 40 / t.k);
            if (!candidate) return null;
            const dx = candidate.x * t.k + t.x - px;
            const dy = candidate.y * t.k + t.y - py;
            const hitR = Math.max(22, nr(candidate) + 10);
            return (dx * dx + dy * dy) <= hitR * hitR ? candidate : null;
        }

        // ===== CANVAS LABEL HOOK =====
        function explorerLabelInfo(n, hovered) {
            const v = n.vis || {};
            if (v.dimmed) return null;
            const m = sm(n);
            let alpha = 0;
            const isSelected = n.id === selectedNodeId;
            if (isSelected) alpha = 0.96;
            else if (relatedLabelIds.has(n.id)) alpha = 0.92;
            else if (n.type === 'field') alpha = currentZoom > 0.6 ? 0.86 : 0.72;
            else if (currentZoom > 1.8) alpha = 0.72;
            else if (currentZoom > 1.15 && (adjacency[n.id] || []).length >= 8) alpha = 0.58;
            else if ((n.type === 'person' || n.type === 'event') && currentZoom > 1.25) alpha = 0.56;
            else if (currentZoom > 1.45) alpha = 0.5;
            if (hovered) alpha = Math.max(alpha, 0.9);
            if (alpha <= 0) return null;
            return {
                text: nodeLabel(n),
                dy: Math.max(m.halo * 0.5, nr(n) + 12),
                size: n.type === 'field' ? 12 : 10,
                alpha,
                field: n.type === 'field',
            };
        }

        // ===== OVERLAY CANVAS (expand rings + badges) =====
        function setupExplorerOverlay() {
            const overlay = document.getElementById('explorer-overlay');
            if (!overlay) return;
            const octx = overlay.getContext('2d');
            let odpr = 1;

            function resizeOverlay() {
                odpr = Math.min(2, window.devicePixelRatio || 1);
                overlay.width = Math.round(window.innerWidth * odpr);
                overlay.height = Math.round(window.innerHeight * odpr);
            }
            resizeOverlay();
            window.addEventListener('resize', resizeOverlay);

            function drawOverlay(ts) {
                const W = window.innerWidth, H = window.innerHeight;
                octx.setTransform(odpr, 0, 0, odpr, 0, 0);
                octx.clearRect(0, 0, W, H);

                if (!sim || visibleNodes.length === 0) { requestAnimationFrame(drawOverlay); return; }

                const { k, x: tx, y: ty } = viewTransform;
                const pulse = 0.5 + 0.3 * Math.sin(ts * 0.002);

                for (const n of visibleNodes) {
                    if (expandedNodeIds.has(n.id)) continue;
                    if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;
                    const m = sm(n);
                    const sx = n.x * k + tx, sy = n.y * k + ty;
                    const ringR = (m.glow + 4) * k;
                    if (sx < -ringR - 60 || sx > W + ringR + 60 || sy < -ringR - 60 || sy > H + ringR + 60) continue;

                    octx.save();
                    octx.strokeStyle = `rgba(100,160,240,${(pulse * 0.55).toFixed(2)})`;
                    octx.lineWidth = Math.max(0.5, k * 0.8);
                    octx.setLineDash([4, 4]);
                    octx.lineDashOffset = -(ts * 0.02) % 8;
                    octx.beginPath();
                    octx.arc(sx, sy, Math.max(ringR, 8), 0, Math.PI * 2);
                    octx.stroke();
                    octx.restore();

                    const count = neighborCount(n.id);
                    if (count > 0) {
                        const fontSize = Math.max(9, Math.min(12, 10));
                        octx.save();
                        octx.font = `${fontSize}px 'IBM Plex Mono', monospace`;
                        octx.fillStyle = `rgba(160,200,255,${(pulse * 0.85).toFixed(2)})`;
                        octx.textAlign = 'center';
                        octx.textBaseline = 'bottom';
                        octx.fillText(`+${count}`, sx, sy - Math.max(ringR, 8) - 3);
                        octx.restore();
                    }
                }
                requestAnimationFrame(drawOverlay);
            }
            requestAnimationFrame(drawOverlay);
        }

        // ===== LOADING UTILS =====
        function setLoadingState(message, isError = false, showRetry = false) {
            const wrap = document.getElementById('loading');
            const textEl = document.getElementById('loading-text');
            const retryBtn = document.getElementById('loading-retry');
            if (!wrap || !textEl || !retryBtn) return;
            textEl.textContent = message;
            textEl.style.color = isError ? '#fda4af' : '#94a7bf';
            retryBtn.style.display = showRetry ? 'inline-flex' : 'none';
            wrap.style.display = 'block';
        }

        function hideLoadingState() {
            const wrap = document.getElementById('loading');
            const retryBtn = document.getElementById('loading-retry');
            if (retryBtn) retryBtn.disabled = false;
            if (wrap) wrap.style.display = 'none';
        }

        async function fetchJsonWithTimeout(url, timeoutMs) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const response = await fetch(url, { signal: controller.signal });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } finally {
                clearTimeout(timer);
            }
        }

        function normalizeGraphNodes(payload) {
            if (Array.isArray(payload)) return payload;
            if (payload && Array.isArray(payload.nodes)) return payload.nodes;
            throw new Error('Invalid graph payload: missing nodes array.');
        }

        function hydrateGraphData(rawNodes) {
            allNodesRaw = rawNodes;
            nodeMap = {};
            adjacency = {};
            for (const n of allNodesRaw) {
                nodeMap[n.id] = n;
                if (!adjacency[n.id]) adjacency[n.id] = [];
            }
            for (const n of allNodesRaw) {
                for (const c of (n.connections || [])) {
                    if (!nodeMap[c.target]) continue;
                    adjacency[n.id].push({ target: c.target, relation_type: c.relation_type, pending: c.pending || false });
                    if (!adjacency[c.target]) adjacency[c.target] = [];
                    if (!adjacency[c.target].find(e => e.target === n.id && e.relation_type === c.relation_type)) {
                        adjacency[c.target].push({ target: n.id, relation_type: c.relation_type, pending: c.pending || false });
                    }
                }
            }
        }

        function edgeKey(edge) {
            const s = edge.source.id || edge.source;
            const t = edge.target.id || edge.target;
            return [s, t].sort().join('|') + '|' + edge.relation_type;
        }
        function escHtml(s) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
        function truncate(s, len) { return s && s.length > len ? s.slice(0, len) + '…' : (s || ''); }
        function neighborCount(id) { return (adjacency[id] || []).filter(c => !visibleNodeIds.has(c.target)).length; }

        function getPanelOffset() {
            const panel = document.getElementById('panel');
            if (!panel || !panel.classList.contains('open')) return 0;
            if (window.innerWidth <= 768) return 0;
            const panelWidth = panel.getBoundingClientRect().width || 340;
            return -Math.round(panelWidth * 0.5);
        }

        function isValidLang(lang) {
            return typeof lang === 'string' && Object.prototype.hasOwnProperty.call(I18N, lang);
        }

        function getLang() {
            const saved = localStorage.getItem('nodus-lang');
            if (saved === 'zh-TW') return 'zh';
            if (saved && saved.toLowerCase() === 'ja-jp') return 'ja';
            if (isValidLang(saved)) return saved;
            const nav = (navigator.language || '').toLowerCase();
            if (nav.startsWith('ja')) return 'ja';
            if (nav.startsWith('zh')) return 'zh';
            return 'en';
        }

        function t(key) {
            return (I18N[LANG] && I18N[LANG][key]) || (I18N.en && I18N.en[key]) || key;
        }

        const TAG_LABELS = {
            zh: {
                foundational: '基礎', abstract: '抽象', axiomatic: '公理化', ancient: '古代',
                experimental: '實驗', natural_world: '自然世界', molecular_scale: '分子尺度',
                interdisciplinary: '跨領域', field: '領域', applied: '應用', theoretical: '理論',
                empirical: '實證', modern: '現代', contemporary: '當代',
                historical_timescale: '歷史尺度', historically_significant: '歷史重要',
                unifying_concept: '統一概念', well_established: '成熟理論',
                currently_active_research: '目前活躍研究'
            },
            ja: {
                foundational: '基礎', abstract: '抽象', axiomatic: '公理化', ancient: '古代',
                experimental: '実験', natural_world: '自然界', molecular_scale: '分子スケール',
                interdisciplinary: '学際的', field: '分野', applied: '応用', theoretical: '理論',
                empirical: '実証', modern: '近代', contemporary: '現代',
                historical_timescale: '歴史スケール', historically_significant: '歴史的重要',
                unifying_concept: '統一概念', well_established: '確立された理論',
                currently_active_research: '現在進行中の研究'
            }
        };

        const TAG_TOKEN_ZH = {
            age: '時代', ancient: '古代', modern: '現代', contemporary: '當代', early: '早期',
            middle: '中期', post: '後', digital: '數位', industrial: '工業', cold: '冷',
            war: '戰爭', exploration: '探索', revolution: '革命', enlightenment: '啟蒙',
            renaissance: '文藝復興', ancient_greek: '古希臘', islamic: '伊斯蘭',
            golden: '黃金', world: '世界', history: '歷史', historical: '歷史',
            historiography: '史學方法', studies: '研究', science: '科學', technology: '科技',
            engineering: '工程', application: '應用', applied: '應用', practical: '實務',
            theoretical: '理論', theory: '理論', model: '模型', methodology: '方法論',
            framework: '框架', concept: '概念', foundational: '基礎', abstract: '抽象',
            axiomatic: '公理化', empirical: '實證', experimental: '實驗', observational: '觀測',
            analytical: '分析', analysis: '分析', quantitative: '量化', qualitative: '質化',
            logic: '邏輯', algebra: '代數', calculus: '微積分', geometry: '幾何',
            topology: '拓撲', probability: '機率', statistics: '統計', differential: '微分',
            equations: '方程', number: '數論', graph: '圖', set: '集合', field: '領域',
            interdisciplinary: '跨領域', cross: '跨', domain: '領域', molecular: '分子',
            atomic: '原子', cellular: '細胞', ecological: '生態', planetary: '行星',
            cosmic: '宇宙', scale: '尺度', ethics: '倫理', policy: '政策', society: '社會',
            social: '社會', culture: '文化', cultural: '文化', cognitive: '認知',
            medical: '醫學', biomedical: '生醫', chemistry: '化學', physics: '物理',
            biology: '生物', linguistics: '語言學', philosophy: '哲學', art: '藝術',
            music: '音樂', design: '設計', law: '法律', cybersecurity: '資安',
            machine: '機器', learning: '學習', network: '網路', systems: '系統',
            system: '系統', computing: '計算', computer: '電腦', language: '語言',
            processing: '處理', public: '公共', health: '健康', significant: '重要',
            established: '成熟', unifying: '統一',
        };

        function localizeTag(tag) {
            const mapped = TAG_LABELS[LANG] && TAG_LABELS[LANG][tag];
            if (mapped) return mapped;
            const centuryMatch = tag.match(/^(\d{1,2})th_century$/);
            if (centuryMatch && (LANG === 'zh' || LANG === 'ja')) return `${centuryMatch[1]}世紀`;
            if (LANG === 'en') return humanizeTag(tag);
            if (LANG === 'zh') {
                const rangeMatch = tag.match(/^(\d+)bce_to_(\d+)ce$/);
                if (rangeMatch) return `${rangeMatch[1]}公元前至${rangeMatch[2]}公元`;
                const tokens = tag.split('_').filter(Boolean);
                const converted = tokens.map(tok => TAG_TOKEN_ZH[tok] || tok);
                if (converted.every((v, i) => v === tokens[i])) return humanizeTag(tag);
                return converted.join('');
            }
            return humanizeTag(tag);
        }

        function humanizeTag(tag) {
            return String(tag).replace(/_/g, ' ').split(' ').filter(Boolean)
                .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }

        function sectionLabel(kind) {
            const labels = {
                en: { definition: 'Definition', applications: 'Applications', theory: 'Theory', context: 'Why it matters', connections: 'Across fields', more: 'Read more' },
                zh: { definition: '定義', applications: '應用', theory: '理論', context: '為什麼重要', connections: '跨領域連結', more: '繼續閱讀' },
                ja: { definition: '定義', applications: '応用', theory: '理論', context: 'なぜ重要か', connections: '分野とのつながり', more: '続きを読む' },
            };
            return (labels[LANG] || labels.en)[kind] || kind;
        }

        // Domain stems marking a cross-domain "bridge" sentence in the English
        // copy. See app-main.js for the canonical notes.
        const BRIDGE_RE = /\b(?:biolog|physic|chemi|medic|engineer|mathemat|technolog|philosoph|econom|soci|cognit|public health|comput|neuro|psycholog|statistic|optic|ecolog|linguistic|architect|astronom|art|histor|geophysic|biochem)/;

        function descInlineMarkup(s) {
            return escHtml(s)
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/_(.+?)_/g, '<em>$1</em>');
        }
        function descSplitSentences(text) {
            return text.split(/(?<=[.!?]['"‘’“”)\]]?)\s+(?=[A-Z(])/).map((s) => s.trim()).filter(Boolean);
        }
        function descBridgeMatch(s) {
            const m = /^In ([^,]+),/.exec(s);
            if (!m) return null;
            return BRIDGE_RE.test(m[1].toLowerCase()) ? m[1] : null;
        }
        function descLongFallback(raw, sentences) {
            const words = raw.split(/\s+/).filter(Boolean).length;
            if (sentences.length < 3 || words < 55) return null;
            const tail = sentences.slice(1).join(' ').trim();
            if (!tail) return null;
            return `<p class="pd-lead">${descInlineMarkup(sentences[0])}</p>`
                + `<details class="pd-sec"><summary>${escHtml(sectionLabel('more'))}</summary>`
                + `<div class="pd-sec-body"><p>${descInlineMarkup(tail)}</p></div></details>`;
        }
        function descSectioned(raw) {
            const sentences = descSplitSentences(raw);
            const firstBridge = sentences.findIndex((s) => descBridgeMatch(s));
            if (firstBridge < 1) return descLongFallback(raw, sentences);
            const definition = sentences[0];
            const significance = sentences.slice(1, firstBridge).join(' ').trim();
            const groups = [];
            for (let i = firstBridge; i < sentences.length; i++) {
                const s = sentences[i];
                if (descBridgeMatch(s) || groups.length === 0) groups.push(s);
                else groups[groups.length - 1] += ' ' + s;
            }
            const items = groups.map((g) => {
                const domain = (descBridgeMatch(g) || '').replace(/\*\*/g, '').replace(/_/g, '').trim();
                const rest = g.replace(/^In [^,]+,\s*/, '');
                const title = domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : '';
                return `<li><span class="pd-domain">${escHtml(title)}</span> ${descInlineMarkup(rest)}</li>`;
            }).join('');
            let html = `<p class="pd-lead">${descInlineMarkup(definition)}</p>`;
            if (significance) {
                html += `<details class="pd-sec"><summary>${escHtml(sectionLabel('context'))}</summary>`
                    + `<div class="pd-sec-body"><p>${descInlineMarkup(significance)}</p></div></details>`;
            }
            html += `<details class="pd-sec"><summary>${escHtml(sectionLabel('connections'))}</summary>`
                + `<div class="pd-sec-body"><ul class="pd-bridges">${items}</ul></div></details>`;
            return html;
        }

        const DOMAIN_NAME = {
            en: { MAT: 'Mathematics', PHY: 'Physics', CHE: 'Chemistry', BIO: 'Biology', MED: 'Medicine', ENG: 'Engineering', TEC: 'Technology', SOC: 'Social science', HUM: 'Humanities', PHI: 'Philosophy', ART: 'Arts', HIS: 'History' },
            zh: { MAT: '數學', PHY: '物理', CHE: '化學', BIO: '生物', MED: '醫學', ENG: '工程', TEC: '科技', SOC: '社會', HUM: '人文', PHI: '哲學', ART: '藝術', HIS: '歷史' },
            ja: { MAT: '数学', PHY: '物理', CHE: '化学', BIO: '生物', MED: '医学', ENG: '工学', TEC: '技術', SOC: '社会', HUM: '人文', PHI: '哲学', ART: '芸術', HIS: '歴史' },
        };
        function domainName(code) { return (DOMAIN_NAME[LANG] || DOMAIN_NAME.en)[code] || code; }
        function structLabel(kind, type) {
            const person = type === 'person', event = type === 'event';
            const L = {
                core: { en: person ? 'Key contributions' : event ? 'What led to it' : 'The core idea', zh: person ? '主要貢獻' : event ? '背景與起因' : '核心概念', ja: person ? '主な業績' : event ? '背景と原因' : '核心概念' },
                impact: { en: person ? 'Legacy' : event ? 'Aftermath' : 'What it changed', zh: person ? '影響與遺產' : event ? '後續影響' : '改變了什麼', ja: person ? '影響と遺産' : event ? 'その後の影響' : '変えたもの' },
                links: { en: 'Connections across fields', zh: '跨領域連結', ja: '分野とのつながり' },
            };
            const set = L[kind] || L.links;
            return set[LANG] || set.en;
        }
        function descBlock(title, inner) {
            return `<details class="pd-sec"><summary>${escHtml(title)}</summary><div class="pd-sec-body">${inner}</div></details>`;
        }
        function renderStructuredSections(node, sec) {
            const type = node.type;
            let html = `<p class="pd-lead">${descInlineMarkup(sec.lead || '')}</p>`;
            if (sec.core) html += descBlock(structLabel('core', type), `<p>${descInlineMarkup(sec.core)}</p>`);
            if (sec.impact) html += descBlock(structLabel('impact', type), `<p>${descInlineMarkup(sec.impact)}</p>`);
            if (sec.links && sec.links.length) {
                const items = sec.links.map((l) =>
                    `<li><span class="pd-domain" style="color:${DC[l.d] || 'var(--panel-ink)'}">${escHtml(domainName(l.d))}</span> ${descInlineMarkup(l.t)}</li>`
                ).join('');
                html += descBlock(structLabel('links', type), `<ul class="pd-bridges">${items}</ul>`);
            }
            return html;
        }
        function renderPanelDescription(node) {
            if (LANG === 'en' && enSectionsMap[node.id]) return renderStructuredSections(node, enSectionsMap[node.id]);
            const raw = nodeDescription(node).trim();
            if (!raw) return '';
            return descSectioned(raw) || `<p>${descInlineMarkup(raw)}</p>`;
        }

        function relationLabel(relationType) {
            const key = { logical:'relLogical', historical:'relHistorical', applied:'relApplied', conceptual:'relConceptual', causal:'relCausal' }[relationType];
            return key ? t(key) : relationType;
        }
        function typeLabel(type) {
            const key = { field:'typeField', concept:'typeConcept', person:'typePerson', event:'typeEvent' }[type];
            return key ? t(key) : type;
        }
        function nodeLabel(n) {
            if (LANG !== 'en' && n && labelMap[n.id]) return labelMap[n.id];
            return n ? n.label : '';
        }
        function nodeDescription(n) {
            if (!n) return '';
            if (LANG !== 'en' && descriptionMap[n.id]) return descriptionMap[n.id];
            return n.description || enDescriptionMap[n.id] || '';
        }

        async function fetchLocaleLabels(locale) {
            try {
                const primary = await fetch(`/api/i18n/${encodeURIComponent(locale)}`);
                if (primary.ok) return await primary.json();
            } catch (_) {}
            const fallback = await fetch(`../data/i18n/${encodeURIComponent(locale)}.json`);
            if (fallback.ok) return await fallback.json();
            const english = await fetch('../data/i18n/en.json');
            if (english.ok) return await english.json();
            return {};
        }

        async function fetchLocaleDescriptions(locale) {
            if (!locale || locale === 'en') return {};
            try {
                const primary = await fetch(`/api/i18n/${encodeURIComponent(locale)}/descriptions`);
                if (primary.ok) {
                    const payload = await primary.json();
                    if (payload && typeof payload === 'object') {
                        return payload.descriptions && typeof payload.descriptions === 'object' ? payload.descriptions : payload;
                    }
                }
            } catch (_) {}
            for (const path of [
                `../data/i18n/${encodeURIComponent(locale)}_descriptions.json`,
                `../data/i18n/${encodeURIComponent(locale)}_descriptions_batch1.json`
            ]) {
                try {
                    const r = await fetch(path);
                    if (!r.ok) continue;
                    const p = await r.json();
                    if (p && typeof p === 'object') return p.descriptions && typeof p.descriptions === 'object' ? p.descriptions : p;
                } catch (_) {}
            }
            return {};
        }

        async function loadLocaleMaps(locale) {
            if (!locale || locale === 'en') return { labels: {}, descriptions: {} };
            if (localeMapsCache[locale]) return localeMapsCache[locale];
            const [lr, dr] = await Promise.allSettled([fetchLocaleLabels(locale), fetchLocaleDescriptions(locale)]);
            const maps = {
                labels: lr.status === 'fulfilled' ? lr.value : {},
                descriptions: dr.status === 'fulfilled' ? dr.value : {},
            };
            localeMapsCache[locale] = maps;
            return maps;
        }

        function applyI18n() {
            document.getElementById('hdr-home-link').textContent = t('navHome');
            document.getElementById('hdr-graph-link').textContent = t('navGraph');
            document.getElementById('hdr-title').textContent = t('hdrTitle');
            document.getElementById('hdr-subtitle').textContent = t('hdrSubtitle');
            document.getElementById('welcome-title').textContent = t('welcomeTitle');
            document.getElementById('welcome-subtitle').textContent = t('welcomeSubtitle');
            document.getElementById('recommend-title').textContent = t('recommended');
            document.getElementById('search-input').placeholder = t('searchPlaceholder');
            // Labels only — the leading <svg class="btn-ico"> stays untouched.
            document.querySelector('#btn-reset .btn-label').textContent = t('btnReset');
            document.querySelector('#btn-fit .btn-label').textContent = t('btnFit');
            document.querySelector('#btn-undo .btn-label').textContent = t('btnUndo');
            document.querySelector('#btn-help .btn-label').textContent = t('btnHelp');
            document.querySelector('#btn-tour .btn-label').textContent = t('btnGuide');
            document.getElementById('btn-reset').title = t('btnResetTitle');
            document.getElementById('btn-fit').title = t('btnFitTitle');
            document.getElementById('btn-undo').title = t('btnUndoTitle');
            document.getElementById('btn-focus').title = t('btnFocusTitle');
            document.getElementById('btn-help').title = t('btnHelpTitle');
            document.getElementById('btn-tour').title = t('btnGuideTitle');
            document.getElementById('ctx-expand').textContent = t('ctxExpand');
            document.getElementById('ctx-collapse').textContent = t('ctxCollapse');
            document.getElementById('ctx-path').textContent = t('ctxPath');
            document.getElementById('ctx-focus').textContent = t('ctxFocus');
            document.getElementById('shortcuts-title').textContent = t('shortcutsTitle');
            document.getElementById('shortcuts-intro').textContent = t('shortcutsIntro');
            document.getElementById('sc-search').textContent = t('scSearch');
            document.getElementById('sc-search-alt').textContent = t('scSearchAlt');
            document.getElementById('sc-undo').textContent = t('scUndo');
            document.getElementById('sc-close').textContent = t('scClose');
            document.getElementById('sc-show').textContent = t('scShow');
            document.getElementById('sc-expand').textContent = t('scExpand');
            document.getElementById('sc-context').textContent = t('scContext');
            document.getElementById('shortcuts-close').textContent = t('shortcutsClose');
            document.getElementById('onboard-hint').textContent = t('onboardingEscHint');
            document.getElementById('onboard-skip').textContent = t('onboardingSkip');
            document.getElementById('p-conns-title').textContent = t('connections');
            document.getElementById('legend-logical').textContent = t('relLogical');
            document.getElementById('legend-historical').textContent = t('relHistorical');
            document.getElementById('legend-applied').textContent = t('relApplied');
            document.getElementById('legend-conceptual').textContent = t('relConceptual');
            document.getElementById('legend-causal').textContent = t('relCausal');
            const langToggle = document.getElementById('lang-toggle');
            if (langToggle) langToggle.setAttribute('aria-label', 'Language selector');
            document.querySelector('.lang-btn[data-lang="en"]')?.setAttribute('aria-label', 'Switch language to English');
            document.querySelector('.lang-btn[data-lang="zh"]')?.setAttribute('aria-label', 'Switch language to Chinese');
            document.querySelector('.lang-btn[data-lang="ja"]')?.setAttribute('aria-label', 'Switch language to Japanese');
            document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === LANG));
            updateFocusButton();
            if (renderer) renderer.notify();
            renderBreadcrumb();
            updateRecommendations();
            updateStats();
            if (document.getElementById('onboard').classList.contains('visible')) renderTourStep();
            if (selectedNodeId && nodeMap[selectedNodeId]) openPanel(nodeMap[selectedNodeId]);
        }

        async function setLang(lang) {
            if (!isValidLang(lang)) return;
            LANG = lang;
            localStorage.setItem('nodus-lang', lang);
            document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : lang;
            const requestSeq = ++localeLoadSeq;
            const maps = await loadLocaleMaps(LANG);
            if (requestSeq !== localeLoadSeq) return;
            labelMap = maps.labels;
            descriptionMap = maps.descriptions;
            applyI18n();
        }

        // ===== DATA LOADING =====
        async function loadData() {
            let apiError = null;
            try {
                const apiPayload = await fetchJsonWithTimeout('/api/graph/full', 9000);
                return normalizeGraphNodes(apiPayload);
            } catch (err) { apiError = err; }
            try {
                const staticPayload = await fetchJsonWithTimeout('../data/all_nodes.json', 7000);
                return normalizeGraphNodes(staticPayload);
            } catch (err) {
                const reason = apiError ? `${apiError.message}; ${err.message}` : err.message;
                throw new Error(`Unable to load graph data (${reason}).`);
            }
        }

        // ===== GRAPH ENGINE (Canvas) =====
        function initGraph() {
            const W = window.innerWidth, H = window.innerHeight;
            const canvas = document.getElementById('canvas');
            canvasSel = d3.select(canvas);

            // Canvas renderer: initialized with empty arrays, setData fills them.
            renderer = createCanvasRenderer({
                canvas,
                nodes: visibleNodes,
                edges: visibleEdges,
                relationColor: rel => RC[rel],
                domainColor: n => nc(n),
                starMeta: n => sm(n),
                label: explorerLabelInfo,
            });

            // Repaint once fonts are ready.
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => { if (renderer) renderer.notify(); });
            }

            // Zoom — identical filter pattern to app-main: panning doesn't steal
            // pointer from a node drag, and ctrl-wheel is reserved for OS zoom.
            let _labelRaf = 0;
            zoomBehavior = d3.zoom().scaleExtent([0.1, 8])
                .filter(ev => {
                    if (ev.ctrlKey && ev.type !== 'wheel') return false;
                    if (ev.button) return false;
                    if (ev.type === 'mousedown' || ev.type === 'touchstart') {
                        const [px, py] = d3.pointer(ev, canvas);
                        return !findNodeAtScreen(px, py);
                    }
                    return true;
                })
                .on('zoom', e => {
                    viewTransform = e.transform;
                    currentZoom = e.transform.k;
                    renderer.setTransform(e.transform);
                    updateZoomIndicator();
                    if (!_labelRaf) {
                        _labelRaf = requestAnimationFrame(() => { if (renderer) renderer.notify(); _labelRaf = 0; });
                    }
                });

            canvasSel.call(zoomBehavior);
            // Free the double-click gesture for node expansion — otherwise d3.zoom's
            // built-in dblclick-to-zoom intercepts it.
            canvasSel.on('dblclick.zoom', null);

            // Node drag — subject hit-tests the canvas before D3 claims the pointer.
            canvasSel.call(d3.drag()
                .container(canvas)
                .subject(ev => {
                    const [px, py] = d3.pointer(ev.sourceEvent, canvas);
                    return findNodeAtScreen(px, py) || undefined;
                })
                .on('start', ev => {
                    if (!ev.active) sim.alphaTarget(0.3).restart();
                    ev.subject.fx = ev.subject.x;
                    ev.subject.fy = ev.subject.y;
                })
                .on('drag', ev => {
                    const [px, py] = d3.pointer(ev.sourceEvent, canvas);
                    ev.subject.fx = (px - viewTransform.x) / viewTransform.k;
                    ev.subject.fy = (py - viewTransform.y) / viewTransform.k;
                })
                .on('end', ev => {
                    if (!ev.active) sim.alphaTarget(0);
                    ev.subject.fx = null;
                    ev.subject.fy = null;
                }));

            // Hover — brighten star and change cursor.
            canvas.addEventListener('pointermove', e => {
                const [px, py] = d3.pointer(e, canvas);
                const node = findNodeAtScreen(px, py);
                renderer.setHover(node ? node.id : null);
                canvas.style.cursor = node ? 'pointer' : '';
            });
            canvas.addEventListener('pointerleave', () => {
                renderer.setHover(null);
                canvas.style.cursor = '';
            });

            // Single click selects (+ recenters); a second click near the same
            // spot within 400ms expands. The double-click test is anchored to the
            // FIRST click's CURSOR position, not a re-hit-test — selecting recenters
            // the node out from under the pointer, so a positional re-hit on the
            // 2nd click would miss it. (The old SVG build used element-level
            // dblclick, which canvas hit-testing has no equivalent for.)
            let _lastClickTime = 0, _lastClickId = null, _lastClickX = 0, _lastClickY = 0;
            canvas.addEventListener('click', e => {
                const [px, py] = d3.pointer(e, canvas);
                const now = performance.now();
                if (_lastClickId && now - _lastClickTime < 400 &&
                    Math.hypot(px - _lastClickX, py - _lastClickY) < 60) {
                    expandNode(_lastClickId);
                    _lastClickId = null;
                    return;
                }
                const node = findNodeAtScreen(px, py);
                if (node) {
                    handleClick(node);
                    _lastClickId = node.id; _lastClickTime = now; _lastClickX = px; _lastClickY = py;
                } else {
                    closePanel();
                    clearHighlights();
                    _lastClickId = null;
                }
            });

            // Context menu via canvas contextmenu event.
            setupContextMenu();

            // Force simulation — same parameterization as old SVG version.
            sim = d3.forceSimulation([])
                .force('link', d3.forceLink([]).id(d => d.id).distance(d => {
                    const s = nodeMap[d.source.id || d.source];
                    const t = nodeMap[d.target.id || d.target];
                    if (s && t && s.type === 'field' && t.type === 'field') return 140;
                    if ((s && s.type === 'field') || (t && t.type === 'field')) return 90;
                    return 60;
                }).strength(0.4))
                .force('charge', d3.forceManyBody().strength(d => d.type === 'field' ? -400 : -150))
                .force('center', d3.forceCenter(W / 2, H / 2).strength(0.05))
                .force('collision', d3.forceCollide(d => nr(nodeMap[d.id] || d) + 8))
                .alphaDecay(0.03)
                .on('tick', () => {
                    const a = sim.alpha();
                    if (a < 0.02) {
                        const tt = Math.min(1, (0.02 - a) / 0.019);
                        sim.velocityDecay(0.4 + tt * 0.5);
                    } else if (sim.velocityDecay() !== 0.4) {
                        sim.velocityDecay(0.4);
                    }
                    if (renderer) renderer.notify();
                });

            let _resizeTimer = 0;
            window.addEventListener('resize', () => {
                clearTimeout(_resizeTimer);
                _resizeTimer = setTimeout(() => {
                    sim.force('center', d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2));
                    if (visibleNodes.length > 0) sim.alpha(0.1).restart();
                }, 200);
            });

            // E2E / diagnostic hook.
            window.__nodusExplorer = {
                ready: () => allNodesRaw.length > 0,
                nodeIds: () => visibleNodes.map(n => n.id),
                screenPos: id => {
                    const n = sim.nodes().find(nd => nd.id === id);
                    if (!n || !Number.isFinite(n.x)) return null;
                    return { x: n.x * viewTransform.k + viewTransform.x, y: n.y * viewTransform.k + viewTransform.y };
                },
                worldPos: id => { const n = sim.nodes().find(nd => nd.id === id); return n ? { x: n.x, y: n.y } : null; },
                degree: id => (_explorerStarMeta[id] || {}).degree || 0,
                startExploration,
                selectNode: id => {
                    const n = sim.nodes().find(nd => nd.id === id) || nodeMap[id];
                    if (n) handleClick(n);
                },
                debug: () => renderer ? renderer.debugCounts() : {},
            };

            setupExplorerOverlay();
        }

        // ===== DIMMING UTILITY =====
        // Single function owns the vis.dimmed flag so focus-mode and domain-filter
        // don't clobber each other.
        function updateDimming() {
            if (!renderer) return;
            // Recompute focusKeepSet from current focusDepth + selectedNodeId.
            focusKeepSet = new Set();
            if (focusDepth > 0 && selectedNodeId) {
                const graphAdj = {};
                for (const e of visibleEdges) {
                    const sId = e.source.id || e.source;
                    const tId = e.target.id || e.target;
                    if (!graphAdj[sId]) graphAdj[sId] = [];
                    if (!graphAdj[tId]) graphAdj[tId] = [];
                    graphAdj[sId].push(tId);
                    graphAdj[tId].push(sId);
                }
                focusKeepSet.add(selectedNodeId);
                let frontier = [selectedNodeId];
                for (let depth = 0; depth < focusDepth; depth++) {
                    const next = [];
                    for (const id of frontier) {
                        for (const nb of (graphAdj[id] || [])) {
                            if (!focusKeepSet.has(nb)) { focusKeepSet.add(nb); next.push(nb); }
                        }
                    }
                    if (!next.length) break;
                    frontier = next;
                }
            }

            for (const n of visibleNodes) {
                const node = nodeMap[n.id];
                const filterDim = activeFilter ? !(node && node.domain.includes(activeFilter)) : false;
                const focusDim = focusDepth > 0 && selectedNodeId ? !focusKeepSet.has(n.id) : false;
                ensureVis(n).dimmed = filterDim || focusDim;
            }
            for (const e of visibleEdges) {
                const sId = e.source.id || e.source;
                const tId = e.target.id || e.target;
                const sNode = nodeMap[sId], tNode = nodeMap[tId];
                const filterDim = activeFilter ? !(
                    (sNode && sNode.domain.includes(activeFilter)) ||
                    (tNode && tNode.domain.includes(activeFilter))
                ) : false;
                const focusDim = focusDepth > 0 && selectedNodeId
                    ? !(focusKeepSet.has(sId) && focusKeepSet.has(tId)) : false;
                ensureVis(e).dimmed = filterDim || focusDim;
            }
            renderer.notify();
        }

        // ===== REBUILD VISUALS =====
        function rebuildVisuals() {
            visibleNodes = Array.from(visibleNodeIds).map(id => {
                const existing = sim.nodes().find(n => n.id === id);
                if (existing) return existing;
                return { ...nodeMap[id] };
            });

            const edgeSet = new Set();
            visibleEdges = [];
            for (const id of visibleNodeIds) {
                for (const conn of (adjacency[id] || [])) {
                    if (!visibleNodeIds.has(conn.target)) continue;
                    const key = [id, conn.target].sort().join('|') + '|' + conn.relation_type;
                    if (edgeSet.has(key)) continue;
                    edgeSet.add(key);
                    visibleEdges.push({ source: id, target: conn.target, relation_type: conn.relation_type, pending: conn.pending });
                }
            }

            // Initialize vis bags on new objects.
            for (const n of visibleNodes) ensureVis(n);
            for (const e of visibleEdges) ensureVis(e);

            // Update simulation.
            const n = visibleNodes.length;
            if (n > 100) {
                sim.force('charge').strength(d => d.type === 'field' ? -250 : -80);
                sim.alphaDecay(0.04);
            } else if (n > 50) {
                sim.force('charge').strength(d => d.type === 'field' ? -350 : -120);
                sim.alphaDecay(0.035);
            } else {
                sim.force('charge').strength(d => d.type === 'field' ? -400 : -150);
                sim.alphaDecay(0.03);
            }

            sim.nodes(visibleNodes);
            sim.force('link').links(visibleEdges);
            sim.alpha(0.6).restart();

            buildExplorerStarMeta();
            renderer.setData(visibleNodes, visibleEdges);

            updateDimming();
            updateStats();
            updateRecommendations();
            saveState();
        }

        // ===== HIGHLIGHT / SELECTION =====
        function highlightNode(id) {
            clearHighlightsInternal();
            for (const e of visibleEdges) {
                const sId = e.source.id || e.source;
                const tId = e.target.id || e.target;
                const connected = sId === id || tId === id;
                ensureVis(e).highlight = connected;
            }
            for (const n of visibleNodes) {
                ensureVis(n).related = relatedLabelIds.has(n.id);
            }
            if (renderer) renderer.notify();
        }

        function clearHighlightsInternal() {
            for (const e of visibleEdges) {
                const v = ensureVis(e);
                v.highlight = false;
                v.prereqPath = false;
            }
            for (const n of visibleNodes) {
                const v = ensureVis(n);
                v.related = false;
                v.onPath = false;
            }
            relatedLabelIds = new Set();
        }

        function clearHighlights() {
            clearHighlightsInternal();
            updateDimming();
        }

        function applyFocusMode() {
            updateDimming();
        }

        function applyFilter() {
            updateDimming();
            updateStats();
        }

        // ===== PATH DISPLAY =====
        function showPath(path) {
            if (!path || path.length < 2) return;
            for (const id of path) visibleNodeIds.add(id);
            for (let i = 0; i < path.length - 1; i++) expandedNodeIds.add(path[i]);
            sim.nodes([]);
            sim.force('link').links([]);
            rebuildVisuals();

            setTimeout(() => {
                const pathSet = new Set(path);
                const pathEdges = new Set();
                for (let i = 0; i < path.length - 1; i++) {
                    pathEdges.add([path[i], path[i + 1]].sort().join('|'));
                }
                clearHighlightsInternal();
                for (const n of visibleNodes) ensureVis(n).onPath = pathSet.has(n.id);
                for (const e of visibleEdges) {
                    const sId = e.source.id || e.source;
                    const tId = e.target.id || e.target;
                    const key = [sId, tId].sort().join('|');
                    const onPath = pathEdges.has(key);
                    const v = ensureVis(e);
                    v.prereqPath = onPath;
                    v.highlight = false;
                    v.dimmed = !onPath;
                }
                if (renderer) renderer.notify();
            }, 500);
        }

        function clearPath() {
            for (const n of visibleNodes) ensureVis(n).onPath = false;
            for (const e of visibleEdges) {
                const v = ensureVis(e);
                v.prereqPath = false;
                v.dimmed = false;
            }
            updateDimming();
        }

        // ===== INTERACTION =====
        function handleClick(d) {
            selectedNodeId = d.id;
            relatedLabelIds = getRelatedNodeIds(d.id);
            openPanel(d);
            highlightNode(d.id);
            applyFocusMode();
            renderer.setSelected(d);
            centerViewOnNode(d, 420);
        }

        function getRelatedNodeIds(nodeId) {
            const ids = new Set([nodeId]);
            for (const edge of visibleEdges) {
                const sId = edge.source.id || edge.source;
                const tId = edge.target.id || edge.target;
                if (sId === nodeId) ids.add(tId);
                else if (tId === nodeId) ids.add(sId);
            }
            return ids;
        }

        // ===== ZOOM / PAN =====
        function updateFocusButton() {
            const btn = document.getElementById('btn-focus');
            const label = focusDepth === 0 ? t('focusOff') : focusDepth === 1 ? t('focus1') : t('focus2');
            btn.querySelector('.btn-label').textContent = label;
            btn.classList.toggle('active', focusDepth > 0);
        }

        function percentile(sortedValues, p) {
            if (!sortedValues.length) return 0;
            const idx = Math.min(sortedValues.length - 1, Math.max(0, Math.floor((sortedValues.length - 1) * p)));
            return sortedValues[idx];
        }

        function connectedPointsForNode(nodeId) {
            const simNodeMap = new Map(sim.nodes().map(n => [n.id, n]));
            const points = [];
            for (const edge of visibleEdges) {
                const sId = edge.source.id || edge.source;
                const tId = edge.target.id || edge.target;
                let neighbor = null;
                if (sId === nodeId) neighbor = simNodeMap.get(tId);
                else if (tId === nodeId) neighbor = simNodeMap.get(sId);
                if (!neighbor || !Number.isFinite(neighbor.x) || !Number.isFinite(neighbor.y)) continue;
                points.push(neighbor);
            }
            return points;
        }

        function estimateAdaptiveScale(node, availableWidth, availableHeight) {
            const neighbors = connectedPointsForNode(node.id);
            if (!neighbors.length) return Math.max(0.9, Math.min(2.4, currentZoom || 1.2));
            const distances = neighbors
                .map(n => Math.hypot(n.x - node.x, n.y - node.y))
                .filter(d => Number.isFinite(d) && d > 0)
                .sort((a, b) => a - b);
            if (!distances.length) return Math.max(0.9, Math.min(2.4, currentZoom || 1.2));
            const nearestCount = Math.max(10, Math.min(28, Math.floor(distances.length * 0.55)));
            const focusRadius = Math.max(26, percentile(distances.slice(0, nearestCount), 0.82));
            const targetRadiusPx = Math.min(availableWidth * 0.42, availableHeight * 0.44);
            return Math.max(0.95, Math.min(4.2, targetRadiusPx / focusRadius));
        }

        function centerViewOnNode(node, duration = 500) {
            if (!canvasSel || !zoomBehavior || !node || Number.isNaN(node.x) || Number.isNaN(node.y)) return;
            const W = window.innerWidth, H = window.innerHeight;
            const panelOffset = getPanelOffset();
            const availableWidth = Math.max(240, W + panelOffset * 2);
            const centerX = availableWidth / 2;
            const scale = estimateAdaptiveScale(node, availableWidth, H);
            const transform = d3.zoomIdentity.translate(centerX, H / 2).scale(scale).translate(-node.x, -node.y);
            canvasSel.transition().duration(duration).call(zoomBehavior.transform, transform);
        }

        function fitView() {
            if (visibleNodes.length === 0) return;
            const W = window.innerWidth, H = window.innerHeight;
            const xs = visibleNodes.map(n => n.x).filter(x => !isNaN(x));
            const ys = visibleNodes.map(n => n.y).filter(y => !isNaN(y));
            if (xs.length === 0) return;
            const x0 = Math.min(...xs) - 40, x1 = Math.max(...xs) + 40;
            const y0 = Math.min(...ys) - 40, y1 = Math.max(...ys) + 40;
            const dx = x1 - x0, dy = y1 - y0;
            const scale = Math.min(W / dx, H / dy, 2) * 0.85;
            const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
            const transform = d3.zoomIdentity.translate(W / 2, H / 2).scale(scale).translate(-cx, -cy);
            canvasSel.transition().duration(500).call(zoomBehavior.transform, transform);
        }

        // ===== TOOLTIP =====
        const tooltipEl = document.getElementById('tooltip');

        function showTooltip(e, d) {
            const node = nodeMap[d.id] || d;
            tooltipEl.querySelector('.tt-label').textContent = nodeLabel(node);
            tooltipEl.querySelector('.tt-desc').textContent = truncate(nodeDescription(node), 80);
            const hidden = neighborCount(d.id);
            const domains = node.domain.join(', ');
            tooltipEl.querySelector('.tt-meta').textContent = `${typeLabel(node.type)} · ${domains}${hidden > 0 ? ` · ${hidden} ${t('hiddenConnections')}` : ''}`;
            moveTooltip(e);
            tooltipEl.classList.add('visible');
        }
        function moveTooltip(e) {
            tooltipEl.style.left = (e.clientX + 14) + 'px';
            tooltipEl.style.top = (e.clientY + 14) + 'px';
        }
        function hideTooltip() { tooltipEl.classList.remove('visible'); }

        // Canvas hover also shows tooltip via pointermove.
        function setupCanvasTooltip() {
            const canvas = document.getElementById('canvas');
            canvas.addEventListener('pointermove', e => {
                const [px, py] = d3.pointer(e, canvas);
                const node = findNodeAtScreen(px, py);
                if (node) showTooltip(e, node);
                else hideTooltip();
            });
            canvas.addEventListener('pointerleave', hideTooltip);
        }

        // ===== LINK TOOLTIP (no longer driven by SVG events — link hover via canvas) =====
        const linkTooltipEl = document.getElementById('link-tooltip');
        function hideLinkTooltip() { linkTooltipEl.classList.remove('visible'); }

        // ===== EXPAND LOGIC =====
        function expandNode(id) {
            if (!nodeMap[id] || expandedNodeIds.has(id)) return;

            undoStack.push({
                visible: new Set(visibleNodeIds),
                expanded: new Set(expandedNodeIds),
                history: [...explorationHistory]
            });
            if (undoStack.length > 30) undoStack.shift();
            document.getElementById('btn-undo').disabled = false;

            expandedNodeIds.add(id);
            visibleNodeIds.add(id);
            explorationHistory.push(id);
            if (explorationHistory.length > 12) explorationHistory.shift();
            renderBreadcrumb();

            for (const conn of (adjacency[id] || [])) {
                if (nodeMap[conn.target]) visibleNodeIds.add(conn.target);
            }

            rebuildVisuals();

            // Position new nodes near the expanded node.
            const parentNode = sim.nodes().find(n => n.id === id);
            if (parentNode) {
                for (const n of sim.nodes()) {
                    if ((adjacency[id] || []).some(c => c.target === n.id) && (!Number.isFinite(n.x) || n.x === 0)) {
                        n.x = parentNode.x + (Math.random() - 0.5) * 60;
                        n.y = parentNode.y + (Math.random() - 0.5) * 60;
                    }
                }
            }

            setTimeout(() => {
                const node = sim.nodes().find(n => n.id === id);
                if (node && !isNaN(node.x)) {
                    const W = window.innerWidth, H = window.innerHeight;
                    const transform = d3.zoomIdentity
                        .translate(W / 2 + getPanelOffset(), H / 2)
                        .scale(Math.max(currentZoom, 1))
                        .translate(-node.x, -node.y);
                    canvasSel.transition().duration(500).call(zoomBehavior.transform, transform);
                }
            }, 600);

            document.getElementById('welcome').classList.add('hidden');
        }

        function startExploration(id) {
            visibleNodeIds.clear();
            expandedNodeIds.clear();
            selectedNodeId = null;
            undoStack = [];
            explorationHistory = [];
            sim.nodes([]);
            sim.force('link').links([]);
            visibleNodes = [];
            visibleEdges = [];
            renderer.setData(visibleNodes, visibleEdges);
            renderer.setSelected(null);

            expandNode(id);

            // Fit the whole freshly-expanded cluster into view (same logic as the
            // Fit button) once the force layout has settled — centering on the lone
            // source node left it pinned to a viewport edge.
            setTimeout(fitView, 800);
        }

        function resetGraph() {
            canvasSel.transition().duration(500).ease(d3.easeCubicInOut)
                .call(zoomBehavior.transform, d3.zoomIdentity)
                .on('end', () => {
                    visibleNodeIds.clear();
                    expandedNodeIds.clear();
                    selectedNodeId = null;
                    undoStack = [];
                    explorationHistory = [];
                    sim.nodes([]);
                    sim.force('link').links([]);
                    visibleNodes = [];
                    visibleEdges = [];
                    renderer.setData(visibleNodes, visibleEdges);
                    renderer.setSelected(null);
                    closePanel();
                    updateStats();
                    renderBreadcrumb();
                    document.getElementById('btn-undo').disabled = true;
                    document.getElementById('welcome').classList.remove('hidden');
                    localStorage.removeItem(STORAGE_KEY);
                    history.replaceState(null, '', window.location.pathname);
                });
        }

        // ===== STATS =====
        function updateStats() {
            const el = document.getElementById('stats');
            const filterBar = document.getElementById('filter-bar');
            if (visibleNodeIds.size === 0) {
                el.style.display = 'none';
                filterBar.classList.remove('visible');
                return;
            }
            el.style.display = 'block';
            filterBar.classList.add('visible');
            el.textContent = `${visibleNodeIds.size} ${t('explored')} · ${allNodesRaw.length} ${t('total')} · ${activeFilter || t('all')}`;
        }

        // ===== PANEL =====
        function openPanel(d) {
            const node = nodeMap[d.id] || d;
            document.getElementById('p-type').textContent = typeLabel(node.type);
            document.getElementById('p-type').style.color = nc(node);
            document.getElementById('p-label').textContent = nodeLabel(node);
            document.getElementById('p-domains').innerHTML = node.domain.map(dm =>
                `<span class="d-badge" style="color:${DC[dm]}">${escHtml(dm)}</span>`
            ).join('');
            document.getElementById('p-desc').innerHTML = renderPanelDescription(node);
            document.getElementById('p-tags').innerHTML = (node.display_tags || []).map(tag =>
                `<span class="tag">${escHtml(localizeTag(tag))}</span>`
            ).join('');

            const era = node.era;
            if (era && era.start != null) {
                const s = era.start < 0 ? `${Math.abs(era.start)} ${t('eraBce')}` : String(era.start);
                const end = era.end != null ? (era.end < 0 ? `${Math.abs(era.end)} ${t('eraBce')}` : String(era.end)) : t('eraPresent');
                document.getElementById('p-era').textContent = `${s} — ${end}`;
            } else {
                document.getElementById('p-era').textContent = '';
            }

            const conns = (node.connections || []).filter(c => nodeMap[c.target]);
            conns.sort((a, b) => (visibleNodeIds.has(a.target) ? 0 : 1) - (visibleNodeIds.has(b.target) ? 0 : 1));
            const CONN_LIMIT = 5;
            document.getElementById('p-conn-count').textContent = `(${conns.length})`;

            function renderConns(list) {
                return list.map(c => {
                    const target = nodeMap[c.target];
                    const inGraph = visibleNodeIds.has(c.target);
                    return `<div class="${inGraph ? 'ci in-graph' : 'ci'}" data-id="${escHtml(c.target)}">
                        <div class="cd" style="background:${nc(target)}"></div>
                        <span class="ci-label">${escHtml(nodeLabel(target))}</span>
                        <span class="cr" style="color:${RC[c.relation_type] || '#888'}">${escHtml(relationLabel(c.relation_type))}</span>
                        ${inGraph ? '' : '<span class="ci-expand">+</span>'}
                    </div>`;
                }).join('');
            }

            const connListEl = document.getElementById('p-conn-list');
            const moreBtn = document.getElementById('p-conn-more');
            let showingAll = conns.length <= CONN_LIMIT;
            connListEl.innerHTML = renderConns(showingAll ? conns : conns.slice(0, CONN_LIMIT));
            moreBtn.style.display = conns.length > CONN_LIMIT ? 'block' : 'none';
            moreBtn.textContent = showingAll ? t('showLess') : `${t('showAll')} (${conns.length})`;

            moreBtn.onclick = () => {
                showingAll = !showingAll;
                connListEl.innerHTML = renderConns(showingAll ? conns : conns.slice(0, CONN_LIMIT));
                moreBtn.textContent = showingAll ? t('showLess') : `${t('showAll')} (${conns.length})`;
                bindConnClicks();
            };

            function bindConnClicks() {
                connListEl.querySelectorAll('.ci').forEach(el => {
                    el.addEventListener('click', () => {
                        const targetId = el.dataset.id;
                        if (!visibleNodeIds.has(targetId)) {
                            visibleNodeIds.add(targetId);
                            expandNode(targetId);
                        }
                        const targetNode = sim.nodes().find(n => n.id === targetId);
                        if (targetNode) {
                            handleClick(targetNode);
                            const W = window.innerWidth, H = window.innerHeight;
                            const transform = d3.zoomIdentity
                                .translate(W / 2 + getPanelOffset(), H / 2)
                                .scale(currentZoom)
                                .translate(-targetNode.x, -targetNode.y);
                            canvasSel.transition().duration(400).call(zoomBehavior.transform, transform);
                        }
                    });
                });
            }
            bindConnClicks();

            const paExpand = document.getElementById('pa-expand');
            const paCollapse = document.getElementById('pa-collapse');
            const paPath = document.getElementById('pa-path');
            const isExpanded = expandedNodeIds.has(d.id);
            paExpand.style.display = isExpanded ? 'none' : 'inline-block';
            paCollapse.style.display = isExpanded ? 'inline-block' : 'none';
            paPath.style.display = (explorationHistory.length > 1 && explorationHistory[explorationHistory.length - 1] !== d.id)
                ? 'inline-block' : 'none';

            paExpand.onclick = () => { expandNode(d.id); openPanel(d); };
            paCollapse.onclick = () => { collapseNode(d.id); closePanel(); };
            paPath.onclick = () => {
                const lastExpanded = explorationHistory[explorationHistory.length - 1];
                if (lastExpanded && lastExpanded !== d.id) {
                    clearPath();
                    const path = findShortestPath(lastExpanded, d.id);
                    if (path) showPath(path);
                }
            };

            document.getElementById('panel').classList.add('open');
            document.getElementById('recommend').classList.remove('visible');
        }

        function closePanel() {
            document.getElementById('panel').classList.remove('open');
            selectedNodeId = null;
            if (renderer) renderer.setSelected(null);
            applyFocusMode();
            updateRecommendations();
        }

        // ===== ONBOARDING =====
        function clearTourTargets() {
            document.querySelectorAll('.tour-target').forEach(el => el.classList.remove('tour-target'));
        }
        function renderTourStep() {
            const tourSteps = getTourSteps();
            const step = tourSteps[tourIndex];
            if (!step) return;
            document.getElementById('onboard-step').textContent = step.step;
            document.getElementById('onboard-title').textContent = step.title;
            document.getElementById('onboard-text').textContent = step.text;
            document.getElementById('onboard-next').textContent =
                tourIndex === tourSteps.length - 1 ? t('onboardingDone') : t('onboardingNext');
            clearTourTargets();
            const target = document.getElementById(step.target);
            if (target) target.classList.add('tour-target');
        }
        function closeTour(markDone = true) {
            document.getElementById('onboard').classList.remove('visible');
            clearTourTargets();
            if (markDone) localStorage.setItem(TOUR_KEY, 'done');
        }
        function openShortcuts() {
            closeTour(false);
            document.getElementById('shortcuts').classList.add('visible');
        }
        function closeShortcuts() { document.getElementById('shortcuts').classList.remove('visible'); }
        function startTour(force = false) {
            if (!force && localStorage.getItem(TOUR_KEY) === 'done') return;
            closeShortcuts();
            tourIndex = 0;
            document.getElementById('onboard').classList.add('visible');
            renderTourStep();
        }
        function setupOnboarding() {
            document.getElementById('onboard-next').addEventListener('click', () => {
                if (tourIndex >= getTourSteps().length - 1) { closeTour(true); return; }
                tourIndex += 1;
                renderTourStep();
            });
            document.getElementById('onboard-skip').addEventListener('click', () => closeTour(true));
            document.getElementById('onboard').addEventListener('click', e => { if (e.target.id === 'onboard') closeTour(true); });
            document.getElementById('onboard-card').addEventListener('click', e => e.stopPropagation());
        }

        // ===== SEARCH =====
        function setupSearch() {
            const input = document.getElementById('search-input');
            const results = document.getElementById('search-results');
            let debounceTimer = null, activeIndex = -1;

            function hideResults(clearInput = false) {
                results.style.display = 'none';
                document.body.classList.remove('search-open');
                activeIndex = -1;
                if (clearInput) input.value = '';
            }
            function renderResults(matches) {
                activeIndex = -1;
                if (matches.length === 0) { hideResults(); return; }
                results.innerHTML = matches.map(n => {
                    const inGraph = visibleNodeIds.has(n.id);
                    return `<div class="sr${inGraph ? ' in-graph' : ''}" data-id="${escHtml(n.id)}">
                        <div class="sr-dot" style="background:${nc(n)}"></div>
                        <span class="sr-label">${escHtml(nodeLabel(n))}</span>
                        <span class="sr-type">${escHtml(typeLabel(n.type))}</span>
                        <div class="sr-domains">${n.domain.map(d => `<span class="sr-domain" style="color:${DC[d]}">${d}</span>`).join('')}</div>
                        ${inGraph ? `<span class="sr-in-badge">${t('inGraph')}</span>` : ''}
                    </div>`;
                }).join('');
                results.style.display = 'block';
                document.body.classList.add('search-open');
                results.querySelectorAll('.sr').forEach(el => el.addEventListener('click', () => selectResult(el.dataset.id)));
            }
            function selectResult(id) {
                hideResults(true);
                const node = nodeMap[id];
                if (node) input.value = nodeLabel(node);
                input.blur();
                startExploration(id);
            }
            function updateActiveResult() {
                const items = results.querySelectorAll('.sr');
                items.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
                if (activeIndex >= 0 && items[activeIndex]) items[activeIndex].scrollIntoView({ block: 'nearest' });
            }

            input.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    const q = input.value.trim().toLowerCase();
                    if (q.length < 1) { hideResults(); return; }
                    const matches = allNodesRaw.filter(n =>
                        nodeLabel(n).toLowerCase().includes(q) ||
                        n.id.toLowerCase().includes(q) ||
                        n.domain.some(d => d.toLowerCase() === q) ||
                        (n.display_tags || []).some(tag => tag.toLowerCase().includes(q))
                    ).slice(0, 10);
                    renderResults(matches);
                }, 120);
            });

            input.addEventListener('keydown', e => {
                const items = results.querySelectorAll('.sr');
                if (e.key === 'ArrowDown') { e.preventDefault(); if (items.length) { activeIndex = Math.min(activeIndex + 1, items.length - 1); updateActiveResult(); } }
                else if (e.key === 'ArrowUp') { e.preventDefault(); if (items.length) { activeIndex = Math.max(activeIndex - 1, 0); updateActiveResult(); } }
                else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (activeIndex >= 0 && items[activeIndex]) selectResult(items[activeIndex].dataset.id);
                    else if (items.length > 0) selectResult(items[0].dataset.id);
                } else if (e.key === 'Escape') { hideResults(true); input.blur(); }
            });

            document.addEventListener('click', e => { if (!e.target.closest('#search-box')) hideResults(); });
            document.addEventListener('keydown', e => {
                if (e.key === 'Escape' && document.activeElement === input) { hideResults(true); input.blur(); return; }
                if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement !== input)) {
                    e.preventDefault(); input.focus(); input.select();
                }
            });
        }

        // ===== UNDO =====
        function undo() {
            if (undoStack.length === 0) return;
            const snapshot = undoStack.pop();
            visibleNodeIds = snapshot.visible;
            expandedNodeIds = snapshot.expanded;
            explorationHistory = snapshot.history;
            sim.nodes([]);
            sim.force('link').links([]);
            rebuildVisuals();
            renderBreadcrumb();
            document.getElementById('btn-undo').disabled = undoStack.length === 0;
        }

        // ===== COLLAPSE =====
        function collapseNode(id) {
            if (!expandedNodeIds.has(id)) return;
            undoStack.push({ visible: new Set(visibleNodeIds), expanded: new Set(expandedNodeIds), history: [...explorationHistory] });
            document.getElementById('btn-undo').disabled = false;
            expandedNodeIds.delete(id);

            const toRemove = new Set();
            for (const nid of (adjacency[id] || []).map(c => c.target)) {
                if (expandedNodeIds.has(nid)) continue;
                const hasOtherSource = Array.from(expandedNodeIds).some(expId =>
                    expId !== id && (adjacency[expId] || []).some(c => c.target === nid)
                );
                if (!hasOtherSource) toRemove.add(nid);
            }
            for (const nid of toRemove) visibleNodeIds.delete(nid);

            sim.nodes([]);
            sim.force('link').links([]);
            rebuildVisuals();
            renderBreadcrumb();
        }

        // ===== CONTEXT MENU =====
        let ctxTargetId = null;

        function setupContextMenu() {
            const menu = document.getElementById('ctx-menu');
            const canvas = document.getElementById('canvas');

            canvas.addEventListener('contextmenu', e => {
                e.preventDefault();
                const [px, py] = d3.pointer(e, canvas);
                const node = findNodeAtScreen(px, py);
                if (node) {
                    ctxTargetId = node.id;
                    menu.style.left = e.clientX + 'px';
                    menu.style.top = e.clientY + 'px';
                    menu.style.display = 'block';
                    document.getElementById('ctx-expand').style.display = expandedNodeIds.has(node.id) ? 'none' : 'block';
                    document.getElementById('ctx-collapse').style.display = expandedNodeIds.has(node.id) ? 'block' : 'none';
                    document.getElementById('ctx-path').style.display = (selectedNodeId && selectedNodeId !== node.id) ? 'block' : 'none';
                } else {
                    menu.style.display = 'none';
                }
            });

            document.addEventListener('click', () => { menu.style.display = 'none'; });

            document.getElementById('ctx-expand').addEventListener('click', () => {
                if (ctxTargetId) expandNode(ctxTargetId);
                menu.style.display = 'none';
            });
            document.getElementById('ctx-collapse').addEventListener('click', () => {
                if (ctxTargetId) collapseNode(ctxTargetId);
                menu.style.display = 'none';
            });
            document.getElementById('ctx-path').addEventListener('click', () => {
                if (ctxTargetId && selectedNodeId && ctxTargetId !== selectedNodeId) {
                    clearPath();
                    const path = findShortestPath(selectedNodeId, ctxTargetId);
                    if (path) showPath(path);
                }
                menu.style.display = 'none';
            });
            document.getElementById('ctx-focus').addEventListener('click', () => {
                if (ctxTargetId) {
                    const node = sim.nodes().find(n => n.id === ctxTargetId);
                    if (node) {
                        handleClick(node);
                        const W = window.innerWidth, H = window.innerHeight;
                        const transform = d3.zoomIdentity.translate(W / 2, H / 2).scale(1.5).translate(-node.x, -node.y);
                        canvasSel.transition().duration(400).call(zoomBehavior.transform, transform);
                    }
                }
                menu.style.display = 'none';
            });
        }

        // ===== BREADCRUMB =====
        function renderBreadcrumb() {
            const el = document.getElementById('breadcrumb');
            if (explorationHistory.length === 0) { el.innerHTML = ''; return; }

            const currentId = explorationHistory[explorationHistory.length - 1];
            let items;
            if (currentId === 'machine_learning_concept') {
                const mlPath = [
                    { id: 'computer_science_field', label: 'Computer Science' },
                    { id: 'artificial_intelligence_concept', label: 'Artificial Intelligence' },
                    { id: 'machine_learning_concept', label: 'Machine Learning' },
                ];
                items = mlPath.map((item, i) => {
                    const cls = i === mlPath.length - 1 ? 'bc-item current' : 'bc-item';
                    const sep = i < mlPath.length - 1 ? '<span class="bc-sep">›</span>' : '';
                    return `<span class="${cls}" data-id="${escHtml(item.id)}">${escHtml(item.label)}</span>${sep}`;
                });
            } else {
                items = explorationHistory.slice(-8).map((id, i, arr) => {
                    const node = nodeMap[id];
                    if (!node) return '';
                    const isCurrent = i === arr.length - 1;
                    return `<span class="${isCurrent ? 'bc-item current' : 'bc-item'}" data-id="${escHtml(id)}" style="color:${nc(node)}">${escHtml(nodeLabel(node))}</span>`;
                });
            }
            el.innerHTML = items.join('<span class="bc-sep">›</span>');

            el.querySelectorAll('.bc-item').forEach(item => {
                item.addEventListener('click', () => {
                    const id = item.dataset.id;
                    const node = sim.nodes().find(n => n.id === id);
                    if (node) {
                        handleClick(node);
                        const W = window.innerWidth, H = window.innerHeight;
                        const transform = d3.zoomIdentity
                            .translate(W / 2 + getPanelOffset(), H / 2)
                            .scale(currentZoom)
                            .translate(-node.x, -node.y);
                        canvasSel.transition().duration(400).call(zoomBehavior.transform, transform);
                    }
                });
            });
        }

        // ===== PATH FINDING =====
        function findShortestPath(startId, endId) {
            if (startId === endId) return [startId];
            const visited = new Set([startId]);
            const queue = [[startId]];
            while (queue.length > 0) {
                const path = queue.shift();
                const current = path[path.length - 1];
                for (const conn of (adjacency[current] || [])) {
                    if (visited.has(conn.target)) continue;
                    const newPath = [...path, conn.target];
                    if (conn.target === endId) return newPath;
                    visited.add(conn.target);
                    queue.push(newPath);
                    if (visited.size > 2000) return null;
                }
            }
            return null;
        }

        // ===== RECOMMENDATIONS =====
        function updateRecommendations() {
            const recEl = document.getElementById('recommend');
            const listEl = document.getElementById('rec-list');
            if (visibleNodeIds.size < 2) { recEl.classList.remove('visible'); return; }

            const frontier = [];
            for (const id of visibleNodeIds) {
                if (expandedNodeIds.has(id)) continue;
                const node = nodeMap[id];
                if (!node) continue;
                const hiddenConns = (adjacency[id] || []).filter(c => !visibleNodeIds.has(c.target)).length;
                const currentDomains = new Set();
                for (const vid of visibleNodeIds) { const vn = nodeMap[vid]; if (vn) vn.domain.forEach(d => currentDomains.add(d)); }
                const newDomains = node.domain.filter(d => !currentDomains.has(d)).length;
                const score = hiddenConns + newDomains * 3;
                if (score > 0) frontier.push({ id, node, score, hiddenConns });
            }
            frontier.sort((a, b) => b.score - a.score);
            const top = frontier.slice(0, 4);
            if (top.length === 0) { recEl.classList.remove('visible'); return; }

            recEl.classList.add('visible');
            listEl.innerHTML = top.map(f => `
                <button class="rec-item" type="button" data-id="${escHtml(f.id)}" aria-label="${escHtml(nodeLabel(f.node))}">
                    <div class="rec-dot" style="background:${nc(f.node)}"></div>
                    <span>${escHtml(nodeLabel(f.node))}</span>
                    <span class="rec-score">+${f.hiddenConns}</span>
                </button>
            `).join('');
            listEl.querySelectorAll('.rec-item').forEach(el => {
                el.addEventListener('click', () => { expandNode(el.dataset.id); updateRecommendations(); });
            });
        }

        // ===== DOMAIN FILTER =====
        function setupFilters() {
            const bar = document.getElementById('filter-bar');
            const domains = ['ALL', 'MAT', 'PHY', 'CHE', 'BIO', 'MED', 'ENG', 'TEC', 'SOC', 'HUM', 'PHI', 'ART', 'HIS'];
            domains.forEach(d => {
                const btn = document.createElement('div');
                btn.className = 'filter-btn' + (d === 'ALL' ? ' active' : '');
                btn.textContent = d;
                btn.style.color = d === 'ALL' ? '' : (DC[d] || '');
                btn.dataset.domain = d;
                btn.onclick = () => {
                    bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    activeFilter = d === 'ALL' ? null : d;
                    applyFilter();
                };
                bar.appendChild(btn);
            });
        }

        // ===== TOP CHROME =====
        function setupTopChrome() {
            const trigger = document.getElementById('top-chrome-trigger');
            const searchBox = document.getElementById('search-box');
            const filterBar = document.getElementById('filter-bar');
            const hdr = document.getElementById('hdr');
            const langToggle = document.getElementById('lang-toggle');
            const stats = document.getElementById('stats');
            const searchInput = document.getElementById('search-input');
            if (!trigger || !searchBox || !filterBar || !hdr || !langToggle || !stats || !searchInput) return;

            const pointerSupportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
            const hoverNoneQuery = window.matchMedia('(hover: none)');
            const desktopQuery = window.matchMedia('(min-width: 769px)');
            const interactiveAreas = [trigger, searchBox, filterBar, hdr, langToggle, stats];
            let handlersBound = false;
            let expandTimer = null, collapseTimer = null;

            const proximityEnabled = () => {
                if (!desktopQuery.matches) return false;
                if (pointerSupportsHover) return true;
                return !hoverNoneQuery.matches;
            };

            function expandChrome() {
                clearTimeout(collapseTimer);
                if (expandTimer) return;
                expandTimer = setTimeout(() => {
                    expandTimer = null;
                    trigger.setAttribute('aria-expanded', 'true');
                    [searchBox, filterBar, hdr, langToggle, stats].forEach(el => el.classList.remove('chrome-collapsed'));
                }, TOP_CHROME_EXPAND_DELAY);
            }

            function collapseChrome() {
                clearTimeout(expandTimer);
                expandTimer = null;
                if (collapseTimer) return;
                collapseTimer = setTimeout(() => {
                    collapseTimer = null;
                    trigger.setAttribute('aria-expanded', 'false');
                    [searchBox, filterBar, hdr, langToggle, stats].forEach(el => el.classList.add('chrome-collapsed'));
                }, TOP_CHROME_COLLAPSE_DELAY);
            }

            function bindProximityHandlers() {
                if (handlersBound) return;
                handlersBound = true;
                interactiveAreas.forEach(el => {
                    el.addEventListener('mouseenter', expandChrome);
                    el.addEventListener('mouseleave', collapseChrome);
                });
                trigger.addEventListener('mouseenter', expandChrome);
                trigger.addEventListener('focus', expandChrome);
                searchInput.addEventListener('focus', expandChrome);
                searchInput.addEventListener('blur', e => {
                    if (!e.relatedTarget || !e.relatedTarget.closest('#search-box')) collapseChrome();
                });
            }

            function unbindProximityHandlers() {
                if (!handlersBound) return;
                handlersBound = false;
                interactiveAreas.forEach(el => {
                    el.removeEventListener('mouseenter', expandChrome);
                    el.removeEventListener('mouseleave', collapseChrome);
                });
            }

            function handleMediaChange() {
                if (proximityEnabled()) bindProximityHandlers();
                else { unbindProximityHandlers(); expandChrome(); }
            }

            desktopQuery.addEventListener('change', handleMediaChange);
            hoverNoneQuery.addEventListener('change', handleMediaChange);
            handleMediaChange();
        }

        // ===== CONTROLS =====
        function setupControls() {
            document.getElementById('btn-reset').addEventListener('click', resetGraph);
            document.getElementById('btn-fit').addEventListener('click', fitView);
            document.getElementById('btn-undo').addEventListener('click', undo);
            document.getElementById('btn-focus').addEventListener('click', () => {
                focusDepth = (focusDepth + 1) % 3;
                updateFocusButton();
                applyFocusMode();
            });
            document.getElementById('btn-help').addEventListener('click', toggleShortcuts);
            document.getElementById('btn-tour').addEventListener('click', () => startTour(true));
            document.getElementById('close').addEventListener('click', () => { closePanel(); clearHighlights(); });
            document.getElementById('shortcuts-close').addEventListener('click', closeShortcuts);

            document.addEventListener('keydown', e => {
                const tag = document.activeElement.tagName;
                const isInput = tag === 'INPUT' || tag === 'TEXTAREA';
                if (e.ctrlKey && e.key === 'z' && !isInput) { e.preventDefault(); undo(); return; }
                if (e.ctrlKey && e.key === 'k') { e.preventDefault(); document.getElementById('search-input').focus(); return; }
                if (isInput) return;
                if (e.key === '?' && !e.ctrlKey) { e.preventDefault(); toggleShortcuts(); return; }
                if (e.key === '/') { e.preventDefault(); document.getElementById('search-input').focus(); return; }
                if (e.key === 'Escape') {
                    const sc = document.getElementById('shortcuts');
                    if (sc.classList.contains('visible')) closeShortcuts();
                    else if (document.getElementById('onboard').classList.contains('visible')) closeTour(true);
                    else { closePanel(); clearHighlights(); }
                    return;
                }
            });

            document.getElementById('shortcuts').addEventListener('click', e => {
                if (e.target.id === 'shortcuts') closeShortcuts();
            });
        }

        function toggleShortcuts() {
            const el = document.getElementById('shortcuts');
            if (el.classList.contains('visible')) closeShortcuts();
            else openShortcuts();
        }

        // ===== ZOOM INDICATOR =====
        let zoomIndicatorTimer = null;
        function updateZoomIndicator() {
            const el = document.getElementById('zoom-indicator');
            el.textContent = `${Math.round(currentZoom * 100)}%`;
            el.classList.add('visible');
            clearTimeout(zoomIndicatorTimer);
            zoomIndicatorTimer = setTimeout(() => el.classList.remove('visible'), 1200);
        }

        // ===== INIT =====
        async function init() {
            try {
                setLoadingState('Loading graph...');
                LANG = getLang();
                document.documentElement.lang = LANG === 'zh' ? 'zh-Hant' : LANG;

                const rawNodes = await loadData();
                hydrateGraphData(rawNodes);

                setLoadingState('Loading labels...');
                const maps = await loadLocaleMaps(LANG);
                labelMap = maps.labels;
                descriptionMap = maps.descriptions;

                hideLoadingState();
                initGraph();
                setupSearch();
                setupFilters();
                setupTopChrome();
                setupControls();
                setupOnboarding();
                setupCanvasTooltip();

                document.getElementById('lang-toggle').addEventListener('click', async e => {
                    const btn = e.target.closest('.lang-btn');
                    if (!btn) return;
                    await setLang(btn.dataset.lang);
                });

                applyI18n();
                updateFocusButton();
                restoreState();
                setTimeout(() => startTour(false), 280);

                fetchJsonWithTimeout('../data/descriptions.json', 7000)
                    .then(map => {
                        enDescriptionMap = (map && typeof map === 'object') ? map : {};
                        if (selectedNodeId && nodeMap[selectedNodeId]) openPanel(nodeMap[selectedNodeId]);
                    })
                    .catch(() => {});

                fetchJsonWithTimeout('../data/sections.json', 7000)
                    .then(map => {
                        enSectionsMap = (map && typeof map === 'object') ? map : {};
                        if (selectedNodeId && nodeMap[selectedNodeId]) openPanel(nodeMap[selectedNodeId]);
                    })
                    .catch(() => {});
            } catch (error) {
                lastLoadError = error;
                const msg = error && error.message ? error.message : 'Unable to initialize explorer.';
                setLoadingState(msg, true, true);
                const retryBtn = document.getElementById('loading-retry');
                if (retryBtn) {
                    retryBtn.onclick = () => {
                        retryBtn.disabled = true;
                        setLoadingState('Retrying...', false, false);
                        init();
                    };
                }
            }
        }

        // ===== PERSISTENCE =====
        const STORAGE_KEY = 'nodus-explorer-state';

        function saveState() {
            try {
                const state = {
                    visible: Array.from(visibleNodeIds),
                    expanded: Array.from(expandedNodeIds),
                    history: explorationHistory
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                if (expandedNodeIds.size > 0) {
                    history.replaceState(null, '', '#' + Array.from(expandedNodeIds).join(','));
                }
            } catch (e) {}
        }

        function restoreState() {
            const hash = window.location.hash.slice(1);
            if (hash) {
                const ids = hash.split(',').filter(id => nodeMap[id]);
                if (ids.length > 0) {
                    for (const id of ids) {
                        expandedNodeIds.add(id);
                        visibleNodeIds.add(id);
                        for (const conn of (adjacency[id] || [])) {
                            if (nodeMap[conn.target]) visibleNodeIds.add(conn.target);
                        }
                    }
                    explorationHistory = ids;
                    rebuildVisuals();
                    renderBreadcrumb();
                    document.getElementById('welcome').classList.add('hidden');
                    setTimeout(fitView, 800);
                    return;
                }
            }
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (!raw) return;
                const state = JSON.parse(raw);
                if (!state.visible || state.visible.length === 0) return;
                visibleNodeIds = new Set(state.visible.filter(id => nodeMap[id]));
                expandedNodeIds = new Set(state.expanded.filter(id => nodeMap[id]));
                explorationHistory = (state.history || []).filter(id => nodeMap[id]);
                if (visibleNodeIds.size > 0) {
                    rebuildVisuals();
                    renderBreadcrumb();
                    document.getElementById('welcome').classList.add('hidden');
                    setTimeout(fitView, 800);
                }
            } catch (e) {}
        }

        // ===== BACKGROUND PARTICLES =====
        // The Deep Field canvas renderer provides the star-field atmosphere.
        // The legacy bgCanvas particle IIFE has been removed (third duplicate
        // of three particle implementations — cleared as part of canvas migration).
        // bgCanvas element is kept in HTML but left blank intentionally.

        init();
