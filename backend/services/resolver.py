"""
Service resolver — selects Neo4j or JSON fallback based on availability.
Caches connectivity state to avoid repeated timeout penalties.
"""

import logging
import time

from backend.services.notification_service import send_notification

logger = logging.getLogger("nexus.resolver")

# Connection state cache: avoid retrying Neo4j for COOLDOWN seconds after failure
_neo4j_available: bool | None = None  # None = unknown, True/False = last probe result
_neo4j_last_check: float = 0.0
_NEO4J_COOLDOWN_SECONDS = 60  # wait before retrying after failure


def probe_neo4j() -> bool:
    """Probe Neo4j connectivity and cache the result."""
    global _neo4j_available, _neo4j_last_check
    try:
        from backend.services.neo4j_service import get_driver
        get_driver().verify_connectivity()
        _neo4j_available = True
        _neo4j_last_check = time.monotonic()
        logger.info("neo4j_probe success")
        return True
    except Exception as exc:
        _neo4j_available = False
        _neo4j_last_check = time.monotonic()
        logger.warning("neo4j_probe failed error=%s", exc.__class__.__name__)
        send_notification(
            "Nexus Neo4j unavailable",
            body=(
                "Falling back to JSON graph service.\n"
                f"error={exc.__class__.__name__}"
            ),
            dedupe_key="neo4j-unavailable",
            min_interval_seconds=600,
        )
        return False


def get_graph_service():
    """Try Neo4j first, fall back to JSON service. Uses cached probe state."""
    global _neo4j_available, _neo4j_last_check

    now = time.monotonic()

    # If we already know Neo4j is available, use it directly
    if _neo4j_available is True:
        from backend.services import neo4j_service
        return neo4j_service

    # If Neo4j was unavailable and cooldown hasn't elapsed, skip probe
    if _neo4j_available is False and (now - _neo4j_last_check) < _NEO4J_COOLDOWN_SECONDS:
        from backend.services import json_service
        return json_service

    # Unknown state or cooldown elapsed — probe
    if probe_neo4j():
        from backend.services import neo4j_service
        return neo4j_service
    else:
        from backend.services import json_service
        return json_service


def invalidate_neo4j_state():
    """Call when a Neo4j query fails at runtime to trigger re-probe."""
    global _neo4j_available
    _neo4j_available = None
