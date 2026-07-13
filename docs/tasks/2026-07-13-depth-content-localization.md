# TASK: depth-content-localization

狀態: review

## 目標

- 將 sine-wave 恢復為振幅、頻率、相位模型，保留波峰波谷，並以 `T=1/f` 呈現週期。
- 精簡 s-plane 開場，保留避震器直覺但避免一頁承擔過多控制理論範圍。
- 重排並美術優化 s-plane、Transformer 互動區，讓桌面首屏具有清楚層級且可直接操作。
- 將 Transformer 注意力熱圖提升為主視覺；波頁加入具物理意義的波速；校正 S-plane 圖面比例。
- 記錄 Fourier、s-plane 與 Transformer 後續拆頁規劃，本輪不擴寫。

## 驗收條件

- [x] sine-wave 即時圖標示波峰、波谷，並恢復 `A`、`f`、`φ`。
- [x] 週期由頻率即時計算為 `T=1/f`；相位保留但標示為進階。
- [x] s-plane 開場只保留一句副標與一句操作提示。
- [x] s-plane、Transformer 完成面板、卡片、層級、背景與響應式視覺重整。
- [x] 依人工回饋移除裝飾性卡片與巢狀外框，統一以留白、字級及單一分隔線建立層級。
- [x] sine-wave、Fourier Series 同步套用相同極簡視覺系統，四頁排版語彙一致。
- [x] Transformer 熱圖改為全寬主視覺，選字、讀值與 T 控制改為圖下說明。
- [x] sine-wave 加入 `v` 波速與 `λ=v/f`，桌面四個控制同列。
- [x] s-plane 的實虛軸採等比例且原點位置不再造成圓形裁切。
- [x] Transformer 桌面首屏完整容納控制區與熱圖，手機版無水平溢位。
- [x] claim-source、notes、backlog 與回歸測試同步更新。
- [x] `npm run verify` 全過並完成瀏覽器實看。

## 邊界（不要動的東西）

- 不改 `frontend/src/engine/`、資料 schema、部署設定或後端。
- 不在本輪擴寫 Fourier、完整控制理論或整座 Transformer；波速只做到一維行進波。
- 不新增 production dependency。

## Questions（Codex 填）

- 人工審核：是否接受 sine-wave 的「A/f/v 為主要、φ 為進階，T 與 λ 為衍生量」層級。
- 人工審核：S-plane 的「極點位置決定」仍需理解為本頁固定的標準二階無零點模型，不是一般系統定律。

## HANDOFF（Codex 完成或卡住後填）

- Branch: `codex/graph-atlas-wp2-v1`
- Summary: Transformer 改以無外框的全寬熱圖為主視覺，選字／讀值／T 控制成為圖下說明；sine-wave 改為 `A/f/v/φ` 一維行進波，桌面四控制同列；s-plane 校正為 `Re∈[-6,4]`、`Im∈[-5,5]` 的等比例視窗，圓形不再裁切。
- Verification: `npm run verify`（build、4 depth-build tests、72 Playwright tests）；Depth 專項 15 tests；四頁 claim-check 全過；桌面瀏覽器實看三頁；390×844 手機 E2E 無水平溢位，sine-wave 手機控制維持單列水平滑動。
- Remaining risks: 四份 claim-source 仍全為 pending，需凜空人工逐列簽核；Sine 的一維無阻尼行進波、Transformer 的單頭手工數字與 S-plane 的標準二階無零點模型仍是刻意簡化，需人工確認教材層級。
