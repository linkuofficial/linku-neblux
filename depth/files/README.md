# Depth 和解包 README

日期:2026-07-11
性質:2026-07-11 跨供應商互驗(GPT-5.6 交叉分析)裁決後的和解包
權威聲明:**`neblux-depth/PLAN.md` v0.3 仍是唯一方向來源。** 本包所有文件為 v0.3 的增補、模板與工作文件,不是平行規格。

---

## 已核可決策(凜空,2026-07-11)

1. Depth 歸屬 Neblux(選項一):受眾沿用品牌規範(約 12 歲以上、零先備知識的好奇探索者),採「可及性優先分層」——第一層零先備可讀,工程深度放進階摺疊。「Linku 工程信譽內容線」移入 BACKLOG 待另案裁決。
2. 分階計畫(1 頁 → 理解驗證 → 最多再 2 頁 → 三頁後裁決)取代 8–12 頁試產批。刪除支撐頁量產構想。
3. 現有四頁先裁決(公開/返工/封存),裁決前不開第五頁。
4. 量化旗艦動工前必須通過 go/no-go memo。

## 檔案清單

| 檔案 | 用途 |
|---|---|
| `V03_AMENDMENTS.md` | 併入 PLAN v0.3 的增補條款(資料層、Phase A–D、閘門、治理規則) |
| `SPEC_DELTA.md` | 規格差異清單:保留/修正/新增(無障礙、驗證、審查協議) |
| `GO_NOGO_QUANT_OUTLIERS.md` | 量化旗艦 go/no-go memo 草稿(含動工前技術前提) |
| `EXISTING_PAGES_TRIAGE.md` | 現有四頁裁決清單模板 |
| `COMPREHENSION_TEST_PROTOCOL.md` | 發布前理解測試協議(Phase C 閘門) |
| `CLAIM_SOURCE_TABLE_TEMPLATE.md` | 逐條技術陳述 → 一手來源對照表模板 |
| `PAGE_RETRO_TEMPLATE.md` | 製作履歷 v1.1(質性化修訂版) |
| `BACKLOG.md` | 暫緩/退出/待決事項登記(附理由與復活條件) |

## 給 Claude Code 的整理指示

1. 將舊三檔 `NEBLUX_DEPTH_PLAN.md`、`DEPTH_PAGE_SPEC.md`、舊版 `PAGE_RETRO_TEMPLATE.md` 檔頭加註 `STATUS: SUPERSEDED (2026-07-11)`,移至 `depth/files/archive/`。
2. 依 `V03_AMENDMENTS.md` 將增補併入 `neblux-depth/PLAN.md`,版號升 v0.4;併入時逐條保留 v0.3 原有裁決(depth_manifest 為掛接層、不建第二 graph、首輪頁數限制)。
3. 依 `V03_AMENDMENTS.md` 第 2 節更新 `depth_manifest.json` schema(新增欄位),為現有四頁補上 `review_status` 初值 `pending_triage`。
4. 另開 M3 brief:Depth 接入 `staticHtmlPlugin`、sitemap、hreflang 與 E2E;確認 Vite build 納入 `depth/`。
5. **禁止事項:本次不撰寫、不修改任何內容頁;不安裝任何第三方分析 SDK;不建立 nodes.json 或任何第二資料源。**
6. 完成後逐項回報驗證方式(檔案異動清單、build 輸出、manifest schema diff),不接受「已完成」式回報。
