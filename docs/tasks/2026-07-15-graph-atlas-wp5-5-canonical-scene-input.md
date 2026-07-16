# TASK: graph-atlas-wp5-5-canonical-scene-input
狀態: review
建立: 2026-07-15 ｜ 秘書層: Codex ｜ 實作層: Luna
Repo: Neblux
Base: `f58ddf5`（RG-A route active，未 push）
Required verification: `npm run atlas:validate`、`npm run atlas:layout:check`、`npm run test:atlas`、`npm run test:renderer-v2`、新增 canonical scene tests、`npm run verify`
風險等級: 高（長期 presentation contract；與 WP6 分離，完成後與 WP6 一起跨模型審查）

## 目標

在 WP6 page integration 前，將 687 個 canonical nodes 的人工核可 celestial classification 與既有 stable layout／slim topology 組成 deterministic Renderer v2 scene input，建立明確、版本化、major mismatch fail-fast 的 adapter contract；不修改 canonical graph、layout locks、production routes 或建立 `app-v2.html`。

## 驗收條件

- [x] `config/atlas/celestial-lock.json` 覆蓋全部 687 canonical node ids，通過既有 schema／source validator，12 domain anchors 與 MAT／PHY nuclei 明確保留。
- [x] lock 的 archetype、magnitude、layout mass、label priority 與 Renderer v2 normalized scene 的 mapping 版本化且有測試；不以 renderer 的 unknown fallback 作為 canonical output。
- [x] canonical scene builder 只讀 `data/all_nodes.json`、`config/atlas/domain-anchors.json`、`config/atlas/layout/main.json`、`celestial-lock.json` 與 approved topology input；不讀 Wonder layout 取代 Main layout。
- [x] builder 產出 687 nodes、3,138 active pairs，schema／layout／renderer contract version 明確；相同 source 產出 byte/hash stable scene。
- [x] 修改純 visual token 不改 scene layout hash；修改 node id、layout lock、classification 或 active topology 會使對應 fingerprint／scene hash 改變。
- [x] 任一 canonical node 缺 lock、lock 有未知 major version、layout 缺 entry、edge 端點不存在或 lock／renderer enum 不相容時 fail-fast；不得靜默 fallback。
- [x] `config/atlas/layout/main.json`、19 Wonder locks、`data/*.json`、production routes 不被改寫；WP5.5 本身未建立 `app-v2.html`。`frontend/src/engine-v2/` renderer core 的異動（`setPresentation()`／presentation bundle／guided spine 畫線）屬 WP6 範圍，非 WP5.5 本包修改，經凜空 2026-07-15 授權——原文「renderer core 不被改寫」誤植為涵蓋整支 branch，已於跨模型審查後更正（見 Review Finding 1）。
- [x] Atlas／Renderer／全站 regression 與 deterministic tests 通過；完成後在 brief 填完整 HANDOFF，保留與 WP6 一起審查的狀態。

## 邊界（不要動的東西）

- 不建立 `frontend/app-v2.html`，不改 `app.html`、`app-main.js`、Wonders、Explorer 或 production route。
- 不修改 `data/all_nodes.json`、`data/i18n/*.json`、`data/wonders/*.json`、stable layout、19 Wonder locks、Atlas coordinates／roads。
- 不把 classification proposal 自動當成核可 lock；lock 必須保留 deterministic provenance／reason，並由本包驗證。
- 不改 Renderer v2 core semantics；adapter／builder 放在 Atlas tooling 或獨立 scene input 模組。
- 不新增 dependency、不部署、不 push。

## Questions（實作層填：卡住或需要決策時）

- 初始 adapter mapping 暫定：`landmark → nucleus`、`faint|standard|bright → 同名 renderer magnitude`；archetype 與 label priority 同名映射；`layoutMassClass` 僅作 build-time classification／audit input，不注入 renderer node。
- 需確認跨模型審查時，是否接受 deterministic proposal 作為 687-node lock 的初始人工核可基線；任何人工 override 必須列入 lock reason 與 test fixture。

## HANDOFF（實作層完成或卡住後填）

- Branch: `codex/graph-atlas-integration`
- Summary: 687-node lock 現以 explicit policy、source／anchor fingerprints、anchor invariants 與 strict major-version adapter 組成 canonical scene input；bridge class 限於 81 個高顯著跨域 concepts，避免 WP6 LOD／label 語意被稀釋；不建立 app-v2、不改 production routes。
- Verification: `npm run atlas:classification:audit`（687；bridge 81）、`npm run atlas:validate`（687 nodes／3,138 active pairs）、最終 `npm run verify`（Renderer 16、Depth 4、E2E 93、Atlas 54）全綠；`git diff --check` 全綠。
- Remaining risks: 初始 lock policy 與 687 entries 仍須依凜空指示，與 WP6 一起做一次跨模型 adversarial review；manual Main v2 browser QA 屬 WP6；未 push。

## Review（審查層填；與 RG-A 一起於 WP6 完成後觸發）

- Reviewer: Claude（跨模型交叉審查，方向二；僅拿到 brief×2＋diff＋`Neblux/AGENTS.md` 三樣，未自行探索其他檔案）
- 模式: ②測試互寫＋③對抗驗證合體
- 觸發原因: 長期 presentation contract／classification lock／renderer adapter；WP5.5＋WP6 合併跨模型審查
- Verdict: fix-needed → 2026-07-15 已全部處理（無方向性分歧，未升級模式⑤）：F1 已更正驗收條件文字；F2 查證後確認非缺陷（撤回）；F3 經凜空裁決（Learning Path 功能保留，範圍問題留到 RG-B cutover 一併裁決；bug 本身修正）後已修好並在瀏覽器實測；F4 風險提醒已記錄於 WP6 brief 的 Remaining risks。F5 為測試穩健性提醒，不需動作。**本輪 Review 全部收斂，無待辦。**
- Findings:
  1. **[CONFIRMED] WP5.5 驗收條件第 7 條與實際 diff 矛盾**：該條勾選（[x]）聲稱「`frontend/src/engine-v2/` renderer core 不被改寫」，但本次審查拿到的 tracked diff 明確修改了 `frontend/src/engine-v2/renderer.js`（新增 `presentation` state、`setPresentation()` API、`drawFrame()` 內 bundle／guidedSegment 畫線邏輯、`destroy()` reset presentation）。可直接驗證：`git diff --stat f58ddf5...HEAD -- frontend/src/engine-v2/` 非空。WP6 Questions 區雖記載「凜空已於 2026-07-15 明確授權 Main presentation contract 與 Renderer v2 layer」，但那是 WP6 的授權記錄，不能讓 WP5.5 自己的驗收勾選同時聲稱「未被改寫」——兩份文件對同一支 branch 的同一段 diff 說法互相矛盾。信心：高（純文字比對 diff 內容，不需外部檔案）。
     **已處理**：2026-07-15 已修正上方驗收條件第 7 條的敘述，明確區分「WP5.5 本包未改」與「WP6 範圍、經凜空授權」，避免留下與實際 diff 不符的紀錄。
  2. **[已查證·非缺陷] `main-scene.json` 頂層 shape** — 審查當下只有三樣輸入，未讀 `scripts/atlas/canonical-scene.mjs`，故原始 findings 標記此為中信心缺口。裁決後追查該檔＋既有 `tests/atlas/canonical-scene.test.mjs:8-9`（非本次 diff 新增、審查前就存在），確認 `buildCanonicalSceneFromRepo()` 回傳 `{ scene: normalized, metadata: {...} }`，`.scene.nodes.length === 687`／`.scene.edges.length === 3138` 已被該既有測試釘死；`app-v2-main.js` 的 `scenePayload.scene` 讀法正確，`vite.config.ts` 對其只做 `JSON.stringify` 原樣寫檔、無轉換。`main-presentation.mjs` 的 `unwrapScene()` 多接受 `canonicalScene`／裸物件只是額外防禦，不代表 shape 不確定。**結論：無需新增測試，撤回此項的「fix-needed」性質。**
  3. **[FIXED] `isAvailable()` 邏輯反向 — 已修正並實測**：`frontend/src/app-v2-main.js` 原邏輯
     ```js
     function isAvailable(id) { const parents = prerequisite.parents[id] || []; return parents.length ? parents.every((parent) => learned.has(parent)) : (prerequisite.children[id] || []).length > 0; }
     ```
     會讓完全沒有 prerequisite 關係（parents 和 children 皆空）的節點被判為**不可加入 Learning Path**，即使它沒有任何前置條件、理論上天生可學。
     **凜空裁決（2026-07-15）**：這牽涉「學習記錄／記憶」方向的產品判斷（Neblux 不打算做記憶/spaced-repetition 追蹤），但決定「只修 bug，功能本身先留著」——Learning Path 是否長期留在 Neblux 的範圍問題，留到之後 RG-B cutover 討論再一併裁決，不在這裡展開。
     **修正**：拿掉 `children` 分支，改成單純看 parents 是否都已學（空陣列時 `Array.prototype.every` 天生回傳 `true`，等同「沒有前置就是可學」）：
     ```js
     function isAvailable(id) { const parents = prerequisite.parents[id] || []; return parents.every((parent) => learned.has(parent)); }
     ```
     **瀏覽器實測**（`npm run dev` → `/app-v2.html`，透過 `window.__nebluxApp.selectNode()` 逐一檢查 687 節點）：
     - 孤立節點 `abolition_of_slavery_event`（無 prereqs、無 unlocks）：修正前應為 disabled，修正後 `disabled: false`、文字為「Add to Learning Path」——確認可學。
     - 有未滿足前置的節點 `acid_base_chemistry_concept`（1 條 prerequisite，未學）：`disabled: true` 不變——確認沒有把「真的被擋住」的情況一起解開，非過度修正。
     - `npm run verify` 全綠（Renderer/Depth/E2E 93／Atlas 54，fail 0），無測試因此修正而壞掉。
  4. **[NOTE，低／中信心，前瞻性風險非本次 diff 違規]** `app-v2.html`「internal-only」完全依賴 `noindex,nofollow` meta 與未被連結，Cloudflare Pages 本身無存取控制；一旦此 branch 部署，`/app-v2.html` 與其 `main-scene.json`／`main-presentation.json`／`main-interaction.json`（含完整描述、標籤、關聯）就會經由直接 URL 公開可讀，「internal」只是慣例非邊界。brief 自己的 Questions 已註明「並非 RG-B cutover 授權」且目前未 push，故非當前違規，僅提醒未來實際 push／deploy 這支 branch 時需一併考慮。
  5. **[NOTE，低信心，測試穩健性非正確性]** `window.__nebluxApp.ready()` 在 `boot()` 指派 `canonical` 後立刻為 true，早於非同步 `Promise.all([depth, portal, constellation]).then(applyUrl)` resolve——也就是說 URL 驅動的初始 focus／card 顯示（`applyUrl()`）可能仍在 pending 時 `ready()` 就已回報 true。給定的 e2e 測試靠 Playwright 具自動重試性質的 web assertion（`toBeVisible`／`toHaveText`）撐過這段落差，應仍可穩定通過；但若未來有別的消費者用 `ready()` 做同步判斷（不具重試語意），這不是安全的「URL 還原已完成」訊號。
- 信心來源說明（依規定不得「全過零疑慮」不說明）：審查輪（找 findings）僅讀了 brief×2＋diff＋`Neblux/AGENTS.md`，依規則未讀 `scripts/atlas/canonical-scene.mjs`、`scripts/atlas/layout/io.mjs`、`scripts/atlas/layout/policy.mjs`、`scripts/atlas/validate-config.mjs`、`frontend/src/engine-v2/contract.js` 等既有檔案，故 Finding 2 當時只能標記為中信心缺口。凜空裁決後進入修正輪，已補讀 `canonical-scene.mjs`＋既有 `canonical-scene.test.mjs`，確認 Finding 2 非缺陷並撤回（見上）；F3 修正後在瀏覽器對實際 687 節點資料實測（孤立節點與有未滿足前置節點各一例），非僅憑程式碼推論。Finding 1 全程是純 diff 內文字比對，高信心；Finding 4／5 是風險提醒非缺陷判定，未進一步驗證。

## 裁決（凜空）

- 決定: 先完成 RG-A 本機 commit；WP5.5 開始實作，與 WP6 完成後合併審查，不 push。
- 日期: 2026-07-15
