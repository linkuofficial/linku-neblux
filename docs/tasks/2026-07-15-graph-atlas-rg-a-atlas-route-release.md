# TASK: graph-atlas-rg-a-atlas-route-release
狀態: in-progress
建立: 2026-07-15 ｜ 秘書層: Codex ｜ 實作層: Luna
Repo: Neblux
Base: `91e147e`（`codex/graph-atlas-integration` G0 baseline；實作 branch 從此 commit 建立）
Required verification: `npm run verify`＋`npm run test:e2e:visual`＋`npm run atlas:validate`＋`npm run atlas:audit-data`＋`python scripts/check_simplified.py`＋desktop／mobile／reduced-motion browser QA
風險等級: 中——production 首頁／SEO／i18n route cutover；不碰強制路徑、不部署

## 目標

完成 WP10 Stage A／RG-A：把已通過 WP4 gate 的 Graph Atlas 體驗升為 production build 的 `/` 首頁，同時讓 Main 與 Wonders 目的頁繼續使用現行 legacy routes。這一包只切入口層，不把 Main／Wonder／Depth v2 偷渡進來；API、Canvas 或 Atlas index 失敗時，使用者仍能透過靜態目錄進入 Main 與 19 趟 Wonders。

## 實作裁決（Luna 直接照此，不需重問）

1. `frontend/index.html` 改為 production Atlas shell，載入既有 `src/atlas/atlas-main.js` 與 Atlas CSS；不在舊 `landing-main.js` 上疊 Atlas。
2. `frontend/atlas-v2.html` 保留一個 release window，維持 `noindex, nofollow` 的 internal diagnostic route；不刪除。
3. 舊 landing 的 JS／CSS／assets 保留作單 commit rollback，但不新增公開 `legacy-home.html`，也不在這包清理死碼。
4. `/` 必須保留現行 production head contracts：Neblux-first title／description、canonical `/`、OG／Twitter、favicon／manifest、WebSite JSON-LD 與 SearchAction。不得把 prototype 的 `noindex` 或「Graph Atlas Prototype」帶進正式首頁。
5. 對外仍是一個 Neblux；`Graph Atlas` 可作介面描述，但 wordmark／title 不得呈現成第二個獨立產品。把 `Pilot regions`、`試行區域`、`試作リージョン` 改為 production 語意，例如 Featured regions／精選區域／注目の領域。
6. Main Galaxy route 維持 `/app.html`；19 Wonder routes 維持 `/wonders.html?w=<id>`。不改 legacy runtime 或 URL contracts。
7. 19 趟靜態 Wonder directory 在 en／zh／ja 切換時都顯示既有 source title；不得 runtime fetch 19 份 Wonder JSON。可把現有 `WONDER_FALLBACKS` 擴成三語靜態 map，但需加 Node test 與 `data/wonders/*.json` titles 對帳，避免平行資料漂移；不改 Atlas artifact schema。
8. 現有 About／Methodology／Sources／Wonders／Main／Sitemap 可發現連結必須在 production `/` 的普通 HTML 或安靜 footer 中保持可達；無 JS 時 Main＋19 Wonders 仍是普通 `<a>`。
9. 本包完成的是 repo 內 `route active`；不執行 Cloudflare deploy，不改部署設定。RG-A commit／push 也需在 HANDOFF 後由 Riku 明確核可。

## 驗收條件

- [ ] `/` 載入 Atlas，`window.__nebluxAtlas.ready()` 成立；`/atlas-v2.html` 仍可獨立載入且保持 noindex。
- [ ] `/` 的 `<title>`／description／canonical／OG／Twitter／WebSite JSON-LD／SearchAction／favicon／manifest 通過 E2E；頁面沒有 `noindex`、`Prototype`、`Pilot regions` 或其他內部文案。
- [ ] Atlas index 正常、404、invalid shape、Canvas unavailable 四種狀態下，Main＋19 Wonders 普通連結都可用；Atlas index failure 不改載入完整 graph 補救。
- [ ] Network 守門證明 `/` 不請求 `/data/all_nodes.json`、Wonder bundles、portal／Depth indices或 `/api/*`；只使用 compact Atlas presentation data 與靜態 assets。
- [ ] Desktop 第一屏清楚顯示 Main Galaxy 與可直接進入的 Wonder names；390×844 第一屏至少可辨識 Main 與兩個 Wonder entries，Main 不以亮度／CTA 把 Wonders 壓成裝飾。
- [ ] en／zh／ja 的 production UI、featured region copy 與 19 Wonder directory titles 正確切換；語言仍沿用 `localStorage['neblux-lang']`。
- [ ] keyboard focus、skip link、44×44 controls、DOM／Canvas route equivalence、reduced-motion、DPR 1／2、no-JS fallback 全過。
- [ ] 現有 root smoke 與 API-failure tests 改守 Atlas production contract；`tests/e2e/atlas.spec.ts` 繼續守 internal route，並補 `/` 的 production metadata／fallback／network assertions。
- [ ] 舊 `landing-main.js` 與 landing styles/assets 未刪；rollback 可用單一 RG-A commit 還原 `index.html` 與相關 production-only調整。
- [ ] `npm run verify`、`npm run test:e2e:visual`、Atlas validate／audit、繁簡檢查全綠；desktop／mobile／reduced-motion 截圖已人工實看。
- [ ] HANDOFF 明確填 branch、changed files、production metadata差異、network結果、browser QA、rollback與未部署狀態。

## 建議檔案範圍

可修改：

```text
frontend/index.html
frontend/atlas-v2.html                    # 只在需要維持 internal/production 差異時小改
frontend/src/atlas/atlas-main.js
frontend/src/atlas/atlas-i18n.js
frontend/src/styles/pages/atlas.css
tests/atlas/**                            # 只加 Wonder title map 對帳
tests/e2e/atlas.spec.ts
tests/e2e/smoke.spec.ts
tests/e2e/api-failure.spec.ts
tests/e2e/discoverability.spec.ts         # 只補 root metadata contract
docs/CODEBASE-MAP.md
docs/GRAPH-ATLAS-IMPLEMENTATION-ROADMAP.md
docs/ROADMAP.md
本 brief
```

預設不需修改：

```text
vite.config.ts
frontend/src/landing-main.js
frontend/src/styles/landing/**
frontend/src/engine/**
frontend/src/engine-v2/**
data/**
config/atlas/**
scripts/atlas/**
functions/**
frontend/public/_headers
```

若驗收必須超出「可修改」或碰到預設不改區，先寫入 Questions 停下；不要順手擴大。

## 邊界（不要動的東西）

- 不開 WP5.5／WP6，不建立 `app-v2.html`，不改 Main／Wonder／Depth／Explorer runtime。
- 不改 `frontend/src/engine/`、`frontend/src/engine-v2/`、stable layout、Atlas presentation coordinates／roads 或 `data/*.json` source／schema。
- 不新增 dependency，不改 build／artifact contract，不實作 API／telemetry／backend。
- 不改 `_headers`、`functions/`、Cloudflare／DNS／CI/CD／deploy settings，不執行部署。
- 不刪 legacy landing source、internal Atlas route、legacy E2E hooks 或 v1 `tour-index.json`。
- 不自行 commit／push；完成實作、驗證與 HANDOFF 後交 Riku 核可。

## Questions（實作層填：卡住或需要決策時）

- 已裁決：本包採「production `/` 使用 Atlas＋`/atlas-v2.html` 保留 internal noindex＋舊 landing source 保留」；不另建公開 legacy route。
- 已裁決：production 首頁不承載完整搜尋 UI；保留 WebSite SearchAction 與 Main Galaxy `/app.html` 入口即可，符合 Atlas 只負責方位／氣氛／跳轉的北極星。
- 已裁決：19 Wonder titles 需三語，但不得 runtime 載入全部 Wonders 或擴張 Atlas artifact schema；用有 source 對帳測試的靜態 map。
- 已裁決：Riku 已授權 Luna 從 G0 baseline 開始 RG-A 實作；外部部署與 RG-A commit／push不在本次授權內。

## HANDOFF（實作層完成或卡住後填）

- Branch:
- Summary:
- Verification:
- Remaining risks:

## Review（審查層填；盡量用與實作層不同的模型家族）

- Reviewer:
- 模式: ③對抗驗證
- 觸發原因: production entry／SEO／fallback route cutover
- Verdict:
- Findings:
  -

## 裁決（凜空）

- 決定: 已授權 Luna 從 G0 baseline 開始 RG-A；完成後再裁 commit／push／deploy。
- 日期: 2026-07-15
