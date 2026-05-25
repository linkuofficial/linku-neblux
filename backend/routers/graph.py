"""
Graph query endpoints — subgraph extraction, path finding, statistics.
Falls back to JSON service if Neo4j is unavailable.
"""

import hashlib
import json

from fastapi import APIRouter, Query, HTTPException, Request
from fastapi.responses import Response
from backend.services import cache
from backend.services.resolver import get_graph_service
from backend.models import SubgraphResponse, StatsResponse

router = APIRouter()

# Pre-serialized full graph cache (avoids repeated 1.8MB JSON encode)
_full_graph_bytes: bytes | None = None
_full_graph_etag: str | None = None


def _build_full_graph_cache():
    """Build and cache the serialized full graph response."""
    global _full_graph_bytes, _full_graph_etag
    service = get_graph_service()
    result = service.get_full_graph()
    _full_graph_bytes = json.dumps(result, ensure_ascii=False).encode("utf-8")
    _full_graph_etag = hashlib.md5(_full_graph_bytes).hexdigest()


def invalidate_full_graph_cache():
    """Call after data changes to force rebuild on next request."""
    global _full_graph_bytes, _full_graph_etag
    _full_graph_bytes = None
    _full_graph_etag = None


@router.get("/subgraph", response_model=SubgraphResponse)
async def subgraph(
    center: str = Query(..., description="Center node ID"),
    depth: int = Query(1, ge=1, le=5, description="BFS depth"),
    max_nodes: int = Query(200, ge=10, le=1000, description="Max nodes to return"),
):
    """Get a subgraph centered on a node."""
    # Check cache
    params = {"center": center, "depth": depth, "max_nodes": max_nodes}
    cached = cache.get("subgraph", params)
    if cached:
        return cached

    service = get_graph_service()
    result = service.get_subgraph(center, depth=depth, max_nodes=max_nodes)
    if not result["nodes"]:
        raise HTTPException(status_code=404, detail=f"Node '{center}' not found")

    cache.set("subgraph", params, result, ttl_seconds=cache.TTL_SUBGRAPH)
    return result


@router.get("/full")
async def full_graph(request: Request):
    """Return the complete graph (all nodes + all edges)."""
    global _full_graph_bytes, _full_graph_etag

    if _full_graph_bytes is None:
        _build_full_graph_cache()

    # ETag: skip body if client already has latest
    if_none_match = request.headers.get("if-none-match")
    if if_none_match and if_none_match == _full_graph_etag:
        return Response(status_code=304)

    return Response(
        content=_full_graph_bytes,
        media_type="application/json",
        headers={"ETag": _full_graph_etag, "Cache-Control": "public, max-age=300"},
    )


# Pre-serialized descriptions cache
_descriptions_bytes: bytes | None = None
_descriptions_etag: str | None = None


def _build_descriptions_cache():
    """Build and cache the serialized descriptions map."""
    global _descriptions_bytes, _descriptions_etag
    service = get_graph_service()
    result = service.get_all_descriptions()
    _descriptions_bytes = json.dumps(result, ensure_ascii=False).encode("utf-8")
    _descriptions_etag = hashlib.md5(_descriptions_bytes).hexdigest()


def invalidate_descriptions_cache():
    """Call after data changes."""
    global _descriptions_bytes, _descriptions_etag
    _descriptions_bytes = None
    _descriptions_etag = None


@router.get("/descriptions")
async def descriptions(request: Request):
    """Return all node descriptions as {id: description} map."""
    global _descriptions_bytes, _descriptions_etag

    if _descriptions_bytes is None:
        _build_descriptions_cache()

    if_none_match = request.headers.get("if-none-match")
    if if_none_match and if_none_match == _descriptions_etag:
        return Response(status_code=304)

    return Response(
        content=_descriptions_bytes,
        media_type="application/json",
        headers={"ETag": _descriptions_etag, "Cache-Control": "public, max-age=300"},
    )


@router.get("/path")
async def find_path(
    source: str = Query(..., alias="from", description="Source node ID"),
    target: str = Query(..., alias="to", description="Target node ID"),
):
    """Find shortest path between two nodes."""
    # Path finding only available with Neo4j
    try:
        from backend.services.neo4j_service import get_driver, get_path
        get_driver().verify_connectivity()
        result = get_path(source, target)
        if not result.get("found"):
            raise HTTPException(status_code=404, detail="No path found between nodes")
        return result
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=501, detail="Path finding requires Neo4j")


@router.get("/stats", response_model=StatsResponse)
async def stats():
    """Get graph statistics."""
    cached = cache.get("stats", {})
    if cached:
        return cached

    service = get_graph_service()
    result = service.get_stats()
    cache.set("stats", {}, result, ttl_seconds=cache.TTL_STATS)
    return result
