"""
fix_phase1.py — 一次性修復 Phase 1 驗證錯誤
修復：
  1. 新增 missing tags 到 seed
  2. 擴展過短的 description
  3. 修復 algebra_field 跨域連結
"""
import json
from pathlib import Path

BASE = Path(__file__).parent.parent
NODES_FILE = BASE / "data" / "all_nodes.json"
FIELD_FILE = BASE / "data" / "field_nodes.json"
TAGS_FILE = BASE / "data" / "display_tags_seed.json"

# ── 1. 新增 missing tags ──────────────────────────────
print("1. Adding missing tags to seed...")
with open(TAGS_FILE, encoding="utf-8") as f:
    tags_data = json.load(f)

# 這些 tag 是合理的分類標籤，應該加入 concept_nature
new_concept_nature_tags = ["interpretive", "algorithmic"]
# 這些適合放在 special_attributes
new_special_tags = ["natural_world", "human_experience", "aesthetic"]

for tag in new_concept_nature_tags:
    if tag not in tags_data["categories"]["concept_nature"]:
        tags_data["categories"]["concept_nature"].append(tag)
        print(f"  + concept_nature: {tag}")

for tag in new_special_tags:
    if tag not in tags_data["categories"]["special_attributes"]:
        tags_data["categories"]["special_attributes"].append(tag)
        print(f"  + special_attributes: {tag}")

# 更新 total
total = sum(len(v) for v in tags_data["categories"].values())
tags_data["meta"]["total"] = total

with open(TAGS_FILE, "w", encoding="utf-8") as f:
    json.dump(tags_data, f, ensure_ascii=False, indent=2)
print(f"  Seed tags updated: {total} total\n")

# ── 2. 修復節點資料 ───────────────────────────────────
print("2. Fixing node data...")

# 描述擴展（在末尾加一句 BRIDGE 相關補充使其超過 50 字）
desc_fixes = {
    "physics_field": "Physics investigates the fundamental nature of matter, energy, space, and time through observation, experimentation, and mathematical modeling. It seeks universal laws governing everything from subatomic particles to the structure of the cosmos itself. Its mathematical language has become the indispensable foundation for all engineering disciplines, and its discoveries have directly transformed modern medicine through technologies like MRI imaging and radiation therapy.",
    "social_science_field": "Social science studies human society, behavior, and institutions through systematic observation, experimentation, and statistical analysis. It encompasses economics, sociology, political science, psychology, and anthropology as major branches. Its quantitative research methods borrow heavily from mathematics and statistics, while its insights into collective human behavior now critically inform artificial intelligence design, public health policy, and urban planning.",
    "ecology_field": "Ecology studies the complex relationships between living organisms and their physical environments, examining interactions from individual organisms to entire planetary biospheres. It reveals how energy flows and nutrients cycle through deeply interconnected natural systems. Its mathematical models of population dynamics and resource competition share deep structural similarities with economic market models, epidemiological disease forecasting, and network science.",
    "political_science_field": "Political science studies power, governance, institutions, and the collective organization of human societies at every scale. From Plato's Republic to modern computational electoral analysis, it examines how binding decisions are made collectively and how authority is legitimized. Its use of game theory and statistical modeling creates deep bridges to mathematics, while its normative theories of justice connect fundamentally to philosophy and ethics.",
    "materials_science_field": "Materials science studies the structure, properties, processing, and applications of solid materials including metals, ceramics, polymers, composites, and semiconductors. By connecting atomic-level quantum physics with macroscale engineering applications, it enables critical technological breakthroughs ranging from stronger bridges to faster computer chips. Its quantum mechanical and thermodynamic foundations link it deeply to both chemistry and condensed matter physics.",
}

# algebra_field 需要一個跨域非 pending 連結
algebra_new_connection = {
    "target": "physics_field",
    "relation_type": "applied",
    "relation": "Linear algebra and group theory provide the mathematical language for quantum mechanics and relativity",
    "directed": False,
    "learning_prerequisite": False,
    "parallel_development": False,
    "pending": False
}

# 載入兩個檔案
for filepath in [NODES_FILE, FIELD_FILE]:
    if not filepath.exists():
        continue
    
    with open(filepath, encoding="utf-8") as f:
        data = json.load(f)
    
    modified = False
    for node in data["nodes"]:
        # 修復描述
        if node["id"] in desc_fixes:
            old_wc = len(node["description"].split())
            node["description"] = desc_fixes[node["id"]]
            new_wc = len(node["description"].split())
            print(f"  {node['id']}: description {old_wc}w → {new_wc}w")
            modified = True
        
        # 修復 algebra_field 連結
        if node["id"] == "algebra_field":
            targets = [c["target"] for c in node["connections"]]
            if "physics_field" not in targets:
                node["connections"].append(algebra_new_connection)
                print(f"  algebra_field: added cross-domain connection → physics_field")
                modified = True
    
    if modified:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  Saved: {filepath.name}")

print("\nDone. Run validate_nodes.py to verify.")
