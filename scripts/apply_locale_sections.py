#!/usr/bin/env python3
"""Merge translated/localized locale sections into data/i18n/<locale>_sections.json.

Usage:  python scripts/apply_locale_sections.py <locale> <batch.json>

The batch file is a { nodeId: {lead, core?, impact?, works?, links:[{d,t}]} } map
produced by a translation subagent. We merge it into the per-locale sections file
(BOM-safe read; written compact UTF-8 without BOM so the build copies a small
payload verbatim). Domain codes in links[].d stay canonical (MAT/PHY/...) and are
localized at render time by the frontend. Entries without a 'lead' are skipped.
"""
import json
import os
import sys


def load_bom_safe(path):
    with open(path, "rb") as f:
        return json.loads(f.read().decode("utf-8-sig"))


def main():
    if len(sys.argv) < 3:
        print("usage: apply_locale_sections.py <locale> <batch.json>")
        sys.exit(1)
    locale = sys.argv[1]
    batch = load_bom_safe(sys.argv[2])
    out_path = os.path.join("data", "i18n", f"{locale}_sections.json")

    existing = {}
    if os.path.exists(out_path):
        existing = load_bom_safe(out_path)

    applied = skipped = 0
    for nid, sec in batch.items():
        if not isinstance(sec, dict) or not sec.get("lead"):
            skipped += 1
            continue
        existing[nid] = sec
        applied += 1

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, separators=(",", ":"))

    print(f"{locale}: applied {applied}  skipped {skipped}  -> {out_path} (total {len(existing)})")


if __name__ == "__main__":
    main()
