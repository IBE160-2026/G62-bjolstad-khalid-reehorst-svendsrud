import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.origin import make_origin_check, origin_of
from app.core.settings import get_settings

APP_URL = get_settings().app_url


def _add_spy_routes(app: FastAPI) -> list[str]:
    calls: list[str] = []

    @app.api_route("/api/_test/write", methods=["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"])
    def write() -> dict[str, bool]:
        calls.append("called")
        return {"ok": True}

    return calls


def test_mutating_requests_without_origin_are_rejected(app: FastAPI, bare_client: TestClient) -> None:
    calls = _add_spy_routes(app)

    for method in ("POST", "PUT", "PATCH", "DELETE"):
        response = bare_client.request(method, "/api/_test/write")
        assert response.status_code == 403, method
        assert response.json()["error"]["code"] == "origin_mismatch"
        assert response.json()["error"]["message"]

    assert calls == []


def test_mutating_requests_from_other_origin_are_rejected(
    app: FastAPI, bare_client: TestClient
) -> None:
    calls = _add_spy_routes(app)

    for origin in ("https://evil.example", "null", APP_URL.replace("3000", "3001"), ""):
        response = bare_client.post("/api/_test/write", headers={"Origin": origin})
        assert response.status_code == 403, origin
        assert response.json()["error"]["code"] == "origin_mismatch"

    assert calls == []


def test_matching_origin_is_allowed(app: FastAPI, bare_client: TestClient) -> None:
    calls = _add_spy_routes(app)

    for method in ("POST", "PUT", "PATCH", "DELETE"):
        response = bare_client.request(method, "/api/_test/write", headers={"Origin": APP_URL})
        assert response.status_code == 200, method

    assert len(calls) == 4


def test_safe_methods_need_no_origin(app: FastAPI, bare_client: TestClient) -> None:
    _add_spy_routes(app)

    assert bare_client.get("/api/_test/write").status_code == 200
    assert bare_client.head("/api/_test/write").status_code == 200
    assert bare_client.get("/api/health", headers={"Origin": "https://evil.example"}).status_code == 200


def test_origin_of_keeps_scheme_host_and_port() -> None:
    assert origin_of("http://localhost:3000/") == "http://localhost:3000"
    assert origin_of("HTTP://LocalHost:3000/path?q=1") == "http://localhost:3000"
    assert origin_of("https://localhost:3000") != origin_of("http://localhost:3000")


@pytest.mark.parametrize("app_url", ["", "   ", "localhost:3000", "/app", "http://"])
def test_origin_check_refuses_app_url_without_scheme_or_host(app_url: str) -> None:
    with pytest.raises(ValueError, match="APP_URL"):
        make_origin_check(app_url)
