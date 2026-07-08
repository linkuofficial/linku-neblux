# TASK: depth-layer-m2（M2 管線驗證：Fourier series + s-plane 兩頁）
狀態: draft
建立: 2026-07-09 ｜ 秘書層: Claude(Opus 4.8) ｜ 實作層: 待定
Repo: Neblux
Base: d31f28c（M0+M1 commit；分支 codex/depth-layer-m0）
Required verification: `node neblux-depth/validate-depth.mjs` 全綠 ＋ 瀏覽器實看（Canvas）
風險等級: 中（新增資料檔＋概念頁；s-plane 涉控制理論，正確性風險升級）

## 目標

用 spec v0.2 ＋ 黃金樣本 `lab/sine-wave.*` 當範本，生成第二、三頁（Fourier series、s-plane）。
**本階段真正目的不是多兩頁，是驗證管線可重複**：記錄與黃金樣本的品質差距、人工修補量、內容 QA 成本、單人維護負荷。產出結尾要交一份「管線結論」給 Riku（可規模化嗎？瓶頸在哪？）。

## 執行順序（先易後難，各自過閘門才進下一頁）

1. **頁 02 `fourier-series`**（無控制理論 gate，先打通管線）。
2. **頁 03 `s-plane`**（需額外控制理論正確性 gate；貼近 Riku 電機控制核心軌道，數學要 Riku 自己能複核）。
3. **管線結論報告**（下節「HANDOFF/結論」填）。

每頁定稿前停下等 Riku 五分鐘測試 + 內容 gate，通過才推進 manifest 狀態。

## 驗收條件

**頁 02 `fourier-series`（node_id: `fourier_analysis_concept`）**
- [ ] `lab/fourier-series.{html,css,js}`：外置 JS/CSS、CSP 相容（無 executable inline script / 無 inline event handler）。
- [ ] 一畫布、一焦點互動物（諧波階數 N 為主控）、控制元件 ≤3；載入即動。
- [ ] 公式只在形式化段；符號與控制元件同色。方波奇次諧波級數；Gibbs 現象名詞只放形式化段、不放觀察任務。
- [ ] `node-meta` JSON：`depth_id/node_id/spec_version` 與 manifest 一致。
- [ ] `lab/fourier-series-notes.md`：≥2 可信來源 ＋ 逐符號 walkthrough ＋ scope note。
- [ ] 觸控目標 ≥44px；桌機/手機實看；無水平捲動。
- [ ] manifest entry 由 `candidate` 推進，qa 四旗標據實填。

**頁 03 `s-plane`（node_id: `control_theory_concept`）**
- [ ] 同上 CSP/結構/觸控/notes 全部條件。
- [ ] 焦點互動物＝可拖曳共軛極點（拖一顆、另一顆自動鏡射）；右側標準二階系統步階響應即時重繪。
- [ ] 形式化：`H(s) = ωₙ²/(s²+2ζωₙs+ωₙ²)`；極點位置 ↔ (ζ, ωₙ)；穩定 ⇔ Re(s)<0。
- [ ] **控制理論正確性 gate（硬）**：step response 用二階閉式解逐點算，欠阻尼/臨界/過阻尼三分支正確；極點進右半平面畫發散並截幅（此為教學內容）；notes 標明模型假設（線性、時不變、標準二階、單位步階）與不處理的邊界。
- [ ] **Riku 須能自述**每個符號與極點位置如何對應到響應曲線——這頁不通過 Riku 本人複核不得推進。

**管線驗證（本 task 的真正產出）**
- [ ] `node neblux-depth/validate-depth.mjs` 全綠（含新兩頁）。
- [ ] 記錄：每頁相對黃金樣本的人工修補量、最弱的一處、內容 QA 花費。
- [ ] 結論一段：管線可重複/可規模化嗎？瓶頸是生成、審稿還是維護？

## 邊界（不要動的東西）

- 禁區全不碰：無 `data/*.json` 結構或內容變更、無 `frontend/src/engine/`、無 `_headers`/`functions/`/Cloudflare 部署設定。
- 兩頁一律 `public: false`、不接正式導覽、不新增 graph node（維持掛既有寬節點）。
- 不改既有 CSP 來遷就頁面。不引入 MathJax/KaTeX、無 CDN、無新 production dependency。
- 不順手做第 4 頁或索引頁；想到的點子丟 PLAN §7 Backlog。
- 不 commit/push 除非 Riku 明說。

## Questions（實作層填）

- （待動工填）s-plane 的既有 graph node 只找到寬節點 `control_theory_concept`；是否可接受長期掛寬節點，或本 task 內需要更精確 mapping？（預設：沿用寬節點，精確 graph node 屬 data change 另走審查。）

## HANDOFF / 管線結論（實作層完成或卡住後填）
- Branch:
- 頁 02 修補量 / 最弱處:
- 頁 03 修補量 / 最弱處:
- 內容 QA 成本:
- Verification: <validate-depth.mjs 結果、瀏覽器實看結果>
- 管線結論（可規模化？瓶頸？）:
- Remaining risks:

## Review（審查層填；跨家族）
- Reviewer:
- 模式:
- Verdict:
- Findings:
  -

## 裁決（凜空）
- 決定:
- 日期:
