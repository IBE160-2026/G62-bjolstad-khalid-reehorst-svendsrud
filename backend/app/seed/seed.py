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

# Data fra Open Food Facts, ODbL 1.0 (see data/OFF_LICENSE.md).
# Built by `python -m app.cli import-off-norway` (story 3.7).
OFF_NORWAY_FILE = Path(__file__).resolve().parent / "data" / "off_norway.json"
OFF_SOURCE = "off"


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


def seed_off_items(db: DbSessionType, path: Path | None = None) -> int:
    """Insert the Norwegian OFF products as shared items, skipping barcodes already present
    as shared items (e.g. cached by a barcode lookup). Returns how many were added."""
    from app.modules.food.models import FoodItem

    path = path or OFF_NORWAY_FILE
    if not path.exists():
        return 0
    rows = json.loads(path.read_text(encoding="utf-8"))
    existing = set(
        db.scalars(
            select(FoodItem.barcode).where(
                FoodItem.owner_id.is_(None), FoodItem.barcode.is_not(None)
            )
        )
    )
    added = 0
    for row in rows:
        barcode = row["barcode"]
        if barcode in existing:
            continue
        existing.add(barcode)
        db.add(
            FoodItem(
                source=OFF_SOURCE,
                owner_id=None,
                external_id=barcode,
                barcode=barcode,
                name=row["name"],
                kcal_per_100g=_decimal(row["kcal_per_100g"]),
                protein_g=_decimal(row.get("protein_g")),
                carbs_g=_decimal(row.get("carbs_g")),
                fat_g=_decimal(row.get("fat_g")),
                serving_size_g=_decimal(row.get("serving_size_g")),
            )
        )
        added += 1
    db.flush()
    return added


def seed_if_empty(settings: Settings) -> bool:
    """Seed only when APP_ENV=local. Returns True if seeding ran."""
    if settings.app_env != "local":
        logger.info("Skipping seed: APP_ENV=%s", settings.app_env)
        return False
    from app.core.db import get_session_factory

    with get_session_factory()() as db:
        added = seed_food_items(db)
        off_added = seed_off_items(db)
        db.commit()
    logger.info("Seed: %d Matvaretabellen food items added", added)
    logger.info("Seed: %d Open Food Facts items added", off_added)
    return True
