# Explorer 版面優化藍圖（layout de-collision + 響應式補完）

> 目標：把 explorer.html 的浮層 chrome 從「各自堆疊、搶同一錨點」收斂成
> 一套**角落分區 + 一致邊距 + 垂直堆疊**的版面系統，消除所有重疊與溢出，
> 並讓手機/平板真正可用。**只縱深優化現有體驗，不新增功能（不橫向擴張）。**

## 0. 鐵則與方法論

1. **版面階段（A–C）：app.html 零波及。** 版面去碰撞只進 explorer 專屬檔
   （`src/styles/explorer/*.css`、`src/explorer-main.js`）。需覆寫共用預設時，在對應
   `explorer/*.css` 加同名規則——`explorer.css` 的 `@import` 把 `explorer/*` 排在
   `components/*` 之後，同特異度即勝出，且只作用於 explorer。
   **按鈕系統階段（D）：刻意統一兩頁。** 依已鎖定決策，階段 D **直接編輯共用
   `components/*.css`**（filter-bar/language-toggle/panel/connections/breadcrumb/badge/search），
   app.html 會一起套用新按鈕語言——這是預期行為。安全網：階段 D 驗收**同時截 app + explorer 兩頁**。
2. **驗證一律走 production preview。** Vite dev server 把各 `@import` 當獨立 `<style>`
   注入，順序與正式 bundle 不同（已證實 dev 誤報手機搜尋框溢出，但正式 build 正常）。
   驗證指令：`npm run build` → `npm run preview`（launch.json 已加 `nodus-preview`，port 4173）。
3. **量測即驗收。** 用下方 §5 的 rect-audit 腳本在 1280 / 768 / 375 三斷點斷言
   `overlaps:[]` 與 `offscreen:[]`；視覺則用 production preview 截圖核對。
   ⚠️ 截圖**只在 production preview 可靠**：Vite **dev** server（port 3000）的 canvas
   常在 headless「viewport 初始 0×0」時差中被初始化（`drawImage ... width/height of 0`），
   render loop 卡死、擷取逾時。production preview 先 resize 再截圖即正常。
4. **改動深度**：允許輕量 DOM 調整（分組、移動節點），不重寫結構。

## 1. 現況問題清單（production 實測，已排除 dev 假象）

| 代號 | 斷點 | 碰撞/問題 | 重疊量 | 根因 |
|------|------|-----------|--------|------|
| D1 | 桌機 | `stats` ↔ `lang-toggle` | 132×33 | 兩者皆 `top:20;right:20` 同錨點 |
| D2 | 桌機 | `filter-bar` ↔ `controls` | 30×30 | 置中 filter 列換第二行時左緣(x320)碰左上 controls(x350) |
| D3 | 桌機 | `zoom-indicator` ↔ `recommend` | 潛在 | 兩者皆 `bottom:20;right:20`，同時顯示時重疊 |
| D4 | 桌機 | `breadcrumb`(max 80vw) ↔ `legend`/`recommend` | 潛在 | 深層麵包屑過寬時觸碰左下/右下 |
| M1 | 手機 | `lang-toggle` ↔ `search-box` | 132×44 | hdr 隱藏後搜尋框滿寬，語言鈕壓在其右端 |
| M2 | 手機 | `stats` ↔ `filter-bar` | 209×29 | stats(top:66) 整條壓在 filter 列(top:70) 上 |
| M3 | 手機 | `controls` ↔ `breadcrumb` | 135×31 | 兩者皆貼底；controls 滿寬底列、breadcrumb 置中底部 |
| T1 | 手機 | 觸控目標過小 | — | `.ctrl-btn` 實高 ~30px、`.sr`/`.bc-item` 偏小，未達 44px |
| X1 | 全部 | `#welcome` 疑似殘留 | — | ✅ 已查證**非 bug**：正常 startExploration 流程確實加 `.hidden`（opacity 0）；先前是 dev 假象 |

> 平板 768 與手機同屬 `max-width:768px` 規則，行為與手機一致。
>
> **執行進度（全部完成）**：階段 A（桌機 D1–D4）、B（手機 M1–M3 + T1）、C（X1 查證非 bug）、
> **D（按鈕系統 B+C，統一 app+explorer）皆已實作並驗證**：
> - tokens + inline SVG 圖標 + JS `.btn-label` 重構（i18n/focus 不再覆寫圖標）。
> - 控制列/filter/語言/panel 動作 → B 分段；連線/show-all/close/麵包屑/tags/搜尋 → C ghost/瘦身。
> - 驗證：E2E **13/13**；explorer `overlaps:[]`；computed-style 全配方到位；
>   **production preview 截圖**桌機+手機 explorer + app 三者皆正常（控制列 82px→33px）。
> - **階段 E — 主頁 landing（第 3 介面）**：landing 用 Tailwind + `landing/*.css`，原本沒被碰到。
>   已套同語言：`.pill-btn` 999px 胖膠囊 → radius-md slim soft-rect + hairline + 色點；
>   `#ctaExplore` 胖金膠囊 → slim（radius-md、JetBrains、padding 收）；
>   `.footer-nav`（Graph|Explorer）999px → **B 分段 rail**（rail-bg + divider）。token 共用同一組。
>   驗證：computed-style + 截圖桌機+手機皆正常。
> - 三介面（index / app / explorer）按鈕語言現已一致。待你最終視覺核可 → merge。

## 2. 目標版面（錨點地圖）

### 桌機 ≥769px（邊距 20px）

```
┌───────────────────────────────────────────────────────┐
│ [hdr]            [search-box]              [lang-toggle]│
│ [controls]       [filter-bar]              [stats]      │  ← stats 下移到 lang 之下
│                                                         │
│                       (canvas)                          │
│                                                         │
│ [legend]         [breadcrumb]        [recommend]        │
│                                      [zoom] (其上/錯位) │  ← zoom 不與 recommend 同點
└───────────────────────────────────────────────────────┘
```

### 手機/平板 ≤768px（邊距 12px，hdr 隱藏）

```
┌──────────────────────────────┐
│ [search-box(縮)]   [lang]     │  ← 同列不重疊
│ [filter-bar 滿寬橫向捲]        │  ← stats 手機隱藏
│                              │
│          (canvas)            │
│                              │
│ [breadcrumb] (controls 之上)  │
│ [controls 滿寬橫向捲]          │
└──────────────────────────────┘
```

## 3. 逐項改法（含目標值與檔案）

### 階段 A — 桌機去碰撞（純 CSS，explorer-only）

- **D1** `explorer/stats.css`：`top: 20px` → `top: 74px`（落在 lang-toggle 底緣 64 之下，留 10px）。
- **D2** `explorer/filter-bar.css`：新增桌機覆寫，filter 列改**單行橫向捲動**（與手機一致），
  高度固定 ~52px → 底緣 ~126 < controls 頂端 138，徹底消除重疊：
  ```css
  #filter-bar { flex-wrap: nowrap; overflow-x: auto; max-width: min(640px, 70vw); }
  #filter-bar::-webkit-scrollbar { display: none; }
  ```
  （**已定：採單行捲動**。chips 從換行改為可捲動，與手機行為一致。）
- **D3** `explorer/zoom-indicator.css`：移開 recommend 錨點。建議 `right: 20px; bottom: 20px`
  → `right: 272px`（讓開 240 寬的 recommend + gap），或改 `bottom` 疊在 recommend 之上。
- **D4** `explorer/breadcrumb.css`：`max-width: 80vw` → `max-width: min(60vw, 560px)`，
  維持 `overflow-x:auto`，避免深層路徑橫跨整個底部。

### 階段 B — 手機/平板（純 CSS，集中在 `explorer/responsive.css`）

- **M1**：`#search-input,#search-results { width: calc(100vw - 24px); }`
  → `width: calc(100vw - 24px - 140px);`（讓出右上角給 lang-toggle）。lang-toggle 維持 `top:12;right:12`。
- **M2**（**已定：手機隱藏**）：`#stats` 於 `max-width:768px` 改 `display: none;`，
  比照 hdr/legend/recommend/zoom 的手機減負策略。
- **M3**：`#breadcrumb` 於手機改 `bottom: 64px`（疊在滿寬 controls 底列之上；controls 實高 ~43 + 邊距）。
- **T1**：`.ctrl-btn` 加 `min-height: 44px`（手機；或全域）；`.sr` 列、`.bc-item` 比照確保 ≥44px 命中區。

### 階段 C — 跨切面（允許輕量 JS/DOM）

- **X1**：核對 `explorer-main.js` 正常流程（搜尋→選取→startExploration）是否確實對 `#welcome`
  加 `.hidden`；若否補上。先前 hook 驅動路徑顯示 welcome 殘留，需在正常互動流程確認。
- 重新驗證 `body.top-ui-collapsed` 收合動畫與新錨點不衝突（頂部元件位移後仍正確淡出/復原）。
- 確認 panel 開啟（桌機右側抽屜 / 手機底部 sheet）與 stats、controls 新位置不打架。

## 4. 階段化交付

1. **階段 A**（桌機）→ §5 量測 1280 斷點 `overlaps:[]`/`offscreen:[]` → 你視覺核可。
2. **階段 B**（手機/平板）→ §5 量測 768 + 375 → 你視覺核可。
3. **階段 C**（跨切面）→ 三斷點回歸 + E2E `npm run test:e2e`。
4. 全綠 + 你核可 → merge `fix/explorer-ui` 回 master + push（master 自動部署）。

## 5. 驗收腳本（production preview，三斷點各跑一次）

選一節點展開後，於 console / preview_eval 執行；驗收標準：`overlaps` 與 `offscreen` 皆為空陣列。

```js
(() => {
  const ids = ['hdr','lang-toggle','stats','search-box','filter-bar','controls',
               'breadcrumb','recommend','zoom-indicator','legend','panel'];
  const W=innerWidth,H=innerHeight;
  const vis = ids.map(id=>{const e=document.getElementById(id);if(!e)return null;
    const cs=getComputedStyle(e),r=e.getBoundingClientRect();
    return (cs.display!=='none'&&cs.visibility!=='hidden'&&+cs.opacity>0.05&&r.width>0&&r.height>0)
      ? {id,r:{x:r.x,y:r.y,right:r.right,bottom:r.bottom}} : null;}).filter(Boolean);
  const ov=[];
  for(let i=0;i<vis.length;i++)for(let j=i+1;j<vis.length;j++){
    const a=vis[i].r,b=vis[j].r;
    const ix=Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x));
    const iy=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
    if(ix>2&&iy>2)ov.push(`${vis[i].id}×${vis[j].id} ${Math.round(ix)}x${Math.round(iy)}`);}
  const off=vis.filter(e=>e.r.right>W+2||e.r.x<-2||e.r.bottom>H+2||e.r.y<-2).map(e=>e.id);
  return { overlaps: ov, offscreen: off };
})()
```

## 5b. 階段 D — 按鈕系統重構（B+C 依功能分配，統一 app + explorer）

> 背景：按鈕從未遷移到專案現行 token（Oxanium/Sora/**JetBrains Mono** + radius token +
> 金色 accent），仍是最初的「999px 膠囊 + 每顆獨立邊框/毛玻璃/陰影 + IBM Plex Mono」→ 厚重。
> 方向：**B（分段容器）給工具組、C（幽靈）給單一/次要/導覽**，依功能分配。**兩頁統一**。

### 兩個可複用配方（reusable recipes）

**Recipe B — segmented rail**（一組地位平等、作用於同對象的動作）
- 容器：`display:inline-flex; background:var(--rail-bg); border:.5px solid var(--rail-border);
  border-radius:11px; backdrop-filter:blur(12px); overflow:hidden`（**只此一層 blur**，非每顆）。
- 內部按鈕：`background:transparent; border:0; padding:8px 13px; font:11px var(--font-label);
  color:var(--ink-soft); gap:6px`。相鄰按鈕 `border-left:.5px solid var(--rail-divider)`。
- hover：`background:var(--seg-hover); color` 微亮。active：`color:var(--accent);
  background:var(--seg-active)`。

**Recipe C — ghost**（單一/次要/低頻/導覽）
- `background:transparent; border:0; font:11px var(--font-label); color:var(--ink-soft)`。
- hover：色彩微亮（+ 可選極淡 bg）。active/current：`color:var(--accent)`（+ 導覽類加 2px 金底線）。

### 新增語意 token（`public/nodus-theme.css`，暗/淺各一組）

```css
/* 暗色 chrome（控制列 / filter rail / 語言 / 搜尋框） */
--rail-bg:        rgba(12, 14, 22, 0.55);
--rail-border:    rgba(255, 255, 255, 0.09);
--rail-divider:   rgba(255, 255, 255, 0.06);
--seg-hover:      rgba(255, 255, 255, 0.05);
--seg-active:     rgba(240, 192, 80, 0.12);   /* accent @12% */
/* 淺色 panel（動作 / 連線 / tags） */
--rail-bg-light:      rgba(148, 163, 184, 0.08);
--rail-border-light:  rgba(148, 163, 184, 0.22);
--rail-divider-light: rgba(148, 163, 184, 0.22);
--seg-hover-light:    rgba(148, 163, 184, 0.14);
--seg-active-light:   rgba(240, 192, 80, 0.16);
```
active 文字一律用 `--accent`（#f0c050）。按鈕/搜尋框字體一律 `--font-label`（JetBrains Mono，
已自託管載入，**不新增依賴**）。集中定義，兩頁兩配方共用 → 日後只調 token 即可全域微調。

### ✅ 已鎖定的結構/視覺決策
1. **Help / Guide → 留在 6 鍵 B rail 內**（不動 DOM）。控制列就是一條 6 段 rail：
   Reset · Fit · Undo · Focus · Help · Guide。
2. **圖標 → 換 inline SVG 圖標組**（stroke=currentColor，~16px，stroke-width 1.6，無運行依賴）。
   inherit 按鈕文字色 → ghost 預設淡、active 自動轉金。

### 圖標對應（inline SVG，line 風格，取自 Lucide/Feather path）
| 鍵 | 現字符 | SVG（語意） |
|----|--------|-------------|
| Reset | ↺ | rotate-ccw（環形箭頭） |
| Fit | ⊡ | maximize / frame（四角外擴） |
| Undo | ↶ | corner-up-left |
| Focus | ◎ | target（同心圓+心點） |
| Help | ⌘ | help-circle |
| Guide | ? | compass（導覽） |
| Expand（panel） | ⊕ | circle-plus |
| Collapse（panel） | ⊖ | circle-minus |
| Path（panel） | ⤳ | git-branch / route |
| Close | ✕ | x |

### JS 重構（因圖標內嵌 HTML，i18n 不可再覆寫整顆 innerHTML）
- explorer.html：每顆控制/動作鈕結構改為 `<button><svg class="btn-ico">…</svg><span class="btn-label"></span></button>`。
- explorer-main.js 694–698：`btn.innerHTML = ⟨字符⟩ ${t()}` → `btn.querySelector('.btn-label').textContent = t()`（保留 SVG）。
- `btn-focus` 焦點循環處：同樣只更新 `.btn-label`；並依模式 toggle `.active`（off=預設、1/2-Hop=金）。

### 階段 D 實作順序（turnkey）
- **D1** `nodus-theme.css` 加上述 token。
- **D2** explorer.html 內嵌 SVG + `.btn-label` span；重構 JS 三處（694–698、focus 循環、其餘 innerHTML 設定點）。
- **D3 Recipe B**：`#controls`+`.ctrl-btn`(explorer)、`#filter-bar`+`.filter-btn`(components)、
  `#p-actions`+`.p-act-btn`、`#lang-toggle`+`.lang-btn`(components) 改 rail。
- **D4 Recipe C**：`.ci`、`.rec-item`、`.p-conn-toggle`、`#close`、`.bc-item`、`.sr` 改 ghost。
- **D5**：`.tag` 變細；`#search-input` 換 `--font-label` + hairline + 去重陰影。
- **D6**：`max-width:768px` 對 B/C 互動類補 `min-height:44px` 命中區。
- **D7 驗收**：build → 截 app + explorer 三斷點 → §5 rect `overlaps:[]` → E2E 13/13 → 你視覺核可。

### 功能 → 處理 對應表

| 元件 | 功能角色 | 處理 | CSS 檔（範圍） |
|------|----------|------|----------------|
| 控制列 Reset/Fit/Undo/Focus/Help/Guide | 對圖的工具組（6 段同 rail） | **B rail**（已鎖定：6 鍵同列） | explorer/controls.css（explorer-only，app 無 #controls） |
| Filter chips | 類別切換組 | **B rail** + 領域色點 | components/filter-bar.css（**兩頁**） |
| Panel 動作 Expand/Collapse/Path | 對選取節點的動作組 | **B rail**（淺色） | explorer/panel-actions.css / components（**兩頁**） |
| 語言 EN/中/日 | 小型平等組 | **B 迷你 rail** | components/language-toggle.css（**兩頁**） |
| 連線項 .ci / 推薦項 .rec-item | 可點列表列 | **C ghost 列**（hover 浮現） | components/connections.css（兩頁）/ explorer/recommendation.css |
| Show all 切換 / Close ✕ | 單一次要 / 工具 | **C ghost** | components/connections.css / panel.css（**兩頁**） |
| 麵包屑 .bc-item | 導覽路徑 | **C ghost**（current = 金底線） | components/breadcrumb.css（**兩頁**） |
| Onboard Skip/Next、shortcuts Close | 對話框決策 | 主 = 金 accent / 次 = ghost | explorer/onboarding.css / shortcuts.css |
| 搜尋框 input | 輸入欄（非按鈕） | 換 `--font-label` + hairline，瘦身 | components/search.css（**兩頁**） |
| Tags .tag | 靜態標籤（非互動） | 變細 | components/badge.css（**兩頁**） |

### 觸控目標
B/C 桌機視覺高度 ~30–32px；行動裝置（`max-width:768px`）對互動類加 `min-height:44px`
或等效命中區 padding。視覺瘦、命中區夠。

### 驗收（階段 D）
- production preview 截圖 **app.html 與 explorer.html 兩頁** 各斷點，確認按鈕一致、無破版。
- §5 rect 量測仍 `overlaps:[]`（瘦身後高度變化不可重新引入碰撞，尤其控制列/filter rail）。
- E2E 13/13；按鈕仍可點（hit-test 不因 ghost 透明而失效）。

## 6. 風險與回滾

- **階段 A–C**（已完成）：限 explorer-only 檔，app.html 不受影響。
- **階段 D**（待執行）：刻意改共用 `components/*.css` → **app.html 一起變**（已同意統一）。
  風險面較大,故驗收**雙頁截圖**;若 app 出現非預期回歸,以 token / 同名 explorer 覆寫隔離。
- **分支策略（已鎖定）**：全部留在 `fix/explorer-ui` 單一分支（P0/P1 + 版面 A–C + 按鈕系統 D），
  最後一次性驗收 + 一個 PR merge。回滾粒度較粗,故每個子階段 build+截圖確認後再進下一步。
- UX 取捨皆已鎖定：D2=單行捲動、M2=手機隱藏、Help/Guide=留 rail、圖標=inline SVG。
- 視覺核對用 production preview 截圖（dev server 截圖會逾時，見 §0.2-3）。
