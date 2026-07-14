# TASK: graph-atlas-wp3-bundles-indices
狀態: done
建立: 2026-07-14 ｜ 秘書層: Codex Luna（baseline audit＋凜空核可計畫） ｜ 實作層: Codex Luna
Repo: Neblux
Base: `8db0092`（branch `codex/graph-atlas-wp3`；既有 checkpoint 同時含 Atlas／Depth／Quant）
Required verification: `npm run atlas:build-data`＋`npm run atlas:audit-data`＋determinism hash comparison＋`npm run test:atlas`＋`npm run atlas:validate`＋`npm run atlas:layout:check`＋`node neblux-depth/validate-depth.mjs`＋`npm run verify`
風險等級: 高(強制交叉)——新增未來 Atlas／Main／Wonder／Depth consumers 的長期資料邊界與生成管線；本包不接 Vite／production

## 目標

建立 Graph Atlas WP3 的 static-first 資料層：以 standalone、deterministic、可稽核的 generators 產生 Wonder core／locale bundles、Portal、Depth、Constellation indices，並完成 Atlas index 的 schema／fixture／generator 能力。現行 legacy runtime、Vite build 與 v1 `tour-index.json` 保持不變。

## 驗收條件

- [x] 19 個真實 Wonder 各產生一份 core＋en／zh／ja sidecars；source 未授權擴張時忠實保留現有 membership，不自動補到 12–30 nodes。
- [x] Wonder core 只含 canonical identity、type／domain、WP2 locked positions、roles／step、authored spine edges與 active induced graph edges；pending-only relations排除。
- [x] fixture證明 generator／schema可承載 12–30 node cluster；`graphEdges > 150`只產 deterministic warning，不裁切 source。
- [x] Portal index destinations 全部可 round-trip；Main destination 隱含，只有額外 Wonder／Depth destinations 的 node 需要 entry。
- [x] Depth index 唯一使用 `neblux-depth/depth-contract.mjs` publication predicate；未發布、非 live、非 published、缺 path 或 QA 不完整者皆不輸出且 stale artifact 被清除。
- [x] Constellation index 沿用 v1 tour-index guided tours／nodes／related 語意並加入版本 envelope；v1 artifact與 consumers 零變更。
- [x] Atlas index 完成 schema／fixture／generator；真實 `config/atlas/atlas-layout.json` 缺席時明確拒絕，不生成 placeholder。真實 config／index／preview延至 WP4。
- [x] `atlas:build-data`先寫 staging、audit全過後才替換 `frontend/public/data/atlas/`；失敗保留上一份有效輸出。
- [x] 相同 sources 連續兩次生成的檔案集合與 SHA-256 完全一致；不輸出 timestamp／build id。
- [x] generators 只讀 canonical source／tracked config，不反讀 public／dist，不修改 `data/*.json` 或 layout locks。
- [x] 完整 Atlas／Depth／build／E2E regression 全綠，工作樹除 gitignored artifacts 外乾淨。
- [x] 跨家族審查完成，findings 修正或交凜空裁決，HANDOFF 填妥。

## 邊界（不要動的東西）

- 不修改 `frontend/src/engine/`、四個 production entry、app／wonders／explorer runtime 或既有 E2E hooks。
- 不修改 `vite.config.ts`、`npm run build` 接線、Cloudflare／`functions/`／`_headers` 或 production feature flags。
- 不修改 `data/*.json` source 結構或內容，不 author Wonder context／roads／Depth publication／celestial classification。
- 不建立真實 Atlas presentation config、preview assets 或 `/data/atlas/index.json`；這些依賴 WP4 視覺核可。
- 不新增 production dependency，不 commit／push／PR，除非凜空另行明示。

## Questions（實作層填：卡住或需要決策時）

- 已裁決：WP3採能力先行，真實 Atlas presentation instance延至 WP4；缺 config必須明確失敗，不生成假座標或 placeholder index。
- 已裁決：真實 Wonder bundle不為達 12–30 node目標而擴張；只用 fixture驗證容量，context authoring留 WP7。
- 已裁決：沿用完整 `8db0092` mixed checkpoint，不整理歷史；本 brief清楚記錄 branch並非純 Atlas commits。

## HANDOFF（實作層完成或卡住後填）

- Branch: `codex/graph-atlas-wp3`
- Summary: WP3 standalone artifact contracts／schema／fixtures／generators／audit 已實作；產出 19 個 Wonder core＋三語 sidecars，以及 Portal／Depth／Constellation indices，共 79 檔。Atlas presentation index 只提供 fixture builder；真實 config 缺席時明確拒絕。Follow-up 修正 atomic directory swap：首段 rename 被鎖時不再誤刪上一份有效 target，第二段 rename 失敗會復原 backup，Windows 鎖檔錯誤提供可操作提示。尚未接 Vite／runtime／production。
- Verification: `atlas:build-data` 79 files PASS；`atlas:audit-data` 79 files PASS；Atlas tests 44／44（含兩條 directory-lock rollback regression）；兩次 generation SHA-256 完全一致；`atlas:validate` 687 nodes／3381 records／3138 active pairs／4 source schemas；layout check 687 nodes／19 Wonders／0 overlap；Depth 126 checks／4 entries；`npm run verify` build＋Depth 4／4＋E2E 72／72；繁簡 0 ERROR／21 REVIEW。
- Remaining risks: WP3 artifacts 仍是 gitignored standalone output，production 未消費；真實 Atlas presentation config／preview、Wonder context authoring、runtime failure UX 與 Network「不請求 all_nodes」須分別在 WP4／WP7／runtime integration 驗證。若 Windows 鎖檔同時阻止 rollback，工具會保留並回報 backup 路徑，仍需人工停止占用程序後復原。

## Review（審查層填；盡量用與實作層不同的模型家族）

- Reviewer: Claude Opus 4.8（headless `claude -p`，與實作層 Codex 不同家族；反向 cross-fire，2026-07-14）
- 模式: ②測試互寫＋③對抗驗證
- 觸發原因: Atlas artifact contracts／generators 將成為後續 WP4–WP10 consumer 邊界
- Verdict: **approve（WP3 standalone scope）**——未發現當前正確性阻斷；F1–F3 為前瞻性風險，非本包 fix-needed。
- 已執行的驗證: `npm run test:atlas` 40／40 綠（determinism／20-node capacity／pending 排除／Depth-Portal 共用 predicate／Constellation=v1 等值／Atlas-refuses-config）；客觀邊界查核：`.gitignore:17` 忽略整個 `frontend/public/data/`，`package.json` 的 `build`／`verify` 都未呼叫 `atlas:build-data`／`build-index`。
- 邊界結論（高信心）: 未越界。新增檔全在 `scripts/atlas`／`tests/atlas`／`config/atlas`／`docs`；未動 engine、四入口、`vite.config.ts`、`build`／`verify`、`functions`／`_headers`、`data/*.json`。artifacts 走 gitignored 目錄且無 build 步驟生成，Cloudflare 乾淨 checkout 不挾帶到 dist。
- Findings:
  - **F1〔中信心〕** local-only 節點的 type／domain 契約缺口：`buildWonderArtifacts` 對「非 canonical、只有 `step.local`」的節點讀不到 `type`／`domain`（`compactObject` 丟 type、domain 變 `[]`）→ `validateWonderCore` 報 issue → audit/build-data fail-loud（非靜默壞資料）。目前真實資料不觸發（現行「local」為 canonical 節點再標記，`graphById` 命中帶 type/domain）。風險落在 **WP7**：若引入真正只有 label 的在地節點，會與 wonderNode schema（強制 type＋非空 domain）衝突而硬失敗。建議 WP7 前補一個 label-only local fixture 釘住預期。
  - **F2〔高信心〕** `audit-data` 的 `expectedArtifactPaths` 只列現行 79 檔，與未來 `build-index` 輸出的 `index.json` 同目錄；WP4 一旦讓 `build-index` 寫入同目錄，`audit-data` 會誤報 stale，且 `build-data` 整目錄替換會把它刪掉。現在無影響（config 缺席、index 屬 WP4）。建議 WP4 接 index 時併入白名單或分目錄。
  - **F3〔中信心、低嚴重〕** `replaceDirectory` 的雙 `rename` 在 Windows 受檔案鎖影響：若 `npm run dev` 正服務 `frontend/public/data/atlas`（或防毒握 handle），rename 失敗；rollback 二次失敗會拋 `AggregateError` 並留 `*.backup-*`。屬 AGENTS.md 標記的 Windows 環境風險面。建議註記「跑 build-data 前先停 dev server」，或 staging/backup 落在 dev 不服務的 sibling 目錄。
- 獨立寫的驗收測試: out-of-repo runner 被審查方 sandbox 權限擋下未落地，改以 diff 靜態推證三條（更嚴版 determinism：兩個獨立 temp 目錄各跑一次比對 SHA-256；capacity 上界 30：435 edges 只 1 warning 不裁切；local-only node 觀測：確認硬失敗而非靜默產壞 artifact，見 F1）。
- 方向性分歧: 無，不需升級模式⑤。
- 信心來源: 逐條標明於上；非「零疑慮」，F1–F3 為記錄在案的殘餘風險，交凜空裁決是否納入 WP4／WP7 驗收條件。

## 裁決（凜空）

- 決定: 核可 baseline 收斂與 WP3 standalone plan；不含 Vite integration、Atlas UI、engine v2 或 production cutover。
- 日期: 2026-07-14

## 收斂補充（2026-07-14）

- 狀態補充：WP3 standalone 已完成並通過跨家族審查；本補充 supersede HANDOFF 中較早的 review／待審描述。
- F1 已處理：local-only member 若缺 canonical type 或非空 domain，generator 現在明確 fail-loud；`tests/atlas/artifacts.test.mjs` 有回歸測試。
- F2 已處理：`index.json` 是 optional companion artifact；audit 會驗證它，`build-data` atomic swap 會保留它，並測試 stale artifact 清除。
- F3 已修正與文件化：directory swap 依實際完成階段 rollback，不再於第一段 rename 失敗時刪除舊 target；`EPERM`／`EBUSY`／`EACCES` 提供停止 dev server 的操作提示，兩種鎖檔時機皆有回歸測試。
- F4 已處理：artifact schema 明示目前由 `audit-data.mjs` 與 `artifact-contract.mjs` 執行 build-time enforcement，未宣稱已有 JSON Schema compiler。
- F5 已文件化：Atlas artifacts 位於 gitignored public root；本機先生成後執行 Vite build 時，未引用 JSON 可能被複製進 dist，但 production 尚未消費這些 artifacts。
- 最終驗證：WP3 artifact tests 14／14、Atlas 全套 44／44；產物 build／audit、source／layout、Depth、全站 `npm run verify` 與繁簡檢查全過，詳見 HANDOFF Verification。
- 仍不屬於 WP3：Vite／runtime integration、Atlas UI、Renderer v2、Wonder context authoring、production cutover。
