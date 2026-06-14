#!/usr/bin/env python3
"""Structural-parity QA for translated locale sections vs the English source.

Usage:  python scripts/check_locale_sections.py <locale> [id1,id2,...]

For each checked node the translated entry must:
  - exist and have a non-empty 'lead'
  - have a 'lead' that actually contains CJK characters (i.e. was translated)
  - match the English source's structure: core present iff English has core,
    impact present iff English has impact, same works length, and an identical
    sequence of links[].d domain codes (translators keep codes, translate only t).

The English source is read from data/all_nodes.json's `sections` field. This does
NOT score prose quality (the English W/S/B keyword check is English-only); prose
quality is spot-checked by reading.
"""
import json
import os
import re
import sys

CJK = re.compile(r"[぀-ヿ㐀-鿿]")  # hiragana, katakana, CJK ideographs


def load_bom_safe(path):
    with open(path, "rb") as f:
        return json.loads(f.read().decode("utf-8-sig"))


def main():
    if len(sys.argv) < 2:
        print("usage: check_locale_sections.py <locale> [id1,id2,...]")
        sys.exit(1)
    locale = sys.argv[1]
    ids = sys.argv[2].split(",") if len(sys.argv) > 2 else None

    nodes = load_bom_safe(os.path.join("data", "all_nodes.json"))["nodes"]
    en = {n["id"]: n.get("sections") for n in nodes if n.get("sections")}

    loc_path = os.path.join("data", "i18n", f"{locale}_sections.json")
    loc = load_bom_safe(loc_path) if os.path.exists(loc_path) else {}

    check_ids = ids or list(loc.keys())
    problems = []
    for nid in check_ids:
        s = loc.get(nid)
        e = en.get(nid)
        if not s:
            problems.append((nid, "MISSING_IN_LOCALE"))
            continue
        if not e:
            problems.append((nid, "NO_ENGLISH_SOURCE"))
            continue
        if not s.get("lead"):
            problems.append((nid, "EMPTY_LEAD"))
            continue
        if not CJK.search(s["lead"]):
            problems.append((nid, "LEAD_NOT_TRANSLATED"))
        if bool(e.get("core")) != bool(s.get("core")):
            problems.append((nid, "CORE_PARITY"))
        if bool(e.get("impact")) != bool(s.get("impact")):
            problems.append((nid, "IMPACT_PARITY"))
        if len(e.get("works") or []) != len(s.get("works") or []):
            problems.append((nid, "WORKS_LEN"))
        ed = [l.get("d") for l in (e.get("links") or [])]
        sd = [l.get("d") for l in (s.get("links") or [])]
        if ed != sd:
            problems.append((nid, f"LINKS_D_MISMATCH {ed} vs {sd}"))

    print(f"{locale}: checked {len(check_ids)}  problems {len(problems)}")
    for p in problems:
        print("  ", p[0], p[1])


if __name__ == "__main__":
    main()
