# TASK: depth-layer-plan（Neblux 深度層擴建 v0.2 — M-1/M0 修案）
狀態: done
建立: 2026-07-08 ｜ 秘書層: Claude(Opus 4.8) ｜ 實作層: 未定（討論後才決定是否動工）
Repo: Neblux
Base: working-tree（計畫包 `neblux-depth/`，尚未 commit）
Required verification: `node neblux-depth/validate-depth.mjs`、`npm run verify`
風險等級: 決策（模式⑤紅隊）— 新子系統＋新資料源，動工前先讓 Codex 攻擊

## 目標

在動任何一行程式碼**之前**，把 `neblux-depth/` 這份「深度層擴建計畫 v0.1」的致命假設、更便宜替代案、失敗模式攤出來。這不是實作任務，是**提案紅隊**：Riku 要在投入 M0 前，先聽跨家族模型的攻擊。

計畫本體＝互動概念頁生產線：建一份 `nodes.json` 註冊表當單一資料源，讓圖譜／實驗室索引／驚奇之旅成為同一份資料的三種視圖，並以三頁（弦波 / 傅立葉級數 / s 平面）驗證管線可規模化。M0→M5 里程碑，每站閘門停下驗收。全文見 `neblux-depth/PLAN.md`、`neblux-depth/CONCEPT_SPEC.md`。

## 脈絡（Codex 需要知道，但計畫本體沒明講的既有現況）

- **Neblux 是次要資產**：AGENTS.md 與全域規則定調「做好、維護，**不擴張**」。方向北極星 `docs/DIRECTION.md`：Wonders 是產品、圖譜是空間；架構憲法＝靜態為骨動態為光、匿名聚合、個人永久免費、**安靜的驚奇（不遊戲化）**。
- **既有資料源已存在**：Neblux 線上站已有 `data/all_nodes.json`（知識節點，源頭含描述）＋ `data/i18n/*.json`。圖譜是 **Canvas 渲染**（`app.html`/`explorer.html` 共用 `src/engine/`），build 時預烘焙座標。計畫要新建的 `nodes.json` 與這份既有資料**平行**。
- **既有 CSP 紀律**：`frontend/public/_headers` 收緊過 CSP、去 `'unsafe-inline'`，AGENTS.md 白紙黑字：「**inline script 會被 CSP 擋，一律外置**」。計畫的概念頁規格卻要求 **inline CSS/JS 零依賴單檔**（承襲 rps.linku.tech）。
- **禁區**：`frontend/src/engine/`、`data/*.json` 結構變更、部署設定（`_headers`、`functions/`、Cloudflare Pages）＝強制交叉審查路徑。計畫 M0–M2 刻意只碰新檔案避開禁區；M3 才碰圖譜、明訂「先盤點未核准不改碼」。
- **Riku 現況約束**：無預算、單人、程式初級（主要靠 AI 生成）；核心使命是大學的**邊緣運算＋電機控制**專題，Neblux 只是次要現金／學習實驗。全域規則：核心軌道 AI 僅輔助、須理解每行；次要資產（含 Neblux）可由 AI 完整生成。

## 我的思路（實作方對計畫的判讀）

- 計畫寫得**克制、自我約束強**：里程碑閘門、拒收清單、backlog 紀律、M5「秘書條款」（若長期內部迭代不上線要主動點破），且明訂 subordinate 既有治理（衝突取較嚴者）。這些是加分。
- 核心論點（護城河）：「AI 生成打掉互動教學頁的手工成本 → 護城河不在生成能力，在頁面模板＋審核品味＋累積頁庫」。三頁的目的不是內容，是**驗證管線可重複**（M2）。
- 亮/暗節點模型（`depth_url==null` 即暗）＝把 backlog 公開誠實化，允許長期暗著。
- 我判斷 M0–M2 本身低風險（只產新檔、不觸禁區）；**真正的風險集中在假設層與 M3/M5 的整合面**，下節展開。

## 可能遇到的問題（依殺傷力排序，交 Codex 攻擊）

**P1 — 雙資料源／schema 拋棄風險（最可能崩的地方）**
計畫 M0–M2 依**新** `nodes.schema.json` 寫 seed＋validate.js，但守則 3 又說「M3 盤點後，若既有格式已存在則**廢棄本包 schema**、改擴充 `all_nodes.json`」。等於先蓋一棟平行資料模型、M3 再拆併。若既有 `all_nodes.json` 的邊語意（拓撲/座標預烘焙）與新 schema 的 prereq-DAG 模型不相容，M0–M2 的 schema/validate 工可能整段作廢。**deferral 是否安全？還是 M0 就該先盤點既有格式、直接在其上長？**

**P2 — inline 單檔 vs 既有 CSP 的正面衝突（具體地雷）**
概念頁規格要 inline CSS/JS、file:// 直開；Neblux 線上站 CSP 明令 inline script 一律外置。兩者在 M5 部署面**直接矛盾**：lab 頁若走既有 Vite 站 → inline script 被 CSP 擋；若繞過 Vite 當原始靜態檔 → 又要另解與圖譜導覽（M3）的整合。計畫把部署推到 M5「位置不確定」，但這個衝突在 M1 寫第一頁時就已存在，愈晚撞牆愈貴。

**P3 — 教學正確性的守門薄弱，且內容貼近核心軌道**
概念頁由 Opus **生成數學本身**（二階閉式解、Gibbs 現象、極點↔ζ/ωₙ）。唯一品質閘門是 Riku 的「五分鐘學生測試」，測的是「我有沒有學到」，**不是「內容正不正確」**。AI 生成的物理/數學可能有微妙錯誤，而審核者是電機系初級生本人（自評）。錯誤公式一旦掛上 linku.tech 品牌對外＝可信度損傷。**額外張力**：s 平面/步階響應/轉移函數是**控制理論**，緊貼 Riku 核心的電機控制軌道——全域規則要求核心軌道「須理解每行」，但此計畫是 AI 全生成公開內容。歸類為「Neblux 次要資產可全生成」還是「控制內容應被理解」？

**P4 — 硬編碼連結的維護漂移（單人維護稅）**
規格 §5 要把前置/延伸連結**硬編碼**進每頁 HTML，靠註解「與 nodes.json 同步維護」。頁數一多，每頁手動同步 nodes.json ↔ 硬編碼連結＝必然漂移。單人維護下這稅隨頁數線性增長。

**P5 — 「生產線」與「次要資產不擴張」的張力**
計畫本質是建一條**內容生產線**。但 Neblux 定調「做好、維護，不擴張」。Wonders 擴張 Riku 已明確拍板（記憶在案，不再質疑），但**深度層是全新子系統**，不是 Wonders 擴張。這是否為次要資產上的範圍蔓延？（我不重問「該不該做」——Riku 若已決定投入，這題只需轉成「如何把邊界鎖死、不讓它吃掉核心軌道時間」。留給 Codex 判斷是否為致命假設。）

**P6 — 公開暗節點的觀感風險**
seed 10 節點含 7 暗（無 depth_url）。計畫視公開 backlog 為「誠實」；但對訪客可能讀成「一堆沒做完的坑」。單人＋核心軌道優先下，暗節點可能永久暗著＝站點看起來爛尾。誠實 vs 爛尾觀感，界線在哪？

**P7（次要，M0 級）— validate.js 細節**
`related` 在 seed 是單向寫的（`convolution.related=["fourier-transform"]`），spec 說對稱：validate 要不要強制雙向？`depth_url` 檔案存在性檢查的路徑基準（lab 頁最終落點）尚未定，M0 需先敲定目錄結構。

## 想請 Codex 攻擊的方向（紅隊三問）

1. **致命假設**：上面 P1–P6 哪一個一旦不成立整案就崩？還有哪個我**沒看到**的假設？
2. **更便宜替代案**：例如（a）M0 就擴充既有 `all_nodes.json` 而非平行新 schema；（b）用既有 **Wonders 格式**承載「深度」而非另起一套頁系統；（c）1 頁黃金樣本＋書面模板即足以驗證管線，M2 兩頁是否過度。哪個更省長期維護？
3. **失敗模式**：上線後最可能怎麼壞？（CSP 撞牆、M3 資料併軌爆炸、AI 數學錯誤公開、硬編碼漂移、單人維護下爛尾。）
4. 總結一句：**這案該進、該修、還是該換**，附一句理由。

## 邊界（本次不做）

- 這是**討論**，不是動工。Codex findings 落本檔 Review 區即交 Riku 裁決，**不進入模型互辯**（點火者不對辯，一輪即止）。
- 不因討論就動 `neblux-depth/` 以外任何檔案；不 commit、不 push。

## Questions（實作層填）

- 無（尚未動工）。

## Review（審查層填；Codex，跨家族）
- Reviewer: Codex（codex-cli 0.142.5，read-only sandbox，32,795 tokens）
- 模式: ⑤雙提案／紅隊（攻擊提案）
- 觸發原因: Riku 手動交派「呼叫 codex 討論」
- Verdict: **fix-needed（該修，不該照 v0.1 直進）**。核心方向可測，但 M0–M2 現在驗證的是「一套可能被 M3 廢棄的平行系統」，且 CSP／內容正確性兩個硬風險被過早延後。

### 致命假設（Codex 排序）
1. **新 `nodes.json` 可先做、M3 再併回既有資料** ← 最大地雷。與我 brief 的 P1 同源。若既有 id／邊語意／描述來源／locale 結構與新 schema 不相容，M0–M2 的 schema／validator／硬編碼連結／node-meta 全可能作廢；M2 綠燈不代表能整合，反成遷移債。
2. **inline 單檔最後能自然上線** ← 與 P2 同源。CSP 擋 inline 是 **M1 第一頁**的架構選擇，不是 M5 部署小事。放寬 CSP／另開部署路徑／重寫頁面，三者都不低成本。
3. **五分鐘學生測試足以做教學正確性 QA** ← 與 P3 同源。只能測「有沒有感覺學到」，測不出公式／物理／邊界對錯；s-plane、二階步階響應、阻尼分支尤其容易「看似合理但錯」。
4. **三頁能證明生產線可規模化** ← 三頁只證明 AI 能生三頁；真瓶頸是審稿與維護（＋整合、行動裝置、i18n、CSP），不是生成。
5. **「單一資料源」成立** ← **新角度（我漏了）**：§5 要把 prereqs/links 硬編碼進每頁，資料一旦複製進頁面，`nodes.json` 就不再單一，除非有重生成流程或 validator 反查頁內連結。
6. **prereq-DAG 是合適的知識邊模型** ← **新角度（我漏了）**：知識圖譜與 Wonders 旅程不必然是 DAG（sine/euler/phasor/Fourier 可能互相照亮而非單向前置）。為 validator 強迫 DAG 會扭曲圖譜語意。
7. **公開暗節點是誠實而非爛尾** ← 與 P6 同源。7/10 暗，長期不點亮＝訪客看到大量不可用內容。

### 更便宜替代案
- **先做 M-1 盤點、不做 M0**：只讀既有 `all_nodes.json`／i18n／Vite 資料管線／`_headers`／Wonders 格式，產一頁整合判斷，直接決定 schema 該不該存在。
- **不新建平行 `nodes.json`，改 `depth_manifest.json`** ← **新替代案（強）**：用既有 node id 當 key，只記 `depth_url`／狀態／頁面 metadata；拓撲／標題／描述仍由既有資料源負責，不碰圖譜本體與 i18n 主資料。
- **先做一頁黃金樣本、不做 validator/schema/三頁**：最大未知是「頁面是否真有價值且 Riku 審得對」，不是資料管線；一頁把品質／CSP 形式／審核成本打穿最省。
- **第一頁就用 Neblux 相容外置 JS/CSS，或先定獨立部署路徑**：避免 M5 重寫。
- **公開只放亮節點，暗節點留內部 backlog**：省掉暗節點 UX／觀感／公開待辦維護稅。
- **內容 QA 加最低成本正確性閘門**：每頁至少附參考來源清單＋Riku 能自述的公式檢查筆記；做不到則 s-plane 這類控制內容不先公開。

### 失敗模式（附觸發條件）
- **CSP 上線即壞**：lab 頁被 CF Pages 套 `_headers` → inline script 被擋、互動頁空白或半殘。
- **M3 併軌爆炸**：既有 `all_nodes.json` 與新 `nodes.json` 不同源 → id／i18n／邊語意對不上，M0–M2 產物變遷移負擔。
- **validator 假安全感** ← **新角度**：零依賴 ≤60 行不可能完整驗 draft-07，只能局部檢查，欄位／連結／頁內 metadata drift 照樣可能漏過。
- **硬編碼連結漂移**：改了 prereqs/title/depth_url 卻忘了重生 HTML → 頁面與 registry 不一致，`nodes.json` 失去權威。
- **AI 數學錯誤公開**：二階響應／Gibbs／穩定性／符號定義生成錯 → 使用者學到錯知識、品牌可信度受損。
- **M2 後範圍滑坡**：「管線成立」被解讀成可累積頁庫 → Neblux 從次要維護資產變長期內容工廠，吃掉核心專題時間。
- **暗節點爛尾觀感**：圖譜/索引公開大量不可玩節點 → 訪客覺得半成品，違「安靜的驚奇」。

### 總結（Codex 原話）
> 這案該修，不該換。核心方向可以測，但修案前置條件是：M0 改成既有資料/CSP/部署盤點；第一頁先採 Neblux 可上線形式；內容正確性要有比五分鐘學生測試更硬的最低閘門。

### 秘書層備註（不對辯，僅標收斂/分歧供裁決）
- **高度收斂**：Codex 獨立重建後，與我 brief 的 P1/P2/P3/P5/P6 幾乎逐條命中 → 這些風險可視為已交叉確認、非單一模型偏見。
- **Codex 補了三個我漏掉的角度**：①「單一資料源」與硬編碼連結自相矛盾（假設 5）；②prereq-DAG 可能是錯的知識邊模型（假設 6）；③≤60 行 validator 給假安全感（失敗模式）。
- **最具行動性的一條**：把 M0 從「做新 schema」改成「先盤點（M-1）＋以 `depth_manifest.json` 掛既有 id」——同時拆掉假設 1、5、6 與 M3 併軌風險。此為方向性修案，需 Riku 裁決。

## 裁決（凜空）
- 決定: 依 Codex 紅隊結論採 fix-needed 路徑動工；不照 v0.1 平行 nodes.json/schema 直進，先做 M-1 盤點與 `depth_manifest.json`。
- 日期: 2026-07-09

## HANDOFF（Codex）
- Branch: codex/depth-layer-m0
- Summary: M-1/M0 完成，M1 黃金樣本已收到 Riku 初評「還可以」，本輪收尾。已將計畫修成 v0.2，新增 `depth_manifest.json` 與加強版 `validate-depth.mjs`；建立 `lab/sine-wave.html` + 外置 CSS/JS + correctness notes，避免建立第二套 graph source of truth。
- Verification: `node neblux-depth/validate-depth.mjs` passed（45 checks, 3 entries）；Playwright desktop/mobile visual check passed（canvas nonblank, slider changes alter pixels, no console/page errors; temporary screenshots regenerated in `test-results/`）；`npm run verify` passed（build + 57 E2E）。
- Remaining risks: M1 已有 Riku 初評可接受，但尚未做正式公開前內容審稿；截圖 PNG 是 `test-results/` 內的臨時驗證產物，後續 verify/Playwright run 可能清掉；本工具的 image viewer 因 sandbox 問題無法直接打開；`sine-wave`、`fourier-series`、`s-plane` 都只找到較寬的既有 graph node mapping，若要新增精確 graph node 需另走 data change review。

## M1 初評小節（2026-07-09）

- Riku 初評：還可以。
- 本輪結論：M1 黃金樣本可作為 review sample 收尾，但不等於公開上線。
- 邊界：不啟動 M2、不接正式導覽、不新增 graph node、不改 `data/*.json`。
- 下一步若繼續：另開任務做 M2 或做正式整合 brief。


