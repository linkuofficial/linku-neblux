# TASK: graph-atlas-wp6-main-galaxy-v2
狀態: done

## 目標

建立不對外切換的 `app-v2.html` 內部 Main Galaxy v2 入口，消費 WP5.5 canonical scene 與 Renderer v2，完成可安全驗證的最小互動骨架；production `app.html` 維持不動。

## 驗收條件

- [x] build 會產生可供 browser 讀取的 canonical Main scene 靜態輸出；輸出須由既有 WP5.5 builder 產生，不能在 runtime 重做 layout 或 classification。
- [x] `app-v2.html` 能載入 687 nodes／3,138 active pairs，Renderer v2 無 unknown archetype／magnitude fallback。
- [x] 最小頁面 adapter 有 click focus、搜尋、12-domain filter、camera controls、`?node=` direct-URL restore 與 node detail card。
- [x] portal／Depth indices 為 optional consumer；任何一個不可用時頁面其餘功能仍可運作並靜默隱藏相關 section。
- [x] 新增最小 E2E coverage，且 `npm run verify` 通過；視覺以 browser 實看。
- [x] Main presentation contract 由 build 產生 deterministic cross-domain bundles；approved Atlas roads 僅保留 Atlas metadata，沒有升格為 Main edge。
- [x] Renderer v2 僅在 mid LOD 畫 presentation bundle；選中 Wonder 時顯示 page-owned guided spine，並保留 legacy test hook 形狀。

## 邊界（不要動的東西）

- 不修改 production `app.html`、`app-main.js`、legacy engine、canonical graph、stable layout、celestial lock、Atlas/Wonder/Depth route 或部署設定。
- 不新增 dependency、不 push、不 deploy。
- 不在 runtime 建立 global force simulation；page adapter 只讀版本化 static scene。

## Questions（Codex 填）

- `app-v2.html` 是 internal route，並非 RG-B cutover 授權。
- 已完成 page-owned parity：semantic relation/prerequisite metadata、local-only Learning Path、三語 labels/descriptions search、URL `node > constellation > search`、DOM node mirror、optional indices/retry fallback 與 Renderer focus LOD。
- 凜空已於 2026-07-15 明確授權 Main presentation contract 與 Renderer v2 layer；實作固定為 cross-domain bundle（Main anchor node-space）與 guided constellation spine。Atlas approved road 仍是 Atlas region-to-region navigation metadata，刻意不進 Main scene edge／bundle。
- `?search=` resolve 到 node 後目前保留 search URL，使用者明確點選 node 才改成 `?node=`；invalid node/constellation fail-closed 到 overview（不 fallback 到低優先參數）。
- `main-presentation.json` 只含 LOD bundle、anchor 與隔離的 Atlas metadata；不重複內嵌 canonical scene 或 semantic records，避免 payload 與資料責任漂移。

## HANDOFF（Codex 完成或卡住後填）

- Branch: `codex/graph-atlas-integration`
- Summary: 建立 internal-only `app-v2.html` 與 page adapter；build-time canonical scene 直接取自 WP5.5 builder，另建 `main-interaction.json` 與純 presentation `main-presentation.json`。後者只產生 deterministic cross-domain bundle、quadratic route、count 與隔離的 approved Atlas roads metadata，不重複 canonical scene。Renderer v2 在 mid LOD 畫 bundle、在 constellation focus 畫 guided spine；page adapter 完成搜尋、多語、12-domain filter、pan/zoom/focus LOD、relations/prerequisites/unlocks、local Learning Path、roving DOM mirror、strict URL precedence、legacy hook 相容、optional Depth/portal/station sections 與 mobile/reduced-motion coverage。2026-07-15 細審後已修復 mobile focus 避開 bottom sheet、drag/click 分流、hover、Esc/back/空白點擊的焦點同步、detail card 期間的語言控制避讓，以及語系描述失敗時 English fallback；production `app.html` 未改。
- Verification: 最終 `npm run verify` 全綠（Renderer 16、Depth 4、E2E 98、Renderer visual 1、Atlas 54）；Browser 實看 desktop detail focus／語言控制避讓，mobile focus 由 390×844 E2E 幾何斷言確認位於 bottom sheet 上方；`git diff --check` 全綠（僅既有 CRLF warning）。
- Remaining risks: 尚未完成 required cross-family adversarial review，故仍不可開 RG-B／cutover；v2 route 仍是 internal-only，未觸及 production `app.html`。**push／deploy 前需裁定**（2026-07-15 跨模型審查 Finding 4）：`app-v2.html` 的「internal-only」目前僅靠 `<meta name="robots" content="noindex, nofollow">` 與未被其他頁面連結達成，Cloudflare Pages 本身無存取控制——一旦這支 branch 實際部署，`/app-v2.html` 與其 `main-scene.json`／`main-presentation.json`／`main-interaction.json`（含完整節點描述、標籤、關聯資料）即可被任何人以直接 URL 讀取。目前未 push，非當前違規，但需在 push／deploy 決策時一併考慮：接受公開曝露，或改用 env 旗標／build 排除等方式在正式對外前收斂。

## 視覺對齊（2026-07-15，凜空指示直接處理，不另開 brief）

- 問題：WP6 交付的 chrome 與 canvas 視覺為白模（Codex 自創 Inter 風格、未接設計系統；Renderer v2 用 lab 預設 token），與現行 Neblux 完全不一致。根因＝brief 未寫設計基準（spec 缺口）。
- 處理（Claude 執行）：
  - `app-v2.html`：接回 `neblux-theme.css`、`neblux-tokens.js`（與 app.html 同一色票來源）、theme-color meta、搜尋 icon；標題容器加 `.v2-brand` class。
  - `app-v2.css`：整檔重寫到 canonical 設計系統——與 app.html 相同的全螢幕 HUD 布局（body 星空漸層＋vignette、fixed chrome）、rail 玻璃 header pill、合併搜尋＋domain segmented rail（Recipe B）、ghost 相機控制（Recipe C）、`'/'` 分隔語言切換、domain-lit 玻璃卡（`--node-accent` 頂部光暈、blur(16px) saturate(1.3)、`--radius-lg`）、行動版 bottom-sheet，斷點對齊 1080/760。
  - `app-v2-main.js`：`createRendererV2` 注入 Deep Field tokens——`background` 透明（讓頁面漸層/暗角透出）、production 12-domain 色票（`window.NebluxTokens` 同源）、label `#d4e4fa` IBM Plex Mono＋深色描邊、guided/bundle 金色 accent；`renderCard` 設定 `--node-accent`；語言鈕改 EN/中/日。
  - `engine-v2/renderer.js`：三處寫死視覺常數改為 token 驅動（`bundleStroke`／`guidedStroke`／`labelFont`＋`labelStroke`），原值為 fallback——未傳 token 時行為與改前完全相同（lab 頁、既有測試不受影響）。
- 驗證：`npm run verify` 全綠（exit 0；Atlas 54、E2E 含 app-v2 7 條與 renderer 效能 gate 全過）；瀏覽器實看桌面 1280×800 與行動 682 寬（DOM 量測＋截圖）：header pill／合併搜尋卡／金色 active filter／玻璃卡 domain 光暈／mono label 描邊／mid 帶 66 金色 bundle＋6 guided spine、far 帶只剩 spine 均正確；修正一個 selector 過寬 bug（`.galaxy-v2__header > div` 誤中 languages/controls）。
- 光暈還原（同日第二輪，凜空指示）：`engine-v2/sprite-registry.js` 整檔重寫——星體從單色剪影改回 Deep Field 四層 radial-gradient 光暈（corona→halo→glow→core→白色 core-hi），gradient stop 表逐字鏡射自 production `engine/star-sprites.js`（該檔屬禁區未動，僅 import `hexA`/`hash01`）；尺寸由 tokens.magnitude 驅動（先前未使用的 `corona` 參數就位），亮度階層 baseOp/glowAlpha/jitter 鏡射 production tier（nucleus/major=primary、standard=secondary、faint=minor）。`renderer.js` 節點層拆兩段：星體以 `lighter` 加法合成（發光疊加）＋互動亮度提升（selected +0.35 > hovered +0.3 > related +0.25），overlay 光環回 `source-over`。archetype 形狀剪影（菱形/三角形等 lab 發明）移除，階層改由 magnitude 光度表現，與 production 視覺語言一致。驗證：`npm run verify` 全綠（E2E 93 含效能矩陣 p95≤2.1ms、零 >100ms 幀；sceneHash 不變）；瀏覽器與 app.html 並排實看，星體光暈語言一致。
- 渲染升級完成（同日第三輪，凜空核准階段一＋二全做）：
  - **Per-domain nebula 霧**：`atmosphere-cache.js` 新增 `createNebulaSprite`（legacy 配方：5 個 hash 種子 blob、0.30/0.10/0 漸層）；renderer `setScene` 時從場景自身的 `galactic_nucleus`/`domain_core` 節點衍生每 domain 一朵（deterministic、不需新資料管線），世界座標 `lighter` 合成、alpha 0.16、世界半徑 230／螢幕上限 480。
  - **Canvas vignette**：畫在星上、label 下（與 production 同分層），`2,4,9` @ 0.45，依 viewport 尺寸快取。
  - **Ambient 去飽和（「克制」）兩態版**：sprite-registry 依 magnitude 的 ambientMix（nucleus/major 1、bright 0.6、standard 0.45、faint 0.28；suppressKeepSat 0.30）烘 suppressed 變體，未互動星體用壓抑色、互動（selected/related/hovered/focused/guided）用全色；以烘焙色作快取 key 自動去重。無 tau 緩動（兩態切換），與事件驅動排程相容。
  - **Focus 邊高亮**：選中節點的鄰接邊用漸層描邊（端亮 0.42／中暗 0.10，`#cfe0f5`），其餘邊退至 restEdgeDim 0.35；fake-ctx 環境有 solid-color fallback。
  - **頁面 focus dimming**：`app-v2-main` updateScene 在有選中時將非相關節點標 `dimmed`——「一個星座獨佔畫面」的 production 行為。
  - **Token 統一（階段二）**：`DEFAULT_TOKENS` 色票改為 production 12-domain 色票（權威=`neblux-tokens.js`，附同步註解）；金色 accent/guidedStroke/bundleStroke/labelFont/labelStroke/氛圍/focus 邊參數全部一級 token 化；app-v2-main 注入縮減至「透明背景＋執行期 NebluxTokens 對齊」兩項。lab 頁自動同款。
  - **刻意不做（決定記錄，不重開）**：twinkle 呼吸與 photon 流光——兩者需連續動畫，與 v2 事件驅動 resting scheduler（閒置零 CPU、效能 gate 基礎）直接衝突；採 production reduced-motion 的替代路徑（提高基礎亮度）。atlas-v2 的 4 色 region accent 是區域導覽地圖的獨立設計、且屬已上線 RG-A 表面，維持現狀不對齊。
  - 驗證：Renderer 16／Depth 4／E2E 93（含效能矩陣）／Atlas 54 全綠 exit 0；瀏覽器實看 overview（nebula＋vignette＋去飽和微塵）與 focus（物理學：白環＋漸層邊放射＋全天退暗）。

## Review（審查層填；與 WP5.5 合併進行，findings 落於 WP5.5 brief）

- 見 `docs/tasks/2026-07-15-graph-atlas-wp5-5-canonical-scene-input.md` 的 Review 區（Reviewer: Claude；Verdict: fix-needed → 2026-07-15 已全部處理）。F1（renderer core 驗收文字矛盾）已更正；F2（`main-scene.json` shape）查證後非缺陷已撤回；F4（internal-only 無存取控制）風險已記錄於本檔 Remaining risks（見上）。F3（`isAvailable()` 邏輯反向）經凜空裁決——Learning Path 功能保留（範圍問題留到 RG-B cutover 一併討論，不在本輪展開），bug 本身已修正並在瀏覽器對實際節點資料實測，`npm run verify` 全綠。本輪 Review 全部收斂，無待辦。
