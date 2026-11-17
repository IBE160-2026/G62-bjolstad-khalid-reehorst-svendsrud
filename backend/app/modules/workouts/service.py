"""Workout rules (stories 5.1-5.4): start or resume the one workout in progress, add exercises
last, remove them and change their order, log the sets of each exercise, show what the
user did last time, and finish, list, edit or delete workouts. A finished workout can still
be edited (sets, remove, reorder), but new exercises only go into the unfinished one. Exercises are looked up through the exercises service, never its
repository."""

import datetime as dt
import uuid
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSessionType

from app.core.errors import VALIDATION_MESSAGE, AppError, FieldError
from app.modules.exercises import service as exercises_service
from app.modules.exercises.schemas import ExerciseType
from app.modules.workouts import repository
from app.modules.workouts.models import Set, Workout, WorkoutExercise
from app.modules.workouts.schemas import (
    DEFAULT_SETS,
    MAX_EXERCISES,
    MAX_SETS,
    LastTimeResponse,
    LastTimeSet,
    SetCreate,
    SetResponse,
    SetUpdate,
    WorkoutExerciseResponse,
    WorkoutResponse,
    WorkoutSummary,
)

WORKOUT_NOT_FOUND_CODE = "workout_not_found"
WORKOUT_NOT_FOUND_MESSAGE = "Fant ikke økta. Gå tilbake til Trening og prøv igjen."
WORKOUT_EXERCISE_NOT_FOUND_CODE = "workout_exercise_not_found"
WORKOUT_EXERCISE_NOT_FOUND_MESSAGE = "Fant ikke øvelsen i økta. Last inn siden på nytt."
ALREADY_IN_WORKOUT_CODE = "exercise_already_in_workout"
ALREADY_IN_WORKOUT_MESSAGE = "Øvelsen er allerede i økta."
EXERCISE_LIMIT_CODE = "workout_exercise_limit"
EXERCISE_LIMIT_MESSAGE = "Du kan ha opptil 20 øvelser i én økt."
ALREADY_FINISHED_CODE = "workout_already_finished"
ALREADY_FINISHED_MESSAGE = "Økta er allerede fullført."
INVALID_ORDER_CODE = "invalid_workout_order"
INVALID_ORDER_MESSAGE = "Rekkefølgen stemmer ikke med økta. Last inn siden på nytt."
SET_NOT_FOUND_CODE = "set_not_found"
SET_NOT_FOUND_MESSAGE = "Fant ikke settet. Last inn siden på nytt."
SET_LIMIT_CODE = "set_limit"
SET_LIMIT_MESSAGE = "Du kan ha opptil 20 sett per øvelse."
VALIDATION_CODE = "validation_error"
REPS_REQUIRED_MESSAGE = "Fyll inn repetisjoner."
SECONDS_REQUIRED_MESSAGE = "Fyll inn sekunder."
NOT_FOR_TIME_MESSAGE = "Fjern verdien: denne øvelsen måles i sekunder."
NOT_FOR_REPS_MESSAGE = "Fjern verdien: denne øvelsen måles i repetisjoner og kg."


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
    """The user's workout, locked for a change; a finished one is 404 like a missing one
    (only adding an exercise needs this since story 5.4)."""
    workout = _get_workout(db, user_id, workout_id, for_update=True)
    if workout.finished_at is not None:
        raise _workout_not_found()
    return workout


@dataclass(frozen=True)
class HistoryRow:
    """One set of an earlier workout, as loaded for "Sist" (story 5.3)."""

    workout_id: uuid.UUID
    date: dt.date
    created_at: datetime
    exercise_id: uuid.UUID
    position: int
    reps: int | None
    weight_kg: Decimal | float | None
    seconds: int | None
    done: bool = True


def last_time(
    history: Iterable[HistoryRow], exercise_id: uuid.UUID, before_date: dt.date
) -> LastTimeResponse | None:
    """The done sets of `exercise_id` from the latest workout dated before `before_date`
    that has any (pure, no I/O). Only done sets with a value count; on the same date the
    later-created workout wins; sets in position order. None when there is none."""
    by_workout: dict[uuid.UUID, list[HistoryRow]] = {}
    for row in history:
        if row.exercise_id != exercise_id or row.date >= before_date or not row.done:
            continue
        if row.reps is None and row.seconds is None:
            continue
        by_workout.setdefault(row.workout_id, []).append(row)
    if not by_workout:
        return None
    # Latest date, then latest created; the workout id only breaks exact ties.
    latest = max(
        by_workout.values(),
        key=lambda rows: (rows[0].date, rows[0].created_at, str(rows[0].workout_id)),
    )
    return LastTimeResponse(
        date=latest[0].date,
        sets=[
            LastTimeSet(
                reps=row.reps,
                weight_kg=float(row.weight_kg) if row.weight_kg is not None else None,
                seconds=row.seconds,
            )
            for row in sorted(latest, key=lambda row: row.position)
        ],
    )


def _set_response(set_: Set) -> SetResponse:
    return SetResponse(
        id=set_.id,
        position=set_.position,
        reps=set_.reps,
        weight_kg=float(set_.weight_kg) if set_.weight_kg is not None else None,
        seconds=set_.seconds,
        done=set_.done,
    )


def _response(db: DbSessionType, workout: Workout) -> WorkoutResponse:
    ids = [we.exercise_id for we in workout.exercises]
    items = exercises_service.get_list_items(db, ids)
    types = exercises_service.get_types(db, ids)
    # One query for the history of every exercise in the workout (story 5.3).
    history = [
        HistoryRow(*row)
        for row in repository.get_history(db, workout.user_id, set(ids), workout.date)
    ]
    exercises = []
    for we in workout.exercises:
        item = items[we.exercise_id]  # RESTRICT keeps every referenced exercise
        exercises.append(
            WorkoutExerciseResponse(
                id=we.id,
                exercise_id=we.exercise_id,
                name=item.name,
                level=item.level,
                type=types[we.exercise_id],
                primary_muscle_group=item.primary_muscle_group,
                equipment=item.equipment,
                sets=[_set_response(set_) for set_ in we.sets],
                last_time=last_time(history, we.exercise_id, workout.date),
            )
        )
    return WorkoutResponse(
        id=workout.id, date=workout.date, finished_at=workout.finished_at, exercises=exercises
    )


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


def day_workouts(db: DbSessionType, user_id: uuid.UUID, day: dt.date) -> list[WorkoutResponse]:
    """The user's workouts on `day`, finished or not, oldest first, with all their sets
    (overview filters to done sets, story 6.1)."""
    return [_response(db, workout) for workout in repository.list_for_date(db, user_id, day)]


def dates_with_workouts(
    db: DbSessionType, user_id: uuid.UUID, start: dt.date, end: dt.date
) -> set[dt.date]:
    """The user's dates from `start` to `end` (inclusive) with a workout that has at least
    one done set (story 6.3, the week strip)."""
    return repository.dates_with_done_sets(db, user_id, start, end)


def finish_workout(
    db: DbSessionType, user_id: uuid.UUID, workout_id: str, now: datetime
) -> WorkoutResponse:
    """Mark the workout finished (FR25). Already finished is 409."""
    workout = _get_workout(db, user_id, workout_id, for_update=True)
    if workout.finished_at is not None:
        raise AppError(409, ALREADY_FINISHED_CODE, ALREADY_FINISHED_MESSAGE)
    workout.finished_at = now
    db.flush()
    return _response(db, workout)


def delete_workout(db: DbSessionType, user_id: uuid.UUID, workout_id: str) -> None:
    """Delete a workout, finished or not, with its exercises and sets for good (FR4: the
    UI asks first instead of offering undo)."""
    workout = _get_workout(db, user_id, workout_id, for_update=True)
    repository.delete_workout(db, workout)


def list_finished(db: DbSessionType, user_id: uuid.UUID, limit: int) -> list[WorkoutSummary]:
    """The user's latest finished workouts for "Tidligere økter"."""
    return [
        WorkoutSummary(
            id=row[0],
            date=row[1],
            finished_at=row[2],
            exercise_count=row[3],
            done_set_count=row[4],
        )
        for row in repository.list_finished(db, user_id, limit)
    ]


def add_exercise(
    db: DbSessionType, user_id: uuid.UUID, workout_id: str, exercise_id: str, now: datetime
) -> WorkoutResponse:
    """Add the exercise last with three empty sets (FR23). 404 for an unknown workout or
    exercise, 409 if it is already in the workout, 422 beyond 20 exercises."""
    workout = _get_unfinished(db, user_id, workout_id)
    exercise = exercises_service.get_exercise(db, exercise_id)  # 404 exercise_not_found
    if any(we.exercise_id == exercise.id for we in workout.exercises):
        raise AppError(409, ALREADY_IN_WORKOUT_CODE, ALREADY_IN_WORKOUT_MESSAGE)
    if len(workout.exercises) >= MAX_EXERCISES:
        raise AppError(422, EXERCISE_LIMIT_CODE, EXERCISE_LIMIT_MESSAGE)
    added = WorkoutExercise(
        exercise_id=exercise.id,
        sets=[Set(position=i, done=False, created_at=now) for i in range(DEFAULT_SETS)],
    )
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
    workout = _get_workout(db, user_id, workout_id, for_update=True)
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
    workout = _get_workout(db, user_id, workout_id, for_update=True)
    by_id = {we.id: we for we in workout.exercises}
    if len(ids) != len(by_id) or set(ids) != set(by_id):
        raise AppError(422, INVALID_ORDER_CODE, INVALID_ORDER_MESSAGE)
    _renumber(workout, [by_id[we_id] for we_id in ids])
    db.flush()
    return _response(db, workout)


# --- Sets (story 5.2) ---------------------------------------------------------------------


def _set_not_found() -> AppError:
    # Same answer for a missing set and a set of another workout or user (FR3).
    return AppError(404, SET_NOT_FOUND_CODE, SET_NOT_FOUND_MESSAGE)


def _find_set(workout: Workout, set_id: str) -> tuple[WorkoutExercise, Set]:
    parsed = _parse_id(set_id)
    if parsed is not None:
        for we in workout.exercises:
            for set_ in we.sets:
                if set_.id == parsed:
                    return we, set_
    raise _set_not_found()


def _renumber_sets(we: WorkoutExercise, ordered: list[Set]) -> None:
    for position, set_ in enumerate(ordered):
        set_.position = position
    we.sets = ordered


def _check_set(
    exercise_type: ExerciseType,
    sent: dict[str, object],
    reps: int | None,
    seconds: int | None,
    done: bool,
) -> None:
    """422 with field errors when a value does not fit the exercise type (only non-null
    values sent now count) or when a done set lacks its main value."""
    fields: list[FieldError] = []
    if exercise_type == ExerciseType.TIME:
        for name in ("reps", "weight_kg"):
            if sent.get(name) is not None:
                fields.append(FieldError(field=name, message=NOT_FOR_TIME_MESSAGE))
    elif sent.get("seconds") is not None:
        fields.append(FieldError(field="seconds", message=NOT_FOR_REPS_MESSAGE))
    if not fields and done:
        if exercise_type == ExerciseType.REPS and reps is None:
            fields.append(FieldError(field="reps", message=REPS_REQUIRED_MESSAGE))
        if exercise_type == ExerciseType.TIME and seconds is None:
            fields.append(FieldError(field="seconds", message=SECONDS_REQUIRED_MESSAGE))
    if fields:
        raise AppError(422, VALIDATION_CODE, VALIDATION_MESSAGE, fields)


def _exercise_type(db: DbSessionType, we: WorkoutExercise) -> ExerciseType:
    return exercises_service.get_types(db, [we.exercise_id])[we.exercise_id]


def _kg(value: float | None) -> Decimal | None:
    return None if value is None else Decimal(str(value))


def add_set(
    db: DbSessionType,
    user_id: uuid.UUID,
    workout_id: str,
    workout_exercise_id: str,
    body: SetCreate,
    now: datetime,
) -> WorkoutResponse:
    """Add a set at `position` (0-based; clamped to the end), or last. At most 20 sets per
    exercise (422). The workout row stays locked (FOR UPDATE) until commit, so parallel
    adds run one at a time and cannot pass the limit or break the positions."""
    workout = _get_workout(db, user_id, workout_id, for_update=True)
    parsed = _parse_id(workout_exercise_id)
    we = next((item for item in workout.exercises if item.id == parsed), None)
    if parsed is None or we is None:
        raise AppError(404, WORKOUT_EXERCISE_NOT_FOUND_CODE, WORKOUT_EXERCISE_NOT_FOUND_MESSAGE)
    if len(we.sets) >= MAX_SETS:
        raise AppError(422, SET_LIMIT_CODE, SET_LIMIT_MESSAGE)
    sent = body.model_dump(include={"reps", "weight_kg", "seconds"})
    _check_set(_exercise_type(db, we), sent, body.reps, body.seconds, body.done)
    added = Set(
        reps=body.reps,
        weight_kg=_kg(body.weight_kg),
        seconds=body.seconds,
        done=body.done,
        created_at=now,
    )
    sets = list(we.sets)
    position = len(sets) if body.position is None else min(body.position, len(sets))
    sets.insert(position, added)
    _renumber_sets(we, sets)
    db.flush()
    return _response(db, workout)


def update_set(
    db: DbSessionType, user_id: uuid.UUID, workout_id: str, set_id: str, body: SetUpdate
) -> WorkoutResponse:
    """Change the fields that were sent; null clears a value."""
    workout = _get_workout(db, user_id, workout_id, for_update=True)
    we, set_ = _find_set(workout, set_id)
    sent = body.model_dump(include=body.model_fields_set & {"reps", "weight_kg", "seconds"})
    reps = body.reps if "reps" in body.model_fields_set else set_.reps
    seconds = body.seconds if "seconds" in body.model_fields_set else set_.seconds
    done = set_.done if body.done is None else body.done
    _check_set(_exercise_type(db, we), sent, reps, seconds, done)
    set_.reps = reps
    set_.seconds = seconds
    if "weight_kg" in body.model_fields_set:
        set_.weight_kg = _kg(body.weight_kg)
    set_.done = done
    db.flush()
    return _response(db, workout)


def delete_set(
    db: DbSessionType, user_id: uuid.UUID, workout_id: str, set_id: str
) -> WorkoutResponse:
    """Delete a set for good; the others are renumbered and keep their order."""
    workout = _get_workout(db, user_id, workout_id, for_update=True)
    we, set_ = _find_set(workout, set_id)
    _renumber_sets(we, [item for item in we.sets if item is not set_])
    db.flush()
    return _response(db, workout)
