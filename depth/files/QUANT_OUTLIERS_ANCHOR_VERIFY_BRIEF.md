# Gemini 深度搜尋 Brief — quant-outliers 錨點核實（條件式 GO 解除用）

> 使用方式：整份貼給 Gemini 深度搜尋。這是**驗證任務**，不是發現任務——2026-07-12 的深搜已確認「原料充足」；本輪要對抗性核實那些**具體數字與事實是否真的成立**。任一 Tier 1 項不過，旗艦 quant-outliers 前端不動工、退回 `GO_NOGO_QUANT_OUTLIERS.md` 重審。

## 背景（給你判斷精度用，勿改變任務）

我要做一個**繁體中文、零後端、靜態**的教育互動頁，主題是「LLM 量化時的異常值災難：不到 1% 的極端值能在壓縮時毀掉全部，保護那 1% 幾乎能全數救回」。頁面**不跑模型**——崩壞/回穩的數字是以「引用實測」形態顯示的**引文**，因此每個數字必須對得上**一手來源**且可被讀者查證。這輪核實的產物會進入頁面的 claim-source 對照表（一票否決制）。

## 核心規則（務必遵守）

1. **只認一手來源**：GitHub repo 內的實際檔案/notebook/commit、arXiv 原文（含式號/表號/頁碼）、GitHub issue 原帖。**部落格、二手轉述、Medium、知乎不算通過**——若某數字只在二手文章出現，標為 `未證實`。
2. **對抗性核實**：主動去找「數字錯了」或「metric 定義被悄悄換掉」的證據，不要只確認它看起來合理。特別注意**模型型號**（OPT-13B vs 6.7B）、**量化粒度**（per-tensor vs per-channel）、**評測指標定義**（哪個資料集、哪種 accuracy、幾個樣本）這三類最容易對不上的細節。
3. **給可回溯連結**：盡量給 permalink / commit hash / 檔案路徑 / issue 編號，不要只給 repo 首頁。
4. **找不到就說找不到**，不要用相似結果硬湊。

---

## Tier 1 — GO 閘門（任一不過 → NO-GO，退回重審）

### V1. SmoothQuant OPT-13B 三聯數字

**待核宣稱（逐字）**：在 `mit-han-lab/smoothquant` repo 的 `examples/smoothquant_opt_demo.ipynb`，OPT-13B 於 **LAMBADA 前 1000 樣本、last-token accuracy** 的結果為：
- FP16：**78.6%**
- naive W8A8（per-tensor 對稱量化）：**崩至 4.8%**
- SmoothQuant W8A8：**回穩 79.3%**

**核什麼**：
- (a) 該 notebook 是否真的存在於此路徑；給檔案連結/commit。
- (b) 三個數字是否與 notebook 輸出或 repo README 表格一致（逐字引回）。
- (c) 指標定義：確認是 LAMBADA、last-token accuracy、樣本數；確認 notebook 裡的 "naive/baseline" W8A8 **是否為 per-tensor 對稱**（這點決定災難是否成立——per-channel 會讓崩壞大幅減輕，數字會對不上）。
- (d) 確認該 notebook 用的**確實是 OPT-13B**，不是 OPT-6.7B 或其他規模。

**pass 條件**：三數字 + 模型 + 指標定義全部對得上一手 notebook/README。任一對不上 → V1 FAIL。

**回傳**：三個數字的逐字引用 + notebook 永久連結 + naive 基線的粒度說明。

### V2. act_scales 存在性 + MIT 授權

**待核宣稱（逐字）**：`mit-han-lab/smoothquant` 提供 `act_scales/`——多個主流模型（OPT、LLaMA 等）的**逐層通道絕對最大值統計**，`.pt` PyTorch 字典格式，鍵=層命名空間（如 `model.decoder.layers.0.fc1`）、值=`[hidden_dim]` 一維張量；由 The Pile 驗證集 512 句校準、hook 攔截各線性層輸入取 abs-max 而得。repo 為 **MIT 授權**。

**核什麼**：
- (a) `act_scales` 是否真的可取得——**注意**：可能不是直接 commit 在樹裡，而是透過 repo 內的下載腳本/連結（如 `get_act_scales` 或雲端連結）提供。查清楚**到底怎麼拿到**（in-tree 檔案？下載腳本？外部連結？）。
- (b) 實際提供**哪些模型**的 act_scales（列出來——這決定示範模型 OPT-13B 是否在內）。
- (c) 檔案格式是否如宣稱（.pt 字典、鍵值結構）。
- (d) repo 的 LICENSE 檔是否為 MIT（給連結）。

**pass 條件**：act_scales 確實可取得（in-tree 或有明確下載機制）+ 涵蓋可用模型 + LICENSE 為 MIT。取得管道不明或授權非 MIT → V2 FAIL。

**回傳**：取得方式 + 可用模型清單 + LICENSE 確認連結。

---

## Tier 2 — 最弱引用（不過 → 不 NO-GO，但該引用必須替換或刪除，禁止硬留）

### V3. bitsandbytes Issue #1867（能耗/吞吐消融）

**待核宣稱（逐字）**：bitsandbytes repo 的 **Issue #1867** 報告 Mistral-7B 的 `llm_int8_threshold` 消融——預設 6.0（保護異常值）吞吐 **29.06→7.88 tok/s**、每千 token 能耗 **+30.7%**；threshold=0（不保護）速度回來但精度崩。

**核什麼**：Issue #1867 是否真的講這件事（**編號可能是錯的**——若 #1867 與此無關，去找正確的那個 issue）；確認吞吐/能耗數字與模型。

**pass 條件**：找到對應 issue 且數字對得上 → 保留。找不到或數字/主題對不上 → 標 REPLACE：建議改引可核實的等價來源，或整段降級刪除。

**回傳**：issue 連結 + 逐字數字，或「找不到/不符 → 建議替換」。

### V4. AWQ INT4 對比（Qwen-3-8B）

**待核宣稱（逐字）**：某 AWQ vs RTN 的 INT4 對比引為 **Qwen-3-8B：PPL 9.75→10.08、體積 13.9GB→3.5GB**。（memo 自己已標此為最弱引用之一。）

**核什麼**：此數字/模型出處是否存在且可核。

**pass 條件**：找到一手出處 → 保留。找不到 → 建議改引 **AWQ 論文（arXiv:2306.00978）自己的 LLaMA/OPT 數字**，不硬留 Qwen-3-8B。

**回傳**：出處連結，或「不可核 → 改引 AWQ 論文本身數字（附論文中對應表號）」。

---

## Tier 3 — 支撐性事實（確認即可，風險較低；影響頁面誠實揭露與機制選擇，不影響 GO 閘門）

### V5. LLaMA-2-7B naive W8A8 幾乎不崩

**宣稱**：`examples/smoothquant_llama_demo.ipynb`，LLaMA-2-7B WikiText-2 PPL：**5.82 → 5.93（naive）→ 5.85（smooth）**。此數字是 memo「示範模型定為 OPT-13B、不用 LLaMA-2-7B 當災難示範」決策的依據（naive 只 +0.11，不夠戲劇）。核 notebook 三數字 + 指標。

### V6. 6.7B 異常值湧現（表述限定）

**宣稱**：LLM.int8()（Dettmers et al., 2022, **arXiv:2208.07339**）指出系統性異常值特徵約在 **6.7B 參數（OPT 家族）** 湧現/相變。核：論文是否這樣說，且語氣是「在 OPT 家族觀察到約 6.7B 的相變」**而非普適定律**（頁面會照此限定寫，需確認原文支持限定版）。給論文對應章節/圖號。

### V7.（供機制選擇備用）LLM.int8() 論文自己的 OPT 對照數字

**背景**：頁面「保護那 1%」的救回機制有兩個候選——(甲) LLM.int8 混合精度分解、(乙) SmoothQuant 平滑。V1 給的是**乙**的錨點；若之後選**甲**，需要甲自己的錨點，且 memo 明令「**禁止甲機制動畫配乙機制數字**」。請一併回傳 **LLM.int8() 論文（arXiv:2208.07339）中 OPT 家族在 8-bit 下 with/without 混合精度分解的困惑度/zero-shot 對照數字**（附表號），讓機制選擇不被卡。

---

## 輸出格式（請照此回）

一張總表，每列一個核實項：

| 項次 | 裁決（VERIFIED / MISMATCH / NOT-FOUND / REPLACE） | 逐字數值或事實 | 一手來源連結（permalink/commit/式號/表號） | 細節註記（模型/粒度/指標定義的任何偏差） |
|---|---|---|---|---|

表後補三段：
1. **GO 閘門結論**：V1、V2 是否雙雙 VERIFIED？（這是唯一決定 GO/NO-GO 的兩項）
2. **需替換/刪除的弱引用**：V3、V4 各自處置建議。
3. **核實過程中發現的任何反證或隱藏偏差**（尤其 metric 定義、模型規模、量化粒度被悄悄替換的情形）——即使不影響 GO，也要列出，因為會進頁面的誠實揭露。

---

## 停止條件

- V1 或 V2 任一為 NOT-FOUND / MISMATCH → 直接回報「GO 閘門未過」，不需再美化其他項。
- 不確定時標「不確定」+ 你查到的最接近證據，**不要猜**。

---

## 核實結果 — Tier 1（2026-07-14，凜空授權由 Claude 直接 WebFetch 一手來源核實；未經 Gemini）

> 這是**證據記錄**，非裁決。GO memo 簽核欄的「條件式 GO → 條件解除」由凜空拍板；此處只提供 V1/V2 的一手核實事實。V3–V7（Tier 2/3）尚未核。

| 項 | 裁決 | 逐字事實 | 一手來源 | 細節/偏差 |
|---|---|---|---|---|
| **V1** | **VERIFIED** | notebook 載入 `facebook/opt-13b`；評測 = LAMBADA `validation[:1000]`（前 1000 樣本）、"Last Token Prediction Accuracy"；FP16 **0.786**、naive W8A8 **0.048**、SmoothQuant W8A8 **0.793**（三數字逐字對上）；naive = "8-bit dynamic **per-tensor** weight and activation quantization ... fake quantization" | [smoothquant_opt_demo.ipynb](https://github.com/mit-han-lab/smoothquant/blob/main/examples/smoothquant_opt_demo.ipynb) | (1) 「對稱」已由源碼佐證：`quantize_weight/activation_per_tensor_absmax`（absmax 縮放、q_max=127、無 zero-point = 對稱），見 [fake_quant.py](https://github.com/mit-han-lab/smoothquant/blob/main/smoothquant/fake_quant.py)。(2) notebook 自陳此 last-token acc 為**近似的示範指標**——頁面本就以「引用示範數字」呈現，需在誠實揭露照寫。 |
| **V2** | **VERIFIED** | act_scales 涵蓋 OPT（含 **`opt-13b.pt`**）等多模型；由 512 句 The Pile validation 校準；repo LICENSE = **MIT**（Copyright (c) 2022 MIT HAN Lab） | README + [act_scales/README.md](https://github.com/mit-han-lab/smoothquant/blob/main/act_scales/README.md) + [HF: mit-han-lab/smoothquant-scales](https://huggingface.co/mit-han-lab/smoothquant-scales) + [LICENSE](https://github.com/mit-han-lab/smoothquant/blob/main/LICENSE) | **取得路徑更正**：repo 內 `act_scales/` 目錄**只有一個 README.md（342 B）**，實際 `.pt` 檔**不在樹裡**，是從 HuggingFace `mit-han-lab/smoothquant-scales` 下載（該處確認有 `opt-13b.pt`，另含 opt-1.3b/2.7b/6.7b/30b/66b/175b、llama-2、mistral、mixtral、falcon、bloom）；或用 `generate_act_scales.py` 自行生成。memo 原述「in act_scales/ 目錄」需修為「HF 下載或自行生成」。 |

### GO 閘門結論

- **V1、V2 雙雙 VERIFIED。** 三聯數字（78.6/4.8/79.3）+ 模型（OPT-13B）+ 指標（LAMBADA 前 1000 last-token acc）+ 粒度（per-tensor 對稱 absmax）全對上一手 notebook 與源碼；act_scales（含 opt-13b）可從 MIT 授權的官方 HF repo 取得。
- 條件式 GO 的**核實條件在事實層面已滿足**；是否據此解除條件、放行前端動工，由凜空裁決。
- 兩處需寫進 claim-source 表的更正：act_scales 取得路徑（HF 非 in-tree）、last-token acc 為近似示範指標（誠實揭露）。

## 核實結果 — Tier 2（2026-07-14，同上直接核）

| 項 | 裁決 | 逐字事實 | 一手來源 | 處置 |
|---|---|---|---|---|
| **V3** | **VERIFIED（數字對，但敘事需修）** | issue #1867 為真、編號正確、open/3 comments。標題＝"Default LLM.int8() mixed-precision decomposition causes **17-147% energy overhead** across consumer and datacenter GPUs"。Mistral-7B on RTX 4090D：FP16 **29.06** → INT8 default(threshold=6.0) **7.88** tok/s（−72.9%≈−73% ✓）、能耗 **+30.7%** vs FP16；threshold=0.0 → **14.15** tok/s、能耗 −7.9%。 | [bnb issue #1867](https://github.com/bitsandbytes-foundation/bitsandbytes/issues/1867) | 保留數字。**但兩點必須修**：(1) 此 issue 量的是**能耗/吞吐**、**不量精度**——memo 原述「threshold=0 速度回來但精度崩」的**「精度崩」半句 #1867 不支持**，頁面不得引 #1867 當精度證據，該半句需另尋來源或刪。(2) threshold=0「速度回來」是**部分**（14.15，非回到 29.06）。−73% 吞吐須照 memo §4 限定措辭「在 bitsandbytes 的實作中、此配置(Mistral-7B/4090D)」。issue 把根因指向 mixed-precision 分解的 INT8↔FP16 轉換，正好佐證「實作特有成本、非本質」框架。 |
| **V4** | **NOT-FOUND → REPLACE** | Qwen-3-8B「PPL 9.75→10.08、13.9GB→3.5GB」**查無一手出處**。搜到的 Qwen3 量化研究（arXiv:2505.02214）數字不同（RTN 10.30 / HPTQ 10.10 / BF16 9.73 WikiText），無法佐證該組數字。 | 搜尋無一手命中 | **依 memo 規則改引 AWQ 論文自身數字**（已備）：AWQ 論文 **Table 4（INT4 g128、WikiText-2 PPL）**——LLaMA-7B：FP16 **5.68** / RTN **5.96** / AWQ **5.78**；Llama-2-7B：**5.47** / **5.73** / **5.60**。來源 [AWQ arXiv:2306.00978](https://arxiv.org/abs/2306.00978)。刪 Qwen-3-8B，改用此組。 |

## 核實結果 — Tier 3（2026-07-14，同上直接核）

| 項 | 裁決 | 逐字事實 | 一手來源 | 細節/偏差 |
|---|---|---|---|---|
| **V5** | **VERIFIED（微修）** | notebook 載 `meta-llama/Llama-2-7b-hf`；WikiText-2 PPL 輸出逐字：FP16 **5.822948…**、Naive W8A8 **5.931240…**、SmoothQuant W8A8 **5.856341…** | [smoothquant_llama_demo.ipynb](https://github.com/mit-han-lab/smoothquant/blob/main/examples/smoothquant_llama_demo.ipynb) | naive 僅 +0.11（5.82→5.93）成立，**支撐「災難示範用 OPT-13B、不用 LLaMA-2-7B」決策**。微修：smooth 是 **5.86**（5.856 四捨五入），memo 寫 5.85 要改。 |
| **V6** | **VERIFIED（限定表述成立）** | 逐字："At around **6.7B** parameters, a **phase shift** occurs, and all transformer layers and 75% of all sequence dimensions are affected by extreme magnitude features."；"…occurs suddenly between **6B and 6.7B** parameters"。測到 13B、跨 GPT-2/OPT/EleutherAI 家族。 | [LLM.int8() arXiv:2208.07339](https://arxiv.org/abs/2208.07339) | 是**經驗觀察非普適定律**——memo 的限定寫法正確。**額外誠實揭露**：此「突變」是以**異常值特徵計數**度量才呈相變；論文 Fig 3(b) 指出**以困惑度度量則是平滑（指數）湧現**。頁面若寫「相變」須註明是哪個度量下的，否則過度戲劇化。 |
| **V7** | **VERIFIED（甲機制錨點已備）** | **Table 1（C4 validation PPL）**：6.7B — 32-bit 13.30 / Int8 absmax 14.59 / LLM.int8() 13.24；**13B — 32-bit 12.45 / Int8 absmax 19.08 / LLM.int8() 12.45**。"regular quantization methods fail, while LLM.int8() maintains 16-bit accuracy"。 | 同上 arXiv:2208.07339 | 若紙上原型選**甲**（LLM.int8 混合精度分解）當救回機制，用**這組**（禁配乙的 4.8→79.3）。註記：甲的數字戲劇性**低於**乙（PPL 12.45→19.08 vs 乙的 acc 78.6%→4.8%），因指標與量化設定不同——這正是 §3.5 點 5 甲/乙取捨的實際權衡。 |

## 全項總結（V1–V7）

- **Tier 1 GO 閘門**：V1、V2 VERIFIED → 條件事實已滿足（解除條件仍待凜空裁決）。
- **Tier 2**：V3 保留（刪「精度崩」半句、限定 −73% 措辭）；V4 REPLACE（Qwen-3-8B → AWQ 論文 Table 4）。
- **Tier 3**：V5 VERIFIED（smooth 微修 5.85→5.86）；V6 VERIFIED（限定表述正確，補「相變是計數度量下、困惑度下為平滑」誠實揭露）；V7 VERIFIED（甲機制 Table 1 錨點備妥）。
- **進頁面 claim-source 表時的待辦淨清單**：① act_scales 取得路徑改 HF；② last-token acc 標近似示範指標；③ 刪 #1867 的精度崩敘述、限定吞吐措辭；④ Qwen-3-8B 換 AWQ Table 4；⑤ smooth PPL 5.85→5.86；⑥ 6.7B「相變」註明度量。全部是措辭/引用精修，無一動搖 GO。
