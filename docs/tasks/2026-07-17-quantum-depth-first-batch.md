# TASK: quantum-depth-first-batch

狀態: review

## 目標

製作第一批六個量子力學 Depth 候選頁：波函數、量子疊加、不確定性原理、量子穿隧、量子自旋、量子糾纏。每頁只教一個可搜尋名詞，使用一個主要操作，讓零先備知識的讀者在 30–90 秒內親手看見該名詞最重要的規則。

本批次由凜空於 2026-07-17 明確核准，取代 `neblux-depth/PLAN.md` v0.4 原先「逐頁、最多三頁」的批次數量限制；其他品質閘門仍有效。六頁完成工程與內容 QA 後仍維持 `public:false`、`review_status:draft`，待凜空逐頁完成五分鐘理解測試後才能發布。

## 驗收條件

- [x] 六頁 H1 都是單一正式名詞，不使用「A 與 B」、概論、基礎或應用集合式標題。
- [x] 每頁只有一個主要互動控制，且能用一句話回答「使用者親手發現什麼」。
- [x] 每頁第一層文案零先備可讀；公式只放在最後、預設收合的進階區。
- [x] 每頁有 no-JS 可讀內容與靜態現象圖、鍵盤操作、可見 focus、`prefers-reduced-motion`、非色彩單一通道、觸控目標 ≥44px。
- [x] 每頁外置 JS/CSS、無 inline executable script、無 inline handler、無第三方 runtime 或新 production dependency。
- [x] 每頁有 claim-source／notes，列出公式前提、刻意簡化、常見誤解與可重跑數學檢查。
- [x] 共用量子互動純函式有單元測試；桌機 1440×900 與手機 390×844 E2E 均通過，無水平溢位、無 console error、Canvas 非空白、操作後狀態改變。
- [x] 美術參數對齊四個已定稿 Depth 頁（Fourier Series、S-plane、Sine Wave、Transformer）：system UI 字體、1040px 內容寬、56px header、直角 Canvas、細分隔線、18px 圓形步驟標記與同一組近黑／灰藍色階；科學資料色維持獨立語意。
- [x] `node neblux-depth/validate-depth.mjs` 全過。
- [ ] `npm run verify` 全過。
- [x] 瀏覽器逐頁實際操作與目視確認完成。

### 六頁的單一教學契約

| Depth | 一句學習目標 | 唯一主要操作 | 畫面證據 |
|---|---|---|---|
| 波函數 | 波函數決定各位置被測得的機率分布，不是粒子的確定軌跡 | 改變波包寬度 | 波包變窄時，重複測量落點也集中 |
| 量子疊加 | 兩種可能狀態以振幅組合，重合後可相長也可相消 | 改變相對相位 | 兩輸出口的機率此消彼長 |
| 不確定性原理 | 位置分布壓窄時，動量分布必須展寬 | 改變定位程度 | 左側位置與右側動量寬度反向改變 |
| 量子穿隧 | 勢壘變厚時穿透機率快速下降，但非立即變成零 | 改變勢壘寬度 | 勢壘右側穿透比例連續下降 |
| 量子自旋 | 同一自旋狀態沿不同方向測量仍只有兩種離散結果 | 旋轉測量方向 | 上／下兩束比例改變，但不出現中間落點 |
| 量子糾纏 | 每邊單次結果隨機，但同軸測量的 singlet 粒子對總是相反 | 測量下一對 | 左右各自不可預測，配對關係持續 100% 相反 |

## 邊界（不要動的東西）

- 不改 `frontend/src/engine/`、`frontend/src/engine-v2/`、部署設定、後端或 CSP。
- 不改 `data/*.json`，避免本批內容工作觸發 Graph Atlas 穩定布局遷移。
- 不新增正式 graph node；六頁暫時掛到各自不同的既有鄰近 canonical node，manifest 明載 mapping confidence 與風險。
- 不把 Bell 不等式、量子測量、退相干、量子電腦或詮釋混進六頁主目標。
- 不做英文／日文版；繁中通過理解閘門後才另案處理。
- 不 commit、push 或發布。

## Questions（Codex 填）

- 六頁目前缺少六個一對一 exact graph nodes；本批採寬節點掛接避免資料與布局擴張。若未來要在 Atlas 顯示精確節點，需另開 data/layout migration brief。
- 人工內容閘門仍需凜空逐頁五分鐘測試；AI 與自動測試不能替代這一步。

## HANDOFF（Codex 完成或卡住後填）

- Branch: `codex/graph-atlas-integration`
- Summary: 新增六個單一名詞量子 Depth 候選頁、共用視覺／互動模組、六份 scope notes、逐條 claim/source 表、純函式單元測試及獨立 draft-preview Playwright gate。2026-07-17 美術細修改以四個已定稿 Depth 頁為唯一基準，統一字體、色階、內容寬、header、段落節奏、步驟圓標、直角 Canvas、控制列、公式 disclosure 與手機比例；並讓共用公式符號 tooltip 同時支援舊頁 `.formal` 包裝與新頁 standalone `.formal-details`。六頁均維持 `public:false`、`review_status:draft`，不進 sitemap。
- Verification: `npm run test:depth-build`（13 passed，含量子數學與美術契約）；`node neblux-depth/validate-depth.mjs`（288 checks）；`npm run test:depth-preview`（14 passed，desktop/mobile/no-JS/standalone formula tooltip）；in-app browser 六頁桌機與 390×844 手機逐頁實看、逐頁操作，Canvas／控制列／公式展開與符號提示均確認，無水平 overflow。先前 `npm run verify` 於 build 階段兩次被既有 `127.0.0.1:3000` Neblux Vite 鎖住 `frontend/public/data/atlas`；未擅自關閉非本次啟動程序。其餘 verify 子項先前全部通過：renderer-v2 32、一般 E2E 117、performance 1、renderer visual 1、Atlas 58。
- Remaining risks: 六頁 claim-source 仍需凜空人工逐條簽核與五分鐘理解測試；五頁只有鄰近 broad canonical node mapping，exact nodes 需另案 data/layout migration；待既有 port 3000 dev server 關閉後仍需補跑完整 `npm run verify` 的 build 起始段；目前不可發布。
