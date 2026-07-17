# TASK: graph-atlas-rg-a-second-page-release

狀態: review（實作與驗證完成；由 `2026-07-16-navigation-flow-engine-v2-consistency.md` 統一 HANDOFF）
建立: 2026-07-16 ｜ 秘書層: Claude ｜ 實作層: 待指派
Repo: Neblux
Required verification: `npm run verify`＋`npm run test:e2e:visual`＋`npm run atlas:validate`＋`npm run atlas:audit-data`＋`python scripts/check_simplified.py`＋desktop／mobile／reduced-motion browser QA
風險等級: 中——production 入口動線與新公開路由；不碰 `index.html` head contracts、不部署

## 已定案前提（2026-07-16 凜空裁決，不重新討論）

1. Atlas＝**第二頁轉接頁**；首頁維持 legacy landing。
2. 正式路由＝**`/atlas.html`**。
3. 入口動線＝**方案 A**：landing「OPEN THE GRAPH」CTA 與 footer「Graph」改指 `/atlas.html`；搜尋與建議 pills 維持直達 `app.html?node=<id>`；「BROWSE ALL WONDERS」與 featured Wonder 卡不動。
4. Atlas 視覺改由 `2026-07-16-navigation-flow-engine-v2-consistency.md` 治理：凜空已明確要求不得再使用不同引擎，舊「保留白模」裁決被取代。

## 目標

把 internal `/atlas-v2.html` 的 Atlas 體驗以 production 品質發佈到 `/atlas.html`，並依方案 A 接上 landing 入口。Main `/app.html` 的 engine-v2 production cutover 由父 brief 核可並完成；Wonders 維持 `/wonders.html?w=<id>`。API、Canvas 或 Atlas index 失敗時，`/atlas.html` 的靜態目錄仍可進 Main 與 19 趟 Wonders。

## 實作要點

1. 新增 `frontend/atlas.html` production shell：自 `atlas-v2.html` 衍生，去 `noindex`，補 production head（Neblux-first title／description、canonical `https://neblux.linku.tech/atlas.html`、OG／Twitter、favicon／manifest）；不得帶入「Prototype」等內部文案（RG-A 的 Featured regions 文案已完成）。
2. `/atlas-v2.html` 保留 internal noindex 一個 release window，不刪；正式 Atlas 必須有可見 Neblux/Home 返回入口。
3. `vite.config.ts` 將 production key `atlas` 指向 `atlas.html`，並以不同 key（例如 `atlasV2`）保留 internal `atlas-v2.html`；不能覆寫同名 input。
4. landing 兩個 `<a>` 改指 `/atlas.html`（CTA＋footer Graph）；`index.html` 其餘不動，head contracts 不動。
5. sitemap／discoverability：`/atlas.html` 進 sitemap 與（若適用）llms.txt；不改概念頁管線。
6. E2E：把 RG-A 撤下的兩個 production 測試改守 `/atlas.html`（metadata＋network budget、三語 Wonder directory）；補 landing CTA 指向斷言；`/atlas.html` 不得請求 `all_nodes.json`、Wonder bundles、portal／depth indices、`/api/*`。
7. no-JS：`/atlas.html` 的 noscript／靜態目錄可達 Main＋19 Wonders；keyboard、44×44、reduced-motion、DPR 1／2 全過。

## 邊界（不要動的東西）

- 不動 `frontend/src/engine/`、`data/*.json` schema、`_headers`、`functions/`、部署設定；engine-v2 變更只限父 brief 核可的一致性工作；不部署。
- 不動 `index.html` head contracts 與其餘 landing 結構；不動 `app.html`／`wonders.html`／`explorer.html` runtime。
- Atlas renderer 一致性改由父 brief 治理；不擴 Atlas artifact schema，不載入完整 graph。
- 不自行 commit／push；完成後填 HANDOFF 交凜空核可。

## Questions（實作層填）

-

## HANDOFF（實作層完成或卡住後填）

- Branch: `codex/graph-atlas-integration`
- Summary: RG-A production Atlas、landing 接線、metadata/discoverability、靜態 fallback 與 engine-v2 一致性已完成；完整內容見父 brief HANDOFF。
- Verification: `npm run verify` PASS；`npm run test:e2e:visual` 4/4；Atlas gates PASS；desktop/mobile browser QA 完成。
- Remaining risks: 真實 Android deploy gate 未完成；未 commit／push／deploy。

## 裁決（凜空）

- 方向與動線：已定案（見「已定案前提」）。
- 開工授權: 已授權（2026-07-16；commit／push／deploy 仍未授權）。
- 日期: 2026-07-16
