# TASK: p1-backend-skeleton（P1 開場：止血 + P1-0 骨架）
狀態: review（程式面完成，待審＋`[人工]` D1/KV）
建立: 2026-07-06 ｜ 秘書層: claude-opus-4-8 ｜ 實作層: claude-opus-4-8
風險等級: 高(強制交叉) — 觸及禁區「部署設定 / `functions/`」

## 目標
啟動 P1 後端（平台鎖定 Cloudflare Pages Functions）。本 brief 只涵蓋 ROADMAP
所述「開場」與 **P1-0 骨架**，不含 P1-1/1-2/1-3：

1. **止血** — landing/explorer 現在無條件先打 `/api/*`、失敗才 fallback 靜態。
   線上根本沒有這些後端，每次載入都白打一輪失敗請求（console error＋多一趟 RTT）。
   加 `API_ENABLED` 旗標關掉這些嘗試（預設 false → 直接走靜態）。
2. **P1-0 骨架** — 新增 `functions/api/health.ts`（回 `{ok:true}`），
   本地以 `npx wrangler pages dev dist` 驗證；`functions/schema.sql` 落地 D1 schema。
   D1（綁定 `DB`）與 KV（綁定 `LINKS`）由 `[人工]` 在 Cloudflare dashboard 建立。

## 決策（凜空已定）
- Q1 止血策略：**(a) 旗標關閉但保留** `/api/graph/*`、`/api/i18n/*` 分支（可逆、符合 ROADMAP 字面）。
- Q2 本次範圍：**止血 + P1-0 骨架一起做**。
- Q3 wrangler：走臨時 `npx wrangler`，暫不加 devDependency。

## 驗收條件
- [x] `API_ENABLED`（預設 false）下，landing/explorer 載入時**零** `/api/*` 請求，四頁功能與現在相同。
- [x] `functions/api/health.ts` 存在；`npx wrangler pages dev dist` 本地 `GET /api/health` 回 `{"ok":true}`。
- [x] `functions/schema.sql` 落地（echo / tour_finish 兩表）。
- [x] `npm run verify` 全綠（build + e2e），含 `api-failure.spec.ts` 維持綠。
- [x] 未新增未經核准的 runtime 依賴（wrangler 走 npx）。

## 邊界（不要動的東西）
- 不動 `engine/layout.js` 預烘焙、不改 `window.__nebluxApp`/`__nebluxExplorer` hook 名。
- 不改 CSP（`frontend/public/_headers`）；後端同源 `/api/*`，本就不需動 CSP。
- 不碰 P1-1/1-2/1-3 的端點與前端 UI。
- 不改 `data/*.json`、不重構規格外程式。

## Questions（實作層填）
- 事件記錄：re-apply 期間發現 `explorer-main.js` ~L934 曾出現一段**非本任務、非實作層所寫**的 `pointermove` throttle（`lastPointerMoveTime`/`POINTER_THROTTLE_MS`），且整個工作樹一度被外部回復到 HEAD。已依凜空指示重套本任務變更、**未**納入該 throttle。若那段是刻意的，另開任務處理（含 trailing-edge 隱患）。

## `[人工]` 依賴（需凜空在 Cloudflare 操作）
- Cloudflare dashboard 對 Pages 專案建立並綁定：**D1（綁定名 `DB`）**、**KV（綁定名 `LINKS`）**。
- 套用 schema：`npx wrangler d1 execute DB --file=functions/schema.sql`。
- 確認 Pages 專案已與此 repo 連動（build `npm run build`、output `dist`）。

## HANDOFF
- Branch: `master`（待凜空指示才 commit）
- Summary:
  - 止血：新增 `frontend/src/config.js`（`API_ENABLED=false`）；gate `landing-main.js`（graph/full、i18n）與 `explorer-main.js`（graph/full、i18n labels、descriptions）全部 `/api/*` 嘗試。旗標關閉但保留分支。
  - 骨架：新增 `functions/api/health.ts`（`onRequestGet`→`{ok:true}`，零依賴）、`functions/schema.sql`（echo/tour_finish）。
  - 衛生：`.gitignore` 加 `.wrangler/`。
- Verification（首輪，重套前已全過；重套後需再跑一輪確認）:
  - `npm run build` ✔；`npm run test:e2e` ✔ 43 passed（含 `api-failure.spec.ts`）。
  - `npx wrangler pages dev dist --compatibility-date 2024-11-06`：`GET /api/health`→`{"ok":true}`。**坑**：compat date 不可用未來日期（環境時鐘 2026、wrangler binary 較舊）。
  - 瀏覽器：landing + explorer(ja) 零 `/api/*`、直達 `/data/*`、console error 0。
- Remaining risks:
  - `[人工]` D1/KV 未建（health 不需）。
  - 工作樹曾被外部回復＋出現外來 throttle 改動——repo 疑有另一 session/工具/同步程序在動，凜空待查。
  - 旗標翻 true 前 echo/og/share 端點尚未接；翻 true 需同時確認優雅降級。

## Review（審查層填）
- Reviewer: 兩個獨立 claude agent（correctness ／ removed-behavior+conventions），對 scratchpad 快照審。（首輪流產：工作樹在審查啟動瞬間被外部回復成空 diff；重套後對快照重跑成功。）
- 模式: ③對抗驗證（correctness 角度 + removed-behavior/慣例角度）
- 觸發原因: 路徑觸發(強制) — 禁區：部署設定 / `functions/`
- Verdict: **approve**（兩者皆 0 findings）
- Findings:
  - （latent，非 live）landing `loadI18n` 的 `if (!data)`：未來旗標翻 true 後，若 `/api/i18n/{locale}` 回 HTTP 200 但 body 為 falsy-valid JSON（`null`/`0`/`""`）會改抓靜態。`API_ENABLED=false` 下不可達，且「退靜態」比「i18n=null」更安全。**翻旗標前複查一次**即可，現不改。
  - health.ts `onRequestGet`+`Response.json()` 對 Pages runtime 正確；import 8 空格縮排無 parse 風險（Vite module bundling）。
  - gating 完整：landing/explorer 無殘留 ungated `/api`（app-main.js:388 僅註解）。

## 裁決（凜空）
- 決定:
- 日期:
