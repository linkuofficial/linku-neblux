"""
Apply enhancement review decisions to node descriptions.

This script does three things:
1. Backfill review decisions in CSV from recommendation.
2. Apply user's manual override for row 9 (accept + note).
3. Update data/all_nodes.json for accepted rows, with rollback backup.

Usage:
  python scripts/apply_enhancement_review.py
"""

from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path


BASE_DIR = Path(__file__).parent.parent
REVIEW_CSV = BASE_DIR / "data" / "trial_enhancements_review.csv"
TRIAL_JSON = BASE_DIR / "data" / "trial_enhancements.json"
NODES_JSON = BASE_DIR / "data" / "all_nodes.json"
BACKUP_DIR = BASE_DIR / "data" / "backups"
REPORT_JSON = BASE_DIR / "data" / "trial_enhancements_apply_report.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Apply reviewed enhancement candidates to all_nodes.json")
    parser.add_argument("--review", type=Path, default=REVIEW_CSV, help="Review CSV path")
    parser.add_argument("--trial", type=Path, default=TRIAL_JSON, help="Trial JSON path")
    parser.add_argument("--nodes", type=Path, default=NODES_JSON, help="all_nodes.json path")
    parser.add_argument("--report", type=Path, default=REPORT_JSON, help="Apply report output path")
    return parser.parse_args()


def read_review_rows(path: Path) -> tuple[list[dict], list[str]]:
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames or []
    return rows, fieldnames


def write_review_rows(path: Path, fieldnames: list[str], rows: list[dict]) -> None:
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def recommendation_to_decision(rec: str) -> str:
    if rec == "accept_recommended":
        return "accept"
    if rec in {"reject_missing_candidate", "reject_regressed"}:
        return "reject"
    return ""


def normalize_review(rows: list[dict]) -> dict:
    changed_decisions = 0
    changed_notes = 0

    for row in rows:
        rec = (row.get("recommendation") or "").strip()
        decision = (row.get("review_decision") or "").strip()

        if not decision:
            new_decision = recommendation_to_decision(rec)
            if new_decision:
                row["review_decision"] = new_decision
                changed_decisions += 1

    # Manual instruction from user: Row 9 accepted with note.
    for row in rows:
        if (row.get("rank") or "").strip() == "9":
            if (row.get("review_decision") or "").strip() != "accept":
                row["review_decision"] = "accept"
                changed_decisions += 1
            note = (
                "candidate addresses all three diagnostics: strengthens WHAT opening, "
                "sharpens SIGNIFICANCE framing, and explicitly names philosophy and sociology as bridge domains"
            )
            if (row.get("review_note") or "").strip() != note:
                row["review_note"] = note
                changed_notes += 1
            break

    accepted_ids = [
        (row.get("node_id") or "").strip()
        for row in rows
        if (row.get("review_decision") or "").strip().lower() == "accept"
    ]

    return {
        "changed_decisions": changed_decisions,
        "changed_notes": changed_notes,
        "accepted_ids": [nid for nid in accepted_ids if nid],
    }


def load_trial_candidates(path: Path) -> dict[str, str]:
    with open(path, "r", encoding="utf-8") as f:
        records = json.load(f)

    out = {}
    for rec in records:
        nid = rec.get("node_id")
        cand = rec.get("candidate")
        if nid and cand:
            out[nid] = cand
    return out


def backup_file(path: Path) -> Path:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = BACKUP_DIR / f"all_nodes.pre_enhancement_apply.{ts}.json"
    backup_path.write_text(path.read_text(encoding="utf-8"), encoding="utf-8")
    return backup_path


def apply_updates(nodes_path: Path, accepted_ids: list[str], candidates: dict[str, str]) -> dict:
    with open(nodes_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    nodes = payload.get("nodes", [])
    accepted_set = set(accepted_ids)
    missing = []
    changed = []

    for node in nodes:
        nid = node.get("id")
        if nid not in accepted_set:
            continue

        candidate = candidates.get(nid)
        if not candidate:
            missing.append(nid)
            continue

        old_desc = node.get("description", "")
        if old_desc != candidate:
            node["description"] = candidate
            changed.append(nid)

    with open(nodes_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    return {
        "changed_count": len(changed),
        "changed_ids": changed,
        "missing_candidates": missing,
    }


def main() -> None:
    args = parse_args()

    review_rows, fieldnames = read_review_rows(args.review)
    if not review_rows:
        raise RuntimeError("Review CSV is empty")
    if not fieldnames:
        raise RuntimeError("Review CSV has no headers")

    review_state = normalize_review(review_rows)
    write_review_rows(args.review, fieldnames, review_rows)

    candidates = load_trial_candidates(args.trial)
    backup_path = backup_file(args.nodes)
    apply_state = apply_updates(args.nodes, review_state["accepted_ids"], candidates)

    report = {
        "applied_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "review_csv": str(args.review),
        "trial_json": str(args.trial),
        "nodes_json": str(args.nodes),
        "backup_file": str(backup_path),
        "review_updates": {
            "changed_decisions": review_state["changed_decisions"],
            "changed_notes": review_state["changed_notes"],
            "accepted_count": len(review_state["accepted_ids"]),
        },
        "apply_result": apply_state,
    }

    args.report.parent.mkdir(parents=True, exist_ok=True)
    with open(args.report, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"Updated review CSV: {args.review}")
    print(f"Backup created: {backup_path}")
    print(f"Descriptions updated: {apply_state['changed_count']}")
    print(f"Apply report: {args.report}")


if __name__ == "__main__":
    main()
