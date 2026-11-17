"""Database access for identity. Only the identity service calls this.

Every user lookup skips soft-deleted accounts (`deleted_at` set, AD-14); only `purge`
looks at them.
"""

import uuid
from datetime import datetime

from sqlalchemy import Select, delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSessionType

from app.modules.identity.models import Session, User


class EmailTakenError(Exception):
    """The email already belongs to an account (unique index violation)."""


def _active_users() -> Select[tuple[User]]:
    """Users that are not soft-deleted; the start of every user query."""
    return select(User).where(User.deleted_at.is_(None))


def get_user_by_email(db: DbSessionType, email: str) -> User | None:
    return db.scalars(_active_users().where(User.email == email)).one_or_none()


def email_exists(db: DbSessionType, email: str) -> bool:
    """Whether any account, soft-deleted or not, holds this email (the unique index does)."""
    return db.scalar(select(User.id).where(User.email == email).limit(1)) is not None


def get_user_by_email_for_update(db: DbSessionType, email: str) -> User | None:
    """Lock the user row so concurrent logins cannot lose a failure count."""
    return db.scalars(_active_users().where(User.email == email).with_for_update()).one_or_none()


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
    """A session of an active user; sessions of soft-deleted users are never resolved."""
    statement = (
        select(Session)
        .join(User, User.id == Session.user_id)
        .where(Session.token_hash == token_hash, User.deleted_at.is_(None))
    )
    return db.scalars(statement).one_or_none()


def get_user(db: DbSessionType, user_id: uuid.UUID) -> User | None:
    return db.scalars(_active_users().where(User.id == user_id)).one_or_none()


def get_user_for_update(db: DbSessionType, user_id: uuid.UUID) -> User | None:
    """Lock the user row so two consent or delete requests cannot race.

    `populate_existing` reloads a user already in the session (from `resolve_session`),
    so a request that waited on the lock sees the other request's committed values.
    """
    statement = (
        _active_users()
        .where(User.id == user_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return db.scalars(statement).one_or_none()


def delete_session(db: DbSessionType, session_id: uuid.UUID) -> None:
    db.execute(delete(Session).where(Session.id == session_id))


def delete_session_by_token_hash(db: DbSessionType, token_hash: str) -> None:
    db.execute(delete(Session).where(Session.token_hash == token_hash))


def delete_all_sessions(db: DbSessionType, user_id: uuid.UUID) -> None:
    db.execute(delete(Session).where(Session.user_id == user_id))


def purge_deleted_users(db: DbSessionType, deleted_before: datetime) -> int:
    """Hard-delete users soft-deleted at or before the cutoff; returns how many.

    Their sessions and every other user-owned row go with them via ON DELETE CASCADE.
    """
    result = db.execute(
        delete(User).where(User.deleted_at.is_not(None), User.deleted_at <= deleted_before)
    )
    return result.rowcount or 0
