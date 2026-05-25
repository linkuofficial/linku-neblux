"""Benchmark regression guard for CI/nightly performance checks.

Usage:
  python scripts/benchmark_guard.py \
    --current docs/benchmarks/latest.json \
    --baseline docs/benchmarks/baseline.json \
    --max-regression-pct 30 \
    --max-graph-p95-ms 300 \
    --max-search-p95-ms 120
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def _load_json(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _get_metric(report: dict, scenario: str, metric: str) -> float:
    return float(report["scenarios"][scenario][metric])


def _regression_pct(current: float, baseline: float) -> float:
    if baseline <= 0:
        return 0.0
    return ((current - baseline) / baseline) * 100.0


def _add_violation(violations: list[dict], category: str, message: str) -> None:
    violations.append({"category": category, "message": message})


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate benchmark regression/thresholds")
    parser.add_argument("--current", required=True, help="Current benchmark JSON path")
    parser.add_argument("--baseline", default="", help="Baseline benchmark JSON path")
    parser.add_argument("--max-regression-pct", type=float, default=30.0)
    parser.add_argument("--max-graph-p95-ms", type=float, default=300.0)
    parser.add_argument("--max-search-p95-ms", type=float, default=120.0)
    parser.add_argument("--result-path", default="docs/benchmarks/latest_guard.json")
    args = parser.parse_args()

    current_path = Path(args.current)
    baseline_path = Path(args.baseline) if args.baseline else None
    result_path = Path(args.result_path)

    current = _load_json(current_path)
    baseline = _load_json(baseline_path) if baseline_path and baseline_path.exists() else None

    graph_p95 = _get_metric(current, "graph_subgraph", "p95_ms")
    search_p95 = _get_metric(current, "search", "p95_ms")
    graph_non_2xx = int(current["scenarios"]["graph_subgraph"]["non_2xx"])
    search_non_2xx = int(current["scenarios"]["search"]["non_2xx"])

    violations: list[dict] = []
    notes: list[str] = []

    if graph_non_2xx > 0:
        _add_violation(violations, "availability", f"graph_subgraph non_2xx={graph_non_2xx}")
    if search_non_2xx > 0:
        _add_violation(violations, "availability", f"search non_2xx={search_non_2xx}")

    if graph_p95 > args.max_graph_p95_ms:
        _add_violation(
            violations,
            "threshold",
            f"graph_subgraph p95_ms={graph_p95:.2f} > {args.max_graph_p95_ms:.2f}",
        )
    if search_p95 > args.max_search_p95_ms:
        _add_violation(
            violations,
            "threshold",
            f"search p95_ms={search_p95:.2f} > {args.max_search_p95_ms:.2f}",
        )

    regressions: dict[str, dict[str, float]] = {}
    if baseline:
        for scenario in ("graph_subgraph", "search"):
            regressions[scenario] = {}
            for metric in ("avg_ms", "p95_ms"):
                current_v = _get_metric(current, scenario, metric)
                base_v = _get_metric(baseline, scenario, metric)
                pct = _regression_pct(current_v, base_v)
                regressions[scenario][metric] = round(pct, 2)
                if pct > args.max_regression_pct:
                    _add_violation(
                        violations,
                        "regression",
                        f"{scenario} {metric} regression={pct:.2f}% > {args.max_regression_pct:.2f}%",
                    )
    else:
        notes.append("baseline_missing: regression comparison skipped")

    violation_summary: dict[str, int] = {}
    for item in violations:
        category = item["category"]
        violation_summary[category] = violation_summary.get(category, 0) + 1

    status = "pass" if not violations else "fail"
    result = {
        "status": status,
        "current": str(current_path),
        "baseline": str(baseline_path) if baseline_path else "",
        "max_regression_pct": args.max_regression_pct,
        "thresholds": {
            "max_graph_p95_ms": args.max_graph_p95_ms,
            "max_search_p95_ms": args.max_search_p95_ms,
        },
        "regressions": regressions,
        "violation_summary": violation_summary,
        "violations": violations,
        "notes": notes,
    }

    result_path.parent.mkdir(parents=True, exist_ok=True)
    with open(result_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"guard_status: {status}")
    if violation_summary:
        print(f"violation_summary: {violation_summary}")
    if notes:
        for note in notes:
            print(f"note: {note}")
    if violations:
        for item in violations:
            print(f"violation[{item['category']}]: {item['message']}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
