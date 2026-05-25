"""Merge a batch JSON file into all_nodes.json."""
import json
import sys

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

with open("data/all_nodes.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Merged {len(new_nodes)} nodes. Total: {data['meta']['total']}")
