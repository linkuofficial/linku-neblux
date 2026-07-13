# Claim–Source 對照表：transformer

## 頁面：`transformer`｜審查人：待凜空｜外部審查：Terra

範圍：`depth/transformer.html` 中對讀者可見或由輔助技術讀出的技術陳述。頁面示例的 Q／K／V 與 0.83／0.72／0.99 均為手工常數的本地運算結果，不是論文實驗數據。依 `SPEC_DELTA.md` C3，本輪所有列保留 `pending`。

| # | 頁面陳述（逐字） | 類型 | 一手來源（含式號／頁碼／表號） | 適用條件 | 驗證方式（測試檔／notebook 路徑） | 狀態 |
|---|---|---|---|---|---|---|
| 1 | 每個字看著其他字，混出新的意思——用一顆注意力頭拆開『it』指誰是怎麼算出來的。 | 定義／因果 | [S1] §3.2.1, Eq. (1) 定義 attention output 為 value 的加權和；§3.2.2 定義 multi-head attention。 | 本頁只示範單頭、無遮罩、手工 Q/K/V 的 7-token 計算；「it 指誰」是作者設計出的示意結果，不是受訓模型的共指解析證據。 | 對照 `depth/transformer.js` 的常數、`computeMatrix()` 與 `VALUES=KEYS`；本地重算 [V1]。 | pending |
| 2 | 一個字的意思，是它挑著看的其他字，混出來的。 | 定義 | [S1] §3.2：attention 將 query 與 key-value pairs 映射成 output，output 是 values 的加權和。 | 只描述該 attention sublayer 的輸出；token representation 還受 residual、layer normalization、FFN、其他 heads/layers 等影響，不能當成完整 Transformer 的語義定義。 | 凜空確認白話範圍限於本頁單頭 attention output。 | pending |
| 3 | 像在吵雜的房間聽人講話：你自動把注意力多分給重要的聲音——每個字也這樣挑著「聽」其他字。 | 定義 | [S1] §3.2 支持按 compatibility 權重混合 values；不支持人類聽覺比喻或「重要」是客觀屬性。 | 比喻；attention weight 是由 query-key 計算出的模型係數，不必等於人類可解釋的重要性。 | 待凜空確認不把 weight 直接宣稱為人類語義重要度。 | pending |
| 4 | 在一個句子裡，每個字都在偷偷決定：其他的字，各要看多重。看得越重的，就越多地混進它自己新的意思裡——代名詞「it」到底指誰，就是這樣被決定的。 | 因果 | [S1] Eq. (1) 支持每個 query 對 keys 產生 weights 並加權 values；不直接支持此手工句子的共指結論。 | 僅限本頁無遮罩 self-attention；「it 指誰」由手工常數強制產生，不能推廣為真實模型必然機制或可解釋性結論。 | [V1] 重算 `it→cat`；人工確認 disclosure 與原句的因果強度是否一致。 | pending |
| 5 | 這一頁只想讓你看見一件事：一個字更新後的意思，是它對句子裡每個字分配的注意力、加權混合出來的。 | 定義 | [S1] §3.2, Eq. (1)。 | 只指 attention output；完整 sublayer output 還含 output projection、residual 與 layer normalization。 | 對照 [S1] Figure 2 與 §3.1；凜空裁決是否需加「在這顆頭裡」。 | pending |
| 6 | 互動只拆開「一顆注意力頭、一個固定句子」這件事，用的 Q／K／V 是為了看得清楚而手挑的固定數字，不是訓練出來的。多頭、位置編碼、前饋層、堆疊與訓練，在下面「拉遠看」一段補齊位置。 | 定義 | [S1] §§3.1–3.5 說明 multi-head、position-wise FFN、embeddings/softmax、positional encoding；手工常數由本地 `transformer.js` 定義。 | 這是頁面範圍 disclosure。Q/K/V 是手工 activation vectors；真實模型通常學的是投影矩陣 `W_i^Q/W_i^K/W_i^V`，再由輸入算出 Q/K/V。 | 對照 `KEYS`、`QUERIES`、`VALUES` 與 [S1] Eq. (2)。 | pending |
| 7 | 點上面句子裡的字，看它從自己的位置望出去，注意力落在哪些字身上——最亮的那個，就是它最在意的。 | 定義 | [S1] §3.2.1：softmax 後的 weights 乘到 values。 | 「最在意」只表示該列最大 attention weight；不是經驗性的重要性、因果影響或模型解釋保證。 | 對照 `argmax(row)`、`updateReadout()`。 | pending |
| 8 | 你點的字（q，橫列） | 定義 | [S1] §3.2.1 的 query 與 keys；矩陣式 Eq. (1)。 | 每橫列固定一個 query token；本頁 Q 是手工 4 維向量。 | 對照 `computeMatrix()` 外層 `TOKENS.map(qt)`。 | pending |
| 9 | 被看的字（k，直行） | 定義 | [S1] §3.2.1。 | 每直行固定一個 key token；本頁 K 是手工 4 維向量。 | 對照 `computeMatrix()` 內層 `TOKENS.map(kt)`。 | pending |
| 10 | 格子越亮＝看得越重（w） | 定義 | [S1] Eq. (1) 的 softmax weights；視覺映射是本地實作。 | 亮度單調對應 `w_ij`，但不是外部物理量。 | 對照 `drawHeatmap()` 的色彩映射與矩陣值。 | pending |
| 11 | 注意力熱圖：每一橫列＝從某個字「看出去」，格子越亮＝看那個字越重；整列加起來剛好是 1。滑到任何一格，看它是「誰看誰」。 | 定義／公式 | [S1] Eq. (1) 使用 row-wise softmax；softmax 定義見 [S2] Eq. (1)。 | 對每個有限實數 score row，`w_ij=e^{s_ij}/Σ_k e^{s_ik}`，因此非負且列和為 1；浮點實作僅在容差內等於 1。 | [V1] 對 7 列重算，最大列和誤差小於 `5e-16`；程式自檢容差 `1e-9`。 | pending |
| 12 | 從「it」看出去，最亮的是「cat」（0.83）。 | 數值 | 外部來源只支持算法 [S1]；`0.83` 完全由本頁手工 Q/K 常數導出。 | `T=1`、`d=4`、`q_it=[2.5,0,0,0]`、頁面既定 K table，無 mask。顯示值四捨五入至小數二位。 | [V1]：`it→cat=0.8335599728`；對照 `console.assert` 與 readout。 | pending |
| 13 | 看每一列：不管選哪個字，一整列的亮度加起來都一樣多——注意力被分給七個字，總和不變。 | 公式／因果 | [S2] Eq. (1)；本頁有 7 個 tokens。 | softmax 定義保證 weights 列和 1；「亮度加起來」是白話，像素亮度本身未必線性可加。 | [V1] 重算每列 weights；確認文案指 weight 而非 RGB luminance。 | pending |
| 14 | 拉 T：把注意力從「死盯一個」慢慢拉成「平均看每一個」。總和有變嗎？ | 公式／因果 | [S2] §2, Eq. (1) 定義 temperature softmax；較高 T 產生較 soft distribution。 | 本頁 `w=softmax(score/T)`，當 `T→∞` 才趨近均勻；slider 上限 4 不保證完全平均。所有 `T>0` 列和仍為 1。T 是教學控制，不是 [S1] attention 公式的 UI 參數。 | 掃描 `T=0.25…4` 計算 entropy、argmax 與列和；目前無獨立測試檔。 | pending |
| 15 | Transformer 流程：文字變向量、加位置、多頭自注意力、前饋層、疊很多層、輸出下一個字 | 定義 | [S1] Figure 1、§§3.1–3.5。 | 原論文是 encoder-decoder machine translation；decoder 以 linear+softmax 預測 next-token probabilities。圖省略 residual connections、layer norm、masked decoder attention、encoder-decoder attention 與 output projection。 | 對照 [S1] Figure 1；凜空確認簡圖省略項不造成「完整流程」誤讀。 | pending |
| 16 | 多頭——同時開很多顆你剛玩的頭，各自關注不同的關係（誰指誰、誰形容誰…），結果拼在一起。 | 定義／因果 | [S1] §3.2.2, Eq. (2)：heads concatenate 後乘 `W^O`；原文說 heads 可 joint attend to different representation subspaces。 | 不保證每顆頭具有穩定、可命名的人類語法關係；「誰指誰」只是可能的教學例。拼接後還有 output projection。 | 對照 Eq. (2)；凜空確認「各自關注不同關係」不是保證。 | pending |
| 17 | 位置編碼——先把「字的順序」加進向量，不然「貓咬狗」和「狗咬貓」分不出來。 | 因果 | [S1] §3.5：因模型不含 recurrence/convolution，必須注入 token 相對或絕對位置資訊；位置編碼加到 embeddings。 | 對不含其他順序訊號、對 token 排列等變的 self-attention 而言成立；實際模型可用其他位置機制，不限原論文 sinusoidal encoding。 | 交換 token 順序但不加 position，人工核對 attention 的 permutation equivariance；目前無測試。 | pending |
| 18 | 前饋層——注意力混完之後，每個字自己再過一層加工。 | 定義 | [S1] §3.3, Eq. (3)：position-wise FFN 對每個 position 分別且相同地套用兩個 linear transformations 與 ReLU。 | 原論文 FFN 是兩個線性層加非線性，不是含糊的單一「一層」；各位置參數共享。 | 對照 [S1] Eq. (3)。 | pending |
| 19 | 疊 N 層——這一套重複幾十層，意思越混越抽象，最後輸出「下一個字」的機率。 | 定義／數值／因果 | [S1] §3.1 原始 Transformer encoder/decoder 各堆疊 `N=6`；§3.4 輸出 linear+softmax。 | 「幾十層」不受原論文支持，且不同模型深度不同；「越抽象」是未定義的詮釋。下一 token 機率只描述 autoregressive decoder。 | 待凜空限縮為「重複多層」或補指定模型的一手來源。 | pending |
| 20 | 訓練——真正的 Q／K／V 是從大量文字裡學出來的；這頁為了看得清楚，用手挑的數字。 | 定義／因果 | [S1] Eq. (2) 定義 learned projection matrices `W_i^Q/W_i^K/W_i^V`；§5 說明 WMT translation training data。 | 精確說法是投影矩陣在訓練中學得，Q/K/V 是輸入 representations 經投影後的 activation；不是三張固定 token 表直接「從文字學出」。資料也不一定只含文字（跨模態 Transformer）。 | 對照本地常數與 [S1] Eq. (2)；凜空裁決改寫。 | pending |
| 21 | ChatGPT、Claude 這類 AI——GPT 的「T」就是 Transformer；它回你話時，每個字都在做你剛玩的注意力計算。 | 定義／因果 | [S3] §2.1 支持 GPT-3 使用 Transformer-based architecture 與 attention；核准來源組不足以驗證各版 ChatGPT／Claude 的完整未公開架構。 | 生產模型可能使用不同 attention 變體、稀疏／分組／多查詢機制與 KV cache；「每個字都在做你剛玩的計算」忽略多層、多頭、mask、cache 與其他子層。 | 待凜空限縮為 GPT 名稱與 Transformer 家族概念；Claude 部分保留未核。 | pending |
| 22 | Google 翻譯——Transformer 2017 年就是為翻譯而發明的（論文《Attention Is All You Need》）。 | 定義／因果／數值 | [S1] abstract、§5：2017 paper 在 WMT 2014 English-German／English-French translation tasks 評估。 | 「為翻譯而發明」是動機簡寫；論文提出通用 sequence transduction architecture。這不證明當前 Google Translate 的指定版本仍採相同架構。 | 對照 [S1] abstract 與 §5；當前產品實作不在核准來源範圍，保留 pending。 | pending |
| 23 | 程式補全（Copilot）——看你寫到一半的程式碼，把注意力放在相關的變數和函式上。 | 因果 | [S1] 只定義 attention，未涵蓋 Copilot；核准來源組沒有可直接證明此產品內部 attention 對特定變數／函式的資料。 | 這是可能的直覺，不是可觀測或保證的 head 行為；attention weights 不應直接當成產品解釋。 | 待指定 Copilot 版本的一手技術來源，或改成非產品化的一般程式碼模型例子。 | pending |
| 24 | AlphaFold 蛋白質結構——同一套注意力，看的不是字，是胺基酸之間誰跟誰有關。 | 定義 | [S4] Methods／Supplementary Methods 描述 Evoformer attention、MSA/pair representations 與 invariant point attention。 | AlphaFold2 不是把原始文字 attention 原封不動套到胺基酸；它有 MSA row/column attention、triangle updates 與幾何 IPA。「同一套」只能指 attention 家族概念。 | 對照 [S4] Figure 1 與 Methods；凜空裁決簡化程度。 | pending |
| 25 | score_ij = (q_i · k_j) / √d | 公式 | [S1] §3.2.1, Eq. (1) 的 elementwise form；論文記號為 `√d_k`。 | `q_i,k_j∈R^{d_k}`，本頁 `d=d_k=4`；dot product 為 4 維內積。若 Q/K 維度不同或用其他 attention kernel，公式不適用。 | 對照 `dot(q,k)/SQRT_D/T`；`T=1` 時與公式相同。 | pending |
| 26 | w_ij = softmax_j(score_ij) = exp(score_ij) / Σ_k exp(score_ik) | 公式 | [S1] Eq. (1)；softmax 明式見 [S2] Eq. (1)。 | softmax 對固定 query `i` 沿 key index `j` 計算；頁面分母 dummy index 用 `k`，不可和 key vector `k_j` 混淆。所有 scores 為有限實數。 | 對照 `softmaxStable()`；max-subtraction 不改變數學結果。 | pending |
| 27 | output_i = Σ_j w_ij · v_j | 公式 | [S1] §3.2, Eq. (1)。 | `w_ij` 為對 key `j` 的權重，`v_j∈R^{d_v}`；單頭輸出仍需在 multi-head 情境拼接與 `W^O` projection。 | 對照 `VALUES` 與 weighted sum 的概念；頁面目前只畫權重，沒有直接計算完整 output vector。 | pending |
| 28 | d = 4，√d = 2。 | 數值／公式 | 本地手工常數；算法形狀見 [S1] Eq. (1)。 | 本頁 q/k 向量恰有 4 個 feature axes，所以 `d_k=4`、`√d_k=2`；不是外部模型參數。 | [V1] 檢查所有 Q/K 長度為 4 並計算 `Math.sqrt(4)=2`。 | pending |
| 29 | q_i·k_j／√d，還沒正規化的原始比對分數（選中那列七格的原始強度）。 | 定義／公式 | [S1] §3.2.1, Eq. (1)。 | `q·k/√d_k` 是 pre-softmax logit；熱圖實際畫的是 softmax 後 weight，不是 raw score，「七格原始強度」僅概念對應。 | 對照 `computeMatrix()` 的 scores 與輸出 matrix。 | pending |
| 30 | 縮放係數＝2，讓 softmax 不要太快飽和；跟下面的 T 滑桿是同一件事的教學版。真實模型 d≈64 時 √d=8。 | 數值／因果 | [S1] §3.2.1：假設 q/k components independent、mean 0、variance 1，dot product variance 為 `d_k`；縮放避免推入 softmax 極小梯度區。原始 base Transformer §3.2.2 設 `d_k=d_v=d_model/h=64`。Temperature 見 [S2]。 | `d_k=64` 只對原論文 base/big 配置，不代表所有「真實模型」。`√d_k` 與 T 都縮放 logits，但來源與用途不同；頁面 T 是額外教學旋鈕。縮放不保證每個任意輸入都較不尖銳。 | [V1] 在此固定 row 比較 scale=2 與 scale=1；凜空裁決「同一件事」與「真實模型」措辭。 | pending |
| 31 | 把一整列七個分數壓成加起來剛好＝1 的比例——就是下面那條長條被剛好填滿。 | 定義／公式 | [S2] Eq. (1)。 | 數學 weights 列和為 1；Canvas 長條像素會受浮點與邊界繪製影響，但程式最後一段補到右界。 | [V1] 重算 row sums；對照 `drawStackedBar()`。 | pending |
| 32 | token j 傳出去的內容；這個 demo 用 v=k 簡化，真實模型會學一個獨立的 W_V。 | 定義 | [S1] §3.2.2, Eq. (2) 定義獨立 learned `W_i^V`；本地 `VALUES=KEYS`。 | `v=k` 完全是頁面簡化，且代表數值相同，不代表 key/value 角色相同。原論文每 head 有自己的 value projection。 | 靜態檢查 `const VALUES = KEYS`；對照 [S1] Eq. (2)。 | pending |
| 33 | 混合完的新向量：以 it 為例，output ≈ 0.83·v_cat + 0.07·v_it + …，幾乎全落在 ENTITY 軸上——it 接手了 cat 的身分。 | 數值／因果 | 加權和算法見 [S1] Eq. (1)；係數與 ENTITY 軸為本地手工資料。 | `T=1`、本頁 Q/K/V，且 `v=k`。精確前兩權重為 0.8335599728 與 0.0684227692；「接手身分」是作者賦予手工 feature axis 的詮釋，不是模型共指證據。 | [V1] 重算完整 output 約 `[2.5691,0.0392,0.0392,0.1860]`；待凜空口述每一項。 | pending |
| 34 | 拿掉 √d 的縮放，it→cat 的分數會從 0.83 衝到 0.99：差距被放大，softmax 幾乎整個押在同一格上（飽和）。√d 就是用來擋住這件事。 | 數值／因果 | 一般 scaling 理由見 [S1] §3.2.1；0.83／0.99 是本頁手工常數結果。 | 此處「分數」實為 softmax weight，不是 raw score。原始 scaled logits 中 `it·cat/2=3.75`；不縮放為 7.5。結果分別 0.8335599728、0.9905860950。單一示例不能證明所有 inputs 都同樣變化。 | [V1] 以 stable softmax 重算兩列；對照 `computeRowNoScale()`。 | pending |
| 35 | 這頁只教一顆注意力頭的核心，不代表整個節點的範圍。 | 定義 | [S1] Figure 1–2、§§3.1–3.5 顯示 Transformer 還包含多頭、FFN、residual/layer norm、position、stacked encoder/decoder 等。 | 正確的 scope disclosure；本頁另省略 masking、cross-attention 與 output projections。 | 對照 [S1] 架構與本地 Scope Note。 | pending |

## 來源索引

- **S1 — Ashish Vaswani et al., “Attention Is All You Need”, NeurIPS 2017, pp. 2–5, §3, Eq. (1)–(3), Figure 1–2.** 原始 Transformer、scaled dot-product attention、multi-head、FFN、embeddings/softmax 與 positional encoding：<https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf>
- **S2 — Geoffrey Hinton, Oriol Vinyals, Jeff Dean, “Distilling the Knowledge in a Neural Network”, 2015, §2, Eq. (1).** softmax 明式、temperature softmax 與較高 T 產生較 soft distribution：<https://www.cs.toronto.edu/~hinton/absps/distillation.pdf>
- **S3 — Tom B. Brown et al., “Language Models are Few-Shot Learners”, NeurIPS 2020, §2.1, Table 2.1.** GPT-3 的 Transformer-based autoregressive architecture：<https://papers.nips.cc/paper_files/paper/2020/file/1457c0d6bfcb4967418bfb8ac142f64a-Paper.pdf>
- **S4 — John Jumper et al., “Highly accurate protein structure prediction with AlphaFold”, _Nature_ 596, 583–589 (2021), Methods and Supplementary Methods.** Evoformer attention、MSA/pair representation 與 invariant point attention：<https://doi.org/10.1038/s41586-021-03819-2>

## 本地可重跑驗證

- **V1 — 手工常數重算。** 直接讀 `depth/transformer.js` 的 `TOKENS`、`KEYS`、`QUERIES`，以 `softmax((q·k)/√4)` 重算：`it→cat=0.8335599728`、`it→it=0.0684227692`、`hid→cat=scared→cat=0.7224020953`；不除 `√4` 時 `it→cat=0.9905860950`。每列和與 1 的差低於 `5e-16`。目前驗證命令是一次性 Node 算式，尚未形成獨立測試檔；頁面自身另有 `console.assert` 容差檢查。

## Terra 外部審查摘要

- #4、#33 把手工設計的 `it→cat` pattern 說成「共指被決定」；這只能是教學示意，不能當成受訓模型或 attention 可解釋性的證據。
- #6、#20 的「Q/K/V 學出來」不夠精確；真實模型學的是 projection matrices，Q/K/V 是輸入經投影產生的 activation。
- #14 的 T slider 與 `√d_k` 都縮放 logits，但 T 是額外教學參數；原始 scaled dot-product attention 沒有這支 slider。
- #19 的「幾十層」不受原論文支持；原始 Transformer 是 `N=6`，不同現代模型深度各異。
- #21 不能用公開核准來源確認所有 ChatGPT／Claude 版本都逐字執行與本頁相同的 attention；產品模型可能有不同 attention 變體與快取。
- #23 的 Copilot 變數／函式 attention 是直覺敘述，沒有可直接觀測的產品一手證據。
- #24 的 AlphaFold 使用 attention 家族，但不是把文字 Transformer 原封不動改成胺基酸。
- #30 的 `d≈64` 只符合原論文每 head `d_k=64` 配置，不能泛稱所有真實模型。
- #34 的 0.83／0.99 是 softmax weights，不應稱為 raw「分數」；raw scaled/unscaled logits 是 3.75／7.5。
- 0.83、0.72、0.99 與 row-sum 已本地重算，但依 C2 尚缺正式、可重跑的純函式單元測試；本任務不修改 JS 或新增測試。

## 2026-07-13 增補：可重跑驗證（V2）與術語對照

- **V2 — `depth/transformer-claim-check.mjs`**（`node depth/transformer-claim-check.mjs`，退出碼 0＝全過）：V1 的一次性 Node 算式已固化成可重跑腳本——TOKENS/KEYS/QUERIES 與 `computeMatrix`/`computeRowNoScale` 直接從出貨的 `depth/transformer.js` 抽出執行，對照本腳本獨立實作的 softmax 與加權和。對列映射：T0↔#32（`const VALUES = KEYS;` 靜態契約仍在、√d=√4=2）、T1↔#31（七列和＝1、整個矩陣≡獨立重算）、T2↔#4/#33/#34（0.8335599728／0.0684227692／0.7224020953／0.9905860950；raw logit 3.75/7.5 與 softmax 權重之別）、T3↔#33（output_it≈[2.5691, 0.0392, 0.0392, 0.1860]，ENTITY 軸佔比 90.7%）、T4↔#14/#30（T 升高每列熵單調上升＝分布越軟；T=1＝scaled dot-product 原式）。2026-07-13 執行：**12 檢查全過**。Terra 摘要點名的「缺正式可重跑純函式單元測試」由本腳本補上（未動頁面 JS）。
- 術語對照（人工核對翻譯用）：

| 頁面用語 | 來源英文 | 備註 |
|---|---|---|
| 注意力／自注意力 | attention / self-attention | — |
| 查詢／鍵／值 | query / key / value (Q/K/V) | 真實模型學的是投影矩陣 W_Q/W_K/W_V，Q/K/V 是投影後的 activation（Terra #6/#20） |
| 縮放點積注意力 | scaled dot-product attention | [S1] Eq. (1) |
| 注意力權重 w_ij | attention weight | softmax 之後的比例；不是 raw 分數（#34） |
| 分數 score | (raw) score / logit | q·k/√d，softmax 之前 |
| 溫度 T | temperature | [S2]；原式沒有 T，屬教學旋鈕（#14、#30） |
| 飽和 | saturation | softmax 幾乎全押同一格 |
| 多頭 | multi-head attention | 本頁單頭簡化（#35 誠實揭露） |
| 前饋網路 | feed-forward network (FFN) | 本頁未涵蓋 |
| 位置編碼 | positional encoding | 本頁未涵蓋 |
| 共指 | coreference | it→cat 為手工示意，非受訓模型證據（Terra #4/#33） |
| 點積 | dot product | — |
