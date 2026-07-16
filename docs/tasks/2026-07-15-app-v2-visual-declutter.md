# TASK: app-v2-visual-declutter
狀態: done

## 目標

降低 Main Galaxy v2 在 overview、自由探索、節點 focus 與 Wonder 導覽時的視覺噪音，建立清楚的資訊層級。核心手段是互動感知的關係線 LOD、共用且自適應的標籤配置、Wonder 漸進顯示，以及收斂 Learning Path 與焦點動畫。

本任務不以「全部降透明度」或「縮小全部文字」掩蓋問題；必須讓使用者一眼辨識目前畫面的主角與下一個可操作入口。

## 驗收條件

- [x] overview 不畫 canonical relation edges；Domain cores、可用的 Wonder entrances 與主要空間結構仍可辨識。
- [x] 未選取節點的 explore 畫面只保留依 viewport、zoom、edge priority 與畫面佔用量自適應挑選的結構橋，不再展開視窗內全部 adjacency。
- [x] 任何 zoom 下，只要存在 focused node，就改用 local-focus edge plan：一跳為主、少量二跳退後，其餘 topology 不競爭焦點。
- [x] node、Wonder 與 UI safe areas 共用同一套 label collision/layout；標籤零重疊且不侵入 header、search、controls、status 或 detail panel。
- [x] 標籤不設數量硬上限：依 viewport、zoom、實際文字盒、局部密度、上下文優先序與可用空間決定；有空間時不得任意少顯示。
- [x] 標籤優先序至少遵守：selected/keyboard/hovered → active Wonder stations → Domain cores → direct related → high/critical contextual nodes → ambient nodes。
- [x] 小幅 pan/zoom 不造成標籤頻繁閃現；配置具有 deterministic hysteresis 或等效穩定策略，reduced-motion 下不得依賴動畫維持可讀性。
- [x] overview 靜止時不再同時畫出所有 Wonder full spines；hover 只揭露一趟，active/click 才完整突出該趟，其他 Wonder 退後但入口仍可找到。
- [x] Learning Path 預設為安靜狀態：沒有 root/current chain 時不產生全圖 available rings；功能仍限 internal route，語意方向問題不在本任務猜測修復。
- [x] 保留 selected corona/focus pulse；focus photons 僅用於最重要的少量邊，不形成另一層閃爍噪音。
- [x] LOD 轉換不出現整批線條或標籤硬切；使用短 cross-fade 或等效漸進策略，且不降低互動命中穩定性。
- [x] `npm run verify` 全綠，並完成 desktop overview、dense explore、node focus、Wonder hover/active、Learning Path off/on、mobile、三語與 reduced-motion 的瀏覽器實看。

## 視覺狀態定義

### 1. Overview

- canonical relations：不畫。
- nodes：保留 nuclei、Domain cores、重要空間錨點；其餘星體可存在但不得取得同級標籤權重。
- Wonders：顯示入口 marker；名稱由共用 label allocator 按空間放置。完整 spine 不常駐。
- atmosphere：維持低頻率背景，不增加粒子數或霧量來補償資訊減法。

### 2. Explore（無 selection）

- 依螢幕空間與 build-time priority 挑選少量結構橋；禁止 near mode 蒐集 viewport 內全部 adjacency。
- 標籤按實際可用空間漸進揭露。普通節點不得與 Domain／Wonder 同亮度、同字重競爭。
- hover 可臨時提升單一節點與直接鄰接，但不可讓整張圖重新展開。

### 3. Node Focus

- focused node 在任何 zoom 都取得 local-focus plan，不綁定 `zoom >= nearZoom`。
- 一跳 edge/label 為主；二跳只保留結構脈絡並顯著退後。
- selected corona 與慢速 focus pulse 保留；photon 依 edge priority 與當下密度自適應收斂。
- unrelated labels 隱藏或大幅退後，detail panel 開啟後重新計算 safe viewport。

### 4. Wonder Hover / Active

- rest：入口 marker＋能安全放置的名稱。
- hover：揭露單一 Wonder spine 與其 stations；使用短、安靜的淡入。
- active：該 Wonder 成為主角；其他 Wonder 保留方位感但降低對比。
- Wonder name、station label 與普通 node label 必須在同一碰撞空間裁決。

### 5. Learning Path

- 預設 off；若舊 localStorage 曾開啟，需有版本化 migration 或等效方式避免舊狀態令新畫面一開始就充滿標記。
- on 但尚未有明確 root/current chain：只呈現操作提示，不畫全圖 available rings。
- 有路徑時只畫 current chain 與有限前線；不在本任務重新推論 prerequisite direction。

## 修改工作包

### WP-A — LOD 與 edge plan（子代理 1，可平行）

所有權：

- `frontend/src/engine-v2/lod-policy.js`
- 新增或更新只針對 LOD/edge selection 的 renderer-v2 unit tests

內容：

1. 將 zoom band 與 semantic interaction state 分開：overview / explore / focused / Wonder active。
2. focus 優先於純 zoom mode，任何 zoom 都回傳 local edge plan。
3. explore edge budget 依 viewport 面積、總線段螢幕長度、priority 與局部密度調整；不可恢復全量 adjacency。
4. 選邊必須 deterministic，pan/zoom 微動不能造成大幅洗牌。
5. 只修改 draw plan 與測試，不碰 `renderer.js`、`label-layout.js`、app state 或 CSS。

交付給 Terra：draw-plan API、排序／密度規則、unit test 結果，以及 renderer integration 所需欄位。

### WP-B — 自適應標籤配置（子代理 2，可平行）

所有權：

- `frontend/src/engine-v2/label-layout.js`
- 新增或更新只針對 labels 的 deterministic unit tests

內容：

1. 設計單一 candidate contract，能接收 node labels、Wonder labels、priority、context state 與 reserved UI rectangles。
2. 不設標籤數量硬上限；以文字盒、padding、zoom、viewport、局部密度與可用空間決定接受集合。
3. 建立 context priority 與 stable tie-break；selected/hovered/active labels 不可被 ambient label 擠掉。
4. 加入 hysteresis：已接受標籤在小幅相機變動時具有合理保留權，但不得因此產生重疊。
5. 測試零重疊、safe rect、空間增加會自然容納更多標籤、相同輸入 deterministic，以及小幅 pan/zoom 的穩定性。
6. 只修改純 layout 與測試，不碰 `renderer.js`、tokens、app state 或 CSS。

交付給 Terra：layout API、candidate schema、狀態保存需求與 unit test 結果。

### WP-C — app interaction state（子代理 3，可平行）

所有權：

- `frontend/src/app-v2-main.js`
- `tests/e2e/app-v2.spec.ts` 中只與 Wonder hover、Learning Path 初始狀態、panel safe viewport 有關的案例

內容：

1. 增加 `hoveredConstellationId`／active Wonder presentation state，讓 renderer 能區分 rest、hover、active。
2. pointer 移動時維持 node hit test 優先，再判斷 Wonder entrance；清楚定義離開與 click 行為。
3. Learning Path 初始安靜化及 storage version migration；不改 prerequisite 推論函式。
4. 將目前 UI safe rectangles 或可推導資訊提供給 renderer integration；不得硬編單一桌機尺寸。
5. 不碰 `renderer.js`、`lod-policy.js`、`label-layout.js`、tokens 或 canonical data。

交付給 Terra：app presentation payload、hover/click 行為、E2E 結果與任何 renderer contract 需求。

### WP-D — Terra 統一整合與視覺裁決（前三包完成後）

所有權：

- `frontend/src/engine-v2/renderer.js`
- `frontend/src/engine-v2/tokens.js`
- 必要的 `frontend/src/styles/pages/app-v2.css`
- renderer integration／visual tests

內容：

1. 合併 WP-A draw plan、WP-B unified label allocator、WP-C interaction payload。
2. node 與 Wonder labels 改成同一批 candidates、同一次 collision pass；UI safe regions 一併參與。
3. Wonder rest 只畫 entrance marker；hover/active 才畫 spine，其他 Wonders 依狀態退後。
4. 建立 typography hierarchy：Domain、Wonder、focused/related、ambient concept 使用不同 size/weight/alpha，但不得犧牲可讀性。
5. 保留 focus pulse；依 priority/密度收斂 photons。加入短 LOD cross-fade 與 reduced-motion 靜態替代。
6. 更新 stats/debug hooks，讓 E2E 能驗證目前 semantic mode、painted edge 類型、accepted label 類型與 active Wonder，不以脆弱像素數代替結構斷言。

### WP-E — QA 子代理（整合後，唯讀審查優先）

所有權：測試與報告；未經 Terra 指派不得改 production files。

內容：

1. 先跑 targeted renderer/unit/E2E，再跑 `npm run verify`。
2. 以既定 viewport 實看 overview、dense explore、focus/card、Wonder hover/active、LP off/on、mobile、三語與 reduced-motion。
3. 逐張比較：主角是否唯一、標籤是否重疊、縮放是否閃動、Wonder 是否仍可發現、focus pulse 是否有價值但不搶戲。
4. 只回報違反驗收條件的問題，不自行重設計。

## Terra 調度順序

1. Terra 先凍結基準截圖與目前 stats，並告知三個子代理各自檔案所有權。
2. 第一波同時啟動 WP-A、WP-B、WP-C；任何跨所有權需求只回報 Terra，不直接改別人的檔案。
3. Terra 收齊三包後執行 WP-D；`renderer.js` 只由 Terra 在此階段修改，避免合併衝突。
4. 完成 targeted tests 後再啟動 WP-E QA。
5. Terra 依 QA 報告最多進行一輪收斂修正，再跑完整驗證與瀏覽器實看。

## 邊界（不要動的東西）

- 不動 production `frontend/app.html`、legacy `frontend/src/engine/`、canonical data schema、layout locks、runtime force、API 或部署設定。
- 不修改 Learning Path prerequisite 語意、不新增推測資料、不把 internal `/app-v2.html` 切成 production。
- 不恢復全域 relation 彩線、pending edges、全量 adjacency、全畫面持續閃爍或所有 Wonder spines 常駐。
- 不用 canonical layout migration 解決本輪視覺密度；若資訊減法完成後仍因節點位置造成嚴重問題，另開 brief 評估。
- 不以固定標籤數量作為實作或驗收條件。

## Questions（Codex 填）

- Wonder rest 狀態不保證 19 個名稱同時常駐，但每個 entrance 必須透過 marker、hover/hit target、搜尋或現有導覽機制可被找到；不得為了顯示全部名稱而允許重疊。
- Edge selection 可以有安全上界，但應以 viewport 與 screen-space density 推導，而不是把單一桌機截圖調到剛好。
- Learning Path 語意方向仍互相矛盾；本任務只處理初始安靜化與視覺範圍，不宣稱修復知識語意。

## HANDOFF（Codex 完成或卡住後填）

- Branch:
- Summary: v2 隔離層完成互動感知 LOD（overview 無 canonical relation edges、Explore 螢幕密度預算、focus local plan）、單一 node/Wonder/UI-safe-area label allocator、Wonder rest marker/hover-or-active spine、Learning Path 初始安靜化與 legacy localStorage migration，以及 focus photon／短 Explore edge cross-fade。未觸及 production app、legacy engine、canonical data、layout 或 deployment。
- Verification: `npm run verify` 全綠（renderer-v2 32/32、一般 E2E 111/111、Canvas visual 1/1、depth-build 4/4、Atlas 54/54）；`git diff --check` 通過。新版 Vite 已實看 desktop overview 與 Mathematics focus/card；mobile、三語、reduced-motion、Wonder 與 Learning Path 狀態由 E2E 覆蓋。
- Remaining risks: Learning Path prerequisite direction 仍有資料語意矛盾，故本次只做初始安靜化與 local-only 呈現；不應視為正式的知識先修聲明。視覺優化未修改 canonical layout，若未來資料量顯著增加，需另開 layout migration brief。
