# Node Expansion Plan — Nodus

> 建立日期 2026-06-15。授權範圍：**Phase 0 + 1 + 2**（走通管線 → 建 ~40 個 backlog 主題 → 薄領域補強）。
> Nodus 為次要資產：本計畫屬「內容深化」，**非**橫向產品擴張（與 CLAUDE.md「不擴張」一致）。

---

## 0. 現況（2026-06-15 實測）

- 節點 **627**：concept 508 / person 45 / field 44 / event 30；in-node `connections` 2952 條。
- 全 627 已具 **3 語**（en/zh/ja）labels + structured `sections` + flat descriptions。
- `check_graph_integrity` = **0 ERROR / 0 WARN**。
- 管線純 JSON + Claude API（線上站與生成皆不需 Neo4j；Neo4j 僅 import 步驟用）。

---

## 1. 擴充種子：40 個「已被引用但不存在」的主題

上次修 73 條壞邊（commit 9e50803）時，丟棄了 52 條指向**不存在節點**的邊。把這些主題建出來＝修復圖中既有的真實引用，**非憑空造主題**。

**40 個真正缺漏**（無任何相關節點，最乾淨）：
anatomy · cell_biology · genetics · genomics · gene_expression · immunology · systems_biology · stem_cell_biology · genetic_engineering · taxonomy · classical_mechanics · electromagnetic_theory · nuclear_fission · semiconductor_physics · organic_chemistry · stereochemistry · numerical_analysis · axiomatic_system · non_euclidean_geometry · recursion · deep_learning · automation · distributed_systems · civil_engineering · plate_tectonics · climate_science · consciousness · learning_theory · cognitive_biases · creativity · nature_vs_nurture · democracy · religion · confucianism · structuralism · narratology · the_sublime · paradigm_shift · philosophy_of_science · systems_thinking · decolonization_of_history

**11 個 concept/field 變體已有 sibling → 逐一裁決**（建 concept 子節點 vs 直接把被丟棄的邊 remap 到既有 field，避免近似重複）：
algebra→algebra_field · calculus→calculus_field · ecology→ecology_field · evolution→evolution_field · genetics→genetics_field · geometry→geometry_field · information_theory→information_theory_field · neuroscience→neuroscience_field · philosophy_of_science→philosophy_of_science_field · political_philosophy→political_philosophy_concept · statistics→statistics_field

> 實際淨增約 **35–40 個**。被丟棄邊的回溯來源：`git show 9e50803 -- data/all_nodes.json`。

---

## 2. 每個新節點要產出的完整工件（必須對齊既有 627）

### 2.1 節點 schema（`data/all_nodes.json`）
必填：`id` `label` `type` `domain[]` `display_tags[]` `description` `connections[]`
其餘：`era` `geo` `has_subgraph` `verified(=false)` `schema_version(=1)` `suggest_subgraph` `sections`

- `id` 格式：`^[a-z][a-z0-9_]*_(concept|person|event|field)$`
- `type` ∈ `{concept, person, event, field}`
- `domain` ∈ 12 碼 `MAT PHY CHE BIO MED ENG TEC SOC HUM PHI ART HIS`（1–3 個）
- `era`/`geo`：concept/field **必須為 null**；person/event 才填
- `display_tags`：2–8 個，**必須存在於 `display_tags_seed.json` 詞彙**，否則以 `_REVIEW` 結尾（不然 validate error）
- `description`：50–360 字（由 `apply_sections.py` 從 sections 重建）

### 2.2 connections（最易出錯）
每條：`target` `relation`(≥10 字) `relation_type` `directed` `learning_prerequisite` `parallel_development` `pending`
- `relation_type` 安全交集用 `{logical, historical, applied}`（validate 與 nodus_utils 兩處 enum 不一致；**生成時禁用 `contradicts`**）
- `directed=true` 僅限 logical/causal
- 每節點 **≥3 連線、跨 ≥2 target domain**；非 field 節點應至少 1 條連到 field 節點
- **兩端 id 都必須存在**（連到既有節點，或同波共建的新節點），否則 integrity 報壞邊
- 無自環、無重複

### 2.3 sections（英文，內嵌於節點）
`{lead, core, impact, links:[{d,t}], works?[]}`
- `lead`：1–2 句定義，以接受的 WHAT 動詞開頭，無縮寫句點
- `links`：3–5 條，每條 `d` ∈ 12 domain 碼；**≥2 條指向節點自身 domain 以外**
- concept/field：lead+core+impact+links；event：lead(發生)+core(背景)+impact(後果)；person：works[] 清單

### 2.4 i18n 檔（新節點 id 都要出現）
- `data/i18n/en.json` `zh.json` `ja.json` — labels（**正規 zh 檔是 `zh.json`，非 `zh-TW.json`**）
- `data/i18n/zh_descriptions.json` `ja_descriptions.json` — flat 描述
- `data/i18n/zh_sections.json` `ja_sections.json` — 翻譯後 sections
- 無 `en_sections.json`（英文 sections 內嵌節點，build 時抽成 `frontend/public/data/sections.json`）

---

## 3. 單一節點 end-to-end 管線（順序）

| # | 步驟 | 工具 | API? |
|---|------|------|------|
| 1 | 生成骨架（id/label/type/domain/era/geo/display_tags/connections） | `generate_nodes.py` 或 QA 子代理 | 是 |
| 2 | 英文 sections（lead/core/impact/links） | 子代理依 spec → `apply_sections.py` | 是 |
| 3 | 重建 flat description（50–360 字） | `apply_sections.py` 自動 | 否 |
| 4 | 恢復 inbound 邊（從來源節點指向新節點） | 手動 / 腳本（回溯 9e50803） | 否 |
| 5 | labels zh/ja | `translate_nodes.py` / `translate_nodes_ja.py`（先核對輸出路徑） | 是 |
| 6 | sections zh/ja | 子代理 → `apply_locale_sections.py <locale>` | 是 |
| 7 | descriptions zh/ja | 子代理 / 腳本 → merge 進 `*_descriptions.json` | 是 |
| 8 | QA 全綠 | 見 §4 | 否 |

> **關鍵**：`generate_nodes.py` 產出的是**舊 schema、不含 sections**（required 清單無 sections）。新節點必走步驟 2–7 補齊，與 desc-sections rollout 同型。

---

## 4. QA 閘門（每波必過，0 失敗才部署）

- `validate_nodes.py` → `[PASS]`（schema/連線/詞彙/era-geo）
- `quality_check.py` → 描述 **W=3 S=3 B=4（=10）**
  - WHAT 動詞僅接受 `is/are/refers to/describes/studies/examines/measures/captures/represents/defines`（was/were/constitutes/refer to 不算）；首句勿用縮寫句點（c./U.S.）
  - SIGNIFICANCE 需 **≥2 個相異**關鍵字（transform/foundation/fundamental/breakthrough/enable/shaped/impact/influence/advance/critical/essential/pioneer/discover/solve…；注意字界：influential≠influence、enabling≠enable）
  - BRIDGE 需 **≥2 個節點 domain 以外**的連結域
- `check_graph_integrity.py` → 0/0（無壞邊/自環/重複）
- `deduplicate.py` → 對既有 627 無新語意重複
- `check_simplified.py` → zh 無簡體洩漏（OpenCC 逐字 + 台灣變體白名單）
- `check_locale_sections.py` → zh/ja sections 結構齊全（注意：只查 SHAPE，**不查**簡體/未譯/數字漂移——須人工抽查內容）

---

## 5. 反幻覺（CLAUDE.md 第一原則，新節點風險高於 desc-sections）

新節點引入**全新事實主張**（日期/人物/著作/數據）。硬規則：
- 只建**公認、確定**的主題；不確定的日期/數字/著作一律省略或標「不確定」，**絕不編造**。
- 子代理 spec 內建反幻覺條款；每波**逐節點抽查** 2–3 個事實點。
- works/著作清單只列廣為人知者。

---

## 6. 分階段執行

### Phase 0 — 先走通一個（降風險，必要）
1. 撰寫 `data/_new_nodes_spec.md`（schema + 連線 + sections + 反幻覺 + gold example）。
2. 核對 i18n 路徑（zh.json 正規）、display_tags 詞彙、relation_type enum。
3. 用 1–2 範例節點（建議 `genetics_concept`、`classical_mechanics_concept`）手動走完 §3 全鏈 + §4 QA，產出可重複 runbook。

### Phase 1 — backlog 主體（35–40 節點）
分波（每波 6–8），每波過 §4 QA；**累積數波再一次部署**（非每波都部署）。同步恢復被丟棄的 inbound 邊。

### Phase 2 — 薄領域補強（可選）
Phase 1 完成、評估每節點實際成本後再啟動。開放式範圍。

---

## 7. 部署（每次都需使用者視覺核可）

加節點 → `npm run build` 會 `bakeLayout()` 重排座標 = **視覺變動**。依 deploy-safety：
```
npm run build            # 成功、emit sections.json
npm run test:e2e         # 13/13
git checkout -b feat/node-expansion-waveN   # 不直推 master
git add data/...
git commit -m "feat(content): expansion wave N — <topics>"   # 附 Co-Authored-By
# ⚠ 取得使用者視覺核可後：
git checkout master && git merge --ff-only <branch> && git push origin master
```
**絕不自動部署。**

---

## 8. 待驗證/風險登記（Phase 0 解決）

- [ ] `translate_nodes.py` 輸出 `zh-TW.json` vs 正規 `zh.json` — 需修或改流程。
- [ ] `relation_type` enum 兩處不一致 — 以 validate_nodes.py 實際強制者為準。
- [ ] `generate_nodes.py` 舊 schema — 確認是補後處理還是改用子代理直接產新 schema。
- [ ] `display_tags_seed.json` 詞彙是否涵蓋新主題所需 tag — 缺則補 `_REVIEW`。
- [ ] descriptions zh/ja 的產生方式（步驟 7）目前是手動/子代理 merge，無專用腳本 — 是否補一支。

---

## 9. Phase 0 — 已完成並驗證（2026-06-15，分支 `feat/node-expansion-phase0`）

證明節點：`classical_mechanics_concept`（PHY/MAT）、`cell_biology_concept`（BIO）。皆為「真正缺漏」主題，Opus 已自查事實（Principia 1687、三大運動定律、細胞學說 1839/cytology，無捏造）。

**已驗證的可重複 runbook（純確定性、零 API、零模型）：**
```
# 1. Sonnet 子代理依 data/_new_nodes_spec.md 產出每節點 bundle（skeleton+sections_en/zh/ja+label+desc）
# 2. 套用（generalize 自 data/_phase0_apply.py）：骨架 + 恢復 inbound 邊 + i18n labels/descriptions
python data/_phase0_apply.py
python scripts/apply_sections.py data/_phase0_sections_en.json          # 注入 EN sections + 重建 description
python scripts/apply_locale_sections.py zh data/_phase0_sections_zh.json
python scripts/apply_locale_sections.py ja data/_phase0_sections_ja.json
# 3. QA
python scripts/validate_nodes.py            # 新節點 0 error
python scripts/check_graph_integrity.py     # 0/0
python scripts/check_simplified.py          # zh 0 ERROR
python scripts/check_locale_sections.py zh <ids> ; ... ja <ids>   # 0 problems
python scripts/deduplicate.py               # 新節點未被 flag
npm run build && npm run test:e2e           # build green, E2E 13/13
```

**Phase 0 QA 實測結果：** validate 我的變更 **0 新 error**；integrity **0/0**；quality 兩節點皆 **25/25 grade A、description 10/10**（W3 S3 B4）；simplified **0 ERROR**；locale_sections zh/ja **0 problems**；dedup 新節點**未被 flag**；build 成功、`sections.json` emit 629；**E2E 13/13**。629 節點、恢復 4 條 inbound 邊。

**Phase 0 發現的既有問題（非本次造成）：**
- `behavioral_genetics_concept` 僅 2 連線（< 最低 3）→ **master validate 既有 FAIL**。9e50803 丟掉其 2 條死邊（→`genomics_concept`、→`nature_vs_nurture_concept`，皆在 backlog）。**Phase 1 建出這兩個主題即自動修復**（task #7）。
- 圖中既有 2 對 _field/_concept 同標籤（`Historiography`、`Game Theory`）被 dedup 標為 exact duplicate；佐證「11 變體案例偏 remap」的決策（建 concept 變體會製造同名重複，雖被容忍但 dedup 會標記）。
- 21 個既有「pending=true 但目標已存在」警告（非 error，與本次無關）。

## 10. Phase 1 執行模式（已定）

- 內容由 **Sonnet 子代理**依 `data/_new_nodes_spec.md` 產出，每波 6–8 節點；**Opus 逐節點查核事實** + 跑確定性 apply/QA。
- 11 變體案例：**逐個判斷、偏 remap**（與既有 _field 實質重疊就 remap 死邊到 _field，不建新節點）。
- 部署：分支驗 **E2E + integrity** 後即可 merge → master（使用者授權「信 E2E+integrity、事後再看」，覆寫 [[feedback-deploy-safety]] 的視覺核可步驟）。
- 需先做：把 `data/_phase0_apply.py` 一般化成 `scripts/apply_new_nodes.py`（吃 bundle 格式）。

## 11. Phase 1 — 已完成並驗證（2026-06-15，分支 `feat/node-expansion-p1`）

**淨增 34 節點**（建 38、移除 4 個隱性重複），全圖 629 → **663**。內容由 5 個 Sonnet 子代理依 `_new_nodes_spec.md` 產出（5 波，BIO/MED·PHY-CHE-地科·MAT-TEC·心智-哲·社會-人文），Opus 逐節點查核事實 + 跑確定性 apply（`scripts/apply_new_nodes.py`）/ QA。

**11 變體案例：全為 no-op** — 來源節點本就已連正確的 `_field`，被丟棄的 `_concept` 邊只是冗餘（9e50803 丟得對）。

**Opus 事實查核修正 2 處**：genomics（ENCODE「基因組大部分有功能」爭議主張→軟化）、nuclear_fission（1938 實驗 vs 1939 理論詮釋的歸屬→修正），三語同步。

**dedup 抓出並移除 4 個隱性重複**（stem 比對因前綴/單複數 id 漏抓，dedup exact+similar 補網）：`the_sublime`→既有 `sublime_concept`、`decolonization_of_history`→`decolonization_historiography_concept`、`paradigm_shift`→`paradigm_shifts_concept`、`cognitive_biases`→`cognitive_bias_concept`。邊 remap/drop 到既有等價節點。**教訓：stem 比對需含單複數/前綴正規化，或一律先過 dedup 再 apply。**

**QA 全綠**：validate 0 error、integrity 0/0、quality 34/34 grade A（desc 10/10）、check_simplified 0 ERROR、locale_sections zh/ja 0 problems、dedup exact 回到既有 2、護欄 0 既有節點 label/type/domain 變更、build green、**E2E 13/13**（注意：8-worker 並行下 663 節點初始化較重，曾 timeout flaky；單 worker + 機器空閒時穩過）。

**既有 bug 修復**：`behavioral_genetics_concept` 隨 genomics + nature_vs_nurture 建立恢復連線，回到 4 連線（task #7 完成）。

## 12. Phase 2 — 已完成並驗證（2026-06-15，分支 `feat/node-expansion-p2`）

使用者於 Phase 1 後指示「p2執行」。**淨增 24 節點**（663 → **687**），補強較薄/重要領域的公認缺口：
- PHI(5): Utilitarianism, Empiricism, Rationalism, Free Will, Virtue Ethics
- SOC(5): Capitalism, Socialism, Nationalism, Bureaucracy, Modernization Theory
- HUM(4): Syntax, Semantics, Pragmatics, Poetics
- TEC(4): Operating Systems, Database Systems, Computer Networks, Data Structures
- BIO/MED/PHY(6): Botany, Zoology, Physiology, Virology, Endocrinology, Quantum Field Theory

**前置 dedup（Phase 1 教訓落地）**：候選清單先對既有 663 label 做模糊比對（threshold 0.78）+ id stem 檢查，再授權 Sonnet。4 個 flagged 經審視皆假陽性（Pragmatics≠Pragmatism、Zoology≠Topology、Physiology≠Philology、Virology≠Biology）。apply 後 dedup exact 仍 2，**零隱性重複**（成功避開 Phase 1 的坑）。

**Phase 2 為純 breadth、無真實 inbound 錨點 → 只用 outbound 連線**（不讓 Sonnet 猜既有節點該連誰，避免捏造）。

**Opus 事實查核 24/24 全部正確**（Bentham 1789、Descartes 1637、Codd 1970、Banting-Best 1921、QED Dirac/Feynman… 無捏造）；修了 1 個 user-facing TODO-樣 tag（nationalism）、1 個簡體洩漏（endocrinology「胜肽」→「肽」，`胜` 非白名單）、1 個 validate 字數超標（data_structures，`\b\w+\b` 計法比 `.split()` 多算連字詞 → 再刪一 link）。

**QA 全綠**：validate 0、integrity 0/0、quality 24/24 grade A、check_simplified 0 ERROR、locale_sections zh/ja 0、dedup exact 2（無新增）、護欄 0 既有節點變更、build green、E2E 13/13（2 workers；8 workers 因 687 節點 init 變重會 timeout flaky，非資料 bug）。

## 13. 進度（擴充全部完成）
- 全程：627 → **687**（淨增 60：Phase 0 兩個 + Phase 1 三十四個 + Phase 2 二十四個）。
- 任務 #1–#7 全部完成。三階段皆已 merge master 並部署（Cloudflare auto-deploy）。
- 後續若要再擴充：沿用 `data/_new_nodes_spec.md` + `scripts/apply_new_nodes.py`，**務必先跑 dedup 前置檢查**，並 Opus 逐節點查核事實。
