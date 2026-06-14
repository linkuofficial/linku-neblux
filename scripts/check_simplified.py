#!/usr/bin/env python3
"""Screen zh locale sections for Simplified-Chinese leakage.

The structural QA (check_locale_sections.py) only checks SHAPE parity; it cannot
tell Traditional from Simplified. This screens data/i18n/zh_sections.json two ways:

  (a) per-character OpenCC s2t: any char whose single-char Simplified->Traditional
      conversion changes it is a CANDIDATE. Chars in TW_ACCEPTED (Taiwan MOE
      accepts the "simplified-looking" form as standard, e.g. 群/床/台) are
      downgraded to REVIEW; everything else is flagged ERROR (e.g. 鲀->魨, 并->併).
  (b) word-level: shared-character Simplified WORDS that per-char can't catch
      because the component chars are each valid Traditional (e.g. 特征->特徵,
      制造->製造, 里面/这里). These are always ERROR.

Per-char is a SCREEN, not a gate: REVIEW items need a human eye for context
(e.g. 里 is fine in 公里 but wrong for 裡/裏 "inside"). Requires `opencc`
(pip install opencc); exits 0 with a notice if unavailable.

Usage:  python scripts/check_simplified.py
"""
import json
import os
import re
import sys

# Forms Taiwan MOE accepts as standard even though OpenCC s2t "upgrades" them to
# an orthodox variant. Flagging these would wrongly rewrite correct text to look
# archaic (羣/牀/臺...). Also includes valid surnames/transliteration chars and
# context-correct one-to-many chars confirmed during the 2026-06-15 audit.
TW_ACCEPTED = set("群床里干台托占征峰游准岩涂采吃后灶秘范雇夸丑並雇")

# Shared-character Simplified WORDS (each component char is valid Traditional, so
# per-char misses them). Map -> correct Traditional. Always an error if present.
SIMP_WORDS = {
    "特征": "特徵", "制造": "製造", "其余": "其餘", "里面": "裡面",
    "这里": "這裡", "那里": "那裡", "哪里": "哪裡", "并合": "併合",
    "并发": "並發", "信号": "訊號",  # (信号 borderline; review)
}

CJK = re.compile(r"[㐀-䶿一-鿿]")


def load_bom_safe(path):
    with open(path, "rb") as f:
        return json.loads(f.read().decode("utf-8-sig"))


def fields(sec):
    for k in ("lead", "core", "impact"):
        if sec.get(k):
            yield k, sec[k]
    for i, w in enumerate(sec.get("works") or []):
        yield f"works[{i}]", w
    for i, l in enumerate(sec.get("links") or []):
        yield f"links[{i}].t", l.get("t", "")


def main():
    try:
        from opencc import OpenCC
    except Exception:
        print("opencc not installed (pip install opencc); skipping simplified screen.")
        return 0
    cc = OpenCC("s2t")

    path = os.path.join("data", "i18n", "zh_sections.json")
    zh = load_bom_safe(path)

    errors = []   # (nid, field, kind, detail)
    review = {}   # char -> [count, example_nid]

    for nid, sec in zh.items():
        for label, text in fields(sec):
            # (b) word-level simplified
            for w, good in SIMP_WORDS.items():
                if w in text:
                    errors.append((nid, label, "WORD", f"{w} -> {good}"))
            # (a) per-char
            for ch in text:
                if not CJK.match(ch):
                    continue
                if cc.convert(ch) != ch:
                    if ch in TW_ACCEPTED:
                        r = review.setdefault(ch, [0, nid])
                        r[0] += 1
                    else:
                        errors.append((nid, label, "CHAR", ch))

    print(f"zh simplified screen: {len(errors)} ERROR, {len(review)} review-chars")
    if errors:
        print("\n-- ERRORS (genuine simplified leakage) --")
        for nid, f, kind, d in errors:
            out = f"  [{kind}] {nid} [{f}]: {d}"
            sys.stdout.buffer.write((out + "\n").encode("utf-8"))
    if review:
        print("\n-- REVIEW (Taiwan-accepted variants; context-check inside-li/queen-hou) --")
        for ch, (cnt, nid) in sorted(review.items(), key=lambda x: -x[1][0]):
            out = f"  {ch} x{cnt} (e.g. {nid})"
            sys.stdout.buffer.write((out + "\n").encode("utf-8"))

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
