# TASK: graph-atlas-wp5-5-canonical-scene-input
狀態: in-progress
建立: 2026-07-15 ｜ 秘書層: Codex ｜ 實作層: Luna
Repo: Neblux
Base: `f58ddf5`（RG-A route active，未 push）
Required verification: `npm run atlas:validate`、`npm run atlas:layout:check`、`npm run test:atlas`、`npm run test:renderer-v2`、新增 canonical scene tests、`npm run verify`
風險等級: 高（長期 presentation contract；與 WP6 分離，完成後與 WP6 一起跨模型審查）

## 目標

在 WP6 page integration 前，將 687 個 canonical nodes 的人工核可 celestial classification 與既有 stable layout／slim topology 組成 deterministic Renderer v2 scene input，建立明確、版本化、major mismatch fail-fast 的 adapter contract；不修改 canonical graph、layout locks、production routes 或建立 `app-v2.html`。

## 驗收條件

- [ ] `config/atlas/celestial-lock.json` 覆蓋全部 687 canonical node ids，通過既有 schema／source validator，12 domain anchors 與 MAT／PHY nuclei 明確保留。
- [ ] lock 的 archetype、magnitude、layout mass、label priority 與 Renderer v2 normalized scene 的 mapping 版本化且有測試；不以 renderer 的 unknown fallback 作為 canonical output。
- [ ] canonical scene builder 只讀 `data/all_nodes.json`、`config/atlas/domain-anchors.json`、`config/atlas/layout/main.json`、`celestial-lock.json` 與 approved topology input；不讀 Wonder layout 取代 Main layout。
- [ ] builder 產出 687 nodes、3,138 active pairs，schema／layout／renderer contract version 明確；相同 source 產出 byte/hash stable scene。
- [ ] 修改純 visual token 不改 scene layout hash；修改 node id、layout lock、classification 或 active topology 會使對應 fingerprint／scene hash 改變。
- [ ] 任一 canonical node 缺 lock、lock 有未知 major version、layout 缺 entry、edge 端點不存在或 lock／renderer enum 不相容時 fail-fast；不得靜默 fallback。
- [ ] `config/atlas/layout/main.json`、19 Wonder locks、`data/*.json`、production routes 與 `frontend/src/engine-v2/` renderer core 不被改寫；WP6 不在本包建立。
- [ ] Atlas／Renderer／全站 regression 與 deterministic tests 通過；完成後在 brief 填完整 HANDOFF，保留與 WP6 一起審查的狀態。

## 邊界（不要動的東西）

- 不建立 `frontend/app-v2.html`，不改 `app.html`、`app-main.js`、Wonders、Explorer 或 production route。
- 不修改 `data/all_nodes.json`、`data/i18n/*.json`、`data/wonders/*.json`、stable layout、19 Wonder locks、Atlas coordinates／roads。
- 不把 classification proposal 自動當成核可 lock；lock 必須保留 deterministic provenance／reason，並由本包驗證。
- 不改 Renderer v2 core semantics；adapter／builder 放在 Atlas tooling 或獨立 scene input 模組。
- 不新增 dependency、不部署、不 push。

## Questions（實作層填：卡住或需要決策時）

- 初始 adapter mapping 暫定：`landmark → nucleus`、`faint|standard|bright → 同名 renderer magnitude`；archetype 與 label priority 同名映射；`layoutMassClass` 僅作 build-time classification／audit input，不注入 renderer node。
- 需確認跨模型審查時，是否接受 deterministic proposal 作為 687-node lock 的初始人工核可基線；任何人工 override 必須列入 lock reason 與 test fixture。

## HANDOFF（實作層完成或卡住後填）

- Branch: `codex/graph-atlas-integration`
- Summary: 已以 deterministic proposal seed `config/atlas/celestial-lock.json`（687 nodes）建立 explicit lock→Renderer v2 adapter 與 canonical Main scene builder；不建立 app-v2、不改 production routes。
- Verification: `npm run atlas:scene` PASS（687 nodes／3138 edges，scene hash `09fb8f3c`）；`npm run atlas:validate` PASS；`npm run atlas:layout:check` PASS（19 wonders／0 overlap）；`npm run test:atlas` 49/49；`npm run test:renderer-v2` 15/15。
- Remaining risks: proposal seed 尚需與 WP6 一起做跨模型 adversarial review；目前尚未完成完整 `npm run verify` 與 manual Main v2 browser QA；未 push。

## Review（審查層填；與 RG-A 一起於 WP6 完成後觸發）

- Reviewer:
- 模式: ③對抗驗證
- 觸發原因: 長期 presentation contract／classification lock／renderer adapter
- Verdict:
- Findings:
  -

## 裁決（凜空）

- 決定: 先完成 RG-A 本機 commit；WP5.5 開始實作，與 WP6 完成後合併審查，不 push。
- 日期: 2026-07-15
