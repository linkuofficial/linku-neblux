# TASK: graph-atlas-review-fixes
狀態: done
建立: 2026-07-12 ｜ 秘書層: Fable 5 ｜ 實作層: 待指派（建議：文件修訂由 Codex〔原作者〕執行、Fable 複核；spike 任一模型皆可）
Repo: Neblux
Base: master working-tree（7 份未追蹤 GRAPH-ATLAS planning docs）
Required verification: 文件結構檢查＋跨文件斷言重跑＋`python scripts/check_simplified.py`；spike 產出 PNG 由凜空實看
風險等級: 高(強制交叉)——延續 Graph Atlas planning 的交叉審查鏈；本輪產出將直接約束未來禁區實作

## 背景

2026-07-12 Fable 5 依 `docs/GRAPH-ATLAS-FABLE-REVIEW.md` packet 完成交叉審查：**Verdict = fix-needed；0×P0、4×P1、7×P2**。所有 P1 集中在「契約自稱精確、卻與 repo 實況不符」的縫隙，全部可用文件修訂＋一次 throwaway spike 關閉，無需改碼、無方向換軌。findings 全文見本檔 F0 要求附錄之處。

本 brief 把 findings 轉成可執行修訂計畫。完成後 Graph Atlas 規劃達 ready-for-implementation 門檻（剩 WP0 既有裁決：落地頁方向、12/13 domains 對帳）。

## 目標

1. **Part 1 — Layout feasibility spike**：在任何 WP1 schema 投資之前，用最便宜方式驗證整案唯一「不成立就換軌」的假設：雙核心＋12 domain anchors 的 anchored layout 在 687 nodes 下可讀、不成毛球。
2. **Part 2 — 文件修訂**：關閉 4×P1＋7×P2（F0–F11），六份 GRAPH-ATLAS 文件與 repo 實況對齊。
3. 產出裁決點 D1–D6 供凜空定案（各附建議值，預設採建議值即可開工）。

## Part 1 — Layout Feasibility Spike（1–2 天硬上限；與 Part 2 可並行）

- 腳本與產物放 scratchpad／暫存目錄，**不入 repo**；唯讀引用 `data/all_nodes.json` 與 `frontend/src/engine/layout.js`，不改任何檔。
- 做法：
  1. 讀 687 nodes＋3,138 條 active 去重邊（無序 pair 去重、排除 `pending`）。
  2. 硬鎖 `mathematics_field`／`physics_field` 於雙核位（起始值如 ±260,0），12 個 domain anchor（MAT PHY CHE BIO MED ENG TEC SOC HUM PHI ART HIS 對應 `*_field`）按 PLAN §5.4 方位固定。
  3. 其餘節點以 domain barycenter 初始化＋constrained d3-force relaxation（可改造現有 bakeLayout）。
  4. 輸出遠／中／近三張 PNG。
- 人工判讀清單（凜空親看）：
  - 中央雙核之間與周邊是否毛球化？
  - 12 個 domain 臂區是否可辨？
  - 跨域 bridge 抽查：`fourier_analysis_concept`（MAT/PHY/ENG/TEC）、`control_theory_concept`（ENG/MAT/TEC/BIO）落點是否語意合理？
  - `medicine_field`（deg 105，全圖最高）是否吞掉一整區？
- 附帶量測（給後續 WP 當先驗，不作裁決依據）：
  - Light／Quantum「steps＋一圈鄰居候選」組 12–30 節點集合，估算 core＋locale bundle 體積（驗 150KB 未壓縮預算）。
  - 1,000 nodes／7,000 edges 合成資料在**現有** renderer 的 FPS 粗測（WP5 Canvas 2D 假設先驗）。
- 結果寫回本 brief HANDOFF：**go**（繼續既定路線）或 **no-go**（停下改佈局策略——anchor 方位／質量分級——再重跑 spike，不進 WP1）。

## Part 2 — 文件修訂（逐 finding 對應）

### F0 — 審查結果歸檔
- 在 `GRAPH-ATLAS-FABLE-REVIEW.md` 末尾附錄本輪審查輸出（Verdict＋11 findings＋survived assumptions＋vertical slice），狀態改為 REVIEW COMPLETE 2026-07-12。packet 本體不改寫（歷史快照）。

### F1（P1）tour-index 納入衍生資料契約
- `GRAPH-ATLAS-DATA-CONTRACT.md` §5 新增小節：v2 artifact `/data/atlas/constellation-index.json`，沿用現行 `tour-index.json` 形狀 `{tours, nodes, related}` 加 `schemaVersion`。承載三個現行功能的資料：主圖星座層（tour→steps 序）、節點卡「第 N 站」（node→(tour, step)）、Wonder 結尾「下一趟」（related＋via＋weight）。
- 明定兩種 membership 語意**並存且不同**：constellation-index＝guided spine（僅 steps，含 step 序）；portal-index＝cluster membership（steps ∪ context_refs）。
- 並行期規則：v1 `/data/tour-index.json` 照舊產出不動；WP10 cutover 才退場（alias 保留一個 release window）。
- 同步：`GRAPH-ATLAS-PLAN.md` §12.2 輸出清單補列；`ROADMAP` WP3 補 builder（沿用 `scripts/build_tour_index.mjs` 邏輯＋版本化）、WP6 parity 註明 constellation focus／node card 站數之資料源、WP10 補退場步驟。

### F2（P1）edge／relation 模型對齊實際 schema
- CONTRACT §3.1 補 `connections[]` 子欄位精確定義：`target`；`relation_type` ∈ {applied, logical, conceptual, historical, causal}（實測分佈 1167/1171/516/385/142）；`relation`（自由文句，僅展示用）；`directed?`、`learning_prerequisite?`、`parallel_development?`、`pending?` booleans。
- 明定兩層模型：3,381 筆 directional semantic records 保留 metadata；layout 才投影為 3,159 無序 pairs。222 個雙側 pairs 的 metadata 差異合法，validator 只拒絕完全相同重複記錄、非法 target／enum／型別，不得把 metadata 差異判 fail。
- pending 政策（D5）：pending 邊保留於 Main topology 並沿用現行 pending 樣式；**排除**於 layout solve、weighted degree、bundles、roads evidence、related 權重、cluster edges。
- prerequisite 推導（D4）：`learning_prerequisite=true` → 邊視覺歸 prerequisite family、參與 prerequisite 功能；weighted degree 取 1.00 覆蓋，否則依 relation_type 表（§6.4 表頭同步改為五值＋flag）。
- `directed` 顯示依欄位；`parallel_development` v2.0 無專屬視覺，僅進 focus 資訊面。
- 基線數字修正（PLAN §2、§8.1）：active 去重 3,138＋pending 21（合計 3,159）；max degree **105**（`medicine_field`，含 pending 亦 105）；「6–8 節點子圖」→「6–7 steps」。
- `GRAPH-ATLAS-VISUAL-SYSTEM.md` §7 註明 prerequisite 行適用於 flagged edges。

### F3（P1）Wonder cluster edges 與 `wonders[].edges` 定位
- （D2）`wonders[].edges`＝人工策展 spine／constellation 骨幹，繼續作為主圖星座層與 cluster spine 視覺的 source of truth；cluster explore 其餘邊＝canonicalMembers 上的 induced active subgraph（去重、排 pending），build 衍生、不回寫。
- CONTRACT §3.2 補 `wonders[].edges` 欄位定義＋validator（端點 ∈ canonicalMembers ∪ localMembers）；§5.6 core 範例拆 `spineEdges`（authored）與 `graphEdges`（derived）並附推導規則；induced 邊 >150 條時 build 警告要求重審主題範圍。
- PLAN §10 補對應規則行。

### F4（P1）spike 前移進 critical path
- ROADMAP §1 插入「WP0.5 Layout Feasibility Spike」：與 WP0 並行、為 WP1 gate 前置條件；內容即本 brief Part 1；標明 throwaway——不建 schema、不寫 lock、產物不入 repo。

### F5（P2）Depth publication 詞彙單一化
- （D3）manifest 狀態機由 neblux-depth 治理文件持有：`status` 合法值為 candidate/draft/review/live/blocked，`review_status` 合法值依既有 validator。Atlas 公開判準＝`public===true && status==="live" && review_status==="published" && depth_path 存在 && qa 四鍵（csp_safe, reference_notes, formula_walkthrough, mobile_canvas_check）全 true`。
- CONTRACT §3.3 引用完整判準；`locales` 標為未來 optional 欄位，缺省視為 `['zh']`。
- 需同步在 `neblux-depth/PLAN.md` 補一行狀態機定義（該檔為 Depth 治理權威；只加不改既有裁決）。

### F6（P2）locale 詞彙統一
- CONTRACT 明定內部 locale key ＝ {en, zh, ja}（與 `data/i18n/*.json`、sidecar 命名、`localStorage['neblux-lang']` 一致）＋對外 hreflang 對映表（en→en、zh→zh-Hant、ja→ja）；§5.3 範例 `"zh-Hant"` → `"zh"`。

### F7（P2）resting／twinkle 定義一致
- （D6）定義 resting＝無輸入且無 one-shot 動畫 5 秒後**整幀凍結**（twinkle 暫停，互動即喚醒）；reduced-motion 時 twinkle 恆關不變。PLAN §14、VISUAL §10、ROADMAP §15（resting redraw count 目標＝0）三處引用同一定義。

### F8（P2）parity hooks 補列
- PLAN §16.1、ROADMAP §2.1／WP7 補列 `__nebluxWonders`（由 wonders-main.js 暴露，現由 `tests/e2e/wonders.spec.ts` 使用）。

### F9（P2）layout debt 擁擠指標＋escalation
- CONTRACT §6.6 增 metrics：k-NN 局部密度 p95 對 baseline、最小間距違反計數（overlapCount）。
- §6.1 補 escalation：同一區域 local solve 連續兩次超 movement budget → debt report 直接 `recommendMigration:true`；維持 fail-strict，不自動擴大解鎖圈。

### F10（P2）文件對齊雜項
- PLAN §17 加 Phase↔WP 對映表（A↔WP0–1、B↔WP2–3、C↔WP4、D↔WP5–6、E↔WP7、F↔WP8、G↔WP9、cutover↔WP10、H↔WP10 後另案）。
- `layout-debt.json` 移出 §12.2 公開輸出清單，改為 build report（不進 dist）。

### F11（P2）bundling 降為 conditional＋engine-v2 起點明確化
- ROADMAP WP5：基準順序改為先測「無 bundling：遠景不畫邊＋中景 top-K bridges」是否達 1,000／7,000 預算；edge bundling 全鏈（build 幾何＋consumer）gated on 基準未達標才啟用。
- WP5 原則補：engine-v2 以 fork／演進現有 `frontend/src/engine/`（沿用 geometry/theme/sprites）起步，非空白重寫——收斂 pre-mortem Failure 4 的雙維護窗。

## 裁決點（凜空定案；未裁決前文件以「建議值＋標記待裁決」寫入）

| # | 事項 | 建議值 |
|---|---|---|
| D1 | tour-index 繼任者 | 新增 `/data/atlas/constellation-index.json`（沿現形狀＋版本化）；v1 檔並行至 WP10 |
| D2 | `wonders[].edges` 定位 | 保留為 authored 骨幹；explore 邊另由 induced active subgraph 衍生 |
| D3 | Depth 狀態機 | 依現有 validator；publication＝public ∧ status=live ∧ review_status=published ∧ path 存在 ∧ QA 四鍵全過 |
| D4 | prerequisite 權重 | flag=true → 1.00 覆蓋 relation_type 權重 |
| D5 | pending 邊 | topology 保留（pending 樣式）；其餘衍生產物全排除 |
| D6 | resting 定義 | idle 5s 整幀凍結；互動喚醒；reduced-motion 恆關 twinkle |

（W1 落地頁方向、W2 12/13 domains 對帳＝WP0 既有裁決，不在本 brief 重複處理。）

## 驗收條件

- [x] Spike：PNG×3＋判讀紀錄＋bundle 體積估算＋現有 renderer 1k/7k FPS 粗測寫入 HANDOFF；go／no-go 明確。
- [x] F0–F11 修訂全部落地，11 個 findings 逐項可對到修訂位置（附對照清單）。
- [x] 跨文件斷言重跑：22／22 通過（含 constellation-index、edge schema、Depth gate、resting、locale、hooks、WP0.5 與禁止全量逐幀）。
- [x] `python scripts/check_simplified.py`：0 ERROR（21 個既有 Taiwan-accepted review chars）。
- [x] 未動 `frontend/src/engine/`、`data/*.json`、`vite.config.ts`、`functions/`、`_headers`、production routes；未 commit／push（docs-only，不需 `npm run verify`）。

## 邊界（不要動的東西）

- 只改 `docs/GRAPH-ATLAS-*.md`（六份）、`neblux-depth/PLAN.md`（僅 F5 補一行狀態機定義）與本 brief。
- spike 腳本與 PNG 放 scratchpad，不入 repo、不裝新 dependency。
- 不實作 WP1+ 任何內容；不建 `config/atlas/`；不動禁區程式與資料。
- D1–D6 未經凜空裁決前，不得在文件中寫成「已定案」。

## Questions（實作層填：卡住或需要決策時）

- D1–D6 已依凜空「好，那開始執行」採用；其中 D3 依 repo validator 校正，D4 僅作用於 layout／priority，不摺疊 semantic records。
- Spike 工程判讀為 go；凜空仍需親看 PNG，若主觀空間感不成立，可在 WP1 前要求調整 anchors。

## HANDOFF（實作層完成或卡住後填）

- Branch: `master` working tree（未 commit／push）
- Summary:
  - WP0.5 layout route＝**GO**。687 nodes、3,138 active topology pairs；0 overlap；46 個單領域非 anchor 樣本之最近 anchor 命中率 1.00；中央半徑 220 內 136 nodes。
  - 跨域抽查：`fourier_analysis_concept=(-10.7, 208.5)`、`control_theory_concept=(59.0, 342.7)`；`medicine_field` 固定於 `(650,420)`，degree 105，未吞沒整體區域。
  - Edge length：median 235.4、p95 586.6、max 1268.1。far／mid 可讀；near 全邊形成毛球，故遠景無線、中景 top-K、近景局部篩選為必要 gate。
  - Light bundle 20 nodes／51 graph edges：core 12,643 B；core+locale 最大 98,760 B。Quantum 20 nodes／43 edges：core 11,081 B；最大 95,305 B；均低於 150 KB 未壓縮預算。
  - 現有 renderer 全量 1k／7k 粗測：headless software-rendered desktop draw avg 約 154.3 ms，mobile 約 8.8 ms。只證明「全量逐幀」不可採；WP5 必須在 viewport culling／LOD／idle freeze 後以真實 GPU 與中階手機重測。
  - F0–F11 已寫入 PLAN／CONTRACT／VISUAL／ROADMAP／FABLE review archive，Depth publication 規則同步至 `neblux-depth/PLAN.md`。
- Verification: 跨文件 assertions 22／22 PASS；`python scripts/check_simplified.py`＝0 ERROR；禁區檔案未變更；未執行 `npm run verify`（docs-only）。Spike artifacts：`test-results/graph-atlas-spike/{far,mid,near}.png`、`metrics.json`、`renderer-benchmark.json`（ignored scratchpad，不入 repo）。
- Remaining risks:
  - 凜空需親看三張 PNG；近景視覺只能在正式 edge LOD 原型後驗證。
  - Headless renderer 數據不是正式 FPS gate，尤其桌機軟體渲染受像素填充成本放大。
  - WP0 仍需裁決 landing 方向與完成 12／13 domain 歷史對帳；本 brief 不替代該決策。

## Review（審查層填；盡量用與實作層不同的模型家族）

- Reviewer:
- 模式:
- 觸發原因: 路徑觸發（本計畫約束未來禁區實作，延續強制交叉鏈）
- Verdict:
- Findings:
  -

## 裁決（凜空）

- 決定:
- 日期:
