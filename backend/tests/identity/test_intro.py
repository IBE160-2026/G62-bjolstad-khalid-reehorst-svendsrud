"""First-run introduction (story 2.3): dismissal is stored on the user."""

from collections.abc import Callable
from datetime import datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.identity.models import User
from tests.conftest import PASSWORD, Clock
from tests.identity.helpers import LOGIN_URL, ME_URL, UNAUTHORIZED_CODE

DISMISS_URL = "/api/identity/intro/dismiss"
EMAIL = "ola@eksempel.no"


def _stored_dismissal(db: Session, email: str = EMAIL) -> datetime | None:
    db.expire_all()
    return db.scalars(select(User.intro_dismissed_at).where(User.email == email)).one()


def test_new_user_has_not_dismissed_the_intro(
    logged_in_client: Callable[..., TestClient],
) -> None:
    client = logged_in_client(EMAIL)

    assert client.get(ME_URL).json()["intro_dismissed_at"] is None


def test_dismiss_stores_now_and_me_returns_it(
    logged_in_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = logged_in_client(EMAIL)

    response = client.post(DISMISS_URL)

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == EMAIL
    assert datetime.fromisoformat(body["intro_dismissed_at"]) == clock.now
    assert datetime.fromisoformat(body["intro_dismissed_at"]).utcoffset() == timedelta(0)
    assert _stored_dismissal(db_session) == clock.now
    assert datetime.fromisoformat(client.get(ME_URL).json()["intro_dismissed_at"]) == clock.now


def test_dismiss_does_not_require_consent(
    logged_in_client: Callable[..., TestClient],
) -> None:
    client = logged_in_client(EMAIL)

    response = client.post(DISMISS_URL)

    assert response.status_code == 200
    assert response.json()["consent_at"] is None


def test_repeating_dismiss_keeps_the_first_time(
    logged_in_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = logged_in_client(EMAIL)
    first = clock.now
    assert client.post(DISMISS_URL).status_code == 200

    clock.advance(timedelta(hours=2))
    response = client.post(DISMISS_URL)

    assert response.status_code == 200
    assert datetime.fromisoformat(response.json()["intro_dismissed_at"]) == first
    assert _stored_dismissal(db_session) == first


def test_dismissal_survives_a_new_login(
    logged_in_client: Callable[..., TestClient], clock: Clock
) -> None:
    client = logged_in_client(EMAIL)
    dismissed_at = clock.now
    assert client.post(DISMISS_URL).status_code == 200
    client.cookies.clear()
    clock.advance(timedelta(hours=1))

    response = client.post(LOGIN_URL, json={"email": EMAIL, "password": PASSWORD})

    assert response.status_code == 200
    assert datetime.fromisoformat(response.json()["intro_dismissed_at"]) == dismissed_at


def test_dismiss_requires_login(client: TestClient) -> None:
    response = client.post(DISMISS_URL)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == UNAUTHORIZED_CODE


def test_dismiss_with_wrong_origin_is_rejected(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = logged_in_client(EMAIL)

    response = client.post(DISMISS_URL, headers={"Origin": "https://evil.example"})

    assert response.status_code == 403
    assert _stored_dismissal(db_session) is None


def test_dismiss_only_affects_the_current_user(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    ola = logged_in_client(EMAIL)
    logged_in_client("kari@eksempel.no")

    assert ola.post(DISMISS_URL).status_code == 200

    assert _stored_dismissal(db_session, EMAIL) is not None
    assert _stored_dismissal(db_session, "kari@eksempel.no") is None
