# Claim–Source 對照表：sine-wave

## 頁面：`sine-wave`｜審查人：待凜空

範圍：`depth/sine-wave.html` 的可見技術陳述。2026-07-13 第三次修訂後，互動採 `A/f/v/φ` 行進波模型；週期 `T=1/f` 與波長 `λ=v/f` 都是衍生量。AI 與數值檢查不能替代人工內容審查，因此全列維持 `pending`。

| # | 頁面陳述 | 類型 | 一手來源 | 適用條件／風險 | 驗證 | 狀態 |
|---|---|---|---|---|---|---|
| 1 | 用振幅、頻率、波速與相位呈現一個向右傳播的正弦行進波。 | 範圍／定義 | [S1] §6.1；[S2] §13.2。 | 零中線、未阻尼、一維且波速固定的純正弦。 | [V] S1。 | pending |
| 2 | 大小、振動快慢、傳播速度與起點，決定本頁波形怎麼前進。 | 定義 | [S1] §6.1；[S2] §13.2。 | 四詞分別指 `A/f/v/φ`；只限本頁模型。 | 人工白話審查。 | pending |
| 3 | 波峰與波谷反覆出現；A 是高度，f 是每秒重複次數，T=1/f。 | 定義／公式 | [S1] §6.1；[S2] §13.2。 | `A≥0`、`f>0`；高度指相對中心線距離。 | [V] S2–S4。 | pending |
| 4 | 改變振幅時中心線固定，波峰離中心的距離改變。 | 因果 | [S1] §6.1。 | 垂直位移固定為 0，只改 `A`。 | [V] S2；人工拖曳。 | pending |
| 5 | 固定波速時，頻率加倍會讓 T 與 λ 都減半。 | 公式／因果 | [S1] §6.1；[S2] §13.2。 | 固定 `v` 與其他參數。 | [V] S3–S5。 | pending |
| 6 | 只改相位時，波峰波谷高度不變，整條沿空間方向平移。 | 公式／因果 | [S1] §6.1 的 phase shift。 | `A/f/v` 固定；位移量依相位正負。 | [V] S6。 | pending |
| 7 | 理想化模型中，振幅變大會讓波峰波谷離中心線更遠。 | 因果 | [S1] §6.1；聲波背景見 [S2]。 | 不宣稱實際手機音量控制一定保持波形。 | [V] S2。 | pending |
| 8 | 頻率越高、週期越短；A4 的頻率是 440 Hz。 | 公式／數值 | `f=1/T` 見 [S2]；A=440 Hz 見 [S3]。 | 音高與頻率直接對應限單頻純音或固定頻譜。 | 來源逐句核對。 | pending |
| 9 | 台灣市電標稱 60 Hz，週期約 16.7 ms。 | 數值 | 60 Hz 見 [S4] 第 3 條；實際諧波見 [S5]。 | `T=1/60 s≈16.7 ms`；不宣稱實際波形是純正弦。 | 人工計算；法規時效待發布前再核。 | pending |
| 10 | 相位可描述兩個波誰先、誰後；單一波入門時不必先當主角。 | 定義／教學範圍 | Phase shift 見 [S1] §6.1。 | 後半句是教材層級決定，不是物理定律。 | 人工教材審查。 | pending |
| 11 | `y(x,t)=A sin[2πf(x/v−t)+φ]`。 | 公式 | [S1] §6.1；波速、波長關係見 [S2] §13.2；一圈 `2π` 見 [S6]。 | `f>0`、`v>0`、`A≥0`、`φ` 以弧度計；正號方向表示向右行進。 | [V] S1。 | pending |
| 12 | 週期與波長分別由 `T=1/f`、`λ=v/f` 算出。 | 公式／教學範圍 | [S1]、[S2]。 | 時間與空間單位一致。 | [V] S3–S5；DOM 回歸測試。 | pending |
| 13 | 學習順序：波峰波谷→振幅→週期與頻率→波速與波長→需要比較時再用相位。 | 教學範圍 | 名詞定義見 [S1]、[S2]。 | 排序是本頁教學設計，需人工審核。 | 人工審核。 | pending |
| 14 | 固定頻率時，波速越快，波長越長。 | 公式／因果 | [S2] §13.2。 | 指同一個一維行進波模型，`λ=v/f`。 | [V] S4、S5。 | pending |

## 來源索引

- **S1 — OpenStax, _Precalculus 2e_, §6.1 “Graphs of the Sine and Cosine Functions”.** <https://openstax.org/books/precalculus-2e/pages/6-1-graphs-of-the-sine-and-cosine-functions>
- **S2 — OpenStax, _Physics_, §13.2 “Wave Properties: Speed, Amplitude, Frequency, and Period”.** <https://openstax.org/books/physics/pages/13-2-wave-properties-speed-amplitude-frequency-and-period>
- **S3 — ISO 16:1975, _Acoustics — Standard tuning frequency_.** <https://www.iso.org/standard/3601.html>
- **S4 — 經濟部，《電業供電電壓及頻率標準》第 3 條。** <https://law.moea.gov.tw/LawContent.aspx?id=FL011044>
- **S5 — 台灣電力股份有限公司，《電力系統諧波管制要點》。** <https://www.taipower.com.tw/media/hp4e4zwb/%E5%8F%B0%E7%81%A3%E9%9B%BB%E5%8A%9B%E8%82%A1%E4%BB%BD%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B8%E9%9B%BB%E5%8A%9B%E7%B3%BB%E7%B5%B1%E8%AB%A7%E6%B3%A2%E7%AE%A1%E5%88%B6%E8%A6%81%E9%BB%9E.pdf?mediaDL=true>
- **S6 — OpenStax, _Precalculus 2e_, §5.1 “Angles”.** <https://openstax.org/books/precalculus-2e/pages/5-1-angles>
- **V — `depth/sine-wave-claim-check.mjs`.** `node depth/sine-wave-claim-check.mjs`；退出碼 0 代表 6 組數值檢查全過。

## 人工審核重點

1. `A/f/v/φ` 四個控制同列後，波速與頻率的差異是否清楚。
2. `f` 顯示 `T=1/f`、`v` 顯示 `λ=v/f` 是否清楚、不顯擁擠。
3. 台灣教材用語「頻率／週期／波速／波長／波峰／波谷／中心線」是否符合預期年級。
