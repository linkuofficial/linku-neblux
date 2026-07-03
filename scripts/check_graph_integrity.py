#!/usr/bin/env python3
"""Structural integrity screen for data/all_nodes.json.

Catches issues that the content QA scripts don't: broken edges (connection
targets that aren't real nodes), duplicate ids, self-loops, duplicate
connections within a node, and invalid type/domain/relation_type values.

Broken edges are skipped by both the build-time layout baker
(frontend/src/engine/layout.js) and the runtime edge builder
(frontend/src/app-main.js), so they don't crash — but they silently drop
intended connections. See docs/archive/graph-integrity-findings.md.

Usage:  python scripts/check_graph_integrity.py
Exit 1 if any hard error (dup id / self-loop / invalid enum / missing field).
Broken edges are reported as WARN (non-fatal) since they're roadmap-dependent.
"""
import json
import os
import sys
from collections import Counter

VALID_DOMAIN = {"MAT", "PHY", "CHE", "BIO", "MED", "ENG",
                "TEC", "SOC", "HUM", "PHI", "ART", "HIS"}
VALID_RELATION = {"logical", "historical", "applied", "conceptual", "causal"}
VALID_TYPE = {"concept", "field", "person", "event"}
REQUIRED = ("id", "label", "type", "domain", "connections")


def main():
    path = os.path.join("data", "all_nodes.json")
    nodes = json.load(open(path, encoding="utf-8"))["nodes"]
    idset = {n["id"] for n in nodes}

    errors, warns = [], []

    dup = [k for k, v in Counter(n["id"] for n in nodes).items() if v > 1]
    if dup:
        errors.append(f"duplicate node ids: {dup}")

    broken = {}            # target -> [source ids]
    for n in nodes:
        nid = n.get("id", "?")
        for f in REQUIRED:
            if f not in n or (f != "connections" and not n[f]):
                errors.append(f"{nid}: missing required field '{f}'")
        if n.get("type") not in VALID_TYPE:
            errors.append(f"{nid}: invalid type {n.get('type')!r}")
        for dm in (n.get("domain") if isinstance(n.get("domain"), list) else [n.get("domain")]):
            if dm not in VALID_DOMAIN:
                errors.append(f"{nid}: invalid domain {dm!r}")
        seen = set()
        for c in n.get("connections", []):
            t = c.get("target")
            if c.get("relation_type") not in VALID_RELATION:
                errors.append(f"{nid}: invalid relation_type {c.get('relation_type')!r}")
            if t == nid:
                errors.append(f"{nid}: self-loop")
            if t in seen:
                errors.append(f"{nid}: duplicate connection to {t}")
            seen.add(t)
            if t not in idset:
                broken.setdefault(t, []).append(nid)

    if broken:
        total = sum(len(v) for v in broken.values())
        warns.append(f"{total} broken edges to {len(broken)} missing targets "
                     f"(see docs/archive/graph-integrity-findings.md)")

    print(f"graph integrity: {len(errors)} ERROR, {len(warns)} WARN  "
          f"({len(nodes)} nodes)")
    for w in warns:
        print("  WARN:", w)
    for e in errors:
        print("  ERROR:", e)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
