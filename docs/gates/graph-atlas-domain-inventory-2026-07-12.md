# Graph Atlas Domain Inventory Gate — 2026-07-12

狀態：PASS
來源：`data/all_nodes.json`

## 結論

Canonical graph 目前有 **687 nodes、12 個 domain codes**。Graph Atlas v2 的正式 domain inventory 固定為：

`MAT, PHY, CHE, BIO, MED, ENG, TEC, SOC, HUM, PHI, ART, HIS`

歷史 landing 曾顯示 `13 DOMAINS`，但 canonical 資料與現行 top-level field anchors 都只能支持 12；該數字視為已移除的歷史展示值，不是 schema 或產品契約。未來新增第 13 個 domain 必須走 major layout migration，不得由顯示文案反推資料分類。

## 可重現盤點

```powershell
node -e "const fs=require('fs');const a=JSON.parse(fs.readFileSync('data/all_nodes.json','utf8'));const ns=Array.isArray(a)?a:a.nodes;const c={};for(const n of ns)for(const d of n.domain||[])c[d]=(c[d]||0)+1;console.log(ns.length,Object.entries(c).sort())"
```

| Code | Nodes carrying code | Top-level anchor |
|---|---:|---|
| MAT | 213 | `mathematics_field` |
| PHY | 179 | `physics_field` |
| CHE | 126 | `chemistry_field` |
| BIO | 222 | `biology_field` |
| MED | 129 | `medicine_field` |
| ENG | 171 | `engineering_field` |
| TEC | 182 | `technology_field` |
| SOC | 262 | `social_science_field` |
| HUM | 126 | `humanities_field` |
| PHI | 227 | `philosophy_field` |
| ART | 114 | `arts_field` |
| HIS | 149 | `history_field` |

計數可重疊，因節點允許多領域；不可相加推導 node total。

## Gate assertions

- domain code set 恰為上述 12 值。
- 每個 code 都有明列的 canonical top-level field anchor。
- Mathematics／Physics 是 Main spatial nuclei；其餘十個仍有一級 domain core，非價值降級。
- 未知 domain 在 WP1 validator 中必須 fail，不可自動建立 anchor。
