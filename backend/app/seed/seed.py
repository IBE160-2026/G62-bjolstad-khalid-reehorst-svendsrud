"""Seed reference data on startup (AD-8): only with APP_ENV=local, only into an empty table."""

import json
import logging
from decimal import Decimal
from pathlib import Path

from sqlalchemy import exists, select
from sqlalchemy.orm import Session as DbSessionType

from app.core.settings import Settings

logger = logging.getLogger(__name__)

# Matvaretabellen 2026, Mattilsynet (www.matvaretabellen.no), CC BY 4.0.
# Built by backend/scripts/build_matvaretabellen_seed.py.
MATVARETABELLEN_FILE = Path(__file__).resolve().parent / "data" / "matvaretabellen.json"
MATVARETABELLEN_SOURCE = "matvaretabellen"


def _decimal(value: float | None) -> Decimal | None:
    return None if value is None else Decimal(str(value))


def seed_food_items(db: DbSessionType) -> int:
    """Insert the Matvaretabellen subset as shared items when none exist. Returns the count."""
    from app.modules.food.models import FoodItem

    already = db.scalar(select(exists().where(FoodItem.source == MATVARETABELLEN_SOURCE)))
    if already:
        return 0
    rows = json.loads(MATVARETABELLEN_FILE.read_text(encoding="utf-8"))
    for row in rows:
        db.add(
            FoodItem(
                source=MATVARETABELLEN_SOURCE,
                owner_id=None,
                external_id=row["food_id"],
                name=row["name"],
                kcal_per_100g=_decimal(row["kcal_per_100g"]),
                protein_g=_decimal(row.get("protein_g")),
                carbs_g=_decimal(row.get("carbs_g")),
                fat_g=_decimal(row.get("fat_g")),
            )
        )
    db.flush()
    return len(rows)


def seed_if_empty(settings: Settings) -> bool:
    """Seed only when APP_ENV=local. Returns True if seeding ran."""
    if settings.app_env != "local":
        logger.info("Skipping seed: APP_ENV=%s", settings.app_env)
        return False
    from app.core.db import get_session_factory

    with get_session_factory()() as db:
        added = seed_food_items(db)
        db.commit()
    logger.info("Seed: %d Matvaretabellen food items added", added)
    return True
