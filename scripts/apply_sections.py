#!/usr/bin/env python3
"""Apply structured `sections` to nodes in all_nodes.json.

Input JSON: { node_id: {lead, core?, impact?, links:[{d:DOMAIN_CODE, t:text}]}, ... }

For each node we:
  1. store the structured object on node["sections"] (UI reads this in English), and
  2. regenerate the flat node["description"] from the sections, in the canonical
     "In <Domain>, ..." prose form, so full-text search / SEO / quality_check keep
     working on a clean, complete description (no stale truncated text).

Backs up all_nodes.json before writing. Run:
    python scripts/apply_sections.py data/_sections_batchN.json
"""
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NODES = ROOT / "data" / "all_nodes.json"

EN_NAME = {
    "MAT": "mathematics", "PHY": "physics", "CHE": "chemistry", "BIO": "biology",
    "MED": "medicine", "ENG": "engineering", "TEC": "technology", "SOC": "social science",
    "HUM": "the humanities", "PHI": "philosophy", "ART": "the arts", "HIS": "history",
}


def reconstruct(sec):
    parts = [sec["lead"].strip()]
    if sec.get("core"):
        parts.append(sec["core"].strip())
    if sec.get("impact"):
        parts.append(sec["impact"].strip())
    for w in sec.get("works", []):
        w = w.strip()
        if w:
            parts.append(w if w.endswith((".", "!", "?")) else w + ".")
    for l in sec.get("links", []):
        name = EN_NAME.get(l["d"], l["d"])
        # Capitalize the leader to start a clean sentence: "In technology, ..."
        parts.append(f"In {name}, {l['t'].strip()}")
    return " ".join(p for p in parts if p)


def main():
    if len(sys.argv) != 2:
        print("usage: python scripts/apply_sections.py <sections.json>")
        sys.exit(2)
    inp = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))

    data = json.loads(NODES.read_text(encoding="utf-8"))
    nodes = data["nodes"] if isinstance(data, dict) else data
    by_id = {n["id"]: n for n in nodes}

    backup = NODES.parent / f"all_nodes_backup_sections_{time.strftime('%Y%m%d_%H%M%S')}.json"
    backup.write_text(NODES.read_text(encoding="utf-8"), encoding="utf-8")
    print(f"backup: {backup.name}")

    applied, skipped = 0, []
    for nid, sec in inp.items():
        n = by_id.get(nid)
        if not n:
            skipped.append((nid, "missing"))
            continue
        if "lead" not in sec or not sec.get("links"):
            skipped.append((nid, "no lead/links"))
            continue
        desc = reconstruct(sec)
        wc = len(desc.split())
        # Sections render collapsed (only the lead shows until clicked), so the
        # old single-paragraph 250 ceiling is relaxed; 360 keeps content bounded.
        if not (50 <= wc <= 360):
            skipped.append((nid, f"{wc} words out of range"))
            continue
        n["sections"] = sec
        n["description"] = desc
        applied += 1

    NODES.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"applied: {applied}   skipped: {len(skipped)}")
    for nid, why in skipped:
        print(f"  SKIPPED {nid}: {why}")


if __name__ == "__main__":
    main()
