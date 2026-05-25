"""Promote latest benchmark snapshot to baseline with history entry.

Usage:
  python scripts/update_benchmark_baseline.py
  python scripts/update_benchmark_baseline.py --reason "Release 2026.05.24"
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Promote latest benchmark to baseline")
    parser.add_argument("--latest", default="docs/benchmarks/latest.json")
    parser.add_argument("--baseline", default="docs/benchmarks/baseline.json")
    parser.add_argument("--history", default="docs/benchmarks/baseline_history.jsonl")
    parser.add_argument("--reason", default="manual calibration")
    args = parser.parse_args()

    latest_path = Path(args.latest)
    baseline_path = Path(args.baseline)
    history_path = Path(args.history)

    if not latest_path.exists():
        raise SystemExit(f"latest benchmark not found: {latest_path}")

    latest = json.loads(latest_path.read_text(encoding="utf-8"))
    baseline_path.parent.mkdir(parents=True, exist_ok=True)
    baseline_path.write_text(json.dumps(latest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    history_event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "reason": args.reason,
        "source_latest": str(latest_path),
        "target_baseline": str(baseline_path),
        "latest_timestamp": latest.get("timestamp"),
        "requests": latest.get("requests"),
        "concurrency": latest.get("concurrency"),
        "graph_p95_ms": latest.get("scenarios", {}).get("graph_subgraph", {}).get("p95_ms"),
        "search_p95_ms": latest.get("scenarios", {}).get("search", {}).get("p95_ms"),
    }

    with open(history_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(history_event, ensure_ascii=False) + "\n")

    print(f"baseline_updated: {baseline_path}")
    print(f"history_appended: {history_path}")


if __name__ == "__main__":
    main()
