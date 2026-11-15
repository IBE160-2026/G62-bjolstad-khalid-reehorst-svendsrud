"""Consent before health data (story 1.5): the endpoint and the `ConsentedUser` guard."""

from collections.abc import Callable
from datetime import datetime, timedelta

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.identity.consent import ConsentedUser
from app.modules.identity.models import User
from tests.conftest import PASSWORD, Clock
from tests.identity.helpers import LOGIN_URL, LOGOUT_URL, ME_URL, UNAUTHORIZED_CODE

CONSENT_URL = "/api/identity/consent"
GUARDED_URL = "/api/test/health-data"
EMAIL = "ola@eksempel.no"
CONSENT_REQUIRED = {
    "error": {
        "code": "consent_required",
        "message": "Du må godta samtykket før du kan legge inn helsedata.",
    }
}


def _stored_consent(db: Session, email: str = EMAIL) -> datetime | None:
    db.expire_all()
    return db.scalars(select(User.consent_at).where(User.email == email)).one()


def _add_guarded_route(app: FastAPI) -> None:
    """A stand-in for a later health-data endpoint; exists only in these tests."""

    @app.get(GUARDED_URL)
    def guarded(user: ConsentedUser) -> dict[str, str]:
        return {"email": user.email}


def test_register_and_me_start_without_consent(
    make_client: Callable[[], TestClient],
) -> None:
    client = make_client()
    registered = client.post(
        "/api/identity/register", json={"email": EMAIL, "password": "hemmelig1"}
    )

    assert registered.status_code == 201
    assert registered.json()["consent_at"] is None
    assert client.get(ME_URL).json()["consent_at"] is None


def test_give_consent_stores_now_in_utc(
    logged_in_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = logged_in_client(EMAIL)

    response = client.post(CONSENT_URL)

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == EMAIL
    assert datetime.fromisoformat(body["consent_at"]) == clock.now
    assert datetime.fromisoformat(body["consent_at"]).utcoffset() == timedelta(0)
    assert _stored_consent(db_session) == clock.now
    assert datetime.fromisoformat(client.get(ME_URL).json()["consent_at"]) == clock.now


def test_repeating_consent_keeps_the_first_time(
    logged_in_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = logged_in_client(EMAIL)
    first = clock.now
    assert client.post(CONSENT_URL).status_code == 200

    clock.advance(timedelta(hours=2))
    response = client.post(CONSENT_URL)

    assert response.status_code == 200
    assert datetime.fromisoformat(response.json()["consent_at"]) == first
    assert _stored_consent(db_session) == first


def test_login_after_consent_returns_the_consent_time(
    logged_in_client: Callable[..., TestClient], clock: Clock
) -> None:
    client = logged_in_client(EMAIL)
    consented_at = clock.now
    assert client.post(CONSENT_URL).status_code == 200
    client.cookies.clear()
    clock.advance(timedelta(hours=1))

    response = client.post(LOGIN_URL, json={"email": EMAIL, "password": PASSWORD})

    assert response.status_code == 200
    assert datetime.fromisoformat(response.json()["consent_at"]) == consented_at


def test_consent_requires_login(client: TestClient, db_session: Session) -> None:
    response = client.post(CONSENT_URL)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == UNAUTHORIZED_CODE


def test_consent_only_affects_the_current_user(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    ola = logged_in_client(EMAIL)
    logged_in_client("kari@eksempel.no")

    assert ola.post(CONSENT_URL).status_code == 200

    assert _stored_consent(db_session, EMAIL) is not None
    assert _stored_consent(db_session, "kari@eksempel.no") is None


def test_guard_rejects_user_without_consent(
    app: FastAPI, logged_in_client: Callable[..., TestClient]
) -> None:
    _add_guarded_route(app)
    client = logged_in_client(EMAIL)

    response = client.get(GUARDED_URL)

    assert response.status_code == 403
    assert response.json() == CONSENT_REQUIRED


def test_guard_lets_consented_user_through(
    app: FastAPI, logged_in_client: Callable[..., TestClient]
) -> None:
    _add_guarded_route(app)
    client = logged_in_client(EMAIL)
    assert client.post(CONSENT_URL).status_code == 200

    response = client.get(GUARDED_URL)

    assert response.status_code == 200
    assert response.json() == {"email": EMAIL}


def test_guard_still_requires_login(app: FastAPI, client: TestClient) -> None:
    _add_guarded_route(app)

    response = client.get(GUARDED_URL)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == UNAUTHORIZED_CODE


def test_me_and_logout_do_not_require_consent(
    logged_in_client: Callable[..., TestClient],
) -> None:
    client = logged_in_client(EMAIL)

    assert client.get(ME_URL).status_code == 200
    assert client.post(LOGOUT_URL).status_code == 204
