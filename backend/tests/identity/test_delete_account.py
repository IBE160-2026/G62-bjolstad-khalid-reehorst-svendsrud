"""Delete my account (story 1.6): soft delete, sessions gone, the user invisible."""

from collections.abc import Callable
from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.identity.models import Session as UserSession
from app.modules.identity.models import User
from tests.conftest import PASSWORD, REGISTER_URL, Clock
from tests.identity.helpers import (
    INVALID_CREDENTIALS,
    LOGIN_URL,
    ME_URL,
    UNAUTHORIZED_CODE,
    assert_cookie_cleared,
    count,
)

DELETE_URL = "/api/identity/me"
CONSENT_URL = "/api/identity/consent"
EMAIL = "ola@eksempel.no"


def _users(db: Session, email: str = EMAIL) -> list[User]:
    db.expire_all()
    return list(db.scalars(select(User).where(User.email == email).order_by(User.created_at)))


def _sessions_of(db: Session, user_id: object) -> int:
    db.expire_all()
    return len(list(db.scalars(select(UserSession).where(UserSession.user_id == user_id))))


def test_delete_soft_deletes_and_clears_the_cookie(
    logged_in_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = logged_in_client(EMAIL)

    response = client.delete(DELETE_URL)

    assert response.status_code == 204
    assert response.content == b""
    assert_cookie_cleared(response.headers["set-cookie"])
    (user,) = _users(db_session)
    assert user.deleted_at == clock.now
    assert _sessions_of(db_session, user.id) == 0
    assert client.get(ME_URL).status_code == 401


def test_delete_works_with_consent(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = logged_in_client(EMAIL)
    assert client.post(CONSENT_URL).status_code == 200

    assert client.delete(DELETE_URL).status_code == 204

    (user,) = _users(db_session)
    assert user.deleted_at is not None


def test_delete_ends_every_session_of_the_user(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    db_session: Session,
) -> None:
    phone = logged_in_client(EMAIL)
    laptop = make_client()
    assert laptop.post(LOGIN_URL, json={"email": EMAIL, "password": PASSWORD}).status_code == 200
    kari = logged_in_client("kari@eksempel.no")

    assert phone.delete(DELETE_URL).status_code == 204

    assert phone.get(ME_URL).status_code == 401
    laptop_me = laptop.get(ME_URL)
    assert laptop_me.status_code == 401
    assert laptop_me.json()["error"]["code"] == UNAUTHORIZED_CODE
    # Other users are untouched.
    assert kari.get(ME_URL).status_code == 200
    assert count(db_session, UserSession) == 1


def test_session_of_a_deleted_user_is_not_resolved(
    logged_in_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    """Even a session row that somehow survived must not log a deleted user in."""
    client = logged_in_client(EMAIL)
    (user,) = _users(db_session)
    user.deleted_at = clock.now
    db_session.commit()

    assert _sessions_of(db_session, user.id) == 1
    assert client.get(ME_URL).status_code == 401


def test_login_after_delete_gives_invalid_credentials(
    logged_in_client: Callable[..., TestClient], make_client: Callable[[], TestClient]
) -> None:
    client = logged_in_client(EMAIL)
    assert client.delete(DELETE_URL).status_code == 204
    other = make_client()

    deleted = other.post(LOGIN_URL, json={"email": EMAIL, "password": PASSWORD})
    unknown = other.post(LOGIN_URL, json={"email": "ukjent@eksempel.no", "password": PASSWORD})

    assert deleted.status_code == 401
    assert deleted.json() == INVALID_CREDENTIALS
    assert (unknown.status_code, unknown.json()) == (deleted.status_code, deleted.json())
    assert "set-cookie" not in deleted.headers


def test_failed_logins_on_a_deleted_account_change_nothing(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    db_session: Session,
) -> None:
    client = logged_in_client(EMAIL)
    assert client.delete(DELETE_URL).status_code == 204
    other = make_client()

    for _ in range(6):
        response = other.post(LOGIN_URL, json={"email": EMAIL, "password": "feilpassord"})
        assert response.status_code == 401
        assert response.json() == INVALID_CREDENTIALS

    (user,) = _users(db_session)
    assert user.failed_login_count == 0
    assert user.locked_until is None


def test_same_email_can_register_again(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    db_session: Session,
) -> None:
    client = logged_in_client(EMAIL)
    old_id = client.get(ME_URL).json()["id"]
    assert client.delete(DELETE_URL).status_code == 204
    (old,) = _users(db_session)
    old_deleted_at = old.deleted_at

    new_client = make_client()
    response = new_client.post(REGISTER_URL, json={"email": EMAIL, "password": "nyttpassord"})

    assert response.status_code == 201
    assert response.json()["id"] != old_id
    assert response.json()["consent_at"] is None
    old_row, new_row = _users(db_session)
    assert str(old_row.id) == old_id
    assert old_row.deleted_at == old_deleted_at
    assert old_row.password_hash == old.password_hash
    assert new_row.deleted_at is None
    assert new_client.get(ME_URL).json()["id"] == response.json()["id"]
    # The new account is the one login finds.
    login = make_client().post(LOGIN_URL, json={"email": EMAIL, "password": "nyttpassord"})
    assert login.status_code == 200
    assert login.json()["id"] == response.json()["id"]


def test_two_active_accounts_cannot_share_an_email(
    logged_in_client: Callable[..., TestClient], make_client: Callable[[], TestClient]
) -> None:
    logged_in_client(EMAIL)

    response = make_client().post(REGISTER_URL, json={"email": EMAIL, "password": PASSWORD})

    assert response.status_code == 409


def test_delete_requires_login(client: TestClient, db_session: Session) -> None:
    response = client.delete(DELETE_URL)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == UNAUTHORIZED_CODE


def test_delete_with_wrong_origin_is_rejected(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = logged_in_client(EMAIL)

    response = client.delete(DELETE_URL, headers={"Origin": "https://evil.example"})

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "origin_mismatch"
    (user,) = _users(db_session)
    assert user.deleted_at is None
    assert client.get(ME_URL).status_code == 200


def test_delete_without_origin_is_rejected(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = logged_in_client(EMAIL)
    del client.headers["Origin"]

    response = client.delete(DELETE_URL)

    assert response.status_code == 403
    (user,) = _users(db_session)
    assert user.deleted_at is None


def test_deleted_at_is_stored_in_utc(
    logged_in_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = logged_in_client(EMAIL)

    assert client.delete(DELETE_URL).status_code == 204

    (user,) = _users(db_session)
    assert isinstance(user.deleted_at, datetime)
    assert user.deleted_at.utcoffset() is not None
    assert user.deleted_at.utcoffset().total_seconds() == 0
