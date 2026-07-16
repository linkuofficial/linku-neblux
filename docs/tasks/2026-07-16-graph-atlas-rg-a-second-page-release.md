# TASK: graph-atlas-rg-a-second-page-release

狀態: pending（brief 已定稿；**未授權開工**——實作、commit、push、deploy 均需凜空明確授權）
建立: 2026-07-16 ｜ 秘書層: Claude ｜ 實作層: 待指派
Repo: Neblux
Required verification: `npm run verify`＋`npm run test:e2e:visual`＋`npm run atlas:validate`＋`npm run atlas:audit-data`＋`python scripts/check_simplified.py`＋desktop／mobile／reduced-motion browser QA
風險等級: 中——production 入口動線與新公開路由；不碰 `index.html` head contracts、不部署

## 已定案前提（2026-07-16 凜空裁決，不重新討論）

1. Atlas＝**第二頁轉接頁**；首頁維持 legacy landing。
2. 正式路由＝**`/atlas.html`**。
3. 入口動線＝**方案 A**：landing「OPEN THE GRAPH」CTA 與 footer「Graph」改指 `/atlas.html`；搜尋與建議 pills 維持直達 `app.html?node=<id>`；「BROWSE ALL WONDERS」與 featured Wonder 卡不動。
4. Atlas 視覺**保留白模**（AGENTS.md 技術債台帳有案）；本包不含 renderer 升級。

## 目標

把 internal `/atlas-v2.html` 的 Atlas 體驗以 production 品質發佈到 `/atlas.html`，並依方案 A 接上 landing 入口。目的頁維持 legacy（Main `/app.html`、Wonders `/wonders.html?w=<id>`）。API、Canvas 或 Atlas index 失敗時，`/atlas.html` 的靜態目錄仍可進 Main 與 19 趟 Wonders。

## 實作要點

1. 新增 `frontend/atlas.html` production shell：自 `atlas-v2.html` 衍生，去 `noindex`，補 production head（Neblux-first title／description、canonical `https://neblux.linku.tech/atlas.html`、OG／Twitter、favicon／manifest）；不得帶入「Prototype」等內部文案（RG-A 的 Featured regions 文案已完成）。
2. `/atlas-v2.html` 保留 internal noindex 一個 release window，不刪。
3. `vite.config.ts` 加 `atlas.html` entry（禁區檔案：只加一行 input 接線，屬路線圖核可的 cutover 接線範圍）。
4. landing 兩個 `<a>` 改指 `/atlas.html`（CTA＋footer Graph）；`index.html` 其餘不動，head contracts 不動。
5. sitemap／discoverability：`/atlas.html` 進 sitemap 與（若適用）llms.txt；不改概念頁管線。
6. E2E：把 RG-A 撤下的兩個 production 測試改守 `/atlas.html`（metadata＋network budget、三語 Wonder directory）；補 landing CTA 指向斷言；`/atlas.html` 不得請求 `all_nodes.json`、Wonder bundles、portal／depth indices、`/api/*`。
7. no-JS：`/atlas.html` 的 noscript／靜態目錄可達 Main＋19 Wonders；keyboard、44×44、reduced-motion、DPR 1／2 全過。

## 邊界（不要動的東西）

- 不動 `frontend/src/engine/`、`frontend/src/engine-v2/`、`data/*.json` schema、`_headers`、`functions/`、部署設定；不部署。
- 不動 `index.html` head contracts 與其餘 landing 結構；不動 `app.html`／`wonders.html`／`explorer.html` runtime。
- 不升級 Atlas renderer 視覺（白模裁決）；不擴 Atlas artifact schema。
- 不自行 commit／push；完成後填 HANDOFF 交凜空核可。

## Questions（實作層填）

-

## HANDOFF（實作層完成或卡住後填）

- Branch:
- Summary:
- Verification:
- Remaining risks:

## 裁決（凜空）

- 方向與動線：已定案（見「已定案前提」）。
- 開工授權: 未授權（待凜空明確指示）。
- 日期: 2026-07-16
