# Graph Atlas Implementation Roadmap

狀態：ACCEPTED / rolling execution
版本：v0.2（2026-07-14 滾動校準）
依據：`docs/DIRECTION.md`、`docs/GRAPH-ATLAS-PLAN.md`、`docs/GRAPH-ATLAS-DATA-CONTRACT.md`、`docs/GRAPH-ATLAS-ADRS.md`

> 本文件把長期主計畫拆成可獨立審查、測試、回滾的工程工作包。任何工作包都不自動授權下一包。

進度（2026-07-15）：WP0、WP0.5、WP1、WP2、WP3、WP4、WP5 已完成並通過交叉審查；G0 已將完整 reviewed stack 收斂到共同基線 `codex/graph-atlas-integration`。`master` 仍停在 `1b035ae`，沒有 production route cutover 或外部部署；下一個工作是 **RG-A Atlas route release**，不是直接開 WP6。

## 0. 2026-07-14 滾動校準

### 0.1 已驗證的實際基線

- 現行 Graph Atlas stack 位於 `codex/graph-atlas-wp5`（HEAD `ec58afc`），相對 `master` 有 14 個 commits；stack 同時含 Atlas WP2–WP5 與已核可的 Depth 精修，不能把「分支完成」寫成「主線已落地」。
- `npm run build` 現已 fail-fast 生成／audit 80 個 Atlas artifacts，內部 `/atlas-v2.html` 進 Vite build；production `index.html`、`app.html`、`wonders.html`、`explorer.html` 仍走 legacy runtime。
- Atlas prototype 只有 Main＋Light／Quantum／Edge AI 三個 Canvas previews，但有 19 Wonders 的 DOM fallback directory；它已足以進入首頁 release hardening，不代表 Main／Wonder v2 已完成。
- Renderer v2 已通過 synthetic 1,000 nodes／7,000 edges gate，但尚未接 canonical 687-node scene；`config/atlas/celestial-lock.json` 尚不存在，celestial proposal → 人工核可 → renderer mapping 是 WP6 前的真實缺口。
- 19 份現行 Wonder locks 仍只有 6–7 nodes；12–30 node clusters 尚未 author，WP7 不能視為單純接線。
- Depth index 已有 4 個 published entries；目前只有 `control_theory_concept` 同時有 Wonder destination（Edge AI）。Fourier／Light 並無現成 membership，WP8 不得硬綁該組合。
- 真實中階手機尚未測量。Playwright mobile emulation 可完成 branch gate，但不能取代 Main v2 production cutover 前的 field validation。

### 0.2 校準結論

北極星不變：Atlas 是入口、Main 是通用空間、Wonder 是 guided spine 主導的主題星團、Depth 是 canonical node 的深入觀測。舊計畫需要調整的是執行控制，而不是產品終點：

1. 新增 G0，先把已審查 stack 收斂為可持續接續的整合基線。
2. 依 `GRAPH-ATLAS-PLAN.md` §16.2，把 WP10 從「全部完成後一次切換」改為 Atlas → Main → 兩個 Wonder pilot → 一個 Depth → 其餘 Wonders 的分段 release gates。
3. 新增 WP5.5，補齊 canonical celestial lock 與 scene adapter contract，再開始 WP6 page integration。
4. WP6 只建立 portal／Depth consumer 能力與失敗降級；真正可見的三向 round-trip 仍由 WP8 驗收，避免同一功能在兩包重複宣稱完成。
5. WP9 每批完成就可獨立切換，不再讓其餘 17 趟阻塞已成熟的 Atlas／Main／pilot Wonders。

### 0.3 狀態語意

| 狀態 | 意義 |
|---|---|
| branch complete | 工作包在指定 branch 完成驗證與 review |
| integrated | 已進 Riku 核可的共同基線；完整 verify 重跑通過 |
| route active | production build 的正式入口已切到該層，仍可回滾 |
| deployed | 外部部署已完成並以真實 URL 驗證；需另有明確部署授權 |

後續進度必須使用上述語意，不再用單一「done」同時代表四件不同的事。

## 1. Critical path

```text
WP0–WP5 branch complete
  → G0 Integration Baseline
  → RG-A Atlas route release（WP10 stage A；目的頁先維持 legacy）
  → WP5.5 Canonical Scene Input Closure
  → WP6 Main Galaxy v2 internal parity
  → RG-B Main route release（WP10 stage B）
  → WP7 Light／Quantum Wonder Pilot
  → RG-C pilot Wonder release（WP10 stage C）
  → WP8 one published Depth round-trip
      ├─ 有自然相符的 pilot member → RG-D Depth release（WP10 stage D）
      └─ 無相符 member → Edge AI mini-batch（WP9 partial）→ RG-D
  → WP9 remaining Wonder batches
      └─ 每批 → RG-E independent batch release
  → WP10 final compatibility window & cleanup
```

RG-A 與 WP5.5 都依賴 G0；工程資源一次只做一包時，先完成 RG-A，符合長期主計畫「Atlas 先切、目的頁仍指向 legacy」的低風險垂直切片。任何 route release 都需獨立 brief 與 Riku 明確授權；文件中的 gate 不是自動部署授權。

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

### 2.4 G0 — Integration Baseline

狀態：integrated（2026-07-15）；紀錄見 `docs/tasks/2026-07-15-graph-atlas-g0-integration-baseline.md`。

目標：把已 review 的 mixed stack 收斂為所有後續 WP 共用的可重現基線，不在同一包切 production route。

- 由 Riku 明確決定 `codex/graph-atlas-wp5` 的 landing 方法；不得自行 rebase／拆歷史／merge `master`。
- landing 後以新共同基線重跑 `npm run verify`、`npm run test:e2e:visual`、Atlas source／artifact／layout checks。
- 記錄 Atlas、Depth、Renderer 各自是 branch complete、integrated、route active 或 deployed；不以 commit 存在推定線上狀態。
- 確認 internal `/atlas-v2.html`、`/renderer-v2-lab.html` 與 production routes 邊界仍成立。

Gate：共同基線 commit 明確、工作樹乾淨、完整驗證全綠、沒有 route cutover。若 landing 產生衝突或回歸，先修整合，不開 WP5.5／WP6。

G0 HANDOFF：

- Integration branch：`codex/graph-atlas-integration`，由 reviewed WP5 HEAD `ec58afc` 建立；未 merge `master`、未改 production routes。
- Baseline verification：`npm run verify`、`npm run test:e2e:visual`、Atlas validate／build／audit／layout checks 全綠。
- Next owner／task：Luna 從本 branch HEAD 接 `docs/tasks/2026-07-15-graph-atlas-rg-a-atlas-route-release.md`；不得跳到 WP5.5／WP6。

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

WP3 當時先提供獨立 `atlas:build-data`；WP4 已另開禁區 brief 並完成 `vite.config.ts` 接線。現況普通 build 會生成／audit 80 個 Atlas artifacts，基礎產物 fail-fast。

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

目前已掛 Vite；回滾須由獨立 brief 移除 Atlas build 接線與 internal entry，舊 data copy 與 production routes 仍可維持。

## 7. WP4 — Atlas Prototype

狀態：done（2026-07-14）。實作、交叉審查與 F-1／F-2 follow-up 均完成；紀錄見 `docs/tasks/2026-07-14-graph-atlas-wp4-prototype.md`。Atlas 仍是內部入口，不構成 production cutover。

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
  atlas-i18n.js
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

狀態：done（2026-07-14）。`codex/graph-atlas-wp5` 已完成 page-agnostic renderer-v2 core 與 deterministic lab；no-bundling、LOD、overlay pixel matrix、desktop/mobile/reduced-motion browser QA 與 cross-family review 均已關閉。實體中階手機仍需 field validation，且不構成跨硬體 FPS 承諾。

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

## 8.5 WP5.5 — Canonical Scene Input Closure

狀態：in-progress（2026-07-15；brief 見 `docs/tasks/2026-07-15-graph-atlas-wp5-5-canonical-scene-input.md`）；依賴 G0，不依賴 RG-A 是否已外部部署。

### 目標

在 page integration 前補齊 WP2 與 WP5 間尚未落地的 canonical presentation input，避免 WP6 runtime 依 degree／type 即席猜測天體角色。

### 交付

- 以 `atlas:classify:propose` 產生 687-node proposal，人工檢查 anchors、landmarks、bridges 與 outliers 後核可 `config/atlas/celestial-lock.json`；不修改 `data/all_nodes.json`。
- 明示 `celestial-lock` 的 `visualMagnitudeClass`／`archetype`／`labelPriorityClass` 如何映射到 Renderer v2 normalized scene；不得靠未版本化的隱式 fallback 充當正式 mapping。
- 建立 canonical 687-node scene fixture／builder contract，證明 stable layout＋slim topology＋celestial lock 可 deterministic 組成 Renderer v2 input；此包不建立 `app-v2.html`。
- 若 runtime enum 與 source enum 需要 adapter，版本化該 adapter 並補 major mismatch fail-fast；不偷偷改既有 schema enum。

### Gate

- 687 個 canonical nodes 全部有有效 classification；已知節點不使用 unknown archetype fallback。
- 相同 sources 產出 byte／hash stable scene；修改純視覺 token 不改 layout hash。
- `config/atlas/layout/main.json`、19 Wonder locks 與 canonical graph 不被改寫。
- 另開 brief 並完成跨家族 review；這是長期 presentation contract，不與 WP6 UI 混成單一 review 包。

### Rollback

移除 celestial lock 與 scene builder／tests；Renderer v2 lab、stable layout 與 production routes 不受影響。

## 9. WP6 — Main Galaxy v2

狀態：pending；只可從通過 G0＋WP5.5 的共同基線開工。

### 目標

建立內部 `app-v2.html`，把實際 canonical graph、WP2 stable layout、WP5.5 celestial lock 接到 Renderer v2；先達到現行 Main parity，不在本包切 `app.html`。

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
- portal／Depth card sections 的 consumer capability；index 缺失時靜默隱藏。
- URL precedence controller。

WP6 可以證明 portal／Depth overlay、card section 與 fallback 能消費真實 indices，但不宣稱 Main／Wonder／Depth 三向旅程已完成；可見 round-trip 與 origin return 仍屬 WP8。

### 建議策略

先建立 `app-v2.html`，不在舊 `app-main.js` 內持續堆功能。page adapter 只組合已版本化 sources，不重新做 layout／classification。通過 parity 後才進 RG-B。

### 驗收

- 現有 Graph E2E parity；legacy 與 v2 以同一批 URL cases 比較。
- direct URL restore。
- 真實 687 nodes／3,138 active pairs scene 正常；另保留 1,000／7,000 synthetic pressure benchmark。
- canonical scene 的已知節點不走 unknown archetype／magnitude fallback。
- no runtime global force warm-up。
- API failure gate。
- layout stability gate。
- portal／Depth indices 任一失敗時 Main 其餘功能正常。
- Playwright desktop／mobile／reduced-motion 全過；真實中階手機未測可完成 branch gate，但不得通過 RG-B。

### Rollback

production 仍使用舊 `app.html`，直到切換 brief 核可。

## 10. WP7 — Wonder Cluster Pilot

狀態：pending；依賴 WP6 branch complete，預設在 RG-B 後開工。

### 目標

將 Light／Quantum 升級成真正主題星團。

### Content process

1. Script 提出一圈 context candidates。
2. 人工逐節點核可，保持主題邊界。
3. 每團控制 12–30 nodes。
4. Guided spine 沿用現有 steps，不重寫已核可內容。
5. 新增 explore mode 與 cluster node cards。

現況 Light 只有 7 nodes、Quantum 只有 6 nodes，因此本包包含真實 content authoring，不是把 WP3 bundle 接上 renderer 即完成。任何 `data/wonders/*.json` 結構／membership 變更都走強制 brief＋交叉審查；builder 不得自動補滿 12–30。

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
- 若內容上自然成立，至少讓一個 pilot cluster 含一個已 published Depth anchor，供 WP8 驗證；不得為過 gate 硬塞不相干節點。

### 驗收

- 不載完整 graph。
- guided content parity。
- `wave_particle_duality_concept` 可在 Light／Quantum／Main 間 round-trip。
- 返回時聚焦同一 node。
- cluster bundle failure 不影響 Atlas／Main。
- 只有 Light／Quantum 通過即可進 RG-C；其他 17 趟不是 pilot release blocker。

### Rollback

只對 pilot Wonder 啟用 v2；其他 17 趟仍走舊路徑，既有 `?w=&s=` 深連結保持有效。

## 11. WP8 — Portal & Depth Round-trip

狀態：pending；Main ↔ Depth 能力依賴 RG-B，三向 RG-D 另依賴至少一個 route-active v2 Wonder cluster 與自然相符的 published Depth anchor。

### 目標

完成 Main／Wonder／Depth 三向深連結。

### Pilot

從 build-time indices 的真實 join 選 pilot，不預先硬編 Fourier／Light：

1. Depth 必須已通過 publication predicate。
2. canonical node 必須已是某個 route-active v2 Wonder 的人工核可 member。
3. 若 WP7 自然納入 `oscillations_and_waves_concept` 或 `fourier_analysis_concept`，可用對應 Depth；否則不得為了流程補 membership。
4. 目前唯一既有 Wonder destination 是 `control_theory_concept` → Edge AI／S-plane。若兩個 WP7 pilots 都沒有合適 Depth，先完成 Main ↔ Depth 能力，但 RG-D 必須等 Edge AI 被提前為首個 WP9 mini-batch 後再放行三向 round-trip。

WP8 不取代既有 `neblux-depth/PLAN.md` Phase A 或 `docs/tasks/2026-07-11-depth-build-integration.md`。四頁 triage、內容正確性與理解測試仍是前置；正式 build publication gate 已完成接線與驗證，Depth 頁已納入 build／sitemap（尚未正式部署，亦無站內導覽入口）。Graph Atlas 只消費核可後的 published index。

### 驗收

- 未發布 Depth 完全不可見。
- Google direct Depth → Main same node。
- Wonder → Depth → same Wonder／node。
- portal／Depth index 任一失敗時 UI 靜默降級。
- no-JS、CSP、canonical、sitemap、hreflang 通過。
- 不擴充 Depth 內容數量；只接現有 published set 中適合的項目。

### Rollback

關閉 v2 Depth index 消費；Depth 靜態頁與主圖仍獨立存在。

## 12. WP9 — Wonder Migration

狀態：pending；每批獨立 author、review、release，不等待 17 趟全部完成才產生使用者價值。

### 批次原則

不按檔名一次遷移；按關係與風險分批。

建議批次：

1. Physics／Math remaining：Black Holes、Arrow of Time、The Atom、Symmetry、Infinity、Chaos。
2. Computation／Systems：Computation、Networks、Edge AI、Emergence。
3. Biology／Mind：The Gene、Germs、The Mind。
4. Human systems：Language、Markets、Ideas That Spread、Music。

實際批次除 domain inventory 外，還要依 shared-node／portal 密度、published Depth 可用性與內容審核風險校準。若 WP8 需要 Edge AI／S-plane round-trip，可把 Edge AI 提前成單一 mini-batch，不連帶擴張其他 Computation／Systems Wonders。

每批：

- context authoring
- layout bake
- portal audit
- guided parity
- mobile／desktop visual QA
- `npm run verify`
- 獨立回滾點
- 通過後立即進 RG-E，只切該批 routes；失敗不回滾已穩定的前批。

## 13. WP10 — Staged Cutover & Cleanup

WP10 不再是最後一次性大爆炸；它是穿插在 WP4、WP6、WP7、WP8、WP9 後的 release control plane。每一 stage 都要獨立 brief、完整 regression、人工瀏覽器 QA、回滾點與 Riku 明確授權。

### Stage A／RG-A — Atlas route release

狀態：route active（2026-07-15；實作與驗證見 `docs/tasks/2026-07-15-graph-atlas-rg-a-atlas-route-release.md`）。尚未 commit／push／deploy。

- 依賴 G0 integrated＋WP4 branch complete，不依賴 WP6–WP9。
- 將 Atlas 體驗 harden 成 production `index.html`；Main／Wonder destinations 先維持現行 `app.html`／`wonders.html`。
- 19 Wonders 都有可見普通連結；Canvas 仍只呈現核可 previews，不載完整 graph。
- production metadata、locale、no-JS、keyboard、mobile、reduced-motion、SEO／discoverability 與舊首頁回滾資產驗證完成。
- 先保留 `/atlas-v2.html` 或舊 landing 一個 release window，實際 alias／回滾方式由 cutover brief 明定。

### Stage B／RG-B — Main route release

- WP6 parity／URL／API failure／layout stability 全過。
- 真實中階手機完成 field validation；若互動長任務或可用性未達標，只阻塞 Main cutover，不回退已上線 Atlas。
- `app.html` 切 v2，舊 Main adapter 保留一個 release window。

### Stage C／RG-C — Pilot Wonder release

- Light／Quantum guided／explore／print／echo／telemetry graceful degradation 與 URL parity 全過。
- 只切兩個 pilots；其他 17 趟仍由 legacy adapter 服務。

### Stage D／RG-D — One Depth round-trip release

- Main／route-active Wonder／一個 published Depth 的 same-node origin return 全過。
- Google direct entry、no-JS、CSP、canonical、sitemap、hreflang 全過；未發布 Depth 完全不可見。

### Stage E／RG-E — Wonder batch releases

- WP9 每批各自通過 context／layout／portal／guided／mobile gates 後切換。
- 某批失敗只回滾該批，不阻塞已穩定 routes，也不要求一次重跑所有內容 authoring。

### Final cleanup gate

- Atlas、Main、19 Wonder clusters 均已 route active 並度過至少一個明確 release window。
- Depth published set 正常；portal／Depth failure fallback 持續通過。
- 所有舊 URL 相容。
- API failure／accessibility／performance 全過。
- 一輪跨家族最終審查完成。

### 切換順序

1. RG-A：`index.html` → Atlas，目的頁維持 legacy。
2. RG-B：`app.html` → Main v2。
3. RG-C：只切 Light／Quantum。
4. RG-D：開一個核可 Depth round-trip。
5. RG-E：逐批切其餘 Wonders。
6. `/data/tour-index.json` 在最後 consumer 切換後仍保留一個 release window；確認 constellation index consumers 全部切換才退場。
7. 所有 routes 都無 rollback 需求後才移除舊 renderer glue。

### 不做

- 不在同一 commit 刪舊 code 並切所有 route。
- 不移除 E2E hooks。
- 不在 cutover 同時新增內容或 dependency。

## 14. 檔案影響矩陣

| 區域 | 預計影響 | 風險 |
|---|---|---|
| `docs/DIRECTION.md` | 本次校準不改；只有北極星改變才更新 | 策略裁決 |
| `data/wonders/*.json` | WP7／WP9 新 optional cluster schema 與人工核可 membership | 禁區／內容一致性／強制交叉 |
| `data/all_nodes.json` | 不為 Atlas 加視覺欄位 | 僅正常內容工作 |
| `config/atlas/` | WP5.5 新增 celestial lock；既有 layout／Atlas presentation sources 維持版本化 | 長期契約 |
| `vite.config.ts` | WP4 已掛 Atlas artifacts；後續只為核可 internal entry／cutover 接線修改 | 禁區／fail-fast |
| `scripts/atlas/` | builders／validators／layout tools | 高影響 build |
| `frontend/src/engine-v2/` | WP5 已建立；WP6 只經公開 scene API 消費，非 page business logic 容器 | 高技術風險 |
| `frontend/src/engine/` | legacy production engine；final cleanup 前原則上不改 | 禁區／rollback 資產 |
| `frontend/app-v2.html`／v2 adapter | WP6 internal Main parity，RG-B 後才成正式入口 | 高回歸風險 |
| `frontend/src/app-main.js` | RG-B release window 內保留 legacy rollback | 不提早重構 |
| `frontend/src/wonders-main.js` | WP7／WP9 cluster adapter 與逐 Wonder 切換；保持 v1 deep links | 高回歸風險 |
| `frontend/index.html`／`atlas-v2.html` | RG-A 第一個 route release，不等最終 WP9 | SEO／入口風險 |
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

2026-07-12 先驗粗測（headless Chromium／軟體渲染，非正式硬體 gate）：legacy renderer 對全量 1,000／7,000 每幀繪製，在 1920×1080 約 154 ms draw time，390×844 約 8.8 ms；此結果只用來否決「全量逐幀」路徑。

2026-07-14 WP5 local Chromium 結果：synthetic 1,000／7,000 scene 的 pan／zoom p50 0.4–0.7 ms、p95 0.9–1.9 ms，focus 0.4–1.0 ms，first meaningful scene 27.0–38.2 ms，四個 profiles 都沒有 >100 ms renderer frame／browser long task，resting redraw delta 0。這證明 LOD／culling 路徑可行，不是跨硬體 FPS 承諾；RG-B 前仍必須用真實 canonical scene 與中階手機測量。

## 16. 完成回報格式

每個 WP HANDOFF 必須包含：

- Branch／base commit
- Lifecycle status：branch complete／integrated／route active／deployed
- Changed files
- Contract changes
- Migration／rollback
- Automated verification
- Browser／device verification
- Performance delta
- Layout diff
- Remaining risks
- 是否觸發下一 WP gate
- 若是 RG：正式 URL、release window、回滾驗證與外部部署是否另獲授權
