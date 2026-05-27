import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.routers import admin as admin_router


client = TestClient(app)


def _assert_node_shape(node: dict) -> None:
    assert isinstance(node.get("id"), str)
    assert isinstance(node.get("label"), str)
    assert isinstance(node.get("type"), str)
    assert isinstance(node.get("domain", []), list)


def _reset_admin_rate_limit_state() -> None:
    admin_router._trigger_windows.clear()
    admin_router._trigger_events.clear()


def _reset_admin_audit_log() -> None:
    if admin_router.ADMIN_AUDIT_LOG_FILE.exists():
        admin_router.ADMIN_AUDIT_LOG_FILE.unlink()


@pytest.mark.contract
def test_health_contract():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"


@pytest.mark.contract
def test_search_contract():
    res = client.get("/api/search", params={"q": "quantum", "limit": 5})
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert "total" in data
    assert isinstance(data["results"], list)
    assert isinstance(data["total"], int)
    if data["results"]:
        _assert_node_shape(data["results"][0])


@pytest.mark.contract
def test_learning_progress_contract():
    res = client.get("/api/learning-path/progress")
    assert res.status_code == 200
    data = res.json()
    assert "learned" in data
    assert "available" in data
    assert "total_learned" in data
    assert "total_available" in data
    assert isinstance(data["learned"], list)
    assert isinstance(data["available"], list)


@pytest.mark.contract
def test_graph_subgraph_contract():
    res = client.get("/api/graph/subgraph", params={"center": "physics_field", "depth": 2, "max_nodes": 50})
    assert res.status_code == 200
    data = res.json()
    assert "nodes" in data
    assert "edges" in data
    assert isinstance(data["nodes"], list)
    assert isinstance(data["edges"], list)
    if data["nodes"]:
        _assert_node_shape(data["nodes"][0])
    if data["edges"]:
        first_edge = data["edges"][0]
        assert isinstance(first_edge.get("source"), str)
        assert isinstance(first_edge.get("target"), str)
        assert isinstance(first_edge.get("relation_type"), str)


@pytest.mark.contract
def test_recommend_contract_not_found():
    res = client.get("/api/learning-path/recommend", params={"goal": "not_a_real_node"})
    assert res.status_code == 404
    data = res.json()
    assert "detail" in data


@pytest.mark.contract
def test_i18n_locale_contract():
    res = client.get("/api/i18n/zh")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    if data:
        first_key = next(iter(data.keys()))
        assert isinstance(first_key, str)
        assert isinstance(data[first_key], str)


@pytest.mark.contract
def test_i18n_unknown_locale_falls_back_to_english():
    res = client.get("/api/i18n/does-not-exist")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)


@pytest.mark.contract
def test_i18n_descriptions_contract_and_keyset_alignment():
    graph_desc = client.get("/api/graph/descriptions")
    en_desc = client.get("/api/i18n/en/descriptions")
    zh_desc = client.get("/api/i18n/zh/descriptions")
    ja_desc = client.get("/api/i18n/ja/descriptions")

    assert graph_desc.status_code == 200
    assert en_desc.status_code == 200
    assert zh_desc.status_code == 200
    assert ja_desc.status_code == 200

    graph_payload = graph_desc.json()
    en_payload = en_desc.json()
    zh_payload = zh_desc.json()
    ja_payload = ja_desc.json()

    assert isinstance(graph_payload, dict)
    assert isinstance(en_payload, dict)
    assert isinstance(zh_payload, dict)
    assert isinstance(ja_payload, dict)

    baseline_keys = set(graph_payload.keys())
    assert baseline_keys

    # English descriptions endpoint must be canonical and complete.
    assert set(en_payload.keys()) == baseline_keys

    # Locale description endpoints must return a full keyset (with EN fallback overlay).
    assert set(zh_payload.keys()) == baseline_keys
    assert set(ja_payload.keys()) == baseline_keys


@pytest.mark.contract
def test_i18n_unknown_descriptions_locale_falls_back_to_english_baseline():
    unknown = client.get("/api/i18n/does-not-exist/descriptions")
    en_desc = client.get("/api/i18n/en/descriptions")

    assert unknown.status_code == 200
    assert en_desc.status_code == 200
    assert unknown.json() == en_desc.json()


@pytest.mark.contract
def test_i18n_keyset_alignment_across_three_locales():
    zh = client.get("/api/i18n/zh")
    en = client.get("/api/i18n/en")
    ja = client.get("/api/i18n/ja")

    assert zh.status_code == 200
    assert en.status_code == 200
    assert ja.status_code == 200

    zh_keys = set(zh.json().keys())
    en_keys = set(en.json().keys())
    ja_keys = set(ja.json().keys())

    assert zh_keys == en_keys
    assert zh_keys == ja_keys


@pytest.mark.contract
def test_admin_i18n_status_contract_with_locale_query():
    res = client.get("/api/admin/i18n/status", params={"locale": "ja"})
    assert res.status_code == 200
    data = res.json()
    assert data["locale"] == "ja"
    assert isinstance(data.get("total_nodes"), int)
    assert isinstance(data.get("translated"), int)
    assert isinstance(data.get("coverage_pct"), (int, float))
    assert isinstance(data.get("missing_count"), int)
    assert isinstance(data.get("exists"), bool)


@pytest.mark.contract
def test_admin_trigger_invalid_domain_returns_400():
    _reset_admin_rate_limit_state()
    _reset_admin_audit_log()
    payload = {
        "phase": 2,
        "domain": "INVALID",
        "subdomain": "calculus",
        "batch_size": 1,
        "batches": 1,
        "structured": True,
        "critique": True,
    }
    res = client.post("/api/admin/generate/trigger", json=payload)
    assert res.status_code == 400
    data = res.json()
    assert "detail" in data


@pytest.mark.contract
def test_admin_trigger_rate_limit_returns_429():
    _reset_admin_rate_limit_state()
    _reset_admin_audit_log()
    payload = {
        "phase": 2,
        "domain": "INVALID",
        "subdomain": "calculus",
        "batch_size": 1,
        "batches": 1,
        "structured": True,
        "critique": True,
    }

    max_requests = admin_router.TRIGGER_MAX_REQUESTS
    for _ in range(max_requests):
        res = client.post("/api/admin/generate/trigger", json=payload)
        assert res.status_code == 400

    over = client.post("/api/admin/generate/trigger", json=payload)
    assert over.status_code == 429
    data = over.json()
    assert "detail" in data


@pytest.mark.contract
def test_admin_audit_endpoint_contract():
    _reset_admin_rate_limit_state()
    _reset_admin_audit_log()

    payload = {
        "phase": 2,
        "domain": "INVALID",
        "subdomain": "calculus",
        "batch_size": 1,
        "batches": 1,
        "structured": True,
        "critique": True,
    }
    res = client.post("/api/admin/generate/trigger", json=payload)
    assert res.status_code == 400

    audit = client.get("/api/admin/audit", params={"limit": 10, "event_type": "generate_trigger"})
    assert audit.status_code == 200
    data = audit.json()
    assert "events" in data
    assert "count" in data
    assert "filters" in data
    assert isinstance(data["events"], list)
    assert isinstance(data["count"], int)
    if data["events"]:
        first = data["events"][0]
        assert first.get("event_type") == "generate_trigger"
        assert first.get("status") in {"accepted", "rejected", "rate_limited"}


@pytest.mark.contract
def test_admin_read_operation_is_audited():
    _reset_admin_rate_limit_state()
    _reset_admin_audit_log()

    quality = client.get("/api/admin/quality")
    assert quality.status_code == 200

    audit = client.get("/api/admin/audit", params={"limit": 20, "event_type": "admin_read", "status": "success"})
    assert audit.status_code == 200
    data = audit.json()
    assert isinstance(data.get("events"), list)
    assert any(event.get("detail", {}).get("endpoint") == "/quality" for event in data["events"])


# ── Search edge-case tests (5.5) ─────────────────────────────────────────────

@pytest.mark.contract
@pytest.mark.parametrize("query,desc", [
    ("", "empty string"),
    ("   ", "whitespace only"),
    ("<script>alert(1)</script>", "XSS payload"),
    ("' OR '1'='1", "SQL-injection-style"),
    ("量子力學", "CJK Unicode"),
    ("a" * 300, "very long query"),
])
def test_search_edge_cases_return_valid_shape(query, desc):
    """Search must never 500 regardless of the query content."""
    res = client.get("/api/search", params={"q": query, "limit": 5})
    assert res.status_code in (200, 400, 422), f"{desc}: unexpected {res.status_code}"
    if res.status_code == 200:
        data = res.json()
        assert "results" in data
        assert isinstance(data["results"], list)


# ── Auth negative tests (5.4) ────────────────────────────────────────────────

# ── Auth negative tests (5.4) ────────────────────────────────────────────────

@pytest.fixture()
def _admin_key_configured(monkeypatch):
    """Temporarily inject a known admin key so auth enforcement is active."""
    monkeypatch.setenv("ADMIN_API_KEY", "test-key-12345")
    # Force settings cache to reload
    from backend.config import get_settings
    get_settings.cache_clear()
    yield "test-key-12345"
    get_settings.cache_clear()


@pytest.mark.contract
@pytest.mark.parametrize("endpoint", [
    "/api/admin/quality",
    "/api/admin/audit",
    "/api/admin/dedup",
])
def test_admin_endpoints_require_auth_key(endpoint, _admin_key_configured):
    """Admin endpoints must reject requests without X-Admin-Key when a key is configured."""
    bare = TestClient(app, headers={})
    res = bare.get(endpoint)
    assert res.status_code in (401, 403), (
        f"{endpoint} returned {res.status_code} without auth key — expected 401 or 403"
    )


@pytest.mark.contract
def test_admin_endpoint_rejects_wrong_key(_admin_key_configured):
    """Admin endpoints must reject requests with a wrong X-Admin-Key."""
    bad_client = TestClient(app, headers={"X-Admin-Key": "definitely-wrong-key"})
    res = bad_client.get("/api/admin/quality")
    assert res.status_code in (401, 403)


