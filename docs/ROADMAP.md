# Neblux 執行清單（工作檔，非永久）

> 規則在 `DIRECTION.md`（鐵律，衝突時以它為準）。程式碼定位查 `CODEBASE-MAP.md`。寫 tour 讀 `tour-authoring.md`。改文案讀 `brand-voice.md`。
> 本檔可修改：完成打勾並更新日期；Phase 全完成可刪該段。
> 最後更新：2026-07-08（**P1-2 級1 迴響 ✨ 線上啟用完成**：拆 `ECHO_ENABLED` 獨立旗標〔`import.meta.env.VITE_ECHO_ENABLED`，本機/e2e→false、只 prod 建置開，避免全域旗標重開 landing/explorer 的 `/api` 404〕；`[人工]` 建 D1 `neblux-echo`＋套 schema＋綁 nodus Pages Production `DB`＋設 `VITE_ECHO_ENABLED=true`；deploy `1c2f647` 上線，線上 curl GET/POST/D1 UPSERT 全過；e2e 56 綠。commit `1f5e19c`+`1c2f647` 已 push。剩 KV `THROTTLE` 未建＝債。簡報 `docs/tasks/2026-07-07-p1-2-echo.md`）
> 2026-07-04 追加：修好 e2e flaky 門（`playwright.config` 本機 workers 上限+retry，「test:e2e 全綠」定義才可信）；P0-4 outward 活連結由 3 趟擴到 **13/19**；另起「可發現性/AI 友善度」工作線並完成 M1–M3（llms.txt、入口頁定位、687×3 概念頁、About/Methodology/Sources、sitemap、graph.json、noscript、e2e 守門）——規格見 `docs/ai-discoverability-plan.md`。
> 2026-07-06 追加：P0 hardening——永久「API 全滅站照常」守門 `tests/e2e/api-failure.spec.ts`（鐵律入 CI）；必要 build 產物（概念頁/sitemap/graph.json/tour-index）改 fail-fast（`this.error`），layout bake 維持 warn；文件與實作命名對齊。P0-B spark 機制完成、內容擱置（見下）。**P0 收線；下一步 P1 後端**（開場：`API_ENABLED` flag 止血 landing/explorer 的失敗 `/api` 請求 → P1-0 骨架 → 人工建 D1 `DB`／KV `LINKS`）。e2e 43 綠。

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

- [~] **P0-B 火種句（背景工作，不擋上列任何一項）— 機制完成、內容擱置（2026-07-06）**
  - 機制已上且休眠：`app-main.js` `renderStructuredSections` 有 `sections.spark` 就以它開場、原 lead 收進「更精確地說」摺疊；`.pd-spark` CSS 在。**無 spark 資料就走 else、無害**。重上＝純資料改。
  - 88 句三語草稿寫過又撤（commit `a51ea7c`/`2a59fb2`，擱置於 `d9e853b`）：凜空與多個 AI 仍不滿意。重訪方向＝**少而精**（只放真正驚豔的少數節點），非每節點湊一句。**別在他重新開口前把資料加回或當缺口補。**
  - 作法（保留備查）：`sections` 選填 `spark`；驗收：對 `brand-voice.md`、禁標題黨、zh 過 `check_simplified.py`。

## Phase 1 — 後端（平台鎖定 Cloudflare Pages Functions，禁自行選型）

- [~] **P1-0 骨架（程式面完成 2026-07-06；剩 `[人工]` D1/KV 綁定）**
  - [x] 止血：新增 `frontend/src/config.js` `API_ENABLED=false` 旗標，gate landing/explorer 全部 `/api/*` 嘗試（`/api/graph/full`、`/api/i18n/*`）。瀏覽器實測兩頁零 `/api` 請求、直達靜態、console 乾淨。旗標關閉但保留分支（凜空定案）。
  - [x] `functions/api/health.ts`（`onRequestGet` 回 `{ok:true}`，零依賴）；本地 `npx wrangler pages dev dist` 實測 `GET /api/health` → `{"ok":true}`（compat date 需用受支援值，如 `2024-11-06`；環境時鐘 2026 但 wrangler binary 較舊）。
  - [x] `functions/schema.sql` 落地（echo / tour_finish 兩表）。
  - [x] 「block `/api/*` 四頁 smoke」守門已存在（`tests/e2e/api-failure.spec.ts`，P0 補）；e2e 43 綠、`npm run verify` 全過。
  - [ ] `[人工]` Cloudflare dashboard 建 D1（綁定名 `DB`）與 KV（綁定名 `LINKS`），並套用 `functions/schema.sql`（`npx wrangler d1 execute DB --file=functions/schema.sql`）。schema：
    ```sql
    CREATE TABLE IF NOT EXISTS echo (tour TEXT NOT NULL, step INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (tour, step));
    CREATE TABLE IF NOT EXISTS tour_finish (tour TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0);
    ```

- [~] **P1-1 級2 分享（前端切片完成 2026-07-06；兩塊後端跳過＝債，見 `docs/tasks/2026-07-06-p1-1-share-moment.md`）**
  - [x] 前端：surprise 區塊旁安靜「分享這個瞬間」→ **分享既有 `?w=&s=` 深連結**＋Web Share API（桌面無則複製連結）。純前端、非禁區、graceful。e2e 44 綠、瀏覽器實看過。
  - [ ] `GET /s/:code`（KV 短連結）— **跳過＝債**：卡 `[人工]` KV `LINKS`＋ROADMAP 未定義 code 怎麼 mint（規格洞，不猜）。要補先補規格＋建 KV，屬 `functions/` 禁區。
  - [ ] `GET /api/og?w=&s=`（動態 og，workers-og＋CJK 子集）— **跳過＝債**：邊緣 CJK 子集化最脆、P0-2 靜態 og 已可用、次要資產邊際價值低。要補另立案，屬 `functions/` 禁區。
  - 驗收（原始）：分享連結預覽正確；API 掛掉時分享鈕靜默隱藏。（現況：分享鈕純前端不依賴 API；預覽為 P0-2 每趟靜態 og，非 per-beat。）

- [x] **P1-2 級1 迴響（線上啟用完成 2026-07-08）** — deploy `1c2f647` 上線；線上 curl 驗證 GET/POST/D1 UPSERT 全過（`POST {light,2}`→count 遞增、GET 回 `{"2":1}`）；wonders bundle 含 `/api/echo`（`VITE_ECHO_ENABLED=true` 生效）；landing/explorer 續零 `/api`。
  - [x] 後端 `functions/api/echo.ts`：`POST {tour,step}`（同源檢查→tour-index 驗每趟精確站數→KV 節流(IP 加鹽 SHA-256、TTL 3600、>3 忽略)→D1 UPSERT +1）；`GET ?tour=` 回各站計數。本機 wrangler+D1/KV curl 全過。
  - [x] 前端：surprise beat 旁安靜 ✨（`sendBeacon`、失敗靜默）＋一行序數「你是第 N 位…」三語（**禁**「本週 N 人」）。壓 `API_ENABLED` 旗標；e2e 休眠守門綠（API 掛掉無 ✨ 無錯）。設計＋審查見 `docs/tasks/2026-07-07-p1-2-echo.md`。
  - [x] D1 `DB`（`neblux-echo`）已建＋套 `functions/schema.sql`（2 表）＋綁定 nodus Pages 專案 Production（2026-07-07）。KV `THROTTLE` 選填、暫未建（缺了只是不節流）。
  - [x] 啟用＝Cloudflare Pages（`nodus`）Production 環境變數 **`VITE_ECHO_ENABLED=true`**（2026-07-08）。**啟用是設 env var、非改原始碼**：`config.js` 的 `ECHO_ENABLED = import.meta.env.VITE_ECHO_ENABLED === "true"`，本機/e2e 無此變數→false（守門續綠、echo 死碼消除），只有帶該變數的正式建置才把 echo 打進 bundle。echo 已與 `API_ENABLED` 拆開，避免全域旗標重開 landing/explorer 的 `/api/graph/full`、`/api/i18n/*` 404（P1-0 止血保證）；`API_ENABLED` 續 false。
  - 驗收：計數遞增；API 掛掉 UI 無 ✨ 且無錯誤。→ **線上達成**（curl GET/POST + bundle 檢查 + 休眠守門三證）。
  - 未做（債）：KV `THROTTLE` 未建＝無節流防洗；濫用誘因低，出現灌數再補（`echo.ts` 缺 KV 自動略過）。

- [ ] **P1-3 級3 遙測**
  - Analytics Engine 綁定 `WONDER_EVENTS`。打點：start / step / finish / drop（`visibilitychange`＋sendBeacon），欄位：tour、event、lang、step。
  - 新增 `docs/telemetry-queries.md`：三個指標的 SQL 範本——完走率（finish/start）、hook 轉換率（picker 曝光→start，需在 picker 補一個 view 事件）、回墜率（同 session 第二次 start）。
  - 驗收：本地打點可見；查詢範本可執行。

## Phase 2 — 教育（依賴 Phase 0）

- [~] **P2-1 旅程紀錄產物（實作＋驗證完成 2026-07-06；reflect 內容機制先行、待 authoring；未 commit）**
  - `wonders.html?w=<id>&print=1`（＋終局「留下這趟旅程的紀錄」連結）：渲染可列印 DOM——白底線稿星座 SVG、每站 hook 問題、2–3 題反思（tour JSON 選填欄位 `reflect`，未填則用 outward 文字）、在地化日期。`@media print` 白底 A4（緊排、長趟可溢出第二頁不刪 hook）。三語。零後端。設計裁決見 `docs/tasks/2026-07-06-p2-1-journey-record.md`。
  - [x] 機制：記錄頁 + 星座 + hooks + reflect(fallback outward) + print CSS + 5 條 e2e 守門（e2e 55 綠）；三語瀏覽器實看＋print-media 截圖過；對抗審查 approve、4 findings 已修。
  - [ ] `reflect` 各趟內容 authoring（決策③機會型；現走 outward fallback，非缺口）。
  - 驗收（原始）：Ctrl+P 出單頁 A4，三語版面皆正常。→ 達成（長趟可能落第二頁＝決策②授權）。
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
