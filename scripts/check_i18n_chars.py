#!/usr/bin/env python3
"""Screen every i18n surface for typo-class defects that check_simplified.py
cannot see.

check_simplified.py only scans the three zh JSON files (labels / sections /
descriptions) and only catches Simplified leakage. The 基硹 typo (2026-06-17)
slipped through on both counts: it lived in a JS file (frontend/src/i18n.js,
which that screen never reads) and 硹 (U+7879) is an obscure *Traditional* char,
not a Simplified one. This tool closes both gaps:

  Lens 1 - OBSCURE CHARS: any CJK char that is in neither Big5 (zh) nor cp932
           (ja) is almost never legitimate in normal zh/ja text and is a strong
           typo signal (this is exactly what 硹 is). A small allowlist carries
           the handful of legitimate rare scientific characters in the corpus.
           Lang-agnostic on purpose, so a correct Traditional char never trips
           the Japanese test and vice-versa. Informational.

  Lens 2 - SIMPLIFIED IN JS: runs the OpenCC s2t per-char screen over the zh JS
           surfaces (i18n/zh.js + i18n.js tag maps) that check_simplified skips.
           Informational. Requires `opencc`; silently skipped if unavailable.

  Lens 3 - TAG COVERAGE: every display_tag in data/all_nodes.json rendered the
           way localizeTag() would, flagging any that fall through to English
           (or half-translate) for zh / ja. This is the actionable lens and the
           only one that sets a non-zero exit code.

Manual QA tool — run after editing any i18n surface. NOT wired into CI.
Usage:  python scripts/check_i18n_chars.py
"""
import collections
import glob
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def out(line=""):
    sys.stdout.buffer.write((line + "\n").encode("utf-8"))


def is_han(o):
    return (0x3400 <= o <= 0x9FFF) or (0xF900 <= o <= 0xFAFF) or (0x20000 <= o <= 0x2FA1F)


def dec(s):
    """Decode \\uXXXX escapes (JS i18n stores zh/ja that way)."""
    return re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), s)


def enc_ok(ch, codec):
    try:
        ch.encode(codec)
        return True
    except Exception:
        return False


# Legitimate rare scientific characters present in the corpus that are absent
# from both Big5 and cp932. Reviewed 2026-06-17; extend as the corpus grows.
OBSCURE_ALLOWLIST = set("卟啉肽苷酶")

PAIR = re.compile(r"""(['"]?)(\w+)\1\s*:\s*'((?:\\.|[^'])*)'""")


def extract_block(text, marker):
    i = text.find(marker)
    if i < 0:
        return ""
    b = text.find("{", i)
    if b < 0:
        return ""
    depth = 0
    for j in range(b, len(text)):
        if text[j] == "{":
            depth += 1
        elif text[j] == "}":
            depth -= 1
            if depth == 0:
                return text[b + 1:j]
    return ""


def pairs(block):
    return {m.group(2): dec(m.group(3)) for m in PAIR.finditer(block)}


def read(rel):
    p = os.path.join(ROOT, rel)
    return io.open(p, encoding="utf-8").read() if os.path.exists(p) else ""


def walk(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, dict):
        for v in o.values():
            yield from walk(v)
    elif isinstance(o, list):
        for v in o:
            yield from walk(v)


# ---- gather every i18n surface as decoded text ----
JS_FILES = [
    "frontend/src/i18n.js", "frontend/src/i18n/en.js", "frontend/src/i18n/zh.js",
    "frontend/src/i18n/ja.js", "frontend/src/app-main.js", "frontend/src/explorer-main.js",
]
surfaces = [(f, dec(read(f))) for f in JS_FILES if read(f)]
for p in sorted(glob.glob(os.path.join(ROOT, "data", "i18n", "*.json"))):
    surfaces.append((os.path.relpath(p, ROOT), io.open(p, encoding="utf-8").read()))


def main():
    fail = 0

    # ===== Lens 1: obscure chars (not in Big5 and not in cp932) =====
    out("=== Lens 1: obscure CJK chars (typo candidates like 硹) ===")
    found = {}
    for label, txt in surfaces:
        for ch in txt:
            o = ord(ch)
            if not is_han(o):
                continue
            if ch in OBSCURE_ALLOWLIST:
                continue
            if not enc_ok(ch, "big5") and not enc_ok(ch, "cp932"):
                if ch not in found:
                    idx = txt.find(ch)
                    found[ch] = (label, txt[max(0, idx - 16):idx + 16].replace("\n", " "))
    if found:
        for ch, (label, ctx) in sorted(found.items()):
            out(f"  [warn] U+{ord(ch):04X} {ch}  {label}  ...{ctx}...")
        out(f"  ({len(found)} candidate(s) — review; add to OBSCURE_ALLOWLIST if legitimate)")
    else:
        out("  clean")

    # ===== Lens 2: Simplified leakage in zh JS surfaces =====
    out("")
    out("=== Lens 2: Simplified leakage in JS zh surfaces (check_simplified skips JS) ===")
    try:
        from opencc import OpenCC
        cc = OpenCC("s2t")
    except Exception:
        cc = None
    if cc is None:
        out("  (opencc not installed; skipped)")
    else:
        tw_accepted = set("群床里干台托占征峰游准岩涂采吃后灶秘范雇夸丑並")
        i18n = read("frontend/src/i18n.js")
        tl = extract_block(i18n, "TAG_LABELS = ")
        zh_js = []
        zh_js.append(("i18n/zh.js", read("frontend/src/i18n/zh.js")))
        zh_js.append(("i18n.js TAG_LABELS.zh", "".join(pairs(extract_block(tl, "zh:")).values())))
        zh_js.append(("i18n.js TAG_TOKEN_ZH", "".join(pairs(extract_block(i18n, "TAG_TOKEN_ZH = ")).values())))
        hits = {}
        for label, raw in zh_js:
            for ch in dec(raw):
                if is_han(ord(ch)) and cc.convert(ch) != ch and ch not in tw_accepted:
                    hits.setdefault(ch, label)
        if hits:
            for ch, label in sorted(hits.items()):
                out(f"  [warn] {ch} -> {cc.convert(ch)}  in {label}")
        else:
            out("  clean")

    # ===== Lens 3: tag coverage (English-leak for zh / ja) =====
    out("")
    out("=== Lens 3: display_tag coverage (English shown / half-translated) ===")
    i18n = read("frontend/src/i18n.js")
    tl = extract_block(i18n, "TAG_LABELS = ")
    zl = set(pairs(extract_block(tl, "zh:")))
    jl = set(pairs(extract_block(tl, "ja:")))
    zt = set(pairs(extract_block(i18n, "TAG_TOKEN_ZH = ")))
    jt = set(pairs(extract_block(i18n, "TAG_TOKEN_JA = ")))
    cent = re.compile(r"^\d{1,2}(?:st|nd|rd|th)_century$")
    rng = re.compile(r"^\d+(?:bce|ce)_to_\d+(?:bce|ce)$")

    def classify(tag, labels, tok):
        if tag in labels or cent.match(tag) or rng.match(tag):
            return "FULL"
        toks = [x for x in tag.split("_") if x]
        m = [x in tok for x in toks]
        return "FULL" if all(m) else ("PARTIAL" if any(m) else "NONE")

    nodes = json.load(io.open(os.path.join(ROOT, "data", "all_nodes.json"), encoding="utf-8"))["nodes"]
    tags = collections.Counter()
    for n in nodes:
        for tg in (n.get("display_tags") or []):
            tags[tg] += 1
    for lang, labels, tok in [("zh", zl, zt), ("ja", jl, jt)]:
        gaps = [(t, c, classify(t, labels, tok)) for t, c in tags.items()
                if classify(t, labels, tok) != "FULL"]
        if gaps:
            fail = 1
            out(f"  {lang}: {len(gaps)} tag(s) not fully localized:")
            for t, c, cl in sorted(gaps, key=lambda x: -x[1]):
                out(f"    [{cl}] {t} (x{c})")
        else:
            out(f"  {lang}: all {len(tags)} tags localize")

    out("")
    out("RESULT: " + ("FAIL (tag coverage gap)" if fail else "OK"))
    return fail


if __name__ == "__main__":
    sys.exit(main())
