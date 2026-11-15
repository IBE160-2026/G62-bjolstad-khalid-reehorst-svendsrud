"""Database access for identity. Only the identity service calls this."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSessionType

from app.modules.identity.models import Session, User


class EmailTakenError(Exception):
    """The email already belongs to an account (unique index violation)."""


def get_user_by_email(db: DbSessionType, email: str) -> User | None:
    return db.scalars(select(User).where(User.email == email)).one_or_none()


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
