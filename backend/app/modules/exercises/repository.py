"""Database access for exercises. Only the exercises service calls this. Read-only (AD-9)."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSessionType

from app.modules.exercises.models import Exercise


def list_exercises(db: DbSessionType) -> list[Exercise]:
    return list(db.scalars(select(Exercise)))


def get_exercise(db: DbSessionType, exercise_id: uuid.UUID) -> Exercise | None:
    return db.get(Exercise, exercise_id)
