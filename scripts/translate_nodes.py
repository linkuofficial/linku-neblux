"""
Translate node labels to zh-TW using Anthropic API.
Outputs: data/i18n/zh-TW.json  { "node_id": "中文名稱", ... }
"""

import json, os, time
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("Installing anthropic package...")
    import subprocess
    subprocess.check_call(["pip", "install", "anthropic"])
    import anthropic

ROOT = Path(__file__).resolve().parent.parent
NODES_FILE = ROOT / "data" / "all_nodes.json"
OUTPUT_DIR = ROOT / "data" / "i18n"
OUTPUT_FILE = OUTPUT_DIR / "zh-TW.json"

BATCH_SIZE = 80  # labels per API call


def load_nodes():
    with open(NODES_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["nodes"]


def load_existing():
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def translate_batch(client, labels: list[dict]) -> dict:
    """Translate a batch of {id, label, type} entries."""
    items_text = "\n".join(
        f"{i+1}. [{item['type']}] {item['label']}" for i, item in enumerate(labels)
    )

    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=4000,
        messages=[
            {
                "role": "user",
                "content": f"""Translate these academic/scientific terms to Traditional Chinese (繁體中文).
Rules:
- Use standard academic translations (教科書用語)
- For person names: use established Chinese transliterations (e.g. Newton → 牛頓)
- For fields/concepts: use standard discipline names (e.g. Mathematics → 數學)
- For events: use standard historical names (e.g. Industrial Revolution → 工業革命)
- Keep it concise — just the term name, no explanations

Return ONLY a JSON object mapping the line number to the translation.
Example: {{"1": "微積分", "2": "量子力學"}}

Terms to translate:
{items_text}""",
            }
        ],
    )

    text = response.content[0].text.strip()
    # Extract JSON from response
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    result = json.loads(text)
    translations = {}
    for i, item in enumerate(labels):
        key = str(i + 1)
        if key in result:
            translations[item["id"]] = result[key]
    return translations


def main():
    nodes = load_nodes()
    existing = load_existing()

    # Filter out already translated
    to_translate = [
        {"id": n["id"], "label": n["label"], "type": n["type"]}
        for n in nodes
        if n["id"] not in existing
    ]

    if not to_translate:
        print(f"All {len(nodes)} nodes already translated.")
        return

    print(f"Total nodes: {len(nodes)}, already translated: {len(existing)}, remaining: {len(to_translate)}")

    client = anthropic.Anthropic()
    translations = dict(existing)

    batches = [to_translate[i : i + BATCH_SIZE] for i in range(0, len(to_translate), BATCH_SIZE)]
    print(f"Processing {len(batches)} batches of ~{BATCH_SIZE}...")

    for i, batch in enumerate(batches):
        print(f"  Batch {i+1}/{len(batches)} ({len(batch)} items)...", end=" ", flush=True)
        try:
            result = translate_batch(client, batch)
            translations.update(result)
            print(f"OK (+{len(result)})")
        except Exception as e:
            print(f"ERROR: {e}")
            # Save progress so far
            break

        # Rate limiting
        if i < len(batches) - 1:
            time.sleep(1)

    # Save
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(translations, f, ensure_ascii=False, indent=2)

    print(f"\nSaved {len(translations)} translations to {OUTPUT_FILE}")
    missing = [n["id"] for n in nodes if n["id"] not in translations]
    if missing:
        print(f"Missing translations: {len(missing)}")


if __name__ == "__main__":
    main()
