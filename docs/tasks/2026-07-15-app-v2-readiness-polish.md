# TASK: app-v2-readiness-polish
狀態: done

## 目標

把已完成的 Main Galaxy v2 收斂到可評估正式切換的品質：真正總覽、無遮擋控制列、多語 Learning Path、static-first 首繪、Wonder 遠景標題可讀；Learning Path 只採用可驗證的先備資料，無法安全判定的關係不猜測。

## 驗收條件

- [x] reset/overview 以 viewport 與 canonical bounds 顯示完整圖譜及 Wonder 入口。
- [x] detail panel 不遮住 controls（desktop/mobile）。
- [x] Learning Path UI 全語系，且可學標記只呈現目前路徑/有限前線。
- [ ] Learning Path 不將未稽核 directed logical/causal 關係當作先備。
- [x] core scene 首繪不等待 presentation/descriptions；optional 請求有 timeout 和靜默降級。
- [x] Wonder labels 有 domain accent 且不互相壓住。
- [x] `npm run verify` 全綠並完成 browser 實看。

## 邊界（不要動的東西）

- 不動 production `app.html`、legacy `frontend/src/engine/`、data schema、runtime force、API/部署。
- 不製造或推測新的 learning prerequisite 資料；不恢復全域 relation 彩線/pending edges。

## Questions（Codex 填）

- 讀取 interaction artifact 後確認：137 筆 explicit `learning_prerequisite` 中，至少 `mathematics → computer_science` 與 `physics → mathematics` 從 relation prose 讀出的 parent 方向相反；edge direction 不能作為可靠先備方向。LP 維持 internal-only，待資料層提供明確 `prerequisite_source` / `prerequisite_target` 或人工稽核表後再開正式功能。

## HANDOFF（Codex 完成或卡住後填）
- Branch: working-tree
- Summary: 實作 bounds-fit overview、panel 外的 desktop/mobile controls、Learning Path 三語字串、static-first 背景 hydration（5 秒 optional timeout）、Wonder 的安全 domain 色與遠景無碰撞標籤。
- Verification: `npm run verify` 全綠（109 E2E、1 Canvas visual、24 renderer、4 depth-build、54 Atlas）；瀏覽器實看 overview 與開啟 Mathematics 卡片後的 controls。
- Remaining risks: 明確跳過 Learning Path 語意資料修復。既有 edge direction 和 prose 的先備方向互相矛盾，現在卡片的 Prerequisites/Unlocks 不能作為正式知識聲明；功能仍限 `/app-v2.html` internal route，需先有稽核表或資料 schema 的明確方向欄位才可升級。
