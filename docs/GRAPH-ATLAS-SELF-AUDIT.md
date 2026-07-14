# Graph Atlas v0.2 Self-Audit

狀態：COMPLETE FOR CROSS-REVIEW
日期：2026-07-12
範圍：planning documents only；未驗證尚未實作的效能與視覺結果

> **歷史狀態（2026-07-14 補註）：**本檔記錄 WP0 前的 planning self-audit。下列「尚未 ready-for-implementation」前置已由 WP0／WP0.5／WP1／WP2 完成；現行工程狀態以 `GRAPH-ATLAS-IMPLEMENTATION-ROADMAP.md` 與各 WP brief 為準。本檔保留原文作審查軌跡，不再作開工判斷。

## Round 1 — Internal contract consistency

### Findings and corrections

1. **Wonder 重複維護 Depth refs**
   v0.1 容易讓 Wonder cluster 再填一次 Depth membership。已修正：Depth publication／anchor 只來自 Depth manifest，Wonder runtime 依 canonical node id join。

2. **Atlas roads 會因 edge 排名波動**
   若直接使用 `tour-index.related` top-N，新增一條 edge 可能讓星團道路換位。已修正：分析只產候選；公開 roads 必須人工核可並鎖定。

3. **普通 build 可能偷偷解算座標**
   v0.1 對 normal bake 定義不足。已修正：普通 Vite build 只讀 layout locks；缺 lock 直接 fail；solver 只由 explicit CLI 觸發。

4. **現有 `?w=<id>&s=<step>` 相容問題**
   若 v2 無 mode 預設 explore，舊深連結會改義。已修正：無 mode 保留 guided intro／guided deep-link；Atlas 要自由探索時明確使用 `mode=explore`。

5. **`generatedAt` 破壞 reproducibility**
   已修正：非決定性 metadata 只放獨立 build manifest，不影響主要 artifact hashes。

6. **Edge bundling runtime／build 責任不清**
   已修正：far／mid bundle geometry 由 locked positions 在 build-time 產生；runtime 只選擇與繪製，focus 少量 real edges 才即時計算。

7. **Layout fingerprint 可能被文案修改污染**
   已修正：拆成 node-set、anchor-config、relation／content fingerprints；內容修改不使 layout 失效。

### Round 1 verdict

PASS for cross-review。文件間未再發現互相矛盾的 source-of-truth 或 URL default；尚未實作 JSON Schema，因此只能確認文字契約一致。

## Round 2 — Repository and DIRECTION compatibility

### Findings and corrections

1. **Landing direction delta**
   現行 DIRECTION 要 featured Wonder hero；Atlas 改成宇宙地圖。已明列為方向演進，要求 WP0 更新 DIRECTION，未裁決不切 `index.html`。

2. **Wonders product-core 張力**
   Main Galaxy 在 Atlas 尺度最大，可能視覺邊緣化 Wonders。已加入 WP4 gate：Wonder labels／entry affordances 必須第一屏可見，並以使用者測試判斷。

3. **Current Wonder full-graph dependency**
   現行 `wonders-main.js` 會 fetch `/data/all_nodes.json`。已建立 core＋locale bundle contract，並設 E2E hard network assertion。

4. **Current build re-bakes full graph**
   現行 `vite.config.ts` 會呼叫 `bakeLayout(nodes)`。已規劃 v2 locks 平行建立；正式替換須另開 build 禁區 brief，不在 planning 直接更動。

5. **CSP／static-first**
   v2 沿用 same-origin external modules／static JSON，不需要放寬 CSP；所有 API extras 維持 progressive enhancement。

6. **Existing E2E hooks**
   已加入 parity 期間保留 `window.__nebluxApp`／`__nebluxExplorer`／`__nebluxWonders` 的條款。

7. **Explorer 被默默遺漏**
   已修正：v2 不順手移除或改造 Explorer；Main v2 完成後另案裁決。

8. **Depth 既有治理被新計畫覆蓋**
   已修正：WP8 明訂依賴 Depth Phase A triage、內容／理解 gate 與既有 M3 build brief；Graph Atlas 不自行發布 Depth。

9. **12／13 domains 不一致**
   保持 blocking audit item：目前資料 12 codes，WP0 不得在未對帳前固定最終 Atlas domain layout。

### Round 2 verdict

PASS with one explicit direction decision and one domain audit remaining。未發現需要改 CSP、後端或 production deployment 的前置要求。

## Round 3 — Change blast-radius scenarios

| Scenario | Expected artifacts | Layout impact | Audit result |
|---|---|---|---|
| 修改 node description | descriptions、static pages、相關 Wonder locale sidecars | none | PASS |
| 修改 node label | i18n／topology labels、static pages、相關 locale sidecars | none | PASS |
| 新增普通 node | canonical graph、explicit layout:add、main topology | new node＋局部 soft neighbors only | PASS by contract |
| 新增 relation | edges、pathfinding、bundle geometry | none by default | PASS；長期失真需 migration gate |
| 改 node domain | graph、classification／layout proposal | explicit migration review | PASS；不可作普通 edit |
| 刪除 node | reverse-ref cleanup、explicit removal migration | targeted lock removal | PASS；已新增 orphan fail-fast |
| 新增 Wonder context node | 該 Wonder source／bundle／layout、portal index | only that Wonder | PASS |
| 修改 guided narrative | 該 Wonder locale sidecar／share metadata if needed | none | PASS |
| 發布 Depth | depth index、node CTA／overlay | none | PASS |
| 撤下 Depth | depth index／sitemap／CTA removal | none | PASS |
| 改 celestial token | renderer assets／visual baselines | none | PASS |
| 改單一 node magnitude | celestial lock／sprite selection | none | PASS |
| 新增 domain | anchors、Atlas／Main major migration | global, explicit | PASS as major-only |
| 改 canonical id | aliases、redirects、all reverse refs | explicit migration | PASS；direct rename prohibited |
| 改 Atlas Wonder 位置 | atlas layout／preview only | no Main／Wonder node layout | PASS |

### Round 3 unresolved design debt

- Relation changes 長期累積後，永久空間可能逐漸不符合 topology。已補上只讀 `layout debt report` 與初始提醒門檻；實際門檻仍需 WP2 用現況基準校準。
- Wonder locale sidecars 會讓同一 node 的內容出現在多個衍生 bundles；source truth 仍唯一，但 build 成本與 cache invalidation 需在 WP3 實測。
- Atlas roads 人工核可能穩定，但可能過時；需顯示 evidence drift report，不自動改 UI。

## Red-team pre-mortem

### Failure 1：雙核心變成中心毛球

觸發：MAT／PHY anchors 太近、跨域 bridges 全被 barycenter 拉向中央。
控制：anchor spacing prototype、domain boundary force、bridge corridor、p95 density／edge crossing report。
仍需實證：WP2 layout spike。

### Failure 2：Wonder 星團只是放大的舊 tour

觸發：context nodes 只有自動一圈鄰居，沒有主題編輯。
控制：context 只能 proposal＋人工核可；guided spine 保持 hard layout；12–30 節點上限。
仍需實證：Light／Quantum 理解測試。

### Failure 3：Atlas 美但無法導航

觸發：Canvas labels、hit targets、視覺尺度壓過清楚 CTA。
控制：DOM mirror、keyboard list、44px targets、第一屏 entry test。
仍需實證：WP4 mobile／desktop test。

### Failure 4：v2 平行系統長期不切換

觸發：WP5 Renderer v2 與舊 engine 長期雙維護。
控制：每 WP 設明確 parity／cutover gate；只允許 pilot 後再擴大；未達 gate 可封存原型。
仍需裁決：每個 WP 的時間上限在實作 brief 中設定。

### Failure 5：Static bundles 變成新的資料漂移

觸發：手改 public artifacts 或 builders 非決定性。
控制：artifacts gitignored、build-only、byte-stable output、source fingerprint、artifact audit。
仍需實證：WP3 reproducibility test。

## Final self-audit verdict

**ready-for-cross-review，尚未 ready-for-implementation。**

進入實作前仍需：

1. Fable 5 交叉審查與 Riku 裁決 findings。
2. WP0 更新 DIRECTION。
3. 12／13 domain 對帳。
4. WP1 JSON Schemas／validators 的獨立 brief。
5. WP2 layout spike 證明雙核心與 locks 可行。
