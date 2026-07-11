# TASK: depth-build-integration（M3：Depth 頁接入 build / sitemap / hreflang / E2E）
狀態: draft
建立: 2026-07-11 ｜ 秘書層: Claude(Opus 4.8) ｜ 實作層: 待定
Repo: Neblux
Base: working-tree（分支 codex/depth-layer-m0；四頁 + depth/files 和解包尚未 commit）
Required verification: `npm run verify`（build + E2E）＋ `node neblux-depth/validate-depth.mjs` 全綠 ＋ 瀏覽器實看
風險等級: 高（強制交叉）——本 task 觸禁區：`vite.config.ts` build 設定、可能觸及 sitemap 產生器與 `frontend/public/_headers`

> 本 brief 由 2026-07-11 和解包 README 指示 4 開立，承接 PLAN v0.4 §4.5 Phase A 的「M3 build 整合」項。
> **本 brief 只是規劃文件，不是動工授權。** 因觸禁區，實作前須走 repo 交叉審查路徑（AGENTS 30 秒硬規則），並經凜空核可。

## 目標

把 `depth/` 從「repo 根目錄、`file://` 直開的離線草稿」升級為 Vite build 的一級輸出，讓**已通過 Phase A 裁決 + Phase C 閘門**的 Depth 頁能真正上線（同源 `/depth/{slug}`），同時**不讓任何 `public:false`／未裁決的頁面外洩**。

現況（動工前盤點，2026-07-11 已確認）：
- `depth/` 在 repo 根，位於 Vite `root: 'frontend'` 之外；build input 只有 `frontend/` 下 index/app/explorer/wonders 四個 HTML（`vite.config.ts:143-148`）。**depth 頁完全不進 build、不進 dist、不進 sitemap。**
- `staticHtmlPlugin`（`vite.config.ts:113-126` → `scripts/build_static_html.mjs`）產的「concept pages ×3 langs / sitemap / graph.json」是**另一套** discoverability 層，與 depth 頁無關。
- depth 頁為外置 JS（`depth/*.js`），同源載入受現行 CSP `script-src 'self'` 覆蓋——只要最終路徑仍同源即相容，無需放寬 CSP。

## 執行順序（建議）

1. 決策設計（填 Questions）：depth 頁在 dist 的落點、public 旗標如何 gate sitemap 收錄、depth 頁走 Vite input 還是靜態 copy。
2. build 接線：讓 `npm run build` 把 depth 頁 + 其 JS/CSS 輸出到 dist 對應路徑。
3. sitemap / hreflang：只收 `public:true` 且 `review_status: published` 的頁；hreflang 骨架就位（繁中先行，en 未做前不虛掛 alternate）。
4. E2E：depth 頁 smoke（no-JS 可讀、CSP 無違規、canvas 掛載）。
5. HANDOFF 交結論。

## 驗收條件

**build 接線**
- [ ] `npm run build` 後，dist 內存在**已核可上線**的 depth 頁與其 `*.js`/`*.css`，路徑同源可 fetch（建議 `/depth/{slug}`；最終落點見 Questions 裁決）。
- [ ] `public:false` 或 `review_status != published` 的頁**不進 dist**（或進 dist 但確定不被 sitemap/導覽/連結引用——擇一，於 HANDOFF 說明採哪案與理由）。
- [ ] depth 頁的外置 JS 在 build 後仍同源、CSP `script-src 'self'` 下可執行；**不放寬 CSP**。
- [ ] build 產物為 gitignore 建置物，不污染 `depth/` 源碼樹。

**sitemap / hreflang**
- [ ] sitemap 只收 `public:true && review_status==='published'` 的 depth 頁；未裁決四頁一律不收。
- [ ] canonical + hreflang 骨架就位；**en 版尚未存在前不產生 en alternate**（避免 hreflang 指向 404）。
- [ ] JSON-LD/meta 忠實反映頁面可見內容（沿用 SPEC_DELTA 語意衛生條款，不宣稱 GEO 保證）。

**E2E / 驗證**
- [ ] 新增 depth 頁 Playwright smoke：no-JS 主要文字可讀、CSP 無 console 違規、canvas 有掛載、手機/桌機各一輪。
- [ ] `node neblux-depth/validate-depth.mjs` 全綠（含 depth_path 檔案存在檢查在 build 後路徑仍成立）。
- [ ] `npm run verify` 全過；視覺以 `npm run dev` 瀏覽器實看。

## 邊界（不要動的東西）

- **觸禁區必走交叉審查**：`vite.config.ts`、sitemap 產生器（`scripts/build_static_html.mjs`）、`frontend/public/_headers`——任一改動先有本 brief + 交叉審查 + 凜空核可，禁止順手。
- 不改 `data/*.json` 結構、不改 `frontend/src/engine/`、不動 `functions/`、不改 Cloudflare Pages 設定。
- **不發布任何未過 Phase A 裁決 + Phase C 閘門的頁**：build 接線是基礎設施，發布與否由裁決與閘門決定，兩者解耦。
- 不引入 MathJax/KaTeX/CDN/新 production dependency；不放寬 CSP。
- 不新增 graph node、不接正式導覽（導覽露出屬另一 brief）。
- 不 commit/push 除非凜空明說。

## Questions（實作層填；卡住或需決策時）

- depth 頁在 dist 的落點與生成方式：(a) 加為 Vite rollup input（需把 HTML 納入 Vite 可解析範圍，可能要調 root/相對路徑）？(b) 仿 `copyDataPlugin` 寫一支 `copyDepthPlugin` 把 `depth/` 選定頁複製進 `frontend/public/depth/`（gitignore）再由 build 帶進 dist？——(b) 較低風險、與現有 data/wonders copy 模式一致，建議預設 (b)，待裁決。
- `public:false` 頁的處置：完全不 copy（最安全）vs copy 但排除於 sitemap/連結？預設「完全不 copy」。
- hreflang：繁中先行期是否只輸出 `zh-Hant` self-canonical、不掛 alternate？預設是。

## HANDOFF（實作層完成或卡住後填）
- Branch:
- Summary:
- 採用的落點方案與理由:
- Verification: <npm run verify、validate-depth.mjs、瀏覽器實看結果>
- Remaining risks:

## Review（審查層填；跨家族）
- Reviewer:
- 模式:
- 觸發原因: 路徑觸發（禁區：build/部署設定）— 強制交叉
- Verdict: approve | fix-needed
- Findings:
  -

## 裁決（凜空）
- 決定:
- 日期:
