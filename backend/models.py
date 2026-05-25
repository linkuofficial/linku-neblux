"""
Pydantic response models for API documentation and validation.
"""

from pydantic import BaseModel


class NodeResponse(BaseModel):
    id: str
    label: str
    type: str
    domain: list[str]
    description: str
    display_tags: list[str] = []
    has_subgraph: bool = False
    era: dict | None = None
    connections: list[dict] = []


class EdgeResponse(BaseModel):
    source: str
    target: str
    relation_type: str
    relation: str
    directed: bool = False
    learning_prerequisite: bool = False
    pending: bool = False


class SubgraphResponse(BaseModel):
    nodes: list[NodeResponse]
    edges: list[EdgeResponse]


class SearchResultItem(BaseModel):
    id: str
    label: str
    type: str
    domain: list[str]
    description: str
    score: float


class SearchResponse(BaseModel):
    results: list[SearchResultItem]
    total: int


class StatsResponse(BaseModel):
    total_nodes: int
    total_edges: int
    domain_distribution: dict[str, int]
    type_distribution: dict[str, int] = {}


class HealthResponse(BaseModel):
    status: str


class LearningProgressResponse(BaseModel):
    learned: list[str]
    available: list[str]
    total_learned: int
    total_available: int


class LearningRecommendResponse(BaseModel):
    goal: str
    path: list[dict]
    total_steps: int
    already_learned: int
