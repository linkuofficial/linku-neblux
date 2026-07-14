# Verification Runbook

> 2026-07-13 依凜空指示清償技術債：舊版（Nodus 時代 Python 後端流程：pytest／uvicorn／Neo4j）全文裁撤，重寫為現行流程。
> 規則的**單一事實來源仍是 `AGENTS.md`**（30 秒硬規則＋驗證門檻節）；本檔只保留「跑什麼、什麼時候跑」的最短路徑，常見任務 SOP 見 `docs/playbooks/`。若本檔與 AGENTS.md 衝突，以 AGENTS.md 為準並回報。

## 平常改動（宣稱完成前必跑）

```bash
npm run verify   # = npm run build + npm run test:depth-build + npm run test:e2e
```

- 視覺改動另需 `npm run dev` 開瀏覽器實看（圖是 Canvas 渲染，DOM 斷言無效）——SOP 見 `docs/playbooks/visual-change.md`。
- E2E 第一次跑之前：`npm run test:e2e:install`（裝 Chromium）。

## 分區補充守門（碰到對應區域才跑）

| 改到什麼 | 追加命令 |
|---|---|
| `depth/` 頁面或 `neblux-depth/depth_manifest.json` | `node neblux-depth/validate-depth.mjs` |
| depth 頁的公式／數值敘述（claim-source 表相關） | `node depth/sine-wave-claim-check.mjs`、`node depth/fourier-series-claim-check.mjs`、`node depth/transformer-claim-check.mjs`、`node depth/s-plane-claim-check.mjs`（各自對應 `depth/<page>-claim-sources.md` 的 [V] 欄） |
| `config/atlas/`、`scripts/atlas/` | `npm run test:atlas`＋`npm run atlas:validate`；layout 相關另有唯讀 gates：`npm run atlas:layout:check`／`atlas:layout:diff`／`atlas:layout:debt`（授權範圍見 `docs/tasks/2026-07-12-graph-atlas-wp2-stable-layout.md`） |
| tour 資料 `data/wonders/*.json` | 照 `docs/playbooks/edit-tour-data.md` |

## 這個 repo 沒有的東西（防止照舊筆記誤跑）

- **零後端**：沒有 pytest、uvicorn、Neo4j、smoke:notify——那些屬已淘汰的 Nodus 時代流程，任何舊筆記出現一律不要照做。
- 部署驗證：Cloudflare Pages 直接用 `npm run build`（output `dist/`），沒有額外 runbook 步驟；部署設定屬禁區，動之前先開 brief 走交叉審查。
