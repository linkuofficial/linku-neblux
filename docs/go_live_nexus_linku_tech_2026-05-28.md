# Nexus 正式上線手冊（nexus.linku.tech）

更新日期：2026-05-28

## 1. 本次上線採用方案

- 平台：Fly.io
- 部署區域：nrt（Tokyo）
- 應用名稱：nexus-linku
- 正式網域：nexus.linku.tech
- 備用網域：nexus-linku.fly.dev
- DNS 管理：Cloudflare（DNS only）

## 2. 準備條件

1. DNS 設定
- A 記錄：nexus.linku.tech -> 66.241.124.42
- AAAA 記錄：nexus.linku.tech -> 2a09:8280:1::11c:a15:0
- Proxy 狀態：DNS only（灰色雲），不要啟用 Cloudflare Proxy

2. Fly.io 帳號與 CLI
- `fly auth whoami` 可正常回傳登入帳號
- 專案根目錄已有 `fly.toml`

3. 必要 secrets
- `ADMIN_API_KEY`
- 其他非敏感值由 `fly.toml` 管理

## 3. 必填檔案

專案根目錄：
- `fly.toml`

目前線上設定重點：
- `APP_ENV=production`
- `CORS_ORIGINS=https://nexus.linku.tech,https://nexus-linku.fly.dev`
- `ADMIN_API_KEY` 以 Fly secret 管理
- `ADMIN_ENABLE_GENERATION_IN_PRODUCTION=false`

## 4. 伺服器部署指令（在專案根目錄執行）

1. 驗證配置
`fly status --app nexus-linku`

2. 設定或更新 secrets
`fly secrets set ADMIN_API_KEY=<value> --app nexus-linku`

3. 重新部署
`fly deploy --app nexus-linku`

4. 檢查機器與健康狀態
`fly status --app nexus-linku`
`fly checks list --app nexus-linku`

## 5. 驗證清單

1. 健康檢查
- 打開 https://nexus.linku.tech/api/health
- 預期 HTTP 200

2. 指標檢查
- 打開 https://nexus.linku.tech/api/metrics
- 預期可讀取文字指標

3. 前端核心流程
- 首頁可載入
- 圖譜頁可載入
- 搜尋可用
- 語言切換可用

## 6. 常用維運命令

- 重新部署（拉新代碼後）
fly deploy --app nexus-linku

- 查看日誌
fly logs --app nexus-linku
fly status --app nexus-linku
fly checks list --app nexus-linku

- 回滾（使用既有 runbook）
fly releases --app nexus-linku
fly deploy --app nexus-linku --image registry.fly.io/nexus-linku:<previous-tag>

## 7. 故障排查

1. 網域無法簽發憑證
- 先確認 DNS 已生效
- 確認 Cloudflare 為 DNS only，而不是 Proxy
- 執行 `fly certs check nexus.linku.tech`

2. 啟動即失敗
- 檢查 Fly secret 是否缺少 `ADMIN_API_KEY`
- 檢查 CORS_ORIGINS 不是單一 *
- 執行 `fly logs --app nexus-linku`

3. /api/health 正常但功能異常
- 先看 Fly logs
- 再跑 smoke:notify 檢查整體狀態
