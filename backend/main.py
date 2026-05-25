"""
Nexus Knowledge Graph — Backend API
====================================
FastAPI server providing graph queries, search, and management endpoints.

Run:
  uvicorn backend.main:app --reload --port 8000
  # Or: python -m backend.main
"""

import logging
import time
import uuid
from collections import Counter, deque
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi import Request
from fastapi.responses import Response, JSONResponse
from fastapi.exceptions import HTTPException
from fastapi.staticfiles import StaticFiles

from backend.config import get_settings, BASE_DIR, validate_startup_settings
from backend.routers import graph, search, nodes, i18n
from backend.routers import learning_path, admin
from backend.models import HealthResponse
from backend.services.notification_service import send_notification

@asynccontextmanager
async def lifespan(_: FastAPI):
    # Pre-warm: probe Neo4j + preload JSON index + pre-serialize full graph + descriptions
    from backend.services.resolver import probe_neo4j
    from backend.services.json_service import _load_nodes, _build_index
    from backend.routers.graph import _build_full_graph_cache, _build_descriptions_cache
    probe_neo4j()
    _load_nodes()
    _build_index()
    _build_full_graph_cache()
    _build_descriptions_cache()
    logger.info("startup_prewarm complete")
    try:
        yield
    finally:
        from backend.services.neo4j_service import close_driver

        close_driver()


settings = get_settings()
validate_startup_settings(settings)
cors_origins = settings.parsed_cors_origins
allow_credentials = cors_origins != ["*"]
logger = logging.getLogger("nexus.api")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

_METRICS_WINDOW_SIZE = 2000
_request_total = 0
_status_total = Counter()
_duration_samples_ms = deque(maxlen=_METRICS_WINDOW_SIZE)

app = FastAPI(
    title="Nexus Knowledge Graph API",
    version="0.1.0",
    description="Backend API for the Nexus cross-domain knowledge graph",
    lifespan=lifespan,
)

# Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    global _request_total

    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id
    start = time.perf_counter()

    response: Response = await call_next(request)
    duration_ms = int((time.perf_counter() - start) * 1000)
    _request_total += 1
    _status_total[str(response.status_code)] += 1
    _duration_samples_ms.append(duration_ms)

    logger.info(
        "request method=%s path=%s status=%s duration_ms=%s request_id=%s",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
        request_id,
    )

    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


def _percentile(values: list[int], p: float) -> int:
    if not values:
        return 0

    sorted_values = sorted(values)
    idx = int((len(sorted_values) - 1) * p)
    return sorted_values[idx]


def _format_prometheus_metrics() -> str:
    status_5xx = sum(count for code, count in _status_total.items() if code.startswith("5"))
    p95_ms = _percentile(list(_duration_samples_ms), 0.95)
    admin_counts = admin.get_admin_trigger_counts()

    lines = [
        "# HELP nexus_http_requests_total Total HTTP requests handled by API.",
        "# TYPE nexus_http_requests_total counter",
        f"nexus_http_requests_total {_request_total}",
        "# HELP nexus_http_responses_total Total HTTP responses by status code.",
        "# TYPE nexus_http_responses_total counter",
    ]

    for status_code, count in sorted(_status_total.items()):
        lines.append(f'nexus_http_responses_total{{status="{status_code}"}} {count}')

    lines.extend(
        [
            "# HELP nexus_http_latency_p95_ms Approximate p95 latency in milliseconds.",
            "# TYPE nexus_http_latency_p95_ms gauge",
            f"nexus_http_latency_p95_ms {p95_ms}",
            "# HELP nexus_http_5xx_total Total 5xx responses.",
            "# TYPE nexus_http_5xx_total counter",
            f"nexus_http_5xx_total {status_5xx}",
            "# HELP nexus_admin_trigger_events Admin trigger request counts.",
            "# TYPE nexus_admin_trigger_events gauge",
            f'nexus_admin_trigger_events{{window="minute"}} {admin_counts["minute"]}',
            f'nexus_admin_trigger_events{{window="day"}} {admin_counts["day"]}',
            f'nexus_admin_trigger_events{{window="lifetime"}} {admin_counts["lifetime"]}',
        ]
    )

    return "\n".join(lines) + "\n"


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "request_id": request_id},
        headers={"X-Request-ID": request_id},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.exception("unhandled_exception request_id=%s path=%s", request_id, request.url.path)
    send_notification(
        "Nexus API unhandled 5xx",
        body=(
            f"path={request.url.path}\n"
            f"method={request.method}\n"
            f"request_id={request_id}\n"
            f"error={exc.__class__.__name__}"
        ),
        dedupe_key=f"5xx:{request.url.path}:{exc.__class__.__name__}",
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "request_id": request_id},
        headers={"X-Request-ID": request_id},
    )

# Routers
app.include_router(graph.router, prefix="/api/graph", tags=["graph"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(nodes.router, prefix="/api/nodes", tags=["nodes"])
app.include_router(i18n.router, prefix="/api/i18n", tags=["i18n"])
app.include_router(learning_path.router, prefix="/api/learning-path", tags=["learning-path"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/api/health", response_model=HealthResponse)
async def health():
    return {"status": "ok"}


@app.get("/api/metrics", include_in_schema=False)
async def metrics():
    return Response(content=_format_prometheus_metrics(), media_type="text/plain; version=0.0.4")


# Keep sensitive static mounts disabled in production.
if not settings.is_production:
    app.mount("/data", StaticFiles(directory=str(BASE_DIR / "data")), name="data")
    app.mount("/src", StaticFiles(directory=str(BASE_DIR / "frontend" / "src")), name="frontend-src")

# Static files: serve from dist/ (production build) or frontend/ (development)
DIST_DIR = BASE_DIR / "dist"
FRONTEND_DIR = BASE_DIR / "frontend"

if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="static")
else:
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.host, port=settings.port, reload=settings.debug)
