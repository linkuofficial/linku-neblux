# AGENTS.md — Neblux（neblux.linku.tech）

> 好奇心驅動的知識體驗網站。Linku Tech 的**次要資產**：目標是「做好、維護」，不擴張範圍；可由 AI 完整生成程式碼。
> 本機工作區容器脈絡：`D:\LINKU\AGENTS.md`（AI 協作協議、跨 repo 規則）；全域規則：Codex 讀 `~/.codex/AGENTS.md`、Claude 讀 `~/.claude/CLAUDE.md`。雲端/其他環境讀不到上述檔案時，以本檔自足。

## ⚡ 30 秒硬規則（先讀這裡）

- **禁區（強制交叉審查路徑，動之前必須先有 brief）**：`frontend/src/engine/`、`data/*.json` 結構變更、部署設定（`frontend/public/_headers`、`functions/`〔CF Pages Functions〕、`wrangler`／Cloudflare Pages 設定）。
- **只做被交派的任務**：`docs/ROADMAP.md` 的「下一步 P1 後端／`API_ENABLED`／`functions/`」是規劃，**不是授權**。要動後端骨架＝重大決策，先開 brief 走模式⑤，禁止順手實作。
- **驗證單命令**：`npm run verify`（= `npm run build` + `npm run test:depth-build` + `npm run test:e2e`）。視覺改動另需 `npm run dev` 瀏覽器實看（Canvas 渲染，DOM 斷言無效）。
- **Done 前檢查清單**：
  - [ ] `npm run verify` 全過
  - [ ] 視覺改動已在瀏覽器實看
  - [ ] HANDOFF 已填（brief 的 HANDOFF 區）
- **不確定 → 停**，寫進 brief 的 Questions 區，禁止猜。

## 動手前必讀
- **方向北極星：`docs/DIRECTION.md`（2026-07-03 定案），動 Neblux 前先讀。**
  核心判斷：Wonders（驚奇之旅）是產品、圖譜是空間。架構憲法：靜態為骨動態為光（API 掛掉站照常）、匿名聚合（無帳號無個資）、個人永久免費、安靜的驚奇（不遊戲化）。
- 文件地圖：`docs/CODEBASE-MAP.md`（程式地圖）、`docs/ROADMAP.md`、`docs/verification_runbook.md`（**已過期勿照做**，見技術債台帳）、`docs/playbooks/`（常見任務 SOP）、`docs/brand-voice.md`（文案語氣）、`docs/tour-authoring.md`（tour 製作）、`docs/gates/`（品質 gate 紀錄）、`docs/archive/`（歷史計畫）。

## 現況
純靜態前端、**零後端**，線上站只讀打包進去的 JSON。未來後端限定 Cloudflare Pages Functions 同源 `/api/*`（漸進增強），規劃見 DIRECTION.md。
對外名稱 **Neblux**：目錄、程式識別子（`window.__nebluxApp`/`__nebluxExplorer`）、GitHub repo（`linku-neblux`）皆已改名同步。

## Commands
```bash
npm install
npm run dev            # Vite dev server (port 3000)
npm run build          # Vite production build → dist/
npm run preview        # 預覽 build 結果
npm run test:depth-build # Depth 發布契約與 dist 集合
npm run test:e2e       # Playwright E2E smoke
npm run test:e2e:install  # 首次安裝 Chromium
```

## Architecture
- 前端入口：`frontend/` 四個 HTML（`index` 落地頁 / `wonders` 驚奇之旅 / `app` 全圖 / `explorer` 轉型中）+ `frontend/src/` JS。Wonders：`wonders.html` → `src/wonders-main.js`，tour 資料在 `data/wonders/*.json`（19 趟、三語、hook→reveal→example→surprise→thread 結構）。
- 資料：`data/all_nodes.json`（知識節點，**源頭含描述**）+ `data/i18n/*.json`（多語標籤與描述）。`vite.config.ts` 在 build 時把 `data/` 複製進 `frontend/public/data/`，並把 `all_nodes.json` 拆成 slim topology + `descriptions.json`（英文描述另存，執行期非阻塞 streaming）。
- 圖引擎：`app.html` → `src/app-main.js`、`explorer.html` → `src/explorer-main.js`（皆 ES module）。D3 走 npm import（Vite tree-shake/code-split）。**app 與 explorer 皆為 Canvas 渲染**，共用 `src/engine/`：`canvas-renderer.js`（Deep Field 場景）+ `star-sprites.js`（離屏星體）+ `atmosphere.js`（遠景/星雲/vignette）+ `theme.js`（design tokens）+ `layout.js`（共用力導向，build 時預烘焙座標）+ `geometry.js`。物理仍 d3-force，視覺狀態走 node.vis/edge.vis 旗標，加色合成發光。
- E2E 圖斷言走 `window.__nebluxApp`/`window.__nebluxExplorer` hook + 真實滑鼠 + 像素取樣，**非 DOM 選擇器**（圖是 Canvas，DOM 斷言無效）。SVG 時代的圖視覺 CSS 已移除。
- 部署：Cloudflare Pages（Build command `npm run build`、Output directory `dist`）。`frontend/public/_headers` 提供 CSP 等安全 headers（inline script 會被 CSP 擋，一律外置）。
- 執行期 i18n 載入見 `frontend/src/api.js`：locale 標籤抓 `/data/i18n/{locale}.json`（fallback `en.json`）；描述抓 `{locale}_descriptions.json`，再 fallback `{locale}_descriptions_batch1.json`。

## 離線資料管線（不屬線上站）
`scripts/*.py` + `config.yaml`：節點生成、翻譯、品質檢查工具，連 Neo4j 與 Claude API，**僅離線手動執行**，線上站不依賴。修改線上資料只需改 `data/*.json` 後重新 build。

## 驗證門檻（宣稱完成前）
1. `npm run verify` 全過（= `npm run build` 成功 + `npm run test:depth-build` + `npm run test:e2e` 通過）。
2. 視覺改動：`npm run dev` 用瀏覽器實看（Canvas 渲染，截圖/肉眼確認，勿只信 DOM）。
3. 常見任務步驟見 `docs/playbooks/`；最短驗證路徑索引見 `docs/verification_runbook.md`（2026-07-13 已重寫為現行流程，與本檔衝突時以本檔為準）。

## 已知技術債（台帳；「暫不處理」的決定不重開，除非前提改變）
- Atlas 第二頁原 WP4 prototype 白模已被 2026-07-16 後續裁決取代：正式 `/atlas.html` 必須共用 `frontend/src/engine-v2/` 的星場、sprite、camera 與 label 契約；Atlas 仍只載 Main＋featured Wonder presentation，不得載入完整 graph 或另建平行 renderer。
- HTML 入口資源路徑風格不一致（`index.html` 用絕對 `/src/...`；`app.html`/`explorer.html` 混用相對與絕對）；皆可運作。**（2026-06-10）複查：純 cosmetic、有 build 風險、零收益，暫不處理。**
- 粒子動畫兩套實作（`src/particles.js`〔app 頁背景，動態 import〕+ `src/landing-main.js`〔index 落地頁〕）。兩者用途不同、各自獨立，整併收益低，暫不處理。
- app-main 與 explorer-main 有平行的 canvas 接線（findNodeAtScreen、nc/nr、星體 meta、焦點邏輯）。**刻意未抽共用**：兩頁語意不同（app=全圖、explorer=漸進展開），抽離風險高於收益。視為可接受重複。

### 已清（歷史）
- （2026-07-13）`docs/verification_runbook.md` 依凜空指示清償：Nodus 時代 Python 後端內容（pytest／uvicorn／Neo4j）全文裁撤，重寫為現行 `npm run verify` 薄版指引＋分區守門表；單一事實來源仍是本檔驗證門檻節與 `docs/playbooks/`，避免第二事實來源再度漂移。
- 渲染升級 SVG → Canvas 全部完成（2026-06-13），見 `docs/archive/rendering-upgrade-plan.md`；SVG 時代圖視覺 CSS 14 檔已刪。
- （2026-06-12，分支 `feat/arch-render-upgrade`）explorer 引擎外置（HTML 139.7kB → 8.9kB）、D3 改 npm import、資料瘦身（topology 2.3MB → 1.06MB + descriptions 783kB streaming）、CSP 收緊（去 `'unsafe-inline'`）、共用 `src/engine/geometry.js`、清死碼。E2E 11 passed（含 `descriptions.spec.ts` 描述串流守門）。
- （2026-06-10）i18n 生成中間/備份產物已刪；`vite.config.ts` 加 `isJunk` 過濾。commit `7ce6a8a`。

## 任務簡報
放 `docs/tasks/YYYY-MM-DD-slug.md`（目錄不存在就建）。模板見 `D:\LINKU\docs\tasks\TEMPLATE.md` 或 `~/.codex/AGENTS.md` §13。
