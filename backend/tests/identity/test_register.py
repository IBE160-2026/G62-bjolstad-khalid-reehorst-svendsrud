import hmac
from datetime import UTC, datetime, timedelta
from hashlib import sha256

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.settings import get_settings
from app.modules.identity.models import Session as UserSession
from app.modules.identity.models import User

URL = "/api/identity/register"
PASSWORD = "hemmelig1"


def _count(db: Session, model: type) -> int:
    return db.scalar(select(func.count()).select_from(model)) or 0


def _session_cookie(set_cookie: str) -> dict[str, str]:
    parts = [part.strip() for part in set_cookie.split(";")]
    name, _, value = parts[0].partition("=")
    attrs = {}
    for part in parts[1:]:
        key, _, val = part.partition("=")
        attrs[key.lower()] = val
    return {"name": name, "value": value, **attrs}


def test_register_creates_user_session_and_cookie(client: TestClient, db_session: Session) -> None:
    response = client.post(URL, json={"email": "  Ola@Eksempel.no ", "password": PASSWORD})

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "ola@eksempel.no"
    assert PASSWORD not in response.text

    user = db_session.scalars(select(User)).one()
    assert str(user.id) == body["id"]
    assert user.id.version == 4
    assert user.email == "ola@eksempel.no"
    assert user.password_hash.startswith("$argon2id$")
    assert PASSWORD not in user.password_hash
    assert user.created_at.utcoffset() == timedelta(0)

    cookie = _session_cookie(response.headers["set-cookie"])
    assert cookie["name"] == "pf_session"
    assert {"httponly", "secure", "path", "max-age", "samesite"} <= cookie.keys()
    assert cookie["path"] == "/"
    assert cookie["samesite"].lower() == "lax"
    assert int(cookie["max-age"]) == 30 * 24 * 60 * 60

    stored = db_session.scalars(select(UserSession)).one()
    token = cookie["value"]
    assert stored.user_id == user.id
    assert stored.token_hash != token
    secret = get_settings().session_secret.get_secret_value().encode()
    assert stored.token_hash == hmac.new(secret, token.encode(), sha256).hexdigest()
    lifetime = stored.expires_at - datetime.now(UTC)
    assert timedelta(days=29, hours=23) < lifetime <= timedelta(days=30)


@pytest.mark.parametrize("email", ["ola@eksempel.no", "OLA@Eksempel.NO", " ola@EKSEMPEL.no"])
def test_duplicate_email_in_any_case_is_rejected(
    client: TestClient, db_session: Session, email: str
) -> None:
    assert client.post(URL, json={"email": "ola@eksempel.no", "password": PASSWORD}).status_code == 201
    client.cookies.clear()

    response = client.post(URL, json={"email": email, "password": "annetpassord"})

    assert response.status_code == 409
    assert response.json() == {
        "error": {
            "code": "email_unavailable",
            "message": "Denne e-posten kan ikke brukes. Prøv å logge inn i stedet.",
        }
    }
    assert "set-cookie" not in response.headers
    assert _count(db_session, User) == 1
    assert _count(db_session, UserSession) == 1


def test_concurrent_duplicate_insert_returns_409(
    client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    assert client.post(URL, json={"email": "ola@eksempel.no", "password": PASSWORD}).status_code == 201
    # Simulate the race: the pre-check sees no user, the insert hits the unique index.
    from app.modules.identity import repository

    monkeypatch.setattr(repository, "get_user_by_email", lambda db, email: None)

    response = client.post(URL, json={"email": "Ola@eksempel.no", "password": PASSWORD})

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "email_unavailable"
    assert "set-cookie" not in response.headers
    assert _count(db_session, User) == 1
    assert _count(db_session, UserSession) == 1


@pytest.mark.parametrize(
    ("payload", "field", "message"),
    [
        ({"email": "ola@", "password": PASSWORD}, "email", "Skriv inn en gyldig e-postadresse."),
        ({"email": "ola@eksempel", "password": PASSWORD}, "email", "Skriv inn en gyldig e-postadresse."),
        ({"email": "a@b@c.no", "password": PASSWORD}, "email", "Skriv inn en gyldig e-postadresse."),
        ({"email": "@eksempel.no", "password": PASSWORD}, "email", "Skriv inn en gyldig e-postadresse."),
        (
            {"email": "a" * 250 + "@b.no", "password": PASSWORD},
            "email",
            "Skriv inn en gyldig e-postadresse.",
        ),
        ({"email": "   ", "password": PASSWORD}, "email", "Skriv inn e-postadressen din."),
        ({"email": "ola@eksempel.no", "password": "1234567"}, "password", "Velg et passord på minst 8 tegn."),
        (
            {"email": "ola@eksempel.no", "password": "x" * 129},
            "password",
            "Velg et passord på høyst 128 tegn.",
        ),
        ({"password": PASSWORD}, "email", "Fyll ut dette feltet."),
        ({"email": 123, "password": PASSWORD}, "email", "Sjekk verdien i dette feltet."),
    ],
)
def test_invalid_input_returns_field_errors(
    client: TestClient, db_session: Session, payload: dict, field: str, message: str
) -> None:
    response = client.post(URL, json=payload)

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert error["message"]
    assert error["fields"] == [{"field": field, "message": message}]
    assert "set-cookie" not in response.headers
    assert _count(db_session, User) == 0
    if "password" in payload:
        assert payload["password"] not in response.text


def test_malformed_json_body_returns_envelope_without_fields(
    client: TestClient, db_session: Session
) -> None:
    response = client.post(
        URL, content=b"{not json", headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert error["message"]
    assert "fields" not in error
    assert _count(db_session, User) == 0


def test_password_limits_are_inclusive(client: TestClient) -> None:
    assert client.post(URL, json={"email": "a@b.no", "password": "x" * 8}).status_code == 201
    client.cookies.clear()
    assert client.post(URL, json={"email": "c@d.no", "password": "x" * 128}).status_code == 201


def test_both_fields_invalid_reports_both(client: TestClient) -> None:
    response = client.post(URL, json={"email": "ola@", "password": "kort"})

    assert response.status_code == 422
    assert [f["field"] for f in response.json()["error"]["fields"]] == ["email", "password"]


def test_register_requires_matching_origin(bare_client: TestClient, db_session: Session) -> None:
    response = bare_client.post(
        URL,
        json={"email": "ola@eksempel.no", "password": PASSWORD},
        headers={"Origin": "https://evil.example"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "origin_mismatch"
    assert _count(db_session, User) == 0
