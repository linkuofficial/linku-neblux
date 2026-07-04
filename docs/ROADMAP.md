# Neblux 執行清單（工作檔，非永久）

> 規則在 `DIRECTION.md`（鐵律，衝突時以它為準）。程式碼定位查 `CODEBASE-MAP.md`。寫 tour 讀 `tour-authoring.md`。改文案讀 `brand-voice.md`。
> 本檔可修改：完成打勾並更新日期；Phase 全完成可刪該段。
> 最後更新：2026-07-04（P0-1 ~ P0-7 完成；剩 P0-B 火種句待 [人工] 審核）
> 2026-07-04 追加：修好 e2e flaky 門（`playwright.config` 本機 workers 上限+retry，「test:e2e 全綠」定義才可信）；P0-4 outward 活連結由 3 趟擴到 **13/19**；另起「可發現性/AI 友善度」工作線並完成 M1–M3（llms.txt、入口頁定位、687×3 概念頁、About/Methodology/Sources、sitemap、graph.json、noscript、e2e 守門）——規格見 `docs/ai-discoverability-plan.md`。

## 工作守則（每次開工先讀）

1. **依序、一次一項。** 不重構規格外的程式、不升級依賴、不動 `engine/layout.js` 預烘焙、不改 `window.__nebluxApp`/`__nebluxExplorer` hook 名。
2. **完成定義** = 該項驗收全過 ＋ `npm run build` 成功 ＋ `npm run test:e2e` 全綠。
3. 視覺變更使 `visual-styles` 基準失敗時：先確認變更是規格要求的，才更新基準；否則停下。
4. 中文一律繁體，改完跑 `python scripts/check_simplified.py`。
5. **禁止** inline `<script>`（CSP）、外部網域資源。新增依賴需使用者同意——本檔已預先核准的例外：`sharp`（P0-2 build 用）、`workers-og`（P1-1）。
6. 規格與現況衝突、或需要規格外的決策 → **停下回報使用者，不即興**。
7. `[人工]` 任務模型不可代做：提醒使用者後跳過，繼續下一個可做項。
8. 完成任一項後：打勾、一個獨立 commit（訊息格式沿用 git log 慣例，如 `feat(wonders): step-level deep links`）。

---

## Phase 0 — 前端（純靜態）

- [x] **P0-1 站級深連結**（2026-07-04）
  - 改：`frontend/src/wonders-main.js`、`tests/e2e/wonders.spec.ts`。
  - 作法：`goToStep(k)` 內 `history.replaceState(null, '', '?w='+id+'&s='+(k+1))`（URL 用 1-based）。載入時解析 `s`：合法（1..steps.length）→ 跳過 intro 直接開始並 `goToStep(s-1)`；不合法 → 忽略。回 picker 時 URL 清空參數。
  - 驗收：`wonders.html?w=light&s=4` 直開第 4 站、計數顯「4 / 7」；原 intro／autostart 流程不變；新增 E2E。
  - 陷阱：intro 由 `sessionStorage['wonder-autostart']` 控制，別破壞該路徑。

- [x] **P0-2 每趟 tour 分享 stub ＋ og 圖**（2026-07-04）
  - 改：新增 `scripts/build_share_pages.mjs`，掛進 build（`package.json` 的 build script 後段或 vite closeBundle）。devDependency：`sharp`（已核准）。
  - 作法：對每個 `data/wonders/*.json` 生成 `dist/w/<id>.html`：og:title（en title）、og:description（en intro）、og:image=`/og/<id>.png`、canonical、`<meta http-equiv="refresh" content="0;url=/wonders.html?w=<id>">`、body 內一個普通 `<a>` 後備連結。**禁 inline script——只用 meta refresh。**
  - og 圖：1200×630 PNG 存 `dist/og/`。內容＝純星座圖形（深底 `#05070f` 系、tour accent 色、以 steps 數在圓弧上佈點並連線）。**圖內不放文字**（build 環境 CJK 字型不可靠；標題交給 og:title）。SVG 模板 → sharp 轉 PNG。
  - 驗收：build 後 `dist/w/` 19 個 stub、`dist/og/` 19 張圖；`npm run preview` 訪問 `/w/light` 自動轉到 tour。
  - 陷阱：stub 是 build 產物，不進 git；`frontend/public/_headers` 不需改。

- [x] **P0-3 tour-index.json（資料地基）**（2026-07-04）
  - 改：新增 `scripts/build_tour_index.mjs` 掛進 build；輸出 `dist/data/tour-index.json`（dev 期也複製到 `frontend/public/data/`）。
  - 形狀：
    ```json
    {
      "tours":  { "light": { "accent": "PHY", "steps": ["optics_concept", "..."] } },
      "nodes":  { "optics_concept": [{ "tour": "light", "step": 1 }] },
      "related":{ "light": [{ "tour": "quantum", "via": "wave_particle_duality_concept", "weight": 3 }] }
    }
    ```
  - `related` 演算法：對每對 tour (A,B)，weight = A 的節點在 `all_nodes.json` 的 `connections` 指向 B 節點的邊數（雙向合計），取前 2 名；`via` = 貢獻最多的節點。
  - 驗收：19 tours、`nodes` 涵蓋全部被引用節點；JSON 可被 `fetch` 取得。

- [x] **P0-4 終局修復**（2026-07-04）
  - 改：`frontend/src/wonders-main.js`、`frontend/src/styles/pages/wonders.css`、3 個示範 tour JSON。
  - a. outward 活連結：tour JSON 新增選填欄位 `"outward_links": [{ "node": "<id>", "match": { "en": "...", "zh": "...", "ja": "..." } }]`。渲染時在 outward 文字找當前語言 `match` 首次出現，包成 `<a href="app.html?node=<id>">`；找不到就跳過。移除 `.is-outward` 的灰化與 `aria-disabled`，改可讀樣式。先為 light、quantum、the-mind 三趟填示範（node id 必先 grep 驗證存在；找不到對應節點的概念就不加）。
  - b. 下一趟推薦：讀 `tour-index.related`，結尾渲染 1–2 張推薦卡：「〈量子〉——從『波粒二象性』繼續往下 →」連 `wonders.html?w=<id>`。via 節點 label 用當前語言（labelMap 已有）。UI 字串進 `UI` 物件（三語）。
  - c. 「進入圖譜」維持 `app.html` 不動（P0-6 再升級）。
  - 驗收：light 結尾至少 1 個 outward 活連結；推薦卡顯示且理由含具體概念名；無 `outward_links` 的 tour 行為與現在完全相同；E2E 補斷言。

- [x] **P0-5 星座層（主刀）**（2026-07-04）
  - 改：`frontend/src/app-main.js`、`frontend/src/engine/canvas-renderer.js`（新畫層）、`frontend/src/engine/theme.js`（樣式 token）、E2E。
  - 作法：app 非阻塞 fetch `tour-index.json`（失敗靜默，星座層不出現——鐵律 1）。對每 tour 的 spine edges 以既有節點座標畫虛線弧（用 `geometry.js` 曲線），色 = `DOMAIN_COLORS[accent]`。zoom 語意：zoom 低（建議 < 0.55）星座線與星座名（置於該 tour 節點質心）漸顯、節點標籤淡出；zoom 高（> 0.9）反向。點擊星座名 → `wonders.html?w=<id>`；節點命中優先於星座。
  - 新 URL 參數 `app.html?constellation=<tourId>`：載入後以該 tour 節點包圍盒取景置中、spine 高亮、其餘 dim（沿用 `vis` 旗標模式）。
  - 驗收：E2E 像素取樣證低 zoom 有星座線、高 zoom 無；點星座名跳轉；`?constellation=light` 取景並高亮。
  - 陷阱：畫層順序在一般 edges 之上、節點之下；尊重 `prefers-reduced-motion`；visual-styles 基準會變（守則 3）；19×~6 條邊，無效能疑慮，勿過度優化。

- [x] **P0-6 雙向蟲洞**（2026-07-04）
  - 改：`frontend/src/app-main.js`（detail card）、`frontend/src/wonders-main.js`（每站 footer）、兩邊 i18n 字串（三語）。
  - 作法：card 若 `tour-index.nodes[id]` 存在 → 列「這顆星是〈光〉第 5 站 →」連 `wonders.html?w=&s=`（多重隸屬全列）。wonders 每站加安靜連結「在整片天空看這顆星 →」連 `app.html?node=<ref>`（`local` 節點不顯示）。tour 結尾「進入圖譜」改連 `app.html?constellation=<id>`。
  - 驗收：三個方向跳轉正確；E2E。

- [x] **P0-7 落地頁改版**（2026-07-04）
  - 改：`frontend/index.html`、`frontend/src/landing-main.js`。
  - 作法：頂部常數 `const FEATURED_TOUR = 'light'`（輪替＝手動改這行）。首屏全幅 featured 卡（title/intro/步數/開始 CTA，三語）；「Start Exploring」降次要樣式；footer 移除「N NODES · N EDGES · 13 DOMAINS」統計行。
  - 驗收：首屏可見 featured tour 並可點入；E2E smoke 更新。

- [ ] **P0-B 火種句（背景工作，不擋上列任何一項）**
  - 作法：`sections` 新增選填欄位 `spark`（一句 hook 語態開場）；`app-main.js` 渲染描述時有 `spark` 就以它開頭、原 lead 收合。內容由離線管線生成＋`[人工]`逐句審核，每批 ≤ 20 節點，從被 tour 引用的 122 節點開始。
  - 驗收：抽 10 句對照 `brand-voice.md`；禁標題黨；zh 過 `check_simplified.py`。

## Phase 1 — 後端（平台鎖定 Cloudflare Pages Functions，禁自行選型）

- [ ] **P1-0 骨架**
  - 新增 `functions/api/health.ts`（回 `{ok:true}`）；本地驗證 `npx wrangler pages dev dist`。
  - 新增 E2E：block 所有 `/api/*` 請求後跑四頁 smoke，必須全過（「API 全滅站照常」守門，永久保留）。
  - `[人工]` Cloudflare dashboard 建 D1（綁定名 `DB`）與 KV（綁定名 `LINKS`）。schema 存 `functions/schema.sql`：
    ```sql
    CREATE TABLE IF NOT EXISTS echo (tour TEXT NOT NULL, step INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (tour, step));
    CREATE TABLE IF NOT EXISTS tour_finish (tour TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0);
    ```

- [ ] **P1-1 級2 分享**
  - `GET /s/:code`：KV 查 target（僅允許同源路徑）→ 302；miss → 302 首頁。
  - `GET /api/og?w=&s=`：先查 Cache API；miss 用 `workers-og` 渲染該 beat（tour 標題＋surprise 摘句）。**CJK 字型子集若卡住 → 降級沿用 P0-2 靜態圖並回報使用者，不硬撐。**
  - 前端：surprise 區塊旁「分享這個瞬間」→ 產生短連結＋Web Share API（無則複製連結）。
  - 驗收：分享連結預覽正確；API 掛掉時分享鈕靜默隱藏。

- [ ] **P1-2 級1 迴響**
  - `POST /api/echo {tour, step}`：驗證 tour ∈ WONDER_IDS、step 在範圍；D1 UPSERT +1。`GET /api/echo?tour=` 回該 tour 各站計數。
  - 前端：✨ 鈕（surprise 旁），`navigator.sendBeacon`，失敗靜默；顯示文案用序數（「你是第 N 位…」三語），**禁**「本週 N 人」。
  - 節流：KV key `ip:tour:step` TTL 3600 秒，>3 次忽略。
  - 驗收：計數遞增；API 掛掉 UI 無 ✨ 且無錯誤。

- [ ] **P1-3 級3 遙測**
  - Analytics Engine 綁定 `WONDER_EVENTS`。打點：start / step / finish / drop（`visibilitychange`＋sendBeacon），欄位：tour、event、lang、step。
  - 新增 `docs/telemetry-queries.md`：三個指標的 SQL 範本——完走率（finish/start）、hook 轉換率（picker 曝光→start，需在 picker 補一個 view 事件）、回墜率（同 session 第二次 start）。
  - 驗收：本地打點可見；查詢範本可執行。

## Phase 2 — 教育（依賴 Phase 0）

- [ ] **P2-1 旅程紀錄產物**
  - `wonders.html?w=<id>&print=1`（或走完後按鈕）：渲染可列印 DOM——星座 SVG、七個 hook 問題、2–3 題反思（tour JSON 選填欄位 `reflect`，未填則用 outward 文字）、日期。`@media print` 排 A4 一頁。三語。零後端。
  - 驗收：Ctrl+P 出單頁 A4，三語版面皆正常。
- [ ] **P2-2 `[人工]` 種子老師**：5–10 位高中自然／社會科老師試用，請他們回報學生棄坑點。
- **閘門：≥2 位老師主動二次使用，才做 P2-3。**
- [ ] **P2-3 班級星圖**
  - 前端：`wonders.html?class=<6碼>` 存 sessionStorage；完走 sendBeacon `POST /api/class/finish {code, tour}`。
  - 老師端 `class.html?code=`：顯示 D1 聚合（表 `class_progress(code TEXT, tour TEXT, finishes INTEGER)`）。`POST /api/class/new` 回隨機 6 碼。**無任何學生識別資料。**
- **閘門：一個班級完整走完一輪，才做 P2-4。**
- [ ] **P2-4 `[人工]` 對外申請**：國科會科普類補助、親子天下教育創新 100 等（名稱以當年公告為準）。

## Phase 3 — 數據信用（依賴 P1-3 累積）

- [ ] **P3-1** 完走達千次級：把匿名聚合整理成公開長文或開放資料集（hook 有效性、棄坑分佈、三語差異）。模型可草擬，`[人工]` 定稿。
- [ ] **P3-2 `[人工]`** 帶數據接觸科教館、教育科技展、縣市教師研習。

## Phase 4 — 極長期（解鎖：拿到第一筆外部資源）

- [ ] **P4-1** 老師端班級報告輕收費（學生端永遠免費）。**屆時再細化規格，勿即興實作。**
- [ ] **P4-2 `[人工]`** 內容授權洽談（出版社／博物館／平台）。
- [ ] **P4-3** 贊助星座：被動等待，對方找上門才評估，不主動投入。
- [ ] **P4-4** 天空口令：六詞口令 → KV 同步完成進度（無 email、無密碼）。只在使用者明確要求跨裝置同步時做。

## 持續規則

- 新 tour：照 `tour-authoring.md`，機會型、不衝量。
- 每完成一項：打勾、更新「最後更新」、獨立 commit。
- 任何「要不要做 X」的疑問：先查 `DIRECTION.md` 鐵律與禁止清單，查不到 → 問使用者。
