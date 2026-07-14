# 現有四頁裁決清單(Phase A 阻斷項)

裁決人:凜空。四頁全數裁決完成前,不進 Phase B。
每頁三擇一:**公開**(補齊發布前提後上線)/**返工**(列入返工清單,排程另議)/**封存**(保留原始碼,不對外)。

**四頁裁決已於 2026-07-12 完成,全數「公開」。manifest 已同步更新(`status:live`／`review_status:published`／`public:true`)。Phase A 阻斷項解除,可進 Phase B。**

> 注：manifest 的 `public:true` 是發布治理旗標。Depth build integration 已接上 `npm run build`、sitemap 與同源 `/depth/{id}.html` 產物，並通過 build-contract／E2E 守門；目前工作樹仍待凜空裁決與正式部署，且尚未加入首頁／圖譜的正式導覽入口。正式部署與搜尋引擎提交前，claim-source 技術債仍應依 BACKLOG 處理。

---

## 逐頁檢核表(每頁複製一份)

### 頁面:sine-wave

| 檢核項 | 狀態 | 備註 |
|---|---|---|
| 凜空內容複核 | ☑ 已完成 | 2026-07-12 |
| claim-source 表 | ☐ 無 | 公開裁決已接受技術債；正式流量擴大前補齊(見 BACKLOG.md) |
| 語域符合可及性分層(第一層零先備) | ☑ 是 | 內容範圍極小(單一正弦三參數),語域風險低 |
| no-JS 完整可讀 | ☑ 是 | |
| 無障礙快檢(鍵盤/對比/reduced-motion) | ☑ 過 | |
| Wonders/graph 銜接(引用 all_nodes 既有 id) | ☑ 有 | `oscillations_and_waves_concept` |
| manifest `review_status` 更新 | ☑ 已更新 | `published` |

**裁決:☑ 公開**
理由:一般測試通過,範圍小、風險低。
後續動作:claim-source 表列技術債補齊;build integration 已完成，正式部署／導覽入口另待裁決。

---

### 頁面:fourier-series

| 檢核項 | 狀態 | 備註 |
|---|---|---|
| 凜空內容複核 | ☑ 已完成 | 2026-07-12 |
| claim-source 表 | ☐ 無 | 公開裁決已接受技術債；正式流量擴大前補齊(見 BACKLOG.md) |
| 語域符合可及性分層(第一層零先備) | ☑ 是 | |
| no-JS 完整可讀 | ☑ 是 | |
| 無障礙快檢(鍵盤/對比/reduced-motion) | ☑ 過 | |
| Wonders/graph 銜接(引用 all_nodes 既有 id) | ☑ 有 | `fourier_analysis_concept` |
| manifest `review_status` 更新 | ☑ 已更新 | `published` |

**裁決:☑ 公開**
理由:一般測試通過。
後續動作:claim-source 表列技術債補齊;build integration 已完成，正式部署／導覽入口另待裁決。

---

### 頁面:s-plane

| 檢核項 | 狀態 | 備註 |
|---|---|---|
| 凜空內容複核 | ☑ 已完成(一般測試) ☐ 逐行公式對照課本(notes 標註的 hard blocker) | **逐行對照未做**,凜空知情接受此風險 |
| claim-source 表 | ☐ 無 | 公開裁決已接受技術債；正式流量擴大前補齊(見 BACKLOG.md) |
| 語域符合可及性分層(第一層零先備) | ☑ 是 | |
| no-JS 完整可讀 | ☑ 是 | |
| 無障礙快檢(鍵盤/對比/reduced-motion) | ☑ 過 | |
| Wonders/graph 銜接(引用 all_nodes 既有 id) | ☑ 有 | `control_theory_concept` |
| manifest `review_status` 更新 | ☑ 已更新 | `published` |

**裁決:☑ 公開**
理由:凜空判斷可先上線,承認較複雜、後續會再修。
**已知風險(明記,非疏漏)**:此頁 notes(`depth/s-plane-notes.md`)與 M2 brief(`docs/tasks/2026-07-09-depth-layer-m2.md`)都把「凜空逐行對照自己控制理論課本核對每條公式」訂為 hard blocker,非五分鐘體感測試可取代。這項尚未完成即公開,是本次裁決明確接受的風險,列入 BACKLOG.md。若日後核對發現公式誤植,應優先處理(此頁是凜空核心學術線)。
後續動作:凜空找時間逐行核對公式;claim-source 表補齊;build integration 已完成，正式部署／導覽入口另待裁決。

---

### 頁面:transformer

| 檢核項 | 狀態 | 備註 |
|---|---|---|
| 凜空內容複核 | ☑ 已完成 | 2026-07-12 |
| claim-source 表 | ☐ 無 | 公開裁決已接受技術債；正式流量擴大前補齊(見 BACKLOG.md) |
| 語域符合可及性分層(第一層零先備) | ☑ 是 | 簡化(v=k、常數 Q/K/V)於頁內誠實揭露 |
| no-JS 完整可讀 | ☑ 是 | |
| 無障礙快檢(鍵盤/對比/reduced-motion) | ☑ 過 | |
| Wonders/graph 銜接(引用 all_nodes 既有 id) | ☑ 有 | `deep_learning_concept` |
| manifest `review_status` 更新 | ☑ 已更新 | `published` |

**裁決:☑ 公開**
理由:凜空判斷可先上線,承認較複雜、後續會再修。內容範圍誠實揭露(單頭、v=k、無位置編碼等),數學自檢通過。
後續動作:claim-source 表補齊;build integration 已完成，正式部署／導覽入口另待裁決。範圍控制事故另見下節。

---

## 已知特別處置:transformer 頁

背景:M2 brief 明訂「不順手做第 4 頁」,此頁仍出現於工作樹——除內容裁決外,需作為**範圍控制事故**記錄回 M2 brief。
內容面預設傾向(供裁決參考,非結論):Transformer 主題屬紅海區(英文互動在位者:Polo Club Transformer Explainer、BertViz 等),不具旗艦價值;合理選項為 (a) 封存,(b) 降級為圖譜節點的輔助脈絡頁(不投推廣資源),(c) 返工為可及性分層的第一批標準頁。裁決時一併回答:此頁是否完成凜空複核?

**2026-07-12 裁決結果:公開(非上述三個預設選項,凜空選擇直接公開)。** 範圍控制事故本身已記錄於 `docs/tasks/2026-07-09-depth-layer-m2.md` 補記段落;紅海市場定位不影響此次公開裁決,留供未來是否投入推廣資源時參考。

## 裁決完成後

1. ☑ 四頁的 `review_status` 依裁決寫入 manifest(`published` / `pending_rework` / `archived`)。**2026-07-12 完成:四頁皆 `published`。**
2. 「想到的點子丟 backlog」規則重申:任何新頁構想先寫入 `BACKLOG.md`,不直接開工作樹。
3. 本清單存檔於 `/retros/2026-07-12-triage.md`。（已完成——本次裁決記錄已於 2026-07-13 存檔至該檔,本檔為當時工作副本,持續更新。）
