# TASK: p1-1-share-moment（P1-1 級2 分享 — 前端切片）
狀態: review（前端完成、待測；兩塊後端刻意跳過＝債）
建立: 2026-07-06 ｜ 秘書層: claude-opus-4-8 ｜ 實作層: claude-opus-4-8
風險等級: 中（wonders 產品面前端；非禁區）

## 目標
交付 P1-1「級2 分享」中**零風險、零 `[人工]` 阻塞**的部分：wonders surprise beat 旁
一個安靜的「分享這個瞬間」affordance。凜空授權：能做的補完，該跳的跳、當債，
測試時再定奪。**不重設計已定案架構**（DIRECTION 級2 = 動態 og + KV 短連結）——
只在「做／不做」上用判斷。

## 已完成（可直接測）
- `frontend/wonders.html`：surprise 區塊內加 `<button id="wp-share" class="wp-share" hidden>`。
- `frontend/src/wonders-main.js`：三語字串 `shareMoment`/`shareCopied`；`renderStep` 於有 surprise 時顯示鈕、綁 `shareCurrentBeat(i)`；新增 `shareCurrentBeat`（Web Share API，桌面無則 `navigator.clipboard` 複製＋`flashShareCopied` 安靜回饋，並播報到 `#wp-live` aria-live）。
- `frontend/src/styles/pages/wonders.css`：`.wp-share` 安靜樣式（`--text-2xs`、`--ink-soft`、opacity 0.7、hover/copied 轉 accent、`↗` 前綴）。
- `tests/e2e/wonders.spec.ts`：新增守門——stub `navigator.share`，斷言 surprise step 顯示鈕、點擊分享 payload `url` 含 `?w=light&s=2`。
- 分享的是既有 `?w=&s=` 深連結（P0-1），rich preview 沿用 P0-2 每趟靜態 og。

## 驗收（全過）
- [x] `npm run verify`：build ＋ **e2e 44 passed**（含新 share 守門）。
- [x] `python scripts/check_simplified.py`：0 ERROR（新 zh 字串合格）。
- [x] 瀏覽器實看：`?w=light&s=3` 鈕現形於 THE TWIST 下、樣式安靜、點擊複製正確深連結、label 轉「Link copied」、console 0 error。

## 跳過＝債（凜空測試時定奪，非重設計）
1. **動態 og `GET /api/og`（workers-og＋CJK 子集化）** — 跳過。理由：邊緣端 CJK 子集化最脆最貴；P0-2 已有每趟靜態 og；次要資產邊際價值低。ROADMAP 本就留了「CJK 卡住→退靜態」的路。**若要補**：另立案，屬 `functions/` 禁區＋新依賴 `workers-og`（已預核准）。
2. **KV 短連結 `GET /s/:code`（＋mint）** — 跳過。理由：卡 `[人工]` KV `LINKS` 未建；ROADMAP 未定義 code 怎麼 mint（規格洞，不猜）；長深連結本就能分享。**若要補**：先補規格（mint 端點形狀）＋ `[人工]` KV，屬 `functions/` 禁區強制交叉。

## 假設 / 待凜空定
- 分享 URL 用「帶 step 的深連結」而非「每趟靜態 stub `/w/<id>`」：保住『分享到某一 beat』的語意，代價是 preview 只有 wonders.html 預設 og（非 per-beat）。若你更看重 preview 豐富度，改分享 `/w/<id>` 但會失去 step——這是 debt#1（動態 og）真正要解的。

## HANDOFF
- Branch: `master`（**未 commit**——依 §6 待凜空明確要求才提交）
- Summary: 見「已完成」。純前端、非禁區、graceful（無 Web Share→複製；API 無涉）。
- Verification: 見「驗收」。
- Remaining risks: 兩塊後端債如上；分享 URL 選擇待凜空定。

## Review（審查層填）
- Reviewer: GPT-5 Codex
- 模式: ②/③（從 brief 驗收獨立推測試 + 對抗性檢查 diff）
- 觸發原因: 凜空要求反向審查 secretary-layer-authored changes；輸入限定為本 brief、`git diff HEAD`、repo `AGENTS.md`。
- Verdict: approve
- Findings:
  - 無阻斷 findings。依 diff 檢查，實作切片沒有碰 `frontend/src/engine/`、`data/*.json` 結構、`functions/`、`frontend/public/_headers` 或部署設定；未新增 `/api` 依賴；HTML 無 inline handler，CSP 風險低。動態 og 與 KV 短連結已在 brief 明列為凜空授權跳過的債，不作為問題。
  - 測試缺口（非阻斷，但建議補守門）：目前 e2e 只覆蓋 `navigator.share` 成功、深連結含 `?w=light&s=2`。從驗收條件獨立推，還應補以下 acceptance tests：
    1. step 沒有 `surprise` 時 `#wp-share` 必須 hidden，點擊不可觸發 share/copy。
    2. 語言切換 mid-tour 後，`#wp-share` label 必須用新 locale 重新顯示；複製成功後的 `shareCopied` 也應符合目前 locale。
    3. `navigator.share` reject / `AbortError` 時必須安靜失敗，且不得再 fallback 到 `navigator.clipboard.writeText`。
    4. `navigator.share` 不存在時，clipboard 成功要複製目前 beat 的 `?w=&s=` URL 並顯示安靜 copied feedback；`navigator.clipboard` 不存在或丟錯時必須安靜失敗、console 不報錯。
    5. 從 intro-gate 深連結進入與從 picker 選 tour 進入兩種路徑，分享 URL 都必須指向目前 tour 與目前 step，而不是沿用舊 query 或預設 step。
  - 對抗性檢查結果：`onclick` 在 `renderStep` 以 property reassignment 更新，不會累加 listener；Web Share reject 後立即 `return`，不會同時 copy；clipboard absent/throw 在 `try/catch` 內可安靜失敗；分享 URL 由 `wonderId` + `i + 1` 組成，符合目前前端切片的 deep-link 假設。未發現違反 DIRECTION「靜態為骨動態為光／安靜的驚奇／不遊戲化」的實作問題。
## 裁決（凜空）
- 決定:
- 日期:

