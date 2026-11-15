from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.identity import service
from app.modules.identity.models import Session as UserSession
from app.modules.identity.models import User
from tests.conftest import PASSWORD, REGISTER_URL, Clock
from tests.identity.helpers import (
    COOKIE,
    INVALID_CREDENTIALS,
    LOGIN_URL,
    LOGOUT_URL,
    ME_URL,
    UNAUTHORIZED_CODE,
    assert_cookie_cleared,
    count,
    use_token,
)

EMAIL = "ola@eksempel.no"


def _register(client: TestClient, email: str = EMAIL) -> dict:
    response = client.post(REGISTER_URL, json={"email": email, "password": PASSWORD})
    assert response.status_code == 201
    client.cookies.clear()
    return response.json()


@pytest.mark.parametrize("email", [EMAIL, "OLA@Eksempel.NO", "  Ola@eksempel.no "])
def test_login_with_any_email_case_creates_session_and_cookie(
    client: TestClient, db_session: Session, email: str
) -> None:
    registered = _register(client)

    response = client.post(LOGIN_URL, json={"email": email, "password": PASSWORD})

    assert response.status_code == 200
    assert response.json() == registered
    assert PASSWORD not in response.text
    set_cookie = response.headers["set-cookie"]
    assert set_cookie.startswith(f"{COOKIE}=")
    assert "httponly" in set_cookie.lower() and "secure" in set_cookie.lower()
    assert count(db_session, UserSession) == 2  # registration session + login session
    assert client.get(ME_URL).json() == registered


def test_successful_login_resets_the_failure_counter(
    client: TestClient, db_session: Session
) -> None:
    _register(client)
    for _ in range(3):
        client.post(LOGIN_URL, json={"email": EMAIL, "password": "feilpassord"})
    user = db_session.scalars(select(User)).one()
    assert user.failed_login_count == 3

    assert client.post(LOGIN_URL, json={"email": EMAIL, "password": PASSWORD}).status_code == 200

    db_session.refresh(user)
    assert user.failed_login_count == 0
    assert user.first_failed_at is None
    assert user.locked_until is None


def test_wrong_password_and_unknown_email_give_identical_answers(
    client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _register(client)
    verified: list[str] = []
    real_verify = service.verify_password
    monkeypatch.setattr(
        service,
        "verify_password",
        lambda password_hash, password: verified.append(password_hash)
        or real_verify(password_hash, password),
    )

    wrong_password = client.post(LOGIN_URL, json={"email": EMAIL, "password": "feilpassord"})
    unknown_email = client.post(LOGIN_URL, json={"email": "kari@eksempel.no", "password": PASSWORD})

    for response in (wrong_password, unknown_email):
        assert response.status_code == 401
        assert response.json() == INVALID_CREDENTIALS
        assert "set-cookie" not in response.headers
    # The unknown email still costs one Argon2 verification (against the dummy hash).
    assert len(verified) == 2
    assert verified[1].startswith("$argon2id$")
    user = db_session.scalars(select(User)).one()
    assert user.failed_login_count == 1  # only the real account counts
    assert count(db_session, User) == 1
    assert count(db_session, UserSession) == 1


@pytest.mark.parametrize(
    ("payload", "field", "message"),
    [
        ({"email": "", "password": PASSWORD}, "email", "Skriv inn e-postadressen din."),
        ({"email": "ola@", "password": PASSWORD}, "email", "Skriv inn en gyldig e-postadresse."),
        ({"email": EMAIL, "password": ""}, "password", "Skriv inn passordet ditt."),
        ({"email": EMAIL}, "password", "Fyll ut dette feltet."),
    ],
)
def test_invalid_login_input_returns_field_errors(
    client: TestClient, payload: dict, field: str, message: str
) -> None:
    response = client.post(LOGIN_URL, json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["fields"] == [{"field": field, "message": message}]


def test_login_replaces_the_session_of_the_cookie_it_had(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = logged_in_client()
    old_token = client.cookies.get(COOKIE)

    response = client.post(LOGIN_URL, json={"email": EMAIL, "password": PASSWORD})

    assert response.status_code == 200
    new_token = client.cookies.get(COOKIE)
    assert new_token and new_token != old_token
    assert count(db_session, UserSession) == 1
    use_token(client, old_token)
    assert client.get(ME_URL).status_code == 401


def test_me_returns_the_logged_in_user(logged_in_client: Callable[..., TestClient]) -> None:
    client = logged_in_client()

    response = client.get(ME_URL)

    assert response.status_code == 200
    assert response.json()["email"] == EMAIL


def test_me_without_cookie_is_unauthorized_and_clears_cookie(client: TestClient) -> None:
    response = client.get(ME_URL)

    assert response.status_code == 401
    assert response.json() == {"error": {"code": UNAUTHORIZED_CODE, "message": "Du må logge inn."}}
    assert_cookie_cleared(response.headers["set-cookie"])


def test_me_with_unknown_token_is_unauthorized(client: TestClient) -> None:
    use_token(client, "ikke-en-ekte-token")

    response = client.get(ME_URL)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == UNAUTHORIZED_CODE
    assert_cookie_cleared(response.headers["set-cookie"])


def test_expired_session_is_unauthorized_and_deleted(
    logged_in_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = logged_in_client()
    assert client.get(ME_URL).status_code == 200
    stored = db_session.scalars(select(UserSession)).one()
    clock.now = stored.expires_at

    response = client.get(ME_URL)

    assert response.status_code == 401
    assert_cookie_cleared(response.headers["set-cookie"])
    assert count(db_session, UserSession) == 0


def test_logout_deletes_the_session_and_clears_the_cookie(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = logged_in_client()
    token = client.cookies.get(COOKIE)

    response = client.post(LOGOUT_URL)

    assert response.status_code == 204
    assert response.content == b""
    assert_cookie_cleared(response.headers["set-cookie"])
    assert count(db_session, UserSession) == 0
    use_token(client, token)
    assert client.get(ME_URL).status_code == 401


def test_logout_without_or_with_unknown_cookie_is_unauthorized(client: TestClient) -> None:
    assert client.post(LOGOUT_URL).status_code == 401
    use_token(client, "ikke-en-ekte-token")
    response = client.post(LOGOUT_URL)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == UNAUTHORIZED_CODE


def test_logout_requires_matching_origin(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = logged_in_client()

    response = client.post(LOGOUT_URL, headers={"Origin": "https://evil.example"})

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "origin_mismatch"
    assert count(db_session, UserSession) == 1


def test_login_requires_matching_origin(bare_client: TestClient) -> None:
    response = bare_client.post(LOGIN_URL, json={"email": EMAIL, "password": PASSWORD})

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "origin_mismatch"
