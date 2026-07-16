# TASK: atlas-route-demote-second-page

狀態: done（文件與工作樹回退完成；Atlas 第二頁正式 release 另開 brief）
建立: 2026-07-16 ｜ 裁決: 凜空 ｜ 執行: Claude

## 背景與裁決

2026-07-15 RG-A 已把 `/`（`index.html`）切為 production Atlas 首頁（commit `f58ddf5`，未 push／未部署）。2026-07-16 凜空檢視 Atlas 首頁實際畫面後裁決方向修訂：

> **Atlas 是第二頁的轉接頁，不是首頁。首頁先套用現行未更新的舊版 landing。**

此裁決取代 2026-07-12「首頁改為宇宙地圖」定案中的「首頁」定位；Atlas 的功能定位（純視覺、方位／氣氛／跳轉、不承載知識操作）不變。

## 執行內容

### 工作樹回退（還原至 `fc8c057`，即 RG-A 前版本）

- `frontend/index.html` → 舊版 legacy landing（`src/landing-main.js`；landing 資產本就保留未刪）
- `tests/e2e/smoke.spec.ts`、`discoverability.spec.ts`、`api-failure.spec.ts`、`visual-styles.spec.ts` ＋ `index-styles-chromium-win32.json` 快照 → 還原為守 landing 契約的版本
- `tests/e2e/atlas.spec.ts` → 還原（移除兩個「`/`＝Atlas」的 production 首頁測試；internal `/atlas-v2.html` 測試不受影響）

### RG-A 產出中保留的部分（與路由無關）

- `frontend/atlas-v2.html`：Featured regions 文案、`data-wonder-id` 標記、修正後的 Wonder 標題
- `frontend/src/atlas/atlas-i18n.js`：三語 Wonder title map（WONDER_FALLBACKS）
- `tests/atlas/wonder-titles.test.mjs` ＋ `package.json` 的 `test:atlas` 掛載：title map 與 `data/wonders/*.json` 的對帳測試
- `frontend/src/atlas/atlas-accessibility.js`、`frontend/src/styles/pages/atlas.css` 調整

### 文件同步

- `docs/DIRECTION.md` §Graph Atlas 產品架構：§1 改為「Atlas 第二頁轉接頁（2026-07-16 凜空裁決）」，附修訂紀錄
- `docs/GRAPH-ATLAS-PLAN.md`：一句話定義、§1.3 方向演進、視圖路由表、§16.2 切換順序
- `docs/GRAPH-ATLAS-IMPLEMENTATION-ROADMAP.md`：進度補記、Stage A／RG-A 改為 superseded＋重定義、切換順序
- `docs/ROADMAP.md`：新增 2026-07-16 修訂註記
- `docs/CODEBASE-MAP.md`：`index.html` 條目改回 landing
- `docs/tasks/2026-07-15-graph-atlas-rg-a-atlas-route-release.md`：狀態改 superseded＋裁決更新

## 未決事項（後續 brief 的輸入，不在本包假設答案）

1. ~~Atlas 第二頁的正式路由命名~~ → **定案 `/atlas.html`**（2026-07-16 凜空同意）。
2. ~~首頁 landing 如何導向 Atlas~~ → **定案方案 A**（2026-07-16 凜空校對後拍板）：「OPEN THE GRAPH」CTA＋footer「Graph」改指 `/atlas.html`；搜尋／pills 直達 `app.html?node=<id>` 不變。release brief 見 `2026-07-16-graph-atlas-rg-a-second-page-release.md`。
3. ~~Atlas 第二頁的視覺升級~~ → **保留白模、暫不處理**（2026-07-16 凜空裁決；上線前再議）。已登錄 AGENTS.md 技術債台帳。
4. commit 拆分方式：`f58ddf5` 已在分支歷史裡，本回退是工作樹層；最終 commit 策略由凜空裁。

## 驗證

- `npm run verify` 全綠（build ＋ renderer-v2 32/32 ＋ depth 4/4 ＋ E2E ＋ atlas 54/54）
- 瀏覽器實看 `/`＝舊版 landing、`/atlas-v2.html`＝internal Atlas 正常
- `python scripts/check_simplified.py` 0 ERROR（文件中文）

## HANDOFF

- Branch: `codex/graph-atlas-integration`（回退與文件修改均未 commit，與 WP6 工作樹並存）
- Remaining risks: `f58ddf5` commit 本身仍在歷史中（訊息寫 activate atlas homepage route）；若凜空要乾淨歷史需 rebase/revert commit，屬另一決策。E2E 的 landing 契約已還原，但尚未在真機驗證舊 landing 視覺快照是否因其他工作樹改動（`styles/app/_base.css` 有 WP6 未提交修改）而漂移——verify 結果為準。
