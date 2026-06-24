# Locale sections spec — translate + localize English sections into zh / ja

You translate Neblux's already-finished, fact-checked **English** structured
sections into a target language. Your TARGET LANGUAGE is given in your task prompt
(`zh` = Traditional Chinese 繁體中文, zh-Hant; `ja` = Japanese 日本語). **Facts are
sacred — you are translating, not researching.**

## Step 0 — get your assigned node ids
Your prompt gives you either an explicit id list OR a `batch index`. If you were
given a batch index N (0-based) and a language LANG, get your ids by running:
```
python -c "import json; print(','.join(json.load(open('data/_locale_worklist.json',encoding='utf-8'))['LANG'][N]))"
```
(substitute LANG and N). Use that comma list as your assigned ids below.

## Step 1 — read the English source for your assigned nodes
Run (replace the id list with YOUR assigned ids):
```
python -c "import json,sys; d=json.load(open('data/all_nodes.json',encoding='utf-8')); m={n['id']:n for n in d['nodes']}; ids='ID1,ID2,...'.split(','); [sys.stdout.buffer.write((f'=== {i} | {m[i][\"label\"]} | {m[i][\"type\"]}\n'+json.dumps(m[i].get('sections',{}),ensure_ascii=False,indent=2)+'\n\n').encode('utf-8','replace')) for i in ids]"
```
Each node's `sections` is `{lead, core?, impact?, works?[], links:[{d,t}]}`.

## Step 2 — translate each node's sections
Produce, per node, the SAME JSON shape with the SAME keys present:
```
{ "lead": "...", "core": "...", "impact": "...", "works": ["...", ...], "links": [ {"d":"<KEEP>","t":"<translated>"}, ... ] }
```

### Hard rules
- **Translate the values of**: `lead`, `core`, `impact`, every `works` item, and every `links[].t`.
- **NEVER change `links[].d`** — keep the canonical domain codes (MAT/PHY/CHE/BIO/MED/ENG/TEC/SOC/HUM/PHI/ART/HIS) EXACTLY as in the source. The frontend localizes them at render time. Keep the same NUMBER and ORDER of links.
- **Structural parity**: if the English entry has `core`, yours must; same for `impact`; keep the `works` list the SAME LENGTH (translate each item). Do not add or drop sections, links, or works.
- **No new facts, no dropped facts.** Do not add dates, names, or claims not in the English. Do not omit any. This is faithful translation.
- `lead` stays ONE sentence (TWO only if the English lead was two). It need NOT start with a verb in the target language — natural phrasing wins.

### Localization (translate-first, localize the surface)
- Render natural, fluent target-language prose — not a literal word-for-word gloss. Reorder clauses for readability where the target language demands it.
- **Proper nouns**: use the established target-language form (e.g. Newton → 牛頓 / ニュートン; Darwin → 達爾文 / ダーウィン; Einstein → 愛因斯坦 / アインシュタイン). If no established form exists, keep the original Latin-script name.
- **Technical terms / acronyms** that are conventionally left in English or as loanwords stay so (e.g. DNA, CRISPR, GPS, LIGO, BCS, PCR; `E=mc²` stays). For ja, use katakana for loanwords where that is the norm.
- Keep numbers, years, and units verbatim (105 CE → 105年 / 105年; 1869 → 1869年; ~99.9% → 約99.9%).
- **zh = Traditional Chinese characters only** (繁體中文). Never Simplified. **ja = natural Japanese** with appropriate kanji/katakana.
- Match the encyclopedic, tight register of the English. No flowery padding.

## Step 3 — write the file
Write ALL your nodes as ONE json object (id -> translated section object) to the
path given in your prompt. UTF-8, `ensure_ascii=False`. Verify it parses.
Reply ONLY: `done <path>`.
