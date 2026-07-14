# Graph Atlas Implementation Roadmap

狀態：ACCEPTED / staged execution
版本：v0.1
依據：`docs/GRAPH-ATLAS-PLAN.md`、`docs/GRAPH-ATLAS-DATA-CONTRACT.md`

> 本文件把長期主計畫拆成可獨立審查、測試、回滾的工程工作包。任何工作包都不自動授權下一包。

進度（2026-07-14）：WP0、WP0.5、WP1、WP2、WP3 完成；WP3 standalone artifacts、cross-family review、atomic swap follow-up 與完整 regression 已收斂。WP4 已授權並進入 implementation，branch `codex/graph-atlas-wp4`，base `2659c23`。

## 1. Critical path

```text
WP0 Direction Freeze
  ├─ WP0.5 Layout Feasibility Spike
  └─ (WP0 + WP0.5 gates) → WP1 Schemas & Validators
  → WP2 Stable Layout Toolchain
  → WP3 Bundles & Indices
  → WP4 Atlas Prototype
  → WP5 Renderer v2 Core
  → WP6 Main Galaxy v2
  → WP7 Wonder Pilot
  → WP8 Portal & Depth Round-trip
  → WP9 Wonder Migration
  → WP10 Cutover & Cleanup
```

WP4 可以在 WP2／WP3 的最小版本完成後與 WP5 視覺研究局部並行，但正式切換仍依序通過 gates。

## 2. 工程策略

### 2.1 平行建造

- 實作前建立獨立 branch／worktree，建議 `codex/graph-atlas-v2`。
- v2 以內部測試入口或 build flag 存在，不先替換 production routes。
- 現有 `window.__nebluxApp`／`__nebluxExplorer`／`__nebluxWonders` hooks 在切換前不得移除。
- 現有 `wonders.html?w=&s=`、`app.html?node=`、`?constellation=` 深連結保持有效。
- 每個 WP 具有明確 rollback boundary。

### 2.2 Dependency policy

- 初始不新增 production dependency。
- 使用既有 D3、Canvas 2D、Vite、Sharp、Playwright。
- 若某 WP 證明需要新 dependency，另提案說明 bundle、維護與替代方案後由 Riku 核可。
- WebGL、MapLibre、Service Worker、新 framework 都不在初始路線。

### 2.3 Commit policy

只有 Riku 明確授權 commit 後執行。每個 WP 獨立 Conventional Commit，不把 schema、renderer、內容遷移混成單一 commit。

## 3. WP0 — Direction Freeze

### 目標

把本輪對話裁決寫回永久方向，消除新舊方向歧義。

### 交付

- 更新 `docs/DIRECTION.md`：
  - Atlas 是視覺入口。
  - Main Galaxy 是完整通用圖譜。
  - Wonder 是產品核心的主題星團＋guided path。
  - Depth 是 node-linked 單概念互動。
  - Mathematics／Physics 中央雙核心屬空間編輯方向。
- 正式裁決首頁從 featured Wonder hero 轉成 Atlas 的方向差異。
- 完成 12／13 domain 對帳。
- 完成 Layout ADR、URL ADR、Bundle ADR。

### 不做

- 不改程式。
- 不改資料 schema。

### Gate

- Riku 書面裁決。
- Fable 5 或其他不同模型家族交叉審查：無未處理 P0／P1 findings。

## 3.5 WP0.5 — Layout Feasibility Spike

### 目標

在 schema 投資前驗證雙核心＋12 domain anchors 對現有 687 nodes 是否成立。WP0.5 可與 WP0 並行，但與 WP0 同為 WP1 的前置 gate。

### 方法與 Gate

- Throwaway script 只讀 canonical graph，不建立 schema、不寫 layout lock，腳本與 PNG 不入 repo。
- 使用 3,138 active topology pairs，硬鎖 Mathematics／Physics 雙核與 12 domain anchors，輸出 far／mid／near。
- 人工檢查雙核毛球、12-domain 辨識度、跨域 bridge 位置與 Medicine hub。
- 同步估算 Light／Quantum bundle 與現有 renderer 的 1,000／7,000 壓力先驗。
- 只有 `go` 才進 WP1；`no-go` 先調整 anchors／mass policy 並重跑，不建立正式契約。

2026-07-12 spike 結果為 **layout route go**：687 nodes、0 overlaps、單領域樣本落在最近 anchor 的比例 1.00。近景全邊明顯毛球化，因此 edge LOD／預篩選是強制條件，不是後續美化。

## 4. WP1 — Schemas & Validators

狀態：完成（2026-07-12）。實作與驗證見 `docs/tasks/2026-07-12-graph-atlas-wp1-schemas-validators.md`。

### 目標

先建立契約與 fail-fast validators，不產正式 UI。

### 已新增

```text
config/atlas/
  atlas-layout.schema.json
  domain-anchors.schema.json
  celestial-lock.schema.json
  layout.schema.json
scripts/atlas/
  validate-sources.mjs
  validate-config.mjs
  audit-domains.mjs
  audit-portals.mjs
  audit-artifacts.mjs
```

### 建議修改

- `package.json`：只有經核可後新增明確 scripts，例如 `atlas:validate`。
- 不先掛入 production build，先讓 scripts 可獨立執行。

### 驗收

- 重複／不存在 node id 會失敗。
- connection target／五值 `relation_type`／boolean flags 可驗；完全相同的重複 semantic record 會失敗，但同一無序 pair 的方向 metadata 差異合法。
- Wonder context／portal 子集規則可驗。
- Depth publication gate 可驗。
- domain anchors 完整覆蓋正式 domain inventory。
- schema major mismatch 會失敗。
- validators 不寫入 source files。

### Rollback

刪除新 config／scripts 即可；現站零影響。

## 5. WP2 — Stable Layout Toolchain

狀態：done（2026-07-12）。實作、cross-family review 修正與 blessing 驗證見 `docs/tasks/2026-07-12-graph-atlas-wp2-stable-layout.md`。

### 目標

以版本化 locks 取代每次 build 的全域自由重排。普通 Vite build 只讀 locks；任何 solver 都必須由明確 CLI 觸發。

### 建議新增

```text
config/atlas/layout/main.json
config/atlas/layout/wonders/*.json
scripts/atlas/layout/
  classify-celestial.mjs
  bake-main.mjs
  add-node.mjs
  bake-wonder.mjs
  check-layout.mjs
  diff-layout.mjs
  report-layout-debt.mjs
  bless-layout.mjs
  io.mjs
  policy.mjs
```

`migrate-layout` 與 `frontend/src/engine-v2/` 不在 WP2 授權範圍，未建立。

### CLI 契約

- `atlas:layout:check`：只驗證，不改檔。
- `atlas:layout:add --node <id>`：只放置新 node 與局部鄰居。
- `atlas:layout:wonder --id <wonder>`：只處理指定 Wonder。
- `atlas:layout:debt`：只分析 topology 與 locked positions，不改檔。
- `atlas:layout:migrate`：高風險、需 task brief；允許大範圍重排。
- `atlas:classify:propose`：輸出 proposal，不直接覆寫 celestial lock。

### 演算法階段

1. 固定 hard anchors。
2. 讀取 soft locks。
3. 只解鎖 change set。
4. 以 domain barycenter＋neighbor centroid 放置新 node。
5. constrained force relaxation。
6. collision／boundary 清理。
7. layout diff 與 movement budget。
8. 明確 `--write` 才更新 locks。

缺少 lock 的 node／Wonder member 會讓 `atlas:layout:check` fail。WP2 不把 v2 lock 接入普通 build；production cutover 前才由後續工作包建立 build gate。

### 驗收

- 相同輸入產出 byte-stable positions。
- 普通 node addition 不移動 hard anchors。
- 95% 既有 nodes 移動符合 budget。
- 新增 relation 預設不改 positions。
- layout debt report 能在 topology 漂移時提出 migration 建議但不自動重排。
- 修改 Light layout 不改 Quantum hash。
- 新增 Depth 不改任何 layout hash。

### Rollback

保留現有 `engine/layout.js` 與 bake；v2 locks 尚未接 runtime。

## 6. WP3 — Bundles & Indices

狀態：done（2026-07-14）。實作、cross-family review、follow-up 修正與驗證見 `docs/tasks/2026-07-14-graph-atlas-wp3-bundles-indices.md`。

### 目標

建立 static-first Atlas 資料管線，消除 Wonder 載入完整 graph 的依賴。

### 建議新增

```text
scripts/atlas/
  build-atlas-index.mjs
  build-wonder-bundles.mjs
  build-portal-index.mjs
  build-depth-index.mjs
  build-constellation-index.mjs
  build-previews.mjs
frontend/public/data/atlas/       # gitignored build artifacts
```

### Build 接線策略

先提供獨立 `atlas:build-data`；通過 artifact audit 後，另開禁區 brief 才掛入 `vite.config.ts`。掛入後基礎產物一律 fail-fast。

### 驗收

- Atlas index 不含 raw nodes／edges。
- Wonder core＋locale bundles 可獨立顯示 12–30 nodes。
- Wonder bundle Network 測試不請求 `/data/all_nodes.json`。
- Portal index round-trip 全部有效。
- Depth index 只含 `public:true`、`status:live`、`review_status:published` 且 QA 四鍵全過者。
- Constellation index 沿用 `scripts/build_tour_index.mjs` 的 guided step／node station／related 邏輯，加入版本欄；v1 tour-index 並行產出。
- 相同 sources 產出 byte-stable JSON（排除不必要 timestamp）。
- `generatedAt` 若存在，不得進 content hash 或影響 reproducibility。

### Rollback

未掛 Vite 前刪除 artifacts；掛入後可移除 plugin／script，舊 data copy 仍存在。

## 7. WP4 — Atlas Prototype

狀態：in-progress（2026-07-14）。實作邊界與驗收見 `docs/tasks/2026-07-14-graph-atlas-wp4-prototype.md`；本工作包不自動授權 WP5。

### 目標

驗證首頁「中央主星系＋周圍 Wonder 星團」的純視覺地圖，不碰 Main renderer。

### Pilot scope

- Main Galaxy preview。
- Light／Quantum／Edge AI 三個 Wonder previews：
  - Light／Quantum 測共享 node 與語意道路。
  - Edge AI 測跨 Engineering／Technology／Physics 的放置。
- 一條核可 Light ↔ Quantum road。

### 建議新增

```text
frontend/atlas-v2.html
frontend/src/atlas/
  atlas-main.js
  atlas-renderer.js
  atlas-state.js
  atlas-accessibility.js
frontend/src/styles/pages/atlas.css
tests/e2e/atlas.spec.ts
```

### 互動

- pan／zoom。
- region hover／keyboard focus。
- 點擊後真實導航現有 `app.html`／`wonders.html`。
- DOM region list 與 Canvas hit regions 等價。
- 無 JS 時提供 Main 與所有 Wonder 普通連結。

### 驗收

- 不請求完整 graph。
- 手機與桌機可用。
- reduced-motion 可用。
- preview 缺失仍可透過 DOM fallback 導航。
- Main Galaxy 雖視覺最大，Wonder cluster labels／entry affordances 不被壓成附屬裝飾。

### Rollback

Atlas v2 仍是內部入口；`index.html` 不變。

## 8. WP5 — Renderer v2 Core

### 目標

由現有 Canvas 2D engine fork／演進出不綁定頁面的 v2；優先沿用 geometry、theme、sprites 與既有測試接點，避免空白重寫與長期雙維護。

### 模組

- camera／transforms
- sprite registry
- celestial archetypes
- overlay compositor
- LOD policy
- quadtree spatial index
- edge route consumer；bundling consumer 僅在無 bundling 基準未達 gate 時加入
- label priority／collision
- static atmosphere cache
- dirty-frame scheduler
- reduced-motion policy

### 原則

- Renderer 不 fetch 資料。
- Renderer 不理解 URL／Wonders／Depth business logic。
- Renderer 接收 normalized scene model。
- 禁止每幀全畫 1,000 nodes／7,000 edges；必須以 viewport culling、LOD、靜止凍結及預篩選 edge set 控制 draw calls。
- 基準順序：far 不畫 node edges、mid 只畫 top-K bridges、near／focus 只畫局部真實 edges。若仍未達效能／可讀性 gate，才另加 build-time bundling geometry；runtime 永不做全圖 bundling。
- 未知 archetype／overlay 有 fallback。
- 每個視覺 token 可調而不改 layout。

### 驗收

- synthetic 1,000 nodes／7,000 edges scene。
- 先通過上述無 bundling LOD 基準；未通過才啟用 bundling gate。
- `resting`＝無輸入且無 one-shot 動畫滿 5 秒後整幀凍結（twinkle 暫停），互動喚醒；resting redraw count＝0。
- hit test 不做 O(n) 全量 scan。
- 所有 overlay 組合可渲染。
- visual unit snapshots／pixel probes 有穩定基準。

### Rollback

與現有 `frontend/src/engine/` 並存；不先改 app/wonders imports。

## 9. WP6 — Main Galaxy v2

### 目標

將完整 graph 接到 Renderer v2 與 stable layout。

### 功能 parity

- 搜尋
- node focus／detail card
- domain filters
- path／prerequisite 功能
- keyboard shortcuts
- i18n
- constellation focus
- constellation focus 與 node card「第 N 站」均讀 `/data/atlas/constellation-index.json`
- descriptions streaming
- `window.__nebluxApp` 相容測試 hook

### 新功能

- Mathematics／Physics 雙核心。
- 12-domain nebulae。
- far／mid／near LOD。
- approved Atlas roads；Main edge bundles 僅在 WP5 gate 啟用後加入。
- portal／Depth card sections。
- URL precedence controller。

### 建議策略

先建立 `app-v2.html`，不在舊 `app-main.js` 內持續堆功能。通過 parity 後才切 route。

### 驗收

- 現有 Graph E2E parity。
- direct URL restore。
- 1,000／7,000 benchmark。
- no runtime global force warm-up。
- API failure gate。
- layout stability gate。

### Rollback

production 仍使用舊 `app.html`，直到切換 brief 核可。

## 10. WP7 — Wonder Cluster Pilot

### 目標

將 Light／Quantum 升級成真正主題星團。

### Content process

1. Script 提出一圈 context candidates。
2. 人工逐節點核可，保持主題邊界。
3. 每團控制 12–30 nodes。
4. Guided spine 沿用現有 steps，不重寫已核可內容。
5. 新增 explore mode 與 cluster node cards。

### 功能

- cluster overview
- guided／explore 切換
- step URL／history
- node focus
- same-node Main return
- shared-node Wonder wormhole
- printable journey record
- echo／telemetry 維持漸進增強
- `window.__nebluxWonders` parity hook 保持相容

### 驗收

- 不載完整 graph。
- guided content parity。
- `wave_particle_duality_concept` 可在 Light／Quantum／Main 間 round-trip。
- 返回時聚焦同一 node。
- cluster bundle failure 不影響 Atlas／Main。

### Rollback

只對 pilot Wonder 啟用 v2；其他 17 趟仍走舊路徑。

## 11. WP8 — Portal & Depth Round-trip

### 目標

完成 Main／Wonder／Depth 三向深連結。

### Pilot

優先選通過 Phase A triage 的物理／數學 Depth；若 Fourier Series 通過，使用：

- `fourier_analysis_concept`
- Main Galaxy
- Light 或相關 Wonder cluster（只有內容核可時才露出）

WP8 不取代既有 `neblux-depth/PLAN.md` Phase A 或 `docs/tasks/2026-07-11-depth-build-integration.md`。四頁 triage、內容正確性與理解測試仍是前置；正式 build publication gate 已完成接線與驗證，Depth 頁已納入 build／sitemap（尚未正式部署，亦無站內導覽入口）。Graph Atlas 只消費核可後的 published index。

### 驗收

- 未發布 Depth 完全不可見。
- Google direct Depth → Main same node。
- Wonder → Depth → same Wonder／node。
- portal／Depth index 任一失敗時 UI 靜默降級。
- no-JS、CSP、canonical、sitemap、hreflang 通過。

### Rollback

關閉 v2 Depth index 消費；Depth 靜態頁與主圖仍獨立存在。

## 12. WP9 — Wonder Migration

### 批次原則

不按檔名一次遷移；按關係與風險分批。

建議批次：

1. Physics／Math：Light、Quantum、Black Holes、Arrow of Time、The Atom、Symmetry、Infinity、Chaos。
2. Computation／Systems：Computation、Networks、Edge AI、Emergence。
3. Biology／Mind：The Gene、Germs、The Mind。
4. Human systems：Language、Markets、Ideas That Spread、Music。

實際批次需在 domain inventory 與內容審核後校準。

每批：

- context authoring
- layout bake
- portal audit
- guided parity
- mobile／desktop visual QA
- `npm run verify`
- 獨立回滾點

## 13. WP10 — Cutover & Cleanup

### Cutover gate

- Atlas v2 ready。
- Main v2 parity。
- 19 Wonder clusters parity。
- Depth published set 正常。
- 所有舊 URL 相容。
- API failure／accessibility／performance 全過。
- 一輪跨家族最終審查完成。

### 切換順序

1. `index.html` → Atlas。
2. `app.html` → Main v2。
3. `wonders.html` → cluster v2。
4. 保留舊 assets 一個 release window。
5. `/data/tour-index.json` 在該 release window 內作 alias／並行產物；確認 constellation index consumers 全部切換後才退場。
6. 無 rollback 後才移除舊 renderer glue。

### 不做

- 不在同一 commit 刪舊 code 並切所有 route。
- 不移除 E2E hooks。
- 不在 cutover 同時新增內容或 dependency。

## 14. 檔案影響矩陣

| 區域 | 預計影響 | 風險 |
|---|---|---|
| `docs/DIRECTION.md` | 永久方向更新 | 策略裁決 |
| `data/wonders/*.json` | 新 optional cluster schema | 禁區／內容一致性 |
| `data/all_nodes.json` | 不為 Atlas 加視覺欄位 | 僅正常內容工作 |
| `config/atlas/` | 新呈現／layout source | 新契約 |
| `vite.config.ts` | 掛入新 build artifacts | 禁區／fail-fast |
| `scripts/atlas/` | builders／validators／layout tools | 高影響 build |
| `frontend/src/engine/` | 由現有 geometry/theme/sprites 演進或 fork v2；舊 adapter 維持至 cutover | 禁區／高技術風險 |
| `frontend/src/app-main.js` | 最終改 adapter／切換 | 高回歸風險 |
| `frontend/src/wonders-main.js` | 最終改 cluster adapter／切換 | 高回歸風險 |
| `frontend/index.html` | 最後切 Atlas | SEO／入口風險 |
| `frontend/explorer.html`／`explorer-main.js` | v2 期間維持現況；另案裁決 | 禁止順手退場 |
| tests | 大量新增與 parity | 必要安全網 |

## 15. 效能測量方法

### Reference profiles

至少建立：

- Desktop reference：本機 Chromium、1920×1080、DPR 1／2。
- Mobile reference：Playwright mobile viewport＋CPU slowdown；真實中階手機另做人工測量。
- Reduced-motion profile。

### Metrics

- initial data bytes per route
- topology JSON parse time
- first meaningful scene time
- pan／zoom frame time p95
- node focus latency
- long tasks >100ms
- resting redraw count（idle 5 秒後目標 0）
- memory after 5 分鐘操作

### Hard network assertions

- Atlas：不得請求 `/data/all_nodes.json`。
- Wonder v2：不得請求 `/data/all_nodes.json`。
- Depth：不得請求完整 graph。
- Main v2：允許一次 slim topology。

FPS 數值需以實測基線校準；禁止只用開發機主觀感覺宣稱完成。

2026-07-12 先驗粗測（headless Chromium／軟體渲染，非正式硬體 gate）：現有 renderer 對全量 1,000／7,000 每幀繪製，在 1920×1080 約 154 ms draw time，390×844 約 8.8 ms；此結果只用來否決「全量逐幀」路徑，不能當成真機 FPS 承諾。WP5 必須在裁切與 LOD 後重測桌機 GPU 與中階真機。

## 16. 完成回報格式

每個 WP HANDOFF 必須包含：

- Branch／base commit
- Changed files
- Contract changes
- Migration／rollback
- Automated verification
- Browser／device verification
- Performance delta
- Layout diff
- Remaining risks
- 是否觸發下一 WP gate
