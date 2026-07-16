# TASK: app-v2-parity
狀態: done
建立: 2026-07-15 ｜ 秘書層: Codex ｜ 實作層: Codex (Terra, Luna)
Repo: Neblux
Base: working-tree
Required verification: npm run verify + app-v2 browser visual inspection
風險等級: 中(三角測量)

## 目標

讓 `app-v2.html` 補齊可安全落地的原版 Deep Field 資訊與焦點語意：結構化多語說明、面板 metadata、焦點標籤／關聯階層、篩選一致性與焦點環。保留 canonical 靜態佈局與 v2 的 Depth／Portal 架構；不為追求一致性引入未經驗證的大型動畫或資料管線重構。

## 驗收條件

- [x] 節點面板使用 687 節點既有 EN／ZH／JA structured sections，locale 失敗仍回退英文。
- [x] 面板補回節點 type、正確年代格式、最近 3 筆 breadcrumb；不得恢復 Google 搜尋。
- [x] focus 時僅 selected／hovered／related／guided 保留標籤；dimmed／filtered 標籤不得殘留。
- [x] related 不再畫一般藍圈；selected 為可辨識的多層靜態 focus ring。
- [x] domain filter 同時處理節點、標籤與非相容 edge；pending 不得公開呈現。
- [x] 既有 v2 測試與 `npm run verify` 通過，並完成 desktop／mobile 瀏覽器視覺確認。

## 邊界（不要動的東西）

- 不修改 `data/*.json` 結構、canonical layout、runtime force、部署設定或 API。
- 不恢復全域 relation 彩線、Google 搜尋、學習進度後端同步。
- 本輪不做 animation scheduler／cache 分層重構、build-time edge priority／quadratic routes、canonical 五級星等重編、完整 Wonder 遠景與 Learning Path graph mode；這些項目太大則明確保留為後續工作，不硬做。

## Questions（實作層填：卡住或需要決策時）

-

## HANDOFF（實作層完成或卡住後填）
- Branch: working-tree
- Summary: Luna 完成 renderer v2 焦點視覺語意：focus/filter 時排除 ambient dimmed／filtered labels（selected 保留辨識）；selected／hovered／related／guided 的 collision rank 置頂；related 不再畫藍色 ring；selected 改成五層靜態 focus corona；filtered endpoint edges 與 focus second-hop edges 明顯退場。
- Verification: `node --test tests/renderer-v2/visual-contract.test.mjs tests/renderer-v2/renderer.test.mjs`（8/8 pass）。全量 `npm run verify` 與 desktop/mobile browser visual inspection 交由整合後執行。
- Remaining risks: `app-v2-main.js` 目前每次 interaction 仍重設 scene，超出 Luna 範圍；本輪未做 scheduler animation、cache 分層、edge priority/route、星等資料、Wonder/LP graph mode。filter 與 selected 同時存在時，renderer 保留 selected label/brightness，但 filter 外 related endpoint edge 仍會退場。
- Terra: app-v2 面板改用既有 `/data/sections.json` 與 locale `{zh,ja}_sections.json`；locale 不存在或失敗時逐節回退英文。加入 type、BCE/present 年代格式、session-based 最近三筆 breadcrumb，以及由 constellation index 取得的多語 Wonder station title。未加入 Google 搜尋，未改 data、API、build scripts 或 engine-v2。
- Terra verification: `npx playwright test tests/e2e/app-v2.spec.ts`（14/14 pass）；Browser desktop 與 390×844 mobile 視覺檢查：摘要／收合 sections、type、breadcrumb、卡片捲動與手機 bottom sheet 正常。
- Terra remaining risk: 若未來 locale section 檔不完整，單一欄位會以英文內容回退；此為刻意的可用性降級。
- Integration: 修正初始 `?node=` 尚未完成非阻塞 URL 套用時按 Escape 可能保留 URL 的 race；更新 multilayer focus corona 的 visual baseline。
- Final verification: `npm run verify`（build、17 renderer-v2、4 depth-build、100 E2E、renderer visual、54 atlas 全通過）；重複 Escape/back case 3 次全通過；desktop browser 實看完成，mobile 由 app-v2 E2E 與 Terra 的 390×844 實看確認。
- Remaining risks: 本輪刻意略過 animation scheduler/cache 分層、edge priority/quadratic routes、五級星等重編、Wonder 遠景與 Learning Path graph mode；這些是後續獨立任務。

## Review（審查層填；盡量用與實作層不同的模型家族）
- Reviewer: Codex integration review
- 模式: ③對抗驗證
- 觸發原因: rendering／interaction parity across shared canvas state
- Verdict: approve
- Findings:
  - 結構化多語資料、focus label hierarchy、filter edge fade 與 focus corona 已由 E2E、renderer contract、visual baseline 及完整 verify 覆蓋。

## 裁決（凜空）
- 決定:
- 日期:
