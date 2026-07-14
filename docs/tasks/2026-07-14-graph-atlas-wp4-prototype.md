# TASK: graph-atlas-wp4-prototype
狀態: done
建立: 2026-07-14 ｜ 實作層: Codex
Repo: Neblux
Branch: `codex/graph-atlas-wp4`
Base: `2659c23`（WP3 closeout 已獨立提交；WP4 diff 不含 WP3 rollback fixes）
Required verification: `npm run atlas:validate`＋`npm run atlas:build-data`＋`npm run atlas:build-index`＋`npm run atlas:audit-data`＋`npm run test:atlas`＋`npm run verify`＋`python scripts/check_simplified.py`＋desktop/mobile/reduced-motion browser QA
風險等級: 中高——新增 Atlas presentation config、內部 Vite entry、Canvas prototype 與 build-time index integration；不切 production、不碰既有 engine

## 目標

建立 Graph Atlas WP4 內部原型，驗證「中央 Main Galaxy＋周圍 Wonder clusters」是否在桌機與手機上形成清楚、安靜、可導航的首頁構圖。原型只包含 Main Galaxy 與 Light／Quantum／Edge AI 三個 Canvas preview，使用 WP3 的 static-first presentation index；現行 `index.html`、Main、Wonders、Explorer 與 production 導覽保持不變。

## 已凍結的實作裁決

- 內部路由固定為 `/atlas-v2.html`，加進 Vite build input；加 `noindex`，不進 sitemap、不改 `/`。
- Canvas pilot 的互動區域只有 Main、Light、Quantum、Edge AI。Canvas DOM mirror 與這四區一對一；另保留 build-time 靜態的 19 Wonders directory，確保 index／Canvas／JavaScript 失敗時仍可普通導航。
- 真實 presentation config 為 `config/atlas/atlas-layout.json`；以 WP3 fixture 的 2400×1600、中央 Main 與三個 pilot Wonder 座標作起點，視覺 QA 可在本 config 內調整，不改 Main／Wonder node layout locks。
- Main 的三語 title／summary 屬 presentation copy，放在 Main presentation config 並受 schema 驗證；Wonder title／summary 由既有 `data/wonders/*.json` 的 `title`／`intro` build-time 衍生，禁止平行抄寫。
- Atlas road endpoint 使用資料契約的 namespace 形式 `wonder:<id>`；WP4 只發布一條已核可 `wonder:light` ↔ `wonder:quantum` road，`via=wave_particle_duality_concept`。validator 必須驗 endpoint 存在、`via` 是 canonical node、只有 `approved:true` 進 index。
- preview 使用獨立、程序式 Canvas 2D region geometry，不載 node topology、不匯入 `frontend/src/engine/`、不建立 WP5 通用 renderer。缺少 optional preview 細節時畫基礎星雲 fallback。
- 不新增 dependency。可使用瀏覽器 Canvas API與現有 D3；優先保持 WP4 renderer 小而頁面專用。
- renderer 採 on-demand redraw；靜止時 redraw count 為 0。`prefers-reduced-motion` 關閉呼吸／流動效果，狀態仍以靜態外觀可辨識。
- UI 文案三語，不拼接句子。語言來源沿用 `neblux-lang`；無效值 fallback English。
- 建立 `window.__nebluxAtlas` 唯讀測試 hook，最少提供 `ready()`、`regionIds()`、`screenRegion(id)`、`camera()`、`redrawCount()` 與 `loadState()`；不得暴露可改 canonical data 的方法。

## 預計檔案範圍

可新增：

```text
config/atlas/atlas-layout.json
frontend/atlas-v2.html
frontend/src/atlas/atlas-main.js
frontend/src/atlas/atlas-renderer.js
frontend/src/atlas/atlas-state.js
frontend/src/atlas/atlas-accessibility.js
frontend/src/atlas/atlas-i18n.js
frontend/src/styles/pages/atlas.css
tests/e2e/atlas.spec.ts
```

可依契約需要修改：

```text
config/atlas/atlas-layout.schema.json
config/atlas/artifact.schema.json
scripts/atlas/validate-config.mjs
scripts/atlas/artifact-contract.mjs
scripts/atlas/build-index.mjs
scripts/atlas/audit-data.mjs
tests/atlas/artifacts.test.mjs
tests/atlas/validators.test.mjs
vite.config.ts
package.json
docs/CODEBASE-MAP.md
docs/GRAPH-ATLAS-IMPLEMENTATION-ROADMAP.md
docs/ROADMAP.md
```

## 驗收條件

- [x] 真實 `atlas-layout.json` 通過 source schema／validator；只含 Main＋三個 pilot Wonders＋一條 approved Light–Quantum road，普通 build 不改其座標。
- [x] `atlas:build-index` 在 clean checkout 可由 canonical sources deterministic 產出 `/data/atlas/index.json`；index 含三語 Main／Wonder title＋summary、region geometry 與 approved road，不含 raw nodes、raw edges、完整 descriptions 或未核可 road。
- [x] road validator 拒絕不存在的 `wonder:<id>`、不存在的 canonical `via`、self-road、重複 id 與未命名 endpoint；artifact audit 驗證 real index 並保留 WP3 stale-cleanup 行為。
- [x] Atlas index＋preview geometry gzip 後小於 250 KB，並在 HANDOFF 記錄原始／gzip bytes。
- [x] Vite clean build 先 fail-fast 生成／稽核 WP3 base artifacts 與 Atlas index，再輸出 `dist/atlas-v2.html`；`frontend/index.html` 與四個既有 production routes 不變。
- [x] `/atlas-v2.html` 首屏可辨識中央 Main Galaxy、Light、Quantum、Edge AI；Main 視覺尺度最大，但三個 Wonder label 與進入 affordance 在桌機與 390×844 手機均清楚可見。
- [x] pointer drag 可 pan；wheel與 44px `+`／`−`／reset controls 可 zoom／復位；camera 有合理 bounds，不會把全部 regions 永久移出畫面。
- [x] Canvas hover／focus、pointer hit region與 DOM mirror 指向相同四個 route；鍵盤 Tab＋Enter 可完成 Atlas→Main、Atlas→三個 pilot Wonders。
- [x] build-time 靜態 19 Wonders directory 在 JavaScript 關閉、Atlas index 404／invalid、Canvas context unavailable 時仍可導航；失敗顯示 calm status，不嘗試載入 full graph 補救。
- [x] Network 守門斷言 Atlas 不請求 `/data/all_nodes.json`、Wonder core／locale bundles、portal index、depth index或任何 `/api/*`；核心資料請求只允許 `/data/atlas/index.json` 與同源靜態頁面資源。
- [x] `prefers-reduced-motion: reduce` 下無連續動畫；一般模式停止互動後進入 idle，`redrawCount()` 不再增加，互動後可喚醒重繪。
- [x] visible focus、screen-reader route labels、Canvas 非唯一操作面、44×44 CSS px controls／hit targets與高對比文字成立。
- [x] HTML 無 executable inline script／handler、無外部網域資源；CSP、noindex、no-JS fallback 正確。
- [x] `window.__nebluxAtlas` hook、desktop／mobile pixel probes、index failure、Canvas failure、keyboard、reduced-motion、network assertions 納入 `tests/e2e/atlas.spec.ts`。
- [x] `npm run test:atlas`、`npm run verify`、繁簡檢查全綠；桌機、390×844、高 DPI／DPR 1 與 reduced-motion 已瀏覽器實看，HANDOFF 附效能與視覺結論。
- [x] 一輪針對 presentation contract、build integration、fallback／network boundary 的交叉審查完成，findings 已修正或交 Riku 裁決。

## 邊界（不要動的東西）

- 不修改 `frontend/index.html`，不把 Atlas 設成 production 首頁，不改 sitemap／canonical production 指向。
- 不修改 `frontend/src/engine/`、`app-main.js`、`wonders-main.js`、`explorer-main.js` 或既有 E2E hooks。
- 不修改 `data/*.json` source 結構／內容，不 author Wonder context，不新增／移動 canonical nodes。
- 不建立 WP5 Renderer v2、Main Galaxy runtime、Wonder explore mode、portal／Depth round-trip或任何 WP5–WP10 功能。
- 不修改 Cloudflare、`functions/`、`_headers`、feature flags、API、部署或 production settings。
- 不新增 dependency，不 commit／push／PR，除非 Riku 明示。

## Questions（Codex 填）

- 無產品／架構阻塞。road endpoint namespace、三語 copy source、Vite internal entry、Canvas／DOM pilot 邊界均已由現行 DIRECTION、data contract與本 brief 凍結。
- Repo hygiene gate 已完成：Riku 於 2026-07-14 授權 commit／branch／WP4；WP3 follow-up 已獨立提交為 `2659c23`，本 branch 由該 clean base 建立。

## HANDOFF（Codex 完成或卡住後填）

- Branch: `codex/graph-atlas-wp4`
- Base commit: `2659c23`
- Summary: internal `/atlas-v2.html` Canvas2D prototype is built: Main + Light/Quantum/Edge AI, one approved Light–Quantum road, DOM mirror, 19-Wonder static directory, i18n, pan/zoom/reset, noindex and `window.__nebluxAtlas` test hook. No production entry or legacy renderer changed.
- Changed files: Atlas presentation config/schema/contract/index builder/Vite integration, the new Atlas route/modules/styles, Atlas artifact tests and 6 Atlas E2E cases, roadmap/codebase docs.
- Contract changes: presentation config accepts validated three-language Main copy; roads require `main` or `wonder:<id>` endpoint namespaces and a canonical `via`. The generated index remains compact and only contains approved presentation data.
- Build／rollback: `npm run build` creates `dist/atlas-v2.html` and fail-fast generates Atlas artifacts. Rollback is removal of the internal Vite entry/route; `index.html` remains untouched. Atomic replacement correctly rejected a build while the dev server locked `frontend/public/data/atlas`.
- Automated verification: `npm run test:atlas` 46/46; `npm run atlas:validate` PASS (687 nodes/3381 records/3138 active pairs, including atlas-layout canonical `via` validation); `npm run atlas:audit-data` PASS (80 files); `npm run atlas:layout:check` PASS (687 nodes/19 Wonders/0 overlaps); current `npm run verify` PASS (renderer-v2 15/15 + depth 4/4 + E2E 84/84 + Atlas 46/46); Chinese character checks PASS (0 error, 21 existing review characters).
- Browser／device verification: Playwright Chromium E2E covers normal/index 404/Canvas unavailable/keyboard/mobile reduced-motion/pointer controls. Desktop and 390×844 full-page screenshots visually checked: labels, controls, hierarchy and no horizontal overflow are sound. `agent-browser` executable is unavailable in this environment, so visual verification used the installed Playwright Chromium CLI instead.
- Performance／network delta: `/data/atlas/index.json` is 4,462 bytes raw / 2,238 bytes gzip (<250 KB). Network E2E rejects full graph, Wonder bundles, portal/depth indices and `/api/*`; no continuous render loop (reduced-motion idle redraw test passes).
- Remaining risks: no unresolved WP4 implementation gate. Physical intermediate-phone performance remains field validation for WP5; Playwright emulation is not a substitute for real hardware.
- WP5 gate: cross-family review complete; Riku's combined closeout allows WP6.

## Review

- 2026-07-14 implementer self-review: fixed pixel/world pan scaling, added camera bounds and pointer-cancel recovery, avoided Canvas backing-store reallocation on every redraw, clamped tooltip placement, synchronized DOM focus with Canvas highlight, and raised controls to 44×44 CSS px. Strengthened index/config contracts to require localized Main copy, reject off-map endpoints and duplicate road ids, allowlist presentation fields, prevent arbitrary builder payload from leaking into the public index, and pass canonical graph ids through standalone artifact audit. Added painted-pixel, invalid-index, no-JS, DPR 2, focus, control-size, real-drag and camera-bound E2E assertions. No unresolved self-review findings remain.
- Cross-family review and follow-up fixes complete (2026-07-14).

## Cross-Family Review（2026-07-14，Claude Sonnet 4.6 / GitHub Copilot，模式②＋③）

- Reviewer: Claude Sonnet 4.6（不同模型家族；Codex 為實作層）
- 模式: ②測試互寫＋③對抗驗證
- 觸發原因: 中高風險路徑（新 Vite entry、Canvas prototype、build-time index integration）
- Initial verdict: **fix-needed（F-1；F-2 為 informational）**；兩項後續均已完成修正。

> **2026-07-14 凜空裁決**：兩項均修正。F-1（`ready()` 補充）＋ F-2（`atlas:validate` 讀取 atlas config，傳入 canonical graph ids 驗 `via`）已修正，並有 regression test；`npm run verify` 全綠（15/15 renderer-v2、4/4 depth-build、84/84 E2E、46/46 Atlas）。WP4 review gate 關閉。

### F-1（HIGH，fix-needed）：`window.__nebluxAtlas` 缺少 `ready()` 方法

**AC 文字**：「最少提供 `ready()`、`regionIds()`、`screenRegion(id)`、`camera()`、`redrawCount()` 與 `loadState()`」
**現況**：`atlas-main.js` 只暴露 `loadState`, `regionIds`, `screenRegion`, `camera`, `redrawCount`, `canvasAvailable`；**無** `ready()`。
**為什麼壞**：任何 future downstream adapter/WP6 呼叫 `window.__nebluxAtlas.ready()` 會得到 `undefined`，而非 boolean。
**E2E 測試漏網**：所有 E2E 用 `loadState()` poll，從未呼叫 `ready()`，故測試綠燈不等於 AC 達成。
**最小修正**：`atlas-main.js` 的 `window.__nebluxAtlas` 物件加一行 `ready: () => state.loadState === 'ready',`。
**信心**：高（直接讀 AC 文字與實作差距，無歧義）。

### F-2（LOW，informational）：source config validator 不驗 road `via` 是否為 canonical node

**AC 文字**：「road validator 拒絕… `via` 是 canonical node」
**現況**：`validate-config.mjs` 驗 road 欄位結構但不對 `via` 做 graphIds 交叉比對；`validateAtlasIndex(…, { graphIds })` 在 `build-index.mjs` 裡才驗。
**風險**：執行 `atlas:validate` 獨立驗 source config 時，不合法 `via` 通過；只有 `atlas:build-index` 步驟才會抓到。
**不阻塞**：build pipeline 路徑有守護，生成的 index 一定有效；若 AC 是指「至少在 build 流程驗」則已滿足。
**建議**：Riku 裁決是否要在 validate-config 也加 graphIds lookup（需額外 loadArtifactInputs 依賴），或維持現狀。
**信心**：中（AC 文字對「validator」指涉有模糊性）。

### 通過項（全部 AC 逐條對照，信心來源）

- atlas-layout.json schema 正確（wonderRegion 不需 title/summary，mainGalaxy 需要；已驗）
- atlas:build-index deterministic + 含三語 Main/Wonder copy + 4,462 bytes raw / 2,238 gzip ✅
- road validator 拒絕：不存在 wonder:id、self-road、重複 id、未命名 endpoint（validate-config.mjs 逐條核）✅
- Vite clean build fail-fast（vite.config.ts buildStart → buildData → buildIndexFromSources，失敗呼叫 this.error）✅
- production 四個路由未改（rollupOptions.input 確認）✅
- pan/zoom/reset/bounds（clampCamera 邏輯數學驗算正確）✅
- Canvas DOM mirror 四個路由一對一；no-JS、index-404、Canvas-unavailable fallback 有 E2E 覆蓋 ✅
- network boundary（E2E 守門明確拒絕 /data/all_nodes.json、/data/wonders/、/api/）✅
- reduced-motion idle（WP4 renderer 無連續 rAF loop，180ms 等待足夠）✅
- 44px controls（E2E 量測實際 getBoundingClientRect）✅
- noindex、no inline script（HTML diff 確認）✅
- `npm run test:atlas` 46/46；`npm run verify` E2E 84/84（本機重跑確認）✅
