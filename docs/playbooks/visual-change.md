# Playbook：視覺改動（engine 以外）

> 2026-07-06 建。適用：頁面樣式、版面、UI 呈現等**不動 `frontend/src/engine/`** 的視覺修改。
> 圖（app/explorer 頁）是 Canvas 渲染：DOM 斷言無效，驗證以瀏覽器實看＋E2E 像素取樣為準。

## 事前範圍檢查（任一命中 → 停）

- [ ] 列出要動的檔案。若包含 `frontend/src/engine/` 任何檔案 → **停**：強制交叉審查路徑，
      先寫 brief 並標記「請求交叉」，不得直接動手。
- [ ] 若涉及 `data/*.json` 結構變更或部署設定（`frontend/public/_headers`、Cloudflare Pages 設定）→ 同上，停下寫 brief。
- [ ] 其餘拿不準是否踩線 → 停，寫進 brief 的 Questions 區，禁止猜。

## 修改步驟

- [ ] 動手前 `npm run dev`（port 3000）先看改動前的外觀，留基準（截圖或肉眼記錄）。
- [ ] 進行修改。注意：CSP 會擋 inline script，script 一律外置檔案。
- [ ] 圖的視覺狀態走 node.vis／edge.vis 旗標（見 AGENTS.md Architecture），不要用 DOM/CSS 硬蓋 Canvas。

## 驗證

- [ ] `npm run dev` 瀏覽器實看：Canvas 內容用截圖／肉眼確認，勿只信 DOM。
- [ ] 受語言影響的視覺（文字長度、換行）：用語言切換鈕切 EN／中文／日文各看一遍。
- [ ] `npm run verify`（= build + E2E）全過。
- [ ] 若改動落在 `@visual` 標記的測試範圍：另跑 `npm run test:e2e:visual`。

## 收尾

- [ ] Done 前逐項核對 AGENTS.md「30 秒硬規則」的檢查清單（verify 全過、已實看、HANDOFF 已填）。
- [ ] E2E 斷言需要跟著改時：只為反映新的正確行為而改，不為讓測試過而放水；改動寫進 HANDOFF。
