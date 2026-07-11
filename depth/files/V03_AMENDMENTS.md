# PLAN v0.3 增補條款(併入後升版 v0.4)

前提:v0.3 的既有裁決全數維持——`data/all_nodes.json` 為 graph truth、Depth 以 `depth_manifest.json` 掛接、不建第二套 graph。本文件只增補,不推翻。

---

## 1. 已核可決策(2026-07-11)

見 README。四項決策為本增補的效力來源。

## 2. 資料層增補

`depth_manifest.json` 每個頁面項目新增欄位:

```json
{
  "slug": "quant-outliers",
  "tour_refs": ["edge_model_compression"],
  "locales": ["zh-Hant"],
  "review_status": "draft | in_review | approved | published | archived",
  "reviewed_at": null,
  "source_notes": "claim-source 表路徑",
  "content_focus": "一句話:本頁讓使用者親手發現什麼"
}
```

禁止:任何形式的第二 graph 資料源;prerequisite/related 一律引用 `all_nodes.json` 既有節點 id。

## 3. Phase A — 收束既有實驗(先於一切新工作)

- 現有四頁逐頁裁決:公開/返工/封存(用 `EXISTING_PAGES_TRIAGE.md`,裁決人:凜空)。
- transformer 頁特別處置:M2 brief 明訂不做第 4 頁而它已存在,裁決結果需回寫該 brief 作為範圍控制事故記錄。
- M3 brief:Depth 接入 staticHtmlPlugin、sitemap、hreflang、E2E;Vite build 納入 depth/。
- 舊三份 PROPOSAL 文件歸檔(見 README)。
- Phase A 未完成前,不進 Phase B。

## 4. Phase B — 單一旗艦:量化異常值

- 前置:`GO_NOGO_QUANT_OUTLIERS.md` 全欄完成且凜空簽核,含「動工前技術前提」全數解決。
- 硬上限:**40 小時全含**(考證、驗證、互動、前端、繁中文案、QA、無障礙、發布)。
- 改序規則:**繁中版先行** → 通過理解閘門(Phase C 發布前測試)→ 才投入英文版(另計 8–10h)與 HN/Reddit 發布。理解閘門未過,英文工時一毛不花。
- 元件策略:不預建元件庫。第二次真實重用時才抽離;抽離候選記入製作履歷。
- 語域:第一層零先備知識可讀(品牌規範受眾),工程推導與公式放進階摺疊區;fan-out 子問題以頁內 H2 問句呈現,不拆獨立 URL。

## 5. Phase C — 先測理解,再測流量

發布前(全過才發布):
- 理解測試:依 `COMPREHENSION_TEST_PROTOCOL.md`,5 位受測者中至少 4 位通過。
- 技術驗證:claim-source 表全數 `verified`;數值/property 測試全綠;凜空能逐符號自述每條公式。
- 工程驗證:`npm run verify` + depth validator + no-JS 完整可讀 + CSP 通過 + 鍵盤完整操作 + 手機/桌機 E2E。

發布後:
- 量測手段:GSC、每月人工引用巡檢(ChatGPT/Perplexity/AIO)、獨立技術回饋(留言、issue、轉發)、收藏/引用訊號、Wonders CTA 點擊(量測 Depth → Wonders 轉換,不以 graph 跳轉充數)、技術修正次數與成本。
- 樣本紀律:設最小有效樣本;未達即判定「資料不足」,禁止判定成功。
- 分析工具:**不使用 Amplitude 或任何第三方 SDK**。若未來需要事件量測,另開 brief,沿用同源 API + D1 純聚合 counter(無 timestamp/device/session id)模式。

## 6. Phase D — 條件式擴張

- 四閘門:內容正確、使用者理解、工時可接受(實際 ≤ 上限 120%)、產品銜接(Wonders CTA 有真實點擊)。**全過**才做第 2、3 頁(候選自 BACKLOG 依序取用,每頁重走 go/no-go)。
- 三頁完成後四選一裁決:繼續逐頁生產/只維護旗艦/併入 Wonders/封存為技術展示。
- 明確刪除:8–12 頁試產批、支撐頁量產、Phase 0 元件庫預建。

## 7. 治理規則(併入 CLAUDE.md 路由)

- 秘書層(Claude Pro 對話)產出的任何涉及 repo 架構之計畫,一律標注 `PROPOSAL`,經 repo 現況比對後方可升級為有效規格。
- 本輪互驗(Gemini 研究 → Claude 規劃 → GPT-5.6 交叉分析 → Claude 裁決)記入 CROSSVERIFY_LEDGER,含雙向糾錯記錄:GPT-5.6 修正 Claude 的資料源/隱私/範圍問題;Claude 以 2026-02 官方文件修正 GPT-5.6 的 Googlebot 15MB 過期主張(現行:Googlebot 對 HTML 索引上限 2MB,15MB 為全爬蟲通用預設)。
