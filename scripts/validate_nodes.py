"""
validate_nodes.py
-----------------
驗證所有節點是否符合 schema 規則。
輸出每個節點的驗證結果和統計摘要。

使用方法：
  python validate_nodes.py
  python validate_nodes.py --fix   # 嘗試自動修正小問題
"""

import json
import re
import argparse
from pathlib import Path
from collections import Counter

import yaml

BASE_DIR = Path(__file__).parent.parent
CONFIG_FILE = BASE_DIR / "config.yaml"

def load_config():
    with open(CONFIG_FILE, encoding="utf-8") as f:
        return yaml.safe_load(f)

CONFIG = load_config()

DATA_DIR = BASE_DIR / "data"
NODES_FILE = BASE_DIR / CONFIG["paths"]["nodes_file"]
FIELD_NODES_FILE = BASE_DIR / CONFIG["paths"]["field_nodes_file"]
TAGS_FILE = BASE_DIR / CONFIG["paths"]["tags_file"]

VALID_DOMAINS = {"MAT","PHY","CHE","BIO","MED","ENG","TEC","SOC","HUM","PHI","ART","HIS"}
VALID_TYPES = {"concept","person","event","field"}
VALID_RELATION_TYPES = {"logical","historical","causal","applied","conceptual","contradicts"}

# 載入 seed tags 用於驗證
def load_seed_tags() -> set:
    if not TAGS_FILE.exists():
        return set()
    with open(TAGS_FILE, encoding="utf-8") as f:
        data = json.load(f)
    tags = set()
    for cat_tags in data.get("categories", {}).values():
        tags.update(cat_tags)
    return tags

SEED_TAGS = load_seed_tags()

def load_nodes():
    target = NODES_FILE if NODES_FILE.exists() else FIELD_NODES_FILE
    with open(target, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("nodes", [])

def validate_node(node: dict, node_lookup: dict, field_ids: set) -> tuple:
    errors = []
    warnings = []
    
    val_cfg = CONFIG["validation"]
    
    # ── ID ──
    nid = node.get("id", "")
    if not nid:
        errors.append("Missing id")
    elif " " in nid or nid != nid.lower():
        errors.append(f"ID format invalid: {nid}")
    elif not re.match(r"^[a-z][a-z0-9_]*_(concept|person|event|field)$", nid):
        warnings.append(f"ID doesn't follow naming convention: {nid}")
    
    # ── Label ──
    if not node.get("label"):
        errors.append("Missing label")
    
    # ── Type ──
    node_type = node.get("type")
    if node_type not in VALID_TYPES:
        errors.append(f"Invalid type: {node_type}")
    
    # ── Domain ──
    domains = node.get("domain", [])
    if not domains:
        errors.append("Missing domain")
    else:
        invalid = set(domains) - VALID_DOMAINS
        if invalid:
            errors.append(f"Invalid domain codes: {invalid}")
    
    # ── Description ──
    desc = node.get("description", "")
    word_count = len(re.findall(r"\b\w+\b", desc))
    if word_count < val_cfg["min_description_words"]:
        errors.append(f"Description too short: {word_count} words (min {val_cfg['min_description_words']})")
    elif word_count > val_cfg["max_description_words"]:
        errors.append(f"Description too long: {word_count} words (max {val_cfg['max_description_words']})")
    
    # ── Era ──
    era = node.get("era")
    if era is not None:
        if not isinstance(era.get("start"), (int, type(None))):
            errors.append("era.start must be integer or null")
        if not isinstance(era.get("end"), (int, type(None))):
            errors.append("era.end must be integer or null")
        # B1: era start ≤ end
        era_start = era.get("start")
        era_end = era.get("end")
        if isinstance(era_start, int) and isinstance(era_end, int) and era_start > era_end:
            errors.append(f"Invalid era range: start ({era_start}) > end ({era_end})")
    if node_type in ("person", "event") and era is None:
        warnings.append("person/event should have era field")
    
    # ── Geo ──
    geo = node.get("geo")
    if geo is not None and node_type in ("concept", "field"):
        errors.append("concept/field types must have geo: null")
    
    # ── Connections ──
    connections = node.get("connections", [])
    if len(connections) < val_cfg["min_connections"]:
        errors.append(f"Too few connections: {len(connections)} (min {val_cfg['min_connections']})")
    
    # B1: 跨域連結驗證
    conn_target_domains = set()
    has_field_connection = False
    broken_connections = []
    
    for conn in connections:
        rel_type = conn.get("relation_type")
        if rel_type not in VALID_RELATION_TYPES:
            errors.append(f"Invalid relation_type: {rel_type}")
        if rel_type == "contradicts":
            errors.append("contradicts relation not allowed in automated generation")
        if not conn.get("target"):
            errors.append("Connection missing target")
            continue
        
        # directed: true 只允許 logical 或 causal
        if conn.get("directed") is True and rel_type not in ("logical", "causal"):
            errors.append(f"directed: true only allowed with logical/causal, got: {rel_type}")
        
        target_id = conn["target"]
        target_node = node_lookup.get(target_id)
        if target_node:
            conn_target_domains.update(target_node.get("domain", []))
            if target_node.get("type") == "field":
                has_field_connection = True
        elif not conn.get("pending"):
            broken_connections.append(target_id)
        
        # pending connection 指向已存在節點 → 不應該是 pending
        if conn.get("pending") and target_id in node_lookup:
            warnings.append(f"Connection to '{target_id}' marked pending but target exists")
    
    # 跨域最低要求
    if len(connections) >= val_cfg["min_connections"]:
        # 加上自身 domain 計算覆蓋
        all_domains_in_connections = conn_target_domains | set(domains)
        if len(conn_target_domains) > 0 and len(conn_target_domains) < val_cfg["min_connection_domains"]:
            errors.append(
                f"Connections only span {len(conn_target_domains)} target domain(s), "
                f"need ≥{val_cfg['min_connection_domains']}"
            )
    
    # B1: 非 field 節點必須連結至少一個 field node
    if node_type != "field" and not has_field_connection and connections:
        pending_count = sum(1 for c in connections if c.get("pending"))
        if pending_count < len(connections):  # 至少有一些非 pending 的連結
            warnings.append("No connection to any field node (Phase 1 anchor)")
    
    # 斷連警告
    if broken_connections:
        warnings.append(f"Broken connections (target not found, not pending): {broken_connections[:3]}")
    
    # ── Display Tags ──
    tags = node.get("display_tags", [])
    if len(tags) > val_cfg["max_display_tags"]:
        errors.append(f"Too many display_tags: {len(tags)} (max {val_cfg['max_display_tags']})")
    if len(tags) < val_cfg["min_display_tags"]:
        warnings.append(f"Too few display_tags: {len(tags)} (min {val_cfg['min_display_tags']})")
    
    for tag in tags:
        if " " in tag or tag != tag.lower():
            errors.append(f"Tag format invalid: {tag}")
    
    # B1: tag 必須存在於 seed 或以 _REVIEW 結尾
    if SEED_TAGS:
        invalid_tags = [t for t in tags if t not in SEED_TAGS and not t.endswith("_REVIEW")]
        if invalid_tags:
            errors.append(f"Undefined tags (must be in seed or end with _REVIEW): {invalid_tags}")
    
    # ── verified ──
    if node.get("verified") is True:
        errors.append("verified must be false during generation")
    
    return errors, warnings

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fix", action="store_true", help="Auto-fix minor issues")
    parser.add_argument("--errors-only", action="store_true", help="Show only nodes with errors")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    args = parser.parse_args()
    
    nodes = load_nodes()
    print(f"Validating {len(nodes)} nodes...\n")
    
    # 建立 lookup table
    node_lookup = {n["id"]: n for n in nodes}
    field_ids = {n["id"] for n in nodes if n.get("type") == "field"}
    
    all_errors = []
    all_warnings = []
    nodes_with_errors = []
    nodes_clean = []
    
    # 檢查重複ID
    ids = [n.get("id", "") for n in nodes]
    id_counts = Counter(ids)
    duplicates = {nid: count for nid, count in id_counts.items() if count > 1}
    if duplicates:
        print(f"DUPLICATE IDs found:")
        for dup_id, count in duplicates.items():
            matching = [n for n in nodes if n.get("id") == dup_id]
            print(f"  ❌ '{dup_id}' appears {count}x:")
            for n in matching:
                print(f"     - label: {n.get('label')}, domain: {n.get('domain')}")
        print()
    
    for node in nodes:
        errors, warnings = validate_node(node, node_lookup, field_ids)
        if errors:
            nodes_with_errors.append((node, errors, warnings))
            all_errors.extend(errors)
        else:
            nodes_clean.append(node)
        all_warnings.extend(warnings)
    
    # JSON 輸出模式
    if args.json:
        output = {
            "total": len(nodes),
            "clean": len(nodes_clean),
            "with_errors": len(nodes_with_errors),
            "duplicates": duplicates,
            "errors": [
                {"id": n["id"], "errors": e, "warnings": w}
                for n, e, w in nodes_with_errors
            ]
        }
        print(json.dumps(output, ensure_ascii=False, indent=2))
        return
    
    # 輸出結果
    if nodes_with_errors:
        print(f"NODES WITH ERRORS ({len(nodes_with_errors)}):")
        print("─" * 60)
        for node, errors, warnings in nodes_with_errors:
            print(f"\n  {node.get('id', '???')}")
            for e in errors:
                print(f"    [ERR] {e}")
            for w in warnings:
                print(f"    [WARN] {w}")
    
    if not args.errors_only and all_warnings:
        print(f"\nWARNINGS SUMMARY:")
        warning_counts = Counter(all_warnings)
        for w, count in warning_counts.most_common():
            print(f"  [WARN] {w} ({count}x)")
    
    # 統計摘要
    print(f"\n{'='*60}")
    print(f"VALIDATION SUMMARY")
    print(f"{'='*60}")
    print(f"Total nodes:        {len(nodes)}")
    print(f"Clean nodes:        {len(nodes_clean)} ({100*len(nodes_clean)//max(len(nodes),1)}%)")
    print(f"Nodes with errors:  {len(nodes_with_errors)}")
    print(f"Total errors:       {len(all_errors)}")
    print(f"Total warnings:     {len(all_warnings)}")
    print(f"Duplicate IDs:      {len(duplicates)}")
    
    # Error 分佈
    if all_errors:
        print(f"\nERROR DISTRIBUTION:")
        # 歸類錯誤
        error_categories = Counter()
        for e in all_errors:
            if "description" in e.lower():
                error_categories["Description"] += 1
            elif "connection" in e.lower() or "relation" in e.lower():
                error_categories["Connections"] += 1
            elif "domain" in e.lower():
                error_categories["Domain"] += 1
            elif "tag" in e.lower():
                error_categories["Tags"] += 1
            elif "era" in e.lower():
                error_categories["Era"] += 1
            else:
                error_categories["Other"] += 1
        for cat, count in error_categories.most_common():
            print(f"  {cat}: {count}")
    
    # Domain 分佈
    print(f"\nDOMAIN DISTRIBUTION:")
    domain_count = Counter()
    for n in nodes:
        for d in n.get("domain", []):
            domain_count[d] += 1
    for domain in sorted(VALID_DOMAINS):
        count = domain_count.get(domain, 0)
        bar = "#" * (count // 2)
        print(f"  {domain}: {count:3d}  {bar}")
    
    # Type 分佈
    print(f"\nTYPE DISTRIBUTION:")
    type_count = Counter(n.get("type") for n in nodes)
    for t, c in type_count.most_common():
        print(f"  {t}: {c}")
    
    if len(nodes_with_errors) == 0:
        print(f"\n[PASS] All nodes passed validation")
    else:
        print(f"\n[FAIL] {len(nodes_with_errors)} nodes need attention")

if __name__ == "__main__":
    main()
