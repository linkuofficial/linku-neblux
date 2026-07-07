# Wonders 遙測查詢範本（P1-3）

> 資料來源：D1 `neblux-echo` 的 `event_count` 表（**純聚合計數**，非逐事件 log）。
> 每個 `(event, tour, lang, step, is_return)` 組合一列、`count` 累加。事件：
> `start` / `step` / `finish` / `drop` / `picker_view`。
>
> **匿名保證**：無帳號、無 session id、無 IP、**無時間戳、無逐事件列、無順序**——
> 因此無法重建任一 visitor 的路徑（DIRECTION 鐵律 2）。`is_return`（wire 欄位名 `returning`）
> 是 client 端 sessionStorage 自報布林（關瀏覽器即清），伺服器只加總、不跨事件連結。
> sentinel：`picker_view` 的 `tour=''`；`start`/`picker_view` 的 `step=0`。
>
> **可信度但書**：`/api/event` 只做同源檢查、**無節流**，且 sendBeacon 允許省略 Origin，
> 故任何人都能偽造事件灌數（見 event.ts / brief 岔路）。**這些數字是參考趨勢、非可信計量**；
> 要提升可信度需日後加 Cloudflare rate-limiting 規則（`[人工]`）。
>
> 跑法：Cloudflare dashboard → D1 `neblux-echo` → **Console** 貼 SQL；或
> `npx wrangler d1 execute neblux-echo --remote --command "<SQL>"`。
> 啟用前表為空——先設 prod `VITE_TELEMETRY_ENABLED=true` 並套 schema（`functions/schema.sql`）。

## 1. 完走率（finish / start）
每趟「開始後走到最後一站」的比率。低＝hook 有效但中途流失。

```sql
SELECT
  tour,
  SUM(CASE WHEN event = 'start'  THEN count ELSE 0 END) AS starts,
  SUM(CASE WHEN event = 'finish' THEN count ELSE 0 END) AS finishes,
  ROUND(100.0 * SUM(CASE WHEN event = 'finish' THEN count ELSE 0 END)
             / NULLIF(SUM(CASE WHEN event = 'start' THEN count ELSE 0 END), 0), 1) AS finish_pct
FROM event_count
WHERE event IN ('start', 'finish') AND tour <> ''
GROUP BY tour
ORDER BY finish_pct DESC;
```

> **深連結但書**：`?w=…&s=<末站>` 直接落在最後一站也會發 `finish`（未實際走完），
> 分享連結是一級功能，故完走率會被深連結**高估**。要純算「從頭走完」需前端標記入口站——
> 本輪未做（少而精）。依語言拆：把 `GROUP BY tour` 改成 `GROUP BY tour, lang`。

## 2. hook 轉換率（start / picker_view）
看到 picker 清單後真的開始走一趟的整體比率。`picker_view` 不帶 tour（`tour=''`），
故此為**整體漏斗**（per-tour hook 歸因是有流量後的細活，見 brief 岔路 B）。

```sql
SELECT
  SUM(CASE WHEN event = 'picker_view' THEN count ELSE 0 END) AS picker_views,
  SUM(CASE WHEN event = 'start'       THEN count ELSE 0 END) AS starts,
  ROUND(100.0 * SUM(CASE WHEN event = 'start' THEN count ELSE 0 END)
             / NULLIF(SUM(CASE WHEN event = 'picker_view' THEN count ELSE 0 END), 0), 1) AS convert_pct
FROM event_count
WHERE event IN ('picker_view', 'start');
```

> 深連結（`?w=…`）直接進 tour、不經 picker，也算一次 start，故轉換率可能 >100%。

## 3. 回墜率（returning start 佔比）
黏著訊號：看過一趟後，同 session 又開第二趟的比率。

```sql
SELECT
  SUM(CASE WHEN is_return = 1 THEN count ELSE 0 END) AS returning_starts,
  SUM(count)                                         AS total_starts,
  ROUND(100.0 * SUM(CASE WHEN is_return = 1 THEN count ELSE 0 END)
             / NULLIF(SUM(count), 0), 1) AS returning_pct
FROM event_count
WHERE event = 'start';
```

## 4. 棄坑分佈（drop by step）
每趟在哪一站流失最多——直接指出敘事斷點。

```sql
SELECT
  tour, step,
  SUM(count) AS drops
FROM event_count
WHERE event = 'drop'
GROUP BY tour, step
ORDER BY tour, drops DESC;
```

## 時間趨勢與保存
`event_count` 是**有界的聚合表**（列數 = 事件×趟×語言×站 的組合數，不隨流量成長），
無需保存策略、無需裁剪。**代價：沒有時間維度**——無法直接查「上週 vs 本週」。
要做時間趨勢（Phase 3「數據信用」的長期素材），週期性地把整表 **離線快照**（附當日日期）後
再比較快照間的差值即可。純聚合快照仍守匿名鐵律。
