"""Login lockout and its expiry with a controlled clock (NFR-8)."""

from collections.abc import Callable
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.identity.models import Session as UserSession
from app.modules.identity.models import User
from tests.conftest import PASSWORD, Clock
from tests.identity.helpers import (
    INVALID_CREDENTIALS,
    LOGIN_URL,
    TOO_MANY_ATTEMPTS,
    count,
)

EMAIL = "ola@eksempel.no"
WRONG = {"email": EMAIL, "password": "feilpassord"}
RIGHT = {"email": EMAIL, "password": PASSWORD}


def _account(logged_in_client: Callable[..., TestClient]) -> TestClient:
    client = logged_in_client(EMAIL)
    client.cookies.clear()
    return client


def _fail(client: TestClient, times: int) -> None:
    for _ in range(times):
        response = client.post(LOGIN_URL, json=WRONG)
        assert response.status_code == 401
        assert response.json() == INVALID_CREDENTIALS


def test_five_failures_lock_the_account_even_for_the_right_password(
    logged_in_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = _account(logged_in_client)
    _fail(client, 5)

    for payload in (RIGHT, WRONG):
        response = client.post(LOGIN_URL, json=payload)
        assert response.status_code == 429
        assert response.json() == TOO_MANY_ATTEMPTS
        assert "set-cookie" not in response.headers
    assert count(db_session, UserSession) == 1  # only the registration session


def test_lock_expires_after_15_minutes_and_is_not_extended(
    logged_in_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = _account(logged_in_client)
    _fail(client, 5)
    locked_at = clock.now
    user = db_session.scalars(select(User)).one()
    assert user.locked_until == locked_at + timedelta(minutes=15)

    # Attempts while locked do not move the lock.
    clock.advance(timedelta(minutes=14, seconds=59))
    assert client.post(LOGIN_URL, json=RIGHT).status_code == 429
    db_session.refresh(user)
    assert user.locked_until == locked_at + timedelta(minutes=15)

    clock.now = locked_at + timedelta(minutes=15)
    response = client.post(LOGIN_URL, json=RIGHT)

    assert response.status_code == 200
    db_session.refresh(user)
    assert user.locked_until is None
    assert user.failed_login_count == 0


def test_one_failure_after_the_lock_expires_does_not_lock_again(
    logged_in_client: Callable[..., TestClient], clock: Clock
) -> None:
    client = _account(logged_in_client)
    _fail(client, 5)
    clock.advance(timedelta(minutes=15))

    _fail(client, 1)

    assert client.post(LOGIN_URL, json=RIGHT).status_code == 200


def test_failures_older_than_15_minutes_start_a_new_window(
    logged_in_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = _account(logged_in_client)
    _fail(client, 4)
    clock.advance(timedelta(minutes=16))

    _fail(client, 1)

    user = db_session.scalars(select(User)).one()
    assert user.locked_until is None
    assert user.failed_login_count == 1
    assert client.post(LOGIN_URL, json=RIGHT).status_code == 200


def test_five_failures_spread_inside_the_window_lock(
    logged_in_client: Callable[..., TestClient], clock: Clock
) -> None:
    client = _account(logged_in_client)
    for _ in range(5):
        _fail(client, 1)
        clock.advance(timedelta(minutes=3))  # last failure at +12 min

    assert client.post(LOGIN_URL, json=RIGHT).status_code == 429


def test_a_successful_login_resets_the_count(
    logged_in_client: Callable[..., TestClient], clock: Clock
) -> None:
    client = _account(logged_in_client)
    _fail(client, 4)
    assert client.post(LOGIN_URL, json=RIGHT).status_code == 200
    client.cookies.clear()

    _fail(client, 4)

    assert client.post(LOGIN_URL, json=RIGHT).status_code == 200


def test_unknown_emails_are_never_locked(client: TestClient, clock: Clock) -> None:
    for _ in range(7):
        response = client.post(LOGIN_URL, json={"email": "ingen@eksempel.no", "password": "x"})
        assert response.status_code == 401
        assert response.json() == INVALID_CREDENTIALS


def test_lockout_is_per_account(
    logged_in_client: Callable[..., TestClient], clock: Clock
) -> None:
    client = _account(logged_in_client)
    other = logged_in_client("kari@eksempel.no")
    other.cookies.clear()
    _fail(client, 5)

    response = other.post(LOGIN_URL, json={"email": "kari@eksempel.no", "password": PASSWORD})

    assert response.status_code == 200
