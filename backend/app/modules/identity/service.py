"""Account rules: password hashing, sessions, registration, login, lockout, consent,
password reset, deactivation and deletion."""

import hashlib
import hmac
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from sqlalchemy.orm import Session as DbSessionType

from app.core.errors import AppError
from app.core.settings import get_settings
from app.modules.exercises import service as exercises_service
from app.modules.identity import repository
from app.modules.identity.models import User
from app.ports.email import EmailMessage

SESSION_LIFETIME = timedelta(days=30)
EMAIL_UNAVAILABLE_MESSAGE = "Denne e-posten kan ikke brukes. Prøv å logge inn i stedet."
INVALID_CREDENTIALS_MESSAGE = "E-post eller passord er feil."
TOO_MANY_ATTEMPTS_MESSAGE = "For mange forsøk. Prøv igjen om litt."

# Soft-deleted accounts are kept this long before `purge` removes them for good (AD-14).
PURGE_AFTER = timedelta(days=30)

# Lockout: this many failures within the window lock the account for the duration.
LOCKOUT_THRESHOLD = 5
LOCKOUT_WINDOW = timedelta(minutes=15)
LOCKOUT_DURATION = timedelta(minutes=15)

# Password reset (story 1.7): links live this long, and an account gets at most this many
# per rolling window; requests over the limit send nothing and look the same.
RESET_LINK_LIFETIME = timedelta(minutes=60)
RESET_LIMIT = 3
RESET_LIMIT_WINDOW = timedelta(hours=1)
# Longer tokens than this are never ours (token_urlsafe(32) is 43 characters).
RESET_TOKEN_MAX_LENGTH = 256
RESET_PATH = "/nytt-passord"
RESET_MAIL_SUBJECT = "Nytt passord til Prompt Force"
RESET_LINK_INVALID_MESSAGE = "Lenken er utløpt eller allerede brukt. Be om en ny."

# argon2-cffi defaults: Argon2id with the RFC 9106 low-memory profile.
_password_hasher = PasswordHasher()
# Verified against for unknown emails, so they cost the same time as a wrong password.
_DUMMY_PASSWORD_HASH = _password_hasher.hash("prompt-force-dummy-password")


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def new_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    """HMAC with SESSION_SECRET, so a leaked sessions table cannot be replayed."""
    secret = get_settings().session_secret.get_secret_value().encode()
    return hmac.new(secret, token.encode(), hashlib.sha256).hexdigest()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def email_in_use(db: DbSessionType, email: str) -> bool:
    """Whether any account, including a soft-deleted one, holds this email (the demo
    seed's idempotency check: such an email cannot be registered again)."""
    return repository.email_exists(db, normalize_email(email))


@dataclass(frozen=True)
class Registration:
    user: User
    session_token: str
    expires_at: datetime


def _email_unavailable() -> AppError:
    return AppError(409, "email_unavailable", EMAIL_UNAVAILABLE_MESSAGE)


def register(db: DbSessionType, email: str, password: str, now: datetime) -> Registration:
    """Create the account and a session so the user is logged in at once."""
    email = normalize_email(email)
    if repository.get_user_by_email(db, email) is not None:
        raise _email_unavailable()
    try:
        user = repository.add_user(db, email, hash_password(password))
    except repository.EmailTakenError:
        raise _email_unavailable() from None
    # "Hjemme" and "Treningssenter" (story 4.2), through the exercises service only.
    exercises_service.create_default_profiles(db, user.id, now)

    token = new_session_token()
    expires_at = now + SESSION_LIFETIME
    repository.add_session(db, user, hash_session_token(token), expires_at)
    return Registration(user=user, session_token=token, expires_at=expires_at)


@dataclass(frozen=True)
class SessionUser:
    """The logged-in user behind one session; what `CurrentUser` hands to endpoints."""

    id: uuid.UUID
    email: str
    session_id: uuid.UUID
    consent_at: datetime | None
    intro_dismissed_at: datetime | None


@dataclass(frozen=True)
class Login:
    user: User
    session_token: str
    # The account was deactivated and this login made it active again (story 1.8).
    reactivated: bool = False


class LoginRejected(AppError):
    """A failed login. Its counter changes must be committed even though it is an error."""


def _invalid_credentials() -> LoginRejected:
    return LoginRejected(401, "invalid_credentials", INVALID_CREDENTIALS_MESSAGE)


def _too_many_attempts() -> LoginRejected:
    return LoginRejected(429, "too_many_attempts", TOO_MANY_ATTEMPTS_MESSAGE)


def _record_failure(user: User, now: datetime) -> None:
    if user.first_failed_at is None or now - user.first_failed_at >= LOCKOUT_WINDOW:
        user.failed_login_count = 1
        user.first_failed_at = now
    else:
        user.failed_login_count += 1
    if user.failed_login_count >= LOCKOUT_THRESHOLD:
        user.locked_until = now + LOCKOUT_DURATION
        user.failed_login_count = 0
        user.first_failed_at = None


def _reset_failures(user: User) -> None:
    user.failed_login_count = 0
    user.first_failed_at = None
    user.locked_until = None


def login(
    db: DbSessionType,
    email: str,
    password: str,
    now: datetime,
    replaced_token: str | None = None,
) -> Login:
    """Check the password, apply the lockout and create a new session.

    Raises `LoginRejected`; the caller must commit before re-raising so a counted
    failure is stored. `replaced_token` is the session cookie the browser already
    had: its session is deleted when the login succeeds.
    """
    user = repository.get_user_by_email_for_update(db, normalize_email(email))
    if user is None:
        # Same work and the same answer as a wrong password; nothing is counted.
        verify_password(_DUMMY_PASSWORD_HASH, password)
        raise _invalid_credentials()

    if user.locked_until is not None and now < user.locked_until:
        # Every attempt is refused while locked, and the lock is not extended.
        raise _too_many_attempts()

    if not verify_password(user.password_hash, password):
        _record_failure(user, now)
        raise _invalid_credentials()

    _reset_failures(user)
    # The only way back from deactivation: the right password (story 1.8).
    reactivated = user.deactivated_at is not None
    user.deactivated_at = None
    if replaced_token:
        repository.delete_session_by_token_hash(db, hash_session_token(replaced_token))
    token = new_session_token()
    repository.add_session(db, user, hash_session_token(token), now + SESSION_LIFETIME)
    return Login(user=user, session_token=token, reactivated=reactivated)


def _reset_mail(email: str, token: str) -> EmailMessage:
    link = f"{get_settings().app_url.strip().rstrip('/')}{RESET_PATH}?token={token}"
    body = (
        "Hei!\n\n"
        "Vi fikk en forespørsel om nytt passord til kontoen din i Prompt Force. "
        "Åpne lenken for å velge et nytt passord:\n\n"
        f"{link}\n\n"
        "Lenken virker i 60 minutter og kan brukes én gang.\n\n"
        "Ba du ikke om dette, kan du se bort fra e-posten. Passordet ditt er ikke endret.\n\n"
        "Hilsen Prompt Force\n"
    )
    return EmailMessage(to=email, subject=RESET_MAIL_SUBJECT, body=body)


def request_password_reset(db: DbSessionType, email: str, now: datetime) -> EmailMessage | None:
    """Create a reset link for an active (or deactivated) account and return the mail to send.

    Returns None for an unknown or soft-deleted email and when the account already got
    `RESET_LIMIT` links within `RESET_LIMIT_WINDOW`. The caller answers the same in every
    case and sends the mail after responding, so neither answer nor timing tells them apart.
    Older unused links stay valid.
    """
    # Same token and lookup work whether or not the account exists.
    token = new_session_token()
    token_hash = hash_session_token(token)
    user = repository.get_user_by_email_for_update(db, normalize_email(email))
    user_id = user.id if user is not None else uuid.uuid4()
    recent = repository.count_password_resets_since(db, user_id, now - RESET_LIMIT_WINDOW)
    if user is None or recent >= RESET_LIMIT:
        return None
    repository.add_password_reset(db, user.id, token_hash, now, now + RESET_LINK_LIFETIME)
    return _reset_mail(user.email, token)


def _reset_link_invalid() -> AppError:
    return AppError(400, "reset_link_invalid", RESET_LINK_INVALID_MESSAGE)


def confirm_password_reset(db: DbSessionType, token: str, password: str, now: datetime) -> None:
    """Set a new password from a reset link (story 1.7).

    The link is used up (with every other unused link of the account), every session is
    deleted and the login lockout is cleared. No session is created, and `deactivated_at`
    is left alone: the next login reactivates as in story 1.8. Raises `reset_link_invalid`
    for an unknown, used or expired token or a soft-deleted account, changing nothing.
    """
    if not token or len(token) > RESET_TOKEN_MAX_LENGTH:
        raise _reset_link_invalid()
    reset = repository.get_password_reset_for_update(db, hash_session_token(token))
    if reset is None or reset.used_at is not None or reset.expires_at <= now:
        raise _reset_link_invalid()
    user = repository.get_user_for_update(db, reset.user_id)
    if user is None:
        raise _reset_link_invalid()

    user.password_hash = hash_password(password)
    _reset_failures(user)
    repository.use_all_password_resets(db, user.id, now)
    repository.delete_all_sessions(db, user.id)
    db.flush()


def resolve_session(db: DbSessionType, token: str, now: datetime) -> SessionUser | None:
    """The user behind a session token, or None if it is unknown or expired.

    An expired session row is deleted; the caller commits that before refusing.
    """
    session = repository.get_session_by_token_hash(db, hash_session_token(token))
    if session is None:
        return None
    if session.expires_at <= now:
        repository.delete_session(db, session.id)
        return None
    user = repository.get_user(db, session.user_id)
    # A deactivated account has no valid sessions (story 1.8), even one that slipped
    # past `deactivate_account` in a race with a login.
    if user is None or user.deactivated_at is not None:
        return None
    return SessionUser(
        id=user.id,
        email=user.email,
        session_id=session.id,
        consent_at=user.consent_at,
        intro_dismissed_at=user.intro_dismissed_at,
    )


def end_all_sessions(db: DbSessionType, user_id: uuid.UUID) -> None:
    """Delete every session of the user (the demo seed drops the one `register` made)."""
    repository.delete_all_sessions(db, user_id)


def logout(db: DbSessionType, session_id: uuid.UUID) -> None:
    """Delete only the presented session; other devices stay logged in."""
    repository.delete_session(db, session_id)


def _locked_user(db: DbSessionType, user_id: uuid.UUID) -> User:
    user = repository.get_user_for_update(db, user_id)
    if user is None:
        # The session's user disappeared mid-request; treat it like a missing session.
        raise AppError(401, "unauthorized", "Du må logge inn.")
    return user


def give_consent(db: DbSessionType, user_id: uuid.UUID, now: datetime) -> User:
    """Record consent at `now`; giving it again keeps the first time."""
    user = _locked_user(db, user_id)
    if user.consent_at is None:
        user.consent_at = now
        db.flush()
    return user


def dismiss_intro(db: DbSessionType, user_id: uuid.UUID, now: datetime) -> User:
    """Record that the first-run introduction was closed; closing it again keeps the first time."""
    user = _locked_user(db, user_id)
    if user.intro_dismissed_at is None:
        user.intro_dismissed_at = now
        db.flush()
    return user


def deactivate_account(db: DbSessionType, user_id: uuid.UUID, now: datetime) -> None:
    """Deactivate the account at `now` and end every session it has (story 1.8).

    No data is deleted; the account stays visible to login, which reactivates it on the
    right password. Deactivating again keeps the first time.
    """
    user = _locked_user(db, user_id)
    if user.deactivated_at is None:
        user.deactivated_at = now
    repository.delete_all_sessions(db, user.id)
    db.flush()


def delete_account(db: DbSessionType, user_id: uuid.UUID, now: datetime) -> None:
    """Soft-delete the account at `now` and end every session it has (AD-14).

    From here on the user is invisible to login, sessions and every other lookup.
    """
    user = _locked_user(db, user_id)
    user.deleted_at = now
    repository.delete_all_sessions(db, user.id)
    db.flush()


def purge_deleted(db: DbSessionType, now: datetime) -> int:
    """Hard-delete accounts soft-deleted at least `PURGE_AFTER` ago; returns how many.

    Deactivated accounts (story 1.8) are never purged: only `deleted_at` counts.
    """
    return repository.purge_deleted_users(db, now - PURGE_AFTER)
