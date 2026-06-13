"""Apply a {node_id: new_description} map to data/all_nodes.json (id-keyed, safe).

Used by the description-upgrade workflow: an agent writes a batch of rewritten
English descriptions to a JSON file `{ "node_id": "new text", ... }`, then runs:

    python scripts/apply_desc_rewrites.py data/_rewrites_batchN.json

Safety:
- Backs up all_nodes.json (timestamped) BEFORE writing.
- Word-count guard: descriptions outside [50, 250] words are SKIPPED (not
  applied) and reported, so validate_nodes.py stays green.
- Unknown node ids are reported and cause a non-zero exit (nothing is half-applied
  silently — the backup lets you roll back).
- Writes via nodus_utils.save_nodes (atomic, indent=2, ensure_ascii=False —
  matches the existing file format, so the diff is value-only).
"""
import json
import sys
from pathlib import Path

from nodus_utils import (
    DEFAULT_NODES_FILE,
    backup_file,
    build_node_lookup,
    load_nodes,
    save_nodes,
    word_count,
)

MIN_WORDS, MAX_WORDS = 50, 250


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python scripts/apply_desc_rewrites.py <rewrites.json>")
        return 2
    rewrites_path = Path(sys.argv[1])
    rewrites = json.loads(rewrites_path.read_text(encoding="utf-8"))
    if not isinstance(rewrites, dict) or not rewrites:
        print("error: rewrites file must be a non-empty {id: description} object")
        return 2

    data = load_nodes()
    lookup = build_node_lookup(data["nodes"])

    applied, skipped, missing = [], [], []
    for nid, new_desc in rewrites.items():
        if nid not in lookup:
            missing.append(nid)
            continue
        wc = word_count(new_desc)
        if wc < MIN_WORDS or wc > MAX_WORDS:
            skipped.append((nid, wc))
            continue
        lookup[nid]["description"] = new_desc.strip()
        applied.append((nid, wc))

    if missing:
        print(f"[ABORT] {len(missing)} unknown node id(s); nothing written:")
        for nid in missing:
            print(f"  - {nid}")
        return 1

    backup = backup_file(DEFAULT_NODES_FILE, prefix="desc")
    save_nodes(data)

    wcs = [wc for _, wc in applied]
    print(f"backup: {backup.name}")
    print(f"applied: {len(applied)}   skipped (out of {MIN_WORDS}-{MAX_WORDS} words): {len(skipped)}")
    if wcs:
        print(f"applied word counts: min {min(wcs)}  max {max(wcs)}  avg {sum(wcs)//len(wcs)}")
    for nid, wc in skipped:
        print(f"  SKIPPED {nid}: {wc} words (out of range)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
