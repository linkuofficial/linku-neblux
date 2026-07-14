# TASK: graph-atlas-wp4-prototype
狀態: review
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

- [ ] 真實 `atlas-layout.json` 通過 source schema／validator；只含 Main＋三個 pilot Wonders＋一條 approved Light–Quantum road，普通 build 不改其座標。
- [ ] `atlas:build-index` 在 clean checkout 可由 canonical sources deterministic 產出 `/data/atlas/index.json`；index 含三語 Main／Wonder title＋summary、region geometry 與 approved road，不含 raw nodes、raw edges、完整 descriptions 或未核可 road。
- [ ] road validator 拒絕不存在的 `wonder:<id>`、不存在的 canonical `via`、self-road、重複 id 與未命名 endpoint；artifact audit 驗證 real index 並保留 WP3 stale-cleanup 行為。
- [ ] Atlas index＋preview geometry gzip 後小於 250 KB，並在 HANDOFF 記錄原始／gzip bytes。
- [ ] Vite clean build 先 fail-fast 生成／稽核 WP3 base artifacts 與 Atlas index，再輸出 `dist/atlas-v2.html`；`frontend/index.html` 與四個既有 production routes 不變。
- [ ] `/atlas-v2.html` 首屏可辨識中央 Main Galaxy、Light、Quantum、Edge AI；Main 視覺尺度最大，但三個 Wonder label 與進入 affordance 在桌機與 390×844 手機均清楚可見。
- [ ] pointer drag 可 pan；wheel與 44px `+`／`−`／reset controls 可 zoom／復位；camera 有合理 bounds，不會把全部 regions 永久移出畫面。
- [ ] Canvas hover／focus、pointer hit region與 DOM mirror 指向相同四個 route；鍵盤 Tab＋Enter 可完成 Atlas→Main、Atlas→三個 pilot Wonders。
- [ ] build-time 靜態 19 Wonders directory 在 JavaScript 關閉、Atlas index 404／invalid、Canvas context unavailable 時仍可導航；失敗顯示 calm status，不嘗試載入 full graph 補救。
- [ ] Network 守門斷言 Atlas 不請求 `/data/all_nodes.json`、Wonder core／locale bundles、portal index、depth index或任何 `/api/*`；核心資料請求只允許 `/data/atlas/index.json` 與同源靜態頁面資源。
- [ ] `prefers-reduced-motion: reduce` 下無連續動畫；一般模式停止互動後進入 idle，`redrawCount()` 不再增加，互動後可喚醒重繪。
- [ ] visible focus、screen-reader route labels、Canvas 非唯一操作面、44×44 CSS px controls／hit targets與高對比文字成立。
- [ ] HTML 無 executable inline script／handler、無外部網域資源；CSP、noindex、no-JS fallback 正確。
- [ ] `window.__nebluxAtlas` hook、desktop／mobile pixel probes、index failure、Canvas failure、keyboard、reduced-motion、network assertions 納入 `tests/e2e/atlas.spec.ts`。
- [ ] `npm run test:atlas`、`npm run verify`、繁簡檢查全綠；桌機、390×844、高 DPI／DPR 1 與 reduced-motion 已瀏覽器實看，HANDOFF 附效能與視覺結論。
- [ ] 一輪針對 presentation contract、build integration、fallback／network boundary 的交叉審查完成，findings 已修正或交 Riku 裁決。

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
- Automated verification: `npm run test:atlas` 44/44; `npm run atlas:validate` PASS (687 nodes/3381 records/3138 active pairs); `npm run atlas:audit-data` PASS (80 files); `npm run atlas:layout:check` PASS (687 nodes/19 Wonders/0 overlaps); `npm run verify` PASS (build + depth 4/4 + E2E 78/78); Chinese character checks PASS (0 error, 21 existing review characters).
- Browser／device verification: Playwright Chromium E2E covers normal/index 404/Canvas unavailable/keyboard/mobile reduced-motion/pointer controls. Desktop and 390×844 full-page screenshots visually checked: labels, controls, hierarchy and no horizontal overflow are sound. `agent-browser` executable is unavailable in this environment, so visual verification used the installed Playwright Chromium CLI instead.
- Performance／network delta: `/data/atlas/index.json` is 4,462 bytes raw / 2,238 bytes gzip (<250 KB). Network E2E rejects full graph, Wonder bundles, portal/depth indices and `/api/*`; no continuous render loop (reduced-motion idle redraw test passes).
- Remaining risks: cross-family review has not yet been performed. Packet generated at `C:\Users\Riku\AppData\Local\Temp\neblux-wp4-xfire-packet.txt` for a clean Claude/Luna review; `codex exec review` inner-review attempt timed out after 124 seconds and produced no findings. Do not claim WP4 done until the review result is added below and accepted.
- WP5 gate: not automatically authorized

## Review

- Pending: paste `C:\Users\Riku\AppData\Local\Temp\neblux-wp4-xfire-packet.txt` into a clean cross-family reviewer. Reviewer scope is acceptance criteria only; put findings here without implementer/model debate.
