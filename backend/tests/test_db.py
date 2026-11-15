"""The real get_db dependency commits once, before the response is sent (AD-13)."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.db import DbSession, get_session_factory
from app.modules.identity.models import User


class FailingCommitSession(Session):
    def commit(self) -> None:
        raise RuntimeError("database went away during commit")


def _add_write_route(app: FastAPI) -> None:
    @app.post("/api/_test/users", status_code=201)
    def create_user(db: DbSession) -> dict[str, str]:
        db.add(User(email="db-test@eksempel.no", password_hash="x"))
        db.flush()
        return {"status": "created"}


def _user_count(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(User)) or 0


def test_successful_request_commits(app: FastAPI, client: TestClient, db_session: Session) -> None:
    _add_write_route(app)

    response = client.post("/api/_test/users")

    assert response.status_code == 201
    assert _user_count(db_session) == 1


def test_handler_error_rolls_back(app: FastAPI, client: TestClient, db_session: Session) -> None:
    @app.post("/api/_test/users-then-fail")
    def create_then_fail(db: DbSession) -> None:
        db.add(User(email="db-test@eksempel.no", password_hash="x"))
        db.flush()
        raise RuntimeError("boom")

    response = client.post("/api/_test/users-then-fail")

    assert response.status_code == 500
    assert _user_count(db_session) == 0


def test_commit_failure_returns_500_without_cookie(
    app: FastAPI, client: TestClient, db_session: Session, test_engine: Engine
) -> None:
    failing = sessionmaker(bind=test_engine, class_=FailingCommitSession, expire_on_commit=False)
    app.dependency_overrides[get_session_factory] = lambda: failing

    response = client.post(
        "/api/identity/register", json={"email": "ola@eksempel.no", "password": "hemmelig1"}
    )

    # The commit runs before the response, so its failure replaces the 201.
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "internal_error"
    assert "set-cookie" not in response.headers
    assert _user_count(db_session) == 0
