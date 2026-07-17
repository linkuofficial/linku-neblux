# Quantum Depth first batch — claim/source table

狀態：AI 輔助草稿；自動數學檢查完成後仍需凜空逐頁人工簽核。頁碼以來源 PDF 顯示頁為準。

## 來源索引

- **Q1** — MIT OpenCourseWare 8.04, Lecture 3, *The Wavefunction*, pp. 1–5. `p(x)=|ψ(x)|²`、正規化、複數波函數、疊加與干涉。<https://ocw.mit.edu/courses/8-04-quantum-physics-i-spring-2013/19862abcdf8e4f7cf1321d060cd6dd7c_MIT8_04S13_Lec03.pdf>
- **Q2** — MIT OpenCourseWare 8.04, Lecture 1, *Introduction to Superposition*, pp. 1–9. 兩態測量、兩路徑重新合併、superposition 的實驗動機。<https://ocw.mit.edu/courses/8-04-quantum-physics-i-spring-2013/43a8712da99ace660cf042c1f1371b46_MIT8_04S13_Lec01.pdf>
- **Q3** — MIT OpenCourseWare 8.04, Lecture 4, *Expectations, Momentum, and Uncertainty*. 位置與動量的期望值、變異與不確定關係。<https://ocw.mit.edu/courses/8-04-quantum-physics-i-spring-2013/b298ee9f92cf0211c99218d408507908_MIT8_04S13_Lec04.pdf>
- **Q4** — MIT OpenCourseWare 6.007, Lecture 42, *Tunneling*, pp. 1–25. 一維有限勢壘、邊界接合與 transmission。<https://ocw.mit.edu/courses/6-007-electromagnetic-energy-from-motors-to-lasers-spring-2011/d9bc5d7be258ba20ccc652941d8f3e39_MIT6_007S11_lec42.pdf>
- **Q5** — MIT OpenCourseWare 8.321, Lecture 1, pp. 1–4；Lecture 4, pp. 21–22. Stern–Gerlach、spin-1/2 沿任意軸的兩個本徵值與方向機率。<https://ocw.mit.edu/courses/8-321-quantum-theory-i-fall-2017/d08f5dcf8551694381fe47bc9787bb49_MIT8_321F17_lec1.pdf>；<https://ocw.mit.edu/courses/8-321-quantum-theory-i-fall-2017/ac00139191d2945975969fd58e335c09_MIT8_321F17_lec4.pdf>
- **Q6** — Einstein, Podolsky & Rosen, *Physical Review* 47, 777 (1935). 空間分離複合系統與 EPR 問題。<https://doi.org/10.1103/PhysRev.47.777>
- **Q7** — J. S. Bell, *Physics Physique Fizika* 1, 195 (1964). 局域隱變量與量子相關預測的不相容。<https://doi.org/10.1103/PhysicsPhysiqueFizika.1.195>
- **Q8** — MIT 8.225 / STS.042, *Bell’s Inequality and Quantum Entanglement* (2020), pp. 1–12. singlet 關聯、不同測量方向與 Bell inequality 的教材推導。<https://ocw.mit.edu/courses/sts-042-einstein-oppenheimer-feynman-physics-in-the-20th-century-fall-2020/mitsts_042j_f20_lecnote_bellsinequality.pdf>
- **V** — `tests/quantum-depth.test.mjs`。直接 import 出貨 JS 的純函式，驗 wavefunction 正規化近似、疊加機率和、最小不確定性乘積、勢壘寬度單調性、自旋角度端點／和、singlet 反相關。

## 逐頁技術陳述

| 頁面 | 技術陳述 | 來源 | 前提／邊界 | 驗證狀態 |
|---|---|---|---|---|
| 波函數 | 位置機率密度為 `|ψ(x)|²`，總機率需正規化為 1。 | Q1 pp.1–3 | 本頁只展示一維、實值正高斯的視覺切片；一般 ψ 為複數。 | Q1 + V；待人工簽核 |
| 波函數 | 重複相同準備與位置測量後，落點統計逼近機率密度；不預測單次確定位置。 | Q1 pp.1–3 | 圖中點為固定種子的教學抽樣，非物理即時模擬。 | 文案待人工簽核 |
| 量子疊加 | 狀態可寫成振幅線性組合；機率密度含交叉項，因此可干涉。 | Q1 pp.4–5；Q2 pp.6–9 | 互動採等振幅、理想兩路徑與無損重新合併。 | Q1/Q2 + V；待人工簽核 |
| 量子疊加 | 本頁模型兩出口機率為 `(1±cosφ)/2`。 | Q1 疊加／干涉式 | 只適用本頁已正規化的理想兩路徑模型。 | V；待人工簽核 |
| 不確定性原理 | 一般狀態滿足 `ΔxΔp≥ℏ/2`。 | Q3 | Δ 為大量相同準備測量結果的標準差。 | Q3 + V；待人工簽核 |
| 不確定性原理 | 最小不確定性高斯態取等號；壓窄位置會展寬動量。 | Q1 pp.3–5；Q3 | 互動只畫最小不確定性高斯族，不代表所有狀態都取等號。 | V；待人工簽核 |
| 量子穿隧 | `E<V₀` 的有限矩形勢壘仍可有非零 transmission；寬度增加使穿透率快速下降。 | Q4 | 一維、時間獨立、矩形勢壘；本頁用 `ℏ²/2m=1` 相對單位。 | Q4 + V；待人工簽核 |
| 量子穿隧 | 穿隧不表示粒子借用能量；單次結果仍是反射或穿透。 | Q4 | 不討論測量時間、波包延遲或多維勢壘。 | 文案待人工簽核 |
| 量子自旋 | 自旋 1/2 沿任意軸的投影測量只有 `±ℏ/2`。 | Q5 | 理想 Stern–Gerlach / 二態系統。 | Q5 + V；待人工簽核 |
| 量子自旋 | 準備 z-up 後沿夾角 θ 測量，`P↑=cos²(θ/2)`、`P↓=sin²(θ/2)`。 | Q5 | 不模擬磁場與飛行軌跡，只畫理想機率。 | V；待人工簽核 |
| 量子糾纏 | singlet 不能拆為兩個獨立純態；同軸自旋測量結果必定相反，任一邊單獨為 50/50。 | Q6、Q8 | 互動只涵蓋同軸測量，不宣稱單靠此畫面完成 Bell 測試。 | V；待人工簽核 |
| 量子糾纏 | 糾纏相關不能用來控制單邊結果或超光速傳訊。 | Q7、Q8 | Bell 非局域相關與可控制訊息傳遞是不同命題。 | 文案待人工簽核 |

## 明確拒收的說法

- 「波函數就是粒子真的攤成一團物質。」
- 「疊加只是我們不知道粒子已經選了哪一條路。」
- 「不確定性只來自測量儀器擾動。」
- 「穿隧時粒子暫時借了能量。」
- 「自旋是小球繞自身軸旋轉。」
- 「測量糾纏粒子的一邊會傳送可控制訊息到另一邊。」
