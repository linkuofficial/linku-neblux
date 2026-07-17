# Neblux 方向（北極星）

初版定案 2026-07-03；Graph Atlas 方向更新 2026-07-12。這是結論，禁止在實作任務中自行重新論證。動 Neblux 前先讀完本檔。

## 定位

- Wonders（驚奇之旅）＝產品核心與教育合作單位。Graph Atlas／知識圖譜＝共同空間與導航系統。Depth＝單一概念的深入觀測。
- 目標：三者互為介面——Wonder 把主題編成可走的路，圖譜提供全局方位與自由探索，Depth 讓物理／數學專有名詞可由搜尋或節點深入。
- 對外仍是一個 Neblux，不拆成三個彼此競爭的產品入口。

## 鐵律（違反即錯）

1. API 全掛時網站必須照常運作。所有動態功能 = 漸進增強、失敗時靜默降級。
2. 禁止帳號、cookie、個資、個人追蹤。只允許匿名聚合數據。
3. 個人與學生永久免費。
4. 禁止遊戲化：無徽章、點數、streak、排行榜、成就彈窗。計數展示只用一行小字。
5. 使用者文案語態遵守 `docs/brand-voice.md`。

## Graph Atlas 產品架構（2026-07-12 定案；Atlas 定位 2026-07-16 修訂）

### 1. Atlas 第二頁轉接頁（2026-07-16 凜空裁決）

- Atlas 是**第二頁的純視覺轉接頁**，不是首頁：宇宙地圖入口，中央是視覺尺度最大的 Main Galaxy，周圍是可辨識、可直接進入的 Wonder clusters。
- 首頁 `index.html` 維持現行 legacy landing（2026-07-03 方向的落地頁），暫不更新；未來首頁如何導向 Atlas 由後續 brief 另定。
- Atlas 頁的星系與星團 preview 主要負責方位、氣氛與跳轉，不承載完整知識操作，也不載入完整 graph。
- Main 可以最大，但不能以亮度、CTA 或排版把 Wonders 降成裝飾；第一屏必須看得見 Wonder 名稱與入口，可保留 featured Wonder 強調位。
- 修訂紀錄：2026-07-12 曾定案「首頁改為宇宙地圖」並取代 2026-07-03 舊方向；2026-07-15 RG-A 曾在 repo 內把 `/` 切為 Atlas（未部署）。2026-07-16 凜空裁決改回：**首頁＝legacy landing、Atlas＝第二頁**，RG-A 的 `/` cutover 已在工作樹回退。Atlas 目前僅有 internal route `/atlas-v2.html`（noindex）。
- 正式第二頁路由**定案 `/atlas.html`**（2026-07-16）。入口動線**定案方案 A**（2026-07-16）：landing 的「OPEN THE GRAPH」CTA 與 footer「Graph」改指 `/atlas.html`，由 Atlas 的 Main Galaxy 節點進 `app.html`；搜尋與建議 pills 維持直達 `app.html?node=<id>`。上線時機需獨立 release brief 與凜空授權。
- Atlas 視覺基礎統一為 `engine-v2`（2026-07-16 後續裁決）：仍是輕量第二頁、只載 Main＋featured Wonder presentation，但不得以獨立 prototype renderer 建立平行星場／星體／標籤語彙。

### 2. Main Galaxy

- 承載大部分 canonical nodes，目標壓力規模約 1,000 nodes／7,000 edges；核心操作是搜尋、自由探索、focus、path、Wonder／Depth 往返。
- Mathematics 與 Physics 是固定的雙 galactic nuclei；其大質量表示空間導航與跨域結構角色，不表示其他領域知識價值較低。
- Canonical domain inventory 是 12 個：`MAT, PHY, CHE, BIO, MED, ENG, TEC, SOC, HUM, PHI, ART, HIS`。每個都有獨立 domain core；新增 domain 必須走 major layout migration。
- 不採 runtime 全域引力。永久位置由 build-time stable layout、locks 與 explicit migration 管理；普通內容更新不得令全圖漂移。
- 遠景不畫 node edges，中景只顯示有限 bridges，近景／focus 才展開局部真實 relations。禁止把 1,000／7,000 全量每幀繪製當實作方案。

### 3. Wonder Cluster

- 每趟 Wonder 從線性 6–7 steps 擴成約 12–30 nodes 的主題星團，但 guided spine 仍是內容與教育體驗的主體。
- Guided 與 Explore 共用同一 Wonder source：`steps`／authored `edges` 管引導骨幹，人工核可的 context 擴充自由探索；禁止另建會漂移的平行 Wonder graph。
- 同一 canonical node 出現在 Main 或多個 Wonders 時，以蟲洞提供同節點往返；這是 URL navigation，不是複製節點。
- Wonder 可含有已公開 Depth 的入口，但不重複維護 Depth publication truth。
- 不一次載入全部 Wonders 或完整 graph；各星團使用獨立 static bundle，按需載入。

### 4. Depth

- 暫不設 Depth 專用總入口。主要入口是搜尋引擎精確名詞頁，以及 Main／Wonder node 的「深入」操作。
- 現階段只聚焦物理與數學專有名詞；不因 Graph Atlas 建設而擴大 Depth 內容量產。
- Depth publication 由 `neblux-depth/depth_manifest.json` 治理；未通過 public／live／published／QA gate 的頁面不得出現在 Atlas、Wonder、sitemap 或公開索引。
- Google 直達 Depth 後，使用者必須能返回同一 canonical node 的 Main／Wonder context。

### 5. 分級載入與靜態資料

- Canonical node identity 永遠來自 `data/all_nodes.json`；Wonder membership 來自 Wonder JSON；Depth publication 來自 Depth manifest。
- Atlas 與 Wonder 只讀 build-time indices／bundles；Main 可一次載入 slim topology，描述與 sections 繼續分流。
- API 只可增亮體驗，不能成為 Atlas、Main、Wonder、Depth 任一核心路徑的必要條件。
- 精確契約見 `docs/GRAPH-ATLAS-DATA-CONTRACT.md`；架構裁決見 `docs/GRAPH-ATLAS-ADRS.md`；工程順序見 `docs/GRAPH-ATLAS-IMPLEMENTATION-ROADMAP.md`。

## 後端（要做就照此，禁止自行選型）

- 平台固定：Cloudflare Pages Functions（同 repo `functions/` → 同源 `/api/*`，不改 CSP）＋ D1 ＋ KV ＋ Analytics Engine。成本 $0、上限 $5/月。禁止 VPS、Docker、常駐 server。
- 順序：**級2 → 級1 → 級3 →（級4 可永不做）**
  - 級1 迴響：surprise beat 旁 ✨ 計數（D1）。小數字顯示為序數（「你是第 37 位走完的旅人」），禁止「本週 N 人」。
  - 級2 分享：動態 og 圖 `GET /api/og?w=&s=`（satori，edge cache，CJK 字型要子集化）＋短連結 `GET /s/:code`（KV）。
  - 級3 遙測：Analytics Engine 打點（tour 開始／每站／完走／棄坑，分語言）。指標：完走率、hook 轉換率（picker 曝光→進入）、回墜率（完走→再開一趟）。
  - 級4 天空口令：六詞口令→KV 同步完成進度。無 email、無密碼。
- 前端寫入一律 `navigator.sendBeacon`，不阻塞渲染。防灌水只做同源檢查＋IP 節流。
- E2E 必須有「API 全滅、站照常」的守門測試。

## 教育與金流（長線）

- 市場：台灣 108 課綱「自主學習／學習歷程檔案」與「探究與實作」。不走教材審查、不走採購正門。
- 鑰匙功能：走完 tour 一鍵生成可列印「旅程紀錄」頁（星座圖＋hook 問題＋反思題＋日期）。
- 階梯：5–10 位種子老師（請他們找棄坑點）→ 班級星圖（六位數匿名班級代碼，老師端看全班進度；未來第一個收費點）→ 科教館／教育科技展 → 國科會科普類補助（名稱以當年公告為準）。
- 數據用途：先餵自己的文案決策；累積到千次級完走後整理成公開長文／資料集，作為申請補助與競賽的信用。
- 金流順位：補助 ＞ 學校端輕收費（老師端報告）＞ 內容授權 ＞ 贊助星座。禁止 B2C 訂閱。

## 閘門（未達成就不投入下一級）

- ≥2 位老師主動二次使用 → 才做班級星圖。
- 一個班級完整走完一輪 → 才投補助／徵選。
- 拿到第一筆外部資源 → 才擴大投入。

## 禁止清單

帳號與個資、全量重寫 687 節點描述、遊戲化、B2C 付費牆、常駐 server、追蹤個人。
