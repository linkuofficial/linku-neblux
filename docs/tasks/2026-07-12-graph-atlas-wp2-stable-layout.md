# TASK: graph-atlas-wp2-stable-layout
狀態: done
建立: 2026-07-12 ｜ 秘書層: Graph Atlas accepted plan＋Fable 5 pre-mortem ｜ 實作層: Codex
Repo: Neblux
Base: master working-tree（WP0–WP1 未提交）
Required verification: `npm run test:atlas`＋`npm run atlas:validate`＋layout CLI gates＋`npm run verify`
風險等級: 高(強制交叉)

## 目標

完成 Graph Atlas WP2 Stable Layout Toolchain：以版本化、byte-stable 的 Main／Wonder layout locks 取代未來 v2 的全域自由重排，提供只讀 check、explicit initial bake、local node addition、Wonder 單團 bake、layout diff、debt report 與 celestial proposal。現行 runtime／Vite bake 完全不切換，WP2 只建立可審查的 v2 地基。

## 交付範圍

```text
config/atlas/
  domain-anchors.json
  layout/main.json
  layout/wonders/*.json
scripts/atlas/layout/
  policy.mjs
  bake-main.mjs
  add-node.mjs
  bake-wonder.mjs
  check-layout.mjs
  diff-layout.mjs
  report-layout-debt.mjs
  classify-celestial.mjs
tests/atlas/layout.test.mjs
```

允許修改 `package.json` 增加獨立 Atlas layout scripts；不掛入 `npm run build`。

## 演算法與狀態契約

1. `domain-anchors.json` 明列 12 anchors；MAT／PHY 固定在 `(-260,0)`／`(260,0)` 並標為 nuclei，其餘十領域為 hard domain cores。不得依 `*_field` 猜測。
2. `atlas:layout:init --write` 是 WP2 唯一一次全圖初始化；layout 已存在時拒絕覆寫，除非未來另案 `layout:migrate`。沒有 `--write` 只輸出 proposal／摘要。
3. 初始 Main bake 使用 WP1 `projectTopology()` 的 3,138 active pairs、固定亂數種子、固定 tick 數、固定排序與兩位小數；anchors `fx/fy` 不動。
4. `layout/main.json` 完整覆蓋 canonical nodes。Anchors＝`hard`；其餘＝`soft`＋固定 radius。Node-set fingerprint 只含 ids；layout-input fingerprint 另含 `[id, sorted domains, type]`。兩者皆不含文案、relation prose 或 Depth。
5. `atlas:layout:add --node <id> [--write]` 只接受「graph 中存在但 layout 尚缺」的 node；有鄰居時初始位置為 `(0.55 domain-anchor barycenter＋0.35 active-neighbour centroid) / 0.90`，再加 0.10 deterministic id jitter offset；無鄰居時為 anchor＋jitter offset。鄰居只來自 `projectTopology()` active unordered pairs。只允許新 node 與一圈 soft neighbors 求解；hard anchors 不動，舊 soft nodes 被限制在原 lock radius；`new` 僅存在 proposal，落盤前轉為 `soft`。
6. `atlas:layout:wonder --id <id> [--write]` 只讀指定 Wonder，spine 依 step 順序 deterministic 佈置。Step 結構變更預設 fail，人工核可後以 `--accept-spine-reflow` 單團重排並 bump patch version。含 context 的 Wonder 目前 hard-fail，待 WP7 centroid-aware 演算法與 fixtures 定案。只寫該 Wonder layout file。
7. 目前 19 份 Wonder layouts 只鎖現有 `steps` 成員；WP7 新增 `cluster.context_refs` 時由指定 Wonder CLI 更新，不預造內容。
8. `layout:check` 純讀：驗 schema、fingerprints、完整覆蓋、hard anchors、finite coordinates、重疊與 Wonder member coverage；任何缺 lock 非零退出。
9. `diff-layout` 純讀：hard movement 必須 0；至少 95% 舊 nodes normalized movement ≤0.02；任一舊 node >0.05 fail。輸出 deterministic JSON，不寫 report 檔。
10. `layout:debt` 純讀：以持久 `main-v1` baseline 比對 edge/node fingerprint、p95 normalized edge length、k-NN density p95、overlapCount 與逐域 centroid drift（blessed value＋0.10）；缺 baseline 時回報 `NO_BASELINE` 並非零退出，禁止 current-self-compare。只 stdout，不進 public／dist。
11. `classify:propose` 只 stdout 提案，不建立／覆寫 `celestial-lock.json`。`layout:migrate` 明確不在 WP2 授權範圍。

## 驗收條件

- [x] Main initial bake 連續兩次輸出 byte-identical proposal；687 nodes 完整覆蓋、12 hard anchors 零位移、0 overlap。
- [x] `layout/main.json` fingerprints 可重現；修改 label／description／relation prose／Depth 不改 hash，node set、domain、type 或 anchor config 改變會被對應 gate 偵測。
- [x] 真實 Main check 通過；relation-only fixture 不改任何 locked position。
- [x] Local add fixture 只移動 new node＋一圈 soft neighbors，hard anchors不動；95%／2% 與 max 5% movement gates可驗。
- [x] local solve 同區域連續兩次超 budget 時 debt `recommendMigration:true`，不擴大解鎖圈、不寫 lock。
- [x] 19 Wonder layout files完整覆蓋現有 steps／local members且 byte-stable。
- [x] 修改 Light fixture 的 hash／layout不改 Quantum；Depth 不參與任何 Main／Wonder fingerprint 或 solver input。
- [x] debt report deterministic，能對 edge-set 10%、node-set 5%、edge-length p95 +25%、overlap 與 density drift觸發建議而不自動遷移。
- [x] celestial proposal deterministic、尊重 12 explicit anchors，且沒有正式 lock 寫入。
- [x] CLI 無 `--write` 時零 repo writes；所有輸出路徑白名單在 `config/atlas/layout/`，禁止 public／dist／data。
- [x] `npm run test:atlas`、`npm run atlas:validate`、`npm run verify` 全過。

## 邊界（不要動的東西）

- 不修改 `frontend/src/engine/`、不新增 `engine-v2` runtime、不改 app／wonders imports。
- 不修改 `data/*.json`、Wonder source、Depth manifest 或既有 baked x/y。
- 不修改 `vite.config.ts`、production build、`frontend/public/data`、`dist`、functions、headers、routes 或 deployment。
- 不實作 WP3 bundles／indices，不建立 Atlas UI。
- 不執行或提供大範圍 `layout:migrate`；任何 anchor／major layout migration 另開 brief。
- 不新增 dependency，不 commit／push。

## Questions（實作層填：卡住或需要決策時）

- 無。WP0.5 已證明 anchored route GO；本包只把同一路線工程化，不變更產品架構。

## Post-review v1 blessing 決策（2026-07-12）

Fable 5 verdict＝fix-needed（P0×0／P1×6／P2×5），全數採納：

1. Local add 的位置部分改為 `(0.55A + 0.35C) / 0.90`，jitter 明定為 offset vector；無鄰居仍為 `A + jitterOffset`。
2. Local neighbors／links 只取 WP1 `projectTopology(records)` active pairs，pending-only 排除、雙向 records 只成一條 spring。
3. Main lock 新增 `layoutInputsFingerprint = hash([id, sorted domains, type])`；domain／type 改變時 check fail 並列出差異。
4. `new` 只存在 proposal；`--write` 前轉 `soft`。Persisted Main check 遇到 `new` fail，連續 add 會把前一節點當 soft neighbor。
5. Main／Wonder locks 補 `rendererContractVersion`、`solverVersion`、`algorithmParamsHash`、`toolchain`，並納入正式 schema／check；solver 參數集中成單一 constants object。
6. 建立 `config/atlas/layout-baselines/main-v1.json`。Debt 預設讀 baseline；缺檔＝`NO_BASELINE`＋非零退出，不再 current-self-compare。
7. Baseline／gate 記錄收斂遙測、Main SHA、relation／input fingerprints、逐域 centroid drift 與人工 preview 裁決。未授權 commit，因此只落檔；commit 仍需凜空明示。
8. Wonder step 結構變更預設 fail；只有顯式 `--accept-spine-reflow` 才允許該單團 hard reflow，並 bump Wonder layout patch version、保留完整 diff。
9. Wonder 含 `cluster.context_refs` 時目前 hard-fail；centroid-aware context placement 需於 WP7 前另行解鎖，不讓 deterministic ring 先成永久鎖。
10. 所有 lock write 改同目錄 temp＋fsync＋parse/schema check＋rename；拒絕 symlink 與 realpath 越界。
11. WP1 CLI 契約套用 WP2：usage=2、validation=1、成功=0；repo-relative forward slash 訊息、LF；Wonder id regex＋registry membership。

## HANDOFF（實作層完成或卡住後填）

- Branch: `codex/graph-atlas-wp2-v1`
- Summary:
  - 新增正式 12-domain anchors、687-node Main lock、19 份現行 Wonder locks與持久 `main-v1` baseline；Main lock 176,320 bytes，SHA-256 `0626729525b7139e1b23c490504160f7aa868fb7ff9cb8317f8260c0011049d5`。
  - Main bake 使用 WP1 active topology、固定 seed／ticks／排序與兩位小數；兩次獨立 proposal byte-identical。
  - 新增 initial bake、local add、single-Wonder bake、check、diff、debt 與 classification proposal CLI；所有 solver 都是 explicit command，未接 Vite／runtime。
  - 視覺 throwaway preview 已人工檢查：雙核心與 12 domains 可辨，Medicine 未吞沒版面；preview 不入 repo。
  - Fable 5 的 6 項 P1／5 項 P2 已全數修正；v1 blessing 紀錄見 `docs/gates/graph-atlas-layout-v1-2026-07-12.md`。
  - Baseline debt：edge change 0、overlap 0、density ratio 1、domain centroid drift 0.289237、`recommendMigration:false`。
- Verification:
  - `npm run test:atlas`：30／30 passed。
  - `npm run atlas:validate`：PASS（687 nodes、3,381 records、3,138 active pairs、4 schemas）。
  - `npm run atlas:layout:check`：PASS（687 nodes、19 Wonders、0 overlap）。
  - `atlas:layout:debt --local-solve-failures 2`：正確輸出 `recommendMigration:true`。
  - Depth validator：94 checks passed；繁簡檢查 0 ERROR。
  - `npm run verify`：build passed＋57 E2E passed。
- Remaining risks:
  - 本包尚未接 production runtime；正式畫面仍使用既有 bake，直到 WP5／WP6 cutover。
  - Main 初始 anchors 與力參數已通過 preview／數值 gate，但 WP5 真實 LOD 畫面仍可能要求 minor visual calibration；不得以此為由普通重排 locks。
  - Blessing commit 與 push 已由凜空明確授權；WP3 仍需另行授權。
  - WP3 仍未授權；Wonder context placement 必須等 WP7 centroid-aware 演算法與 fixtures，不能由 WP3 偷渡解鎖。

## Review（審查層填；盡量用與實作層不同的模型家族）

- Reviewer: Claude Fable 5（使用者轉交 mobile implementation packet）
- 模式: ③對抗驗證
- 觸發原因: stable locks 將成為未來 engine v2／build artifacts 的空間真相
- Verdict: fix-needed（P0×0／P1×6／P2×5；全數採納，進行 v1 blessing 收尾）
- Resolution: 11 findings 全數完成；30 條 Atlas tests、schema／layout／debt gates、最終視覺 preview 與 57 條 E2E 全綠。WP2 於 2026-07-12 關閉。
- Findings:
  - P1：local add 權重和 0.9 造成原點內縮。
  - P1：local add 繞過 active `projectTopology()`。
  - P1：domain／type 不在 lock input fingerprint。
  - P1：persisted `lock:new` 生命週期缺失。
  - P1：正式 locks 缺 solver／renderer／toolchain envelope 與完整 schema gate。
  - P1：debt current-self-baseline、無收斂與 blessing artifact。
  - P2：Wonder step reflow 缺可用流程；context ring 不應先落永久鎖。
  - P2：domain drift 應逐域對 baseline＋delta。
  - P2：非原子寫入。
  - P2：WP2 CLI 契約與 path／symlink 防護不足。

## 裁決（凜空）

- 決定: 授權開始 WP2；不含 layout migration 或 production cutover。
- 日期: 2026-07-12
