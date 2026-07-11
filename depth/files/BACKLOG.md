# Depth BACKLOG(暫緩/退出/待決登記)

規則:任何新頁構想先入本檔,不直接開工作樹。每項附退出理由與**復活條件**——沒有東西被無聲掩埋。

---

## 待決策略項

### Linku 工程信譽內容線
- 內容:面向 ML/嵌入式工程師的深度技術內容,作為 Linku(而非 Neblux)的品牌資產。
- 狀態:待另案裁決,不透過 Neblux 承載。
- 觸發條件:FOC capstone 開源文件線成形時,與其合併評估。

## 技術債(待清理,非阻斷)

### s-plane / transformer 的符號 tooltip 遷移到共用模組
- 現況:兩頁在 SPEC_DELTA C5 規範定案前已各自 inline 實作 tooltip(邏輯寫在 `*.js`、tip 文字存 JS `GLOSS` 物件、未用 `data-tip` 契約),且與各自 canvas 高亮深度耦合。行為已符合 C5,但未走共用 `depth/sym-tooltip.js`。
- 待辦:抽出各頁的 canvas 高亮為 `window.__nebluxSymHook`,tooltip/gloss/cross-highlight 改用共用模組,tip 文字改由 `data-tip`/`<dd>` 供給,刪除 inline 重複碼。
- 觸發/約束:兩頁仍 `public:false`、s-plane 待凜空數學複核——遷移時逐頁瀏覽器驗證,不與數學複核同批進行以免混淆。收益:消除 3 份 tooltip 實作漂移,讓 C5 規範零例外。

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
