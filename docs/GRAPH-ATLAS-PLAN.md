# Neblux Graph Atlas — 長期架構主計畫

狀態：ACCEPTED / staged implementation
版本：v0.2
建立：2026-07-12
適用範圍：Atlas 首頁、Main Galaxy、Wonder Clusters、Depth、跨視圖蟲洞、Graph Renderer v2

> 本文件是長期架構提案，不是直接動工授權。它承接 `docs/DIRECTION.md` 的既定原則：Wonders 是產品內容、圖譜是共同空間、靜態為骨動態為光、無帳號無個資、個人永久免費、禁止遊戲化。實作會觸及 `frontend/src/engine/`、`data/*.json` 結構與 build pipeline，必須分階開 brief 並交叉審查。

### 文件地圖

- 本文件：產品架構、視覺語意、佈局原則與長期 phases。
- `docs/GRAPH-ATLAS-DATA-CONTRACT.md`：精確 source／derived contracts、URL state、layout locks、failure matrix。
- `docs/GRAPH-ATLAS-VISUAL-SYSTEM.md`：天體類型、尺寸、LOD、overlay、motion 與視覺驗收。
- `docs/GRAPH-ATLAS-IMPLEMENTATION-ROADMAP.md`：WP0–WP10 工程依賴、檔案影響、驗收與回滾。
- `docs/GRAPH-ATLAS-ADRS.md`：WP0 接受的 stable layout、URL、static bundle 架構裁決。
- `docs/gates/graph-atlas-domain-inventory-2026-07-12.md`：12-domain canonical inventory 證據。
- `docs/GRAPH-ATLAS-FABLE-REVIEW.md`：Fable 5 交叉審查輸入與問題。
- `docs/GRAPH-ATLAS-SELF-AUDIT.md`：三輪自查、修正紀錄與 pre-mortem。
- `docs/tasks/2026-07-12-graph-atlas-planning.md`：本輪 planning HANDOFF。

## 0. 一句話定義

Neblux 是一個分級載入的知識宇宙：Atlas 是第二頁的純視覺轉接入口（2026-07-16 修訂；首頁維持 legacy landing），Main Galaxy 承載完整通用圖譜，Wonder 是可獨立載入的主題星團與引導走廊，Depth 是單一概念的互動觀測；同一 canonical node 透過蟲洞在不同視圖間保持身份一致。

## 1. 目標與非目標

### 1.1 目標

1. 建立可長期擴充至約 1,000 個主圖節點的穩定空間。
2. 讓新增一個節點、Wonder 或 Depth 不會引發全圖重排或跨模組連鎖修改。
3. 將現有 19 趟 Wonders 升級為約 12–30 節點的主題星團，保留引導路線與教育用途。
4. 讓 Google 精確名詞搜尋可直達 Depth，再回到對應主星系或 Wonder 節點。
5. 以可解釋的天體種類、尺度、質量與連線層級表達知識角色。
6. 所有核心內容維持純靜態可用；API 失效不影響瀏覽。
7. 以穩定 URL、版本化 layout 與衍生資料保證可維護性。

### 1.2 非目標

- 不把 Neblux 變成即時多人世界或可由使用者編輯的圖譜。
- 不在 runtime 持續執行全域物理模擬。
- 不因節點數未滿 1,000 就預先改用 WebGL、地圖伺服器或新前端框架。
- 不把每條 graph edge 永久顯示在所有 zoom 層級。
- 不把 Wonder 拆成第二套 canonical graph。
- 不為了天體隱喻犧牲可用性、無障礙或知識語意。
- 不在 Graph Atlas 遷移中順手刪除／改造 `explorer.html`；Main v2 完成後另案裁決其保留、轉型或退場。

### 1.3 已寫回 DIRECTION 的方向演進

2026-07-12 前的 `docs/DIRECTION.md` 要求落地頁首屏主推一趟 featured Wonder，圖譜是次要入口。凜空曾於 2026-07-12 接受 Graph Atlas 將首頁改為「中央 Main Galaxy＋周圍 Wonder Clusters」的視覺地圖；**2026-07-16 再修訂：Atlas 改為第二頁轉接頁，首頁維持 legacy landing**，已寫回北極星（DIRECTION.md §1）。07-15 RG-A 的 `/` cutover 已回退。

為維持「Wonders 是產品核心」：

- Atlas 必須讓 Wonder names／clusters 在第一屏可辨識、可鍵盤進入。
- Main Galaxy 可以在尺度上最大，但不能用亮度、動線或 CTA 把 Wonders 降成裝飾。
- 可保留一個 featured Wonder 以較高亮度／較清楚入口呈現，但不得遮蔽整體 Atlas。
- DIRECTION 定案不等於 route 切換授權；Atlas 第二頁的正式上線仍須通過 WP10 cutover gates 與獨立 release brief（`index.html` 不在切換範圍）。

## 2. 現況基線

2026-07-12 盤點：

- 687 個節點。
- 3,381 筆 directional semantic connection records；投影為 3,159 個無序 topology pairs，其中 3,138 active、21 pending-only。
- 節點類型：45 field、567 concept、45 person、30 event。
- 目前資料實際出現 12 個 domain code；歷史文件曾提到 13 domains，實作前需完成一次 domain inventory 對帳。
- active topology degree 中位數 7、p90 15、p95 19；最大 105（`medicine_field`，含 pending 亦為 105）。
- 19 趟 Wonders，各有 6–7 個步驟，共使用 113 個獨特 graph nodes；9 個節點同時出現在兩趟 Wonder。
- Wonder nodes 與其他主圖節點間約有 811 條邊，不能在 Atlas 遠景逐條繪製。
- 現行 layout 是單一全域 d3-force，在 build 時重新 bake。
- 現行星等只依 `type + degree`，degree 視覺加成上限為 8；視覺重要度、佈局質量、標籤優先與互動角色尚未分離。
- 現行 Wonders 各有 6–7 steps，但啟動時仍會載入完整 graph topology；Graph Atlas 應改為 build-time cluster bundle。

## 3. 四級產品與路由

| 層級 | 穩定路由 | 載入策略 | 核心責任 |
|---|---|---|---|
| Atlas | 第二頁 `/atlas.html`（2026-07-16 定案；現僅 internal `/atlas-v2.html`） | 只載 Atlas 摘要與預覽 | 顯示中央主星系與周圍 Wonder 星團；純視覺跳轉（首頁＝legacy landing） |
| Main Galaxy | `app.html` | 完整 slim topology；描述延遲 | 通用圖譜、領域探索、搜尋、路徑、Wonder／Depth 入口 |
| Wonder Cluster | `wonders.html?w=<id>` | 只載該星團 bundle | 主題星團、自由探索、guided path、教育紀錄 |
| Depth | `/depth/<slug>` | 只載單頁資產 | Google 落地、單一概念互動、來源與範圍 |

### 3.1 URL 狀態契約

- 主星系節點：`app.html?node=<nodeId>`
- 主星系 Wonder 聚焦：`app.html?constellation=<wonderId>`
- Wonder 星團自由探索：`wonders.html?w=<wonderId>&mode=explore`
- Wonder 引導站點：`wonders.html?w=<wonderId>&mode=guided&s=<step>`
- Wonder 星團內聚焦節點：`wonders.html?w=<wonderId>&node=<nodeId>`
- Depth 返回主星系：`app.html?node=<nodeId>&depth=<depthId>`
- Depth 返回 Wonder：`wonders.html?w=<wonderId>&node=<nodeId>&fromDepth=<depthId>`

所有狀態必須可直接開啟、重新整理、分享並使用瀏覽器上一頁返回。不得只存在於記憶體中的隱藏 state。

## 4. 可小改、不連鎖的架構原則

### 4.1 四個互不綁死的視覺維度

每顆星不得再用一個 `tier` 同時控制所有事情。v2 將拆為：

1. `layoutMass`：只影響 build-time 佈局引力。
2. `visualMagnitude`：只影響核心、光暈與標籤尺度。
3. `celestialArchetype`：決定天體造型。
4. `interactionRole`：決定 portal、Depth、Wonder spine 等疊加狀態。

例如調亮 Fourier Analysis 不得改變其位置；新增 Depth 不得改變 graph relation；將某節點設為 portal 不得讓它變成高引力 hub。

### 4.2 內容、視圖、佈局分離

- `all_nodes.json`：canonical node 與 graph edges 唯一真相。
- `wonders/*.json`：Wonder 敘事、星團成員與 guided spine 唯一真相。
- `depth_manifest.json`：Depth 發布與 graph anchor 唯一真相。
- Atlas／celestial／layout config：純呈現與空間規則，不回寫知識內容。
- public bundles：全部由 build 產生，不可手改。

### 4.3 版本化與相容

所有新衍生資料需攜帶：

- `schemaVersion`
- `layoutVersion`
- `rendererContractVersion`

若需要 build 時間等非決定性 metadata，集中放在獨立 build manifest；不得讓 timestamp 破壞主要 artifacts 的可重現 hash。

Renderer 必須對未知 celestial archetype 使用安全 fallback；新增 archetype 不得使舊資料無法顯示。

## 5. 天體種類與具象尺度

### 5.1 設計原則

- 天體種類表達「知識角色」，不等同學科價值排名。
- 大小與引力分離；視覺大不代表會把其他節點吸走。
- domain color 表達領域；天體造型表達類型；疊加環表達 Depth／portal／guided 狀態。
- 不只靠顏色辨識，卡片與可存取文字要明確說明角色。

### 5.2 建議 celestial archetypes

| Archetype | 適用對象 | 視覺特徵 | 是否影響佈局 |
|---|---|---|---|
| `galactic_nucleus` | Mathematics、Physics 的核心 anchor | 高重力井、明亮吸積環、輕微引力透鏡；兩者形成中央雙核心 | 固定高質量 anchor |
| `domain_core` | 其他主要 domain anchors | 巨星核心、較寬星雲冠層 | 固定中高質量 anchor |
| `subfield_giant` | Quantum Mechanics、Computer Science 等重要 fields | 明亮巨星，尺度小於 domain core | 軟鎖定局部 anchor |
| `concept_star` | 一般 concept | 主序星；尺度依 visual magnitude | 普通局部質量 |
| `bridge_star` | 多領域、高跨域橋接概念 | 白色核心＋多領域混色 corona | 中等質量；位置偏向領域重心 |
| `beacon_star` | person | 微弱繞射尖芒或緩慢 beacon pulse | 不因造型提高質量 |
| `event_remnant` | event | 薄殼、殘跡環或短暫亮弧 | 普通質量 |
| `local_protostar` | Wonder-only local node | 柔和原恆星／塵埃結 | 只存在 Wonder layout |

### 5.3 互動疊加，不另造天體

| Overlay | 語意 | 視覺 |
|---|---|---|
| `depth_lens` | 該 node 有已發布 Depth | 單層細緻透鏡環；聚焦後才明顯 |
| `portal_ring` | 同一 canonical node 可跳到其他視圖 | 雙層不閉合環；選取後顯示出口 |
| `multi_portal` | 同時屬於多個 Wonders | portal ring 增加極小方向刻痕，不以數字遊戲化 |
| `guided_spine` | Wonder 主線站點 | 路徑高亮與站點 halo，不改 node 本體 |
| `selected` | 當前焦點 | 現有 focus glow 語言延伸 |

Depth 與 portal 同時存在時，兩個 overlay 必須有不同半徑與節奏，且 reduced-motion 下仍可靜態辨識。

### 5.4 Mathematics／Physics 中央雙核心

主星系採「雙核心高重力區」：Mathematics 與 Physics 各為一個固定 galactic nucleus，共同形成中央 bar／barycenter。這是 Neblux 的編輯式世界觀與視覺架構，不宣稱其他領域較不重要。

- Mathematics：偏冷白／金色結構光，表達抽象秩序。
- Physics：沿用 PHY domain 色的高能吸積光。
- Engineering、Technology、Chemistry 靠近雙核心，但有自己的 domain core。
- Biology／Medicine、Social Science／History／Humanities／Arts／Philosophy 形成各自穩定臂區與跨域橋。
- 多領域概念位於 anchor 加權重心附近，形成自然的 inter-arm bridges。

雙核心只是 layout anchors 與視覺背景；對應 field nodes 仍是可搜尋、可點擊的 canonical nodes。

## 6. 佈局系統

### 6.1 Atlas：人工策展的固定區域圖

- 演算法只產生初稿，最終位置以版本化 `atlas-layout.json` 人工確認。
- 中央主星系使用預烘焙低細節 sprite／geometry。
- 19 個 Wonder 星團依 dominant domains 與 related tours 放置在周圍。
- Atlas 不顯示真實 graph edges；只顯示少數 region roads。
- 普通 build 不得自動改變 Atlas 位置。

### 6.2 Main Galaxy：Anchored Semantic Layout

多階段 build-time solver：

1. 固定 Mathematics／Physics 雙核心與其他 domain anchors。
2. 以 domain membership 計算每個 node 的目標重心。
3. 依 relation policy 加入局部 link force。
4. 以 collision／boundary force 清除重疊。
5. 以既有 layout lock 限制舊節點移動。
6. 進行 label-aware post-process 與 edge route 生成。
7. 產生 layout diff report，通過穩定門檻後才寫入新 cache。

### 6.3 Wonder Cluster：Spine-constrained Layout

- guided spine 先以人工可控曲線固定順序。
- context nodes 依最相關 spine node 分群。
- featured portals 優先放在星團邊緣並朝目的區域方向。
- local nodes 不產生主星系出口。
- cluster layout 獨立版本化；改一趟 Wonder 不得重排其他 18 趟。

### 6.4 Focus View：臨時鏡頭重構，不改永久座標

選取節點時，可把相關節點以鏡頭轉換或暫時投影呈現為一圈／兩圈鄰居，但底層永久座標不改。關閉焦點後回到原位置。

### 6.5 Runtime 規則

- 不持續跑全域 force simulation。
- 預設不允許任意拖曳永久地標。
- 若保留 drag，只允許 session-only 暫移；不得 reheat 全圖。
- 所有導航以 camera transform、visibility state 與頁面跳轉完成。

## 7. Layout 穩定與局部更新

### 7.1 Layout lock

每個視圖保存：

```json
{
  "layoutVersion": "2.0.0",
  "nodes": {
    "physics_field": { "x": 0, "y": 0, "lock": "hard" },
    "fourier_analysis_concept": { "x": 120, "y": -40, "lock": "soft" }
  }
}
```

Lock 等級：

- `hard`：domain anchors、人工 landmarks；普通 bake 不得移動。
- `soft`：既有節點；只允許在小半徑內 relaxation。
- `new`：新加入節點；允許尋找局部位置。

### 7.2 普通新增節點流程

1. 驗證 node id、domain 與 connections。
2. 以已連接鄰居與 domain anchor 計算初始位置。
3. 只解鎖新節點與一圈鄰居。
4. 跑局部 solver。
5. 產生 before／after layout diff。
6. 若超過 movement budget，停止並要求人工檢查。

### 7.3 大型遷移流程

只有明確執行 `layout:migrate` 才允許：

- 移動 domain anchors。
- 改變雙核心結構。
- 重新分配大範圍星系臂。
- 升 major layout version。

一般 build、資料文案修改或新增 Depth 絕不可觸發 migration。

### 7.4 初始穩定門檻

- 無 migration brief 時，所有 hard anchors 移動量必須為 0。
- 至少 95% 既有節點移動不得超過主圖寬度的 2%。
- 任何單一舊節點移動超過 5% 必須列入 diff report。
- 修改一個 Wonder 時，其他 Wonder layout hash 必須不變。
- 新增／修改 Depth 時，所有 graph layout hash 必須不變。

數值可在 Phase 1 基準測試後校準，但「普通更新不得全圖漂移」不可放寬。

## 8. 引力與語意質量

### 8.1 質量來源

`layoutMass` 由下列訊號組成，但不直接等於 degree：

- anchor role
- field／subfield role
- weighted degree percentile
- domain count 與 bridge role
- 人工 override

建議以 percentile／class 而非無上限連續值，避免 Medicine degree 105 之類高 hub 吞噬整張圖。

### 8.2 Relation policy

| Relation | 建議佈局強度 | 遠景呈現 |
|---|---:|---|
| `learning_prerequisite:true` flag | 1.00（覆蓋 relation weight） | 只在 guided／focus 顯示方向 |
| causal | 中強 | 可成為主要 bridge |
| logical | 中強 | 局部骨架 |
| applied | 中 | 常跨域，以 bundled road 表示 |
| conceptual | 中弱 | 聚焦後展開 |
| historical | 弱 | 近景／選取後展開 |

Relation weight 只影響佈局與顯示優先，不代表知識的重要性排名。
Semantic connection records 保留方向與 metadata；layout 才投影成 active 無序 pair。`pending:true` 只留在 Main topology 的 pending 樣式，排除求解、bundles、roads、related 與 Wonder graph edges。

## 9. 分級連線與星雲

### 9.1 遠景

- 不畫單一 node edge。
- 顯示 domain density nebula、region roads、Wonder roads。
- region road 是多條 edges 的聚合，不是 graph source of truth。

### 9.2 中景

- 顯示有限數量的高優先 bridge edges（top-K）。
- 先以無 bundling 基線驗證；只有效能或可讀性未達 gate 才啟用同方向、同類型的條件式聚合。
- hover／focus 顯示真實 semantic records，不讓聚合線取代資料語意。

### 9.3 近景

- 顯示真實曲線 edges。
- 顏色、線型、箭頭與曲率共同表達 relation。
- 不以持續動畫表達普通 relation。

### 9.4 Focus

- 非相關 edges 淡出。
- 一圈鄰居與選定路徑依序顯示。
- reduced-motion 使用靜態高亮，不依賴流動粒子。

### 9.5 星雲生成

星雲不使用硬邊界圓形。由 build-time positions 生成 density field／多重 radial gradients：

- domain color 低飽和混合。
- 多領域節點使星雲自然交疊。
- 星雲是背景氛圍，不作為精確分類邊界。
- 主星系中央雙核心可有較強 lensing／accretion backdrop，但不能遮住 node hit targets。

## 10. Wonder Cluster 資料模型

現有 Wonder steps 繼續作為 guided spine。建議在同一 Wonder JSON 擴充 `cluster`，避免建立平行檔案後漂移。完整型別與子集規則見 Data Contract：

```json
{
  "cluster": {
    "context_refs": ["..."],
    "featured_portals": ["..."],
    "layout_profile": "curved-spine-v1",
    "visual_scale": "medium"
  }
}
```

規則：

- `steps[].ref`：canonical graph node，必然可返回主星系。
- `edges[]`：人工策展的 guided spine／constellation 骨幹；端點必須屬於本 Wonder 成員。
- `context_refs`：人工核可的補充 graph nodes。
- `featured_portals`：只控制視覺入口優先，不決定 canonical 身份。
- `steps[].local`／cluster local nodes：只存在該 Wonder，不進主星系 portal index。
- Depth 不在 Wonder 另填引用；由 published Depth index 依 canonical node id join。
- context 推薦可由 script 產生，但不得自動寫入正式資料。
- Explore 的其餘連線由 `canonicalMembers` 上 active induced subgraph 衍生；與 authored spine 分開輸出，排除 pending 且不回寫 source。
- 每團初始建議 12–30 nodes；超出需重新評估是否應拆成兩個主題。

## 11. 蟲洞契約

### 11.1 Portal index

build 由 canonical memberships 生成：

```json
{
  "wave_particle_duality_concept": [
    { "view": "main" },
    { "view": "wonder", "id": "light" },
    { "view": "wonder", "id": "quantum" }
  ]
}
```

### 11.2 操作規則

- 所有 canonical Wonder nodes 技術上都可返回主星系。
- 只有選取後才顯示完整出口，避免滿圖 portal rings。
- 多 Wonder 共用 node 可顯示 multi-portal overlay。
- 跳轉是真實 URL navigation；View Transition 只是漸進增強。
- 目的頁必須聚焦同一 node，不可只進入頁面首頁。
- 出口失效時隱藏該選項，其他視圖仍可用。

## 12. Build 衍生資料

### 12.1 Source of truth

- `data/all_nodes.json`
- `data/i18n/*.json`
- `data/wonders/*.json`
- `neblux-depth/depth_manifest.json`
- `config/atlas/*.json`（新增，僅呈現／佈局）

### 12.2 建議輸出

- `/data/atlas/index.json`
- `/data/atlas/portal-index.json`
- `/data/atlas/depth-index.json`
- `/data/atlas/constellation-index.json`
- `/data/atlas/layout-main.json`
- `/data/atlas/wonders/<id>.json`
- `/data/atlas/layout-wonders/<id>.json`
- Atlas preview sprites／geometry

Wonder bundles 採 core＋locale sidecars，避免為自由探索載入完整 graph 或全站 i18n／descriptions；格式見 Data Contract。
`constellation-index.json` 保留 guided spine 的 step 順序與 related tours；它不同於承載 cluster membership 的 portal index。Layout debt 是本機 build report，不複製進 `frontend/public` 或 `dist`。

### 12.3 Build validators

- 所有 canonical refs 存在。
- local ids 不與 canonical ids 衝突。
- portal destinations 有有效路由。
- public Depth 才能進 depth index。
- Wonder bundle 不得包含未宣告節點。
- Atlas／Wonder 頁不得依賴完整 `all_nodes.json`。
- layout locks、版本與 hashes 一致。
- 未經 migration 不得超過 movement budget。

## 13. Runtime 模組邊界

建議 v2 分離：

- `atlas/`：首頁區域 renderer、hit regions、DOM mirror。
- `graph-v2/`：Main Galaxy state、search、focus、URL controller。
- `wonder-cluster/`：局部 bundle、guided／explore state。
- `engine-v2/`：camera、renderer、sprites、LOD、spatial index、edge routing。
- `navigation/`：portal／Depth destination resolver。
- `build-atlas/` scripts：layout、bundles、validators。

不得讓 `app-main.js` 繼續成長為所有責任的集中檔。v2 可沿用現有 geometry、theme、sprite 技術，但以清楚 adapter 過渡。

## 14. 效能預算

初始工程預算，Phase 1 基準後校準：

### Atlas

- 不請求完整 graph topology。
- Atlas 專用 JSON＋preview geometry 目標 gzip 後小於 250 KB。
- 桌機目標 60fps；中階手機至少穩定 30fps。

### Main Galaxy

- 目標測試資料：1,000 nodes／7,000 edges。
- topology 可一次載入；描述持續分流。
- `resting` 定義為無輸入且無 one-shot 動畫滿 5 秒後整幀凍結（包含 twinkle），互動立即喚醒；reduced-motion 下 twinkle 恆關。resting redraw count 必須為 0。
- pan／zoom 不出現可感知長時間卡頓。
- hit testing 使用 spatial index，不做每幀全量 node scan。

### Wonder Cluster

- 不請求完整 graph topology。
- 每個 bundle 初始目標小於 150 KB 未壓縮；超出需檢查是否塞入不必要描述。
- 12–30 nodes 在桌機／手機均保持流暢。

WebGL 只有在 Canvas 2D 完成 LOD、cache、spatial index 後仍未達基準，才另立案評估。

## 15. 無障礙、i18n、SEO

- Atlas Canvas 必須有 DOM region list／keyboard mirror。
- 主星系與 Wonder 的 node card 是主要可存取操作面，不靠 Canvas hover。
- 所有 44px hit targets 在各 zoom 下維持。
- reduced-motion 關閉呼吸、穿越與流動效果，但保留狀態差異。
- Atlas、Wonder、Depth 的 canonical／hreflang 只指向真實存在頁面。
- Wonder bundle 與 portal 文案三語獨立本地化，不拼接翻譯片段。
- Depth 頁維持 no-JS 主要內容可讀。

## 16. 遷移與回滾策略

### 16.1 平行建造

- v2 未達 parity 前，不直接替換現有 `index.html`、`app.html`、`wonders.html`。
- 在獨立 branch／worktree 與內部測試入口建造。
- 每一 Phase 都要能獨立回滾，不修改 production route 才能驗證下一步。
- 現有 `window.__nebluxApp`／`__nebluxExplorer`／`__nebluxWonders` hooks 在 parity 期間保持相容，不因 v2 module 拆分而提早改名。

### 16.2 切換順序

1. 先上線 Atlas 第二頁（07-16 修訂：不切 `index.html`；首頁 landing 提供入口），目的頁仍指向現有 Graph／Wonders。
2. 再切 Main Galaxy v2。
3. 只遷移 Light／Quantum 兩個 Wonder clusters。
4. 接一個 Depth，驗證完整返回。
5. 通過後逐批遷移其餘 17 趟。
6. 最後才移除舊 renderer／兼容程式。

### 16.3 舊 URL

既有 `?w=&s=`、`?node=`、`?constellation=` 必須維持或有純前端／靜態安全轉接。不得先破壞既有分享與搜尋入口。

## 17. 分階工程計畫

Phase 與工程 Roadmap 的唯一對映如下，避免兩套編號各自漂移：

| Phase | Work packages |
|---|---|
| A | WP0、WP0.5、WP1 |
| B | WP2–WP3 |
| C | WP4 |
| D | WP5–WP6 |
| E | WP7 |
| F | WP8 |
| G | WP9 |
| Cutover | WP10 |
| H | WP10 完成後另案 |

### Phase A — Architecture Freeze

交付：

- 更新 `DIRECTION.md` 的 Atlas／Main Galaxy／Wonder Cluster／Depth 定義。
- 資料契約、路由契約、celestial semantics、layout ADR。
- domain inventory 對帳。
- 性能與現況基準。

Gate：Riku 裁決＋跨家族架構審查通過。

### Phase B — Data Foundation

交付：

- `config/atlas/` schemas。
- portal／depth／atlas index builders。
- Wonder bundle builder。
- layout lock／diff／validator。
- 不改正式 UI。

Gate：所有衍生資料可重現、普通 build 不重排。

### Phase C — Atlas Prototype

交付：

- 中央主星系 preview。
- Light／Quantum 星團 previews。
- 可縮放、鍵盤可達、點擊跳現有頁。
- Atlas 不載完整 graph 的 E2E 守門。

Gate：桌機／手機視覺與導航成立。

### Phase D — Main Galaxy Renderer v2

交付：

- 雙核心 anchors。
- 12-domain layout。
- celestial archetypes。
- LOD、edge bundles、spatial index、stable coordinates。
- portal／Depth node card。

Gate：1,000／7,000 壓力資料通過、layout stability 通過。

### Phase E — Wonder Cluster Pilot

交付：

- Light 與 Quantum 各 12–30 nodes。
- guided／explore 雙模式。
- `wave_particle_duality_concept` 跨星團蟲洞。
- Main Galaxy 返回。

Gate：兩星團不載完整 graph，URL／back／mobile 全過。

### Phase F — Depth Integration

交付：

- 先公開核可的物理／數學 Depth。
- Main／Wonder → Depth → 原節點返回。
- Google direct entry → Main Galaxy。

Gate：未發布頁不外洩，no-JS／CSP／SEO 全過。

### Phase G — Wonder Migration

交付：

- 其餘 17 趟逐批補 context、portals、layouts。
- 每批獨立驗證，不做一次性自動擴張。

Gate：19 趟內容與旅程紀錄全部 parity。

### Phase H — Education Layer

交付：

- 星團級 guided links。
- 旅程紀錄升級。
- 種子老師流程。
- 未達既有方向閘門前不做班級星圖。

## 18. 測試矩陣

### Data

- graph integrity
- Wonder membership
- portal round-trip
- Depth publication gate
- layout hash isolation
- movement budget

### E2E

- Atlas → Main
- Atlas → Wonder
- Main node → Wonder → same node return
- Wonder shared node → another Wonder
- Main／Wonder → Depth → origin return
- browser back／forward
- direct URL restore
- API all blocked
- no full graph request on Atlas／Wonder

### Visual

- desktop／mobile
- far／mid／near zoom
- Mathematics／Physics nuclei
- overlay combinations
- reduced-motion
- domain filter／focus／search

### Accessibility

- keyboard-only region navigation
- node card operations
- visible focus
- canvas DOM mirror
- screen-reader route labels

## 19. 主要風險與控制

| 風險 | 控制 |
|---|---|
| 加節點造成全圖漂移 | layout lock、local solve、movement budget、major migration command |
| 天體造型凌駕知識語意 | 四維分離、fallback、文字說明、不可只靠顏色 |
| Wonder 擴張後內容失焦 | 12–30 節點軟上限、人工 context 審核、spine 保持主導 |
| portal 滿圖閃爍 | 選取後才顯示完整出口；featured 只控制優先 |
| 1,000 nodes 邊線爆炸 | LOD、edge bundle、focus reveal、遠景不畫真實邊 |
| v2 重寫破壞現站 | 平行建造、逐層切換、舊 URL 保留、每 Phase 可回滾 |
| Math／Physics 核心被理解為價值排名 | 文件明示為編輯式空間架構；其他領域維持獨立 domain cores |
| schema 與 renderer 綁死 | 版本化 contract、unknown fallback、衍生資料 adapter |

## 20. 待 Phase A 裁決的細節

以下不阻擋本計畫成立，但在實作前需定案：

1. 目前 12 domain codes 與歷史「13 domains」的差異來源。
2. Mathematics／Physics 雙核心的最終相對位置與光譜語言。
3. Atlas Wonder 星團位置採完全人工，或演算法初稿＋人工覆寫；本計畫推薦後者。
4. Main Galaxy 是否保留 session-only node drag；本計畫預設不保留。
5. Wonder context nodes 的精確 authoring schema。
6. v2 內部測試路由與 production 切換方式。

## 21. v0.2 自我審計結論

### 21.1 已修正的 v0.1 缺口

- Wonder 不再手填 Depth references；publication truth 只來自 Depth manifest。
- Atlas roads 改為「分析建議＋人工核可」，不因 edge 排名變動自動換位。
- Relation change 預設只更新 edges／pathfinding，不重排永久座標。
- 天體分類改為 proposal＋lock，不因新增一條邊自動換 archetype。
- Wonder bundle 改為 core＋locale sidecars，明確移除完整 graph 載入。
- 補上 URL precedence、history policy 與 artifact failure matrix。
- 明列 Atlas 首頁與現行 featured Wonder 首屏的方向差異。
- 補上 WP0–WP10 依賴、檔案影響與逐層 cutover。

### 21.2 尚未由文件證明的假設

- Canvas 2D 在 1,000／7,000 壓力資料下是否達標，必須以 WP5 benchmark 證明。
- 雙核心與 12-domain anchors 是否產生可讀空間，必須以 layout spike＋視覺測試證明。
- 12–30 node Wonder cluster 是否仍保有 guided focus，必須以 Light／Quantum pilot 測試。
- Core＋locale bundle 的實際大小與 parse cost，必須以 WP3 真實資料量測。
- Atlas 中 Main Galaxy 的巨大尺度是否會視覺邊緣化 Wonders，必須以 WP4 使用者測試裁決。

### 21.3 不可用文件取代的實證

- 真實中階手機 FPS／記憶體。
- Canvas label collision 與 edge bundle 可讀性。
- 使用者是否理解 portal／Depth overlays。
- 教師是否把 Wonder cluster 視為清楚的主題單位。
- Google 對正式 Depth 頁的實際索引與搜尋進站行為。

## 22. 完成定義

Graph Atlas 長期遷移完成時必須同時滿足：

- Atlas、Main Galaxy、19 Wonder clusters、核可 Depth 均使用統一 canonical identity。
- 普通節點／內容更新不會造成全圖漂移。
- 所有頁面在 API 全滅時仍可運作。
- Atlas／Wonder 不載入完整 graph。
- Main Galaxy 能在目標 1,000 nodes／7,000 edges 下保持可用。
- 三語、鍵盤、reduced-motion、手機成立。
- 教育用 guided path 與旅程紀錄不退步。
- 舊深連結維持有效。
- 舊 renderer 只有在 v2 parity 與回滾驗證完成後才移除。
