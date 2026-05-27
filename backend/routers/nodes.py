"""
Node CRUD endpoints.
"""

from fastapi import APIRouter, Query, HTTPException
from backend.services import json_service
from backend.services.resolver import get_graph_service

router = APIRouter()


@router.get("")
async def list_nodes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    domain: str = Query(None, description="Filter by domain code"),
    type: str = Query(None, description="Filter by node type"),
):
    """Paginated node listing with optional filters."""
    # list_nodes is a JSON-service-specific function; Neo4j equivalent not yet implemented
    return json_service.list_nodes(skip=skip, limit=limit, domain=domain, node_type=type)


@router.get("/{node_id}")
async def get_node(node_id: str):
    """Get full node details by ID."""
    service = get_graph_service()
    node = service.get_node_by_id(node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")
    return node
