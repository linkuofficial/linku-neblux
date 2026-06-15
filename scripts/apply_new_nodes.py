#!/usr/bin/env python3
"""Apply a wave of NEW nodes from a subagent bundle into all_nodes.json + i18n.

Bundle format (one object):
  { "<id>": {
      "skeleton":   {full node minus description, sections},
      "sections_en":{lead,core?,impact?,links:[{d,t}],works?},
      "sections_zh":{...}, "sections_ja":{...},
      "label":      {"en":..,"zh":..,"ja":..},
      "desc":       {"zh":..,"ja":..}
  }, ... }

For each id we: append the skeleton node, attach sections_en + rebuild the flat
English description (canonical "In <domain>, ..." prose), merge labels into
en/zh/ja.json, flat descriptions into {zh,ja}_descriptions.json, localized
sections into {zh,ja}_sections.json, and restore inbound edges (source -> new
node) from data/_expansion_inbound.json for the ids in this bundle.

Deterministic, idempotent, backs up every file it touches. Run:
    python scripts/apply_new_nodes.py data/_wave1_bundle.json
"""
import json
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
I18N = DATA / "i18n"
INBOUND = DATA / "_expansion_inbound.json"

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
        parts.append(f"In {name}, {l['t'].strip()}")
    return " ".join(p for p in parts if p)


def detect_indent(text):
    m = re.search(r'\n(\s+)"', text)
    return len(m.group(1)) if m else None


def load_bom(p):
    return json.loads(Path(p).read_text(encoding="utf-8-sig"))


def merge_map(path, additions, ts):
    """Merge {id:value} additions into a flat i18n json file, preserving format."""
    p = Path(path)
    txt = p.read_text(encoding="utf-8")
    Path(str(p) + f".bak_{ts}").write_text(txt, encoding="utf-8")
    d = json.loads(txt)
    n = 0
    for k, v in additions.items():
        if k not in d:
            d[k] = v
            n += 1
    indent = detect_indent(txt)
    if indent is None:
        s = json.dumps(d, ensure_ascii=False, separators=(",", ":"))
    else:
        s = json.dumps(d, ensure_ascii=False, indent=indent)
    p.write_text(s, encoding="utf-8")
    return n, len(d)


def main():
    if len(sys.argv) != 2:
        print("usage: python scripts/apply_new_nodes.py <bundle.json>")
        sys.exit(2)
    ts = time.strftime("%Y%m%d_%H%M%S")
    bundle = load_bom(sys.argv[1])

    nodes_path = DATA / "all_nodes.json"
    raw = nodes_path.read_text(encoding="utf-8")
    data = json.loads(raw)
    (DATA / f"all_nodes_backup_newnodes_{ts}.json").write_text(raw, encoding="utf-8")
    nodes = data["nodes"]
    by_id = {n["id"]: n for n in nodes}

    labels = {"en": {}, "zh": {}, "ja": {}}
    descs = {"zh": {}, "ja": {}}
    sec_zh, sec_ja = {}, {}

    added, skipped = 0, []
    for nid, b in bundle.items():
        sk = b["skeleton"]
        if sk["id"] != nid:
            skipped.append((nid, "id mismatch")); continue
        sec = b["sections_en"]
        if "lead" not in sec or not sec.get("links"):
            skipped.append((nid, "no lead/links")); continue
        desc = reconstruct(sec)
        wc = len(desc.split())
        if not (50 <= wc <= 360):
            skipped.append((nid, f"{wc} words out of range")); continue
        if nid in by_id:
            skipped.append((nid, "node exists")); continue
        sk = dict(sk)
        sk["sections"] = sec
        sk["description"] = desc
        nodes.append(sk)
        by_id[nid] = sk
        labels["en"][nid] = b["label"]["en"]
        labels["zh"][nid] = b["label"]["zh"]
        labels["ja"][nid] = b["label"]["ja"]
        descs["zh"][nid] = b["desc"]["zh"]
        descs["ja"][nid] = b["desc"]["ja"]
        sec_zh[nid] = b["sections_zh"]
        sec_ja[nid] = b["sections_ja"]
        added += 1
        print(f"  + {nid}  ({wc} words)")

    # restore inbound edges for the ids in this bundle.
    # Prefer the subagent's clean relation text (bundle[nid]["inbound"][src]) over the
    # original templated text (many originals leak the raw id / are generic boilerplate).
    inbound = load_bom(INBOUND) if INBOUND.exists() else {}
    edges = 0
    for nid in [n for n in bundle if n in by_id]:
        fixes = bundle[nid].get("inbound", {}) or {}
        for rec in inbound.get(nid, []):
            src = by_id.get(rec["src"])
            if not src:
                continue
            tgts = {c.get("target") for c in src.get("connections", [])}
            if nid in tgts:
                continue
            conn = dict(rec["conn"])
            clean = fixes.get(rec["src"])
            if clean and len(str(clean).split()) >= 8:
                conn["relation"] = str(clean).strip()
            src.setdefault("connections", []).append(conn)
            edges += 1

    nodes_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"all_nodes.json: +{added} nodes, +{edges} inbound edges (total {len(nodes)})")

    for loc in ("en", "zh", "ja"):
        n, tot = merge_map(I18N / f"{loc}.json", labels[loc], ts)
        print(f"  {loc}.json +{n} (total {tot})")
    for loc in ("zh", "ja"):
        n, tot = merge_map(I18N / f"{loc}_descriptions.json", descs[loc], ts)
        print(f"  {loc}_descriptions.json +{n} (total {tot})")

    # localized sections: merge via apply_locale_sections semantics (compact)
    for loc, secmap in (("zh", sec_zh), ("ja", sec_ja)):
        p = I18N / f"{loc}_sections.json"
        txt = p.read_text(encoding="utf-8")
        Path(str(p) + f".bak_{ts}").write_text(txt, encoding="utf-8")
        d = json.loads(txt)
        n = 0
        for k, v in secmap.items():
            if isinstance(v, dict) and v.get("lead"):
                d[k] = v; n += 1
        p.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f"  {loc}_sections.json +{n} (total {len(d)})")

    if skipped:
        print("SKIPPED:")
        for nid, why in skipped:
            print(f"  {nid}: {why}")
    print("done.")


if __name__ == "__main__":
    main()
