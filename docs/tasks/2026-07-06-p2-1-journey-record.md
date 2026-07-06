# TASK: p2-1-journey-record（P2-1 旅程紀錄產物 — 可列印一頁）
狀態: review（實作＋驗證＋對抗審查完成 2026-07-06；未 commit，待凜空裁決）
建立: 2026-07-06 ｜ 秘書層: claude-opus-4-8 ｜ 實作層: 待定
Repo: Neblux
Base: master（working-tree）
Required verification: `npm run verify` ＋ 瀏覽器實看（`?print=1` A4 版面，三語）
風險等級: 中（wonders 產品面新表面；純前端零後端；非禁區，但有列印版面視覺驗證需求）

## 目標
交付 DIRECTION「教育與金流」段點名的**鑰匙功能**：走完一趟 tour 後，一鍵生成
一張**可列印的「旅程紀錄」**——星座圖 ＋ 七個 hook 問題 ＋ 2–3 題反思 ＋ 日期，
`@media print` 排成單頁 A4，三語。**零後端**，只用已載入的 wonder JSON。

這是 Phase 2 的第一步（Phase 0 已完成、為前置）。用途：給種子老師/學生一個
「走完留下什麼」的實體產物，也是後續 P2-2 種子老師試用的鉤子。

## 設計（提案，凜空可改）

### 觸發
- 新 URL 參數 `wonders.html?w=<id>&print=1`：boot 時若 `print=1` 且 `w` 合法，
  渲染紀錄視圖（不載 canvas/tour 流程，純靜態 DOM）。
- tour 終局（最後一站）加一條安靜連結「留下這趟的紀錄 →」（三語）→ 導到 `?w=<id>&print=1`。
- 紀錄頁提供一顆「列印 / 存成 PDF」鈕（呼叫 `window.print()`）＋返回 tour 的連結。
  **不自動彈列印**（安靜的驚奇，不打擾）。

### 紀錄視圖 DOM（新容器 `#wonder-record`，預設 hidden）
- 抬頭：tour 標題（在地化）＋副標「驚奇之旅紀錄 · Neblux」＋日期（在地化 `Intl.DateTimeFormat`）。
- **星座圖**：client 端生成 inline SVG，沿用 `build_share_pages.mjs` 的弧線佈局
  （`arcPoints` + spine + 星點），accent = `DOMAIN_COLORS[wonder.accent]`。**列印油墨友善**
  → 見決策①。
- **七個 hook 問題**：編號清單，每項 = 該站 `hook`（在地化），前綴該站節點 label 當小標。
- **反思**：2–3 題，取 `wonder.reflect`（在地化，選填欄位）→ 缺則 fallback `wonder.outward`。
  見決策③。
- 頁尾：日期、`neblux.linku.tech/wonders.html?w=<id>`、一行安靜出處。
- `@media print`：A4、隱藏站點 chrome（header、lang toggle、canvas、panel、intro、picker），
  目標單頁。

### 三語
所有字串進 `UI` 物件（en/zh/ja）＋ `pick()`。zh 過 `check_simplified.py`。

### 星座圖複用取捨
`arcPoints`/`seededRand`/星點畫法目前綁在 build 腳本（Node，含 `sharp`）。
提案：在 wonders 端**精簡重寫**一個純瀏覽器版（列印用線稿版與 og 的深底版本本就不同），
不強抽共用模組——與 repo 既有「app/explorer 平行 canvas 接線刻意不抽」的取捨一致，
接受少量重複。（若凜空偏好 DRY，另抽 `scripts/constellation.js` 純模組供兩端 import。）

## 驗收條件
- [ ] `wonders.html?w=light&print=1` 渲染 `#wonder-record`：含星座 SVG、7 個 hook 項、
      反思區塊、日期；站點 chrome 全隱藏。
- [ ] tour 終局有「留下這趟的紀錄」連結，點擊導到 `?print=1`。
- [ ] `@media print`（Playwright `emulateMedia({media:'print'})`）下版面正常；
      Ctrl+P 目標單頁 A4，三語版面皆不破。→ 見決策②。
- [ ] `reflect` 缺席時 fallback `outward`，行為正常；有 `reflect` 時顯示其題目。
- [ ] `npm run verify` 全綠（含新 e2e 守門）＋ `check_simplified.py` 0 ERROR。
- [ ] 瀏覽器三語實看列印預覽。

## 邊界（不要動的東西）
- `frontend/src/engine/`、canvas 渲染路徑、tour 走覽流程（紀錄頁是**加法表面**，不改既有流程）。
- `window.__nebluxWonders` hook 名、部署設定、`_headers`、`functions/`。
- **不新增 shipped tour 的 `reflect` 內容**（除非決策③要求）——機制先行，內容另行 authoring。
- 不 inline `<script>`（CSP）、不引外部資源、不新增依賴。

## Questions / 設計岔路（已裁決 2026-07-06，見下「裁決」）
① 星座圖油墨風格 → **白底線稿**（accent 細 spine ＋ 小星點，省墨影印清楚）。
② 單頁 A4 vs 七個完整 hook → **緊排力求單頁；溢出則優雅落第二頁，不刪減 hook 問句**。
③ `reflect` 內容 → **機制先行**：本次只支援 `reflect` 選填 ＋ 缺則 fallback `outward`；
   各趟 reflect 內容日後機會型 authoring（比照 P0-B spark 機制/內容分離）。
④ 反思區留白 → **只印題目**（不留手寫空行；改善單頁達成率）。

## HANDOFF（實作層完成或卡住後填）
- Branch: `master`（**未 commit**——依守則 §6 待凜空明確要求才提交）
- Summary: 交付定稿計畫。改動 5 檔（+472/-4）：
  - `frontend/wonders.html`：`#wonder-record` 容器（抬頭/星座/hooks/reflect/頁尾）＋終局 `#wp-record` 連結。
  - `frontend/src/wonders-main.js`：三語字串（recordKicker/Hooks/Reflect/Print/Back/Date/Link）；
    `renderRecord(id)`（概念名直抓 `/data/i18n/{lang}.json`，繞開 tour 路徑種過的 `en:{}` 快取）；
    `recordConstellationSVG()`（白底線稿，複用 og 弧線佈局）；`?print=1` boot 分支；lang toggle 重繪；
    終局 `#wp-record` 接線；`LOCALE` map（`Intl.DateTimeFormat` 在地化日期）。
  - `frontend/src/styles/pages/wonders.css`：`#wp-record`＋記錄頁螢幕深色樣式＋`@media print` 白底 A4
    （隱藏站點 chrome、去 `_base.css` body::before/after 灰暈、pt 尺寸緊排、`break-inside:avoid`）。
    記錄頁 z-15（低於 lang-toggle z-16 讓語言鈕在其上可點）。
  - `tests/e2e/wonders.spec.ts`：4 條守門（`?print=1` 渲染/7 hooks/日期/reflect fallback/chrome 隱藏；
    print-media 掉 chrome 留 sheet；切語言重繪；終局有紀錄連結）。
  - `docs/tour-authoring.md`：`reflect` 選填欄位（schema + 工藝標準；子代理撰寫、已複查一致）。
  - 決策③：reflect 機制先行——**無任何 shipped tour JSON 被改**，各趟現走 outward fallback。
- Verification:
  - `npm run verify` 全過（build 成功 + **e2e 55 passed**，含新記錄守門 #51–55；已含審查後補的 reflect-present 測試）。
  - `python scripts/check_simplified.py`：0 ERROR。
  - 瀏覽器實看：`?w=light&print=1` 三語（en/zh/ja）螢幕渲染正確（星座/在地化日期/概念名/reflect fallback）；
    Playwright emulate print-media 三語截圖確認白底 A4、深字、terracotta 線稿星座、無灰暈；A4 PDF 已生成。
- Remaining risks:
  - 單頁 A4：19 趟為 **10 趟 6 站、9 趟 7 站**（2026-07-07 更正——先前誤記「皆 7 站」）；light（7 站）三語實看單頁佳，6 站趟更寬鬆。未來更長的 tour 或極長 CJK hook 才可能溢出第二頁——決策②授權（不刪 hook）。
  - reflect 內容尚未 authoring（決策③），各趟走 outward fallback，屬預期非缺口。
  - ja 文案自然度建議母語者過目（tour-authoring §三語規則慣例）。

## Review（審查層填）
- Reviewer: claude（子代理，對抗性 lens，與實作層同家族——凜空可另找不同家族覆審）
- 模式: ③對抗驗證（獨立讀 brief + diff + AGENTS/DIRECTION/brand-voice，試圖擊破）
- 觸發原因: 凜空要求「派子代理」＋工作區交叉審查文化（brief Review 區）
- Verdict: **approve**（無 blocker、無鐵律/禁區/CSP/XSS 違反；build 過、e2e 全綠、零回歸）
- Findings（4 條，皆 minor/nit，已全數處置）:
  1. [minor] 切語言競態：記錄頁重繪缺 staleness guard → **已修**（`renderRecord` 捕捉 `lang`、await 後 `if (LANG!==lang) return`，比照 setupLangToggle）。
  2. [minor] `reflect`-present 路徑無測試（現無 tour 有 reflect）→ **已修**（新增 route 攔截注入 reflect 的 e2e，斷言渲染 `.wr-reflect-list` 非 fallback；e2e 55 綠）。
  3. [nit] 每次切語言重抓 tour JSON → **已修**（同 id 已載入則不重抓）。
  4. [nit] 文件誤寫「8 站」而 19 趟皆 7 站 → **已修**（brief Remaining risks 更正）。
- 審查已澄清的非問題（存查）：reflect+outward 皆缺時 heading 乾淨隱藏（現無此資料，防禦碼正確）；local 節點解析正確；`en:{}` 快取繞道有效；print `[hidden]` specificity 正確（一般 tour Ctrl+P 不漏空 sheet）；z-15 疊層正確；`?print=1` 無效 `w` fallback picker。

## 裁決（凜空）
- 決定: 四岔路皆取推薦——①白底線稿 ②緊排、溢出落第二頁不刪 hook ③機制先行、reflect 內容日後 ④只印題目。
- 日期: 2026-07-06
