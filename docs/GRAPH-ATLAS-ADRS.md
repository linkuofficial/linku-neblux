# Graph Atlas Architecture Decision Records

狀態：ACCEPTED / WP0
日期：2026-07-12
依據：`docs/DIRECTION.md`、`docs/GRAPH-ATLAS-PLAN.md`、`docs/GRAPH-ATLAS-DATA-CONTRACT.md`

> 這裡只記錄難以從單一模組看出的長期邊界。欄位細節以 Data Contract 為準；任何實作變更仍需各 WP brief 授權。

## ADR-001 — Stable spatial layout

### Decision

- Atlas 使用人工策展並核可的固定 region positions。
- Main Galaxy 使用 Mathematics／Physics 雙硬錨點、12 domain anchors 與 deterministic anchored semantic layout。
- Wonder Cluster 使用 authored guided spine 約束的獨立 layout。
- Runtime 不執行全域 force simulation；普通 build 只驗證與注入已核可 locks。
- 新增普通 node 只允許 new node＋一圈 soft neighbors 的 local solve；relation change 預設不移動永久座標。
- 同區域 local solve 連續兩次超 movement budget，必須建議 explicit migration，不得自動擴大解鎖圈。

### Why

空間記憶是產品能力。若每次內容更新都讓全圖漂移，使用者無法形成方位感，維護者也無法安全小改。

### Consequences

- Layout locks、diff、debt report 與 explicit bake 是 WP1–WP2 必要地基。
- Mathematics／Physics 的大質量是空間導航角色，不代表其他領域價值較低。
- 2026-07-12 WP0.5 已驗證 687 nodes、12 anchors、雙核心可形成零 overlap 的可行初稿；edge LOD 仍需正式原型驗證。

## ADR-002 — URL owns navigable state

### Decision

- Atlas、Main、Wonder、Depth 的可分享狀態由真實 URL 表達；portal 是 navigation，不是資料複製。
- Main 以 `node > depth-return hint > constellation > search > overview` 處理 precedence。
- Wonder 保留既有 `?w=&s=` guided 深連結；`mode=explore&node=` 才表達 cluster explore focus。
- Guided step 繼續使用 `replaceState`；跨視圖與進出 focus 使用正常 navigation／`pushState`；hover、pan、zoom 不寫 history。
- 無效參數平靜降級到仍可操作的 overview，不產生半殘狀態。

### Why

Depth 依賴搜尋直達，Wonder 依賴教育分享，圖譜依賴同節點 round-trip。URL 必須是跨頁狀態的唯一公開契約。

### Consequences

- v2 必須保留既有 `?w=&s=`、`?node=`、`?constellation=` 相容性。
- View Transition 只是漸進增強；URL 與 back/forward 在無動畫時仍須正確。
- URL controller 需在 WP6–WP8 有獨立 E2E matrix。

## ADR-003 — Static bundles, canonical sources

### Decision

- `data/all_nodes.json` 保持 canonical graph 唯一真相；Wonder membership 來自 Wonder JSON；Depth publication 來自 Depth manifest。
- Atlas 與 Wonder 不在 runtime 載入完整 graph；使用可重現的 build-time index／core＋locale sidecars。
- Guided spine 與 cluster membership 分離：`constellation-index` 承載 steps／站序，`portal-index` 承載 `steps ∪ context_refs`。
- Wonder 的 authored `edges[]` 產生 `spineEdges`；Explore 的 `graphEdges` 是 canonical members 上的 active induced topology。
- Main 可一次載入 slim topology，但 descriptions／sections 繼續 sidecar streaming。
- 所有公開 artifacts 可刪除重建，絕不成為新的 source of truth；API 失效不影響這些靜態路徑。

### Why

四個視圖需要不同載入尺度，但 canonical identity 與內容不能複製成四套資料。Build artifacts 用來切片，不用來治理真相。

### Consequences

- Builders 必須 deterministic、versioned、fail-fast，並有 reverse-reference／artifact integrity audit。
- v1 `tour-index.json` 與 v2 `constellation-index.json` 平行至 WP10 cutover。
- Atlas／Wonder network tests 必須斷言不請求完整 `all_nodes.json`。
- 新增 production build 接線屬禁區，必須另開 brief 與交叉審查。
