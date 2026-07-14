# Neblux 程式碼地圖（給接手的模型）

> 迷路時讀這份。行號會漂移，請以符號名搜尋。最後校準：2026-07-14。
> Graph Atlas WP0–WP5 已 branch complete，G0 共同基線是 `codex/graph-atlas-integration`：contracts／validators／stable locks、靜態 artifacts、內部 `/atlas-v2.html` 與 page-agnostic Renderer v2 core／lab 均存在。`master` 與 production 首頁／既有四頁 runtime 仍未切換；Luna 下一步依 RG-A brief 執行，滾動順序見 Implementation Roadmap v0.2。

## 四個入口

| 頁 | 主 JS | 用途 |
|----|-------|------|
| `frontend/index.html` | `src/landing-main.js` | 落地頁。粒子背景、搜尋、建議 pills、雙 CTA |
| `frontend/wonders.html` | `src/wonders-main.js` | **產品核心**。picker → intro → 敘事面板＋星空子圖 |
| `frontend/app.html` | `src/app-main.js` | 全圖 687 節點。搜尋、detail card、Learning Path |
| `frontend/explorer.html` | `src/explorer-main.js` | 漸進展開。轉型中（見 explorer-to-topics-plan.md），少動 |

## wonders-main.js 關鍵符號

- `WONDER_IDS`：19 個 tour id 陣列。**新增 tour 必改這裡**。
- `UI = { en:{...}, zh:{...}, ja:{...} }`：全部 UI 字串三語。
- `pick(obj)`：取當前語言字串，fallback en。`LANG` 存 `localStorage['neblux-lang']`。
- `loadWonder(id)` / `showPicker()`：入口分流。URL `?w=<id>`；`sessionStorage['wonder-autostart']` = 從 picker 點入時跳過 intro。
- `goToStep(k)`：換站（0-based）。進度點、星空高亮、鏡頭 `centerViewOnNode()` 都在這條路上。
- `buildSubgraph()`：只載該 tour 的 6–8 節點；spine edges 來自 tour JSON，organic edges 從節點 `connections` 衍生。
- `setStepVisuals()`：視覺狀態走 `node.vis` / `edge.vis` 旗標（selected / related / dimmed / highlight）——全站圖引擎同一模式。
- 最後一站：next 鈕變「探索其他主題」、`#wp-alt`（進入圖譜）現形；有核可 `outward_links` 的 tour 會把指定文句變成可操作 graph link，無設定者維持純文字。

## app-main.js 關鍵事實

- URL 參數：`?node=<id>` 聚焦節點、`?search=<q>` 帶入搜尋（檔尾解析）。
- 首訪 onboarding：`localStorage['neblux-app-onboard-seen-v1']`。
- Detail card 欄位：breadcrumb / type / label / domains / era / 描述（sections：lead 恆顯，core/impact/links 收合）/ tags / prereqs（↑）/ unlocks（↓）/ connections。
- 快捷鍵：`/` 或 `F` 聚焦搜尋、`?` 開快捷鍵表、Esc 關面板、Shift+Click 標記已學（Learning Path）。

## 共用引擎 `src/engine/`

`canvas-renderer.js`（Deep Field 場景）＋ `star-sprites.js`（離屏星體）＋ `atmosphere.js`（星雲/vignette）＋ `theme.js`（design tokens）＋ `layout.js`（力導向，**座標 build 時預烘焙，勿動**）＋ `geometry.js`（邊曲線、色彩）。物理 d3-force、D3 走 npm import。域色在 `neblux-tokens.js` 的 `DOMAIN_COLORS`。

## Graph Atlas WP0–WP5（內部 prototype／core，尚未切 production）

- `config/atlas/`：12-domain anchors、Main 687-node lock、19 份 Wonder locks、schemas 與 `main-v1` blessing baseline；全部是 tracked source/config，不是 production build artifact。
- `scripts/atlas/`：source/config validators、fixture audits、explicit layout bake/add/check/diff/debt/bless CLI。普通 `npm run build` 不執行 solver 或讀 WP2 locks，但會 fail-fast 生成／audit WP3 artifact 與 WP4 presentation index。
- `tests/atlas/`：schema、topology、publication predicate、Windows path／CLI、determinism、atomic write 與 layout gates。
- 現行 `vite.config.ts` 仍從 `frontend/src/engine/layout.js` 預烘焙 legacy positions；`app-main.js` 仍 import 同一 legacy layout。正式 Main 切換要等 WP5.5／WP6／RG-B，不得把 locks 存在誤作 runtime 已使用。
- WP3／WP4 在 build 時產生 gitignored `/data/atlas/*`：79 個 base artifacts 加上 `/data/atlas/index.json` presentation index。`build-data` 的 atomic swap 會保留／復原上一份有效輸出。
- `frontend/atlas-v2.html` 與 `src/atlas/` 是獨立 Canvas2D pilot：只讀小型 Atlas index、Main＋Light／Quantum／Edge AI，並有等價 DOM directory 與 19 Wonders static fallback；不得載入完整 graph 或改用 `src/engine/`。
- `frontend/src/engine-v2/` 與 `renderer-v2-lab.html` 是 WP5 的 page-agnostic Renderer v2 core／deterministic 1,000／7,000 lab；production pages 尚未 import。真實 687-node celestial lock／scene mapping 留在 WP5.5，Main page adapter 留在 WP6。
- Windows 操作：生成／build 前先停止 dev server；artifact replacement 遇到 `EPERM`／`EBUSY`／`EACCES` 會拒絕覆蓋並提示停止占用程序。這是資料完整性 gate，不可繞過。

## 資料

- `data/all_nodes.json`：687 節點。欄位：`id, label, type(concept|person|field|event), domain[], display_tags[], description, sections{lead, core, impact, links[], works[]}, era, connections[]`。邊欄位：`target, relation_type(logical|applied|conceptual|historical|causal), relation(一句描述), directed, learning_prerequisite`。
- `data/wonders/<id>.json`：tour。schema 見 `tour-authoring.md`。
- `data/i18n/`：`{lang}.json`（標籤+UI）、`{lang}_descriptions.json`、`{lang}_sections.json`。執行期載入鏈在 `src/api.js`（fallback → en）。
- build（`vite.config.ts`）：兩個 buildStart plugin。`copyDataPlugin` 複製 `data/` → `frontend/public/data/`、拆 `all_nodes.json` 為 slim topology ＋ `descriptions.json`／`sections.json`（非阻塞 streaming）、以 legacy `engine/layout.js` 預烘焙座標、生成 v1 `tour-index.json`；`isJunk` 過濾備份產物。`staticHtmlPlugin` 先依 manifest publication predicate 發布 Depth，再呼叫 `scripts/build_static_html.mjs` 生成**靜態可發現層**：`/concepts/<id>.html` 687×3 語、About/Methodology/Sources 三語、`sitemap.xml`、`data/graph.json`。
- **靜態可發現層＝gitignore 的 build artifact**：寫進 `frontend/public/`（`concepts/`、`zh/`、`ja/`、`about|methodology|sources.html`、`sitemap.xml`），dev server 也服務（故 e2e 測得到），`vite build` 複製到 dist。**別找 `build_concept_pages.mjs`/`build_sitemap.mjs`——不存在，全在 `build_static_html.mjs`。** 生成失敗會讓 build fail（非 warn）。守門：`tests/e2e/discoverability.spec.ts`、`tests/e2e/api-failure.spec.ts`（API 全滅站照常，鐵律）。`llms.txt` 為手寫靜態檔（非生成）。

## 測試

- `npm run test:e2e`（Playwright）。圖斷言走 `window.__nebluxApp` / `window.__nebluxExplorer` hook ＋ 真實滑鼠 ＋ 像素取樣，**不是 DOM 選擇器**。勿改 hook 名。
- `npm run test:atlas`：Atlas contracts／layout tooling；`npm run atlas:validate`：真實 source/schema；`npm run atlas:layout:check`：687 Main locks＋19 Wonder locks。
- `tests/e2e/wonders.spec.ts:13` 斷言 picker 卡片 `toHaveCount(19)` ——**新增 tour 必改**。
- `visual-styles.spec.ts` 有平台基準檔（`*-chromium-win32.json`）：視覺變更會 fail，確認刻意才更新基準。

## 鐵則與陷阱

- **CSP 嚴格**（`frontend/public/_headers`）：禁 inline `<script>`、禁外部網域資源。新 JS 一律外置 module；靜態轉址頁用 `<meta http-equiv="refresh">`。
- **中文一律繁體**：改完跑 `python scripts/check_simplified.py`；字元 QA `python scripts/check_i18n_chars.py`。
- 圖完整性：改 nodes/edges 後跑 `python scripts/check_graph_integrity.py`（0 broken 才算過）。
- `scripts/*.py` 是離線管線（Neo4j＋Claude API），線上站**不依賴**；改線上資料 = 改 `data/*.json` ＋ 重 build。
- Node 22+；Windows 開發環境，git 會噴 CRLF 警告（無害）。
- 部署：Cloudflare Pages，build `npm run build`、output `dist`。
- Runtime flags：`API_ENABLED` 維持 false；正式 Echo 只由獨立 `VITE_ECHO_ENABLED`／`ECHO_ENABLED` 控制，禁止照舊 brief 把全域 API flag 打開。
