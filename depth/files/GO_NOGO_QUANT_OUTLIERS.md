# GO/NO-GO Memo — 旗艦:量化異常值災難(quant-outliers)

狀態:**條件已解除,GO**(2026-07-14,見下方「條件解除」段;2026-07-12 簽核歷史保留於原簽核欄,不覆寫)
簽核欄:☑ 條件式 GO(條件:claim-source 階段核實錨點——OPT-13B 78.6%/4.8%/79.3% 三聯數字、act_scales 存在性與 MIT 授權——**全數通過後前端實作才動工**;任一核實不過即回本 memo 重審)日期:2026-07-12

## 條件解除(2026-07-14)

凜空授權助理直接 WebFetch 一手來源核實(範圍限釘死的單點事實,非開放式競查;例外記於 memory `gemini-deep-research-delegation`),核實結果全文見 `depth/files/QUANT_OUTLIERS_ANCHOR_VERIFY_BRIEF.md`。

- **V1(OPT-13B 三聯數字)VERIFIED**:`smoothquant_opt_demo.ipynb` 逐字核對 FP16 0.786 / naive W8A8 0.048 / SmoothQuant W8A8 0.793;模型確為 `facebook/opt-13b`;naive 為 per-tensor absmax(=對稱)。
- **V2(act_scales 存在性+MIT 授權)VERIFIED**:`opt-13b.pt` 存在於官方 HuggingFace repo `mit-han-lab/smoothquant-scales`;`smoothquant` repo LICENSE = MIT。**更正**:act_scales 是從 HF 下載或 `generate_act_scales.py` 自行生成,repo 內 `act_scales/` 目錄本身只有 README,無 in-tree `.pt`——動工時 claim-source 表需照此寫,不寫「目錄內附檔」。
- 兩項皆為簽核欄指名的兩個核實條件,雙雙通過。**凜空 2026-07-14 指示「清 GO 條件」**,本 memo 狀態由條件式 GO 轉為 GO,前端可動工(仍先過紙上原型,見 `docs/tasks/2026-07-14-quant-outliers-paper-prototype.md`)。
- 額外核了 §3.5 點 4 指名的最弱引用(V3/V4)與 §3.5 點 5 甲/乙機制的雙方錨點(V5–V7),供紙上原型直接取用,結果與細節見驗證 brief,不重複貼於此。

---

## 1. 受眾

主受眾:好奇探索者(零 ML 先備)——聽過「AI 模型可以壓縮變小」,想知道為什麼這件事很難、為什麼偶爾會壞掉。
次受眾:部署工程師——進階摺疊區提供混合精度分解、AWQ 縮放的推導與實測數據。

## 2. 唯一 aha(一句話)

**「模型裡不到 1% 的極端值,能在壓縮時毀掉全部——而只要保護那 1%,幾乎能全數救回。」**
使用者親手發現的路徑:拉動量化位元滑桿 → 看誤差在異常值處爆炸 → 開啟「保護異常值」開關 → 看精度回穩。

## 3. 動工前技術前提(未解決不得動工)

**前提 #1(最重要):異常值災難的規模依賴性。** LLM.int8() 論文指出系統性異常值特徵隨模型規模湧現(約 6.7B 參數以上才顯著)。頁內若用小模型現場量化,可能重現不出戲劇性崩塌,demo 就變成謊言。可選解法,擇一並驗證:
- (a) 互動用合成權重/激活分布展示「機制」(誠實標注為示意),實測數據引用論文中大模型的量測表;
- (b) 取得公開的大模型 per-layer 激活統計(如論文釋出資料或 HuggingFace 上的分析),互動直接驅動真實統計;
- (c) 實測一個確實會崩的中型開源模型的公開量測結果並附重跑腳本(不在頁內即時跑)。
裁決人:凜空。裁決記入本 memo。

**2026-07-12 Gemini 深度搜尋結果(資料源調查)**——結論:(b)(c) 兩路線原料皆充足,報告建議 **(b)+(c) 併用**、無需啟用 (a) 合成後備。以下全部為深搜報告轉述,依 §7 與 SPEC_DELTA §C3 屬**未驗證草稿**,動工時每個數值/連結逐一以原 repo/原文核對後才進 claim-source 表:

- **(b) 逐層激活統計——充足**。SmoothQuant 官方 repo(`mit-han-lab/smoothquant`)的 `act_scales/` 目錄提供多個主流模型(OPT、LLaMA 等)的逐層通道絕對最大值統計:`.pt` 格式 PyTorch 字典,鍵=層命名空間(如 `model.decoder.layers.0.fc1`)、值=`[hidden_dim]` 一維張量;由 The Pile 驗證集 512 句校準、hook 攔截各線性層輸入取 abs-max 而得。MIT 授權。可直接驅動「絕大多數通道趴在 0–2、極少數通道突刺到 50–100+」的分佈視覺化。注意:各團隊皆**未釋出**未聚合的原始激活分佈/直方圖(資料量物理限制,單次校準即數百 GB),聚合統計是唯一可得形態。另 HuggingFace `mit-han-lab/awq-model-zoo` 存的是 AWQ 搜索後量化參數(group scales/zero-points/clip),對「視覺化激活異常值」不如 act_scales 契合,僅作備選。
- **(c) 崩壞/回穩實測——充足且權威**。SmoothQuant 官方可重跑 notebooks(MIT):
  - `examples/smoothquant_opt_demo.ipynb`:OPT-13B,LAMBADA 前 1000 樣本 last-token accuracy——FP16 78.6% → naive W8A8 **崩至 4.8%** → SmoothQuant W8A8 回穩 79.3%。這組數字就是「毀掉→救回」敘事的實證錨點。
  - `examples/smoothquant_llama_demo.ipynb`:LLaMA-2-7B,WikiText-2 PPL——5.82 → naive 5.93 → smooth 5.85。
  - bitsandbytes repo Issue #1867(報告所引編號,核對時確認):Mistral-7B 的 `llm_int8_threshold` 消融——預設 6.0(保護異常值)吞吐 29.06→7.88 tok/s、每千 token 能耗 +30.7%;threshold=0(不保護)速度回來但精度崩。可支撐進階摺疊區「保護精度 vs 硬體效能」工程取捨。
  - AWQ 對 RTN 的 INT4 對比(報告引 Qwen-3-8B:PPL 9.75→10.08、體積 13.9GB→3.5GB;模型名與數值務必核對)。
- 前端接法(報告建議,實作時再議):Python `torch.load()` 讀 act_scales → 取前 1% 異常通道+其餘分箱聚合 → 輸出輕量 JSON 供 canvas 渲染。符合本站零後端、build 時預處理的既有模式。

前提 #1 路線裁決(凜空):☑ **(b)+(c) 併用** 日期:2026-07-12
分工原則(裁決之一部):act_scales(路線 b)只驅動「**機制**」互動——尖刺分佈、縮放因子被撐大、正常值被擠扁;notebook 數字(路線 c)以「**引用實測**」形態呈現「後果」——4.8% 與 79.3% 是顯示出來的引文,頁面不假裝自己算出它們(頁面不跑模型)。機制模擬與實測引用的邊界必須在視覺上分明。**示範模型定為 OPT-13B**——LLaMA-2-7B 的天真 W8A8 幾乎不崩(PPL 僅 +0.11),不可作災難示範;其數字改置進階摺疊區作「架構依賴性」的誠實揭露。合成路線 (a) 確定不用。

**前提 #2:結構化競查(30–60 分鐘,取代十分鐘防呆)。** 關鍵詞至少涵蓋:quantization interactive demo / outlier quantization visualization / LLM.int8 demo / AWQ interactive / INT8 precision slider。已知鄰近在位者:Oakland 課程的 GQA/KV-cache 互動計算器(佔了 KV Cache 題,未佔本題)。競查結論與連結貼入本節,由凜空確認「無著名在位者」後方可 GO。

**2026-07-12 Gemini 深度搜尋競查結論**:英文市場此題互動供給「高度稀疏」、繁中「絕對真空」——**報告判定無著名在位者**(仍待凜空親自確認方可 GO)。指定五組關鍵詞+繁中組全數涵蓋;Oakland KV-cache 計算器確認只佔 KV Cache 題、與本題(權重/激活異常值量化)屬平行領域。盤點表(連結為報告所引,動工時核對):

| 資源 | 互動形式 | 語言 | 涵蓋「異常值毀掉量化→保護救回」敘事? | 在位者判定 |
|---|---|---|---|---|
| Ngrok 量化 blog(ngrok.com/blog/quantization) | 互動滑桿、位元翻轉、動態直方圖 | 英 | 否——僅文字短暫提及長尾異常值,互動未涉 | 否。互動體驗一流但主題停在基礎浮點/對稱量化 |
| Neural Net Compression Vis(xnought.github.io/neural-net-compression-vis) | 互動滑桿、手寫畫板、動態熱區圖 | 英 | **是**——異常值→條件數爆炸→K-means 為其單獨配質心而「意外保護」 | 否,但為**最接近的競爭者**。底層是 K-means 聚類量化(CNN 時代),非當代 LLM PTQ 機制 |
| Abhik Sarkar: Quantization Deep Dive(abhik.ai) | 部分基礎轉換小工具+靜態圖文/程式碼 | 英 | 是(理論文字層面涵蓋 AWQ/GPTQ/SmoothQuant) | 否。高階演算法段退回靜態教學 |
| Sera Habensour: The Outlier Problem(Medium) | 純靜態圖文 | 英 | 是(含 6.7B 湧現、混合精度分解、super-outlier cell) | 否。無任何互動 |
| Maarten Grootendorst: A Visual Guide to Quantization | 靜態資訊圖表 | 英 | 是(截斷/範圍映射層面) | 否。無互動 |
| 超智諮詢 模型量化指南(meta-intelligence.tech) | 靜態圖文+外連 Colab 腳本 | 繁中 | 是(LLM.int8 分解、AWQ 1% 保護、SqueezeLLM 稀疏隔離) | 否。繁中唯一深度長文,網頁本體零前端互動 |
| HuggingFace Spaces 量化工具(openfree 等) | Streamlit 參數表單 | 英 | 否 | 否。功能性無代碼工具,非教學/視覺化 |

**差異化風險註記(競查衍生,GO 後互動設計必須遵守)**:xnought 的工具已把「異常值毀量化→保護救回」的泛用敘事做成互動——本頁的差異化必須落在「**當代 LLM PTQ 機制的互動化**」(6.7B 相變/通道持久性、LLM.int8 混合精度分解、AWQ 1% 縮放保護、SmoothQuant 平滑轉移擇一或多個)+繁中可及性分層,不能只做泛用異常值示意,否則與其撞題。

前提 #2 確認欄(凜空):☑ 確認無著名在位者,前提 #2 解除(附帶條件=互動設計鎖定當代 LLM PTQ 機制,見上方差異化風險註記,避免與 xnought 泛用敘事撞題)日期:2026-07-12

## 3.5 簽核附帶裁決(2026-07-12,凜空「照建議執行」授權後記錄)

1. **範圍紀律**:唯一 Canvas 主互動=「坍縮+拯救切換」(即 Gemini 報告 1 的模組二)。「跨規模湧現」降為一張靜態圖或一句話;「效能/能耗取捨」降為進階摺疊區的靜態引用表。Gemini 報告 1 結尾的三模組藍圖**不採**——違反 PLAN 品質門檻(一頁一個 Canvas 主互動物、控制元件 ≤3),且 12h 前端預算裝不下。
2. **「6.7B 湧現」表述限定**:頁面寫「Dettmers et al. 在 OPT 家族觀察到約 6.7B 的相變」,不寫成普適定律;進階摺疊區以 LLaMA-2-7B(naive W8A8 PPL 僅 +0.11)誠實揭露架構依賴性。claim-source 表補「適用條件」:「天真量化」定義寫死為 per-tensor 對稱 W8A8(換 per-channel 粒度災難減輕,數字會對不上)。
3. **工時挪移**:前提 #1/#2 原編 6h,深搜已消化「搜尋」段,省下的 2–3h 挪給 claim-source 核對;§8 總數 40h 不變。
4. **優先核對清單(最弱引用)**:①bitsandbytes Issue #1867 的編號與能耗/吞吐數字;②「Qwen-3-8B/Koning」AWQ 對比——任一找不到出處即改引 AWQ 論文自己的 LLaMA/OPT 數字,不硬留。bnb「吞吐 -73%」引用時一律限定措辭「在 bitsandbytes 的實作中」(實作特有的慢,非混合精度本質成本)。
5. **留待紙上原型(3h)第一題**:拯救開關體現哪個機制——(甲)LLM.int8 混合精度分解:視覺最直觀(尖刺通道抽出高精度處理)、最貼 aha 句「保護那 1%」,但錨點數字需改核 LLM.int8 論文自己的 OPT 對照表;(乙)SmoothQuant 平滑:保留 4.8→79.3 現成錨點,但 aha 句需微調(機制是「把麻煩搬走」非「隔離保護」)。**禁止甲機制動畫配乙機制數字**。
6. **順序提醒**:本簽核只完成 Phase B 的前置條件。M3 build 整合已完成並通過 `npm run verify`／Depth validator；其 brief 目前為 review-fixes-applied、待凜空裁決，正式部署仍未執行。Phase B 實作仍須依本 memo 的 claim-source 核實條件與凜空裁決，不得把本段視為自動開工授權。

## 4. 競品缺什麼(差異化主張)

- 繁中零供給(互動形式全真空,文字供給亦僅超智諮詢等少數長文)。**——2026-07-12 Gemini 深搜驗證:此宣稱成立**。繁中互動供給=0;靜態深度長文極稀缺(多數繁中文章停留在 load_in_4bit/AutoGPTQ 應用操作層,不觸底層機理);超智諮詢確為少數例外,且其頁面本體零互動(實作只外連 Colab)。
- 可及性分層:現有英文資源(論文、部落格)皆假設 ML 背景;本頁第一層零先備。
- 實測錨點:附可重跑腳本與數據表,非純示意動畫。
- 產品脈絡:嵌在知識圖譜中,前後接 Wonders 站點,非孤島文章。

## 5. 使用者為何收藏/分享

探索者:頓悟體驗本身(「原來 AI 壓縮會壞在這裡」)。工程師:實測數據表+重跑腳本+進階摺疊的推導,具參考工具價值。

## 6. Wonders 銜接

入口:Edge AI Wonder 的 `edge_model_compression` 站(依 2026-07-11 交叉分析報告所引 `data/wonders/edge-ai.json`)。
出口 CTA:回同一站繼續旅程 + related 節點(引用 `all_nodes.json` 既有 id)。
量測:此 CTA 的點擊為 Phase D 產品銜接閘門的依據。

## 7. 一手來源與可驗證數值

核心文獻(動工時逐一以原文核對,含式號):
- LLM.int8():Dettmers et al., 2022, arXiv:2208.07339(異常值湧現、混合精度分解)
- AWQ:Lin et al., 2023, arXiv:2306.00978(1% 顯著權重保護、activation-aware 縮放)
- SmoothQuant:Xiao et al., 2022, arXiv:2211.10438(異常值搬移)
官方實作交叉:bitsandbytes、llm-awq 公開 repo。
可驗證數值:上述論文的困惑度/精度對照表 + 前提 #1 所選路徑的重跑產物。全部進 claim-source 表。

2026-07-12 深搜補充的資料源(動工時逐一核對存在性/授權/數值後才可引用):
- `mit-han-lab/smoothquant` 的 `act_scales/`(逐層通道 abs-max 統計,MIT)——前提 #1 路線 (b) 主原料。
- `examples/smoothquant_opt_demo.ipynb`(OPT-13B:78.6%→4.8%→79.3%)與 `examples/smoothquant_llama_demo.ipynb`(LLaMA-2-7B PPL:5.82→5.93→5.85)——路線 (c) 崩壞/回穩錨點,附可重跑腳本。
- bitsandbytes Issue #1867(threshold 消融:吞吐 -73%、能耗 +30.7%)——進階摺疊區工程取捨素材,issue 編號與數值需核對。
- HuggingFace `mit-han-lab/awq-model-zoo`(AWQ 搜索後量化參數)——備選,非激活分佈。

## 8. 工時分解(硬上限 40h 全含,繁中版)

| 階段 | 預算 h |
|---|---|
| 前提 #1/#2 解決 + 資料考證 | 6 |
| claim-source 表 + 數值/property 測試 | 8 |
| 互動紙上原型(一互動一問題) | 3 |
| 前端實作(含無障礙) | 12 |
| 繁中文案(分層) | 5 |
| QA(no-JS/CSP/鍵盤/雙端 E2E)+ validator | 4 |
| 發布與 manifest/schema 收尾 | 2 |
| **合計** | **40** |

英文版 + HN/Reddit 發布:8–10h,**僅在理解閘門通過後啟動**。
中點檢核:第 20h 若趨勢超支,先砍互動範圍,不砍驗證與無障礙。

## 9. 停止條件

前提 #1 三種路徑皆不可行、競查發現著名在位者、或第 20h 檢核顯示總時將超上限 150% —— 任一成立即 NO-GO,題目退回 BACKLOG,已產出的考證與測試資產保留。

條件式 GO 條款(2026-07-12 增補):claim-source 階段錨點核實(OPT-13B 三聯數字、act_scales 存在性/授權)任一不過 → 前端不動工,回本 memo 重審;視同 NO-GO 處理直到重審完成。
