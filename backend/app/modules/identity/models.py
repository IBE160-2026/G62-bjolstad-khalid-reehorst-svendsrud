"""Identity tables: users and their server-side sessions (AD-3).

Rule for every user-owned table (here and in later modules): its `user_id` foreign key
uses `ondelete="CASCADE"`, so `python -m app.cli purge` removes the user's rows with them.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"
    # One active account per email; a soft-deleted account frees its email (AD-14).
    __table_args__ = (
        Index(
            "ix_users_email",
            "email",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # Stored trimmed and lower-cased; the partial unique index above keeps it unique.
    email: Mapped[str] = mapped_column(String(254))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    # Login lockout (AD-3): failures counted per account inside a window from the first one.
    failed_login_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    first_failed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # When the user agreed to health data being stored (GDPR art. 9); null = not yet.
    consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Soft delete (AD-14): set when the user deletes the account; every user query skips
    # these rows, and `purge` hard-deletes them 30 days later.
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Deactivation (story 1.8): set when the user takes a break; every session is ended,
    # no data is deleted, and logging in again with the right password clears it. Never
    # purged: `purge` only looks at `deleted_at`.
    deactivated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # When the user closed the first-run introduction (story 2.3); null = show it.
    intro_dismissed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # HMAC-SHA256(SESSION_SECRET, token) as hex; the token itself is never stored.
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class PasswordReset(Base):
    """One "forgot password" link (story 1.7): valid until `expires_at`, used at most once."""

    __tablename__ = "password_resets"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # HMAC-SHA256(SESSION_SECRET, token) as hex, like sessions; the token is only in the mail.
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
