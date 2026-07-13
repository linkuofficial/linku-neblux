# Graph Atlas Main Layout v1 Blessing Gate

日期：2026-07-12
狀態：accepted / blessing commit authorized
對應 brief：`docs/tasks/2026-07-12-graph-atlas-wp2-stable-layout.md`

## Artifact identity

- Main lock：`config/atlas/layout/main.json`
- Main SHA-256：`0626729525b7139e1b23c490504160f7aa868fb7ff9cb8317f8260c0011049d5`
- Baseline：`config/atlas/layout-baselines/main-v1.json`
- Baseline SHA-256：`faf593dc691f1f574d5389f55f12ed789ed330133b6a5dcb4323288ff57bc9d9`
- Layout version：`main-2.0.0`
- Solver version：`main-anchored-1.0.0`
- Node：`24.16.0`（lock envelope 記錄 major 24）
- d3：`7.9.0`（既有 dependency，WP2 未新增 production dependency）
- Nodes：687
- Active unordered pairs：3,138
- Overlaps：0

## Convergence telemetry

Main v1 定義為達到下列數值 gate 的 deterministic snapshot；不是未證明的「視覺上大概穩定」。

| Metric | Result | Gate | Verdict |
|---|---:|---:|---|
| Ticks | 520 | fixed | pass |
| Tail window | 20 | fixed | pass |
| Max step in tail | 0.002253 | <= 0.01 | pass |
| Final kinetic energy | 0.000021 | <= 0.001 | pass |
| Final max speed | 0.001689 | <= 0.01 | pass |

## Domain-by-domain review

Drift 是相對 Main layout width 的 normalized centroid distance。未來警報以各域 blessed value + 0.10 判定，不使用單一全域絕對門檻。

| Domain | Blessed drift | Local verdict |
|---|---:|---|
| ART | 0.189679 | accept |
| BIO | 0.242778 | accept |
| CHE | 0.157593 | accept |
| ENG | 0.192262 | accept |
| HIS | 0.289237 | accept; current maximum, retain as known calibration watchpoint |
| HUM | 0.117966 | accept |
| MAT | 0.150327 | accept |
| MED | 0.132222 | accept |
| PHI | 0.212348 | accept |
| PHY | 0.037678 | accept |
| SOC | 0.166086 | accept |
| TEC | 0.153798 | accept |

## Visual decision

- 12 domain regions remain distinguishable in the throwaway full-layout preview.
- MAT／PHY dual nuclei remain visually legible and fixed at their configured hard-anchor coordinates.
- No domain consumes the whole canvas; MED remains bounded.
- Current decision：accept Main v1 as the stable spatial baseline. WP5 renderer integration may calibrate presentation, but must not silently rebake these locks.

## Contract decisions locked by this gate

- Local add consumes only `projectTopology()` active unordered pairs. Pending-only records do not create neighbours; reverse semantic records do not multiply springs.
- Anchor and neighbour positions are normalized before deterministic jitter is applied as an offset.
- `new` exists only in proposals; persisted locks use `soft`.
- Main locks fingerprint node id + sorted domains + type, and carry schema／renderer／solver／algorithm／toolchain envelope fields.
- Missing debt baseline is `NO_BASELINE` and non-zero, never current-as-baseline.
- Wonder context placement remains blocked until the centroid-aware WP7 algorithm has fixtures and approval.
- Wonder step insertion／removal requires explicit `--accept-spine-reflow`, a patch version bump, full diff output, and human review.
- Lock writes use same-directory temp + fsync + parse/schema validation + rename, with symlink and realpath escape rejection.

## Known aesthetic debt and follow-up boundary

- HIS has the largest accepted centroid drift. It is not a current migration trigger, but its per-domain baseline must remain visible in future debt reports.
- Celestial classification remains proposal-only. WP3 must define `classificationVersion` and an unknown-value fallback before consuming it.
- Wonder context layout is intentionally unavailable, not silently approximated.
- Runtime still renders the existing production layout. This gate authorizes no engine, Vite, build, or deployment cutover.
- Repository commit and push were explicitly authorized by Riku after the local blessing passed.

## Verification record

- `npm run test:atlas`：30 passed.
- `npm run atlas:validate`：PASS, 687 nodes／3,381 records／3,138 active pairs／4 schemas.
- `npm run atlas:layout:check`：PASS, 687 nodes／19 Wonders／0 overlaps.
- `npm run atlas:layout:debt`：READY, no reasons, `recommendMigration:false`.
- Deterministic blessing command：`npm run atlas:layout:bless -- --replace-v1 --write`.
