from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.errors import AppError


def test_unknown_api_route_returns_not_found_envelope(client: TestClient) -> None:
    response = client.get("/api/nope")

    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/json")
    assert response.json() == {"error": {"code": "not_found", "message": "Fant ikke siden."}}


def test_wrong_method_returns_envelope(client: TestClient) -> None:
    response = client.post("/api/health")

    assert response.status_code == 405
    assert response.json()["error"]["code"] == "method_not_allowed"


def test_validation_error_returns_envelope(app: FastAPI, client: TestClient) -> None:
    @app.get("/api/_test/items")
    def list_items(limit: int) -> dict[str, int]:
        return {"limit": limit}

    response = client.get("/api/_test/items", params={"limit": "not-a-number"})

    assert response.status_code == 422
    body = response.json()
    assert set(body) == {"error"}
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["message"]


def test_http_exception_with_code_and_message_is_passed_through(
    app: FastAPI, client: TestClient
) -> None:
    @app.get("/api/_test/forbidden")
    def forbidden() -> None:
        raise HTTPException(
            status_code=403, detail={"code": "origin_mismatch", "message": "Ugyldig opprinnelse."}
        )

    response = client.get("/api/_test/forbidden")

    assert response.status_code == 403
    assert response.json() == {
        "error": {"code": "origin_mismatch", "message": "Ugyldig opprinnelse."}
    }


def test_app_error_returns_its_code(app: FastAPI, client: TestClient) -> None:
    @app.get("/api/_test/conflict")
    def conflict() -> None:
        raise AppError(409, "already_exists", "Finnes allerede.")

    response = client.get("/api/_test/conflict")

    assert response.status_code == 409
    assert response.json() == {"error": {"code": "already_exists", "message": "Finnes allerede."}}


def test_unhandled_exception_returns_internal_error_envelope(
    app: FastAPI, client: TestClient
) -> None:
    @app.get("/api/_test/boom")
    def boom() -> None:
        raise RuntimeError("secret detail that must not leak")

    response = client.get("/api/_test/boom")

    assert response.status_code == 500
    assert response.json()["error"]["code"] == "internal_error"
    assert "secret" not in response.text
