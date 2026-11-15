"""`python -m app.cli purge` (story 1.6): hard-delete accounts soft-deleted > 30 days ago."""

import logging
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import Engine, select
from sqlalchemy.orm import Session, sessionmaker

import app.core.clock
import app.core.db
import app.main  # noqa: F401  (imports every module's models into Base.metadata)
from app import cli
from app.core.db import Base
from app.modules.identity import service
from app.modules.identity.models import Session as UserSession
from app.modules.identity.models import User
from app.modules.profile.models import Profile
from tests.conftest import _truncate_tables

NOW = datetime(2026, 11, 15, 12, 0, tzinfo=UTC)


@pytest.fixture
def factory(test_engine: Engine) -> Iterator[sessionmaker[Session]]:
    yield sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)
    _truncate_tables(test_engine)


def _add_user(db: Session, email: str, deleted_at: datetime | None) -> User:
    user = User(email=email, password_hash="x", deleted_at=deleted_at)
    db.add(user)
    db.flush()
    db.add(UserSession(user_id=user.id, token_hash=email.ljust(64, "0")[:64], expires_at=NOW))
    db.flush()
    return user


def _seed(factory: sessionmaker[Session]) -> None:
    with factory() as db:
        _add_user(db, "gammel@eksempel.no", NOW - timedelta(days=31))
        _add_user(db, "ny@eksempel.no", NOW - timedelta(days=29))
        _add_user(db, "aktiv@eksempel.no", None)
        db.commit()


def _emails(factory: sessionmaker[Session]) -> list[str]:
    with factory() as db:
        return sorted(db.scalars(select(User.email)))


def _session_count(factory: sessionmaker[Session]) -> int:
    with factory() as db:
        return len(list(db.scalars(select(UserSession))))


def _run_purge(
    monkeypatch: pytest.MonkeyPatch, factory: sessionmaker[Session], now: datetime = NOW
) -> int:
    monkeypatch.setattr(app.core.db, "get_session_factory", lambda: factory)
    monkeypatch.setattr(app.core.clock, "utc_now", lambda: now)
    return cli.main(["purge"])


def test_purge_removes_only_accounts_deleted_over_30_days_ago(
    factory: sessionmaker[Session],
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    caplog: pytest.LogCaptureFixture,
) -> None:
    _seed(factory)

    with caplog.at_level(logging.INFO, logger="app.cli"):
        assert _run_purge(monkeypatch, factory) == 0

    assert capsys.readouterr().out.strip() == "Purged 1 accounts."
    assert _emails(factory) == ["aktiv@eksempel.no", "ny@eksempel.no"]
    assert _session_count(factory) == 2  # the purged user's session went with it
    assert "Purged 1 accounts." in caplog.text
    assert "@" not in caplog.text


def test_purge_with_nothing_old_enough_reports_zero(
    factory: sessionmaker[Session],
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    _seed(factory)

    assert _run_purge(monkeypatch, factory, NOW - timedelta(days=2)) == 0

    assert capsys.readouterr().out.strip() == "Purged 0 accounts."
    assert len(_emails(factory)) == 3


def test_purge_cutoff_is_exactly_30_days(factory: sessionmaker[Session]) -> None:
    with factory() as db:
        _add_user(db, "grense@eksempel.no", NOW - timedelta(days=30))
        _add_user(db, "nesten@eksempel.no", NOW - timedelta(days=30) + timedelta(seconds=1))
        db.commit()

    with factory() as db:
        assert service.purge_deleted(db, NOW) == 1
        db.commit()

    assert _emails(factory) == ["nesten@eksempel.no"]


def test_purge_removes_the_profile_of_a_purged_user(factory: sessionmaker[Session]) -> None:
    """Checks the migrated FK (not just the model): the profile row goes with the user."""
    with factory() as db:
        user = _add_user(db, "gammel@eksempel.no", NOW - timedelta(days=31))
        db.add(
            Profile(
                user_id=user.id,
                sex="female",
                weight_kg=82,
                height_cm=162,
                age=23,
                activity_level="light",
                goal="lose",
                target_kcal=1640,
                floor_applied=False,
                created_at=NOW,
                updated_at=NOW,
            )
        )
        db.commit()

    with factory() as db:
        assert service.purge_deleted(db, NOW) == 1
        db.commit()

    assert _emails(factory) == []
    with factory() as db:
        assert list(db.scalars(select(Profile))) == []


def test_every_foreign_key_to_users_cascades() -> None:
    """Purge relies on it: a user-owned row without CASCADE would block or outlive purge."""
    user_fks = [
        fk
        for table in Base.metadata.tables.values()
        for fk in table.foreign_keys
        if fk.column.table.name == "users" and fk.column.name == "id"
    ]

    assert user_fks, "expected at least sessions.user_id"
    for fk in user_fks:
        assert fk.ondelete == "CASCADE", f"{fk.parent.table.name}.{fk.parent.name}"
