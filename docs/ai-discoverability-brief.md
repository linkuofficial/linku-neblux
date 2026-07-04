# Neblux 可發現性 / AI 友善度升級 — Claude ↔ Codex 交叉協作 brief

> 給 **Codex** 的討論起點。作者：Claude（Claude Code）。人類擁有者與最終定案者：凜空（Riku）。
> 目的：把 Neblux 從「只給人用瀏覽器探索」升級成「同時被搜尋引擎、AI 工具、爬蟲完整理解與引用」，
> **做到最好、不做縮水版**。硬約束是架構鐵律（見 §2），不是省成本——在靜態架構內做出完整理想版。
> 協作模式：兩個 agent 同 repo 分工並**交叉互審**（§6）。動手前先讀 `docs/DIRECTION.md`。

---

## 1. 背景（Codex 先讀這段）

Neblux＝**好奇心驅動的科普知識體驗**。產品核心是 **Wonders（驚奇之旅）**：19 趟三語（en/zh/ja）敘事旅程，畫在一張 **687 節點的跨領域知識圖譜**上。旅程與圖互為介面。

- 正式站：<https://neblux.linku.tech>　GitHub：`linkuofficial/linku-neblux`
- 受眾：對世界好奇的自學者；長線切台灣 108 課綱「自主學習／探究與實作」。
- 定位一句話（給機器歸類用，措辭以 Riku 定案為準）：
  *Neblux is an interactive science knowledge-graph platform: curiosity tours (“Wonders”) drawn over a 687-node map linking physics, biology, history, technology, mathematics and society.*
- **要解決的真問題**：目前 `<title>` 是「Neblux — Deep Field Survey」，詩意但**沒有類別詞**（science / knowledge graph / 科普），導致 AI 把它誤判成 Nebula、同名 App 或音樂人；且互動內容靠 JS 動態載入，爬蟲常只讀到 `Loading / Retry` 外殼。

## 2. 硬約束（不可違反 — 這是架構鐵律，非成本考量）

1. **純靜態 + Cloudflare Pages**。本升級的所有產物必須是 `vite build` 的靜態產物或 build script 輸出。**禁**引入 SSR/SSG 框架遷移（Next/Astro/Nuxt/SvelteKit）、**禁**常駐 server、**禁**自行選型。（後端另有 Phase 1 = Cloudflare Pages Functions，本升級不依賴它。）
2. **CSP 嚴格**（`frontend/public/_headers`，`script-src 'self'`）：**禁** inline `<script>`、禁外部網域資源。靜態頁的轉址一律用 `<meta http-equiv="refresh">`，不用 JS。
3. **漸進增強鐵律**：任何動態功能掛掉，站與這些靜態頁必須照常。AI 讀得到的知識內容不得只靠 JS 渲染。
4. **禁帳號 / cookie / 個資 / 個人追蹤**（DIRECTION）。只允許匿名聚合。
5. **中文一律繁體**，改完跑 `python scripts/check_simplified.py`（需 0 ERROR）。
6. **勿動**：`engine/layout.js` 的座標預烘焙、`window.__nebluxApp` / `__nebluxWonders` / `__nebluxExplorer` hook 名。
7. 新依賴需 Riku 同意（`sharp` 已核准，供圖像產出）。

## 3. 現況資產盤點（已存在，別重做）

| 已有 | 位置 |
|---|---|
| robots.txt、sitemap.xml | `frontend/public/` |
| 完整 OG + Twitter card + `og:locale:alternate`（zh_TW/ja_JP） | `frontend/index.html` `<head>` |
| JSON-LD `WebSite` | `frontend/index.html` |
| meta description | 4 入口頁 |
| CSP headers | `frontend/public/_headers` |
| **機器可讀資料已在靜態供應** | `data/all_nodes.json`（687 節點全文，形狀 `{meta, nodes[]}`）、`data/tour-index.json`（node↔tour 反查＋related）、build 拆出的 slim topology＋`descriptions.json` |
| **可直接推廣的樣板** | `scripts/build_share_pages.mjs` —— 已為 19 趟 tour 生成靜態 stub（meta/OG/canonical/`<meta refresh>`/`<a>` 後備，CSP 安全）。**概念頁生成器就照這個模式擴大。** |
| i18n 資料 | `data/i18n/{en,zh,ja}.json`（label）、`{lang}_descriptions.json`、`{lang}_sections.json` |
| 節點欄位 | `id, label, type(concept|person|field|event), domain[], display_tags[], description, sections{lead,core,impact,links[],works[]}, era, connections[{target,relation_type,relation,directed,learning_prerequisite,pending}]` |

**結論**：不必重造 robots/sitemap/OG/JSON-LD/graph 資料。真正缺的見 §4。

## 4. 工作分解（全範圍、全品質）

### A. 定位與 head metadata（4 入口頁：index / wonders / app / explorer）
- 標題與描述補上類別詞並收斂品牌（**文案由 Riku 定案**，我們只出候選）。目標：任何機器讀 title+desc 即知「互動式科普知識圖譜／好奇心旅程」，且與 Nebula/App/音樂人明確區分。
- 每頁補 `hreflang` 三語 alternate（en / zh-Hant / ja）＋ `x-default`。
- 精修 JSON-LD：`WebSite`（加 `inLanguage`、`potentialAction` SearchAction 指向站內搜尋）；`Organization`（Linku Tech）。

### B. 概念頁生成器 `/concepts/<id>.html` × 687（**主工程**）
把 `build_share_pages.mjs` 模式推廣到全節點。**這是 AI 可引用性的地基，也餵未來教育線「旅程紀錄」。**
- 每個節點一頁靜態 HTML，內容 server-rendered（純文字，不靠執行期 JS）：
  H1 概念名 · 領域(domain) · 定義(`sections.lead`) · 詳述(`core`/`impact`) · 前置(prereqs↑) · 解鎖(unlocks↓) · 相關連結(connections + `relation` 一句 + relation_type) · era · 更新日期 · 語言切換。
- 每頁：`<link rel="canonical">`、`hreflang` 三語、JSON-LD **`DefinedTerm`**（`inDefinedTermSet: "Neblux Knowledge Graph"`）、OG（沿用 P0-2 的星座圖或節點專屬圖）、`<meta refresh>` 進 `app.html?node=<id>`＋`<a>` 後備。
- **三語版面**：目標 `/concepts/<id>.html`(en) + `/zh/concepts/<id>.html` + `/ja/concepts/<id>.html`，互相 hreflang（URL 方案待 Riku 定，見 §7）。687×3 ≈ 2061 靜態頁，build 產物，`dist/` 不進 git。
- 生成器讀 `data/all_nodes.json` + `data/i18n/*`；接進 `package.json` build（緊接 `build_share_pages.mjs`）。
- CSP 安全：零 inline script。

### C. llms.txt + 機器可讀資料入口
- 新增 `frontend/public/llms.txt`：說明 Neblux 是什麼、重要頁、資料檔位置（`/data/all_nodes.json`、`/data/tour-index.json`）、relation_type 定義、多語對應、「請描述為互動式科普知識圖譜、非百科或影音平台」。
- 給 `all_nodes.json` 一個有意義的公開別名/文件（如 `/data/graph.json` 或在 llms.txt 明確指路），並在其中標明 schema。

### D. sitemap 自動生成
- 現有 sitemap 手寫。改為 build 時生成，涵蓋 4 入口 + 19 tour stub（`/w/<id>`）+ 687×3 概念頁 + About/Methodology/Sources。含 `hreflang` alternate。

### E. noscript fallback（4 入口頁）
- 每頁 `<noscript>` 放靜態 H1＋一段定位文字＋通往概念頁索引/重要 tour 的連結，讓沒跑 JS 的爬蟲不只看到 `Loading/Retry`。

### F. 信任頁 About / Methodology / Sources（靜態）
- About：Neblux 是什麼、為何做、受眾、支援領域、開發中狀態。
- Methodology：節點如何建、關係如何判定、relation_type 定義、學習路徑如何生成、多語如何處理。
- Sources：資料來源、人工整理 vs AI 協助、校對狀態、錯誤回報管道。
- 三語、靜態、進 sitemap 與 nav。

### G. 測試（e2e，Playwright，沿用現有慣例）
- 概念頁：**停用 JS** 後仍能讀到 H1＋定義＋連結（守「不靠 JS」）。
- `llms.txt`、`sitemap.xml`、任一 `/concepts/<id>.html` 可被 `fetch`、狀態 200。
- JSON-LD 可解析且 `@type` 正確。
- 保留並擴充「API/JS 全滅站照常」守門。

## 5. 不做清單
- 框架遷移（§2.1）。
- 為了「補概念頁」而改動 687 節點的圖資料或新增節點（節點增修是另一條獨立、需 Riku 定案的擴圖決策，且會重烘焙版面）。
- 任何帳號 / 追蹤 / cookie。

## 6. 交叉分工提案（Claude ↔ Codex，複數 agent 同 repo 的重點是**不撞車 + 互審**）

**分工（提案，Codex 可議）——按工作流切、檔案邊界清楚：**
- **Codex 負責**：B 概念頁生成器（`scripts/build_concept_pages.mjs`）＋ D sitemap 生成器＋ build 接線＋ G 對應測試。（純程式/管線，邊界清楚、可獨立驗收。）
- **Claude 負責**：A head/定位候選＋ C llms.txt/資料入口＋ E noscript＋ F 三頁靜態內容（含三語文案初稿）＋ 三語 QA（`check_simplified.py`）。（內容/文案/i18n 密集。）
- **共享合約（兩邊都須遵守，先對齊再動工）**：
  - URL 方案（§7 待 Riku 定）一經定案即凍結，兩邊據此產出。
  - 概念頁 HTML 骨架 template 與 class 命名由 Codex 先出「一頁樣張」，Claude 據以寫 F 頁與 noscript，風格一致。
  - 資料形狀以 `data/all_nodes.json` 現狀為準；任一方不得改資料 schema，只讀。
  - CSP：任何頁零 inline script，違反即 block。
- **Git 紀律**：各開獨立 branch（如 `feat/concept-pages`、`feat/discoverability-meta`），檔案不重疊；整合走 PR；衝突以 template 合約為準。
- **交叉互審（重點）**：對方 branch 開 PR 後，另一 agent 做一輪 review——Codex 審 Claude 的文案是否觸 CSP/繁簡/hreflang 正確；Claude 審 Codex 的生成器是否符合 §2 鐵律、輸出是否 AI 可讀、測試是否覆蓋「無 JS」。互相挑錯，不客套。

## 7. 需 Riku 定案（動工前）
1. **概念頁 URL 方案**：`/concepts/<id>.html`（單語 + JS 切換）vs `/{lang}/concepts/<id>.html`（三語三頁，SEO/AI 最友善但頁數×3）。建議後者。
2. **標題/定位文案**：品牌決定，Riku 拍板；我們各出 2–3 版候選供選。
3. About/Methodology/Sources **是否本輪就做**，或先只做 A–E。
4. 缺失概念節點（碎形、哥德爾不完備、囚徒困境、泛音列、電子軌域、cellular automata…）**是否要正式擴圖**——獨立決策，會重烘焙版面，需三語內容審核。**與本升級解耦**。

## 8. 建議里程碑
1. **M0 合約對齊**：Riku 定 §7.1/§7.2；Codex 出概念頁樣張 template；雙方凍結合約。
2. **M1 便宜但高效**（實為地基，非縮水）：A 定位 + C llms.txt + E noscript + D sitemap 骨架。解掉「被 AI 認錯」。
3. **M2 主工程**：B 概念頁生成器 ×687×3 + JSON-LD DefinedTerm + sitemap 全量 + G 測試。
4. **M3 信任層**：F About/Methodology/Sources。
5. 每階段：`npm run build` 綠、`npm run test:e2e` 綠、`check_simplified.py` 0 ERROR、獨立 commit/PR、交叉互審。

---
*本 brief 為討論起點，非定案。Codex 可對分工、URL 方案、里程碑提反案。最終以 Riku 定案為準。*
