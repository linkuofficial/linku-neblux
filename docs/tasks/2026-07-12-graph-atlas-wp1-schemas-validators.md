# TASK: graph-atlas-wp1-schemas-validators
狀態: done
建立: 2026-07-12 ｜ 秘書層: 待交叉審查 ｜ 實作層: Codex
Repo: Neblux
Base: master working-tree（WP0 與 Graph Atlas planning docs 未提交）
Required verification: `npm run test:atlas`＋`npm run atlas:validate`＋`npm run verify`
風險等級: 高(強制交叉)

## 目標

實作 Graph Atlas WP1 的 schema 與 fail-fast validators，先把已接受的 Data Contract 變成可執行守門，再進 layout toolchain。WP1 不建立正式 layout positions、不生成 production artifacts、不接 Vite build；所有工具先以獨立命令運作，對 canonical sources 唯讀。

## 建議檔案

```text
config/atlas/
  atlas-layout.schema.json
  domain-anchors.schema.json
  celestial-lock.schema.json
  layout.schema.json
scripts/atlas/
  contract.mjs
  validate-sources.mjs
  validate-config.mjs
  audit-domains.mjs
  audit-portals.mjs
  audit-artifacts.mjs
tests/atlas/
  validators.test.mjs
  fixtures/...
neblux-depth/
  depth-contract.mjs          # 新增，共用 publication truth
  validate-depth.mjs          # 只改為引用共用 contract
```

允許修改 `package.json`，只新增不掛入 production build 的 `atlas:validate` 與 `test:atlas` scripts。不得新增 dependency；validators 直接實作本契約需要的欄位／enum／cross-reference checks，不建立不完整的通用 JSON Schema engine。

## 驗收條件

- [x] 四份 schema 都有 `$schema`、`$id`、`schemaVersion` 約束、required fields、enum 與 `additionalProperties` policy。
- [x] Schema major version 不支援時 fail；同版未知欄位 fail；較高 minor 的未知欄位 warning＋exit 0。Schema 描述已知版本並使用 `additionalProperties:false`，forward compatibility 由 validator 的版本 envelope 處理。
- [x] `contract.mjs` 是 Atlas enums、required fields、normalization、version range 與 topology projection 的唯一程式真相；測試逐項比對四份 schema，防止雙契約漂移。
- [x] `validate-sources` 驗證 canonical node id 唯一、type／domain／connections 型別、target 存在、五值 `relation_type`、boolean flags 與 exact duplicate semantic record。
- [x] 同一 unordered pair 的雙向／不同 metadata records 合法；測試證明不會被誤判 duplicate。
- [x] Pending records 留在 semantic source，但 topology projection 排除 pending-only pairs；fixture 驗證規則而非硬編現況數字。
- [x] `projectTopology()` 由 `contract.mjs` 唯一實作並交接 WP2 import；semantic layer 保留 pending records，projection 將 active＋pending pair 視為 active、pending-only 排除。
- [x] Wonder validator 驗證 `steps[].ref`、local id collision、`edges[].source/target/relation_type`、cluster context／featured portal 子集；authored spine 不被當 induced graph。
- [x] Depth publication predicate 與 enums 抽到 `neblux-depth/depth-contract.mjs`；現行 `validate-depth.mjs` 與 Atlas validator import 同一實作。只有 `public:true && status:live && review_status:published && depth_path && QA四鍵` 才視為 publishable；WP1 未修改 manifest。
- [x] `audit-domains` 從 graph 產生排序後 inventory；WP1 只對 fixture anchor map 驗證 code set、anchor node 存在與 `type:field`，未知或缺 anchor 時非零退出，不自動猜 anchor。Fixture 包含不符合 `*_field` 命名的合法 anchor。
- [x] `audit-portals` 對 fixture 驗證 canonical memberships 與 routes；不生成正式 portal index。
- [x] `audit-artifacts` 只對 fixture 的 envelope 驗證 schema／layout／renderer contract version 與 reverse references；payload 欄位在 WP3 前維持 draft，且不要求 production artifact 目錄存在。
- [x] 所有 invalid fixtures 非零退出並提供精確 JSON path；validators 絕不寫 source files。
- [x] CLI I/O 固定：repo-relative forward-slash path；exit 0=pass（可有 warning）、1=validation、2=usage／I/O／parse；UTF-8 BOM 剝除；parse error 映射 line／column；warning 走 stderr；errors 以 file＋自然 JSON path＋message 排序；LF 換行。
- [x] CLI source inputs 僅允許 `data/all_nodes.json`、`data/wonders/*.json`、`neblux-depth/depth_manifest.json`；禁止讀 `frontend/public/data`、`dist`，除 stdout／stderr 外零寫入。
- [x] `test:atlas` 固定使用 Node 內建 runner：`node --test tests/atlas/validators.test.mjs`（Node 在 Windows 不把目錄自動展開為測試檔）；Node 下限沿用現有 `package.json` 的 `>=22`，不新增 runner dependency。
- [x] `npm run test:atlas`、`npm run atlas:validate`、`npm run verify` 全過。

## 邊界（不要動的東西）

- 不修改 `data/*.json`、`data/wonders/*.json` 或 `neblux-depth/depth_manifest.json`。
- 不修改 `frontend/src/engine/`、app／wonders runtime、production HTML routes。
- 不修改 `vite.config.ts`、`frontend/public/data/`、`dist/`、`functions/`、`_headers` 或部署設定。
- 不建立正式 `atlas-layout.json`、`domain-anchors.json`、`celestial-lock.json`、`layout/main.json`；WP1 只有 schemas、validators、fixtures。
- 不執行 solver、不寫 layout locks、不生成 bundles／indices。
- 不新增 npm dependency，不 commit／push，除非凜空另行明確要求。

## 實作決策

1. `connections[]` 分 semantic records 與 topology projection，不能以一個去重陣列服務所有 consumer。
2. Exact duplicate key 包含 source、target、relation_type、relation、directed、learning_prerequisite、parallel_development、pending。Canonical form：source 從父 node id 衍生；四個 boolean 缺席一律正規化為 `false`；`relation` 必須是 trim 後非空 string，缺席／null／空字串直接 fail，不參與模糊等價。只有 canonical 八欄全同才 fail。
3. JSON Schema 負責單檔形狀，MJS validators 負責跨檔 references、版本相容、publication predicate 與 topology projection。
4. 錯誤輸出格式固定為 repo-relative `file:json.path: message`，不輸出 Windows drive colon；單次執行聚合可行的全部 deterministic errors 後退出。
5. 實際 source validation 不把現況統計值硬編成 schema；687／12 domains 等由 audit report 比對 WP0 gate。
6. Canonical connection self-loop fail；connection 不接受 explicit `source`，來源永遠是父 node。`canonicalMembers = steps[].ref ∪ cluster.context_refs`；`localMembers = steps[].local`，local id 在單一 Wonder 內唯一且不得撞 canonical id。
7. `atlas:validate` 只跑 real canonical／Wonder／Depth source validation＋schema-contract 自檢；`validate-config` 與三個 audits 在 WP1 只由 `test:atlas` 對 fixtures 執行。所有工具接受顯式路徑，禁止為了餵工具建立正式 config instances。
8. 若正確 validator 發現真實 canonical 違規，禁止弱化規則或在 WP1 改 data；交付 fixtures 綠＋deterministic 違規清單並另開 data-fix brief。現況預審：3,381 records 的 relation／四 boolean 全存在、0 self-loop、0 normalized exact duplicates。

## Questions（實作層填：卡住或需要決策時）

- 無。若交叉審查要求引入 Ajv 或改正式 config 形狀，視為 dependency／architecture 擴張，回交凜空裁決，不在實作層自行採用。

## HANDOFF（實作層完成或卡住後填）

- Branch: `master` working tree（未 commit／push）
- Summary:
  - 新增四份 Atlas JSON schemas、共享 `contract.mjs`、real-source validator、config validator 與三個 fixture-scoped audits。
  - Exact duplicate 採 canonical 八欄；四個 absent booleans 正規化為 false，`relation` 嚴格要求非空 string。真實 3,381 records 為 0 duplicate／0 self-loop。
  - `projectTopology()` 唯一投影得到 3,138 active pairs；雙向 semantic records 保留，pending-only pairs 排除。
  - Depth enums／publication predicate 抽成共享 module，既有 Depth validator 與 Atlas 共用同一真相。
  - 新增 13 項 Node tests，涵蓋 schema drift、minor／major 版本、BOM／parse、自然排序、Wonder／portal／domain／artifact 與 source whitelist。
- Verification:
  - `npm run test:atlas`：13／13 passed。
  - `npm run atlas:validate`：PASS（687 nodes、3,381 records、3,138 active pairs、4 schemas）。
  - `node neblux-depth/validate-depth.mjs`：94 checks passed，4 entries。
  - `python scripts/check_simplified.py`：0 ERROR。
  - `npm run verify`：build passed＋57 E2E passed。
  - `git diff --check`：PASS；port 3000 cleanup confirmed。
- Remaining risks:
  - WP1 刻意沒有正式 config instances；WP2 建立 locks／anchors 時必須沿用本契約並 import `projectTopology()`，不能複製實作。
  - 無 Ajv；schema 與手寫 enforcement 以一致性測試防漂移。若未來 schema 複雜度超出明確 validator 能力，再另案評估 dependency。
  - `audit-artifacts` 目前只鎖 envelope；payload 必須在 WP3 定稿，不可把 fixture 當 production schema。

## Review（審查層填；盡量用與實作層不同的模型家族）

- Reviewer: Claude Fable 5（使用者轉交 mobile packet）
- 模式: ③對抗驗證
- 觸發原因: 路徑觸發（schema／validator 將約束未來 `data/*.json` 與 engine 消費契約）
- Verdict: fix-needed（P0×0／P1×6／P2×6；全數採納後進場）
- Findings:
  - P1：exact duplicate canonical normalization 未定義；已固定 absent boolean→false、relation 嚴格非空 string。
  - P1：`additionalProperties` 與 minor forward compatibility 衝突；已採同版 strict／高 minor warning／高 major fail。
  - P1：schema JSON 與手寫 validator 可能漂移；已指定 `contract.mjs` 唯一程式真相＋一致性測試。
  - P1：WP1 沒有正式 config instance；已把 atlas:validate 限於 real sources＋schema self-check，config／audits 只跑 fixtures。
  - P1：真實資料若違規缺出口；已規定另開 data-fix brief，禁止弱化 validator 或越界改 data。
  - P1：CLI I/O、Windows path、BOM、parse、排序、exit code 未定；已完整固定。
  - P2：`projectTopology()` 改由 contract 唯一實作並交接 WP2。
  - P2：補 canonical self-loop、source 衍生、Wonder member/local uniqueness。
  - P2：source input 白名單化，禁止 public／dist 副本及任何寫入。
  - P2：Depth publication 改共用 `neblux-depth/depth-contract.mjs`，避免第三份契約。
  - P2：artifact audit 降為 envelope-only，payload 留 WP3。
  - P2：test runner 固定 Node `node:test`（明列測試檔以相容 Windows），沿用 Node >=22。

## 裁決（凜空）

- 決定: 接受 WP1 schema／validators 現行實作並關閉工作包；review findings 已全數處理，2026-07-14 baseline 重驗為 Atlas tests 30／30、real-source validation PASS。此裁決不授權 WP3 production build integration。
- 日期: 2026-07-14
