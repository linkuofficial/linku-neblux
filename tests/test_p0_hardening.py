import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from starlette.requests import Request
from fastapi.testclient import TestClient

from backend.auth import require_admin_key
from backend.config import validate_startup_settings
from backend.main import app
from backend.routers import admin as admin_router
from backend.services import resolver
from backend.services.notification_service import reset_notification_state, send_notification


def test_admin_auth_missing_key_returns_401(monkeypatch):
    monkeypatch.setattr("backend.auth.get_settings", lambda: SimpleNamespace(admin_api_key="secret"))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(require_admin_key(x_admin_key=""))

    assert exc.value.status_code == 401
    assert "Missing" in exc.value.detail


def test_admin_auth_invalid_key_returns_403(monkeypatch):
    monkeypatch.setattr("backend.auth.get_settings", lambda: SimpleNamespace(admin_api_key="secret"))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(require_admin_key(x_admin_key="wrong"))

    assert exc.value.status_code == 403
    assert "Invalid" in exc.value.detail


def test_admin_auth_accepts_correct_key(monkeypatch):
    monkeypatch.setattr("backend.auth.get_settings", lambda: SimpleNamespace(admin_api_key="secret"))

    asyncio.run(require_admin_key(x_admin_key="secret"))


def test_validate_startup_settings_rejects_unsafe_production():
    settings = SimpleNamespace(
        is_production=True,
        admin_api_key="",
        parsed_cors_origins=["*"],
    )

    with pytest.raises(RuntimeError) as exc:
        validate_startup_settings(settings)

    message = str(exc.value)
    assert "ADMIN_API_KEY" in message
    assert "CORS_ORIGINS" in message


def test_validate_startup_settings_allows_safe_production():
    settings = SimpleNamespace(
        is_production=True,
        admin_api_key="topsecret",
        parsed_cors_origins=["https://nexus.example.com"],
    )

    validate_startup_settings(settings)


def test_metrics_endpoint_exports_prometheus_text():
    client = TestClient(app)

    health = client.get("/api/health")
    assert health.status_code == 200

    metrics = client.get("/api/metrics")
    assert metrics.status_code == 200
    assert "text/plain" in metrics.headers.get("content-type", "")
    body = metrics.text
    assert "nexus_http_requests_total" in body
    assert "nexus_http_latency_p95_ms" in body
    assert "nexus_admin_trigger_events" in body


def test_unhandled_exception_handler_sends_notification(monkeypatch):
    captured = []

    async def _receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/test-error",
            "headers": [],
            "query_string": b"",
        },
        _receive,
    )
    request.state.request_id = "req-123"

    monkeypatch.setattr(
        "backend.main.send_notification",
        lambda title, **kwargs: captured.append((title, kwargs)) or True,
    )

    response = asyncio.run(
        __import__("backend.main", fromlist=["unhandled_exception_handler"]).unhandled_exception_handler(
            request,
            RuntimeError("boom"),
        )
    )

    assert response.status_code == 500
    assert captured
    assert captured[0][0] == "Nexus API unhandled 5xx"
    assert "req-123" in captured[0][1]["body"]


def test_admin_trigger_alert_sends_notification(monkeypatch):
    reset_notification_state()
    captured = []
    original_minute = admin_router.ALERT_PER_MINUTE
    original_day = admin_router.ALERT_PER_DAY
    original_events = list(admin_router._trigger_events)
    try:
        monkeypatch.setattr(
            "backend.routers.admin.send_notification",
            lambda title, **kwargs: captured.append((title, kwargs)) or True,
        )
        admin_router.ALERT_PER_MINUTE = 1
        admin_router.ALERT_PER_DAY = 0
        admin_router._trigger_events.clear()
        admin_router._trigger_events.append(100.0)

        admin_router._emit_trigger_alerts(100.0, "client:key")

        assert captured
        assert captured[0][0] == "Nexus admin trigger burst"
        assert captured[0][1]["dedupe_key"] == "admin-trigger-minute"
    finally:
        admin_router.ALERT_PER_MINUTE = original_minute
        admin_router.ALERT_PER_DAY = original_day
        admin_router._trigger_events.clear()
        admin_router._trigger_events.extend(original_events)


def test_resolver_fallback_sends_notification(monkeypatch):
    reset_notification_state()
    resolver.invalidate_neo4j_state()
    captured = []

    class BrokenDriver:
        def verify_connectivity(self):
            raise RuntimeError("neo4j down")

    monkeypatch.setattr("backend.services.neo4j_service.get_driver", lambda: BrokenDriver())
    monkeypatch.setattr(
        "backend.services.resolver.send_notification",
        lambda title, **kwargs: captured.append((title, kwargs)) or True,
    )

    service = resolver.get_graph_service()

    assert service.__name__.endswith("json_service")
    assert captured
    assert captured[0][0] == "Nexus Neo4j unavailable"


def test_send_notification_suppresses_duplicates(monkeypatch):
    reset_notification_state()
    delivered = []

    class ImmediateThread:
        def __init__(self, target, daemon):
            self._target = target

        def start(self):
            self._target()

    monkeypatch.setattr(
        "backend.services.notification_service.get_settings",
        lambda: SimpleNamespace(
            alert_webhook_url="https://example.test/webhook",
            alert_webhook_timeout_seconds=5,
            alert_min_interval_seconds=300,
        ),
    )
    monkeypatch.setattr("backend.services.notification_service.threading.Thread", ImmediateThread)
    monkeypatch.setattr(
        "backend.services.notification_service._deliver_webhook",
        lambda url, payload, timeout: delivered.append((url, payload, timeout)),
    )

    first = send_notification("Title", body="hello", dedupe_key="same")
    second = send_notification("Title", body="hello", dedupe_key="same")

    assert first is True
    assert second is False
    assert len(delivered) == 1
