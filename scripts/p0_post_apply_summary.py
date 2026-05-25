"""
Generate P0 post-apply quality and validation summary.

Outputs:
  - data/p0_post_apply_summary.json
  - data/p0_post_apply_summary.md

This script compares changed nodes before/after based on:
  - backup file recorded in trial_enhancements_apply_report.json
  - current data/all_nodes.json
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from quality_check import score_description, score_node
from validate_nodes import validate_node


BASE_DIR = Path(__file__).parent.parent
DEFAULT_APPLY_REPORT = BASE_DIR / "data" / "trial_enhancements_apply_report.json"
DEFAULT_CURRENT_NODES = BASE_DIR / "data" / "all_nodes.json"
DEFAULT_JSON_OUT = BASE_DIR / "data" / "p0_post_apply_summary.json"
DEFAULT_MD_OUT = BASE_DIR / "data" / "p0_post_apply_summary.md"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate post-apply quality summary")
    parser.add_argument("--apply-report", type=Path, default=DEFAULT_APPLY_REPORT)
    parser.add_argument("--current", type=Path, default=DEFAULT_CURRENT_NODES)
    parser.add_argument("--json-out", type=Path, default=DEFAULT_JSON_OUT)
    parser.add_argument("--md-out", type=Path, default=DEFAULT_MD_OUT)
    return parser.parse_args()


def load_nodes(path: Path) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        payload = json.load(f)
    return payload.get("nodes", [])


def avg(values: list[float]) -> float:
    return round(sum(values) / max(len(values), 1), 3)


def summarize_changed_nodes(before_lookup: dict[str, dict], after_lookup: dict[str, dict], changed_ids: list[str]) -> dict:
    per_node = []
    desc_deltas = []
    total_deltas = []
    desc_improved = 0
    desc_same = 0
    desc_regressed = 0

    for nid in changed_ids:
        before_node = before_lookup.get(nid)
        after_node = after_lookup.get(nid)
        if not before_node or not after_node:
            continue

        before_desc = score_description(before_node)
        after_desc = score_description(after_node)

        before_total = score_node(before_node, before_lookup)
        after_total = score_node(after_node, after_lookup)

        desc_delta = after_desc["total"] - before_desc["total"]
        total_delta = after_total["total_score"] - before_total["total_score"]

        if desc_delta > 0:
            desc_improved += 1
        elif desc_delta == 0:
            desc_same += 1
        else:
            desc_regressed += 1

        desc_deltas.append(desc_delta)
        total_deltas.append(total_delta)
        per_node.append(
            {
                "node_id": nid,
                "before_description_score": before_desc["total"],
                "after_description_score": after_desc["total"],
                "description_delta": desc_delta,
                "before_total_score": before_total["total_score"],
                "after_total_score": after_total["total_score"],
                "total_delta": total_delta,
            }
        )

    per_node.sort(key=lambda x: (x["description_delta"], x["node_id"]))
    top_gains = sorted(per_node, key=lambda x: (-x["description_delta"], x["node_id"]))[:5]
    lowest_gains = sorted(per_node, key=lambda x: (x["description_delta"], x["node_id"]))[:5]

    return {
        "changed_count": len(per_node),
        "description_improved": desc_improved,
        "description_unchanged": desc_same,
        "description_regressed": desc_regressed,
        "description_improved_ratio": round(desc_improved / max(len(per_node), 1), 3),
        "avg_description_delta": avg(desc_deltas),
        "avg_total_delta": avg(total_deltas),
        "top_description_gains": top_gains,
        "lowest_description_gains": lowest_gains,
        "per_node": per_node,
    }


def summarize_whole_graph(after_nodes: list[dict]) -> dict:
    lookup = {n["id"]: n for n in after_nodes}
    totals = []
    desc_totals = []
    grades = Counter()

    for node in after_nodes:
        result = score_node(node, lookup)
        totals.append(result["total_score"])
        desc_totals.append(result["description"]["total"])
        grades[result["grade"]] += 1

    return {
        "node_count": len(after_nodes),
        "avg_total_score": avg(totals),
        "avg_description_score": avg(desc_totals),
        "grade_distribution": {k: grades.get(k, 0) for k in ["A", "B", "C", "D", "F"]},
    }


def summarize_validation(after_nodes: list[dict]) -> dict:
    lookup = {n["id"]: n for n in after_nodes}
    field_ids = {n["id"] for n in after_nodes if n.get("type") == "field"}

    nodes_with_errors = 0
    total_errors = 0
    total_warnings = 0
    top_errors = Counter()
    top_warnings = Counter()

    for node in after_nodes:
        errors, warnings = validate_node(node, lookup, field_ids)
        if errors:
            nodes_with_errors += 1
            for err in errors:
                top_errors[err] += 1
        for warn in warnings:
            top_warnings[warn] += 1

        total_errors += len(errors)
        total_warnings += len(warnings)

    return {
        "nodes_with_errors": nodes_with_errors,
        "total_errors": total_errors,
        "total_warnings": total_warnings,
        "top_errors": top_errors.most_common(10),
        "top_warnings": top_warnings.most_common(10),
    }


def render_markdown(report: dict) -> str:
    changed = report["changed_nodes"]
    graph = report["whole_graph_after"]
    validation = report["validation_after"]

    lines = [
        "# P0 Post-Apply Summary",
        "",
        f"- Generated at: {report['generated_at']}",
        f"- Applied nodes: {changed['changed_count']}",
        "",
        "## Changed Nodes Quality Delta",
        f"- Description improved / unchanged / regressed: {changed['description_improved']} / {changed['description_unchanged']} / {changed['description_regressed']}",
        f"- Description improved ratio: {changed['description_improved_ratio']}",
        f"- Average description delta: {changed['avg_description_delta']}",
        f"- Average total score delta: {changed['avg_total_delta']}",
        "",
        "## Whole Graph (After Apply)",
        f"- Node count: {graph['node_count']}",
        f"- Average total score: {graph['avg_total_score']} / 25",
        f"- Average description score: {graph['avg_description_score']} / 10",
        f"- Grade distribution: A={graph['grade_distribution']['A']}, B={graph['grade_distribution']['B']}, C={graph['grade_distribution']['C']}, D={graph['grade_distribution']['D']}, F={graph['grade_distribution']['F']}",
        "",
        "## Validation (After Apply)",
        f"- Nodes with errors: {validation['nodes_with_errors']}",
        f"- Total errors: {validation['total_errors']}",
        f"- Total warnings: {validation['total_warnings']}",
        "",
        "## Top Description Gains",
    ]

    for row in changed["top_description_gains"]:
        lines.append(
            f"- {row['node_id']}: desc {row['before_description_score']} -> {row['after_description_score']} (delta {row['description_delta']})"
        )

    lines.append("")
    lines.append("## Lowest Description Gains")
    for row in changed["lowest_description_gains"]:
        lines.append(
            f"- {row['node_id']}: desc {row['before_description_score']} -> {row['after_description_score']} (delta {row['description_delta']})"
        )

    return "\n".join(lines) + "\n"


def main() -> None:
    args = parse_args()

    with open(args.apply_report, "r", encoding="utf-8") as f:
        apply_report = json.load(f)

    backup_file = Path(apply_report["backup_file"])
    changed_ids = apply_report.get("apply_result", {}).get("changed_ids", [])

    before_nodes = load_nodes(backup_file)
    after_nodes = load_nodes(args.current)

    before_lookup = {n["id"]: n for n in before_nodes}
    after_lookup = {n["id"]: n for n in after_nodes}

    changed_summary = summarize_changed_nodes(before_lookup, after_lookup, changed_ids)
    graph_summary = summarize_whole_graph(after_nodes)
    validation_summary = summarize_validation(after_nodes)

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "apply_report": str(args.apply_report),
        "backup_file": str(backup_file),
        "current_file": str(args.current),
        "changed_nodes": changed_summary,
        "whole_graph_after": graph_summary,
        "validation_after": validation_summary,
    }

    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    with open(args.json_out, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    md = render_markdown(report)
    args.md_out.parent.mkdir(parents=True, exist_ok=True)
    with open(args.md_out, "w", encoding="utf-8") as f:
        f.write(md)

    print(f"Wrote JSON summary: {args.json_out}")
    print(f"Wrote Markdown summary: {args.md_out}")


if __name__ == "__main__":
    main()
