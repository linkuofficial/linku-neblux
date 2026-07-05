# Playbook：修改 Wonders tour 資料（data/wonders/*.json）

> 2026-07-06 建。適用：修改**既有** tour 的內容。新增 tour 請直接走 `../tour-authoring.md` 的「新 tour 上線 checklist」，不是本檔。
> schema、beat 工藝標準、三語規則的單一來源是 `../tour-authoring.md`，本檔只管操作流程，不重複其內容。

## 事前判斷（先過這關才能動手）

- [ ] 這次只是改**內容**（文案、事實修正、ref/edge 調整），不是改 **JSON 欄位結構**。
      結構變更＝強制交叉審查路徑（見 AGENTS.md「30 秒硬規則」）：停下，先寫 brief。
- [ ] 已重讀 `../tour-authoring.md`（beat 標準）與 `../brand-voice.md`（語氣）。

## 修改步驟

- [ ] 若動到 `steps[].ref` 或 `edges` 的 source/target：先 grep `data/all_nodes.json` 確認每個 id 存在。
- [ ] 修改文案。`surprise` 必須是可查證的事實——不確定就不寫，寧缺勿假。
- [ ] 三語齊備：en/zh/ja 三欄都要改到（zh/ja 是原生重寫，不是逐句翻譯；缺一語會 fallback en，體驗劣化）。
- [ ] zh 一律繁體，改完跑：
      `python scripts/check_simplified.py`
      `python scripts/check_i18n_chars.py`
- [ ] 拿不準 ja 自然度 → 在 brief/HANDOFF 標「建議母語者過目」，不要硬上。

## 驗證

- [ ] `npm run verify`（= build + E2E）全過。
- [ ] 確認 `dist/data/wonders/<id>.json` 已含這次修改。
- [ ] `npm run dev` 實走該 tour 改過的每一站，用頁面語言切換鈕把 EN／中文／日文**三語各看一遍**。

## 收尾

- [ ] 不確定的事實或規格 → 寫進 brief 的 Questions 區，禁止猜。
- [ ] HANDOFF 已填；有新決策記台帳。
