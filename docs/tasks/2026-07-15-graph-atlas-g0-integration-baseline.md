# TASK: graph-atlas-g0-integration-baseline
狀態: done
建立: 2026-07-15 ｜ 秘書層: Codex ｜ 實作層: Codex
Repo: Neblux
Base: `ec58afc`（`codex/graph-atlas-wp5` reviewed HEAD）
Required verification: `npm run verify`＋`npm run test:e2e:visual`＋`npm run atlas:validate`＋`npm run atlas:build-data`＋`npm run atlas:build-index`＋`npm run atlas:audit-data`＋`npm run atlas:layout:check`＋`python scripts/check_simplified.py`＋`git diff --check`
風險等級: 中——只收斂已審查 stack 與文件基線，不改 production route、不 merge master

## 目標

把 WP0–WP5 reviewed stack 與 2026-07-14 滾動校準收斂成 Luna 可直接從單一 branch 接手的共同基線，明確區分 branch complete、integrated、route active、deployed，並為下一包 RG-A 留下唯一入口。

## 驗收條件

- [x] 從 reviewed WP5 HEAD `ec58afc` 建立 `codex/graph-atlas-integration`。
- [x] `master`、production routes、Cloudflare／部署設定與 runtime flags 未修改。
- [x] Graph Atlas Roadmap v0.2、`docs/ROADMAP.md`、`docs/CODEBASE-MAP.md` 對目前狀態與下一步一致。
- [x] 完整 build／E2E／visual／Atlas source／artifact／layout regression 全綠。
- [x] 下一包固定為 RG-A Atlas route release；Luna 不需重新盤點 WP0–WP5 或猜切換順序。

## 邊界（不要動的東西）

- 不 merge／rebase／rewrite `master` 或既有 WP branches。
- 不改 `frontend/index.html`、`app.html`、`wonders.html`、`explorer.html` 或任何 runtime source。
- 不改 `frontend/src/engine/`、`frontend/src/engine-v2/`、`data/*.json`、`vite.config.ts`、`functions/`、`_headers` 或部署設定。
- 不執行 production deploy。

## Questions（實作層填：卡住或需要決策時）

- 已裁決：G0 使用獨立 `codex/graph-atlas-integration` 作共同基線，不直接 merge `master`；後續工作從 integration branch 分支。
- 已裁決：下一包先 RG-A，符合長期主計畫「Atlas 首頁先切、目的頁維持 legacy」；不先開 WP5.5／WP6。

## HANDOFF（實作層完成或卡住後填）

- Branch: `codex/graph-atlas-integration`
- Summary: Reviewed WP0–WP5 stack 已收斂為共同 branch；只更新滾動路線圖、工作清單、程式地圖與 G0 紀錄，沒有 production route／runtime／deploy 變更。
- Verification: `npm run verify` PASS（build、Renderer v2 15／15、Depth 4／4、non-visual E2E 84／84、Atlas 46／46）；`npm run test:e2e:visual` 4／4；Atlas validate 687 nodes／3,138 active pairs、80 artifacts、19 Wonders／0 overlaps 全綠；繁簡 0 ERROR；`git diff --check` PASS。
- Remaining risks: `master` 仍未包含 stack；這是刻意的安全邊界。RG-A 只會令 Atlas 成為 production build 首頁，外部部署仍需另外明示授權。

## Review（審查層填；盡量用與實作層不同的模型家族）

- Reviewer: 不另觸發——G0 無新 runtime／contract／強制路徑變更，承接的 WP3–WP5 已完成各自跨家族 review。
- 模式: N/A
- 觸發原因: N/A
- Verdict: N/A
- Findings:
  - 無。

## 裁決（凜空）

- 決定: 授權 G0；整理共同基線並讓 Luna 可直接開始下一包。
- 日期: 2026-07-15
