#!/usr/bin/env python3
"""Screen zh locale content for Simplified-Chinese leakage.

The structural QA (check_locale_sections.py) only checks SHAPE parity; it cannot
tell Traditional from Simplified. This screens the rendered zh surfaces —
data/i18n/zh.json (labels), zh_sections.json (sections), and zh_descriptions.json
(search field) — three ways:

  (a) per-character OpenCC s2t: any char whose single-char Simplified->Traditional
      conversion changes it is a CANDIDATE. Chars in TW_ACCEPTED (Taiwan MOE
      accepts the "simplified-looking" form as standard, e.g. 群/床/台) are
      downgraded to REVIEW; everything else is flagged ERROR (e.g. 鲀->魨).
  (b) shared-character Simplified WORDS that per-char can't catch because the
      component chars are each valid Traditional (e.g. 特征->特徵, 制造->製造).
  (c) AMBIGUOUS one-to-many words: chars in TW_ACCEPTED that are correct
      Traditional in some words (公里, 干擾, 皇后, 游泳) but Simplified in others
      (里面->裡, 干細胞->幹, 然後, 遊戲). The whitelist passes the char; this word
      list flags only the simplified-sense usages.

(b) and (c) are always ERROR; (a) non-whitelisted is ERROR; (a) whitelisted is
REVIEW (human eye for context). Requires `opencc` (pip install opencc); exits 0
with a notice if unavailable.

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
TW_ACCEPTED = set("群床里干台托占征峰游准岩涂采吃后灶秘范雇夸丑並")

# Shared-character Simplified WORDS (each component char is valid Traditional, so
# per-char misses them). Map -> correct Traditional. Always an error if present.
SIMP_WORDS = {
    "特征": "特徵", "制造": "製造", "其余": "其餘", "里面": "裡面",
    "这里": "這裡", "那里": "那裡", "哪里": "哪裡", "并合": "併合",
    "并发": "並發", "信号": "訊號",
}

# One-to-many chars are in TW_ACCEPTED because they are CORRECT Traditional in
# some words but SIMPLIFIED in others. Per-char can't tell them apart; this list
# flags only the simplified-sense usages. Always an error if present.
AMBIGUOUS_WORDS = {
    "里头": "裡頭", "心里": "心裡", "手里": "手裡", "家里": "家裡", "夜里": "夜裡",
    "眼里": "眼裡", "嘴里": "嘴裡", "城里": "城裡", "屋里": "屋裡", "骨子里": "骨子裡",
    "干细胞": "幹細胞", "干部": "幹部", "树干": "樹幹", "能干": "能幹", "骨干": "骨幹",
    "主干": "主幹", "干线": "幹線", "才干": "才幹", "干活": "幹活",
    "然后": "然後", "以后": "以後", "后面": "後面", "后来": "後來", "之后": "之後",
    "最后": "最後", "背后": "背後", "落后": "落後", "先后": "先後", "前后": "前後",
    "此后": "此後", "今后": "今後", "随后": "隨後", "稍后": "稍後", "事后": "事後",
    "后期": "後期", "后续": "後續", "后代": "後代", "后果": "後果", "后者": "後者",
    "游戏": "遊戲", "游客": "遊客", "游览": "遊覽", "旅游": "旅遊", "游乐": "遊樂",
    "导游": "導遊", "游历": "遊歷", "游说": "遊說", "游行": "遊行", "游记": "遊記",
    "范围": "範圍", "范例": "範例", "模范": "模範", "示范": "示範", "规范": "規範",
    "范畴": "範疇", "防范": "防範", "典范": "典範", "范式": "範式",
    "标准": "標準", "准确": "準確", "准则": "準則", "水准": "水準", "精准": "精準",
    "校准": "校準", "基准": "基準", "准备": "準備", "瞄准": "瞄準", "准时": "準時",
    "象征": "象徵", "征兆": "徵兆", "征求": "徵求", "征收": "徵收", "征集": "徵集",
    "征用": "徵用", "征状": "徵狀",
    "采集": "採集", "采用": "採用", "采取": "採取", "采访": "採訪", "开采": "開採",
    "采纳": "採納", "采购": "採購", "采矿": "採礦",
    "夸大": "誇大", "夸张": "誇張", "夸耀": "誇耀",
    "丑陋": "醜陋", "丑闻": "醜聞", "丑恶": "醜惡",
    "雇主": "僱主", "雇佣": "僱傭", "雇员": "僱員", "雇用": "僱用",
    "涂层": "塗層", "涂料": "塗料", "涂抹": "塗抹",
    "占据": "佔據", "占领": "佔領", "占用": "佔用", "占有": "佔有",
}

CJK = re.compile(r"[㐀-䶿一-鿿]")


def load_bom_safe(path):
    with open(path, "rb") as f:
        return json.loads(f.read().decode("utf-8-sig"))


def section_fields(sec):
    for k in ("lead", "core", "impact"):
        if sec.get(k):
            yield k, sec[k]
    for i, w in enumerate(sec.get("works") or []):
        yield f"works[{i}]", w
    for i, l in enumerate(sec.get("links") or []):
        yield f"links[{i}].t", l.get("t", "")


def iter_texts(data_dir):
    """Yield (nid, field, text) across every rendered zh surface."""
    labels = load_bom_safe(os.path.join(data_dir, "zh.json"))
    for nid, lab in labels.items():
        yield nid, "label", lab
    secs = load_bom_safe(os.path.join(data_dir, "zh_sections.json"))
    for nid, sec in secs.items():
        for f, t in section_fields(sec):
            yield nid, f, t
    descs = load_bom_safe(os.path.join(data_dir, "zh_descriptions.json"))
    for nid, d in descs.items():
        yield nid, "description", d


def main():
    try:
        from opencc import OpenCC
    except Exception:
        print("opencc not installed (pip install opencc); skipping simplified screen.")
        return 0
    cc = OpenCC("s2t")

    data_dir = os.path.join("data", "i18n")
    errors = []   # (nid, field, kind, detail)
    review = {}   # char -> [count, example_nid]

    for nid, label, text in iter_texts(data_dir):
        for w, good in SIMP_WORDS.items():
            if w in text:
                errors.append((nid, label, "WORD", f"{w} -> {good}"))
        for w, good in AMBIGUOUS_WORDS.items():
            if w in text:
                errors.append((nid, label, "AMBIG", f"{w} -> {good}"))
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
