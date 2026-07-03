# Neblux 程式碼地圖（給接手的模型）

> 迷路時讀這份。行號會漂移，請以符號名搜尋。最後校準：2026-07-04。

## 四個入口

| 頁 | 主 JS | 用途 |
|----|-------|------|
| `frontend/index.html` | `src/landing-main.js` | 落地頁。粒子背景、搜尋、建議 pills、雙 CTA |
| `frontend/wonders.html` | `src/wonders-main.js`（~800 行） | **產品核心**。picker → intro → 敘事面板＋星空子圖 |
| `frontend/app.html` | `src/app-main.js`（~1900 行） | 全圖 687 節點。搜尋、detail card、Learning Path |
| `frontend/explorer.html` | `src/explorer-main.js` | 漸進展開。轉型中（見 explorer-to-topics-plan.md），少動 |

## wonders-main.js 關鍵符號

- `WONDER_IDS`：19 個 tour id 陣列。**新增 tour 必改這裡**。
- `UI = { en:{...}, zh:{...}, ja:{...} }`：全部 UI 字串三語。
- `pick(obj)`：取當前語言字串，fallback en。`LANG` 存 `localStorage['neblux-lang']`。
- `loadWonder(id)` / `showPicker()`：入口分流。URL `?w=<id>`；`sessionStorage['wonder-autostart']` = 從 picker 點入時跳過 intro。
- `goToStep(k)`：換站（0-based）。進度點、星空高亮、鏡頭 `centerViewOnNode()` 都在這條路上。
- `buildSubgraph()`：只載該 tour 的 6–8 節點；spine edges 來自 tour JSON，organic edges 從節點 `connections` 衍生。
- `setStepVisuals()`：視覺狀態走 `node.vis` / `edge.vis` 旗標（selected / related / dimmed / highlight）——全站圖引擎同一模式。
- 最後一站：next 鈕變「探索其他主題」、`#wp-alt`（進入圖譜）現形、`outward` 文字目前渲染為 `.is-outward` 灰色禁用樣式。

## app-main.js 關鍵事實

- URL 參數：`?node=<id>` 聚焦節點、`?search=<q>` 帶入搜尋（檔尾解析）。
- 首訪 onboarding：`localStorage['neblux-app-onboard-seen-v1']`。
- Detail card 欄位：breadcrumb / type / label / domains / era / 描述（sections：lead 恆顯，core/impact/links 收合）/ tags / prereqs（↑）/ unlocks（↓）/ connections。
- 快捷鍵：`/` 或 `F` 聚焦搜尋、`?` 開快捷鍵表、Esc 關面板、Shift+Click 標記已學（Learning Path）。

## 共用引擎 `src/engine/`

`canvas-renderer.js`（Deep Field 場景）＋ `star-sprites.js`（離屏星體）＋ `atmosphere.js`（星雲/vignette）＋ `theme.js`（design tokens）＋ `layout.js`（力導向，**座標 build 時預烘焙，勿動**）＋ `geometry.js`（邊曲線、色彩）。物理 d3-force、D3 走 npm import。域色在 `neblux-tokens.js` 的 `DOMAIN_COLORS`。

## 資料

- `data/all_nodes.json`：687 節點。欄位：`id, label, type(concept|person|field|event), domain[], display_tags[], description, sections{lead, core, impact, links[], works[]}, era, connections[]`。邊欄位：`target, relation_type(logical|applied|conceptual|historical|causal), relation(一句描述), directed, learning_prerequisite`。
- `data/wonders/<id>.json`：tour。schema 見 `tour-authoring.md`。
- `data/i18n/`：`{lang}.json`（標籤+UI）、`{lang}_descriptions.json`、`{lang}_sections.json`。執行期載入鏈在 `src/api.js`（fallback → en）。
- build（`vite.config.ts`）：複製 `data/` → `frontend/public/data/`；拆 `all_nodes.json` 為 slim topology ＋ `descriptions.json`（非阻塞 streaming）；`isJunk` 過濾備份產物。

## 測試

- `npm run test:e2e`（Playwright）。圖斷言走 `window.__nebluxApp` / `window.__nebluxExplorer` hook ＋ 真實滑鼠 ＋ 像素取樣，**不是 DOM 選擇器**。勿改 hook 名。
- `tests/e2e/wonders.spec.ts:13` 斷言 picker 卡片 `toHaveCount(19)` ——**新增 tour 必改**。
- `visual-styles.spec.ts` 有平台基準檔（`*-chromium-win32.json`）：視覺變更會 fail，確認刻意才更新基準。

## 鐵則與陷阱

- **CSP 嚴格**（`frontend/public/_headers`）：禁 inline `<script>`、禁外部網域資源。新 JS 一律外置 module；靜態轉址頁用 `<meta http-equiv="refresh">`。
- **中文一律繁體**：改完跑 `python scripts/check_simplified.py`；字元 QA `python scripts/check_i18n_chars.py`。
- 圖完整性：改 nodes/edges 後跑 `python scripts/check_graph_integrity.py`（0 broken 才算過）。
- `scripts/*.py` 是離線管線（Neo4j＋Claude API），線上站**不依賴**；改線上資料 = 改 `data/*.json` ＋ 重 build。
- Node 22+；Windows 開發環境，git 會噴 CRLF 警告（無害）。
- 部署：Cloudflare Pages，build `npm run build`、output `dist`。
