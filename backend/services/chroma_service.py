"""
ChromaDB-based vector store for persistent embeddings.
Provides semantic search and deduplication acceleration.
"""

import json
from pathlib import Path
from typing import Optional

from backend.config import get_settings, get_yaml_config

_client = None
_collection = None

CHROMA_DIR = Path(__file__).parent.parent.parent / "data" / "chroma"


def get_collection():
    """Get or create the ChromaDB collection (lazy init)."""
    global _client, _collection
    if _collection is not None:
        return _collection

    import chromadb

    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    _client = chromadb.PersistentClient(path=str(CHROMA_DIR))

    yaml_config = get_yaml_config()
    model_name = yaml_config.get("deduplication", {}).get("embedding_model", "all-MiniLM-L6-v2")

    _collection = _client.get_or_create_collection(
        name="nexus_nodes",
        metadata={"hnsw:space": "cosine", "embedding_model": model_name},
    )
    return _collection


def index_nodes(nodes: list, force: bool = False):
    """
    Index nodes into ChromaDB. Skips already-indexed nodes unless force=True.
    Each node is embedded by its label + description.
    """
    collection = get_collection()

    # Check which nodes are already indexed
    existing_ids = set()
    if not force:
        try:
            result = collection.get(include=[])
            existing_ids = set(result["ids"])
        except Exception:
            pass

    new_nodes = [n for n in nodes if n["id"] not in existing_ids]
    if not new_nodes:
        return {"indexed": 0, "skipped": len(nodes)}

    # Prepare documents for embedding
    ids = []
    documents = []
    metadatas = []

    for n in new_nodes:
        ids.append(n["id"])
        documents.append(f"{n.get('label', '')}. {n.get('description', '')}")
        metadatas.append({
            "label": n.get("label", ""),
            "type": n.get("type", ""),
            "domain": json.dumps(n.get("domain", [])),
        })

    # ChromaDB will auto-embed using its default model
    collection.add(ids=ids, documents=documents, metadatas=metadatas)

    return {"indexed": len(new_nodes), "skipped": len(nodes) - len(new_nodes)}


def find_similar(text: str, n_results: int = 10, threshold: float = 0.80) -> list:
    """
    Find nodes semantically similar to the given text.
    Returns list of {id, label, distance, score}.
    """
    collection = get_collection()

    if collection.count() == 0:
        return []

    results = collection.query(
        query_texts=[text],
        n_results=min(n_results, collection.count()),
    )

    similar = []
    for i, (node_id, distance) in enumerate(
        zip(results["ids"][0], results["distances"][0])
    ):
        score = 1.0 - distance  # cosine distance -> similarity
        if score >= threshold:
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            similar.append({
                "id": node_id,
                "label": meta.get("label", ""),
                "score": round(score, 4),
                "distance": round(distance, 4),
            })

    return similar


def find_duplicates(node_id: str, label: str, description: str, threshold: float = None) -> list:
    """
    Check if a node is semantically similar to existing ones.
    Used during generation to catch duplicates.
    """
    if threshold is None:
        yaml_config = get_yaml_config()
        threshold = yaml_config.get("deduplication", {}).get("semantic_threshold", 0.80)

    text = f"{label}. {description}"
    results = find_similar(text, n_results=5, threshold=threshold)

    # Exclude self
    return [r for r in results if r["id"] != node_id]


def semantic_search(query: str, n_results: int = 20, domain: str = None) -> list:
    """
    Semantic search for the API layer.
    Optionally filter by domain.
    """
    collection = get_collection()
    if collection.count() == 0:
        return []

    where_filter = None
    if domain:
        # ChromaDB where filter on metadata
        where_filter = {"domain": {"$contains": f'"{domain}"'}}

    results = collection.query(
        query_texts=[query],
        n_results=min(n_results, collection.count()),
        where=where_filter,
    )

    output = []
    for i, node_id in enumerate(results["ids"][0]):
        meta = results["metadatas"][0][i] if results["metadatas"] else {}
        distance = results["distances"][0][i]
        output.append({
            "id": node_id,
            "label": meta.get("label", ""),
            "type": meta.get("type", ""),
            "domain": json.loads(meta.get("domain", "[]")),
            "score": round(1.0 - distance, 4),
        })

    return output
