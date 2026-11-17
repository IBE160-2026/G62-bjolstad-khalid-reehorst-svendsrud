"""Workout rules (story 5.1): start or resume the one workout in progress, add exercises
last, remove them and change their order. Exercises are looked up through the exercises
service, never its repository."""

import datetime as dt
import uuid
from datetime import datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSessionType

from app.core.errors import AppError
from app.modules.exercises import service as exercises_service
from app.modules.workouts import repository
from app.modules.workouts.models import Workout, WorkoutExercise
from app.modules.workouts.schemas import (
    MAX_EXERCISES,
    WorkoutExerciseResponse,
    WorkoutResponse,
)

WORKOUT_NOT_FOUND_CODE = "workout_not_found"
WORKOUT_NOT_FOUND_MESSAGE = "Fant ikke økta. Gå tilbake til Trening og prøv igjen."
WORKOUT_EXERCISE_NOT_FOUND_CODE = "workout_exercise_not_found"
WORKOUT_EXERCISE_NOT_FOUND_MESSAGE = "Fant ikke øvelsen i økta. Last inn siden på nytt."
ALREADY_IN_WORKOUT_CODE = "exercise_already_in_workout"
ALREADY_IN_WORKOUT_MESSAGE = "Øvelsen er allerede i økta."
EXERCISE_LIMIT_CODE = "workout_exercise_limit"
EXERCISE_LIMIT_MESSAGE = "Du kan ha opptil 20 øvelser i én økt."
INVALID_ORDER_CODE = "invalid_workout_order"
INVALID_ORDER_MESSAGE = "Rekkefølgen stemmer ikke med økta. Last inn siden på nytt."


def _parse_id(value: str) -> uuid.UUID | None:
    try:
        return uuid.UUID(value)
    except ValueError:
        return None


def _workout_not_found() -> AppError:
    # Same answer for a missing workout and another user's workout (FR3).
    return AppError(404, WORKOUT_NOT_FOUND_CODE, WORKOUT_NOT_FOUND_MESSAGE)


def _get_workout(
    db: DbSessionType, user_id: uuid.UUID, workout_id: str, *, for_update: bool = False
) -> Workout:
    parsed = _parse_id(workout_id)
    workout = (
        repository.get_workout(db, user_id, parsed, for_update=for_update) if parsed else None
    )
    if workout is None:
        raise _workout_not_found()
    return workout


def _get_unfinished(db: DbSessionType, user_id: uuid.UUID, workout_id: str) -> Workout:
    """The user's workout, locked for a change; a finished one is 404 like a missing one."""
    workout = _get_workout(db, user_id, workout_id, for_update=True)
    if workout.finished_at is not None:
        raise _workout_not_found()
    return workout


def _response(db: DbSessionType, workout: Workout) -> WorkoutResponse:
    items = exercises_service.get_list_items(db, (we.exercise_id for we in workout.exercises))
    exercises = []
    for we in workout.exercises:
        item = items[we.exercise_id]  # RESTRICT keeps every referenced exercise
        exercises.append(
            WorkoutExerciseResponse(
                id=we.id,
                exercise_id=we.exercise_id,
                name=item.name,
                level=item.level,
                primary_muscle_group=item.primary_muscle_group,
                equipment=item.equipment,
            )
        )
    return WorkoutResponse(id=workout.id, date=workout.date, exercises=exercises)


def _renumber(workout: Workout, ordered: list[WorkoutExercise]) -> None:
    for position, we in enumerate(ordered):
        we.position = position
    workout.exercises = ordered


def get_active(db: DbSessionType, user_id: uuid.UUID) -> WorkoutResponse | None:
    workout = repository.get_active(db, user_id)
    return _response(db, workout) if workout else None


def start_workout(
    db: DbSessionType, user_id: uuid.UUID, date: dt.date, now: datetime
) -> tuple[WorkoutResponse, bool]:
    """Create an empty workout for `date`, or return the one in progress unchanged (its
    date is kept). The flag says whether a new workout was created."""
    repository.lock_user_workouts(db, user_id)
    existing = repository.get_active(db, user_id)
    if existing is not None:
        return _response(db, existing), False
    workout = repository.add_workout(
        db, Workout(user_id=user_id, date=date, created_at=now, exercises=[])
    )
    return _response(db, workout), True


def get_workout(db: DbSessionType, user_id: uuid.UUID, workout_id: str) -> WorkoutResponse:
    return _response(db, _get_workout(db, user_id, workout_id))


def add_exercise(
    db: DbSessionType, user_id: uuid.UUID, workout_id: str, exercise_id: str
) -> WorkoutResponse:
    """Add the exercise last. 404 for an unknown workout or exercise, 409 if it is already
    in the workout, 422 beyond 20 exercises."""
    workout = _get_unfinished(db, user_id, workout_id)
    exercise = exercises_service.get_exercise(db, exercise_id)  # 404 exercise_not_found
    if any(we.exercise_id == exercise.id for we in workout.exercises):
        raise AppError(409, ALREADY_IN_WORKOUT_CODE, ALREADY_IN_WORKOUT_MESSAGE)
    if len(workout.exercises) >= MAX_EXERCISES:
        raise AppError(422, EXERCISE_LIMIT_CODE, EXERCISE_LIMIT_MESSAGE)
    added = WorkoutExercise(exercise_id=exercise.id)
    _renumber(workout, [*workout.exercises, added])
    try:
        db.flush()
    except IntegrityError as exc:
        # A concurrent add of the same exercise won the unique constraint.
        if "uq_workout_exercises_exercise" in str(exc.orig):
            raise AppError(409, ALREADY_IN_WORKOUT_CODE, ALREADY_IN_WORKOUT_MESSAGE) from None
        raise
    return _response(db, workout)


def remove_exercise(
    db: DbSessionType, user_id: uuid.UUID, workout_id: str, workout_exercise_id: str
) -> WorkoutResponse:
    """Remove one exercise; the others keep their order."""
    workout = _get_unfinished(db, user_id, workout_id)
    parsed = _parse_id(workout_exercise_id)
    remaining = [we for we in workout.exercises if we.id != parsed]
    if parsed is None or len(remaining) == len(workout.exercises):
        raise AppError(404, WORKOUT_EXERCISE_NOT_FOUND_CODE, WORKOUT_EXERCISE_NOT_FOUND_MESSAGE)
    _renumber(workout, remaining)
    db.flush()
    return _response(db, workout)


def reorder_exercises(
    db: DbSessionType, user_id: uuid.UUID, workout_id: str, ids: list[uuid.UUID]
) -> WorkoutResponse:
    """Save a new order. `ids` must be exactly the workout's own workout exercise ids,
    each once; anything missing, extra, repeated or foreign is 422."""
    workout = _get_unfinished(db, user_id, workout_id)
    by_id = {we.id: we for we in workout.exercises}
    if len(ids) != len(by_id) or set(ids) != set(by_id):
        raise AppError(422, INVALID_ORDER_CODE, INVALID_ORDER_MESSAGE)
    _renumber(workout, [by_id[we_id] for we_id in ids])
    db.flush()
    return _response(db, workout)
