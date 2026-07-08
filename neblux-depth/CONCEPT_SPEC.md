# 概念頁生成規格 CONCEPT_SPEC v0.2

適用：Neblux 深度頁黃金樣本與後續候選頁。  
本版取代 v0.1 的「inline JS 單檔可上線」假設。Neblux 現行 CSP 不允許 executable inline script，因此可公開頁面必須採 same-origin 外置 JS。

## 1. 檔案與技術約束

- 可公開交付物不得含 executable inline script。
- JS 使用 same-origin external module；CSS 可 inline 或 external，但不得載入 CDN。
- 無外部字型、無第三方框架、無新增 production dependency。
- 互動主體使用 Canvas 2D。
- 動畫走 `requestAnimationFrame`，並尊重 `prefers-reduced-motion`。
- Pointer events 同時支援滑鼠與觸控；手機觸控目標至少 44px。
- 內容 metadata 使用 non-executable JSON block：

```html
<script type="application/json" id="node-meta">
{ "depth_id": "sine-wave", "node_id": "oscillations_and_waves_concept", "spec_version": "0.2" }
</script>
```

離線 self-contained HTML 可以作為私人草稿，但不得標記為 `public: true`，也不得視為 M1 上站版本。

## 2. Manifest 關係

每頁必須對應 `depth_manifest.json` 的一個 entry。頁面本身不複製 graph title、description 或 graph connections；這些仍由既有 `data/all_nodes.json` 管。

可寫在 manifest 的深度頁專屬資訊：

- `id`：深度頁穩定 id，例如 `sine-wave`
- `node_id`：既有 graph node id
- `focus`：本頁實際教學焦點
- `depth_path`：上線路徑，未完成時為 `null`
- `qa`：內容與實作 gate

## 3. 頁面結構

單欄縱向，五段順序固定。

### 1. 直覺句

一句話，大字，無術語、無公式。它可比既有 graph description 更窄，因為深度頁只教一件事。

### 2. 互動主體

- 一個畫布。
- 一個焦點互動物。
- 一個 aha。
- 控制元件不超過 3 個。
- 預設狀態就有可觀察的動態。

### 3. 觀察任務

2 到 3 條短任務。只引導使用者看，不直接公布答案。

### 4. 形式化

公式只能出現在這一段。每個符號必須對應回剛剛操作過的控制或畫面元素，且顏色一致。

公式用 HTML/Unicode 排版，不引入 MathJax/KaTeX。

### 5. 連結

M1 不硬編碼 prereq-DAG。頁尾只提供：

- 回 graph node：`/app.html?node=<node_id>`
- 回 Neblux 入口或暫定 lab index（如果該 index 尚未存在，先不顯示）

圖譜整合與延伸連結留到 M3 另開 brief。

## 4. 內容正確性 gate

五分鐘學生測試只測理解感，不足以保證正確。每頁還需要：

- Reference notes：至少 2 個可信來源或教材來源。
- Formula walkthrough：Riku 能逐符號說明公式與互動元件的對應。
- Scope note：寫明頁面不處理哪些條件或例外。
- 對控制理論頁：標出模型假設，例如線性、時間不變、標準二階、單位步階等。

## 5. 視覺與互動基調

- 深色背景可以沿用 Neblux，但不要只靠同一色系堆疊。
- 畫布是主角，介面退位。
- 不做遊戲化：無分數、徽章、streak、排行榜。
- 不做大型教學儀表板；這是單概念互動頁。
- UI 文案維持 Neblux 的安靜語氣。

## 6. 首批候選頁

### A-01 `sine-wave`

- 對應 graph node：`oscillations_and_waves_concept`（目前沒有精確 sine-wave node；M0 先掛寬節點）
- 啊哈：三個數字就完整決定一顆波；頻率與相位在畫面上長得不一樣。
- 互動：一條持續流動的弦波；三支控制：振幅 A、頻率 f、相位 phi。
- 形式化：`y(t) = A sin(2πft + phi)`
- M1 黃金樣本。

### A-02 Fourier series

- 對應 graph node：`fourier_analysis_concept`
- 啊哈：方波這種有角的形狀，可以用越來越多顆弦波疊出來。
- 互動：目標方波 + 合成波；主控制為諧波階數 N。
- 形式化：方波奇次諧波級數。
- M2 才做。

### A-03 s-plane / poles

- 對應 graph node：`control_theory_concept`
- 啊哈：極點位置決定系統個性。
- 互動：拖曳共軛極點，觀察標準二階系統步階響應。
- 形式化：`H(s) = wn^2 / (s^2 + 2 zeta wn s + wn^2)`
- M2 才做。需控制理論正確性 gate。

## 7. 修訂紀錄

- v0.2（2026-07-09）：改為 Neblux CSP 相容；加入 manifest、內容正確性 gate；移除硬編碼 prereq-DAG。
- v0.1（2026-07-08）：初版。
