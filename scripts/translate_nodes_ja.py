"""
Translate i18n labels to Japanese using Anthropic API.

Inputs:
- data/i18n/zh.json (key baseline)
- data/i18n/en.json (English fallback labels)
- data/i18n/ja.json (existing Japanese values)
- data/all_nodes.json (labels/types context)

Output:
- data/i18n/ja.json (updated)
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

import anthropic

ROOT = Path(__file__).resolve().parent.parent
I18N_DIR = ROOT / "data" / "i18n"
ZH_FILE = I18N_DIR / "zh.json"
EN_FILE = I18N_DIR / "en.json"
JA_FILE = I18N_DIR / "ja.json"
NODES_FILE = ROOT / "data" / "all_nodes.json"

BATCH_SIZE = 70
SLEEP_SECONDS = 0.7
MODEL = "claude-3-5-sonnet-latest"


def read_json(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_node_context() -> dict[str, dict[str, str]]:
    data = read_json(NODES_FILE)
    result: dict[str, dict[str, str]] = {}
    for node in data.get("nodes", []):
        node_id = node.get("id")
        if not isinstance(node_id, str):
            continue
        result[node_id] = {
            "label": str(node.get("label", "")),
            "type": str(node.get("type", "concept")),
        }
    return result


def extract_json_block(text: str) -> dict:
    raw = text.strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        raw = "\n".join(lines).strip()
    return json.loads(raw)


def translate_batch(client: anthropic.Anthropic, items: list[dict]) -> dict[str, str]:
    numbered_lines = []
    for idx, item in enumerate(items, 1):
        numbered_lines.append(
            f"{idx}. [id={item['id']}] [type={item['type']}] EN: {item['en_label']}"
        )

    prompt = (
        "Translate the following knowledge-graph labels into natural Japanese.\n"
        "Rules:\n"
        "- Prefer standard Japanese academic terms used in textbooks.\n"
        "- Keep terms concise; return term names only.\n"
        "- Preserve well-known abbreviations where appropriate (e.g., DNA).\n"
        "- Do not leave generic English words untranslated unless unavoidable proper names.\n"
        "- Keep capitalization normal for Japanese output.\n\n"
        "Return ONLY a JSON object mapping line number to translated Japanese text.\n"
        "Example: {\"1\": \"量子力学\", \"2\": \"微積分\"}\n\n"
        "Items:\n"
        + "\n".join(numbered_lines)
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )
    parsed = extract_json_block(response.content[0].text)

    result: dict[str, str] = {}
    for idx, item in enumerate(items, 1):
        value = parsed.get(str(idx))
        if isinstance(value, str) and value.strip():
            result[item["id"]] = value.strip()
    return result


def main() -> None:
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise RuntimeError("ANTHROPIC_API_KEY is required")

    zh = read_json(ZH_FILE)
    en = read_json(EN_FILE)
    ja = read_json(JA_FILE) if JA_FILE.exists() else {}
    ctx = build_node_context()

    # Keep only zh baseline keys.
    ja_aligned = {k: str(ja.get(k, "")) for k in zh.keys()}

    to_translate: list[dict] = []
    for key in zh.keys():
        current = str(ja_aligned.get(key, "")).strip()
        en_label = str(en.get(key, "")).strip()
        # Translate if missing or still equal to English placeholder.
        if not current or (en_label and current == en_label):
            meta = ctx.get(key, {})
            label = meta.get("label") or en_label or key.replace("_", " ")
            to_translate.append(
                {
                    "id": key,
                    "type": meta.get("type", "concept"),
                    "en_label": label,
                }
            )

    if not to_translate:
        print("ja.json is already fully translated from placeholder criteria.")
        return

    print(f"Need translation: {len(to_translate)} labels")
    client = anthropic.Anthropic()

    batches = [
        to_translate[i : i + BATCH_SIZE]
        for i in range(0, len(to_translate), BATCH_SIZE)
    ]

    translated_count = 0
    for idx, batch in enumerate(batches, 1):
        print(f"Batch {idx}/{len(batches)} size={len(batch)} ...", end=" ", flush=True)
        try:
            translated = translate_batch(client, batch)
            ja_aligned.update(translated)
            translated_count += len(translated)
            print(f"ok +{len(translated)}")
        except Exception as exc:
            print(f"error: {exc}")
            break

        with open(JA_FILE, "w", encoding="utf-8") as f:
            json.dump(ja_aligned, f, ensure_ascii=False, indent=2)
            f.write("\n")

        if idx < len(batches):
            time.sleep(SLEEP_SECONDS)

    print(f"Translated in this run: {translated_count}")


if __name__ == "__main__":
    main()
