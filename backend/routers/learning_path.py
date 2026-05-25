"""
Learning Path endpoints — progress tracking, recommendations, path computation.
"""

import json
from pathlib import Path

from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel

from backend.auth import require_admin_key
from backend.config import BASE_DIR

router = APIRouter()


class ProgressUpdate(BaseModel):
    learned: list[str]


# File-based persistence
_PROGRESS_FILE = BASE_DIR / "data" / "learning_progress.json"


def _load_progress() -> set[str]:
    """Load learning progress from file."""
    if _PROGRESS_FILE.exists():
        with open(_PROGRESS_FILE, encoding="utf-8") as f:
            data = json.load(f)
        return set(data.get("learned", []))
    return set()


def _save_progress(learned: set[str]) -> None:
    """Save learning progress to file."""
    _PROGRESS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(_PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump({"learned": sorted(learned)}, f, ensure_ascii=False, indent=2)


def _get_graph_service():
    from backend.services import json_service
    return json_service


@router.get("/progress")
async def get_progress():
    """Get current learning progress."""
    service = _get_graph_service()
    learned = _load_progress()

    # Compute available nodes (nodes whose prerequisites are all learned)
    all_nodes = service._load_nodes()
    available = set()

    # Build prerequisite map: node_id -> set of prerequisite node_ids
    prereq_map: dict[str, set[str]] = {}
    for node in all_nodes:
        for conn in node.get("connections", []):
            if conn.get("learning_prerequisite") and conn.get("directed"):
                # This node depends on conn["target"]
                prereq_map.setdefault(node["id"], set()).add(conn["target"])

    # A node is "available" if:
    # 1. Not already learned
    # 2. All its prerequisites are learned
    # 3. It has at least one connection to a learned node
    for node in all_nodes:
        nid = node["id"]
        if nid in learned:
            continue

        prereqs = prereq_map.get(nid, set())
        if prereqs and prereqs.issubset(learned):
            available.add(nid)
        elif not prereqs:
            # No explicit prerequisites — available if connected to any learned node
            for conn in node.get("connections", []):
                if conn["target"] in learned:
                    available.add(nid)
                    break

    return {
        "learned": sorted(learned),
        "available": sorted(available),
        "total_learned": len(learned),
        "total_available": len(available),
    }


@router.put("/progress", dependencies=[Depends(require_admin_key)])
async def update_progress(body: ProgressUpdate):
    """Update learning progress (replace learned set)."""
    _save_progress(set(body.learned))
    return {"status": "ok", "total_learned": len(body.learned)}


@router.post("/progress/toggle/{node_id}", dependencies=[Depends(require_admin_key)])
async def toggle_learned(node_id: str):
    """Toggle a single node's learned state."""
    learned = _load_progress()
    if node_id in learned:
        learned.discard(node_id)
        _save_progress(learned)
        return {"status": "unlearned", "node_id": node_id}
    else:
        learned.add(node_id)
        _save_progress(learned)
        return {"status": "learned", "node_id": node_id}


@router.get("/recommend")
async def recommend_path(
    goal: str = Query(..., description="Target node ID to learn towards"),
    max_steps: int = Query(20, ge=1, le=100),
):
    """
    Recommend a learning path to reach a goal node.
    Uses BFS on prerequisite edges to find ordered prerequisites.
    """
    service = _get_graph_service()
    all_nodes = service._load_nodes()
    learned = _load_progress()

    # Build adjacency: node_id -> list of prerequisites (incoming prerequisite edges)
    by_id = {n["id"]: n for n in all_nodes}
    if goal not in by_id:
        raise HTTPException(status_code=404, detail=f"Goal node '{goal}' not found")

    # Reverse BFS from goal to find all prerequisite ancestors
    prereq_of: dict[str, set[str]] = {}  # node -> nodes it depends on
    for node in all_nodes:
        for conn in node.get("connections", []):
            if conn.get("learning_prerequisite"):
                prereq_of.setdefault(node["id"], set()).add(conn["target"])

    # BFS backwards from goal
    path_nodes: list[str] = []
    visited = set()
    queue = [goal]

    while queue and len(path_nodes) < max_steps:
        current = queue.pop(0)
        if current in visited:
            continue
        visited.add(current)

        prereqs = prereq_of.get(current, set())
        unlearned_prereqs = prereqs - learned

        for p in unlearned_prereqs:
            if p not in visited:
                queue.append(p)

        if current not in learned and current != goal:
            path_nodes.append(current)

    # Reverse to get learning order (prerequisites first)
    path_nodes.reverse()
    path_nodes.append(goal)

    # Build response with node details
    path_details = []
    for nid in path_nodes:
        node = by_id.get(nid)
        if node:
            path_details.append({
                "id": node["id"],
                "label": node["label"],
                "type": node["type"],
                "domain": node.get("domain", []),
                "is_learned": nid in learned,
            })

    return {
        "goal": goal,
        "path": path_details,
        "total_steps": len(path_details),
        "already_learned": sum(1 for p in path_details if p["is_learned"]),
    }
