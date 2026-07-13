# Graph Atlas — Fable 5 Cross-Review Packet

狀態：REVIEW COMPLETE（2026-07-12）
日期：2026-07-12
Reviewer role：只審查、不改檔、不重新設計產品

## 1. Reviewer input

請依序閱讀：

1. `AGENTS.md`
2. `docs/DIRECTION.md`
3. `docs/GRAPH-ATLAS-PLAN.md`
4. `docs/GRAPH-ATLAS-DATA-CONTRACT.md`
5. `docs/GRAPH-ATLAS-VISUAL-SYSTEM.md`
6. `docs/GRAPH-ATLAS-IMPLEMENTATION-ROADMAP.md`
7. `docs/GRAPH-ATLAS-SELF-AUDIT.md`
8. `docs/tasks/2026-07-12-graph-atlas-planning.md`
9. 本次 planning diff

需要現況定位時再查：

- `frontend/src/engine/layout.js`
- `frontend/src/engine/canvas-renderer.js`
- `frontend/src/app-main.js`
- `frontend/src/wonders-main.js`
- `vite.config.ts`
- `scripts/build_tour_index.mjs`
- `neblux-depth/depth_manifest.json`

## 2. 已確認的 repo 事實

- 687 nodes、3,381 semantic connection records；投影為 3,159 unordered pairs（3,138 active、21 pending-only）。
- 45 field、567 concept、45 person、30 event。
- 現有資料出現 12 domain codes；歷史文件曾寫 13 domains，尚待 Phase A 對帳。
- 19 Wonders，每趟 6–7 steps，共 113 unique graph refs。
- 9 nodes 同時出現在兩趟 Wonders。
- Wonder nodes 與其他主圖 nodes 間約 811 edges。
- Main graph 現行會一次載入 slim topology；descriptions／sections 分流。
- Wonders 現行仍會載入完整 graph topology 再抽子圖。
- Layout 現行每次 build 由全域 d3-force 重新 bake。
- Renderer 現行以 Canvas 2D、offscreen sprites、zoom LOD、tour constellation overlay 運作。
- API 全滅站照常、無帳號個資、禁止遊戲化是鐵律。

## 3. 使用者已表達的目標

- Neblux 是長期專案，可接受大型工程，以長期最優解為目標。
- 首頁顯示中央超大主星系與周圍 Wonder 星團，首頁主要是視覺與跳轉。
- 主星系保留大部分一般 nodes；1,000 nodes 內可一次存在。
- Wonder 擴充成約十幾至數十 nodes 的主題星團，可含 Depth。
- canonical node 重複出現在 Main／Wonder 時，具有蟲洞跳轉。
- Wonder 保留並強化教育合作的主題式學習單位角色。
- Depth 暫無專用入口，聚焦物理與數學專有名詞，主要由 Google 與 graph node 進入。
- 希望後期小改不會造成全圖重排或跨模組連鎖修改。
- Mathematics／Physics 可採高重力大型天體作為主星系核心。

## 4. 提案核心決策

1. 四級架構：Atlas／Main Galaxy／Wonder Cluster／Depth。
2. `all_nodes.json` 維持 canonical graph 唯一真相。
3. Wonder JSON 同時承載 guided spine 與 cluster membership，不另建平行 Wonder graph。
4. Depth publication 只由 Depth manifest 決定，不在 Wonder 重複維護。
5. Atlas／Wonder 使用 build-time static bundles；不載完整 graph。
6. Main Galaxy 允許一次載入目標 1,000 nodes／7,000 edges 的 slim topology。
7. Canvas 2D 優先；完成 LOD／cache／spatial index 後仍不足才評估 WebGL。
8. Atlas positions 人工核可並固定；Main 採 anchored semantic layout；Wonder 採 spine-constrained layout。
9. Layout、visual magnitude、celestial archetype、interaction role 分離。
10. Normal build 不重排；node addition 只 local solve；relation change 預設不改永久位置。
11. Mathematics／Physics 是固定雙 galactic nuclei；其他 domains 有獨立 cores。
12. Portal 是同一 canonical node 的跨視圖 navigation，不是資料複製。
13. v2 平行建造，通過 parity 後逐層 cutover。

## 5. 已知方向差異／待裁決

1. `DIRECTION.md` 現在要求 landing 主推 featured Wonder；新提案改為 Atlas 首頁，但仍要求 Wonder clusters 具有高可見度。這是明確方向演進，不可假裝沒有衝突。
2. Main Galaxy 在 Atlas 中視覺最大，可能與「Wonders 是產品核心」形成視覺地位張力。
3. Mathematics／Physics 雙核心是使用者提出並接受的編輯式世界觀，但仍需檢查是否讓其他領域被誤讀為次等。
4. 12／13 domains 尚未對帳。
5. Wonder context schema 尚未實作驗證。
6. 1,000／7,000 是目標壓力資料，不是現況實測結論。
7. Canvas 2D 是否足夠仍需基準，而非由文件宣稱。

## 6. 請 Reviewer 只回答的問題

### A. 致命假設

- 哪一項假設若不成立，整個 Graph Atlas 架構必須換軌，而不是局部修正？
- 是否存在計畫沒有看到的 source-of-truth、身份、URL 或 build 循環問題？

### B. 小改爆炸半徑

逐項檢查：

- 新增普通 node
- 新增 relation
- 修改 node domain
- 新增 Wonder context node
- 修改 guided content
- 發布／撤下 Depth
- 新增 domain
- node id migration

計畫是否真的把影響限制在宣稱範圍？指出任何會暗中觸發全量 rebuild／re-layout／cache drift 的地方。

### C. Layout 穩定

- Hard／soft／new locks 與 movement budget 是否足以避免長期漂移？
- Relation change 預設不重排是否會讓圖的空間語意逐漸失真？需要什麼重整閘門？
- Mathematics／Physics 雙核心與多領域 barycenter 是否會製造新的中心毛球？
- Wonder spine constraint 與 context forces 是否會產生不可讀交叉？

### D. Data contracts

- Wonder core＋locale sidecar 是否過度複雜或仍會內容漂移？
- Portal／Depth indices 是否有循環或 stale route 風險？
- 是否有不該由 build artifact 承擔的 source truth？
- Version contract 是否能支撐平行 v1／v2？

### E. Renderer／效能

- Canvas 2D＋quadtree＋LOD＋dirty frames 對 1,000／7,000 是否合理？
- 哪些 operation 仍可能成為 O(n²) 或長任務？
- Edge bundling、label collision、nebula density 是否應全在 build-time？
- Atlas preview 應用 geometry、sprite 或 raster，計畫有無錯誤取捨？

### F. Product／教育

- Wonder cluster＋guided／explore 是否保留「主題式學習單位」而不變成普通子圖？
- Atlas 中巨大 Main Galaxy 是否實際邊緣化 Wonders？
- Depth 的 SEO-first／node-linked 路徑是否與 Wonder 教育流程衝突？

### G. Accessibility／failure

- Canvas DOM mirror、keyboard navigation、reduced-motion 與 no-JS fallback 是否有漏掉的核心狀態？
- 哪個 artifact 失敗可能造成半殘但計畫沒有 fail-fast？
- URL precedence／history 是否存在不可返回或狀態互相覆蓋？

### H. Migration／over-engineering

- WP0–WP10 的 dependency 是否正確？
- 哪個 WP 應拆分、合併或提前做 spike？
- 哪些設計是尚未被風險證明的過度工程？
- 是否有更便宜的 vertical slice 能驗證最致命假設？

## 7. Reviewer 輸出格式

請只輸出 acceptance-criteria findings，不修改檔案：

```md
Verdict: approve | fix-needed

## Findings

### [P0|P1|P2] <title>
- Evidence:
- Why it matters:
- Required correction:
- Files／sections:

## Assumptions that survived review
- ...

## Recommended first vertical slice
- ...
```

嚴重度：

- P0：方向或資料安全致命，照做會使整案失敗。
- P1：進入實作前必修，否則高機率大幅返工。
- P2：可在對應 WP 前修正，不阻擋主方向。

一輪審查即止；Reviewer 不重寫產品、不直接改 code。Riku 裁決分歧。

---

## 8. 審查結果歸檔

> 以下依 Fable 5 產出的 review-fixes brief 歸檔；packet 本體保留為送審快照。Verdict：**fix-needed**；0×P0、4×P1、7×P2。

### F1 [P1] Guided tour index 在 v2 契約中遺失

- Evidence：現行主圖星座、node card 站數與 related tour 依賴 `tour-index.json`，原 v2 衍生檔清單未提供繼任者。
- Required correction：新增版本化 `constellation-index.json`；明確區分 guided spine index 與 cluster membership portal index，並規劃 v1 並行與退場。

### F2 [P1] Edge 契約未區分 semantic records 與 topology pairs

- Evidence：canonical graph 有 3,381 records、3,159 unordered pairs；雙側記錄可合法有不同 relation／flags。原文件把「邊」當單一層。
- Required correction：完整列出 connection schema；semantic consumers 保留方向記錄，layout 才投影 active pair；定義 pending、prerequisite、directed 與 parallel policy。不得把 pair metadata 差異誤判為錯誤。

### F3 [P1] Wonder authored edges 與 explore graph edges 未定義

- Evidence：`wonders[].edges` 已是策展 spine，但原 bundle 只有含義不明的 `edges`。
- Required correction：authored `spineEdges` 與 derived active induced `graphEdges` 分離，驗證端點與主題規模。

### F4 [P1] 最致命的 layout 假設驗證得太晚

- Evidence：雙核心＋12 anchors 若在 687 nodes 下不可讀，後續 schema／renderer 投資都會返工。
- Required correction：增加 WP0.5 throwaway layout spike，作為 WP1 前置 gate。

### F5 [P2] Depth publication 詞彙存在漂移

- Evidence：Depth validator 同時治理 `status` 與 `review_status`，原 Atlas 只引用部分條件。
- Required correction：以 Depth 治理為權威；公開條件固定為 public、status live、review_status published、path 與四項 QA 全過。

### F6 [P2] 內部 locale 與 hreflang 混用

- Evidence：runtime key 是 `en/zh/ja`，原範例把 `zh-Hant` 寫入 sidecar locale。
- Required correction：內部 key 固定三值，只有 SEO 對外映射 `zh → zh-Hant`。

### F7 [P2] Resting 與 twinkle 的效能定義矛盾

- Evidence：文件一處要求 resting 不 redraw，另一處允許持續 twinkle。
- Required correction：idle 5 秒且無 one-shot 動畫後整幀凍結；互動喚醒，reduced-motion 永久關 twinkle。

### F8 [P2] Wonders parity hook 漏列

- Evidence：`window.__nebluxWonders` 已由 `wonders-main.js` 暴露並受 `tests/e2e/wonders.spec.ts` 使用，原 migration 僅保留 App／Explorer hooks。
- Required correction：將 Wonders hook 納入平行建造與 WP7 parity。

### F9 [P2] Layout debt 缺少局部擁擠與升級規則

- Evidence：只量長邊與 drift 無法發現 overlap／局部密度惡化；local solve 反覆失敗沒有明確出路。
- Required correction：加入 k-NN density p95、overlapCount；同區域連續兩次超 movement budget 即 recommend migration，禁止自動擴圈。

### F10 [P2] Phase／WP 與 debt artifact 定位不一致

- Evidence：兩套階段編號未映射，且 layout debt 被列為 production 公開輸出。
- Required correction：增加 Phase↔WP 表；layout debt 改為不進 dist 的 build report。

### F11 [P2] 過早把 bundling 與空白 v2 重寫當成既定

- Evidence：遠景本可不畫邊，中景可先 top-K；現有 engine 已有 geometry／theme／sprites 可延續。
- Required correction：先測無 bundling LOD，未達 gate 才啟用 bundling；v2 從現有 engine 演進／fork。

## 9. Assumptions that survived review

- 四級產品模型、canonical node 身份與跨視圖 portal 方向成立。
- Static-first bundles、API failure 不影響核心內容的原則成立。
- Stable locks、local solve、explicit migration 可把普通更新的爆炸半徑限制在局部。
- Wonder 同時保留 guided product 與 explore cluster，比另建平行 Wonder graph 更可維護。
- Canvas 2D 仍可作起點，但 1,000／7,000 必須依 LOD／裁切的實測 gate 決定，不可先宣稱足夠。

## 10. Recommended first vertical slice

先做 WP0.5：用現有 687 nodes 與 3,138 active topology pairs 產出雙核心＋12 anchors 的 far／mid／near 靜態圖，同時估算 Light／Quantum bundle，並以現有 renderer 粗測 1,000／7,000。只有 layout 可讀才進 WP1；renderer 粗測只決定 WP5 的優化前提，不提前實作正式引擎。
