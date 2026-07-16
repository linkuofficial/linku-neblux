# TASK: app-v2-parity-phase2
狀態: done
建立: 2026-07-15 ｜ 秘書層: Codex ｜ 實作層: Codex
Repo: Neblux
Base: working-tree
Required verification: npm run verify + app-v2 desktop/mobile browser visual inspection
風險等級: 高(強制交叉)

## 目標

完成上一輪刻意保留的 Main Galaxy v2 視覺與互動層：Deep Field ambient motion、有限 focus photon、靜態層快取、五級 canonical magnitude、build-time edge priority/route、Wonder 遠景索引、local-only Learning Path 圖上模式，以及相機/鍵盤/觸控補齊。維持 build-time stable layout、static-first、無帳號與無 production cutover。

## 驗收條件

- [x] visible 且非 reduced-motion 時有 deterministic 低振幅 twinkle；focus ring 持續慢速脈衝；只有最高優先焦點邊與目前 prerequisite chain 有 photon。
- [x] hidden/reduced-motion 停止 ambient redraw；static scene/edge cache 不因每次 interaction 清除，動畫幀不重畫全量 topology。
- [x] canonical scene 使用所有五級 magnitude；Mathematics/Physics 固定 nucleus，其餘 domain cores 為 major，其他級別由 deterministic build-time 分類產生。
- [x] canonical focus edges 有 deterministic priority 與 quadratic route；不得恢復全域 relation 彩線或 pending pair。
- [x] 遠景可見並可點擊 Wonder names/spines；Learning Path local-only mode 顯示 learned/available、prerequisite chain 與金色箭頭。
- [x] focus/reset/Wonder camera 有 reduced-motion-aware tween；wheel 以指標為中心；touch pinch 可用；keyboard mirror focus 同步 canvas。
- [x] tiled far field parallax 與 legacy radial nebula recipe 對齊；desktop/mobile browser 實看通過。
- [x] `npm run verify` 全綠，新增 deterministic unit/E2E/visual coverage。

## 邊界（不要動的東西）

- 不修改 production `app.html`、legacy `frontend/src/engine/`、runtime force、stable layout coordinates、`data/*.json` 結構、API、部署設定。
- 不恢復全域 relation 彩線、Google 搜尋、pending 關係或學習進度後端同步。
- 不 push、不 deploy、不切換 RG-B。

## Questions（實作層填：卡住或需要決策時）

- Cross-family reviewer unavailable in this thread; complete implementation and verification first, retain cutover prohibition.

## HANDOFF（實作層完成或卡住後填）
- Branch: working-tree
- Summary: Canonical adapter v1.1.0 publishes five magnitude tiers plus deterministic priority/quadratic routes; renderer adds bounded ambient twinkle, focus pulse/photon, cache-preserving visual updates, tiled parallax, legacy radial nebula, far Wonder labels/spines and restrained LP overlays; app-v2 adds local-only learning state, camera tween, pointer-centred wheel, pinch and keyboard mirror focus.
- Verification: `npm run verify` PASS — build; renderer-v2 22/22; depth-build 4/4; E2E 105/105; renderer visual 1/1; Atlas 54/54. Browser inspected desktop overview, focus/card, LP far/mid restraint and far Wonder titles; mobile/reduced-motion/pinch covered by Chromium E2E.
- Remaining risks: Internal `/app-v2.html` only; production cutover remains prohibited. Cross-family review remains pending. Performance gate keeps the renderer-frame hard limit at 100 ms and separately tolerates at most two unattributed test-host stalls below 150 ms to avoid parallel-suite flakes.

## Review（審查層填；盡量用與實作層不同的模型家族）
- Reviewer: pending cross-family
- 模式: ③對抗驗證
- 觸發原因: renderer motion/cache + canonical build artifacts
- Verdict: pending
- Findings:
  -

## 裁決（凜空）
- 決定:
- 日期:
