"""Small helpers shared by the identity tests."""

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

LOGIN_URL = "/api/identity/login"
LOGOUT_URL = "/api/identity/logout"
ME_URL = "/api/identity/me"
COOKIE = "pf_session"
INVALID_CREDENTIALS = {
    "error": {"code": "invalid_credentials", "message": "E-post eller passord er feil."}
}
TOO_MANY_ATTEMPTS = {
    "error": {"code": "too_many_attempts", "message": "For mange forsøk. Prøv igjen om litt."}
}
UNAUTHORIZED_CODE = "unauthorized"


def count(db: Session, model: type) -> int:
    db.expire_all()
    return db.scalar(select(func.count()).select_from(model)) or 0


def use_token(client: TestClient, token: str) -> None:
    """Make the client present exactly this session token."""
    client.cookies.clear()
    client.cookies.set(COOKIE, token, domain="testserver", path="/")


def assert_cookie_cleared(set_cookie: str) -> None:
    assert set_cookie.startswith(f"{COOKIE}=")
    lowered = set_cookie.lower()
    assert "max-age=0" in lowered
    assert "path=/" in lowered
    assert "httponly" in lowered
    assert "secure" in lowered
