"""
Export trial enhancement results into review-friendly artifacts.

Inputs:
  - data/trial_enhancements.json

Outputs:
  - data/trial_enhancements_review.csv
  - data/trial_enhancements_review.md

Usage:
  python scripts/export_enhancement_review.py
  python scripts/export_enhancement_review.py --input data/trial_enhancements.json
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


BASE_DIR = Path(__file__).parent.parent
DEFAULT_INPUT = BASE_DIR / "data" / "trial_enhancements.json"
DEFAULT_CSV = BASE_DIR / "data" / "trial_enhancements_review.csv"
DEFAULT_MD = BASE_DIR / "data" / "trial_enhancements_review.md"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export enhancement review sheets")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Trial enhancement JSON file")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV, help="Output CSV path")
    parser.add_argument("--md", type=Path, default=DEFAULT_MD, help="Output Markdown path")
    return parser.parse_args()


def recommendation(item: dict) -> str:
    errs = item.get("errors", [])
    delta = item.get("delta_description_score")
    wc = item.get("candidate_word_count")
    candidate = item.get("candidate")

    if not candidate:
        return "reject_missing_candidate"
    if errs:
        return "needs_check_errors"
    if wc is None or wc < 50 or wc > 100:
        return "needs_check_wordcount"
    if delta is None:
        return "needs_manual_review"
    if delta >= 1:
        return "accept_recommended"
    if delta == 0:
        return "manual_tie_break"
    return "reject_regressed"


def short_text(text: str, max_len: int = 180) -> str:
    if not text:
        return ""
    text = " ".join(text.split())
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


def load_items(input_file: Path) -> list[dict]:
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("Input JSON must be a list of trial records")
    return data


def export_csv(items: list[dict], out_file: Path) -> None:
    out_file.parent.mkdir(parents=True, exist_ok=True)

    columns = [
        "rank",
        "node_id",
        "label",
        "domain",
        "original_score",
        "candidate_score",
        "delta_score",
        "candidate_word_count",
        "recommendation",
        "review_decision",
        "review_note",
        "diagnostics",
        "original_description",
        "candidate_description",
    ]

    with open(out_file, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        for item in items:
            writer.writerow(
                {
                    "rank": item.get("rank"),
                    "node_id": item.get("node_id"),
                    "label": item.get("label"),
                    "domain": ",".join(item.get("domain", [])),
                    "original_score": item.get("original_description_score"),
                    "candidate_score": item.get("candidate_description_score"),
                    "delta_score": item.get("delta_description_score"),
                    "candidate_word_count": item.get("candidate_word_count"),
                    "recommendation": recommendation(item),
                    "review_decision": "",  # fill by reviewer: accept/reject/revise
                    "review_note": "",
                    "diagnostics": " | ".join(item.get("diagnostics", [])),
                    "original_description": item.get("original_description", ""),
                    "candidate_description": item.get("candidate", ""),
                }
            )


def export_markdown(items: list[dict], out_file: Path) -> None:
    out_file.parent.mkdir(parents=True, exist_ok=True)

    total = len(items)
    accept_rec = sum(1 for x in items if recommendation(x) == "accept_recommended")
    manual = sum(1 for x in items if recommendation(x) in {"manual_tie_break", "needs_manual_review"})
    needs_check = sum(
        1
        for x in items
        if recommendation(x)
        in {"needs_check_errors", "needs_check_wordcount", "reject_missing_candidate", "reject_regressed"}
    )

    lines = [
        "# Trial Enhancement Review Sheet",
        "",
        "## Summary",
        f"- Total records: {total}",
        f"- Accept recommended: {accept_rec}",
        f"- Manual tie/review: {manual}",
        f"- Needs check/reject: {needs_check}",
        "",
        "## Review Guide",
        "- Use CSV for final decision tracking.",
        "- review_decision: accept / reject / revise",
        "- Prioritize rows with recommendation=manual_tie_break for human judgment.",
        "",
        "## Rows",
        "| rank | node_id | delta | recommendation | diagnostics | original (short) | candidate (short) |",
        "| --- | --- | ---: | --- | --- | --- | --- |",
    ]

    for item in items:
        lines.append(
            "| {rank} | {node_id} | {delta} | {rec} | {diag} | {orig} | {cand} |".format(
                rank=item.get("rank", ""),
                node_id=item.get("node_id", ""),
                delta=item.get("delta_description_score", ""),
                rec=recommendation(item),
                diag=short_text("; ".join(item.get("diagnostics", [])), 90),
                orig=short_text(item.get("original_description", ""), 120),
                cand=short_text(item.get("candidate", ""), 120),
            )
        )

    with open(out_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def main() -> None:
    args = parse_args()
    items = load_items(args.input)
    export_csv(items, args.csv)
    export_markdown(items, args.md)
    print(f"Wrote CSV review sheet: {args.csv}")
    print(f"Wrote Markdown review sheet: {args.md}")


if __name__ == "__main__":
    main()
