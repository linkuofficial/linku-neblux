# Claim–Source 對照表：fourier-series

## 頁面：`fourier-series`｜審查人：待凜空｜外部審查：Terra

範圍：`depth/fourier-series.html` 中對讀者可見或由輔助技術讀出的技術陳述。依 `SPEC_DELTA.md` C3，不同 AI 模型只能協助找錯，不能替代人的技術審查，因此本輪所有列均保留 `pending`。

| # | 頁面陳述（逐字） | 類型 | 一手來源（含式號／頁碼／表號） | 適用條件 | 驗證方式（測試檔／notebook 路徑） | 狀態 |
|---|---|---|---|---|---|---|
| 1 | 用越來越多顆弦波，把一個有直角的方波一層層疊出來。 | 定義／因果 | [S1] MIT OCW, Ch.4, Example 1, Eq. (7)–(8)；[S2] MIT 18.03, Lecture Note 21 的 standard square wave 展開式。 | 僅限週期 `2π/ω`、振幅 `±1`、50% duty、奇對稱的理想方波；有限項只能逼近，不會真的產生不連續直角。 | 對照 `depth/fourier-series.js` 的 `synth()`；待補純函式係數與取樣測試。 | pending |
| 2 | 有直角的方波，是一堆圓滑弦波疊出來的。 | 定義 | [S1] Eq. (8)；[S2] standard square wave 展開式。 | 指無限 Fourier 級數在連續點的極限；跳躍點收斂到左右極限平均值，不是有限數量弦波真的具有直角。 | 凜空確認「一堆」不會被理解成有限項精確等於方波；對照 [S2] 的收斂條件。 | pending |
| 3 | 幾顆圓滑的弦波，合起來變成有直角的方波 | 定義 | [S1] Eq. (8)。 | 這是 SVG 的 `aria-label`；「幾顆」若解作有限項則不精確，有限連續函式之和仍連續。 | 以連續函式有限和仍連續的性質人工核對；待凜空裁決是否需改成「逼近」。 | pending |
| 4 | 像合唱：一個人的聲音是圓的，人數夠、比例對，合起來就能唱出直角。 | 定義 | [S1] Eq. (7)–(8) 支持頻率與係數的特定比例；不直接支持「人聲」比喻。 | 只作比喻；精確方波需要無限項，有限 `N` 僅逼近，且人聲不是單一純弦波。 | 待凜空確認比喻不會被當成聲學事實。 | pending |
| 5 | 目標：方波（虛線） | 定義 | [S1] Figure 4.1 的 odd square wave，取值 `±1`。 | 頁面目標為兩週期、50% duty、`±1` 的理想方波；跳躍點的單點值不影響 Fourier 係數。 | 對照 `drawTargetSquare()`、`targetVal()` 與 `CYCLES=2`。 | pending |
| 6 | 你疊出來的（前 N 顆弦波） | 定義／公式 | [S3] p.1 Eq. (2) 把前 `N` 個奇次項寫成 `S_{2N-1}`。 | 本頁 `N` 是「奇次項的數量」，不是最高 harmonic index；最高頻率為 `(2N-1)ω`。 | 對照 `synth()`：`k=0…N-1`、`n=2k+1`；滑桿 `N=1…8` 對應最高 `15ω`。 | pending |
| 7 | 淡色面積＝還差多少 | 定義／數值 | 本句是頁面實作契約；[S1]／[S3]只支持目標與 partial sum，不支持此填色是已定義的誤差範數。 | 淡色區只是逐點兩曲線之間的幾何填色，不等於已計算的 `L¹`、`L²`、均方誤差或百分比。 | 對照 `drawGapFill()`；確認頁面沒有把面積輸出成數值。 | pending |
| 8 | 剛加入的那顆（拖 N 時短暫顯示） | 定義／公式 | [S1] Eq. (8)；第 `N` 個奇次項為 `(4/π)sin((2N-1)ωt)/(2N-1)`。 | 只在增加 `N` 時可稱「加入」；目前程式在降低 `N` 時也把新的第 `N` 項顯示出來，語意需凜空核對。 | 對照 `kickNewWave(state.count)` 與 `drawNewWave()`。 | pending |
| 9 | 只疊 1 顆：一條圓圓的弦波，離方波還很遠。 | 定義 | [S1] Eq. (8) 的第一項 `(4/π)sin(ωt)`；[S3] p.1 的 one-term discussion。 | 「很遠」是定性描述，未指定距離度量；第一項振幅 `4/π≈1.273`，不是單位振幅。 | 計算 `synth(t,1)`；若要量化需先選誤差範數。 | pending |
| 10 | 一路疊到 8 顆：形狀愈來愈方，但盯著轉角——突起變窄了，卻沒消失。 | 因果／數值 | [S3] p.1：最大過衝不隨 `N` 消失，最大值趨近約 `1.089`（該講義使用 0/1 方波），位置趨近跳躍點；[S4] 說明 ripple 集中到不連續點附近而最大誤差不消失。 | `8 顆` 是頁面上限，不是定理門檻；「愈來愈方」只作整體視覺趨勢，不能解作逐點或一致單調改善。 | 對照 `synth()` 在 `N=1…8` 的取樣；待補自動測試最大值位置與局部寬度。 | pending |
| 11 | 「拆成弦波」是整個訊號世界的地基 | 定義／因果 | [S5] NIST DLMF §1.8 Eq. (1.8.1)–(1.8.2) 定義週期函式 Fourier series 與係數。 | 修辭性總括；Fourier series 適用週期訊號，非週期訊號通常用 Fourier transform，離散系統還有 DFT/DCT/filter bank 等不同表示。 | 待凜空確認不把 Fourier series 與所有頻域方法混為一談。 | pending |
| 12 | MP3 與串流音樂——把聲音拆成頻率成分，耳朵聽不到的直接丟掉，檔案就小了。 | 因果 | [S6] Fraunhofer 原始 MP3/Layer III 論文介紹 psychoacoustic perceptual coding；[S7] Fraunhofer 研究說明輸入分幀、分解成 time-frequency segments，利用 masking threshold 配置量化雜訊。 | MP3 使用 hybrid filter bank／MDCT 與感知量化，不是直接套用本頁的 Fourier 級數；「直接丟掉」過度簡化，實作多為受遮蔽門檻控制的量化與 bit allocation。「串流音樂」不必然使用 MP3。 | 來源核對；需凜空決定改成 codec-neutral 的感知編碼敘述。 | pending |
| 13 | 等化器（EQ）——音樂 App 拉「低音／高音」滑桿，就是在調各頻率成分的大小。 | 定義／因果 | [S8] MIT 6.003 Lecture 17 以 electronic equalizer 與 frequency response 為例；訊號頻率分解基礎見 [S5]。 | 只作線性時不變濾波器的概念模型；實際 App 可含動態處理、非線性或多段濾波，滑桿不一定逐一對應單一 Fourier 分量。 | 來源核對；若保留「就是」，凜空需確認可接受此教學簡化。 | pending |
| 14 | JPEG 圖片——影像版的同一招：把圖拆成頻率成分再壓縮，丟掉眼睛不敏感的高頻。 | 定義／因果 | [S9] ITU-T T.81／ISO/IEC 10918-1，Annex F（sequential DCT mode）；[S10] ITU-T T.873 §§D.5–D.8 說明 quantization table、DCT/IDCT；T.81 Annex K 為示例量化表。 | Baseline JPEG 對 8×8 區塊做 DCT 並量化係數，不是 Fourier series；量化不等於一律「丟掉高頻」，低頻也會量化，高頻也可能保留；視覺敏感度由量化表設計近似利用。 | 對照標準章節；凜空裁決是否改成「較粗略量化較不敏感的成分」。 | pending |
| 15 | 電力與電路——方波訊號、馬達雜訊都由諧波組成；工程師用這個總和找出干擾來自哪一顆弦波。 | 定義／因果 | 方波諧波見 [S1] Eq. (7)–(8)；[S11] IEEE 3002.8-2018 僅支持工業／商業電力系統 harmonic studies；未找到足以支持所有「馬達雜訊」及可歸因到單一弦波的通用一手來源。 | 僅週期性穩態成分可用離散諧波描述；馬達噪音也可含寬頻、暫態與機械／電磁多源成分。「哪一顆弦波」過度單一化。 | 待凜空限制範圍或指定案例與量測頻譜；目前無本地測試。 | pending |
| 16 | 方波(t) ≈ (4/π)·[ sin(ωt) + ⅓sin(3ωt) + ⅕sin(5ωt) + … ] | 公式 | [S1] Eq. (8)；[S2] standard square wave 展開式。 | 方波為 `q(t)=+1`（`0<ωt<π`）、`-1`（`-π<ωt<0`）並以 `2π/ω` 週期延拓；`ω>0`，`t` 為時間。等號在連續點成立；跳躍點收斂到左右極限平均 0。頁面用 `≈` 表示有限截斷。 | 逐符號推導 `b_n=(2/π)∫₀^π sin(nx)dx`，得偶數 `0`、奇數 `4/(nπ)`；對照 `synth()`。待補純函式單元測試。 | pending |
| 17 | square wave approximately four over pi times sine omega t plus one third sine three omega t plus one fifth sine five omega t and so on | 公式 | [S1] Eq. (8)；[S2] standard square wave 展開式。 | 這是公式的英文 `aria-label`；適用條件同 #16。 | 與 #16 同；另以輔助技術確認朗讀順序。 | pending |
| 18 | 4/π 整體高度係數，讓疊出來的方波剛好落在 ±1 之間。 | 公式／因果 | [S1] Eq. (7)–(8)：奇次係數為 `4/(πn)`，目標方波取值 `±1`。 | `4/π` 正規化的是無限級數的目標 plateau；有限 partial sum 會超出 `±1`，`N=1` 的振幅已是 `4/π≈1.273`。原句「疊出來」若指有限項會與 Gibbs 過衝衝突。 | 計算 `synth(π/2,1)=4/π`；凜空裁決措辭。 | pending |
| 19 | ω 基頻角頻率：最低那顆弦波的快慢，定義整個方波的週期。 | 定義／公式 | [S1] Eq. (8) 以基頻變數展開；角頻率與週期關係為 `ω=2π/T`。 | `ω>0`、單位 rad/s，`T=2π/ω`；頁面 Canvas 實際以標準化相位 `θ` 繪製，未提供可調 `ω`。 | 量綱核對；對照 `theta()` 與 `CYCLES=2`。 | pending |
| 20 | 1、⅓、⅕… 遞減係數：只取奇數倍頻，且愈後面愈矮，高階只負責修邊角。 | 公式／因果 | [S1] Eq. (7)：偶次係數為 0、奇次係數 `4/(πk)`；Eq. (8) 顯示 `1/k` 衰減。 | 前兩句只限本頁奇對稱 50% duty 方波。「只負責修邊角」是定性簡化；高階項在整個週期皆有值，並非只局部存在。 | 對照 `synth()` 與 `drawNewWave()`；凜空裁決「只負責」是否過強。 | pending |
| 21 | 括號裡每一項都是一顆弦波。N 就是你那支滑桿——取括號裡的前 N 項。 | 定義／公式 | [S3] p.1 Eq. (2)；[S1] Eq. (8)。 | 本頁第 `k` 項（1-based）為 `sin((2k-1)ωt)/(2k-1)`；`N=1…8`，不是取所有 harmonic index `n≤N`。 | 對照 slider 與 `synth()`；確認 `N=8` 取到 `15ω`。 | pending |
| 22 | 基頻角頻率：括號裡第一顆（也是最慢那顆）弦波的快慢，定義整個方波的週期。 | 定義／公式 | [S1] Eq. (8)；`T=2π/ω`。 | 在本頁正奇次諧波集合且 `ω>0` 下，第一項頻率最低。 | 與 #19 同。 | pending |
| 23 | 遞減係數：頻率只取 1、3、5…（奇數倍），而且前面的分數讓愈後面的愈矮，所以高階只負責修邊角。 | 公式／因果 | [S1] Eq. (7)–(8)。 | 同 #20；係數指各項相對振幅 `1/(2k-1)`，整體仍乘 `4/π`。 | 對照 `drawNewWave()`：振幅為 `F/n`。 | pending |
| 24 | 整體高度係數：把整串弦波一起放大，讓疊出來的方波落在 ±1。 | 公式／因果 | [S1] Eq. (7)–(8)。 | 同 #18；只對無限級數的 plateau 正規化，有限項存在超過 `±1` 的過衝。 | 與 #18 同。 | pending |
| 25 | 你的滑桿：取括號裡的前 N 項。N 越大，愈多高階項加進來，轉角愈方。 | 定義／因果 | [S3] p.1 Eq. (2) 與 Gibbs 說明；[S1] Eq. (8)。 | `N` 為奇次項數；「愈方」是整體定性趨勢，不代表誤差對每個 `t` 單調下降，也不代表跳躍附近一致收斂。 | 取樣比較 `N=1…8`；待補誤差與局部過衝測試。 | pending |
| 26 | 轉角那個約 9% 的過衝不會因為多疊幾顆而消失，只會被擠得更窄——這叫 Gibbs 現象（畫面轉角圈起來的那個突起）。 | 數值／因果／定義 | [S3] p.1：過衝約為「jump size」的 9%，最大值不消失、位置趨近跳躍點；[S4] p.31：ripple 集中於不連續點附近且最大誤差保持；原始歷史來源見 [S12] Gibbs 1898 letter。 | `≈8.949%` 的分母是跳躍量。對 `±1` 方波，jump=2，所以峰值約 `1+0.17898=1.17898`，即高於 `+1` plateau 約 `17.898%`。頁面 Canvas 的 `+18%` 標籤用 plateau 作分母，與文案 `9%` 分母不同；必須向讀者說清楚。嚴格而言「更窄」指過衝位置／區域向不連續點集中，不是最大幅度下降。 | 依 [S3] 的 `1.089`（0/1 方波）換算到 `±1`；對照 `drawGibbs()` 的 `(curr-1)*100`。待補極限值與 `N` 增長測試。 | pending |

## 來源索引

- **S1 — Gilbert Strang, MIT OpenCourseWare, _Computational Science and Engineering I_, Chapter 4 “Fourier Series and Integrals”, pp. 318–321, Example 1, Eq. (7)–(8), Figure 4.1–4.2.** 奇對稱 `±1` 方波的偶次係數為 0、奇次係數為 `4/(πk)`，以及完整展開式：<https://ocw.mit.edu/courses/18-085-computational-science-and-engineering-i-fall-2008/resources/cse41/>
- **S2 — MIT OpenCourseWare 18.03, Lecture Note 21, “Fourier Series: Basics”.** standard square wave 的係數推導、展開式與跳躍點收斂條件：<https://ocw.mit.edu/courses/18-03-differential-equations-spring-2010/resources/mit18_03s10_c21/>
- **S3 — Jeremy Orloff, MIT OpenCourseWare ES.1803, “Gibbs’ Phenomenon”, p.1, Eq. (1)–(2).** 定義 truncated Fourier series；過衝約為 jump 的 9%、最大值不消失而位置趨近跳躍點：<https://ocw.mit.edu/courses/es-1803-differential-equations-spring-2024/mites_1803_s24_gibbs_phenom.pdf>
- **S4 — Chaniotakis and Cory, MIT OpenCourseWare 6.071, _Signals and Systems_, p.31, Figure 25 附近。** 項數增加時 ripple 集中到不連續點、最大誤差保持，稱 Gibbs phenomenon：<https://ocw.mit.edu/courses/6-071j-introduction-to-electronics-signals-and-measurement-spring-2006/resources/02_signals/>
- **S5 — NIST Digital Library of Mathematical Functions, §1.8, Eq. (1.8.1)–(1.8.2).** Fourier series 與 Fourier coefficients 的正式定義：<https://dlmf.nist.gov/1.8>
- **S6 — Karlheinz Brandenburg et al., “ISO/MPEG Layer III Audio Coding: CD-like Quality with Only 9 per cent of the Data Rate”, AES 92nd Convention, 1992／Fraunhofer publication record.** Layer III 與 psychoacoustic coding 的原始技術脈絡：<https://publica.fraunhofer.de/entities/publication/5e92dd43-ab68-4741-ad03-669ff2ba0494>
- **S7 — Fraunhofer, _Psychoacoustics of detection of tonality and asymmetry of masking_, abstract.** 音訊分幀、time-frequency 分解、masking threshold 與 bit allocation：<https://publica.fraunhofer.de/entities/publication/8f29e177-6507-4edc-994e-173f47bd06f3>
- **S8 — MIT OpenCourseWare 6.003, Lecture 17, “Frequency Response”.** electronic equalizer 以 frequency response 補償／調整頻率響應的例子：<https://ocw.mit.edu/courses/6-003-signals-and-systems-fall-2011/resources/mit6_003f11_lec17/>
- **S9 — ITU-T T.81 (09/1992) / ISO/IEC 10918-1, _Digital compression and coding of continuous-tone still images_, Annex F.** JPEG sequential DCT-based mode；官方條目與目錄：<https://www.itu.int/rec/T-REC-T.81-199209-I/en>
- **S10 — ITU-T T.873 v3 (09/2023), JPEG reference software, §§D.5–D.8.** quantization table、DCT／IDCT 實作選項：<https://www.itu.int/epublications/publication/itu-t-t-873-v3-2023-09-information-technology-digital-compression-and-coding-of-continuous-tone-still-images-reference-software>
- **S11 — IEEE 3002.8-2018, _Recommended Practice for Conducting Harmonic Studies and Analysis of Industrial and Commercial Power Systems_.** 官方標準條目：<https://standards.ieee.org/ieee/3002.8/4436/>
- **S12 — J. Willard Gibbs, “Fourier’s Series”, _Nature_ 59, 200 (1898), DOI 10.1038/059200b0.** Gibbs 現象的原始歷史論述之一：<https://doi.org/10.1038/059200b0>

## Terra 外部審查摘要

- #3、#4 把有限「幾顆」弦波說成真的形成直角；有限連續函式之和仍連續，應明確寫成「逼近」。
- #6、#21、#25 的 `N` 是奇次項數，最高 harmonic 為 `(2N-1)ω`；它不是常見記號中「取到第 N 次 harmonic」的 `N`。
- #12 的 MP3 是 filter bank／MDCT 與感知量化，不是直接套本頁 Fourier series；「串流音樂」也不必然使用 MP3。
- #14 的 JPEG 使用區塊 DCT 與量化，不是 Fourier series，也不是固定把所有高頻直接丟掉。
- #15 對馬達雜訊與單一弦波歸因的範圍過廣，目前來源不足以支持原句。
- #18、#24 的 `4/π` 敘述若指有限 partial sum，會與頁面自己的 Gibbs 過衝衝突。
- #26 的「約 9%」是相對 jump size；頁面 Canvas 標示的 `+18%` 是相對 `+1` plateau。兩者數學上一致，但未說分母會讓讀者以為互相矛盾。
- 依 C2，方波係數、`N→(2N-1)` 映射與 Gibbs 極限值仍缺可重跑的純函式單元測試；本任務不擴張去修改 JS 或新增測試。

## 2026-07-13 增補：可重跑驗證（V）與術語對照

- **V — `depth/fourier-series-claim-check.mjs`**（`node depth/fourier-series-claim-check.mjs`，退出碼 0＝全過）：`F/CYCLES/theta/synth/targetVal` 直接從出貨的 `depth/fourier-series.js` 抽出執行，對照獨立級數實作。對列映射：F1↔#2/#3/#16/#17/#18/#20/#23/#24（係數 4/(πn)、只有奇次項）、F2↔#6/#8/#21/#25（滑桿 N 顆＝最高第 (2N−1) 次諧波）、F3↔#1/#2/#3/#9（離跳點 ≥0.3 rad 處「逼近」量化為 <1%，支持「逼近非等於」的措辭修正方向）、F4↔#10/#26（Gibbs：以 Si(π) 獨立 Simpson 積分得極限過衝 **17.898%（相對 +1 平台）＝8.949%（相對跳幅 2）**；N∈{50,200,800} 過衝均 17.90%——變窄不消失；頁面標籤 N=1→+27%、N≥4 穩定 +18%）、F5↔#5（兩週期、±1 目標與 theta 對齊）。2026-07-13 執行：**10 檢查全過**。Terra 摘要點名的三項缺測（方波係數、N→(2N-1) 映射、Gibbs 極限值）分別由 F1／F2／F4 補上；#26 的「約 9% vs +18%」分母之辨由 F4 同一次計算同時給出兩種分母的數字。
- 術語對照（人工核對翻譯用）：

| 頁面用語 | 來源英文 | 備註 |
|---|---|---|
| 傅立葉級數 | Fourier series | 陸譯「傅里葉級數」 |
| 前 N 顆（部分和） | partial sum | [S3] 記作 S_{2N-1} |
| 諧波 | harmonic | 奇次諧波＝odd harmonics |
| 基頻角頻率 ω | fundamental (angular) frequency | — |
| 方波 | square wave | 50% duty、±1 |
| 遞減係數 1、⅓、⅕… | (decaying) coefficients 4/(πn) | — |
| Gibbs 現象 | Gibbs phenomenon | 台亦譯「吉布斯現象」 |
| 衝過頭／過衝 | overshoot | 分母註記：相對平台 vs 相對跳幅（#26） |
| 轉角／不連續點 | corner / discontinuity (jump) | — |
| 等化器 | equalizer (EQ) | #13 |
| 感知編碼／遮蔽 | perceptual coding / masking | MP3 段（#12） |
| 量化表 | quantization table | JPEG 段（#14） |
