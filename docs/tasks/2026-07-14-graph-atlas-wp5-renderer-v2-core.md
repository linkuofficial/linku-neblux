# TASK: graph-atlas-wp5-renderer-v2-core
狀態: done
建立: 2026-07-14 ｜ 秘書層: Codex ｜ 實作層: Luna（預定）
Repo: Neblux
Branch: `codex/graph-atlas-wp5`
Base: `9a72255`（WP4 implementation/self-review HEAD；WP4 cross-family review 通過後才視為 final base）
Required verification: `npm run test:renderer-v2`＋`npm run test:atlas`＋`npm run verify`＋`npm run test:e2e:visual`（若更新 visual baseline）＋`python scripts/check_simplified.py`＋desktop/mobile/DPR 1/2/reduced-motion browser QA
風險等級: 高（路徑觸發強制交叉）——新增通用 Canvas renderer core 與效能契約；必須與 legacy engine 並存，不接 production

## 開工 Gate

- [x] WP4 brief 的 Review 區已有一輪不同模型家族 verdict；F-1／F-2 已修正並由 Riku closeout，WP5 可完成交叉審查。
- [x] WP5 方向、scene contract、模組邊界、測試矩陣、rollback 與 no-bundling gate 已凍結。
- [x] branch、base、必讀文件與允許檔案範圍已整理。

若 Luna 擔任 WP5 實作者，不得在同一 task/session 同時充當 WP4 審查者。WP4 審查請在另一個乾淨 task 只讀 `C:\Users\Riku\AppData\Local\Temp\neblux-wp4-xfire-packet.txt`，結論寫回 WP4 brief 後再開始本工作包。

## 目標

建立與頁面、URL、Wonders、Depth 及資料載入解耦的 Canvas 2D Renderer v2 core。它接收已正規化、具穩定座標的 scene model，提供 camera/transforms、天體 sprite、overlay、LOD/culling、quadtree hit test、label collision、edge route、靜態 atmosphere cache、dirty-frame scheduler 與 reduced-motion。WP5 只以 deterministic lab scene 驗證 1,000 nodes／7,000 edges，不接 Main/Wonder/Atlas production adapter。

## 必讀與事實來源

- `AGENTS.md`、`docs/DIRECTION.md`
- `docs/GRAPH-ATLAS-IMPLEMENTATION-ROADMAP.md` §8、§14、§15
- `docs/GRAPH-ATLAS-VISUAL-SYSTEM.md`
- `docs/GRAPH-ATLAS-DATA-CONTRACT.md` §4.2–§5.6、§8
- `docs/GRAPH-ATLAS-ADRS.md`
- `docs/gates/graph-atlas-layout-v1-2026-07-12.md`
- legacy reference only：`frontend/src/engine/{canvas-renderer,geometry,star-sprites,atmosphere,theme}.js`

## 已凍結的實作裁決

### 1. 並存與目錄

- v2 固定新增在 `frontend/src/engine-v2/`；legacy `frontend/src/engine/` 保持 production 行為與 imports 不變。
- WP5 可直接 import legacy 的 pure helpers；不得改 `canvas-renderer.js`。若現有 `geometry.js`、`theme.js`、`star-sprites.js` 或 `atmosphere.js` 缺少必要 pure export，先在 `Questions` 記錄；預設在 v2 寫 adapter，不做影響 legacy 行為的抽取重構。
- 新增 `/renderer-v2-lab.html` 作 deterministic 開發／E2E harness，但不加進 Vite production build input、不進 sitemap、不加 production 導覽。
- 不新增 dependency。quadtree 使用既有 D3 7 的 `d3-quadtree` export。

### 2. Normalized scene contract

Renderer 不 fetch、不讀 URL、不讀 global business state。`setScene(scene)` 的最小契約固定為：

```js
{
  schemaVersion: "1.0.0",
  layoutVersion: "<versioned lock>",
  rendererContractVersion: "2.0.0-alpha.1",
  nodes: [{
    id, x, y, label, domains,
    archetype,
    visualMagnitude,
    labelPriority,
    overlays: []
  }],
  edges: [{
    id, source, target,
    priority,
    lodClass,
    directed,
    styleToken,
    route,
    overlays: []
  }]
}
```

- `x/y` 是已鎖定 world-space 座標；Renderer 不執行 force/layout、不寫回座標、不讀 `layoutMass` 決定畫法。
- `source/target` 是 node id；`setScene` 一次正規化、建 adjacency、LOD edge sets、route bounds 與 spatial indices。draw frame 不得重做全圖正規化。
- `route` 支援直線、quadratic 與 build-time polyline；缺少 route 時可對少量 near/focus edge 用 deterministic quadratic fallback。Renderer 不做 runtime 全圖 bundling。
- `styleToken` 是 presentation token，不在 renderer 內用 relation 文案推導語意。
- accepted archetypes：`galactic_nucleus`、`domain_core`、`subfield_giant`、`concept_star`、`bridge_star`、`beacon_star`、`event_remnant`、`local_protostar`。未知值 fallback `concept_star`，scene 仍須可畫並在 debug stats 計數。
- accepted overlays：`selected`、`related`、`guided_spine`、`depth_lens`、`portal_ring`、`multi_portal`、`filtered`、`dimmed`。未知 overlay 不得令 node 消失或 throw；採 no-op body-safe fallback 並在 debug stats 計數。
- `visualMagnitude` runtime enum 固定為 `nucleus | major | bright | standard | faint`；`labelPriority` 固定為 `low | standard | high | critical`。任何 token 調整不得改 layout positions/hash。
- 現行 `celestial-lock.schema.json` 的 magnitude enum 是 `landmark | bright | standard | faint`，與 visual-system runtime tiers 並非同一命名。WP5 lab 不讀 celestial lock，也不得偷偷推導 mapping；canonical lock → normalized scene 的明示 mapping 留給 WP6 adapter brief 決定並測試，因此不阻塞 WP5 core。

### 3. Core API

公開入口 `frontend/src/engine-v2/index.js` 至少提供：

```js
createRendererV2({ canvas, tokens, reducedMotion })
renderer.setScene(scene)
renderer.setViewport({ width, height, dpr })
renderer.setCamera({ x, y, zoom })
renderer.setInteraction({ hoveredNodeId, focusedNodeId, keyboardNodeId })
renderer.hitTest({ x, y, pointerType })
renderer.wake(reason)
renderer.renderNow()
renderer.getDebugStats()
renderer.destroy()
```

- 第一幀可同步 `renderNow()`，不能只依賴 rAF。
- Core 不綁 pointer/wheel/keyboard DOM listeners；lab/後續 page adapter 負責事件並呼叫 API。
- `destroy()` 必須取消 rAF/listeners/resources；重建 scene 不累積 stale index/cache entries。

### 4. 模組責任

```text
frontend/src/engine-v2/
  contract.js              scene validation/normalization + safe fallbacks
  camera.js                world/screen transforms + viewport bounds
  spatial-index.js         quadtree queries + 44px hit candidate ranking
  lod-policy.js            far/mid/near/focus draw plan
  edge-routes.js           route normalization/draw primitives + prefiltered sets
  sprite-registry.js       archetype registry + offscreen sprite cache
  overlay-compositor.js    fixed layer order and overlay fallbacks
  label-layout.js          priority + stable collision grid/index
  atmosphere-cache.js      static reusable background/nebula resources
  frame-scheduler.js       dirty/one-shot/resting/reduced-motion lifecycle
  tokens.js                visual-only defaults; no layout values
  renderer.js              orchestration and Canvas draw order
  index.js                 public exports only
```

可在不混責任的前提下合併很小的檔案，但不得把 fetch、URL、tour/depth routing 或 page event glue 放進 renderer core。

### 建議實作順序

1. `contract`＋deterministic 1,000/7,000 generator，先鎖版本、fallback、immutability 與 scene hash。
2. `camera`＋`spatial-index`＋`lod-policy`，以純 unit tests 先證明 draw plan 不做全量 frame scan。
3. `frame-scheduler`，用 fake clock 鎖定 5 秒 resting、wake、reduced-motion 與 destroy。
4. `edge-routes`、`sprite-registry`、`overlay-compositor`、`label-layout`、`atmosphere-cache`，使用 mock context/draw snapshots。
5. `renderer` orchestration 與同步 first paint；最後才接 deterministic lab 的 pointer/camera adapter。
6. Playwright pixel/network/performance probes、desktop/mobile/reduced-motion browser QA，填 HANDOFF；不要在數據出來前做 bundling。

### 5. LOD、culling 與 no-bundling gate

- Far：Main node edges draw count 必須為 0；只畫可見的 nucleus/major/domain bodies、密度星塵、nebula/region labels。
- Mid：只畫 scene-load 時預篩的 top-K bridge edges；K 是 token/config，frame 不掃 7,000 edges 排序。
- Near：quadtree 取得 viewport node candidates，再由預建 adjacency/edge sets 收集局部 edges；不得每幀掃全部 nodes/edges。
- Focus：只畫 focused node 的一圈／兩圈關係與必要上下文；selection 不觸發全圖 route 計算。
- hit test 必須以 quadtree query 取得候選，採 selected／label priority／distance／stable id 排序；pointer/touch effective target 至少 44×44 CSS px。
- `getDebugStats()` 至少暴露 `drawnNodes`、`drawnEdges`、`nodeCandidates`、`edgeCandidates`、`hitCandidates`、`unknownArchetypes`、`unknownOverlays`、`redrawCount`、`schedulerState`、`lastFrameMs`，供結構性 gate 與效能紀錄。
- WP5 預設完全不實作 bundling consumer。只有 no-bundling baseline 在結構 gate 全過後仍被 browser QA 判定不可讀，或 renderer-only frame 有 >100 ms long task，才停止、把證據寫入 `Questions/HANDOFF`，另由 Riku 核可 build-time bundling follow-up；不得自行加入 runtime global bundling。
- 不以單一開發機 FPS 作跨裝置承諾。HANDOFF 必須記錄同一 deterministic scene 的 desktop/mobile pan-zoom p50/p95、>100 ms long tasks、focus latency、first meaningful scene、resting redraw count；硬 gate 以 draw-plan/culling/resting 與「無 >100 ms renderer long task」為主。

### 6. Frame scheduler 與 motion

- interaction/resize/scene/token change 或 one-shot animation 會 `wake()`；dirty state 才重繪。
- `resting` 定義：最後輸入且所有 one-shot animation 完成後滿 5 秒；進入後整幀凍結，包含 twinkle，`redrawCount` 持續不變且無 pending rAF。
- resting 後任一互動立即喚醒並可重繪；不得用永久低 FPS loop 假裝 idle。
- reduced-motion 從建構參數注入；關閉 twinkle、flow、lensing animation，但保留 overlay 的靜態形狀差異。reduced-motion 可在第一個穩定 frame 後無 pending rAF。
- 長時間動畫只能是一次性、可結束；禁止 nuclei orbit、高頻閃爍與常駐 photon loop。

### 7. 視覺與 fallback

- layer order 固定依 visual system：atmosphere → edges → corona → body → guided → depth → portal → selected/related → labels/focus。
- 不使用 per-edge/per-node `shadowBlur`；glow 使用 cached sprites 或 layered strokes。far additive exposure 不得白化畫面。
- 8 個 known overlays 的 256 powerset 必須都能 render without throw；視覺 pixel matrix 至少固定 `depth_lens`、`portal_ring`、`depth_lens+portal_ring`、`selected+depth_lens+portal_ring`，並涵蓋 reduced-motion。
- 8 archetypes 都有明確 body silhouette；未知 archetype fallback 仍可 hit、focus、label。
- label collision 不做全量兩兩比較；同 priority 以 viewport center distance、focus relevance、stable id tie-break，camera 靜止時結果 deterministic。

## 預計檔案範圍

可新增：

```text
frontend/renderer-v2-lab.html
frontend/src/renderer-v2-lab.js
frontend/src/engine-v2/**
frontend/src/styles/pages/renderer-v2-lab.css
tests/renderer-v2/**
tests/e2e/renderer-v2.spec.ts
```

可修改：

```text
package.json                         # test:renderer-v2；納入 verify
docs/CODEBASE-MAP.md
docs/GRAPH-ATLAS-IMPLEMENTATION-ROADMAP.md
docs/ROADMAP.md
docs/tasks/2026-07-14-graph-atlas-wp5-renderer-v2-core.md
```

預設 read/import only，不修改：

```text
frontend/src/engine/**
config/atlas/**
data/**
scripts/atlas/**
```

## 驗收條件

- [x] `setScene` 接受版本化 normalized scene，未知 archetype／overlay 安全 fallback；invalid ids、duplicate ids、non-finite coordinates、dangling edges fail-fast，且不改 input object。
- [x] deterministic generator 固定產出 1,000 nodes／7,000 edges、8 archetypes、8 overlays、locked coordinates；同 seed 的 scene/draw plan hash 相同。
- [x] camera world↔screen round-trip、DPR 1/2、resize backing store、bounded viewport unit tests 全過；視覺 token 改動不改 scene coordinates/hash。
- [x] far/mid/near/focus 結構 gate 全過：far edges=0、mid edges≤top-K、near/focus 只走 viewport/adjacency candidates；frame debug stats 證明沒有 1,000/7,000 full scan。
- [x] quadtree hit test 不做 O(n) scan，44×44 CSS px touch target、重疊候選排序與 stable-id tie-break 有 unit/E2E tests。
- [x] route consumer 支援 line/quadratic/polyline；unknown/invalid optional route 降級，不在 runtime 做 global bundling。
- [x] 8 archetypes 與 overlay 256 powerset 已有 no-throw／layer-order gate；`depth_lens`、`portal_ring`、兩者疊加及 `selected` 三層疊加均有 deterministic pixel snapshots，並涵蓋 reduced-motion。
- [x] sprite registry、atmosphere cache 在 scene 靜止時不重建；沒有 `shadowBlur` hot path，first paint 可同步完成。
- [x] labels 依 frozen priority/collision/tie-break 穩定；camera 不動時連續 render 的 accepted label ids/order 相同。
- [x] normal motion 在最後輸入/one-shot 完成 5 秒後進入 `resting`，redraw count=0 delta、無 pending rAF；pointer/camera/scene change 可喚醒。reduced-motion 第一個穩定 frame 後即 on-demand。
- [x] lab 沒有 fetch canonical graph、Wonder/Depth/Atlas artifacts或 `/api/*`；測試 scene 由 local deterministic module 產生。
- [x] desktop 1920×1080 DPR 1/2、mobile 390×844 DPR 2、reduced-motion 的 Playwright Chromium browser QA 與效能矩陣完成；已記錄 p50/p95、>100 ms long tasks、focus latency、first meaningful scene、LOD candidates 與 resting redraw，未將本機數據作跨硬體承諾。
- [x] `npm run test:renderer-v2`、`npm run test:atlas`、`npm run verify`、繁簡檢查全綠；視覺改動已用 Playwright screenshot／pixel probe 實看，不只靠 DOM。
- [x] production `index.html`／`app.html`／`wonders.html`／`explorer.html` imports、既有 hooks、Vite production entries與 legacy engine行為不變；rollback 可只移除 lab、engine-v2、tests與 package script。
- [x] 一輪不同模型家族的 WP5 cross-review 完成；Claude Sonnet 4.6 verdict 為 approve，Riku 已與 WP4 合併 closeout，可開 WP6。

## 邊界（不要動的東西）

- 不修改 `frontend/src/app-main.js`、`wonders-main.js`、`explorer-main.js`、`atlas/**` 或任何 production page adapter/import。
- 不修改 `frontend/src/engine/canvas-renderer.js`，不刪/搬 legacy engine，不改既有 `window.__neblux*` hooks。
- 不接 Main/Wonder/Atlas 真實 runtime；不讓 lab 進 production build/sitemap/navigation。
- 不修改 stable layout locks、celestial lock、Atlas config、canonical graph、Wonder data、Depth manifest或任何 public artifact contract。
- 不新增 production dependency，不導入 WebGL/MapLibre/framework/Service Worker。
- 不實作 runtime global bundling；不在 no-bundling gate 前實作 build-time bundle consumer。
- 不修改 `_headers`、`functions/`、Cloudflare/Vercel、CI/CD、deploy、domain、API flag、telemetry、auth、payment或 secrets。
- 不順手重構 app/explorer 平行 glue；這是已接受的技術債邊界。

## Questions（實作層填）

- WP5 本身目前無產品／架構未決項；scene contract、module boundary、LOD semantics、overlay matrix、scheduler與 rollback 已由 accepted roadmap/visual system 凍結。
- WP4／WP5 cross-family Review 已由 Claude Sonnet 4.6 完成並由 Riku 合併 closeout；不再是本包或 WP6 的 blocker。
- 真機中階手機測量無法由 Playwright 取代；桌機與 emulated mobile 自動/瀏覽器 QA 先完成，實機數據列為需要 Riku 的 field validation，不得捏造。
- 2026-07-14 暫跳過記錄已由 Riku 明示授權覆寫：WP5 已開始實作；原先 cross-fire 失敗原因（Windows `spawnSync claude.cmd EINVAL`／Claude session limit）保留作審查追蹤，不是 implementation blocker。
- 2026-07-14 Riku 明示授權：WP4 cross-family review 延後，待 WP5 完成後與 WP5 一起審查；該合併審查現已完成。

## HANDOFF（實作層完成或卡住後填）

- Branch: `codex/graph-atlas-wp5`
- Base commit: `9a72255` initial WP5 base；WP4 F-1/F-2 follow-up resides in the current uncommitted worktree.
- Summary: Added a parallel, page-agnostic Canvas 2D Renderer v2 core and deterministic lab for 1,000 nodes／7,000 edges. Formal overlay snapshots exposed overlapping Depth／Portal ring radii; the compositor now preserves distinct inner-to-outer Depth, Portal and selected rings. Production pages and legacy engine remain untouched.
- Changed files: `frontend/src/engine-v2/**`, `frontend/renderer-v2-lab.html`, `frontend/src/renderer-v2-lab.js`, `frontend/src/styles/pages/renderer-v2-lab.css`, `tests/renderer-v2/**`, `tests/e2e/renderer-v2.spec.ts`, `tests/e2e/renderer-v2-performance.spec.ts`, `tests/e2e/renderer-v2-visual.spec.ts` and its snapshot, `package.json`, this brief.
- Contract changes: Added versioned scene normalization, safe archetype／overlay fallbacks, stable scene hash, camera／quadtree／LOD／route／sprite／overlay／label／atmosphere／scheduler modules, and public `createRendererV2` entry. No canonical data or production adapter contract changed.
- Migration／rollback: No production cutover. Remove the lab, `engine-v2`, renderer-v2 tests, and the `test:renderer-v2` verify script to roll back; `frontend/src/engine/**` and existing Vite production entries are unchanged.
- Automated verification: `npm run verify` PASS — build, renderer-v2 unit 15/15, depth-build 4/4, non-visual E2E 84/84, Atlas 46/46. `npm run test:e2e:visual` PASS 4/4, including the renderer overlay matrix. `python scripts/check_simplified.py` PASS — 0 ERROR／21 existing review characters.
- Final closeout revalidation (2026-07-14): `atlas:validate` PASS (687 nodes／3,381 records／3,138 active pairs／atlas config validated); `atlas:build-data` PASS (80 artifacts); `atlas:build-index` PASS; `atlas:audit-data` PASS (80 artifacts); `atlas:layout:check` PASS (687 nodes／19 Wonders／0 overlaps).
- Browser／device verification: Playwright Chromium PASS on desktop 1920×1080 DPR 1 and 2, mobile 390×844 DPR 2, and reduced-motion. Four overlay combinations have stable center-pixel snapshots; normal and reduced-motion retain the same static shape signatures. `agent-browser` is unavailable, so the installed Playwright Chromium fallback was used. Real intermediate-phone hardware was not measured.
- Performance delta: On the deterministic 1,000-node／7,000-edge scene, local Chromium pan-zoom p50 was 0.4–0.7 ms and p95 0.9–1.9 ms; focus latency 0.4–1.0 ms; first meaningful scene 27.0–38.2 ms. All four profiles recorded 0 renderer frames over 100 ms and 0 observed browser long tasks over 100 ms. Desktop DPR 1 and mobile reached `resting` with redraw delta 0／no pending rAF; reduced-motion stayed `clean` on demand with redraw delta 0／no pending rAF. Structural far/mid/near/focus culling gates passed and no runtime bundling was added. These are local browser measurements, not a cross-device FPS claim.
- Layout diff: expected none; no layout/config/data locks changed. Deterministic lab scene hash is stable for the same seed and token changes.
- Remaining risks: Physical intermediate-phone performance remains field validation because Playwright emulation cannot replace real hardware. WP6 adapter／canonical lock mapping is not started.

## Review（審查層填；必須與 WP5 實作層不同模型家族或 fresh session）

- Reviewer: Claude Sonnet 4.6（不同模型家族；Codex 為實作層）
- 模式: ③對抗驗證
- 觸發原因: 路徑觸發（新增 `frontend/src/engine-v2/` 通用 renderer core）
- Verdict: **approve**
- Findings:
  - **F-1（PASS）far edges = 0**：`buildDrawPlan` 在 far mode 完全不填 edges（初始空陣列，無 if-branch 填入）✅
  - **F-2（PASS）quadtree O(1) hit test**：`createSpatialIndex.queryPoint` 走 d3-quadtree visit，剪枝正確，不做 O(n) scan；`hitTest` 取候選後以 selected/priority/distance/stable-id 排序 ✅
  - **F-3（PASS）256 overlay powerset no-throw**：`visual-contract.test.mjs` 全部 256 combo 跑過，layer order 固定；`depth_lens + portal_ring + selected` 三層疊加有 pixel snapshot ✅
  - **F-4（PASS）scheduler resting 5s / reduced-motion on-demand**：`createFrameScheduler` 用 fake clock 測試覆蓋 wake/resting/reduced-motion/destroy；reduced-motion `scheduleRest` 直接返回不設 timer，第一幀後無 pending rAF ✅
  - **F-5（PASS）`renderNow()` 同步**：`if (!scheduler.flush()) drawFrame()` 雙路徑保證第一幀不依賴 rAF ✅
  - **F-6（PASS）無 fetch / 無 DOM listener**：grep engine-v2/ 無 `fetch(`；renderer.js 不綁任何 DOM event ✅
  - **F-7（PASS）destroy 清理**：`scheduler.destroy()` 取消 rAF/timers；`spriteRegistry.clear()`、`atmosphere.clear()`；`scene=null`、`index=null`；呼叫後 setScene early-return ✅
  - **F-8（PASS）multiple setScene 不累積 stale cache**：每次 `setScene` 呼叫 `spriteRegistry.clear(); atmosphere.clear();` ✅
  - **F-9（PASS）getDebugStats 欄位完整**：`drawnNodes`, `drawnEdges`, `nodeCandidates`, `edgeCandidates`, `hitCandidates`, `unknownArchetypes`, `unknownOverlays`, `redrawCount`, `schedulerState`, `lastFrameMs` 全部存在 ✅
  - **F-10（PASS）無 runtime global bundling**：edge-routes.js 只做 line/quadratic/polyline 繪製，無 bundling consumer；`topKBridges` 是 pre-filter at buildIndex time，frame 不掃 ✅
  - **F-11（PASS）`normalizeScene` fail-fast on bad input**：duplicate node id、non-finite coords、dangling edges、wrong schemaVersion 全部 throw ✅
  - **F-12（INFORMATIONAL）`DEFAULT_TOKENS.magnitude` 包含 `nucleus` tier**：`MAGNITUDES = ['nucleus', 'major', 'bright', 'standard', 'faint']`，tokens 完整對應；無 missing enum gap ✅
  - **無方向性分歧**：engine-v2 與 legacy engine 完全並存，不共享可寫 state，WP6 adapter 邊界乾淨
  - **信心來源**：本機重跑 `npm run test:renderer-v2` 15/15、`npm run verify` 84/84；關鍵模組直接讀原始碼驗算（camera 公式、clampCamera 數學、scheduler state machine、buildIndex 邊構建流程）；無「全部通過零疑慮」異味 — 有一項 WP4 fix-needed 在獨立工作包

## 裁決（凜空）

- 決定: WP4 F-1/F-2 已修正；WP5 approve。WP4＋WP5 review gate 合併關閉。可開 WP6。
- 日期: 2026-07-14
