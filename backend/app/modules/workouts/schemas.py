"""Request and response bodies for /api/workouts (story 5.1)."""

import datetime as dt
import uuid

from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field
from pydantic_core import PydanticCustomError

from app.core.clock import utc_now
from app.core.errors import FIELD_MESSAGE_ERROR
from app.modules.exercises.schemas import Level

MAX_EXERCISES = 20
# A workout date must be within this many days of the server's today (either way).
DATE_RANGE_DAYS = 366
DATE_RANGE_MESSAGE = "Velg en dato innen ett år fra i dag."


def _workout_date(value: dt.date) -> dt.date:
    today = utc_now().date()
    if abs((value - today).days) > DATE_RANGE_DAYS:
        raise PydanticCustomError(FIELD_MESSAGE_ERROR, DATE_RANGE_MESSAGE)
    return value


WorkoutDate = Annotated[dt.date, AfterValidator(_workout_date)]


class WorkoutCreate(BaseModel):
    """Start a workout on this calendar date (YYYY-MM-DD, Europe/Oslo, AD-12)."""

    date: WorkoutDate


class WorkoutExerciseAdd(BaseModel):
    """The exercise to add last. An id that is unknown or not a UUID is 404."""

    exercise_id: str = Field(max_length=64)


class WorkoutExerciseOrder(BaseModel):
    """Every workout exercise id of the workout, exactly once, in the new order."""

    ids: list[uuid.UUID] = Field(max_length=MAX_EXERCISES)


class WorkoutExerciseResponse(BaseModel):
    # The workout exercise's own id (used to remove and reorder).
    id: uuid.UUID
    exercise_id: uuid.UUID
    name: str
    level: Level
    primary_muscle_group: str
    equipment: list[str]


class WorkoutResponse(BaseModel):
    id: uuid.UUID
    date: dt.date
    # In the user's order.
    exercises: list[WorkoutExerciseResponse]


class ActiveWorkoutResponse(BaseModel):
    """The workout in progress, or null when there is none."""

    workout: WorkoutResponse | None
