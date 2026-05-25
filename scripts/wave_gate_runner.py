"""Run wave gates (schema, quality, i18n, tests, benchmark) in one command.

Usage:
  python scripts/wave_gate_runner.py --run-tests
  python scripts/wave_gate_runner.py --run-tests --benchmark-current docs/benchmarks/latest.json --benchmark-baseline docs/benchmarks/baseline.json
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
I18N_DIR = DATA_DIR / "i18n"
DEFAULT_OUTPUT_DIR = BASE_DIR / "docs" / "gates"


def _run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, capture_output=True, text=True, cwd=str(BASE_DIR))


def _load_json(path: Path) -> Any:
    with open(path, encoding="utf-8-sig") as f:
        return json.load(f)


def _safe_load_json(path: Path) -> Any | None:
    if not path.exists():
        return None
    return _load_json(path)


def _unwrap_descriptions(payload: Any) -> dict[str, str]:
    if not isinstance(payload, dict):
        return {}
    nested = payload.get("descriptions")
    if isinstance(nested, dict):
        return nested
    if "meta" in payload and "descriptions" not in payload:
        return {}
    return payload


def _check_validate_nodes() -> dict[str, Any]:
    proc = _run([sys.executable, "scripts/validate_nodes.py", "--json"])
    if proc.returncode != 0:
        return {
            "status": "fail",
            "error": "validate_nodes command failed",
            "returncode": proc.returncode,
            "stdout": proc.stdout[-4000:],
            "stderr": proc.stderr[-4000:],
        }

    # validate_nodes prints text before JSON; extract the first json object from output.
    text = proc.stdout.strip()
    start = text.find("{")
    payload = json.loads(text[start:]) if start >= 0 else {}

    errors = int(payload.get("with_errors", 0))
    duplicates = len(payload.get("duplicates", {}))
    status = "pass" if errors == 0 and duplicates == 0 else "fail"

    return {
        "status": status,
        "with_errors": errors,
        "duplicates": duplicates,
        "total": int(payload.get("total", 0)),
        "clean": int(payload.get("clean", 0)),
    }


def _check_quality(min_avg_score: float, max_df_nodes: int) -> dict[str, Any]:
    proc = _run([sys.executable, "scripts/quality_check.py", "--json"])
    if proc.returncode != 0:
        return {
            "status": "fail",
            "error": "quality_check command failed",
            "returncode": proc.returncode,
            "stdout": proc.stdout[-4000:],
            "stderr": proc.stderr[-4000:],
        }

    text = proc.stdout.strip()
    start = text.find("[")
    items = json.loads(text[start:]) if start >= 0 else []

    if not items:
        return {
            "status": "fail",
            "error": "quality_check returned empty payload",
        }

    avg = sum(float(item.get("total_score", 0)) for item in items) / len(items)
    grade_counts: dict[str, int] = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
    for item in items:
        grade = str(item.get("grade", "")).upper()
        if grade in grade_counts:
            grade_counts[grade] += 1

    df_nodes = grade_counts["D"] + grade_counts["F"]
    status = "pass" if avg >= min_avg_score and df_nodes <= max_df_nodes else "fail"

    return {
        "status": status,
        "avg_total_score": round(avg, 3),
        "min_avg_score": min_avg_score,
        "grade_distribution": grade_counts,
        "df_nodes": df_nodes,
        "max_df_nodes": max_df_nodes,
        "count": len(items),
    }


def _check_i18n(min_raw_en: float, min_raw_zh: float, min_raw_ja: float) -> dict[str, Any]:
    locales = ["en", "zh", "ja"]

    label_maps: dict[str, dict[str, str]] = {}
    for locale in locales:
        payload = _safe_load_json(I18N_DIR / f"{locale}.json")
        label_maps[locale] = payload if isinstance(payload, dict) else {}

    en_label_keys = set(label_maps["en"].keys())
    label_keyset_aligned = all(set(label_maps[locale].keys()) == en_label_keys for locale in locales)

    nodes_payload = _load_json(DATA_DIR / "all_nodes.json")
    nodes = nodes_payload.get("nodes", [])
    baseline_keys = {node.get("id") for node in nodes if node.get("id")}

    raw_desc_counts: dict[str, int] = {}
    effective_desc_counts: dict[str, int] = {}

    for locale in locales:
        raw_payload = _safe_load_json(I18N_DIR / f"{locale}_descriptions.json")
        raw_map = _unwrap_descriptions(raw_payload)
        raw_keys = set(raw_map.keys())
        raw_desc_counts[locale] = len(raw_keys)
        effective_desc_counts[locale] = len(baseline_keys | raw_keys)

    baseline_count = len(baseline_keys)
    raw_coverage = {
        locale: (raw_desc_counts[locale] / max(baseline_count, 1)) * 100.0 for locale in locales
    }
    effective_coverage = {
        locale: (effective_desc_counts[locale] / max(baseline_count, 1)) * 100.0 for locale in locales
    }

    raw_threshold_ok = (
        raw_coverage["en"] >= min_raw_en
        and raw_coverage["zh"] >= min_raw_zh
        and raw_coverage["ja"] >= min_raw_ja
    )
    effective_full_ok = all(effective_desc_counts[locale] == baseline_count for locale in locales)

    status = "pass" if label_keyset_aligned and effective_full_ok and raw_threshold_ok else "fail"

    return {
        "status": status,
        "labels_keyset_aligned": label_keyset_aligned,
        "baseline_description_keys": baseline_count,
        "raw_description_counts": raw_desc_counts,
        "effective_description_counts": effective_desc_counts,
        "raw_description_coverage_pct": {k: round(v, 2) for k, v in raw_coverage.items()},
        "effective_description_coverage_pct": {k: round(v, 2) for k, v in effective_coverage.items()},
        "raw_coverage_thresholds_pct": {
            "en": min_raw_en,
            "zh": min_raw_zh,
            "ja": min_raw_ja,
        },
    }


def _check_pytests(run_tests: bool) -> dict[str, Any]:
    if not run_tests:
        return {"status": "skipped", "reason": "run-tests disabled"}

    cmd = [sys.executable, "-m", "pytest", "tests", "-q"]
    env = os.environ.copy()
    env["PYTHONPATH"] = str(BASE_DIR).replace("\\", "/")
    proc = subprocess.run(cmd, capture_output=True, text=True, cwd=str(BASE_DIR), env=env)

    return {
        "status": "pass" if proc.returncode == 0 else "fail",
        "returncode": proc.returncode,
        "stdout_tail": proc.stdout[-2000:],
        "stderr_tail": proc.stderr[-2000:],
    }


def _check_benchmark(current: str, baseline: str) -> dict[str, Any]:
    if not current:
        return {"status": "skipped", "reason": "benchmark-current not set"}

    cmd = [
        sys.executable,
        "scripts/benchmark_guard.py",
        "--current",
        current,
        "--result-path",
        "docs/benchmarks/latest_guard.json",
    ]
    if baseline:
        cmd.extend(["--baseline", baseline])

    proc = _run(cmd)

    return {
        "status": "pass" if proc.returncode == 0 else "fail",
        "returncode": proc.returncode,
        "stdout_tail": proc.stdout[-2000:],
        "stderr_tail": proc.stderr[-2000:],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run wave gates in one shot")
    parser.add_argument("--run-tests", action="store_true", help="Run pytest tests -q as a gate")
    parser.add_argument("--benchmark-current", default="", help="Benchmark JSON path for guard")
    parser.add_argument("--benchmark-baseline", default="", help="Baseline benchmark JSON path")
    parser.add_argument("--min-avg-score", type=float, default=20.0, help="Minimum average quality score")
    parser.add_argument("--max-df-nodes", type=int, default=0, help="Max allowed D/F nodes")
    parser.add_argument("--min-raw-desc-en", type=float, default=0.0, help="Min raw EN description coverage %%")
    parser.add_argument("--min-raw-desc-zh", type=float, default=95.0, help="Min raw ZH description coverage %%")
    parser.add_argument("--min-raw-desc-ja", type=float, default=60.0, help="Min raw JA description coverage %%")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Report output folder")
    parser.add_argument("--output-prefix", default="wave_gate", help="Report filename prefix")
    args = parser.parse_args()

    checks = {
        "validate_nodes": _check_validate_nodes(),
        "quality": _check_quality(args.min_avg_score, args.max_df_nodes),
        "i18n": _check_i18n(args.min_raw_desc_en, args.min_raw_desc_zh, args.min_raw_desc_ja),
        "tests": _check_pytests(args.run_tests),
        "benchmark": _check_benchmark(args.benchmark_current, args.benchmark_baseline),
    }

    failing = [name for name, result in checks.items() if result.get("status") == "fail"]
    overall = "pass" if not failing else "fail"

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "overall": overall,
        "failing_checks": failing,
        "checks": checks,
    }

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    json_path = output_dir / f"{args.output_prefix}_{stamp}.json"
    latest_path = output_dir / "latest_wave_gate.json"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    with open(latest_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"wave_gate_overall: {overall}")
    print(f"wave_gate_json: {json_path}")
    print(f"wave_gate_latest: {latest_path}")
    if failing:
        print(f"failing_checks: {', '.join(failing)}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
