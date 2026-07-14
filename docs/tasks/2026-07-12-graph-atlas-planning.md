# TASK: graph-atlas-planning
狀態: done

## 目標

為 Neblux 長期 Graph Atlas 架構建立可審查的主計畫，涵蓋 Atlas、Main Galaxy、Wonder Clusters、Depth、蟲洞、天體視覺語意、穩定佈局、資料衍生、效能、遷移與回滾。

交付文件：

- `docs/GRAPH-ATLAS-PLAN.md`
- `docs/GRAPH-ATLAS-DATA-CONTRACT.md`
- `docs/GRAPH-ATLAS-VISUAL-SYSTEM.md`
- `docs/GRAPH-ATLAS-IMPLEMENTATION-ROADMAP.md`
- `docs/GRAPH-ATLAS-FABLE-REVIEW.md`
- `docs/GRAPH-ATLAS-SELF-AUDIT.md`

## 驗收條件

- [x] 明確定義四級產品與穩定路由。
- [x] 保持 `all_nodes.json` 為 canonical graph 唯一真相。
- [x] 將佈局質量、視覺星等、天體種類與互動角色解耦。
- [x] 納入 Mathematics／Physics 中央雙核心高重力天體設計。
- [x] 設計 layout lock、local solve、movement budget 與 major migration。
- [x] 設計 Wonder cluster 12–30 nodes、guided／explore、portal 與 Depth。
- [x] 設計 Atlas／Wonder 不載完整 graph 的 build bundles。
- [x] 設計分階連線、LOD、edge bundling 與星雲密度背景。
- [x] 設計平行建造、逐層切換與舊 URL 回滾策略。
- [x] 補齊 source／derived JSON contracts、URL precedence 與 failure matrix。
- [x] 補齊天體尺寸、overlay 疊加、LOD、motion 與視覺驗收。
- [x] 拆成 WP0–WP10 可獨立審查、回滾的工作包。
- [x] 建立 Fable 5 交叉審查包與指定 findings 格式。
- [x] 執行三輪自查：內部契約、repo／DIRECTION、變更爆炸半徑。
- [x] 列出分階工程、驗證矩陣、風險與待裁決細節。

## 邊界（不要動的東西）

- 本 task 只做規劃文件，不修改 `frontend/src/engine/`。
- 不修改 `data/*.json` 結構或內容。
- 不修改 Vite build、`functions/`、Cloudflare 或 `_headers`。
- 不建立 production route、不切換現有入口。
- 不新增 dependency、不 commit、不 push。

## Questions（Codex 填）

- 現有資料實際只有 12 個 domain codes，但歷史文件曾提 13 domains；Phase A 必須先對帳，避免把錯誤分類寫進固定 Atlas layout。
- Mathematics／Physics 雙核心已確立為建議方向；最終相對位置與視覺光譜需在 Atlas 視覺原型中裁決。
- Main Galaxy 是否保留 session-only drag 尚未定案；基於穩定地圖心智，規格預設移除自由拖曳。

## HANDOFF（Codex 完成或卡住後填）

- Branch: master（docs-only planning；未建立 branch）
- Summary: 完成 Graph Atlas v0.2 review package：四級靜態架構、精確資料契約、天體視覺系統、雙核心引力、穩定 layout、蟲洞、static bundles、WP0–WP10 路線、Fable 5 審查包與三輪自查。
- Verification: 7 份 planning 文件共 2,471 行／60,553 字元；Markdown fences、二級標題、EOF、trailing whitespace 結構檢查通過；14 項跨文件契約斷言通過；Fable review packet 的 17 個輸入路徑存在；新文件 zh-TW 常見簡體詞掃描零命中；`python scripts/check_simplified.py` 通過（既有 i18n：0 ERROR、21 個台灣可接受字形 REVIEW）；working tree 只有本輪 7 個未追蹤 docs。Docs-only，未執行 `npm run verify`。
- Remaining risks: 本計畫涉及引擎、資料 schema 與 build 禁區；進入 Phase A/B 前必須經 Riku 裁決與跨家族審查，並另開實作 brief。

## Review（事後歸檔）

- Reviewer: Fable 5（不同模型家族）
- 模式: 規劃交叉審查
- Verdict: fix-needed（0×P0、4×P1、7×P2）；完整 findings 見 `docs/GRAPH-ATLAS-FABLE-REVIEW.md`，修正計畫與 WP0.5 GO 見 `docs/tasks/2026-07-12-graph-atlas-review-fixes.md`。
- Resolution: findings 已在 Direction Freeze、schema／validator、stable-layout、bundles／indices、Atlas prototype 與 renderer-v2 work packages 逐包關閉。

## Closeout（2026-07-14）

- WP0–WP5 已依本計畫完成獨立 brief、驗收與交叉審查；本 planning task 的 original review gate 已有可追溯 verdict 與 findings resolution。
- 原始 Remaining risks 屬進入實作前的風險，已由後續各 WP 的 scope gate 取代；未來 WP6–WP10 仍須各自另開 brief，不因本 closeout 自動授權。
