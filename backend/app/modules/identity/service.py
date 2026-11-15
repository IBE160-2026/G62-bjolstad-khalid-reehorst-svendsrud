"""Account rules: password hashing, session tokens and registration (FR1, AD-3)."""

import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from sqlalchemy.orm import Session as DbSessionType

from app.core.errors import AppError
from app.core.settings import get_settings
from app.modules.identity import repository
from app.modules.identity.models import User

SESSION_LIFETIME = timedelta(days=30)
EMAIL_UNAVAILABLE_MESSAGE = "Denne e-posten kan ikke brukes. Prøv å logge inn i stedet."

# argon2-cffi defaults: Argon2id with the RFC 9106 low-memory profile.
_password_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def new_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    """HMAC with SESSION_SECRET, so a leaked sessions table cannot be replayed."""
    secret = get_settings().session_secret.get_secret_value().encode()
    return hmac.new(secret, token.encode(), hashlib.sha256).hexdigest()


def normalize_email(email: str) -> str:
    return email.strip().lower()


@dataclass(frozen=True)
class Registration:
    user: User
    session_token: str
    expires_at: datetime


def _email_unavailable() -> AppError:
    return AppError(409, "email_unavailable", EMAIL_UNAVAILABLE_MESSAGE)


def register(db: DbSessionType, email: str, password: str) -> Registration:
    """Create the account and a session so the user is logged in at once."""
    email = normalize_email(email)
    if repository.get_user_by_email(db, email) is not None:
        raise _email_unavailable()
    try:
        user = repository.add_user(db, email, hash_password(password))
    except repository.EmailTakenError:
        raise _email_unavailable() from None

    token = new_session_token()
    expires_at = datetime.now(UTC) + SESSION_LIFETIME
    repository.add_session(db, user, hash_session_token(token), expires_at)
    return Registration(user=user, session_token=token, expires_at=expires_at)
