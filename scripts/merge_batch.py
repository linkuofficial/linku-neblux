"""Merge a batch JSON file into all_nodes.json."""
import json
import os
import sys
from pathlib import Path

batch_file = sys.argv[1] if len(sys.argv) > 1 else "data/batch_round1_1.json"

with open("data/all_nodes.json", "r", encoding="utf-8") as f:
    data = json.load(f)

with open(batch_file, "r", encoding="utf-8") as f:
    new_nodes = json.load(f)

existing_ids = {n["id"] for n in data["nodes"]}
collisions = [n["id"] for n in new_nodes if n["id"] in existing_ids]
if collisions:
    print(f"COLLISION: {collisions}")
    sys.exit(1)

data["nodes"].extend(new_nodes)
data["meta"]["total"] = len(data["nodes"])

tmp = Path("data/all_nodes.json").with_suffix(".json.tmp")
tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
os.replace(tmp, "data/all_nodes.json")

print(f"Merged {len(new_nodes)} nodes. Total: {data['meta']['total']}")
