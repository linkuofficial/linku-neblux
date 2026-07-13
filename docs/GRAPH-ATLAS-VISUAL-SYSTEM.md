# Graph Atlas Celestial Visual System

狀態：ACCEPTED / WP5 calibration pending
版本：v0.1
主計畫：`docs/GRAPH-ATLAS-PLAN.md`

> 本文件定義 Graph Atlas 的天體語意、尺度、LOD、疊加順序與視覺驗收。數值是 v2 原型起始區間，必須經瀏覽器實看與效能基準校準；契約重點是各維度解耦。

## 1. 四個獨立軸

### 1.1 Celestial archetype

回答：「它是哪一類知識角色？」

- `galactic_nucleus`
- `domain_core`
- `subfield_giant`
- `concept_star`
- `bridge_star`
- `beacon_star`
- `event_remnant`
- `local_protostar`

### 1.2 Visual magnitude

回答：「在目前 zoom 層級，它應多醒目？」

- `nucleus`
- `major`
- `bright`
- `standard`
- `faint`

### 1.3 Layout mass

回答：「build-time solver 應把它當成多強的空間 anchor？」

- `fixed_nucleus`
- `fixed_domain`
- `soft_subfield`
- `bridge`
- `standard`
- `local`

### 1.4 Interaction overlays

回答：「它目前可做什麼／處於什麼狀態？」

- `selected`
- `related`
- `guided_spine`
- `depth_lens`
- `portal_ring`
- `multi_portal`
- `filtered`
- `dimmed`

四軸不得互相推導。例如 `depth_lens` 不提高 magnitude；`major` 不提高 layout mass。

## 2. 世界尺度與螢幕尺度

### 2.1 World-space

用於：

- node positions
- domain nebula radius
- cluster boundary
- edge geometry
- Atlas region geometry
- camera framing

World-space 元素隨 zoom 放大縮小。

### 2.2 Screen-space

用於：

- star core 最小可見尺寸
- hit target
- label font
- Depth／portal rings 線寬
- focus outline
- keyboard focus indicator

Screen-space 元素在合理範圍保持穩定，避免遠景消失或近景爆大。

### 2.3 Hit target

- Pointer／touch 最小 44×44 CSS px。
- 視覺 body 可小於 hit target。
- 多個 hit targets 重疊時，依 selected／label priority／distance 排序，不靠 DOM 順序偶然決定。

## 3. Magnitude 起始區間

以下為 sprite 的 CSS px 起始範圍，不是 layout radius：

| Magnitude | Core | Glow | Halo | Corona | Label priority |
|---|---:|---:|---:|---:|---|
| nucleus | 7–10 | 24–36 | 48–72 | 90–140 | always in near／mid；far 顯示 domain label |
| major | 5–8 | 18–28 | 38–58 | 72–110 | high |
| bright | 3–5 | 12–20 | 26–42 | 50–80 | medium-high |
| standard | 1.8–3.2 | 7–13 | 15–28 | 30–55 | conditional |
| faint | 1.0–2.0 | 3–8 | 8–18 | 16–34 | focus／hover only |

規則：

- Degree 只可在 magnitude class 內微調，不跨 class。
- 視覺 class 變更需更新 celestial lock；普通 build 不自動升降級。
- Nucleus／major 的 corona 可在 far zoom 改用 world-space 背景 layer，避免固定像素遮蔽畫面。

## 4. Archetype 外觀

### 4.1 `galactic_nucleus`

用途：Mathematics、Physics top-level anchors。

構成：

- 中央可點擊亮核。
- 不透明度受控的暗中心／吸積環，不能把 node 做成完全不可見黑洞。
- 大尺度 lensing halo 屬 atmosphere layer，不跟 body sprite 綁死。
- 微弱雙向拉伸表達中央 bar，不做持續公轉動畫。

Mathematics：

- 冷白核心。
- 淡金幾何 caustic／結構光。
- MAT domain color 仍是主要識別，不新增獨立品牌色。

Physics：

- 白熱核心＋PHY 色吸積光。
- 外圈可有較明顯能量弧，但不使用高頻閃爍。

兩者：

- 視覺面積與 label hierarchy 同級。
- 共同繞一個不可見 barycenter，但 runtime 不模擬運動。
- 不以一方「吞噬」另一方的構圖表達關係。

### 4.2 `domain_core`

- 明亮巨星 body。
- 單一 domain 色 corona。
- 背景 nebula 與 node sprite 分離。
- 只對明列 top-level domain anchors 使用。

### 4.3 `subfield_giant`

- 比普通 concept 更大、更穩定。
- 可有一圈低 alpha halo，沒有 nucleus 的吸積／lensing 特徵。
- 例如 Quantum Mechanics、Computer Science；具體清單由 celestial lock 核可。

### 4.4 `concept_star`

- 沿用現有緊實主序星語言。
- domain[0] 決定主要顏色；多領域只在 corona 混色，不把 core 切成彩虹。

### 4.5 `bridge_star`

- 白色或低彩度核心。
- corona 由前 2–3 個 domains 柔和混合。
- 不使用多顆星 body，避免被誤讀為多個節點。
- 是否為 bridge 由 celestial lock 固定，不因一次 edge 變更自動切換。

### 4.6 `beacon_star`

用途：person。

- 緩和繞射尖芒或方向性 beacon。
- 動畫週期長、振幅低；reduced-motion 完全靜態。
- 不以 person fame 自動放大，重要人物需明確 magnitude override。

### 4.7 `event_remnant`

用途：event。

- 薄殼／殘跡環包覆小核心。
- 可在 focus 時短暫顯示 outward shock arc。
- 普通狀態不持續擴張，避免錯誤暗示事件仍在發生。

### 4.8 `local_protostar`

用途：Wonder-only local node。

- 柔和塵埃與未完全凝聚核心。
- 不使用 portal／Main destination。
- 卡片明示它是該旅程的敘事節點，不假裝 canonical graph concept。

## 5. Overlay 疊加順序

由後到前：

1. far-field stars
2. domain／cluster nebulae
3. Atlas roads／edge bundles／real edges
4. corona
5. star body
6. guided spine halo
7. Depth lens
8. portal ring
9. related／selected focus
10. labels／tooltips／keyboard focus

### 5.1 Ring geometry

- Depth lens：較內圈、單環、連續但低 alpha。
- Portal ring：較外圈、雙環或不閉合弧。
- Multi-portal：只增加少量方向刻痕；不顯示數字徽章。
- Selected：最外圈或提高整體亮度，不遮蓋其他 ring identity。

### 5.2 Overlay precedence

- `dimmed` 降低 body／edge，不得完全消除 keyboard focus。
- `selected` 可提高所有 relevant overlays 的可見度，但不改其形狀。
- `filtered` 節點若同時 selected，顯示 selected 並在卡片說明 filter 狀態。
- 未發布 Depth 永遠不產生 lens。

## 6. Zoom LOD 起始策略

實際 thresholds 由原型校準；以下先定語意，不鎖死數值。

### Far

- 顯示 domain cores、主要 subfields、nebula labels；Main node edges 一律不畫，Atlas approved roads 是另一層導航資料。
- 普通 concept bodies 只作密度星塵，不顯示 labels／real edges。
- Wonder overlay 顯示 constellation／region 名稱。

### Mid

- 顯示 bright／standard nodes。
- 顯示 top-K 主要 bridge edges；bundling 只在無 bundling 基準未達可讀性／效能 gate 時啟用。
- domain labels 淡出，node labels 依 priority 進場。

### Near

- 顯示完整局部 nodes、real edges、Depth／portal overlays。
- labels 依 collision 與 focus 顯示。
- detail card 成為主要操作面。

### Close／Focus

- 顯示一圈／兩圈關係。
- 顯示 relation label／direction。
- 非相關 scene 大幅淡出，但保留方位感。

## 7. Edge visual language

| Relation | Line family | Direction | Motion |
|---|---|---|---|
| `learning_prerequisite:true` | 清楚實線／細箭頭 | 必須可辨 | focus 時一次性 reveal |
| causal | 較強曲線 | 有向時顯示 | 短暫流向 |
| logical | 穩定細實線 | 依資料 | 通常無 |
| applied | 較長弧線 | 依資料 | focus 時可有一次性脈衝 |
| conceptual | 柔和細線 | 通常弱化 | 無 |
| historical | 細虛線／低 alpha | 依資料 | 無 |

若條件式 bundling 被啟用，聚合線不沿用所有單邊顏色；使用低彩度 domain bridge 色，選取後才拆解真實 relation。沒有該 flag 的 edge 不因 relation 文案看似先備而套用 prerequisite 視覺。

Far／mid bundle geometry 由 build-time locked positions 產生並版本化；runtime 只選擇、裁切與繪製。Focus 下的少量真實 edges 可由 runtime 直接計算曲線。

## 8. Nebula density

- Build-time 依 locked positions 產生 density samples／低解析 geometry。
- Renderer 只合成，不每幀重算 KDE／hull。
- Domain 交界允許混色，但最多同時合成 3 個主要 domain layers，避免灰泥。
- Nebula alpha 不得降低文字與 hit affordance 對比。
- Atlas preview 與 Main Galaxy 使用不同解析度產物，不共用巨型 raster。

## 9. Label system

Label priority 獨立於 magnitude：

1. selected／keyboard focus
2. active guided step
3. domain／region label
4. portal／Depth destination target
5. bright landmark
6. related node
7. ordinary node

規則：

- 不在每幀對所有 labels 做兩兩 collision；使用 spatial grid／quadtree。
- 同 priority 衝突時以 viewport 中心距離、node focus relevance、stable id tie-break 決定，避免閃爍。
- Label 顯示結果在 camera 靜止時必須穩定，不因微小浮點差異跳動。

## 10. Motion policy

- Atmosphere 可有低速 parallax。
- Star twinkle 振幅小、週期錯開。
- Nuclei 不公轉、不吸入 nodes。
- Wormhole transition 只在使用者觸發 navigation 後播放一次。
- Guided path 可有單次光流，不持續跑。
- `resting`＝無輸入且無 one-shot 動畫滿 5 秒後整幀凍結，包含暫停 twinkle；任一互動立即喚醒。resting redraw count 為 0。
- `prefers-reduced-motion`：關閉 twinkle、flow、lensing animation、View Transition；保留靜態光環與狀態。
- 禁止閃爍頻率可能造成不適的效果。

## 11. 視覺驗收矩陣

每個 renderer milestone 至少保留：

- Atlas desktop／mobile。
- Main far／mid／near／focus。
- Mathematics／Physics 雙核心近景與遠景。
- 其他 domain core 對照。
- concept／bridge／person／event／local 五類對照。
- Depth only、portal only、Depth＋portal、selected＋Depth＋portal。
- Light／Quantum shared-node wormhole。
- reduced-motion 全矩陣。
- 高 DPI 與 DPR 1。

驗收方式：

- pixel probes 守門關鍵可見層。
- visual token snapshot 防止非預期漂移。
- 瀏覽器實看判斷構圖、層級與可讀性。
- 不以單一 baseline screenshot 自動裁決所有設計變更。

## 12. 調整爆炸半徑

| 調整 | 應修改 | 不應修改 |
|---|---|---|
| 改核心水平亮度 | visual tokens／sprite | layout locks |
| 改 Depth ring | overlay tokens | Depth manifest／positions |
| 改某 node magnitude | celestial lock | graph relations |
| 改 domain nebula alpha | atmosphere tokens | domain membership |
| 改 Mathematics／Physics 相對位置 | major layout migration | 普通 visual patch |
| 改 Wonder preview 尺度 | atlas layout config | Wonder node layout |
| 改 relation 線型 | edge visual policy | relation data |
