"""
import_to_neo4j.py
------------------
將 all_nodes.json 匯入 Neo4j 圖資料庫。

需要先安裝：
  pip install neo4j

需要設定環境變數：
  export NEO4J_URI=bolt://localhost:7687
  export NEO4J_USER=neo4j
  export NEO4J_PASSWORD=your_password

使用方法：
  python import_to_neo4j.py              # 匯入所有節點
  python import_to_neo4j.py --clear      # 清空資料庫後重新匯入
  python import_to_neo4j.py --dry-run    # 只顯示會執行的操作，不實際執行
"""

import json
import os
import argparse
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
NODES_FILE = DATA_DIR / "all_nodes.json"
FIELD_NODES_FILE = DATA_DIR / "field_nodes.json"

def load_nodes():
    target = NODES_FILE if NODES_FILE.exists() else FIELD_NODES_FILE
    with open(target) as f:
        data = json.load(f)
    return data.get("nodes", [])

def build_edges(nodes: list) -> list:
    edges = []
    seen = set()
    for node in nodes:
        for conn in node.get("connections", []):
            a, b = node["id"], conn["target"]
            key = tuple(sorted([a, b])) + (conn["relation_type"],)
            if key not in seen:
                seen.add(key)
                edges.append({
                    "source": a,
                    "target": b,
                    "relation_type": conn["relation_type"],
                    "relation": conn.get("relation", ""),
                    "directed": conn.get("directed", False),
                    "pending": conn.get("pending", False),
                    "learning_prerequisite": conn.get("learning_prerequisite", False),
                    "parallel_development": conn.get("parallel_development", False)
                })
    return edges

def import_to_neo4j(nodes: list, edges: list, clear: bool = False, dry_run: bool = False):
    try:
        from neo4j import GraphDatabase
    except ImportError:
        print("Error: neo4j package not installed. Run: pip install neo4j")
        return
    
    uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD", "")
    
    if not password:
        print("Error: NEO4J_PASSWORD environment variable not set")
        return
    
    if dry_run:
        print(f"DRY RUN — would import:")
        print(f"  {len(nodes)} nodes")
        print(f"  {len(edges)} edges")
        print(f"  To: {uri}")
        return
    
    driver = GraphDatabase.driver(uri, auth=(user, password))
    
    with driver.session() as session:
        if clear:
            print("Clearing database...")
            session.run("MATCH (n) DETACH DELETE n")
        
        # 建立索引
        print("Creating indexes...")
        session.run("CREATE INDEX node_id IF NOT EXISTS FOR (n:Node) ON (n.id)")
        session.run("CREATE INDEX node_type IF NOT EXISTS FOR (n:Node) ON (n.type)")
        session.run("CREATE INDEX node_domain IF NOT EXISTS FOR (n:Node) ON (n.domain)")
        session.run("CREATE INDEX node_era IF NOT EXISTS FOR (n:Node) ON (n.era_start)")
        
        # Full-text search index for label + description
        print("Creating full-text search index...")
        session.run("""
            CREATE FULLTEXT INDEX nodeSearch IF NOT EXISTS
            FOR (n:Node) ON EACH [n.label, n.description]
        """)
        
        # Index for learning path queries
        session.run("""
            CREATE INDEX edge_prerequisite IF NOT EXISTS
            FOR ()-[r:CONNECTED]-() ON (r.learning_prerequisite)
        """)
        
        # 匯入節點
        print(f"Importing {len(nodes)} nodes...")
        for i, node in enumerate(nodes):
            session.run("""
                MERGE (n:Node {id: $id})
                SET n.label = $label,
                    n.type = $type,
                    n.domain = $domain,
                    n.display_tags = $display_tags,
                    n.description = $description,
                    n.has_subgraph = $has_subgraph,
                    n.verified = $verified,
                    n.schema_version = $schema_version
            """, {
                "id": node["id"],
                "label": node["label"],
                "type": node["type"],
                "domain": node.get("domain", []),
                "display_tags": node.get("display_tags", []),
                "description": node.get("description", ""),
                "has_subgraph": node.get("has_subgraph", False),
                "verified": node.get("verified", False),
                "schema_version": node.get("schema_version", 1)
            })
            if (i+1) % 100 == 0:
                print(f"  {i+1}/{len(nodes)} nodes imported")
        
        # 匯入邊
        print(f"Importing {len(edges)} edges...")
        pending_count = 0
        imported_count = 0
        
        for edge in edges:
            if edge.get("pending"):
                pending_count += 1
                continue
            
            result = session.run("""
                MATCH (a:Node {id: $source})
                MATCH (b:Node {id: $target})
                MERGE (a)-[r:CONNECTED {relation_type: $relation_type}]-(b)
                SET r.relation = $relation,
                    r.directed = $directed,
                    r.learning_prerequisite = $learning_prerequisite,
                    r.parallel_development = $parallel_development
                RETURN r
            """, {
                "source": edge["source"],
                "target": edge["target"],
                "relation_type": edge["relation_type"],
                "relation": edge["relation"],
                "directed": edge["directed"],
                "learning_prerequisite": edge.get("learning_prerequisite", False),
                "parallel_development": edge.get("parallel_development", False)
            })
            if result.single():
                imported_count += 1
        
        print(f"\nImport complete:")
        print(f"  Nodes imported: {len(nodes)}")
        print(f"  Edges imported: {imported_count}")
        print(f"  Pending edges skipped: {pending_count}")
    
    driver.close()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--clear", action="store_true", help="Clear database before import")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be imported")
    args = parser.parse_args()
    
    nodes = load_nodes()
    edges = build_edges(nodes)
    
    print(f"Loaded: {len(nodes)} nodes, {len(edges)} edges")
    import_to_neo4j(nodes, edges, clear=args.clear, dry_run=args.dry_run)

if __name__ == "__main__":
    main()
