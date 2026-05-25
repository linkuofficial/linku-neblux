# P1 開工前置清單（2026-05-24）

## 1. 已完成前置

- E2E 測試框架已加入：Playwright
- E2E 設定檔已建立：playwright.config.ts
- E2E smoke 已啟用並可執行：tests/e2e/smoke.spec.ts
- API contract precheck 已建立：tests/test_api_contract.py
- Contract 測試命令已加入：npm run test:contract
- Frontend 模組化 staging 目錄已建立：frontend/src/

## 2. P1 開工順序（建議）

1. 維持 E2E smoke 綠燈
- 確保 playwright.config.ts 的 webServer 流程可在 CI 與本機啟動。
- 若調整前端初始化流程，優先更新 smoke 斷言。

2. 開始 app.html 拆分（無行為變更）
- 先抽 API 呼叫與資料轉換。
- 再抽 state（搜尋、語言、學習狀態）。
- 最後抽 D3 graph render。

3. 擴充 contract 測試
- 覆蓋錯誤情境（404、400、429）。
- 在 schema 層級鎖定必要欄位。

## 3. 驗收基準

- python -m pytest tests -q 全綠。
- npm run build 成功。
- npm run test:contract 成功。
- 啟用後的 npm run test:e2e 至少 1 條 smoke pass。

## 4. 風險提醒

- app.html 拆分時，最容易破壞的是全域變數依賴與事件順序。
- 建議每次只搬一小段，立即跑 contract + smoke。
