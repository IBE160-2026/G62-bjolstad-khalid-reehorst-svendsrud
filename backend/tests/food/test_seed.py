"""Matvaretabellen seed (story 3.1): loaded once, only for APP_ENV=local."""

import json
from pathlib import Path
from collections.abc import Iterator

import pytest
from sqlalchemy import Engine, func, select
from sqlalchemy.orm import Session, sessionmaker

import app.core.db
from app.core.settings import get_settings
from app.modules.food.models import FoodItem
from app.seed import seed
from tests.conftest import _truncate_tables


@pytest.fixture
def factory(test_engine: Engine) -> Iterator[sessionmaker[Session]]:
    yield sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)
    _truncate_tables(test_engine)


def _count(factory: sessionmaker[Session], source: str = "matvaretabellen") -> int:
    """Shared items from one source; the OFF Norway seed (story 3.7) is counted separately."""
    with factory() as db:
        return (
            db.scalar(
                select(func.count()).select_from(FoodItem).where(FoodItem.source == source)
            )
            or 0
        )


def test_seed_file_has_at_least_100_valid_foods() -> None:
    rows = json.loads(seed.MATVARETABELLEN_FILE.read_text(encoding="utf-8"))
    names = [row["name"] for row in rows]

    assert len(rows) >= 100
    assert len(set(names)) == len(names)
    assert "Havremel" in names
    for row in rows:
        assert row["food_id"] and row["name"]
        assert row["kcal_per_100g"] >= 0


def test_seed_inserts_shared_items_once(
    factory: sessionmaker[Session], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(app.core.db, "get_session_factory", lambda: factory)
    # The OFF Norway seed has its own tests (test_off_import.py); keep this one small.
    monkeypatch.setattr(seed, "OFF_NORWAY_FILE", Path("/finnes-ikke/off_norway.json"))
    expected = len(json.loads(seed.MATVARETABELLEN_FILE.read_text(encoding="utf-8")))
    settings = get_settings().model_copy(update={"app_env": "local"})

    assert seed.seed_if_empty(settings) is True
    assert _count(factory) == expected
    assert seed.seed_if_empty(settings) is True
    assert _count(factory) == expected  # the second start adds nothing

    with factory() as db:
        havremel = db.scalars(select(FoodItem).where(FoodItem.name == "Havremel")).one()
    assert havremel.source == "matvaretabellen"
    assert havremel.owner_id is None
    assert havremel.external_id == "05.004"
    assert float(havremel.kcal_per_100g) == 369


def test_seed_skips_outside_local(
    factory: sessionmaker[Session], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(app.core.db, "get_session_factory", lambda: factory)
    settings = get_settings().model_copy(update={"app_env": "test"})

    assert seed.seed_if_empty(settings) is False
    assert _count(factory) == 0
