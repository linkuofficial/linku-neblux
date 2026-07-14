# TASK: graph-atlas-wp0-direction-freeze
狀態: done
建立: 2026-07-12 ｜ 秘書層: Fable 5／Claude（上游審查） ｜ 實作層: Codex
Repo: Neblux
Base: master working-tree（Graph Atlas planning docs 未提交）
Required verification: domain inventory script＋跨文件斷言＋`python scripts/check_simplified.py`
風險等級: 決策(模式⑤)

## 目標

完成 Graph Atlas Roadmap 的 WP0 Direction Freeze：把凜空已接受、且經 Fable 5 交叉審查修正的四級產品架構寫回 `docs/DIRECTION.md`，完成 12／13 domains 對帳，並以 ADR 固定 layout、URL 與 bundle 邊界。這一包只凍結方向，不進入 schema 或禁區程式實作。

## 驗收條件

- [x] `DIRECTION.md` 明定 Atlas／Main Galaxy／Wonder Cluster／Depth 的責任與地位。
- [x] 明確取代舊「featured Wonder landing」方向，且維持 Wonders 是產品核心、圖譜是共同空間。
- [x] Mathematics／Physics 雙核心與其他 domains 不代表價值階級的規則寫入北極星。
- [x] 12-domain inventory 有可重現證據；13-domain 歷史顯示值不再當產品契約。
- [x] Layout／URL／Bundle ADR 完成，與 Graph Atlas Contract 一致。
- [x] 跨文件斷言與繁簡檢查通過。
- [x] 未動 engine、data schema、build、routes、deployment；未 commit／push。

## 邊界（不要動的東西）

- 不建立 `config/atlas/`，不實作 WP1 schemas／validators。
- 不修改 `frontend/src/engine/`、`data/*.json`、`vite.config.ts`、`functions/`、`_headers`。
- 不切換 `index.html`、`app.html`、`wonders.html` production routes。
- 不重開後端、教育金流或 Depth 內容量產方向。

## Questions（實作層填：卡住或需要決策時）

- 無。Atlas landing、四級架構、雙核心及繼續執行已由凜空在本串對話明確接受。

## HANDOFF（實作層完成或卡住後填）

- Branch: master working tree
- Summary:
  - `docs/DIRECTION.md` 已接受 Atlas landing 與四級產品架構，保留 Wonders 的產品核心地位。
  - 新增 `docs/GRAPH-ATLAS-ADRS.md`，固定 stable layout、URL state、static bundle 三項架構邊界。
  - 新增 domain inventory gate；canonical graph 確認為 12 codes／12 anchors，歷史 13-domain 顯示值退場。
  - `docs/ROADMAP.md` 已指向 Graph Atlas WP0–WP10，舊 Phase 保留為交付／債台帳。
- Verification: domain inventory assertion PASS（687 nodes、12 codes、12 anchors）；跨文件 assertions 12／12 PASS；`python scripts/check_simplified.py`＝0 ERROR；docs-only 未跑 `npm run verify`。
- Remaining risks:
  - 正式 Atlas landing 仍需 WP4 prototype 與 WP10 cutover，不可把方向定案誤作上線授權。
  - WP1 schema／validators 需完成新的強制交叉審查後才實作。

## Review（審查層填；盡量用與實作層不同的模型家族）

- Reviewer: Fable 5
- 模式: ⑤雙提案／架構交叉審查
- 觸發原因: Graph Atlas 規劃將約束未來 engine／data schema 禁區
- Verdict: fix-needed（0 P0、4 P1、7 P2）；修正執行見 `2026-07-12-graph-atlas-review-fixes.md`
- Findings:
  - WP0.5 必須先驗證 layout；已完成並判定 GO。
  - Edge、Wonder、Depth、locale、resting、migration 契約需修正；已完成。

## 裁決（凜空）

- 決定: 接受最新版並繼續執行 WP0。
- 日期: 2026-07-12
