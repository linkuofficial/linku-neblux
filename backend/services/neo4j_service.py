"""
Neo4j graph database service layer.
Provides connection pooling and query helpers.
"""

from contextlib import contextmanager
from typing import Optional

from backend.config import get_settings

_driver = None


def get_driver():
    """Lazy-initialize Neo4j driver (singleton)."""
    global _driver
    if _driver is None:
        from neo4j import GraphDatabase
        settings = get_settings()
        _driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
    return _driver


def close_driver():
    global _driver
    if _driver:
        _driver.close()
        _driver = None


@contextmanager
def get_session():
    """Context manager for Neo4j sessions."""
    driver = get_driver()
    session = driver.session()
    try:
        yield session
    finally:
        session.close()


def get_subgraph(center_id: str, depth: int = 1, max_nodes: int = 200) -> dict:
    """
    Fetch a subgraph centered on a node, up to given depth.
    Returns {nodes: [...], edges: [...]}.
    """
    with get_session() as session:
        result = session.run("""
            MATCH path = (center:Node {id: $center_id})-[*1..$depth]-(neighbor:Node)
            WITH center, collect(DISTINCT neighbor) AS neighbors
            WITH [center] + neighbors AS all_nodes
            UNWIND all_nodes AS n
            WITH collect(DISTINCT n)[..$max_nodes] AS limited_nodes
            UNWIND limited_nodes AS n
            OPTIONAL MATCH (n)-[r:CONNECTED]-(m)
            WHERE m IN limited_nodes
            RETURN
                collect(DISTINCT {
                    id: n.id, label: n.label, type: n.type,
                    domain: n.domain, description: n.description,
                    display_tags: n.display_tags, has_subgraph: n.has_subgraph,
                    era_start: n.era_start, era_end: n.era_end
                }) AS nodes,
                collect(DISTINCT {
                    source: startNode(r).id, target: endNode(r).id,
                    relation_type: r.relation_type, relation: r.relation,
                    directed: r.directed, learning_prerequisite: r.learning_prerequisite
                }) AS edges
        """, {"center_id": center_id, "depth": depth, "max_nodes": max_nodes})

        record = result.single()
        if not record:
            return {"nodes": [], "edges": []}

        return {"nodes": record["nodes"], "edges": record["edges"]}


def get_path(from_id: str, to_id: str, max_length: int = 10) -> dict:
    """Find shortest path between two nodes."""
    with get_session() as session:
        result = session.run("""
            MATCH path = shortestPath(
                (a:Node {id: $from_id})-[*..{max_length}]-(b:Node {id: $to_id})
            )
            UNWIND nodes(path) AS n
            UNWIND relationships(path) AS r
            RETURN
                collect(DISTINCT {
                    id: n.id, label: n.label, type: n.type, domain: n.domain
                }) AS nodes,
                collect(DISTINCT {
                    source: startNode(r).id, target: endNode(r).id,
                    relation_type: r.relation_type, relation: r.relation
                }) AS edges
        """.replace("{max_length}", str(max_length)),
            {"from_id": from_id, "to_id": to_id})

        record = result.single()
        if not record:
            return {"nodes": [], "edges": [], "found": False}

        return {"nodes": record["nodes"], "edges": record["edges"], "found": True}


def fulltext_search(query: str, limit: int = 20) -> list:
    """Search nodes using Neo4j full-text index."""
    with get_session() as session:
        result = session.run("""
            CALL db.index.fulltext.queryNodes("nodeSearch", $query)
            YIELD node, score
            RETURN node.id AS id, node.label AS label, node.type AS type,
                   node.domain AS domain, node.description AS description,
                   score
            ORDER BY score DESC
            LIMIT $limit
        """, {"query": query, "limit": limit})

        return [dict(record) for record in result]


def get_stats() -> dict:
    """Get graph statistics."""
    with get_session() as session:
        node_count = session.run("MATCH (n:Node) RETURN count(n) AS count").single()["count"]
        edge_count = session.run("MATCH ()-[r:CONNECTED]-() RETURN count(r) AS count").single()["count"]
        domain_dist = session.run("""
            MATCH (n:Node)
            UNWIND n.domain AS d
            RETURN d AS domain, count(*) AS count
            ORDER BY count DESC
        """)
        domains = {r["domain"]: r["count"] for r in domain_dist}

        return {
            "total_nodes": node_count,
            "total_edges": edge_count,
            "domain_distribution": domains,
        }


def get_node_by_id(node_id: str) -> Optional[dict]:
    """Get a single node with full details."""
    with get_session() as session:
        result = session.run("""
            MATCH (n:Node {id: $id})
            OPTIONAL MATCH (n)-[r:CONNECTED]-(m:Node)
            RETURN n {.*,
                connections: collect({
                    target: m.id, target_label: m.label,
                    relation_type: r.relation_type, relation: r.relation,
                    directed: r.directed, learning_prerequisite: r.learning_prerequisite
                })
            } AS node
        """, {"id": node_id})

        record = result.single()
        return dict(record["node"]) if record and record["node"] else None
