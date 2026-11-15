"""Database access for identity. Only the identity service calls this."""

import uuid
from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSessionType

from app.modules.identity.models import Session, User


class EmailTakenError(Exception):
    """The email already belongs to an account (unique index violation)."""


def get_user_by_email(db: DbSessionType, email: str) -> User | None:
    return db.scalars(select(User).where(User.email == email)).one_or_none()


def get_user_by_email_for_update(db: DbSessionType, email: str) -> User | None:
    """Lock the user row so concurrent logins cannot lose a failure count."""
    return db.scalars(select(User).where(User.email == email).with_for_update()).one_or_none()


def add_user(db: DbSessionType, email: str, password_hash: str) -> User:
    user = User(email=email, password_hash=password_hash)
    try:
        # Savepoint, so a concurrent duplicate only undoes this insert.
        with db.begin_nested():
            db.add(user)
            db.flush()
    except IntegrityError as exc:
        raise EmailTakenError from exc
    return user


def add_session(db: DbSessionType, user: User, token_hash: str, expires_at: datetime) -> Session:
    session = Session(user_id=user.id, token_hash=token_hash, expires_at=expires_at)
    db.add(session)
    db.flush()
    return session


def get_session_by_token_hash(db: DbSessionType, token_hash: str) -> Session | None:
    return db.scalars(select(Session).where(Session.token_hash == token_hash)).one_or_none()


def get_user(db: DbSessionType, user_id: uuid.UUID) -> User | None:
    return db.get(User, user_id)


def delete_session(db: DbSessionType, session_id: uuid.UUID) -> None:
    db.execute(delete(Session).where(Session.id == session_id))


def delete_session_by_token_hash(db: DbSessionType, token_hash: str) -> None:
    db.execute(delete(Session).where(Session.token_hash == token_hash))
