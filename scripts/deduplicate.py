"""
deduplicate.py
--------------
偵測並處理重複或語義相似的節點。
支援三層去重策略：
  1. 字串相似度（SequenceMatcher）
  2. 語義 embedding 相似度（sentence-transformers，可選）
  3. Connection target 重疊度

使用方法：
  python deduplicate.py                    # 字串去重（快速）
  python deduplicate.py --semantic         # 加入語義去重（需要 sentence-transformers）
  python deduplicate.py --threshold 0.80   # 調整閾值
  python deduplicate.py --merge            # 互動式合併重複節點
"""

import json
import argparse
from pathlib import Path
from difflib import SequenceMatcher

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

def load_nodes():
    target = NODES_FILE if NODES_FILE.exists() else FIELD_NODES_FILE
    with open(target, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("nodes", []), target

def string_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

# ── 字串去重（O(n²) 但用 get_close_matches 加速） ────
def find_string_duplicates(nodes: list, threshold: float) -> list:
    """字串相似度去重，對 label 和 id 同時比較"""
    candidates = []
    labels = [(n["id"], n["label"]) for n in nodes]
    n = len(labels)
    
    # 優化：先按首字母分組減少比較次數
    by_first_char = {}
    for idx, (nid, label) in enumerate(labels):
        key = label[0].lower() if label else ""
        by_first_char.setdefault(key, []).append(idx)
    
    checked = set()
    
    for i in range(n):
        id_a, label_a = labels[i]
        for j in range(i + 1, n):
            if (i, j) in checked:
                continue
            
            id_b, label_b = labels[j]
            
            # 完全相同的 label
            if label_a.lower() == label_b.lower():
                candidates.append({
                    "type": "exact_label",
                    "node_a": id_a,
                    "label_a": label_a,
                    "node_b": id_b,
                    "label_b": label_b,
                    "score": 1.0,
                    "method": "string"
                })
                checked.add((i, j))
            # 高相似度 label
            elif string_similarity(label_a, label_b) >= threshold:
                score = string_similarity(label_a, label_b)
                candidates.append({
                    "type": "similar_label",
                    "node_a": id_a,
                    "label_a": label_a,
                    "node_b": id_b,
                    "label_b": label_b,
                    "score": round(score, 3),
                    "method": "string"
                })
                checked.add((i, j))
    
    return candidates

# ── 語義去重（需要 sentence-transformers） ─────────────
def find_semantic_duplicates(nodes: list, threshold: float) -> list:
    """
    使用 sentence-transformers 計算 embedding 相似度。
    比字串比對能抓到同義詞、縮寫等語義重複。
    """
    try:
        from sentence_transformers import SentenceTransformer
        import numpy as np
    except ImportError:
        print("⚠️  sentence-transformers not installed. Run: pip install sentence-transformers")
        print("   Skipping semantic deduplication.")
        return []
    
    model_name = CONFIG["deduplication"]["embedding_model"]
    print(f"  Loading embedding model: {model_name}...")
    model = SentenceTransformer(model_name)
    
    # 用 label + description 前50字作為語義表示
    texts = []
    for n in nodes:
        desc_snippet = n.get("description", "")[:100]
        texts.append(f"{n['label']}. {desc_snippet}")
    
    print(f"  Computing embeddings for {len(texts)} nodes...")
    embeddings = model.encode(texts, show_progress_bar=True, normalize_embeddings=True)
    
    # 計算 cosine similarity（embeddings 已正規化，直接點積）
    candidates = []
    n_nodes = len(nodes)
    
    # 批次計算避免 O(n²) 記憶體問題
    batch_size = 500
    for i_start in range(0, n_nodes, batch_size):
        i_end = min(i_start + batch_size, n_nodes)
        batch_emb = embeddings[i_start:i_end]
        
        # 計算此 batch 與所有後續節點的相似度
        for j_start in range(i_start, n_nodes, batch_size):
            j_end = min(j_start + batch_size, n_nodes)
            
            if j_start == i_start:
                # 同一 batch 內，只計算上三角
                sim_matrix = np.dot(batch_emb, batch_emb.T)
                for i_local in range(i_end - i_start):
                    for j_local in range(i_local + 1, i_end - i_start):
                        if sim_matrix[i_local, j_local] >= threshold:
                            i_global = i_start + i_local
                            j_global = i_start + j_local
                            candidates.append({
                                "type": "semantic_similar",
                                "node_a": nodes[i_global]["id"],
                                "label_a": nodes[i_global]["label"],
                                "node_b": nodes[j_global]["id"],
                                "label_b": nodes[j_global]["label"],
                                "score": round(float(sim_matrix[i_local, j_local]), 3),
                                "method": "semantic"
                            })
            elif j_start > i_start:
                other_emb = embeddings[j_start:j_end]
                sim_matrix = np.dot(batch_emb, other_emb.T)
                for i_local in range(i_end - i_start):
                    for j_local in range(j_end - j_start):
                        if sim_matrix[i_local, j_local] >= threshold:
                            i_global = i_start + i_local
                            j_global = j_start + j_local
                            candidates.append({
                                "type": "semantic_similar",
                                "node_a": nodes[i_global]["id"],
                                "label_a": nodes[i_global]["label"],
                                "node_b": nodes[j_global]["id"],
                                "label_b": nodes[j_global]["label"],
                                "score": round(float(sim_matrix[i_local, j_local]), 3),
                                "method": "semantic"
                            })
    
    return candidates

# ── Connection 重疊去重 ────────────────────────────────
def find_connection_overlaps(nodes: list, threshold: float) -> list:
    """偵測 connection target 高度重疊的節點對（即使 label 不同）"""
    candidates = []
    
    # 建立每個節點的 connection target set
    conn_sets = {}
    for n in nodes:
        targets = frozenset(
            c["target"] for c in n.get("connections", [])
            if c.get("target") and not c.get("pending")
        )
        if len(targets) >= 2:  # 至少有 2 個有效 target 才有意義
            conn_sets[n["id"]] = targets
    
    ids = list(conn_sets.keys())
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            set_a = conn_sets[ids[i]]
            set_b = conn_sets[ids[j]]
            
            intersection = set_a & set_b
            union = set_a | set_b
            
            if not union:
                continue
            
            overlap = len(intersection) / len(union)  # Jaccard similarity
            if overlap >= threshold:
                node_a = next(n for n in nodes if n["id"] == ids[i])
                node_b = next(n for n in nodes if n["id"] == ids[j])
                candidates.append({
                    "type": "connection_overlap",
                    "node_a": ids[i],
                    "label_a": node_a["label"],
                    "node_b": ids[j],
                    "label_b": node_b["label"],
                    "score": round(overlap, 3),
                    "shared_targets": list(intersection)[:5],
                    "method": "connection_overlap"
                })
    
    return candidates

# ── 孤立節點偵測 ───────────────────────────────────────
def find_orphans(nodes: list) -> list:
    all_ids = {n["id"] for n in nodes}
    referenced = set()
    for n in nodes:
        for conn in n.get("connections", []):
            referenced.add(conn.get("target"))
    
    orphans = []
    for n in nodes:
        incoming = n["id"] in referenced
        
        # 非 field 節點沒有入連結
        if not incoming and n["type"] != "field":
            orphans.append({"id": n["id"], "label": n["label"], "issue": "no incoming connections"})
        
        # 有效出連結全部斷裂（target 不存在且非 pending）
        broken_out = [
            c["target"] for c in n.get("connections", [])
            if not c.get("pending") and c.get("target") not in all_ids
        ]
        if broken_out:
            orphans.append({
                "id": n["id"], 
                "label": n["label"], 
                "issue": f"broken outgoing connections: {broken_out[:3]}"
            })
    
    return orphans

# ── 主程式 ─────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--threshold", type=float, default=None, help="String similarity threshold (0-1)")
    parser.add_argument("--semantic", action="store_true", help="Enable semantic deduplication")
    parser.add_argument("--semantic-threshold", type=float, default=None, help="Semantic similarity threshold")
    parser.add_argument("--merge", action="store_true", help="Interactive merge mode")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()
    
    dedup_cfg = CONFIG["deduplication"]
    str_threshold = args.threshold or dedup_cfg["string_threshold"]
    sem_threshold = args.semantic_threshold or dedup_cfg["semantic_threshold"]
    conn_threshold = dedup_cfg["connection_overlap_threshold"]
    
    nodes, source_file = load_nodes()
    print(f"Loaded {len(nodes)} nodes from {source_file.name}\n")
    
    all_duplicates = []
    
    # 1. 字串去重
    print("🔍 String similarity check...")
    string_dups = find_string_duplicates(nodes, str_threshold)
    all_duplicates.extend(string_dups)
    
    exact = [d for d in string_dups if d["type"] == "exact_label"]
    similar = [d for d in string_dups if d["type"] == "similar_label"]
    
    if exact:
        print(f"\n  EXACT DUPLICATES ({len(exact)}):")
        for d in exact:
            print(f"    ❌ '{d['label_a']}' → {d['node_a']} & {d['node_b']}")
    
    if similar:
        print(f"\n  SIMILAR LABELS ({len(similar)}) — threshold {str_threshold}:")
        for d in sorted(similar, key=lambda x: -x["score"])[:20]:
            print(f"    ⚠️  [{d['score']}] '{d['label_a']}' vs '{d['label_b']}'")
    
    # 2. 語義去重（可選）
    semantic_dups = []
    if args.semantic:
        print(f"\n🧠 Semantic similarity check (threshold={sem_threshold})...")
        semantic_dups = find_semantic_duplicates(nodes, sem_threshold)
        # 過濾掉已在字串去重中找到的
        string_pairs = {(d["node_a"], d["node_b"]) for d in string_dups}
        semantic_dups = [d for d in semantic_dups 
                        if (d["node_a"], d["node_b"]) not in string_pairs
                        and (d["node_b"], d["node_a"]) not in string_pairs]
        all_duplicates.extend(semantic_dups)
        
        if semantic_dups:
            print(f"\n  SEMANTIC DUPLICATES ({len(semantic_dups)}) — not caught by string check:")
            for d in sorted(semantic_dups, key=lambda x: -x["score"])[:20]:
                print(f"    🧠 [{d['score']}] '{d['label_a']}' vs '{d['label_b']}'")
    
    # 3. Connection 重疊
    print(f"\n🔗 Connection overlap check (threshold={conn_threshold})...")
    conn_dups = find_connection_overlaps(nodes, conn_threshold)
    # 過濾已發現的
    known_pairs = {(d["node_a"], d["node_b"]) for d in all_duplicates}
    conn_dups = [d for d in conn_dups 
                 if (d["node_a"], d["node_b"]) not in known_pairs
                 and (d["node_b"], d["node_a"]) not in known_pairs]
    all_duplicates.extend(conn_dups)
    
    if conn_dups:
        print(f"\n  CONNECTION OVERLAPS ({len(conn_dups)}):")
        for d in sorted(conn_dups, key=lambda x: -x["score"])[:10]:
            print(f"    🔗 [{d['score']}] '{d['label_a']}' vs '{d['label_b']}'")
            print(f"       Shared: {d.get('shared_targets', [])[:3]}")
    
    # 4. 孤立節點偵測
    print(f"\n🏝️  Orphan node check...")
    orphans = find_orphans(nodes)
    if orphans:
        print(f"\n  ORPHAN NODES ({len(orphans)}):")
        for o in orphans[:20]:
            print(f"    ⚠️  {o['id']} — {o['issue']}")
        if len(orphans) > 20:
            print(f"    ... and {len(orphans) - 20} more")
    
    # 連通性統計
    print(f"\n📊 CONNECTIVITY STATS:")
    conn_counts = [len(n.get("connections", [])) for n in nodes]
    if conn_counts:
        print(f"  Min connections: {min(conn_counts)}")
        print(f"  Max connections: {max(conn_counts)}")
        print(f"  Avg connections: {sum(conn_counts)/len(conn_counts):.1f}")
        under3 = sum(1 for c in conn_counts if c < 3)
        if under3:
            print(f"  Nodes with <3 connections: {under3}")
    
    # 摘要
    print(f"\n{'='*50}")
    print(f"DEDUPLICATION SUMMARY")
    print(f"{'='*50}")
    print(f"Exact duplicates:      {len(exact)}")
    print(f"String similar:        {len(similar)}")
    print(f"Semantic similar:      {len(semantic_dups)}")
    print(f"Connection overlaps:   {len(conn_dups)}")
    print(f"Orphan nodes:          {len(orphans)}")
    print(f"Total issues:          {len(all_duplicates) + len(orphans)}")
    
    if not all_duplicates and not orphans:
        print(f"\n✓ No issues found")
    else:
        report_path = DATA_DIR / "dedup_report.json"
        report = {
            "timestamp": __import__("datetime").datetime.now().isoformat(),
            "config": {
                "string_threshold": str_threshold,
                "semantic_threshold": sem_threshold if args.semantic else None,
                "connection_threshold": conn_threshold,
            },
            "duplicates": all_duplicates,
            "orphans": orphans,
            "summary": {
                "exact": len(exact),
                "string_similar": len(similar),
                "semantic_similar": len(semantic_dups),
                "connection_overlaps": len(conn_dups),
                "orphans": len(orphans),
            }
        }
        
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n✗ Manual review recommended for flagged items")
        print(f"  Report saved to: {report_path}")

if __name__ == "__main__":
    main()
