# TASK: app-v2-starfield-fidelity

狀態: 進行中（第一、二階段 done；第三～五階段未開始）

## 目標

縮小 Main Galaxy v2 與「真實星空」的落差。凜空的判斷是畫面讀起來像資料視覺化的彩色節點，不像天空。分五階段、小步可回退：

1. 重做背景星場（三層視差）與星等語法
2. 拆分星體 sprite family（不再等比縮放單一配方）
3. 降低星體飽和度（色彩交給星雲／環境光／標籤）
4. 改善星雲與大尺度結構
5. 最後微調標籤

## 邊界（本輪明確不做）

- 不改 canonical layout、不用 layout migration 解決視覺密度
- 不改節點語意關係、不大幅更動 declutter 邏輯、不重寫整套 renderer
- 不動 `frontend/src/engine/`（禁區／review-locked）、canonical data schema、部署設定

---

## 第一階段 — 背景星場（done）

`frontend/src/engine-v2/atmosphere-cache.js` 重寫。

**架構決定：星場拆成兩個族群，因為它們的失效模式不同。**

- **微塵（micro + small）走 tile**：每 1024² 約 1200 顆，單顆不具辨識度，tile 重複真的看不見。
- **亮星與 bloom 不走 tile，改走無界 hash grid**（以整數 cell 座標為種子）。理由：bloom 是天空裡最有辨識度的東西，在 768px 節距上同步重複 6 次就是壁紙；加大 tile 或多層錯位都壓不掉，因為 lockstep 正是週期性的本質。hash grid 以 cell 座標為種子 → 永不重複。

**參數**

| dust 層 | tile | count | parallax | alpha | smallRatio |
|---|---|---|---|---|---|
| far | 768 | 419 | 0.06 | 0.62 | 0.08 |
| mid | 597 | 110 | 0.16 | 0.82 | 0.14 |
| near | 461 | 26 | 0.30 | 1.0 | 0.30 |

| grid | cell | chance | parallax | bloomChance |
|---|---|---|---|---|
| glint | 78 | 0.15 | 0.30 | 0.16 |
| beacon | 150 | 0.105 | 0.44 | 0.62 |

tile 尺寸互質（768/597/461 無公因數）、各層獨立 seed 與相位偏移；`BAKE_DPR_CAP = 2`。

**兩個實測發現（都不是憑推理）**

1. **cell 佔用率必須低。** 初版用 cell 186 / chance 0.86，等於「幾乎每格恰好一顆星」＝抖動晶格，永遠不結團也不留空洞。改成 cell 78 / chance 0.15（同密度）後 dispersion（var/mean）達 0.87–0.94 ≈ Poisson，每 1024² 區塊星數在 11–40 間浮動。
2. **`hash01` 不能用來從單一種子導出多個獨立值。** 見下方「已修 bug」。

**實測分布**（每 1024²，規格 vs 實際）

| | 規格 | 實際 |
|---|---|---|
| 總數 | 900–1500 | 1228 |
| micro | ~85% | 86.3% |
| small | ~12% | 11.2% |
| bright | ~2% | 1.94% |
| bloom | <1% | 0.59% |
| 十字星芒 | 極少數 | 2.2/1024²（1080p 螢幕約 4 顆）|

星等分配改用**精確配額斜坡**（`(i+0.5)/N` 經 gamma warp）而非抽樣：抽樣時 hash01 的取樣運氣讓 bright 實測 3.75%，是規格的近 2 倍。

### 已修 bug：hash01 的雜湊相關性（星星排成直線）

空白天區出現一條對角線星鏈。根因：`hash01` 是 FNV-1a，最後一步是 `h = (h ^ lastChar) * prime`。`${s}:x` 與 `${s}:y` 只差 1 個 bit（'x'=120, 'y'=121），所以兩者雜湊值**恰好相差一個固定常數**。

實測：419 顆星的 `(y−x) mod 1` **只有 2 個值**（0.77619 / 0.22381 交替）→ 全部落在 2 條對角線上。

**Pearson 相關係數為 −0.017（幾乎為零）** —— 這個鎖是模數性的、不是線性的，一般相關性檢定完全驗不出來，只有看差值分布才現形。`posx`/`posy` 這種命名一樣中招（4 個桶）。

修法：不再靠調整種子拼法（改把變動欄位放最前面只把 154 桶提升到 260 期望值中的 154，仍結構化），而是在 engine-v2 內加一個本地 `rand()`，補上 FNV 缺的 splitmix32 finalizer 並保留完整 32-bit 值域。修後 far dust 從 3 桶 → 264 桶（期望 260）、跨欄位獨立性全過、卡方 18.6 < 30.1 均勻。

`createNebulaSprite` 仍用 `hash01(`${domainKey}a${blob}`)` / `d${blob}` / `r${blob}` —— **同一類隱患尚未處理**，屬第四階段範圍。

---

## 第二階段 — sprite family（done）

`sprite-registry.js` + `tokens.js`。magnitude 不再是縮放係數，而是**不同種類的物件**：

| tier | family | core | glow | halo | corona | spike | ring |
|---|---|---|---|---|---|---|---|
| nucleus | bloom | 9 | 16 | 34 | 72 | 76 | 34 |
| major | bloom | 6.6 | 11 | 26 | 54 | 0 | 27 |
| bright | tight | 3.6 | 5 | 11 | 0 | 0 | 19 |
| standard | disc | 1.9 | 0 | 3.6 | 0 | 0 | 12 |
| faint | point | 1.05 | 0 | 0 | 0 | 0 | 7 |

- `point`：銳利點，無 halo／corona。`disc`：小白核＋極窄柔邊。`tight`：白熱核＋緊密 halo（專用較陡的 `tightHaloStops`）＋外緣少量 domain 色，無 corona。`bloom`：完整四層＋corona，僅 nucleus 有星芒。
- **halo/core 比值 0 → 1.9 → 3.1 → 3.9**（舊版恆為 ~4.2，即線性縮放）。亮度買到的是過曝與散射，不是整顆放大。

### 關鍵解耦：`ring`

renderer.js:425 原本把 `magnitude.halo` 當 **overlay 環半徑**傳給 `drawNodeOverlays`。若不解耦，standard 的 halo 12→3.6 會讓 selected corona 一併縮水，違反 declutter 的「保留 selected corona」。新增 `ring` 欄位（值＝舊 halo 表）專供 overlay 幾何，renderer 改讀 `magnitude.ring ?? magnitude.halo`。

驗證：視覺快照 `selected-depth-portal` 的 brightPixels 1200 → 1162（僅 −3%）。若未解耦此數會腰斬。

---

## 效能與記憶體（第一、二階段後）

同條件對照（headless Chromium ＝軟體光柵，絕對值不可信，**只看前後差**）：

| | baseline | 新版 | delta |
|---|---|---|---|
| cold first paint | 81 ms | 99 ms | +18 ms |
| overview p50 | 85.7 ms | 96.3 ms | +12% |
| mid p50 | 102.3 ms | 111.6 ms | +9% |
| near p50 | 2.3 ms | 2.4 ms | +4% |

真實 GPU 瀏覽器（Browser pane）實測 `lastFrameMs` 6.5 ms。每幀 51 次 dust blit + 約 70 次 star stamp + 594 個 cell 掃描。

**canvas 記憶體**（starfield）

| device dpr | bake | 新版 | 舊版 |
|---|---|---|---|
| 1 | 1 | 4.6 MB | 4.0 MB |
| 2 | 2 | 18.3 MB | 16.0 MB |
| 3 | 2 | **18.3 MB** | **36.0 MB** |

dpr 3 手機因 `BAKE_DPR_CAP` 反而減半。sprite cache 因 faint/standard/bright 不再配置 corona 而縮小。

---

## 驗證（第一、二階段）

- `npm run test:renderer-v2` 32/32、`test:atlas` 54/54、`test:depth-build` 4/4、`test:e2e` 111/111、`npm run build` 成功。
- 視覺快照 `renderer-v2-overlay-pixels` 已重烘（opaquePixels 維持 32400 不變＝幾何契約完好；brightPixels −3.5%＝星體收斂，如預期；4 個 case hash 仍全異）。
- 瀏覽器實看：desktop overview（1750×1093、dpr 2/3）、空白天區、密集核心區、連續拖曳平移 ×3。對角線假影已消失、平移後星圖完全不同（無重複）、視差成立。

## 已知問題 / 待辦

- **`renderer-v2-visual.spec.ts` 既有 flaky（非本輪造成）**：基準版程式碼＋基準版快照，3 次跑出 1 過 2 失敗。`reduced` 區段逐位元穩定；`normal` 區段 4 個 case 的 rgbSum 同步漂移 −130，`opaquePixels`/`brightPixels` 從不變。根因是 `twinkleAlpha(node, nowMs)` 取 rAF 時戳，而快照把時間相依的值寫死。已開獨立任務（task_9fca6bf0）。
- 標籤在星體收斂後相對更突出 —— 第五階段處理，本輪刻意不動。
- 第三～五階段未開始。

## HANDOFF

- Branch: `codex/graph-atlas-integration`
- 未 commit。
- 改動檔案：`frontend/src/engine-v2/atmosphere-cache.js`（重寫）、`sprite-registry.js`（family 拆分）、`tokens.js`（magnitude 表）、`renderer.js`（1 處：overlay 環半徑改用 `ring`）、`tests/e2e/renderer-v2-visual.spec.ts-snapshots/renderer-v2-overlay-pixels-chromium-win32.json`（重烘）。
