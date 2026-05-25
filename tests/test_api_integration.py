"""API integration smoke test.

This test targets a running backend at http://127.0.0.1:8000.
If the backend is unavailable, the test is skipped instead of failing collection.
"""

import pytest
import httpx


BASE_URL = "http://127.0.0.1:8000/api"
TIMEOUT = 10.0


def _get(client: httpx.Client, path: str, **kwargs) -> httpx.Response:
    return client.get(f"{BASE_URL}{path}", timeout=TIMEOUT, **kwargs)


def _post(client: httpx.Client, path: str, **kwargs) -> httpx.Response:
    return client.post(f"{BASE_URL}{path}", timeout=TIMEOUT, **kwargs)


@pytest.mark.integration
def test_api_smoke_endpoints():
    try:
        with httpx.Client() as client:
            health = _get(client, "/health")
            if health.status_code != 200:
                pytest.skip("Backend is not ready for integration smoke test")

            progress = _get(client, "/learning-path/progress")
            assert progress.status_code == 200
            payload = progress.json()
            assert "total_learned" in payload
            assert "total_available" in payload

            toggle = _post(client, "/learning-path/progress/toggle/calculus_field")
            assert toggle.status_code == 200

            recommend = _get(client, "/learning-path/recommend", params={"goal": "derivative_concept"})
            assert recommend.status_code == 200

            quality = _get(client, "/admin/quality")
            assert quality.status_code == 200

            costs = _get(client, "/admin/costs")
            assert costs.status_code == 200

            dedup = _get(client, "/admin/dedup")
            assert dedup.status_code == 200

            i18n = _get(client, "/admin/i18n/status")
            assert i18n.status_code == 200

            i18n_ja = _get(client, "/admin/i18n/status", params={"locale": "ja"})
            assert i18n_ja.status_code == 200

            i18n_locale = _get(client, "/i18n/ja")
            assert i18n_locale.status_code == 200

            graph_first = _get(client, "/graph/subgraph", params={"center": "physics_field", "depth": 2})
            assert graph_first.status_code == 200

            search_first = _get(client, "/search", params={"q": "quantum"})
            assert search_first.status_code == 200

    except httpx.HTTPError:
        pytest.skip("Backend is not running on 127.0.0.1:8000")
