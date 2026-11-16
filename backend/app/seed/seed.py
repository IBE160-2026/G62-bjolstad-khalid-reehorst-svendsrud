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

# Equipment, muscle groups and exercises (story 4.1, AD-9). Read-only reference data:
# the API never creates, changes or deletes it. Fields beyond ovelsesliste.md are a draft.
EXERCISES_FILE = Path(__file__).resolve().parent / "data" / "exercises.json"


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


def seed_exercises(db: DbSessionType, path: Path = EXERCISES_FILE) -> int:
    """Insert every equipment type, muscle group and exercise whose slug is missing, so
    exercises added to the file later (#35–39) also reach an existing database. Existing
    rows are never changed. Returns the number of exercises added."""
    from app.modules.exercises.models import (
        Equipment,
        Exercise,
        ExerciseEquipment,
        ExerciseMuscleGroup,
        MuscleGroup,
    )

    data = json.loads(path.read_text(encoding="utf-8"))
    equipment = {
        row["slug"]: _get_or_add(db, Equipment, row["slug"], row["name"], position)
        for position, row in enumerate(data["equipment"])
    }
    muscles = {
        row["slug"]: _get_or_add(db, MuscleGroup, row["slug"], row["name"], position)
        for position, row in enumerate(data["muscle_groups"])
    }
    db.flush()
    existing = set(db.scalars(select(Exercise.slug)))
    missing = [row for row in data["exercises"] if row["slug"] not in existing]
    for row in missing:
        exercise = Exercise(
            slug=row["slug"],
            name=row["name"],
            level=row["level"],
            type=row["type"],
            steps=row["steps"],
            video_id=row["video_id"],
        )
        exercise.equipment_links = [
            ExerciseEquipment(equipment_id=equipment[slug].id) for slug in row["equipment"]
        ]
        exercise.muscle_links = [
            ExerciseMuscleGroup(muscle_group_id=muscles[row["primary"]].id, role="primary")
        ] + [
            ExerciseMuscleGroup(muscle_group_id=muscles[slug].id, role="secondary")
            for slug in row["secondary"]
        ]
        db.add(exercise)
    db.flush()
    return len(missing)


def _get_or_add(db: DbSessionType, model: type, slug: str, name: str, position: int):
    """Reuse an existing equipment/muscle group row by slug, so a rerun never duplicates it."""
    row = db.scalars(select(model).where(model.slug == slug)).one_or_none()
    if row is None:
        row = model(slug=slug, name=name, position=position)
        db.add(row)
    return row


def seed_if_empty(settings: Settings) -> bool:
    """Seed only when APP_ENV=local. Returns True if seeding ran."""
    if settings.app_env != "local":
        logger.info("Skipping seed: APP_ENV=%s", settings.app_env)
        return False
    from app.core.db import get_session_factory

    with get_session_factory()() as db:
        added = seed_food_items(db)
        exercises = seed_exercises(db)
        db.commit()
    logger.info("Seed: %d Matvaretabellen food items added", added)
    logger.info("Seed: %d exercises added", exercises)
    return True
