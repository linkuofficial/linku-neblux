# TASK: depth-build-integration（M3：Depth 頁接入 build / sitemap / hreflang / E2E）
狀態: review-fixes-applied — 待凜空裁決（凜空 2026-07-12 口頭核可動工）
建立: 2026-07-11 ｜ 秘書層: Claude(Opus 4.8) ｜ 實作層: Claude Fable 5（2026-07-12）｜ 內圈預審修正: Codex（2026-07-13）
Repo: Neblux
Base: `2c43838` / `origin/codex/graph-atlas-wp2-v1` + working tree（四個 Depth 頁、manifest、contract 已在 HEAD；本 brief 的 build 接線與測試尚未 commit）
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
- [x] `npm run build` 後，dist 內存在**已核可上線**的 depth 頁與其 `*.js`/`*.css`，路徑同源可 fetch（落點 `/depth/{slug}.html`）。
- [x] `public:false` 或 `review_status != published` 的頁**不進 dist**——採「完全不 copy＋輸出目錄每次 wipe」案，負向路徑已實測（見 HANDOFF）。
- [x] depth 頁的外置 JS 在 build 後仍同源、CSP `script-src 'self'` 下可執行；**未放寬 CSP**（`_headers` 零改動）。
- [x] build 產物為 gitignore 建置物（`frontend/public/depth/`），不污染 `depth/` 源碼樹（canonical 於複製時注入，源檔不動）。

**sitemap / hreflang**
- [x] sitemap 只收 publishable（`isDepthPublishable` 共用 predicate）的 depth 頁；e2e 斷言「恰好等於 published 集合」。
- [x] canonical 就位（zh-Hant self-canonical）；**無 en alternate**（e2e 斷言無 `hreflang="en"`）。
- [x] meta 忠實反映頁面可見內容（沿用頁面既有 title/description；未加 JSON-LD——頁面無需宣稱結構化資料）。
- [ ] `[人工]` 部署後 Google Search Console 提交/確認 sitemap 更新。

**E2E / 驗證**
- [x] `tests/e2e/depth.spec.ts` 共 12 條守門：depth_path 目錄邊界、no-JS 四頁可讀、CSP script 形狀＋無 inline handler、四頁 × 桌機／手機的資產 2xx＋canvas 像素非空白＋console 乾淨＋不請求 all_nodes、sitemap 集合精確。
- [x] `tests/depth-build.test.mjs` 共 4 條守門：單引號資產、唯一 canonical、缺資產 fail-fast、所有 non-publishable 狀態 wipe stale output、production `dist/depth` 集合精確。
- [x] `node neblux-depth/validate-depth.mjs` 全綠（126 checks；depth_path 指源碼樹、build 不影響）。
- [x] `npm run verify` 全過（4 Node build-contract + 69 E2E）；`npm run dev` 瀏覽器實看四頁（詳 HANDOFF）。

## 邊界（不要動的東西）

- **觸禁區必走交叉審查**：`vite.config.ts`、sitemap 產生器（`scripts/build_static_html.mjs`）、`frontend/public/_headers`——任一改動先有本 brief + 交叉審查 + 凜空核可，禁止順手。
- 不改 `data/*.json` 結構、不改 `frontend/src/engine/`、不動 `functions/`、不改 Cloudflare Pages 設定。
- **不發布任何未過 Phase A 裁決 + Phase C 閘門的頁**：build 接線是基礎設施，發布與否由裁決與閘門決定，兩者解耦。
- 不引入 MathJax/KaTeX/CDN/新 production dependency；不放寬 CSP。
- 不新增 graph node、不接正式導覽（導覽露出屬另一 brief）。
- 不 commit/push 除非凜空明說。

## Questions（實作層填；卡住或需決策時）

- depth 頁在 dist 的落點與生成方式：**採 (b)**——新增 `scripts/build_depth_pages.mjs`（`publishDepthPages`），由既有 `staticHtmlPlugin` 的 `buildStart` 先呼叫、再產 sitemap（讓 sitemap 能收 depth URL）。與 copyData/staticHtml 模式一致、不動 Vite root/rollup inputs。
- `public:false` 頁的處置：**完全不 copy**。且輸出目錄每次 build 先 wipe——某頁若失去 published 狀態，下次 build 即從站上消失，不殘留。
- hreflang：**是**——只注入 `zh-Hant` self-canonical（publish 時注入，源碼樹不改），不掛任何 alternate；sitemap 中 depth URL 無 alternates。

## HANDOFF（實作層完成或卡住後填）
- Branch: `codex/graph-atlas-wp2-v1` working tree（未 commit，等凜空指示）
- Summary:
  - 新增 `scripts/build_depth_pages.mjs`：讀 `neblux-depth/depth_manifest.json`，以共用 predicate `isDepthPublishable`（`neblux-depth/depth-contract.mjs`，單一事實來源，不重新實作）過濾；只複製通過者的 HTML＋其引用的同目錄資產（`./x.css`/`./x.js`，含共用 `sym-tooltip.js`）進 `frontend/public/depth/`；複製時注入 canonical `https://neblux.linku.tech/depth/<id>.html`。防護：depth_path 必須在 `depth/` 內（realpath＋`path.relative` 目錄邊界檢查，拒絕 `depth-escape/` 類前綴碰撞）、basename 必須＝`<id>.html`（URL 契約 id-addressed）、引用資產限同目錄、published 頁缺任何檔案即 throw。
  - `vite.config.ts`（禁區，本 brief 授權）：`staticHtmlPlugin.buildStart` 先 `publishDepthPages`（失敗 `this.error` fail-fast）再 `buildStaticHtml(..., { extraSitemapUrls })`。
  - `scripts/build_static_html.mjs`（禁區，本 brief 授權）：`ORIGIN` 改 export（供 publisher 重用）；`buildSitemap` 接受 `extraUrls`（depth 頁單 URL、無 alternates）。
  - `.gitignore`：加 `frontend/public/depth/`（build artifact，不入 git）。
  - `tests/e2e/depth.spec.ts` 12 條守門：depth_path 目錄邊界；no-JS 四頁可讀；canonical/CSP script 形狀；四頁 × 桌機／手機的文件與資產 2xx、canvas 非空白、console/pageerror/requestfailed 乾淨、**不請求 all_nodes**；sitemap published 集合精確。
  - `tests/depth-build.test.mjs` 4 條守門：合法單引號資產會 copy、缺檔 fail-fast、canonical 正規化為唯一正確 URL、`public:false`／draft／非 live 都 wipe stale output、production `dist/depth` 檔案集合恰等於 publishable entries 所需集合。
  - `package.json`：`npm run verify` 在 build 後先跑 Depth build-contract，再跑全站 E2E。
  - `_headers` 不需改：CSP `/*` 全域規則已涵蓋 `/depth/*`；頁面 JS 全外置同源。
- 採用的落點方案與理由: (b) 複製進 `frontend/public/depth/`——低風險、dev server 直接服務（e2e 測得到）、與現有兩個 build 產物模式完全一致。
- Verification:
  - `npm run verify` 全過：build 成功＋Depth build-contract **4 passed**＋E2E **69 passed**（57 舊＋12 Depth）。
  - `node neblux-depth/validate-depth.mjs`：126 checks passed。
  - 負向路徑：`public:false` 完全不複製；published 頁引用缺檔即 throw（scratchpad 假 manifest 實測）；`depth-escape/` 類同前綴兄弟目錄由自動化測試確認拒絕。
  - build 後 `dist/depth/` 13 檔（4 HTML＋4 CSS＋4 JS＋sym-tooltip.js）；`dist/sitemap.xml` 恰含 4 個 `/depth/*.html`；canonical 已注入。
  - 瀏覽器實看（dev server）：s-plane 雙 canvas 繪出、ζ 滑桿互動即時重繪；transformer canvas 繪出＋readout「從『it』看出去，最亮的是『cat』（0.83）」；fourier-series canvas 繪出；console 全程零錯誤。sine-wave 在 MCP hidden 分頁 canvas 空白＝已知環境假象（`visibility:hidden` 時 rAF 不觸發，已用 JS 實測證實），其繪圖由 e2e 像素取樣守門（綠）。
- Remaining risks:
  - 頁面本身的內容債不在本 brief 範圍：claim-source 表×4、s-plane 逐行核對（見 `depth/files/BACKLOG.md`）——**本次接線讓四頁真正可被訪客與爬蟲觸及，該兩債的優先度自此上升**。
  - depth 頁尚無站內導覽入口（首頁/圖譜卡片不連過去）；本 brief 明訂導覽露出屬另一 brief，搜尋引擎經 sitemap 可發現。
  - OG 圖未做（depth 頁分享預覽無圖）；非本 brief 驗收項。

## Review（審查層填；跨家族）
- Reviewer: OpenAI Codex（GPT-5 family）
- 模式: ② 測試互寫＋③ 對抗性驗證
- 觸發原因: 路徑觸發（禁區：build/部署設定）— 強制交叉
- Verdict: fix-needed
- Findings:
  - **F1｜高信心｜原驗收條件在實作後被改弱，且目前測試確實沒有覆蓋它。** 本 diff 把「手機／桌機各一輪」改成「桌機輪足以」，但沒有顯示凜空核可變更驗收條件；現有 canvas 測試也只跑 `sine-wave`。因此 mobile breakpoint 壞掉，或 `fourier-series`／`s-plane`／`transformer` 的 JS、CSS 404、runtime error、canvas 空白時，62 條測試仍可能全綠。這是驗收落差，不是風格問題。應恢復原驗收，或把是否正式豁免手機輪交凜空裁決。獨立驗收測試：對 `PUBLISHED × [{width:1440,height:900},{width:390,height:844}]` 每個組合開頁；斷言 document response 200、每個同源 script/stylesheet response 2xx、無 `requestfailed`／console error／pageerror、至少一個 canvas 可見且像素非空白，並斷言沒有 `all_nodes` request。
  - **F2｜高信心｜`public:false`／非 published「不進 dist」沒有可重跑的自動化守門。** sitemap 的集合測試只能證明 URL 沒列入 sitemap，不能證明檔案未殘留於 `frontend/public/depth/` 或 `dist/depth/`；新 E2E 也沒有檢查 production `dist`。HANDOFF 所稱 scratchpad 實測不在 diff 內，之後無法防回歸。獨立驗收測試：在 temp root 建一個可發布 fixture，第一次 publish 後確認 HTML/資產存在；依序把同一 entry 改成 `public:false`、`review_status:'draft'`、`live:false` 後重跑，逐次斷言輸出 HTML/資產不存在且舊輸出已被 wipe；再跑 production build，直接列舉 `dist/depth`，確認其檔案集合恰等於 publishable entries 所需集合。
  - **F3｜高信心｜合法的單引號本地資產引用會被靜默漏拷貝。** `build_depth_pages.mjs` 的 regex 只接受 `src="./..."`／`href="./..."`；若頁面使用合法 HTML `href='./page.css'` 或 `src='./page.js'`，build 會成功、HTML 會發布，但資產不會進輸出，線上即 404。這違反「頁與其 JS/CSS 同源可 fetch」及 fail-fast 承諾。獨立測試：publish 一個含 `<link rel='stylesheet' href='./fixture.css'>` 與 `<script src='./fixture.js'></script>` 的可發布 fixture，斷言兩資產均存在於輸出；缺任一來源檔時斷言 publish throws。現實作會在第一個斷言失敗。
  - **F4｜高信心｜單引號 canonical 會造成重複或互相衝突的 canonical。** 現有偵測只認 `rel="canonical"`；來源若已有 `<link rel='canonical' href='https://old.example/x'>`，publisher 仍注入新的 canonical，現有 E2E 只檢查「包含新值」，所以兩個 canonical 也會通過。獨立測試：用上述來源 publish 後解析 `<head>`，斷言 `link[rel=canonical]` **恰好一個**且 href 恰為 `${ORIGIN}/depth/<id>.html`。現實作會得到兩個。
  - **F5｜高信心｜交叉審查包未涵蓋本次實際發布的完整內容，無法驗證 meta 與現行資產集合。** brief 明載四頁及 `depth/files` 尚未 commit，但 DIFF 沒有這些未追蹤來源，也沒有 `depth_manifest.json`／`depth-contract.mjs` 的內容；在「不得探索 repo 其他檔案」護欄下，審查者無法確認四頁的 title/description 是否忠實、實際 script/stylesheet 引用是否都會被 copier 捕捉，或共用 predicate 是否真的等同 brief 的 gate。請以能表達未追蹤 deliverables 的完整 diff 重新產包後再審；不應以 HANDOFF 敘述代替 diff 證據。
  - **F6｜中信心｜brief 的工作基線互相矛盾，會使 diff 範圍難以追溯。** Base 寫 `codex/depth-layer-m0`，HANDOFF Branch 卻寫 `codex/graph-atlas-wp2-v1`。需更正為實際產生本 diff 的 branch／working-tree base，再重產 review package。這不直接證明程式錯，但在未 commit 且含未追蹤檔的狀態下，會放大漏包風險。

  本輪未建議升級模式⑤：目前 findings 都是可局部修正的驗收、測試與發布器正確性問題，未發現必須改換整體路線的證據。由於 F1、F3、F4 有直接可構造的失敗輸入，且 F5 阻止完整驗證，無法給 approve；對未提供的 predicate／頁面內容不作正確性推定。

## Review follow-up（實作層，2026-07-13）

- F1 resolved：恢復原驗收，四個 published 頁各跑 desktop 1440×900 與 mobile 390×844；文件／script／stylesheet 2xx、canvas 非空白、runtime 乾淨、無 `all_nodes`。
- F2 resolved：新增可重跑 fixture 守門 non-publishable/stale wipe，並在 build 後直接比對 `dist/depth` 完整集合。
- F3 resolved：資產 parser 支援合法單／雙引號；fixture 同時守 copy 與缺檔 fail-fast。
- F4 resolved：publisher 先移除既有 canonical，再注入唯一 self-canonical；fixture 守「恰好一個且 URL 正確」。
- F5 clarified：四個 Depth HTML/JS/CSS、`depth_manifest.json`、`depth-contract.mjs` 均已在 base commit `2c43838` 的 HEAD，不是本 working diff 的未追蹤 deliverable；後續若重產 review packet，須把這些 unchanged baseline inputs 明確附入審查 context。
- F6 resolved：Base 與 HANDOFF 統一為 `codex/graph-atlas-wp2-v1` / `2c43838` working tree。
- Post-fix verification：`npm run verify`＝4 Node build-contract + 69 E2E；`validate-depth.mjs`＝126 checks。

## 裁決（凜空）
- 決定:
- 日期:
