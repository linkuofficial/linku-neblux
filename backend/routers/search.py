"""
Search endpoints — full-text and filtered search.
"""

from fastapi import APIRouter, Query
from backend.services import cache
from backend.services.resolver import get_graph_service
from backend.models import SearchResponse

router = APIRouter()


@router.get("", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, max_length=200, description="Search query"),
    limit: int = Query(20, ge=1, le=100),
    domain: str = Query(None, description="Filter by domain code"),
    type: str = Query(None, description="Filter by node type"),
):
    """
    Search knowledge nodes.
    Uses Neo4j full-text index when available, otherwise falls back to
    in-memory string matching. Results are cached for 2 minutes.
    """
    params = {"q": q, "limit": limit, "domain": domain, "type": type}
    cached = cache.get("search", params)
    if cached:
        return cached

    service = get_graph_service()

    # Neo4j fulltext search
    if hasattr(service, "fulltext_search"):
        results = service.fulltext_search(q, limit=limit)
        if domain:
            results = [r for r in results if domain in (r.get("domain") or [])]
        if type:
            results = [r for r in results if r.get("type") == type]
        response = {"results": results[:limit], "total": len(results)}
    else:
        # JSON fallback
        results = service.search_nodes(q, limit=limit, domain=domain, node_type=type)
        response = {"results": results, "total": len(results)}

    cache.set("search", params, response, ttl_seconds=cache.TTL_SEARCH)
    return response
