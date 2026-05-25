"""
JSON file-based data service (fallback when Neo4j is unavailable).
Provides in-memory search and subgraph extraction from all_nodes.json.
"""

import json
from collections import defaultdict
from pathlib import Path
from typing import Optional

from backend.config import get_settings

_nodes_cache: Optional[list] = None
_index: Optional[dict] = None


def _load_nodes() -> list:
    """Load and cache all nodes from JSON file."""
    global _nodes_cache
    if _nodes_cache is not None:
        return _nodes_cache

    settings = get_settings()
    target = settings.nodes_file if settings.nodes_file.exists() else settings.field_nodes_file

    with open(target, encoding="utf-8") as f:
        data = json.load(f)

    _nodes_cache = data.get("nodes", [])
    return _nodes_cache


def _build_index() -> dict:
    """Build lookup index: id -> node, adjacency list."""
    global _index
    if _index is not None:
        return _index

    nodes = _load_nodes()
    by_id = {n["id"]: n for n in nodes}
    adj = defaultdict(set)

    for n in nodes:
        for conn in n.get("connections", []):
            adj[n["id"]].add(conn["target"])
            adj[conn["target"]].add(n["id"])

    _index = {"by_id": by_id, "adj": adj}
    return _index


def invalidate_cache():
    """Call after data changes to refresh cache."""
    global _nodes_cache, _index
    _nodes_cache = None
    _index = None


def get_subgraph(center_id: str, depth: int = 1, max_nodes: int = 200) -> dict:
    """BFS subgraph extraction from in-memory data."""
    index = _build_index()
    by_id = index["by_id"]
    adj = index["adj"]

    if center_id not in by_id:
        return {"nodes": [], "edges": []}

    # BFS to collect nodes within depth
    visited = {center_id}
    frontier = [center_id]

    for _ in range(depth):
        next_frontier = []
        for nid in frontier:
            for neighbor in adj.get(nid, []):
                if neighbor not in visited and len(visited) < max_nodes:
                    visited.add(neighbor)
                    next_frontier.append(neighbor)
        frontier = next_frontier
        if not frontier:
            break

    # Build response
    nodes_out = []
    for nid in visited:
        n = by_id.get(nid)
        if n:
            nodes_out.append({
                "id": n["id"],
                "label": n["label"],
                "type": n["type"],
                "domain": n.get("domain", []),
                "description": n.get("description", ""),
                "display_tags": n.get("display_tags", []),
                "has_subgraph": n.get("has_subgraph", False),
                "era": n.get("era"),
            })

    edges_out = []
    for nid in visited:
        n = by_id.get(nid)
        if not n:
            continue
        for conn in n.get("connections", []):
            if conn["target"] in visited:
                edges_out.append({
                    "source": nid,
                    "target": conn["target"],
                    "relation_type": conn.get("relation_type", ""),
                    "relation": conn.get("relation", ""),
                    "directed": conn.get("directed", False),
                    "learning_prerequisite": conn.get("learning_prerequisite", False),
                    "pending": conn.get("pending", False),
                })

    return {"nodes": nodes_out, "edges": edges_out}


def search_nodes(query: str, limit: int = 20, domain: str = None, node_type: str = None) -> list:
    """Simple text search across label, description, tags."""
    nodes = _load_nodes()
    query_lower = query.lower()
    results = []

    for n in nodes:
        # Apply filters
        if domain and domain not in n.get("domain", []):
            continue
        if node_type and n.get("type") != node_type:
            continue

        # Score by match location
        score = 0.0
        label = n.get("label", "").lower()
        desc = n.get("description", "").lower()
        tags = " ".join(n.get("display_tags", [])).lower()
        node_id = n.get("id", "").lower()

        if query_lower == label:
            score = 100.0
        elif query_lower in label:
            score = 80.0
        elif query_lower in node_id:
            score = 60.0
        elif query_lower in tags:
            score = 40.0
        elif query_lower in desc:
            score = 20.0

        if score > 0:
            results.append({
                "id": n["id"],
                "label": n["label"],
                "type": n["type"],
                "domain": n.get("domain", []),
                "description": n.get("description", "")[:150],
                "score": score,
            })

    results.sort(key=lambda x: -x["score"])
    return results[:limit]


def get_node_by_id(node_id: str) -> Optional[dict]:
    """Get full node by ID."""
    index = _build_index()
    return index["by_id"].get(node_id)


def get_full_graph() -> dict:
    """Return all nodes with all edges for full-graph rendering (no descriptions for size)."""
    nodes = _load_nodes()
    id_set = set(n["id"] for n in nodes)

    nodes_out = []
    for n in nodes:
        nodes_out.append({
            "id": n["id"],
            "label": n["label"],
            "type": n["type"],
            "domain": n.get("domain", []),
            "display_tags": n.get("display_tags", []),
            "has_subgraph": n.get("has_subgraph", False),
            "era": n.get("era"),
            "connections": n.get("connections", []),
        })

    # Build deduplicated edges (same logic as old frontend)
    edge_set = set()
    edges_out = []
    for n in nodes:
        for conn in n.get("connections", []):
            if conn["target"] not in id_set:
                continue
            key = "|".join(sorted([n["id"], conn["target"]])) + conn.get("relation_type", "")
            if key in edge_set:
                continue
            edge_set.add(key)
            edges_out.append({
                "source": n["id"],
                "target": conn["target"],
                "relation_type": conn.get("relation_type", ""),
                "relation": conn.get("relation", ""),
                "directed": conn.get("directed", False),
                "learning_prerequisite": conn.get("learning_prerequisite", False),
                "pending": conn.get("pending", False),
            })

    return {"nodes": nodes_out, "edges": edges_out}


def get_all_descriptions() -> dict:
    """Return a map of node_id -> description for all nodes."""
    nodes = _load_nodes()
    return {n["id"]: n.get("description", "") for n in nodes if n.get("description")}


def get_stats() -> dict:
    """Get basic statistics."""
    nodes = _load_nodes()
    domain_counts = defaultdict(int)
    type_counts = defaultdict(int)
    total_edges = 0

    for n in nodes:
        for d in n.get("domain", []):
            domain_counts[d] += 1
        type_counts[n.get("type", "unknown")] += 1
        total_edges += len(n.get("connections", []))

    return {
        "total_nodes": len(nodes),
        "total_edges": total_edges,
        "domain_distribution": dict(domain_counts),
        "type_distribution": dict(type_counts),
    }


def list_nodes(skip: int = 0, limit: int = 50, domain: str = None, node_type: str = None) -> dict:
    """Paginated node listing."""
    nodes = _load_nodes()

    filtered = nodes
    if domain:
        filtered = [n for n in filtered if domain in n.get("domain", [])]
    if node_type:
        filtered = [n for n in filtered if n.get("type") == node_type]

    total = len(filtered)
    page = filtered[skip:skip + limit]

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "nodes": [{
            "id": n["id"],
            "label": n["label"],
            "type": n["type"],
            "domain": n.get("domain", []),
            "description": n.get("description", "")[:150],
        } for n in page]
    }
