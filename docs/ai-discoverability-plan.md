# Neblux 可發現性 / AI 友善度升級 — 定案執行規劃（Claude ↔ Codex）

> 本檔＝討論後的**定案版**，取代 `ai-discoverability-brief.md` 的 §7 待決問題。
> 討論記錄：brief（Claude 起草）＋ Codex 詳細回覆。以下決策已鎖定；動工照此。
> 最終仍以 Riku 為準——唯一保留他可覆寫的是「標題/品牌文案」（見 D3）。

## 已鎖定決策（含新驗證）

| # | 決策 | 定案 | 依據 |
|---|---|---|---|
| **D1** | 概念頁 URL 方案 | **三語三頁**：`/concepts/<id>.html`、`/zh/concepts/<id>.html`、`/ja/concepts/<id>.html` | AI/SEO/多語引用最友善；不跑 JS 可讀 |
| **D1b** | slug 用什麼 | **原始 node id**（如 `black_hole_concept`），不做漂亮 slug | 「去後綴＋連字號」實測**撞 4 個**（ethics/epistemology/historiography/game-theory 的 concept vs field）。原始 id 唯一、穩定、與 `app.html?node=<id>` 1:1。漂亮 slug 列為未來選配（需維護 slug→id 映射＋處理碰撞） |
| **D2** | 概念頁是否自動跳轉 | **不跳轉**。只放 CTA `<a href="app.html?node=<id>">在互動圖譜中打開</a>` | Codex 正確指出：概念頁是「可讀可引用的內容本體」，meta-refresh 會被視為 doorway/跳轉殼、削弱 SEO 與 AI 可讀。**tour stub 維持 meta-refresh**（它本來就是分享入口） |
| **D3** | 首頁標題/定位文案 | **工作預設**採 Codex 版（見下），**Riku 可覆寫**——品牌決定 | 需含類別詞解「被 AI 認錯」；語態仍是好奇心優先 |
| **D4** | About/Methodology/Sources 本輪做？ | **本輪做初版**（三語） | AI 友善度＝可讀＋可信；餵 108 課綱信任需求 |
| **D5** | 本輪擴圖補缺失節點？ | **不擴圖**，與本升級解耦 | 會重烘焙 layout＋三語審稿＝scope creep。先讓現有 687 可搜尋可引用 |
| **T1** | JSON-LD vs CSP 衝突？ | **無衝突**。`ld+json` 是資料區塊、非可執行 script，`script-src 'self'` 不擋（現有首頁實證）。概念頁用 `DefinedTerm` JSON-LD | 讀 `frontend/public/_headers` 確認 |

### D3 工作預設文案（Riku 可改）
- 首頁 title｜EN `Neblux — Interactive Science Knowledge Graph`｜ZH `Neblux — 互動式科普知識圖譜`｜JA `Neblux — インタラクティブ科学知識グラフ`
- 一句定位（EN）：*Neblux is an interactive science knowledge-graph platform where curiosity tours called Wonders guide learners across physics, biology, history, technology, mathematics and society.*
- ZH：*Neblux 是一個互動式科普知識圖譜平台，透過名為 Wonders 的好奇心旅程，引導學習者探索物理、生物、歷史、科技、數學與社會之間的知識連結。*
- JA：*Neblux は、Wonders と呼ばれる好奇心の旅を通じて、物理・生物・歴史・技術・数学・社会を横断する知識のつながりを探索できるインタラクティブな科学知識グラフです。*

## 動工前已驗證的事實修正（給 Codex，覆蓋你回覆中的兩處）
從 `data/` 實查（2026-07-04）：
1. **relation_type 只有 5 種**：`logical`(1171)、`applied`(1167)、`conceptual`(516)、`historical`(385)、`causal`(142)。**「prerequisite」不是 relation_type**——它是連線上的布林旗標 `learning_prerequisite`（3381 條連線中 137 條為 true，意為「來源概念幫助理解目標」）。llms.txt / Methodology / DefinedTerm 一律用這 5 種＋prereq 旗標，勿寫成 6 種。
2. **英文內容內嵌在 `all_nodes.json`**（`description` ＋ `sections{lead,core,impact,links}`，687/687 齊）。**沒有** `en_descriptions.json` / `en_sections.json`（你的輸入清單要移除這兩個）。zh/ja 才在 `data/i18n/{zh,ja}_descriptions.json` 與 `_sections.json`（各 687/687 齊）。generator 的語言分流：**EN←all_nodes.json；zh/ja←i18n 檔＋label map**。
3. 覆蓋率確認 M2 可行：687 節點三語內容全齊；type = field45/concept567/person45/event30；domain 12 種（MAT PHY CHE BIO MED ENG TEC SOC HUM PHI ART HIS）。
4. **CSP 已讀 `_headers` 確認** = `script-src 'self'`；`ld+json` 資料區塊不受限（現站實證）。CSP 守門測試只擋「可執行」inline（`<script>`可執行、`onclick=`、`javascript:`、外部 `src`/`href`）。

## 硬約束（不變，架構鐵律非成本）
靜態＋Cloudflare Pages、禁框架遷移/常駐 server、CSP `script-src 'self'`（禁**可執行** inline script；`ld+json` 資料區塊允許）、漸進增強（無 JS 可讀）、禁帳號/cookie/個資、中文繁體＋`check_simplified.py` 0 ERROR、勿動 `layout.js` 預烘焙與 `__neblux*` hook。詳見 brief §2。

## 三層架構目標
- **人類探索層**（已存在）：Wonders / Explorer / 互動圖 / Learning Path。
- **機器理解層**（本輪主體）：687×3 概念頁、sitemap、llms.txt、graph.json 別名、JSON-LD、hreflang、canonical、noscript。
- **信任層**（本輪初版）：About / Methodology / Sources ＋ relation_type 定義 ＋ 來源/校對說明 ＋ 錯誤回報。

## 工作分解與分工

### Codex 負責（管線/程式，邊界清楚可獨立驗收）
- **B. `scripts/build_concept_pages.mjs`**：讀 `all_nodes.json` ＋ `i18n/*`（label/descriptions/sections）＋ `tour-index.json`，輸出 687×3 靜態頁到 `dist/{,,zh/,ja/}concepts/<id>.html`。每頁含：H1/lead/type/domain/tags/era/core/impact、前置↑、解鎖↓、相關（含 `relation` 一句＋relation_type）、Appears in Wonders 反查、語言切換、**Open-in-graph CTA（不跳轉）**、canonical、hreflang(en/zh-Hant/ja/x-default)、`DefinedTerm` JSON-LD、生成日期。CSP 安全、零可執行 inline script。接進 `package.json` build（緊接 `build_share_pages.mjs`）。骨架/class 命名見 Codex 回覆 §2.2。
- **D. `scripts/build_sitemap.mjs`**：build 時生成，涵蓋 4 入口＋19 tour stub＋687×3 概念頁＋信任頁。先求全量 URL 正確，head hreflang 為主，sitemap xhtml alternate 為加分項。
- **graph.json 別名**：build 時由 `all_nodes.json` 生成 `dist/data/graph.json`（同資料＋`schema/generated_at/languages/node_count/relation_types` meta），不手維護第二份。
- **G. 測試**：no-JS 概念頁可讀（H1/lead/related/CTA、非 Loading）、sitemap 可 fetch 且含各類 URL、JSON-LD 可 parse 且 @type 正確、CSP 守門（掃生成頁無可執行 inline script）、static fetch 200、保留「API/JS 全滅站照常」。

### Claude 負責（內容/文案/i18n）
- **A. head metadata 文案**：4 入口頁三語 title/description（D3 預設為起點，Riku 定案後套用）＋ hreflang ＋ 精修 JSON-LD（`WebSite` 加 `inLanguage`；`SearchAction` 僅在站內搜尋參數可用時加，否則不加以免錯標；保守 `Organization` = Linku Tech，不誇大）。
- **C. `frontend/public/llms.txt`**：Neblux 是什麼/不是什麼（明確排除 Nebula.tv/影音/百科/Neblux Bolivia/音樂人/交通 App）、重要頁、資料入口、relation_type 定義、多語對應、AI 分類指引。骨架見 Codex 回覆 §6。
- **E. noscript ×4**（index/wonders/app/explorer）：非空提示，含 H1＋定位文字＋靜態概念頁/代表 tour/信任頁連結。視為「機器可讀入口」。
- **F. About / Methodology / Sources**（三語初版）：定位、節點與連線如何建、relation_type 定義、Wonders/learning-path 說明、資料來源與 AI 協助與校對、錯誤回報、使用建議（誠實聲明「探索/入口用途，正式引用請再核原始來源」）。
- **i18n QA**：三語語氣一致、`check_simplified.py` 0 ERROR。

### 共享合約（先對齊再動工）
- URL＝原始 node id（D1/D1b）。概念頁 HTML template＋class 命名由 **Codex 先出一頁樣張**，Claude 據以寫 F 頁與 noscript，風格統一。
- 資料唯讀：任一方不得改 `all_nodes.json` schema。
- CSP：任何頁零可執行 inline script；`ld+json` 允許。
- Git：各開 branch（`feat/concept-pages`、`feat/discoverability-content`），檔案不重疊，走 PR。
- **交叉互審**：對方 PR 各做一輪 review，互相挑錯不客套——Codex 審 Claude 文案的 CSP/繁簡/hreflang；Claude 審 Codex 生成器是否守鐵律、輸出 AI 可讀、測試涵蓋「無 JS」。

## 里程碑與驗收
- **M0 對齊**：Riku 定 D3 標題（其餘已鎖）；Codex 出概念頁樣張＋template；凍結合約。
- **M1 解「被 AI 認錯」**：A 定位 ＋ C llms.txt ＋ E noscript ＋ hreflang ＋ D sitemap 骨架 ＋ 信任頁入口。驗收：首頁 title 含 science/knowledge-graph；llms.txt 可 fetch；noscript 非空有靜態連結；sitemap 含主要入口；`check_simplified` 0 ERROR。
- **M2 AI 可引用地基**：B 概念頁生成器 ×687×3 ＋ DefinedTerm ＋ sitemap 全量 ＋ graph.json 別名 ＋ G 測試。驗收：三語概念頁停用 JS 可讀；sitemap 含概念頁；無 CSP 違規；build 綠、e2e 綠。
- **M3 信任層**：F 三頁完稿＋relation_type 定義＋錯誤回報＋三語 QA。驗收：AI 讀 About/Methodology/Sources 能正確摘要 Neblux。
- 每階段：`npm run build` 綠、`npm run test:e2e` 綠、`check_simplified.py` 0 ERROR、獨立 commit/PR、交叉互審。

## 明確不做
框架遷移；為概念頁而擴圖/改 687 資料；帳號/cookie/追蹤；概念頁做成「標題＋跳轉」的 doorway（每頁須有實質內容）。

---
*定案版。Codex 對 template/helper 設計仍可提實作細節反案；D3 文案等 Riku 拍板。*
