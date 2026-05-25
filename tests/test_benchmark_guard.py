import json
import subprocess
import sys
from pathlib import Path


def _write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def test_benchmark_guard_emits_violation_categories(tmp_path: Path) -> None:
    baseline = {
        "scenarios": {
            "graph_subgraph": {"p95_ms": 100, "avg_ms": 80, "non_2xx": 0},
            "search": {"p95_ms": 50, "avg_ms": 30, "non_2xx": 0},
        }
    }
    current = {
        "scenarios": {
            "graph_subgraph": {"p95_ms": 220, "avg_ms": 160, "non_2xx": 1},
            "search": {"p95_ms": 130, "avg_ms": 70, "non_2xx": 0},
        }
    }

    baseline_path = tmp_path / "baseline.json"
    current_path = tmp_path / "current.json"
    result_path = tmp_path / "guard.json"
    _write_json(baseline_path, baseline)
    _write_json(current_path, current)

    completed = subprocess.run(
        [
            sys.executable,
            "scripts/benchmark_guard.py",
            "--current",
            str(current_path),
            "--baseline",
            str(baseline_path),
            "--max-regression-pct",
            "35",
            "--max-graph-p95-ms",
            "200",
            "--max-search-p95-ms",
            "120",
            "--result-path",
            str(result_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert completed.returncode == 1
    result = json.loads(result_path.read_text(encoding="utf-8"))
    assert result["status"] == "fail"
    assert result["violation_summary"]["availability"] >= 1
    assert result["violation_summary"]["threshold"] >= 1
    assert result["violation_summary"]["regression"] >= 1

    categories = {item["category"] for item in result["violations"]}
    assert {"availability", "threshold", "regression"}.issubset(categories)
