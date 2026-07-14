# Neblux Depth — 計畫 v0.4

狀態：in-progress  
更新：2026-07-11  
本版原因：併入 2026-07-11「和解包」增補（Gemini 研究 → Claude 規劃 → GPT-5.6 跨供應商交叉分析 → 凜空裁決）。v0.3 的既有裁決全數維持，本版只增補、不推翻。增補明細與工作文件見 `depth/files/`（權威仍為本檔；`depth/files/` 為模板與工作文件，非平行規格）。

## 0. 本版裁決

v0.1 的問題不是「不能做」，而是動工順序錯。先做新 schema、DAG、三頁單檔 HTML，會把風險推到 M3 才爆炸。本版把風險前移：

1. 先盤點既有 Neblux 資料與 CSP。
2. 以 `depth_manifest.json` 掛在既有 graph node id 上，不建立第二套 graph truth。
3. 先做一頁黃金樣本，且第一頁就用 Neblux 可上線的 CSP 形式。
4. 公開只放亮節點；暗節點留內部 backlog，不在公開 UI 製造爛尾感。
5. 控制/數學內容必須有最低正確性 gate，不能只靠五分鐘體感測試。

## 0.5 和解包增補裁決（2026-07-11，凜空核可）

本節為 v0.4 新增，效力來源為凜空 2026-07-11 核可。四項決策：

1. **Depth 歸屬 Neblux**：受眾沿用 Neblux 品牌規範（約 12 歲以上、零先備知識的好奇探索者）。採「**可及性優先分層**」——第一層零先備即可讀，工程深度（推導、公式、效能數據）收進進階摺疊區。「面向工程師的 Linku 工程信譽內容線」移入 `depth/files/BACKLOG.md`，不透過 Neblux 承載，待另案裁決。
2. **分階計畫取代量產批**：路線為「1 頁旗艦 → 理解驗證 → 最多再 2 頁 → 三頁後裁決」（Phase A–D，見 §4）。**明確刪除** v0.1 PROPOSAL 的 8–12 頁試產批、支撐頁量產、Phase 0 元件庫預建、Amplitude 埋點。
3. **現有四頁先裁決**：`sine-wave`／`fourier-series`／`s-plane`／`transformer` 逐頁三擇一（公開／返工／封存，裁決人凜空，用 `depth/files/EXISTING_PAGES_TRIAGE.md`）。**四頁裁決完成前不開第五頁。**
4. **量化旗艦動工前必過 go/no-go**：首發旗艦 `quant-outliers`（量化異常值）動工前，`depth/files/GO_NOGO_QUANT_OUTLIERS.md` 全欄完成且凜空簽核，含「動工前技術前提」（尤其異常值災難的規模依賴性）全數解決。

## 1. 固定邊界

本計畫是 Neblux 的小型 Depth page 實驗，不是新平台。

- 對外名稱固定為 `Neblux Depth`。
- UI、頁面 title、manifest notes、公開文件提到本功能時使用 `Neblux Depth` 或 `Depth`，不使用「實驗室」、「深一層」、「概念小窗」等中文產品名。
- 中文內部文件可用「Depth page」描述單頁交付物，但不新增中文品牌名。

- 不改 `data/*.json` 結構。
- 不改 `frontend/src/engine/`。
- 不改 `functions/`、Cloudflare Pages、`frontend/public/_headers` 或部署設定。
- M1 前不把新頁接進正式導覽。
- 首輪只處理一頁黃金樣本；另外兩頁留到 M2 gate 後。

若未來需要碰上述禁區，先寫 task brief，走 repo 的交叉審查路徑。

## 2. 資料策略

### 廢棄 v0.1 的 `nodes.json` 方向

`nodes.schema.json` 與 `nodes.seed.json` 保留為 v0.1 草案資料，不作為執行源頭。真正的 graph source of truth 仍是：

- `data/all_nodes.json`
- `data/i18n/*.json`
- build 時產出的 `/data/all_nodes.json`、`descriptions.json`、`sections.json`

### 新焊點：`depth_manifest.json`

`depth_manifest.json` 只記 Depth page 自己的狀態：

- Depth page id
- 對應既有 `node_id`
- depth path（尚未上線時為 `null`）
- 是否公開
- QA gate 狀態
- mapping note

它不複製 graph label、description、connections，也不宣稱 prereq-DAG。既有 graph 的節點與連線仍由 `all_nodes.json` 負責。

### v0.4 增補：manifest 治理欄位

`depth_manifest.json` 每個 entry 增加治理欄位（不影響頁面渲染契約，故 `manifest.version` 技術契約版維持 `0.2`，頁內 `spec_version` 不必動；本欄位為 manifest 內部治理 metadata）：

- `review_status`：裁決生命週期。合法值 `pending_triage`（現有頁初值）、`draft`、`in_review`、`approved`、`published`、`pending_rework`、`archived`。
- `status` 是 build／頁面生命週期（合法值 `candidate`、`draft`、`review`、`live`、`blocked`）；公開頁的唯一判準為 `public:true`、`status:"live"`、`review_status:"published"`、`depth_path` 存在，且 QA 四鍵 `csp_safe`／`reference_notes`／`formula_walkthrough`／`mobile_canvas_check` 全為 `true`。`review_status` 仍是治理裁決生命週期，兩欄不得互相代替。
- `reviewed_at`：裁決時間戳（未裁決為 `null`）。
- （選填，供未來已授權內容頁攜帶，validator 只在存在時驗型別）`source_notes`（claim-source 表路徑）、`content_focus`（一句話：本頁讓使用者親手發現什麼）、`tour_refs`（Wonders 站點 id 陣列）、`locales`（語言陣列）。

禁止：任何形式的第二 graph 資料源；`prerequisite`／`related` 一律引用 `all_nodes.json` 既有節點 id。

## 3. CSP 與頁面形式

Neblux 現行 CSP 是 `script-src 'self'`。因此 deployable 深度頁禁止 executable inline script。允許：

- external same-origin JS module
- inline `<style>`（現行 CSP 允許）
- non-executable JSON metadata script，例如 `type="application/json"`

v0.1 的「單一 inline CSS/JS HTML、file:// 可直開」只可作為離線草稿，不可作為上站交付物。本計畫的 M1 黃金樣本必須一開始就採 Neblux 可上線形式，避免 M5 重寫。

## 4. 里程碑

### M-1 — 既有系統盤點（已新增）

交付：

- `ARCHITECTURE_AUDIT.md`
- 盤點既有 graph schema、build pipeline、CSP、目標概念 mapping。

驗收：

- 能回答「深度頁要掛在哪些既有 node id 上」。
- 能回答「第一頁要用哪種 CSP 相容形式」。

### M0 — Manifest 地基

交付：

- `depth_manifest.json`
- `validate-depth.mjs`

驗收：

- `node neblux-depth/validate-depth.mjs` 全綠。
- validator 至少檢查：
  - manifest entry id 唯一且 kebab-case
  - `node_id` 存在於 `data/all_nodes.json`
  - `status` 合法
  - `depth_path` 非空時檔案存在
  - depth page 不含 executable inline script
  - public page 必須有所有 QA gate

### M1 — 黃金樣本：弦波與三參數

交付：

- 一頁可互動黃金樣本。
- 參考來源/公式檢查筆記。
- manifest 對應 entry 從 `candidate` 推進到 `draft` 或 `review`。

最低內容 gate：

- Riku 能用自己的話說明公式每個符號如何對應互動控制。
- 每頁附 2 個以上可靠參考來源或教材來源。
- 手機與桌面實看。
- 若內容牽涉控制理論，必須額外標出推導假設與不處理的邊界。

### M2 — 管線驗證

只有 M1 定稿後才做。候選頁：

- Fourier series
- s-plane / poles

驗收重點不是「多兩頁」，而是記錄人工修補量、內容 QA 成本、維護成本是否可接受。

### M2 現況（2026-07-11）

`fourier-series`、`s-plane`、`transformer` 三頁已建於 working tree，全 `public:false`、status `review`。四頁自此進入 Phase A 裁決，不再新增 M 編號里程碑；前進路線改用下列 Phase A–D。

---

## 4.5 前進路線（Phase A–D，2026-07-11 和解包）

本路線取代 v0.1 PROPOSAL 的「試產批」構想。四閘門全過才逐階前進。

### Phase A — 收束既有實驗（先於一切新工作）

- 現有四頁逐頁裁決：公開／返工／封存（用 `depth/files/EXISTING_PAGES_TRIAGE.md`，裁決人凜空）。
- `transformer` 頁特別處置：M2 brief（`docs/tasks/2026-07-09-depth-layer-m2.md`）明訂不做第 4 頁而它已存在，裁決結果需回寫該 brief 作為**範圍控制事故**記錄。
- **M3 build 整合 brief**：Depth 接入 `staticHtmlPlugin`、sitemap、hreflang、E2E；確認 Vite build 納入 `depth/`（見 `docs/tasks/2026-07-11-depth-build-integration.md`）。
- 舊 PROPOSAL 文件已歸檔 `depth/files/archive/`。
- **Phase A 未完成前，不進 Phase B。**

### Phase B — 單一旗艦：量化異常值（quant-outliers）

- 前置：`depth/files/GO_NOGO_QUANT_OUTLIERS.md` 全欄完成 + 凜空簽核，「動工前技術前提」全數解決。
- 硬上限：**繁中版 40 小時全含**（考證、驗證、互動、前端、繁中文案、QA、無障礙、收尾）。
- 改序規則：**繁中版先行** → 過理解閘門（Phase C）→ 才投英文版（另計 8–10h）與 HN/Reddit 發布。理解閘門未過，英文工時一毛不花。
- 元件策略：**不預建元件庫**；第二次真實重用時才抽離，抽離候選記入製作履歷。
- 語域：第一層零先備可讀，推導/公式進階摺疊；fan-out 子問題以頁內 H2 問句呈現，不拆獨立 URL。

### Phase C — 先測理解，再測流量（發布前閘門）

發布前全過才發布：

- **理解測試**：依 `depth/files/COMPREHENSION_TEST_PROTOCOL.md`，5 位受測者 ≥ 4 位通過。
- **技術驗證**：claim-source 表全數 `verified`（`depth/files/CLAIM_SOURCE_TABLE_TEMPLATE.md`）；數值/property 測試全綠；凜空能逐符號自述每條公式。
- **工程驗證**：`npm run verify` + depth validator + no-JS 完整可讀 + CSP 通過 + 鍵盤完整操作 + 手機/桌機 E2E。

發布後量測：GSC、每月人工引用巡檢（ChatGPT/Perplexity/AIO）、獨立技術回饋、收藏/引用訊號、Wonders CTA 點擊、技術修正次數與成本。**不使用 Amplitude 或任何第三方 SDK**；未來若需事件量測，另開 brief，走同源 API + D1 純聚合 counter（無 timestamp/device/session id）。

### Phase D — 條件式擴張

- 四閘門：內容正確、使用者理解、工時可接受（實際 ≤ 上限 120%）、產品銜接（Wonders CTA 有真實點擊）。**全過**才做第 2、3 頁（候選自 `depth/files/BACKLOG.md` 依序取用，每頁重走 go/no-go）。
- 三頁完成後四選一裁決：繼續逐頁生產／只維護旗艦／併入 Wonders／封存為技術展示。

## 5. 品質門檻

任何一條不過，該頁不得公開：

- 一頁只教一個 aha。
- 一個 Canvas 主互動物，控制元件不超過 3 個。
- 預設畫面可理解且有生命，不需先讀長文。
- 公式只出現在形式化段落。
- 符號與控制元件顏色一致。
- 觸控可用。
- CSP 相容：無 executable inline script。
- 有 node metadata。
- 有來源與公式檢查筆記。
- 不新增帳號、後端、cookie、個資或追蹤。

## 6. 明確不做

- 不公開暗節點 backlog。
- 不新增分類系統。
- 不做第二套 graph。
- 不做後端。
- **不做 8–12 頁試產批、不做支撐頁量產、不預建 Phase 0 元件庫**（v0.4 明確刪除 v0.1 PROPOSAL 構想）。
- 現有四頁裁決完成前不開第五頁；未過 Phase D 四閘門前不逾單一旗艦。
- 不裝 Amplitude 或任何第三方分析 SDK；量測走理解測試 + GSC + 人工巡檢。
- 不改既有 deploy/CSP 來遷就實驗頁。

## 7. 治理規則（2026-07-11 增補）

- 秘書層（Claude Pro 對話）產出的任何涉及 repo 架構之計畫，一律標注 `PROPOSAL`，經 repo 現況比對後方可升級為有效規格。
- 本輪互驗（Gemini 研究 → Claude 規劃 → GPT-5.6 交叉分析 → 凜空裁決）記入 CROSSVERIFY_LEDGER，含雙向糾錯記錄。
- 索引事實備註（GPT-5.6 主張的糾正）：Googlebot 對 HTML 的索引抓取上限為 **2MB**（2026-02 官方文件），15MB 為全爬蟲通用預設；本站遠低於門檻，此為衛生慣例非風險項。

## 8. Backlog

- 若第一頁成功，考慮把深度頁產生流程納入既有 Vite build，但需另開 brief（已由 Phase A 的 M3 build 整合 brief 承接）。
- 暫緩/退出/待決事項的完整登記見 `depth/files/BACKLOG.md`（KV Cache、邊緣推論、RoPE 等旗艦候選的退出理由與復活條件）。

## 9. 修訂紀錄

- v0.4（2026-07-11）：併入和解包增補。四項核可決策（§0.5）；manifest 治理欄位（§2 增補）；前進路線改 Phase A–D（§4.5）；明確刪除試產批/量產/元件庫預建/Amplitude（§6）；新增治理規則（§7）。工作文件置 `depth/files/`。
- v0.3（2026-07-09）：命名定案為 `Neblux Depth`；不另設中文產品名；移除「實驗室」命名待決項。
- v0.2（2026-07-09）：採紅隊修案。新增 M-1；改用 `depth_manifest.json`；deployable 頁面改為 CSP 相容；新增內容正確性 gate。
- v0.1（2026-07-08）：初版，由對話結論整理。
