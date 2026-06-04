# Nodus

跨領域知識圖譜探索平台，部署於 [nodus.linku.tech](https://nodus.linku.tech)。

**靜態前端，零後端。** Vanilla JS + D3.js，部署至 Cloudflare Pages。

## 快速開始

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 輸出至 dist/
```

> Node.js 22+ 必須。

## 專案結構

```text
Nodus/
├── frontend/               # 三個 HTML 入口（index / app / explorer）
│   ├── src/                # JS 邏輯
│   └── public/             # 靜態資源（_headers、圖示、主題）
├── data/
│   ├── all_nodes.json      # 627 個知識節點
│   ├── i18n/               # 多語言標籤（en / zh / ja）
│   └── ...                 # 生成日誌、批次紀錄
├── scripts/                # 資料生成、品質檢查、翻譯等離線工具
├── docs/                   # 狀態記錄、設計文件
├── vite.config.ts          # build + dev，含自動複製 data/ 到 public/data/
└── playwright.config.ts    # E2E 測試
```

## 部署

平台：**Cloudflare Pages**

| 設定 | 值 |
|------|-----|
| Build command | `npm run build` |
| Output directory | `dist` |

`frontend/public/_headers` 內含 CSP 等安全 headers，Cloudflare Pages 自動套用。

## 資料更新

修改 `data/all_nodes.json` 或 `data/i18n/*.json` 後，`npm run build` 會自動將最新資料複製到 `dist/data/`。

## 測試

```bash
npm run test:e2e          # Playwright E2E smoke
npm run test:e2e:install  # 首次安裝 Chromium
```

## 網址

- 正式：<https://nodus.linku.tech>
- GitHub：<https://github.com/linkuofficial/linku-nodus>
