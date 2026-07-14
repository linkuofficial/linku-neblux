# Graph Atlas Data Contract

狀態：ACCEPTED / WP1 validators implemented
版本：v0.1
主計畫：`docs/GRAPH-ATLAS-PLAN.md`

> 本文件定義 Graph Atlas v2 的 source-of-truth、衍生檔案、URL 狀態、佈局鎖定與失敗降級。範例欄位是目標契約，不代表已存在於 repo。

## 1. 不可違反的資料原則

1. Canonical node id 永遠來自 `data/all_nodes.json`。
2. Wonder membership 來自該 Wonder JSON，不在 Atlas config 重複維護。
3. Depth publication／anchor 來自 `neblux-depth/depth_manifest.json`，Wonder 不另填 `depth_refs`。
4. Atlas config 只描述呈現、固定位置與人工核可道路，不宣稱知識關係。
5. `frontend/public/data/atlas/` 與 `dist/data/atlas/` 全是 build artifacts，不可手改。
6. 普通 build 不得重新分類天體、不重排既有節點、不自動增刪 Atlas roads。
7. Node id 一旦公開不得直接改名；需要改名時使用 alias／redirect migration。

## 2. 版本契約

每個衍生檔案至少包含：

```json
{
  "schemaVersion": "1.0.0",
  "layoutVersion": "main-2.0.0",
  "rendererContractVersion": "2.0.0"
}
```

規則：

- patch：不改結構，只修值或輸出錯誤。
- minor：新增 optional field，舊 renderer 可忽略。
- major：刪除／改義／改型別，必須提供 migration 與 renderer adapter。
- Runtime 遇到未知 minor field 必須忽略；遇到不支援的 major contract 必須顯示靜態 fallback，不可半殘渲染。

## 3. Source files

### 3.1 Canonical graph

來源：`data/all_nodes.json`

Graph Atlas 使用但不新增的既有核心欄位：

- `id`
- `label`
- `type`
- `domain[]`
- `connections[]`
- `description`
- `sections`

Atlas 專屬視覺資料不得寫回 node objects，避免內容修改與視覺 migration 互相污染。

`connections[]` 是**有方向語意的記錄層**，每筆欄位為：

- `target`：canonical node id，必填。
- `relation_type`：`applied | logical | conceptual | historical | causal`，必填。
- `relation`：自由文句，只供內容展示，不作 layout 分類。
- `directed?`、`learning_prerequisite?`、`parallel_development?`、`pending?`：optional boolean。

現況共有 3,381 筆 semantic records，投影成 3,159 個無序 node pairs；其中 3,138 pairs active、21 pairs pending-only。222 個 pair 在兩側均有記錄，且可合法攜帶不同的 `relation`、方向或 flags，因此 consumer 不得把 metadata 差異判為資料錯誤，也不得一律摺疊 semantic records。

衍生層規則：

- **Semantic／focus／資訊面**保留原始記錄及其方向與 metadata。
- **Layout topology**只將 active records 投影為 3,138 個無序 pairs；同一 pair 最多施力一次。
- `pending:true` 保留在 Main topology 並沿用 pending 視覺，但排除 layout solve、weighted degree、bundles、Atlas roads evidence、Wonder related 權重與 cluster graph edges。
- `learning_prerequisite:true` 將該 semantic record 視為 prerequisite family，layout／priority 權重取 1.00，覆蓋其 `relation_type` 基礎權重。
- `directed:true` 才顯示方向；`parallel_development:true` 在 v2.0 只進 focus 資訊面，不另設線型。

Validator 應拒絕不存在的 target、非法 enum／型別及**完全相同的重複記錄**；不得因同一無序 pair 的兩筆記錄 metadata 不同而失敗。

### 3.2 Wonder source extension

來源：`data/wonders/<id>.json`

建議新增 optional `cluster`：

```json
{
  "cluster": {
    "schemaVersion": "1.0.0",
    "context_refs": ["fourier_analysis_concept"],
    "featured_portals": ["wave_particle_duality_concept"],
    "layout_profile": "curved-spine-v1",
    "visual_scale": "medium"
  }
}
```

欄位規則：

- `context_refs`：人工核可的 canonical graph nodes；不可由 build 自動寫入。
- `featured_portals`：必須是 `steps[].ref ∪ context_refs` 的子集；只控制視覺優先。
- `layout_profile`：只選擇已註冊的 cluster layout strategy。
- `visual_scale`：Atlas preview 的人工策展尺度，與 node count 分離。
- 不提供 `depth_refs`：由 Depth index 依 node id 自動 join。
- 不提供重複 title／description／domain：全部取 canonical graph 或既有 Wonder 欄位。

Wonder 成員集合：

```text
canonicalMembers = steps[].ref ∪ cluster.context_refs
localMembers     = steps[].local
```

既有 `edges[]` 是人工策展的 guided spine／constellation 骨幹，不是完整知識子圖。每筆為 `{source, target, relation_type}`；`relation_type` 使用 canonical graph 相同五值 enum。兩端都必須屬於 `canonicalMembers ∪ localMembers`；不存在端點、self-loop 或完全重複記錄使 validator 失敗。Explore 模式的其餘 `graphEdges` 由 `canonicalMembers` 上的 active induced subgraph 在 build 時衍生，不回寫 Wonder source，並排除 pending pairs。

### 3.3 Depth source

來源：`neblux-depth/depth_manifest.json`

Graph Atlas 只讀：

- `id`
- `node_id`
- `depth_path`
- `public`
- `status`
- `review_status`
- `focus`
- `locales`（存在時）

公開條件固定為：

```text
public === true
AND status === "live"
AND review_status === "published"
AND depth_path exists
AND qa.csp_safe === true
AND qa.reference_notes === true
AND qa.formula_walkthrough === true
AND qa.mobile_canvas_check === true
```

任何一項失敗，該 Depth 不得進索引、bundle、sitemap 或 UI。

`status` 與 `review_status` 的合法值及轉移由 `neblux-depth/PLAN.md` 與 `validate-depth.mjs` 治理；Atlas 只實作上述 publication predicate。`locales` 是未來 optional 欄位，缺省按 `['zh']` 處理。

內部 locale key 固定為 `en | zh | ja`，與 sidecar 檔名及 `localStorage['neblux-lang']` 一致。對外 SEO 才映射 hreflang：`en → en`、`zh → zh-Hant`、`ja → ja`。

## 4. Atlas presentation config

建議目錄：`config/atlas/`

### 4.1 `atlas-layout.json`

```json
{
  "schemaVersion": "1.0.0",
  "layoutVersion": "atlas-1.0.0",
  "coordinateSystem": {
    "width": 12000,
    "height": 8000,
    "origin": "center"
  },
  "mainGalaxy": {
    "x": 0,
    "y": 0,
    "visualRadius": 1900,
    "hitRadius": 2100,
    "route": "/app.html"
  },
  "wonders": {
    "light": {
      "x": -3100,
      "y": -1200,
      "visualRadius": 420,
      "hitRadius": 500,
      "dominantDomains": ["PHY"],
      "visualScale": "medium",
      "route": "/wonders.html?w=light"
    }
  },
  "roads": [
    {
      "id": "light-quantum",
      "from": "wonder:light",
      "to": "wonder:quantum",
      "via": "wave_particle_duality_concept",
      "strengthClass": "strong",
      "approved": true
    }
  ]
}
```

規則：

- 座標是獨立 Atlas coordinate space，不與 Main／Wonder node positions 共用。
- `roads` 可由分析工具提出候選，但只有 `approved:true` 才公開。
- 普通 graph edge 變更只能更新 road evidence，不得自動新增、刪除或換位。
- hit radius 必須大於 visual radius，並由 DOM mirror 提供鍵盤等價入口。

### 4.2 `domain-anchors.json`

目前資料的 12 個 domain codes：

`MAT, PHY, CHE, BIO, MED, ENG, TEC, SOC, HUM, PHI, ART, HIS`

目標結構：

```json
{
  "schemaVersion": "1.0.0",
  "layoutVersion": "main-2.0.0",
  "anchors": {
    "MAT": {
      "nodeId": "mathematics_field",
      "x": -260,
      "y": 0,
      "lock": "hard",
      "massClass": "nucleus",
      "archetype": "galactic_nucleus"
    },
    "PHY": {
      "nodeId": "physics_field",
      "x": 260,
      "y": 0,
      "lock": "hard",
      "massClass": "nucleus",
      "archetype": "galactic_nucleus"
    }
  }
}
```

Top-level anchors 必須明列，不以 `*_field` 命名規則自動猜測。新增 domain 是 major layout migration。

### 4.3 `celestial-lock.json`

天體分類普通 build 不重算。分類工具只產生 proposal，人工核可後寫入 lock：

```json
{
  "schemaVersion": "1.0.0",
  "classificationVersion": "1.0.0",
  "adapterVersion": "1.0.0",
  "nodes": {
    "fourier_analysis_concept": {
      "archetype": "bridge_star",
      "visualMagnitudeClass": "bright",
      "layoutMassClass": "bridge",
      "labelPriorityClass": "high",
      "reason": "Cross-domain MAT/PHY/ENG/TEC bridge"
    }
  }
}
```

`adapterVersion` fixes the explicit mapping from lock enums to Renderer v2 scene enums: `landmark → nucleus`, `faint|standard|bright → same-named magnitude`, and `low|standard|high|critical → same-named label priority`. `layoutMassClass` remains a build-time classification/audit input and is not injected into renderer node payloads. A major adapter mismatch must fail before scene normalization.

未知 node 使用安全預設：

- field → `subfield_giant`
- concept → `concept_star`
- person → `beacon_star`
- event → `event_remnant`

### 4.4 `layout/main.json`

```json
{
  "schemaVersion": "1.0.0",
  "layoutVersion": "main-2.0.0",
  "nodeSetFingerprint": "sha256:...",
  "anchorConfigFingerprint": "sha256:...",
  "nodes": {
    "physics_field": {
      "x": 260,
      "y": 0,
      "lock": "hard"
    },
    "fourier_analysis_concept": {
      "x": 410,
      "y": -180,
      "lock": "soft",
      "radius": 90
    }
  }
}
```

`radius` 是 soft lock 可移動半徑，不是視覺大小。

Fingerprints 分工：

- `nodeSetFingerprint`：只含排序後 canonical node ids；文字修改不影響。
- `anchorConfigFingerprint`：只含 anchors 與 lock policy。
- relation fingerprint 屬 edge／bundle artifacts，不作為永久座標失效條件。
- content fingerprint 不進 layout files。

### 4.5 `layout/wonders/<id>.json`

每趟獨立：

```json
{
  "schemaVersion": "1.0.0",
  "layoutVersion": "wonder-light-1.0.0",
  "wonderId": "light",
  "membersFingerprint": "sha256:...",
  "nodes": {
    "optics_concept": {
      "x": -400,
      "y": 100,
      "lock": "hard",
      "role": "spine",
      "step": 1
    }
  }
}
```

修改 `light` 不得改變其他 Wonder layout files 或 hashes。

## 5. 衍生檔案契約

### 5.1 `/data/atlas/index.json`

用途：Atlas 首頁唯一必要資料。

包含：

- main galaxy summary
- Wonder summaries
- approved roads
- preview asset paths／geometry
- localized labels／short descriptions

禁止包含：

- raw graph nodes
- raw graph edges
- 完整 descriptions
- 未發布 Wonder／Depth 資訊

### 5.2 `/data/atlas/portal-index.json`

```json
{
  "schemaVersion": "1.0.0",
  "nodes": {
    "wave_particle_duality_concept": {
      "destinations": [
        { "view": "main", "route": "/app.html?node=wave_particle_duality_concept" },
        { "view": "wonder", "id": "light", "route": "/wonders.html?w=light&node=wave_particle_duality_concept" },
        { "view": "wonder", "id": "quantum", "route": "/wonders.html?w=quantum&node=wave_particle_duality_concept" }
      ]
    }
  }
}
```

Main destination 對所有 canonical nodes 成立，但 runtime 可省略只含 main 的普通 entries。

### 5.3 `/data/atlas/depth-index.json`

```json
{
  "schemaVersion": "1.0.0",
  "nodes": {
    "fourier_analysis_concept": [
      {
        "id": "fourier-series",
        "path": "/depth/fourier-series.html",
        "focus": "fourier-series-square-wave",
        "locales": ["zh"]
      }
    ]
  }
}
```

只包含 published Depth。Wonder bundle 透過 canonical node id join，不複製 publication truth。

### 5.4 `/data/atlas/constellation-index.json`

v2 版 guided index，沿用現行 `tour-index.json` 的 `tours`、`nodes`、`related` 語意並加入 `schemaVersion`：

```json
{
  "schemaVersion": "1.0.0",
  "tours": {},
  "nodes": {},
  "related": {}
}
```

- `tours`：Wonder → 依序排列的 guided step refs，供主圖 constellation focus。
- `nodes`：canonical node → Wonder／step，供 node card 顯示「第 N 站」。
- `related`：Wonder → 建議下一趟、`via` 與 `weight`，供 guided 結尾。
- 此 index 只代表 **guided spine（steps 與順序）**；`portal-index` 代表 **cluster membership（steps ∪ context_refs）**，兩者不可互換。
- 平行期繼續產出 v1 `/data/tour-index.json`；WP10 cutover 後以 alias 保留一個 release window 才退場。

### 5.5 Main topology

Main Galaxy 可繼續一次載入 slim topology，但座標改由版本化 v2 layout 注入。描述與 sections 維持 sidecar streaming。

### 5.6 Wonder bundles

為避免載入完整 graph，採「core＋locale sidecar」：

```text
/data/atlas/wonders/light.core.json
/data/atlas/wonders/light.en.json
/data/atlas/wonders/light.zh.json
/data/atlas/wonders/light.ja.json
```

Core：

```json
{
  "schemaVersion": "1.0.0",
  "wonderId": "light",
  "layoutVersion": "wonder-light-1.0.0",
  "nodes": [
    {
      "id": "optics_concept",
      "type": "concept",
      "domain": ["PHY"],
      "x": -400,
      "y": 100,
      "roles": ["spine", "portal"],
      "step": 1
    }
  ],
  "spineEdges": [],
  "graphEdges": [],
  "guided": {
    "stepNodeIds": ["optics_concept"]
  }
}
```

- `spineEdges`：從 authored `wonders[].edges` 複製並驗證，保留 guided 順序語意。
- `graphEdges`：`canonicalMembers` 上的 active induced subgraph；以 topology pair 輸出、排除 pending，且不得回寫 source。
- 若 induced `graphEdges` 超過 150，build 發警告並要求重審主題邊界；runtime 仍須依 zoom／focus 篩選，不得一次全畫。

Locale sidecar：

- Wonder title／intro／narrative
- node labels
- 該星團內節點所需 lead／sections 摘要
- UI-independent accessible descriptions

Locale 載入失敗時 fallback English；core 失敗則該星團不可操作，但 Atlas／Main Galaxy 必須正常。

## 6. 佈局求解契約

### 6.1 Normal build 與 explicit bake

普通 Vite build：

- 只讀取並驗證已版本化 layout locks。
- 將已核可 positions 注入 build artifacts。
- 產生 edge routes／bundles 與 fingerprints。
- 不執行 solver、不修改 source config。
- 發現 canonical member 缺 layout entry 時直接 fail，提示先執行 explicit layout command。

Explicit `layout:add`／`layout:wonder` 才允許：

- 對 `new` nodes 求位置。
- 對新節點一圈 soft neighbors 做半徑內 relaxation。
- 產生 diff proposal。
- 只有明確 `--write` 且通過 movement budget 才更新 locks。
- 同一區域 local solve 若連續兩次超過 movement budget，維持 fail-strict、不自動擴大解鎖圈，並令 layout debt `recommendMigration:true`。

普通 build 與 explicit local bake 都不允許：

- 移動 hard anchors。
- 重新分類 celestial archetypes。
- 因新增 relation 全域重排。
- 改 Atlas region positions。
- 改不相關 Wonder layouts。

### 6.2 Relation change

新增／刪除 relation 預設只更新 edge rendering 與 pathfinding，不改永久 positions。若關係變更累積到需要重整空間，必須另開 `layout:migrate` brief。

### 6.3 Node addition initial placement

初始目標：

```text
target = 0.55 × domainAnchorBarycenter
       + 0.35 × connectedNeighborCentroid
       + 0.10 × deterministicIdJitter
```

實際權重在基準原型校準；演算法必須 deterministic。沒有有效 neighbors 時只使用 domain anchors；domain 也缺失則 build fail，不猜。

### 6.4 Weighted degree

只用於 proposal／分析，不在 normal build 自動改 classification：

```text
prerequisite 1.00
causal       0.90
logical      0.85
applied      0.65
conceptual   0.50
historical   0.35
```

數值是初始校準值，不是知識價值評分。

### 6.5 Layout diff

```json
{
  "from": "main-2.0.0",
  "to": "main-2.0.1",
  "added": ["new_node"],
  "removed": [],
  "moved": [
    { "id": "neighbor", "distance": 8.2, "normalized": 0.0014 }
  ],
  "hardAnchorViolations": [],
  "p95Movement": 0.001,
  "maxMovement": 0.004,
  "passed": true
}
```

任何 hard violation 或 movement budget 超標都使 build／explicit bake 失敗。

### 6.6 Layout debt report

Relation change 預設不移動永久座標，但 build 需產生只讀 debt report。它是本機／CI 診斷產物，不得複製到 `frontend/public` 或 `dist`：

```json
{
  "layoutVersion": "main-2.0.0",
  "relationBaselineFingerprint": "sha256:...",
  "currentRelationFingerprint": "sha256:...",
  "edgeSetChangeRatio": 0.04,
  "p95NormalizedEdgeLength": 0.08,
  "knnDensityP95Ratio": 1.04,
  "overlapCount": 0,
  "crossDomainBridgeDrift": 0.06,
  "recommendMigration": false,
  "reasons": []
}
```

初始提醒門檻（WP2 用基準資料校準）：

- edge set 自上次 major layout 後改變 ≥10%。
- node set 改變 ≥5%。
- p95 edge length 相對 baseline 惡化 ≥25%。
- 任一 domain 的有效 centroid 明顯離開其 anchor corridor。
- bridge nodes 的長邊／edge crossing 指標連續兩次超標。
- k-NN 局部密度 p95 相對 baseline 顯著惡化，或最小間距違反 `overlapCount > 0`。
- 同一區域 local solve 連續兩次超過 movement budget。

超標只令 `recommendMigration:true` 並在 verify 顯示警告；不得在普通 build 自動重排。若已影響可用性，由 Riku 核可 `layout:migrate` brief。

## 7. URL 狀態機

### 7.1 Main Galaxy precedence

由高到低：

1. `node`：聚焦 canonical node。
2. `depth`：只有與有效 `node` 同時存在才作為返回提示；否則忽略。
3. `constellation`：無 node 時聚焦 Wonder backbone。
4. `search`：無 node／constellation 時執行搜尋。
5. 無參數：Main overview。

無效 node／Wonder id：移除無效參數，顯示 calm notice，保留 Main overview。

### 7.2 Wonder precedence

1. `print=1`：列印紀錄，忽略互動 mode。
2. `w`：必須是有效 Wonder；缺失時顯示 cluster picker。
3. `mode=guided`：`s` 合法時到該站，否則顯示既有 guided intro／step 1。
4. 無 `mode` 且有 `s`：為舊深連結相容，視同 guided。
5. 無 `mode`、無 `node`：保留既有 `?w=<id>` 語意，顯示 guided intro；不得默默改成 explore。
6. `mode=explore`：顯示 cluster overview；若有有效 `node` 則聚焦該成員。
7. `node` 或 `fromDepth` 存在但無 mode：視同 explore focus；非成員則移除 node 並留 cluster overview。
8. `fromDepth`：只作短暫返回提示，不改 canonical focus。

### 7.3 History policy

- 跨頁與進入／離開 node focus：正常 navigation 或 `pushState`。
- guided step：沿用 `replaceState`，避免每一步塞滿 history。
- hover、pan、zoom：不寫 history。
- language：沿用既有 `localStorage['neblux-lang']`，不加入 URL 除非未來另立案。
- 不新增個人識別或跨裝置狀態。

## 8. 失敗與降級矩陣

| 失敗 | 必要行為 |
|---|---|
| Atlas index 無法載入 | 顯示 build-time DOM region list，可進 Main／Wonders |
| Atlas preview asset 缺失 | 使用 CSS／Canvas 基礎星雲 fallback；路由仍可點 |
| Main descriptions 缺失 | topology 可操作，卡片顯示精簡資料 |
| portal index 缺失 | 隱藏蟲洞出口；Main／Wonder 正常 |
| depth index 缺失 | 隱藏 Depth overlays／CTA；其他功能正常 |
| Wonder locale sidecar 缺失 | fallback English |
| Wonder core bundle 缺失 | 顯示 calm error＋返回 Atlas／Main，不載完整 graph 補救 |
| v2 layout 缺失／不合法 | build fail；production 不允許 runtime 全域 warm-up |
| API 全滅 | 所有上述靜態路徑照常 |
| View Transition 不支援 | 普通頁面跳轉 |

## 9. Build 順序

1. 讀取並驗證 canonical sources。
2. 產出 domain inventory；與 anchor config 對帳。
3. 驗證 celestial／Atlas／layout configs。
4. 讀取並驗證既有 locks；普通 build 不執行 solver。
5. 由 locked positions 產出 far／mid edge bundle geometry 與 nebula density geometry。
6. 產出 layout diff／layout debt reports。
7. 產出 main topology 與 description／section sidecars。
8. 產出 Wonder core＋locale bundles。
9. 產出 portal／Depth indices。
10. 產出 Atlas index、approved roads 與 previews。
11. 產出 static HTML、sitemap、share pages。
12. 執行完整 artifact integrity audit。

步驟 1–8 任一基礎產物失敗即 build fail。可選動態功能維持 progressive enhancement。

## 10. 變更爆炸半徑契約

| 變更 | 允許改變 | 禁止連帶改變 |
|---|---|---|
| 編輯 node 文案 | descriptions／static pages | layout、celestial、portals |
| 新增普通 node | main topology、該 node 局部 layout | Atlas positions、Wonder layouts |
| 新增 relation | edges、pathfinding、bundles | permanent positions（預設） |
| 更改 node domain | 需 migration review | 不得作普通 content edit |
| 新增 Wonder context node | 該 Wonder bundle／layout、portal index | 其他 Wonder layouts、Main positions |
| 調整 guided 文案 | 該 Wonder locale bundle | cluster layout |
| 發布 Depth | depth index、相關 node overlays | graph layout、Wonder membership |
| 修改 archetype token | renderer visuals | layout mass、positions |
| 新增 domain | major Atlas／Main migration | 不得走 normal bake |
| 變更 canonical node id | alias／redirect migration | 不得直接 rename |

補充：編輯 node label／description 時，包含該 node 的 Wonder locale sidecars 會重建；這是內容衍生變更，不得改 core layout／portal destinations。

刪除 canonical node 必須先通過 reverse-reference audit，清除 Wonder／Depth／portal／layout refs，再使用 explicit removal migration；普通 build 發現 orphan refs 一律 fail。
