# Wonders Tour 創作守則

> 新增或修改 tour 前必讀。品質底線不可妥協：一趟壞 tour 對產品的傷害大於零趟。

## 什麼時候寫新 tour

機會型工作，不為衝量而寫。一趟 tour 的成本是「三語各自原生打磨」，不是翻譯。沒把握達到現有 19 趟的水準就不要動筆。

## 檔案與 schema

位置：`data/wonders/<id>.json`（id = kebab-case 檔名）

```jsonc
{
  "id": "light",
  "accent": "PHY",                    // 單一域色代碼，見 neblux-tokens.js DOMAIN_COLORS
  "title":  { "en": "...", "zh": "...", "ja": "..." },
  "intro":  { "en": "...", "zh": "...", "ja": "..." },   // picker 卡片文案
  "steps": [                          // 6–8 站
    {
      "ref": "optics_concept",        // 必須存在於 data/all_nodes.json（先 grep 驗證）
      "hook":     { "en": "...", "zh": "...", "ja": "..." },  // 必填
      "reveal":   { "en": "...", "zh": "...", "ja": "..." },  // 必填
      "example":  { "en": "...", "zh": "...", "ja": "..." },  // 可省，省了整塊自動隱藏
      "surprise": { "en": "...", "zh": "...", "ja": "..." },  // 可省
      "thread":   { "en": "...", "zh": "...", "ja": "..." }   // 必填；最後一站的 thread = 收尾句
    }
  ],
  "edges": [                          // 骨幹：站與站的連線
    { "source": "optics_concept", "target": "electromagnetic_theory_concept",
      "relation_type": "conceptual" } // ∈ logical|applied|conceptual|historical|causal
  ],
  "outward": { "en": "...", "zh": "...", "ja": "..." },  // 結尾延伸建議
  "reflect": {                          // 選填；P2-1 旅程紀錄產物的反思提問，省略則列印頁 fallback 到 outward
    "en": ["...?", "...?"],             // 每語 2–3 題，開放式問句
    "zh": ["...？", "...？"],
    "ja": ["...？", "...？"]
  }
}
```

## 每個 beat 的工藝標準

- **hook**：一個製造認知缺口的問題。從日常可感的畫面出發（積水、氣球、麵包價格），結尾必須是問號。禁止「你知道嗎」式陳腔。
- **reveal**：直接回答 hook。平實語言，出現術語必須當場用一句白話定義。這是最長的一塊。
- **example**：一個讀者今天就摸得到的例子（手機相機、遙控器、條碼機）。
- **surprise**：反直覺的轉折，**全 tour 的傳播資產**。必須是可查證的事實——不確定就不寫，寧缺勿假。
- **thread**：一句話把讀者推向下一站，留下新的缺口。
- **reflect**（選填）：走完 tour 後的反思提問，出現在旅程紀錄列印頁（`wonders.html?w=<id>&print=1`）供學習者／老師印下帶走。每語 2–3 題、開放式問句，邀讀者把這趟連回自己的思考——不是事實記憶的測驗題、不是是非題。省略時列印頁自動 fallback 顯示 `outward` 散文，因此它是純加值、不寫也不會壞。三語同樣是原生重寫非逐句翻譯，zh 一律繁體。
- 語態：第二人稱、對「聰明但非本科的朋友」說話。完整規範見 `brand-voice.md`。

## 三語規則

- zh 與 ja 是**原生重寫**，不是逐句翻譯——允許換比喻、換語序，保留事實與結構。
- zh 一律繁體。完成後跑 `python scripts/check_simplified.py` 與 `python scripts/check_i18n_chars.py`。
- 拿不準 ja 自然度時，向使用者標註「建議母語者過目」，不要硬上。

## 新 tour 上線 checklist（漏一項就是壞版本）

1. [ ] 每個 `steps[].ref` 都存在於 `data/all_nodes.json`（grep 每個 id）。
2. [ ] `frontend/src/wonders-main.js` 的 `WONDER_IDS` 加入新 id。
3. [ ] `tests/e2e/wonders.spec.ts` 的 `toHaveCount(19)` 改成新數量。
4. [ ] 全部三語欄位齊備（缺一語會 fallback en，體驗劣化）。
5. [ ] `npm run build` 後確認 `dist/data/wonders/<id>.json` 存在。
6. [ ] 若 build 已產出 tour-index / og stub（見 ROADMAP P0-2、P0-3），確認重新生成含新 tour。
7. [ ] `npm run test:e2e` 全綠。
8. [ ] 自測：走完整趟，每站問自己「hook 的問題,reveal 有沒有真的回答？」
