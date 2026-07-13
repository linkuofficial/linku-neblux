# Depth BACKLOG(暫緩/退出/待決登記)

規則:任何新頁構想先入本檔,不直接開工作樹。每項附退出理由與**復活條件**——沒有東西被無聲掩埋。

---

## 待決策略項

### Linku 工程信譽內容線
- 內容:面向 ML/嵌入式工程師的深度技術內容,作為 Linku(而非 Neblux)的品牌資產。
- 狀態:待另案裁決,不透過 Neblux 承載。
- 觸發條件:FOC capstone 開源文件線成形時,與其合併評估。

## 技術債(待清理,非阻斷)

### 四頁 claim-source 對照表未完成
- 現況:`SPEC_DELTA.md` §C3 把逐條技術陳述對照一手來源的 claim-source 表訂為發布前提、一票否決。四份來源定位草稿已齊：`depth/sine-wave-claim-sources.md` 14 條、`depth/fourier-series-claim-sources.md` 26 條、`depth/transformer-claim-sources.md` 35 條、`depth/s-plane-claim-sources.md` 36 條。**2026-07-13 四頁各配一支可重跑數值驗證腳本**（`node depth/<page>-claim-check.mjs`：sine 6、fourier 10、transformer 12、s-plane 24 檢查全過），表尾附驗證映射。四份全部標為 `pending`，尚無任何 `verified` 列——依 C3，AI 交叉檢查不能替代人的審查，此債的關閉條件只剩凜空逐列簽核。
- 決策:凜空 2026-07-12 裁決「先公開,補表列技術債」,四頁 manifest 已標 `public:true`/`review_status:published`。
- 待辦:凜空逐條人工核對四份草稿（pending → verified/rejected）；s-plane 的逐行公式核對併入其對照表逐列完成（見下項）。
- 觸發/約束:`depth/` 已接進正式 build/sitemap 並通過驗證，但尚未加入正式導覽入口；正式部署與流量擴大前應優先補齊此項，因為那時才會有真實信譽風險。

### s-plane 逐行公式核對未完成
- 現況:`depth/s-plane-notes.md` 與 `docs/tasks/2026-07-09-depth-layer-m2.md` 原把「凜空逐行對照控制理論課本核對每條公式」訂為 hard blocker(非五分鐘體感測試可取代),因為這是凜空的核心學術線。截至 2026-07-12 公開裁決時此項尚未完成——凜空僅做過一般測試。**2026-07-13 凜空更正核對框架:不用（也沒有）紙本課本,核對基準＝線上權威一手來源;殘餘重點是中英術語翻譯。**
- 決策:凜空 2026-07-12 明確知情接受此風險,選擇先公開。
- 待辦:凜空就 `depth/s-plane-claim-sources.md` 逐列核對——每條公式已對到可線上取得的一手來源式號（MIT 2.14 handout Eq. (13)–(15)、Hallauer Eq. (9.29)/(9.36)/(9.37)/(9.40) 等）,附獨立數值驗證（`node depth/s-plane-claim-check.mjs`,24 檢查全過）與中英術語對照表;逐列標 verified/rejected 即同時關閉本債與上一項的 s-plane 份額。
- 觸發/約束:若核對發現公式誤植,應優先處理並不待其他排程——此頁已接進 build，但正式部署前仍是修正成本最低的窗口。

### s-plane / transformer 的符號 tooltip 遷移到共用模組（已清）
- 現況:兩頁在 SPEC_DELTA C5 規範定案前已各自 inline 實作 tooltip(邏輯寫在 `*.js`、tip 文字存 JS `GLOSS` 物件、未用 `data-tip` 契約),且與各自 canvas 高亮深度耦合。行為已符合 C5,但未走共用 `depth/sym-tooltip.js`。
- 已做(2026-07-13):兩頁改接 `depth/sym-tooltip.js`——`s-plane.js`/`transformer.js` 刪除 inline 的 GLOSS 物件、showTip/hideTip、hover/focus/pin 追蹤與 initSymInteractivity,改由頁面專屬 `window.__nebluxSymHook` 回呼只做「canvas 高亮＋滑桿/讀數 is-cued」。s-plane 的 tip 文字與既有 `<dd>` 逐字相同,直接吃 dd fallback,HTML 未新增 `data-tip`;transformer 的舊 GLOSS 文字與 `<dd>` 不同(dd 是另一份較長說明),故在 `transformer.html` 的公式 `<span data-sym>` 上逐一補上 `data-tip`,內容為舊 GLOSS 文字逐字複製,以保留原本 tooltip 用字不變。純外掛遷移,未動任何公式/係數/物理或數學說明文字。`s-plane.js`/`transformer.js` 版本號 `?v=2→3`,並掛上 `sym-tooltip.js?v=2`。
- 驗證:`npm run verify` 全過(build + depth-build 4/4 + E2E 72/72,含四頁 canvas-boot 桌機/手機 gate);瀏覽器實測(`npm run dev`)兩頁逐一點開詞彙表按鈕,確認浮動 tooltip 文字與舊版逐字相同、`aria-pressed`/`is-active` 正確切換、canvas 高亮與對應滑桿/讀數的 `is-cued` 樣式仍如常觸發。
- 觸發/約束:兩頁目前皆為 `public:true`／`review_status:published`；s-plane 數學複核仍待凜空完成——本次遷移只動 tooltip 管線,不觸及任何公式/係數/canvas 數學,不影響複核範圍。

### sine-wave 繁中教材本地化（本輪已處理）
- 決定:頁面可見文案使用較符合台灣教材語感的「波」；保留英文 `Sine Wave` 供精確對照。
- 已補:相位以「週期中的位置」解釋；波峰、波谷、振幅補白話定義；波速以 `v = fλ` 說明，但明確標示目前互動只處理隨時間變化的波，避免把波速偷偷當成現有模型的一部分。
- 人工複核:確認「波」是否符合你要的教材語氣，以及波速／波長說明是否足夠但不搶走三旋鈕主題。

### Fourier series 延伸範圍規劃（只規劃，本輪不改頁面）
- 現頁主線維持「有限個奇次諧波如何逼近方波」與一個可玩的諧波階數控制，不在本輪擴寫。
- 後續內容候選，按頁面或折疊單元拆開：
  1. 係數與振幅／相位如何決定每一顆諧波。
  2. 有限項逼近、收斂與 Gibbs 現象的邊界。
  3. 週期訊號與非週期訊號的分流：Fourier series、Fourier transform、DFT 不混成同一件事。
  4. 電路、聲音與影像的頻譜例子，逐一標出適用條件，不用「所有訊號」的過度總括。
- 後續頁面存在後，從 Fourier 頁以明確入口連過去；在頁面尚未存在前不放死連結。

### s-plane 範圍拆分規劃（本輪頁面只收窄，不擴寫）
- 現頁定位鎖定「標準二階系統：共軛極點、阻尼比、自然頻率、步階響應」；不試圖在同頁教完整控制理論。
- 後續可拆成獨立 Depth：
  1. 拉普拉斯轉換與 s 平面：為什麼微分方程可轉成代數式。
  2. 傳遞函數與方塊圖：輸入、輸出、極點與零點的關係。
  3. 零點與頻率響應：Bode／Nyquist 等內容另立頁，不塞入本頁。
  4. 狀態空間與高階系統：矩陣、特徵值、多輸入多輸出另立頁。
- 相關頁面完成並通過內容審查後，才從本頁加入正式連結；目前只用 scope note 說明邊界。
- 人工複核:確認「避震器偏軟／偏硬」比喻、目前頁面負荷與上述拆分順序。

### Transformer 自注意力分頁規劃（本輪只修可用性，不擴寫內容）
- 現頁定位鎖定「固定句子、一顆注意力頭、Q/K/V、softmax 與加權混合」；自注意力不是整座 Transformer。
- 後續可拆成獨立頁或短單元：多頭注意力、位置編碼、前饋層／殘差／LayerNorm、Encoder–Decoder、訓練目標與推論／KV cache。
- 相關頁面完成並通過 claim-source 審查後，以頁面間連結組成路徑，不把所有概念重新塞回現頁。

### Transformer 首屏互動可見性回歸（本輪已修）
- 問題:原版在 1280×720 首屏時，互動區約從 y=669 開始、熱圖約從 y=899 開始，使用者幾乎看不到可玩的內容。
- 修正:互動區移到標題與副標題後；熱圖比例由 4:3 壓成 16:10，手機仍維持可讀的方形配置。
- 防回歸:加入 E2E 守門，桌機與手機都要求 `.lab-surface` 的頂端落在第一個 viewport 內。
- 人工複核:實際拖曳 token、滑動 T，確認熱圖、readout 與 tooltip 沒因壓縮或重排而變難用。

## 暫緩(HOLD)

### KV Cache 顯存權衡(原旗艦 #2)
- 理由:英文已有實質互動在位者——Oakland 課程 GQA 互動 demo,含 MHA/GQA/MQA 切換、KV-cache 記憶體計算器、80GB GPU 線與前沿模型參數載入(2026-07-11 實地驗證)。
  參考:https://www.secs.oakland.edu/~tianlema/ai/lectures/L08/gqa_demo.html
- 復活條件(至少滿足二):繁中可及性分層版本、真實裝置 OOM 實測資料(非模擬)、與量化頁形成的敘事連續性帶來明確增量價值。復活時重走 go/no-go。

### 邊緣分散式推論延遲模擬(原旗艦 #3)
- 理由:無硬體校準的模擬 = 看似精確的假工具,信譽風險高。
- 復活條件:capstone 實驗台(NUCLEO/實機)產出可引用的真實量測後,以「實測驅動」形式重啟——屆時此差異化為他人不可複製。

## 退出本內容簇

### RoPE 位置編碼
- 理由:英文互動供給不稀缺(2026-07-11 實地驗證,含完整數學推導+旋轉視覺化+相對位置探索器)。
  參考:https://sunil-dhaka.github.io/ai/interactive-guide-to-rope.html 、https://www.secs.oakland.edu/~tianlema/ai/lectures/L08/rope_demo.html
- 去向:如未來做繁中支撐脈絡,以圖譜節點輔助頁形式,不投旗艦資源。

### 突觸可塑性 LTP/LTD
- 理由:與量化→推論→邊緣簇無搜尋與產品連續性。
- 去向:**移入 Neblux 一般 backlog**(非刪除)——其受眾契合度(探索者)其實高於本簇,適合作為未來非 AI 簇的候選。

## 紅海名單(僅限圖譜脈絡頁,永不投旗艦)

QKV 幾何(Polo Club Transformer Explainer、BertViz)、梯度下降地形(Distill 動量文、TensorFlow Playground)、時間複雜度(VisuAlgo 等)、動作電位(PhET 繁中版)。

## 未來 brief 佔位

### 同源匿名聚合量測
- 需求:若 Phase D 需要事件級數據(如互動完成率)。
- 約束:同源 API + D1 純聚合 counter,無 timestamp/device/session id;不引入任何第三方 SDK;CSP 維持 `'self'`。
- 狀態:未開,Phase C 以理解測試+GSC+人工巡檢為準。

## Phase D 候選序(僅在四閘門全過後取用)

1. KV Cache(若復活條件成立)
2. 推測性解碼(Speculative Decoding)——競查未做,取用前補
3. 校準資料與泛化(靜態量化的實務缺口)——與量化頁天然銜接
