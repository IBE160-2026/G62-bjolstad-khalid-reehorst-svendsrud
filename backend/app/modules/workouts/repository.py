"""Database access for workouts. Only the workouts service calls this. Every read and
write filters by the owner's `user_id` (AD-4)."""

import datetime as dt
import uuid
from collections.abc import Collection

from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSessionType

from app.modules.workouts.models import Set, Workout, WorkoutExercise

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


def list_for_date(db: DbSessionType, user_id: uuid.UUID, day: dt.date) -> list[Workout]:
    """The user's workouts on one date, finished or not, oldest created first (story 6.1)."""
    query = (
        select(Workout)
        .where(Workout.user_id == user_id, Workout.date == day)
        .order_by(Workout.created_at, Workout.id)
    )
    return list(db.scalars(query))


def add_workout(db: DbSessionType, workout: Workout) -> Workout:
    db.add(workout)
    db.flush()
    return workout


def get_history(
    db: DbSessionType,
    user_id: uuid.UUID,
    exercise_ids: Collection[uuid.UUID],
    before_date: dt.date,
) -> list[tuple]:
    """The user's done sets of these exercises in workouts dated before `before_date`,
    finished or not, as rows (workout id, date, created_at, exercise id, position, reps,
    weight_kg, seconds, done) in one query (story 5.3)."""
    if not exercise_ids:
        return []
    query = (
        select(
            Workout.id,
            Workout.date,
            Workout.created_at,
            WorkoutExercise.exercise_id,
            Set.position,
            Set.reps,
            Set.weight_kg,
            Set.seconds,
            Set.done,
        )
        .join(WorkoutExercise, WorkoutExercise.workout_id == Workout.id)
        .join(Set, Set.workout_exercise_id == WorkoutExercise.id)
        .where(
            Workout.user_id == user_id,
            Workout.date < before_date,
            WorkoutExercise.exercise_id.in_(list(exercise_ids)),
            Set.done.is_(True),
        )
    )
    return [tuple(row) for row in db.execute(query)]


def delete_workout(db: DbSessionType, workout: Workout) -> None:
    """Delete the workout; its exercises and sets go with it (CASCADE)."""
    db.delete(workout)
    db.flush()


def list_finished(db: DbSessionType, user_id: uuid.UUID, limit: int) -> list[tuple]:
    """The user's finished workouts, newest date first (then newest created), as rows
    (id, date, finished_at, exercise count, done-set count) in one query (story 5.4)."""
    exercise_count = (
        select(func.count(WorkoutExercise.id))
        .where(WorkoutExercise.workout_id == Workout.id)
        .correlate(Workout)
        .scalar_subquery()
    )
    done_set_count = (
        select(func.count(Set.id))
        .join(WorkoutExercise, WorkoutExercise.id == Set.workout_exercise_id)
        .where(WorkoutExercise.workout_id == Workout.id, Set.done.is_(True))
        .correlate(Workout)
        .scalar_subquery()
    )
    query = (
        select(Workout.id, Workout.date, Workout.finished_at, exercise_count, done_set_count)
        .where(Workout.user_id == user_id, Workout.finished_at.is_not(None))
        .order_by(Workout.date.desc(), Workout.created_at.desc(), Workout.id.desc())
        .limit(limit)
    )
    return [tuple(row) for row in db.execute(query)]
