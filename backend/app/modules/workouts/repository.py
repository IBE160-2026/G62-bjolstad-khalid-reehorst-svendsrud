"""Database access for workouts. Only the workouts service calls this. Every read and
write filters by the owner's `user_id` (AD-4)."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSessionType

from app.modules.workouts.models import Workout

# Namespace for the two-argument pg_advisory_xact_lock (exercises uses 4202).
WORKOUT_LOCK_NAMESPACE = 5101


def lock_user_workouts(db: DbSessionType, user_id: uuid.UUID) -> None:
    """Serialise starting workouts for one user until the transaction ends, so two
    requests cannot both create an unfinished workout."""
    key = (user_id.int & 0xFFFFFFFF) - (1 << 31)  # signed 32-bit key within the namespace
    db.execute(select(func.pg_advisory_xact_lock(WORKOUT_LOCK_NAMESPACE, key)))


def get_active(db: DbSessionType, user_id: uuid.UUID) -> Workout | None:
    """The user's unfinished workout, if any."""
    query = select(Workout).where(Workout.user_id == user_id, Workout.finished_at.is_(None))
    return db.scalars(query).one_or_none()


def get_workout(
    db: DbSessionType, user_id: uuid.UUID, workout_id: uuid.UUID, *, for_update: bool = False
) -> Workout | None:
    """The user's workout, or None if it is missing or belongs to someone else. With
    `for_update`, the row is locked so concurrent changes to it run one at a time."""
    query = select(Workout).where(Workout.id == workout_id, Workout.user_id == user_id)
    if for_update:
        query = query.with_for_update()
    return db.scalars(query).one_or_none()


def add_workout(db: DbSessionType, workout: Workout) -> Workout:
    db.add(workout)
    db.flush()
    return workout
