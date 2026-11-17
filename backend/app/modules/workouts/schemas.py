"""Request and response bodies for /api/workouts (stories 5.1, 5.2, 5.3)."""

import datetime as dt
import uuid

from typing import Annotated

from pydantic import AfterValidator, BaseModel, BeforeValidator, Field
from pydantic_core import PydanticCustomError

from app.core.clock import utc_now
from app.core.errors import FIELD_MESSAGE_ERROR
from app.modules.exercises.schemas import ExerciseType, Level

MAX_EXERCISES = 20
# Each exercise starts with this many empty sets (FR23) and can have at most MAX_SETS.
DEFAULT_SETS = 3
MAX_SETS = 20
REPS_MIN, REPS_MAX = 1, 100
KG_MIN, KG_MAX = 0, 500
SECONDS_MIN, SECONDS_MAX = 1, 3600
REPS_MESSAGE = "Skriv repetisjoner som et helt tall fra 1 til 100."
KG_MESSAGE = "Skriv kg som et tall fra 0 til 500, med høyst to desimaler."
SECONDS_MESSAGE = "Skriv sekunder som et helt tall fra 1 til 3600."
DONE_MESSAGE = "Send ferdig som true eller false."
POSITION_MESSAGE = "Velg en plass fra 0 til 19."
# A workout date must be within this many days of the server's today (either way).
DATE_RANGE_DAYS = 366
DATE_RANGE_MESSAGE = "Velg en dato innen ett år fra i dag."


def _workout_date(value: dt.date) -> dt.date:
    today = utc_now().date()
    if abs((value - today).days) > DATE_RANGE_DAYS:
        raise PydanticCustomError(FIELD_MESSAGE_ERROR, DATE_RANGE_MESSAGE)
    return value


WorkoutDate = Annotated[dt.date, AfterValidator(_workout_date)]


def _whole(low: int, high: int, message: str):
    """A whole number low–high. Runs before pydantic's own int parsing, so 2.5, "12" and
    true get the Norwegian message instead of a generic one."""

    def check(value: object) -> int:
        if isinstance(value, bool) or not isinstance(value, int | float):
            raise PydanticCustomError(FIELD_MESSAGE_ERROR, message)
        if isinstance(value, float) and not value.is_integer():
            raise PydanticCustomError(FIELD_MESSAGE_ERROR, message)
        if not low <= value <= high:
            raise PydanticCustomError(FIELD_MESSAGE_ERROR, message)
        return int(value)

    return check


def _kg(value: object) -> float:
    """0–500 kg with at most two decimals."""
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise PydanticCustomError(FIELD_MESSAGE_ERROR, KG_MESSAGE)
    if not KG_MIN <= value <= KG_MAX:
        raise PydanticCustomError(FIELD_MESSAGE_ERROR, KG_MESSAGE)
    if abs(value * 100 - round(value * 100)) > 1e-6:
        raise PydanticCustomError(FIELD_MESSAGE_ERROR, KG_MESSAGE)
    return round(float(value), 2)


def _strict_bool(value: object) -> bool:
    """Only true or false; no "yes", 1 or "true" (StrictBool with a Norwegian message)."""
    if not isinstance(value, bool):
        raise PydanticCustomError(FIELD_MESSAGE_ERROR, DONE_MESSAGE)
    return value


Done = Annotated[bool, BeforeValidator(_strict_bool)]
Position = Annotated[int, BeforeValidator(_whole(0, MAX_SETS - 1, POSITION_MESSAGE))]
Reps = Annotated[int, BeforeValidator(_whole(REPS_MIN, REPS_MAX, REPS_MESSAGE))]
WeightKg = Annotated[float, BeforeValidator(_kg)]
Seconds = Annotated[int, BeforeValidator(_whole(SECONDS_MIN, SECONDS_MAX, SECONDS_MESSAGE))]


class WorkoutCreate(BaseModel):
    """Start a workout on this calendar date (YYYY-MM-DD, Europe/Oslo, AD-12)."""

    date: WorkoutDate


class WorkoutExerciseAdd(BaseModel):
    """The exercise to add last. An id that is unknown or not a UUID is 404."""

    exercise_id: str = Field(max_length=64)


class WorkoutExerciseOrder(BaseModel):
    """Every workout exercise id of the workout, exactly once, in the new order."""

    ids: list[uuid.UUID] = Field(max_length=MAX_EXERCISES)


class SetCreate(BaseModel):
    """A new set (story 5.2). Values are optional (an empty set is fine); `position` is
    0-based and puts the set there (used by "Angre"); without it the set is added last."""

    reps: Reps | None = None
    weight_kg: WeightKg | None = None
    seconds: Seconds | None = None
    done: Done = False
    position: Position | None = None


class SetUpdate(BaseModel):
    """Change a set. A left-out field is unchanged; null clears `reps`, `weight_kg` or
    `seconds` (null `done` is unchanged)."""

    reps: Reps | None = None
    weight_kg: WeightKg | None = None
    seconds: Seconds | None = None
    done: Done | None = None


class SetResponse(BaseModel):
    id: uuid.UUID
    # 0-based, gapless.
    position: int
    reps: int | None
    # Null means bodyweight.
    weight_kg: float | None
    seconds: int | None
    done: bool


class LastTimeSet(BaseModel):
    """One done set from last time (story 5.3)."""

    reps: int | None
    # Null means bodyweight.
    weight_kg: float | None
    seconds: int | None


class LastTimeResponse(BaseModel):
    """The done sets of this exercise in the user's latest earlier workout (story 5.3)."""

    # The date of that earlier workout.
    date: dt.date
    # In order.
    sets: list[LastTimeSet]


class WorkoutExerciseResponse(BaseModel):
    # The workout exercise's own id (used to remove and reorder).
    id: uuid.UUID
    exercise_id: uuid.UUID
    name: str
    level: Level
    # reps: sets use reps and kg; time: sets use seconds.
    type: ExerciseType
    primary_muscle_group: str
    equipment: list[str]
    # In order.
    sets: list[SetResponse]
    # What the user did last time (latest workout dated before this one), or null the
    # first time ("Første gang").
    last_time: LastTimeResponse | None


class WorkoutResponse(BaseModel):
    id: uuid.UUID
    date: dt.date
    # In the user's order.
    exercises: list[WorkoutExerciseResponse]


class ActiveWorkoutResponse(BaseModel):
    """The workout in progress, or null when there is none."""

    workout: WorkoutResponse | None
