# Neblux

好奇心驅動的知識體驗 → <https://neblux.linku.tech>

**Wonders（驚奇之旅）= 產品核心**：19 趟三語（en/zh/ja）敘事旅程，畫在 687 節點的知識圖譜上。

> **動手前先讀 [docs/DIRECTION.md](docs/DIRECTION.md)**——方向、鐵律、待辦順序都在那裡。

## 指令

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # → dist/
npm run test:e2e # Playwright smoke（首次先 npm run test:e2e:install）
```

Node.js 22+ 必須。

## 結構

| 路徑 | 內容 |
|------|------|
| `frontend/` | 4 入口：`index`（落地）、`wonders`（核心）、`app`（全圖）、`explorer`（轉型中） |
| `frontend/src/engine/` | 共用 Canvas 圖引擎 |
| `data/all_nodes.json` | 687 個知識節點（含英文描述） |
| `data/wonders/` | 19 趟 tour JSON（三語文案＋骨幹 edges） |
| `data/i18n/` | 多語標籤、描述、sections |
| `scripts/` | 離線資料管線（線上站不依賴） |
| `docs/` | `DIRECTION.md`（北極星）＋現行指南；歷史計畫在 `docs/archive/` |

## 部署

Cloudflare Pages：Build command `npm run build`、Output directory `dist`。
CSP 等 headers 在 `frontend/public/_headers`。
改 `data/*.json` 後重新 build 即更新（純靜態、零後端）。

## 網址

- 正式：<https://neblux.linku.tech>
- GitHub：<https://github.com/linkuofficial/linku-neblux>
