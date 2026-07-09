# Neblux Depth — 計畫 v0.3

狀態：in-progress  
更新：2026-07-09  
本版原因：v0.2 命名定案。對外功能名固定為 `Neblux Depth`，不另翻譯成中文名稱；v0.1 經紅隊審查後的技術修正保留。

## 0. 本版裁決

v0.1 的問題不是「不能做」，而是動工順序錯。先做新 schema、DAG、三頁單檔 HTML，會把風險推到 M3 才爆炸。本版把風險前移：

1. 先盤點既有 Neblux 資料與 CSP。
2. 以 `depth_manifest.json` 掛在既有 graph node id 上，不建立第二套 graph truth。
3. 先做一頁黃金樣本，且第一頁就用 Neblux 可上線的 CSP 形式。
4. 公開只放亮節點；暗節點留內部 backlog，不在公開 UI 製造爛尾感。
5. 控制/數學內容必須有最低正確性 gate，不能只靠五分鐘體感測試。

## 1. 固定邊界

本計畫是 Neblux 的小型 Depth page 實驗，不是新平台。

- 對外名稱固定為 `Neblux Depth`。
- UI、頁面 title、manifest notes、公開文件提到本功能時使用 `Neblux Depth` 或 `Depth`，不使用「實驗室」、「深一層」、「概念小窗」等中文產品名。
- 中文內部文件可用「Depth page」描述單頁交付物，但不新增中文品牌名。

- 不改 `data/*.json` 結構。
- 不改 `frontend/src/engine/`。
- 不改 `functions/`、Cloudflare Pages、`frontend/public/_headers` 或部署設定。
- M1 前不把新頁接進正式導覽。
- 首輪只處理一頁黃金樣本；另外兩頁留到 M2 gate 後。

若未來需要碰上述禁區，先寫 task brief，走 repo 的交叉審查路徑。

## 2. 資料策略

### 廢棄 v0.1 的 `nodes.json` 方向

`nodes.schema.json` 與 `nodes.seed.json` 保留為 v0.1 草案資料，不作為執行源頭。真正的 graph source of truth 仍是：

- `data/all_nodes.json`
- `data/i18n/*.json`
- build 時產出的 `/data/all_nodes.json`、`descriptions.json`、`sections.json`

### 新焊點：`depth_manifest.json`

`depth_manifest.json` 只記 Depth page 自己的狀態：

- Depth page id
- 對應既有 `node_id`
- depth path（尚未上線時為 `null`）
- 是否公開
- QA gate 狀態
- mapping note

它不複製 graph label、description、connections，也不宣稱 prereq-DAG。既有 graph 的節點與連線仍由 `all_nodes.json` 負責。

## 3. CSP 與頁面形式

Neblux 現行 CSP 是 `script-src 'self'`。因此 deployable 深度頁禁止 executable inline script。允許：

- external same-origin JS module
- inline `<style>`（現行 CSP 允許）
- non-executable JSON metadata script，例如 `type="application/json"`

v0.1 的「單一 inline CSS/JS HTML、file:// 可直開」只可作為離線草稿，不可作為上站交付物。本計畫的 M1 黃金樣本必須一開始就採 Neblux 可上線形式，避免 M5 重寫。

## 4. 里程碑

### M-1 — 既有系統盤點（已新增）

交付：

- `ARCHITECTURE_AUDIT.md`
- 盤點既有 graph schema、build pipeline、CSP、目標概念 mapping。

驗收：

- 能回答「深度頁要掛在哪些既有 node id 上」。
- 能回答「第一頁要用哪種 CSP 相容形式」。

### M0 — Manifest 地基

交付：

- `depth_manifest.json`
- `validate-depth.mjs`

驗收：

- `node neblux-depth/validate-depth.mjs` 全綠。
- validator 至少檢查：
  - manifest entry id 唯一且 kebab-case
  - `node_id` 存在於 `data/all_nodes.json`
  - `status` 合法
  - `depth_path` 非空時檔案存在
  - depth page 不含 executable inline script
  - public page 必須有所有 QA gate

### M1 — 黃金樣本：弦波與三參數

交付：

- 一頁可互動黃金樣本。
- 參考來源/公式檢查筆記。
- manifest 對應 entry 從 `candidate` 推進到 `draft` 或 `review`。

最低內容 gate：

- Riku 能用自己的話說明公式每個符號如何對應互動控制。
- 每頁附 2 個以上可靠參考來源或教材來源。
- 手機與桌面實看。
- 若內容牽涉控制理論，必須額外標出推導假設與不處理的邊界。

### M2 — 管線驗證

只有 M1 定稿後才做。候選頁：

- Fourier series
- s-plane / poles

驗收重點不是「多兩頁」，而是記錄人工修補量、內容 QA 成本、維護成本是否可接受。

### M3+ — 正式整合

暫不實作。若要讓 graph card、Wonders 或 landing 露出深度頁，另開 brief，因為會接近 `data/*.json` 與 graph UI 整合面。

## 5. 品質門檻

任何一條不過，該頁不得公開：

- 一頁只教一個 aha。
- 一個 Canvas 主互動物，控制元件不超過 3 個。
- 預設畫面可理解且有生命，不需先讀長文。
- 公式只出現在形式化段落。
- 符號與控制元件顏色一致。
- 觸控可用。
- CSP 相容：無 executable inline script。
- 有 node metadata。
- 有來源與公式檢查筆記。
- 不新增帳號、後端、cookie、個資或追蹤。

## 6. 明確不做

- 不公開暗節點 backlog。
- 不新增分類系統。
- 不做第二套 graph。
- 不做後端。
- 不做三頁以外的新頁。
- 不改既有 deploy/CSP 來遷就實驗頁。

## 7. Backlog

- 若第一頁成功，考慮把深度頁產生流程納入既有 Vite build，但需另開 brief。

## 8. 修訂紀錄

- v0.3（2026-07-09）：命名定案為 `Neblux Depth`；不另設中文產品名；移除「實驗室」命名待決項。
- v0.2（2026-07-09）：採紅隊修案。新增 M-1；改用 `depth_manifest.json`；deployable 頁面改為 CSP 相容；新增內容正確性 gate。
- v0.1（2026-07-08）：初版，由對話結論整理。
