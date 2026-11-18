"""Daily Overview (story 6.1): read-only, composed through the profile, food and workouts
services only, never their repositories (AD-5). Training adds no kcal."""

import datetime as dt
import uuid
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session as DbSessionType

from app.core.errors import AppError
from app.modules.food import service as food_service
from app.modules.food.schemas import FoodDayResponse
from app.modules.overview.schemas import OverviewResponse, WeekDayResponse
from app.modules.profile import service as profile_service
from app.modules.workouts import service as workouts_service
from app.modules.workouts.schemas import WorkoutResponse

# Calendar dates are Europe/Oslo dates (AD-12).
OSLO = ZoneInfo("Europe/Oslo")
FUTURE_DATE_CODE = "date_in_future"
FUTURE_DATE_MESSAGE = "Velg i dag eller en tidligere dato."
NOT_MONDAY_CODE = "week_start_not_monday"
NOT_MONDAY_MESSAGE = "Uka må starte på en mandag."
WEEK_OUT_OF_RANGE_CODE = "week_out_of_range"
WEEK_OUT_OF_RANGE_MESSAGE = "Velg en tidligere uke."
WEEK_DAYS = 7


def _done_only(workout: WorkoutResponse) -> WorkoutResponse | None:
    """The workout with only done sets and the exercises that have any; None if none."""
    exercises = []
    for exercise in workout.exercises:
        done = [set_ for set_ in exercise.sets if set_.done]
        if done:
            exercises.append(exercise.model_copy(update={"sets": done}))
    if not exercises:
        return None
    return workout.model_copy(update={"exercises": exercises})


def compose_day(
    day: dt.date,
    calorie_target: int | None,
    food_day: FoodDayResponse,
    workouts: list[WorkoutResponse],
) -> OverviewResponse:
    """Pure: the target, kcal eaten and remaining, the Meals and the done workouts."""
    eaten = food_day.total_kcal
    shown = [w for w in (_done_only(workout) for workout in workouts) if w is not None]
    return OverviewResponse(
        date=day,
        calorie_target=calorie_target,
        kcal_eaten=eaten,
        kcal_remaining=None if calorie_target is None else calorie_target - eaten,
        meals=food_day.meals,
        workouts=shown,
    )


def get_day(
    db: DbSessionType, user_id: uuid.UUID, day: dt.date, now: dt.datetime
) -> OverviewResponse:
    """The user's Daily Overview for `day`; a date after today in Oslo is 422."""
    if day > now.astimezone(OSLO).date():
        raise AppError(422, FUTURE_DATE_CODE, FUTURE_DATE_MESSAGE)
    profile = profile_service.find_profile(db, user_id)
    return compose_day(
        day,
        None if profile is None else profile.target_kcal,
        food_service.get_day(db, user_id, day),
        workouts_service.day_workouts(db, user_id, day),
    )


def compose_week(
    start: dt.date, today: dt.date, food_dates: set[dt.date], workout_dates: set[dt.date]
) -> list[WeekDayResponse]:
    """Pure: the seven days from `start` with their marks; a day after `today` is future."""
    days = [start + dt.timedelta(days=offset) for offset in range(WEEK_DAYS)]
    return [
        WeekDayResponse(
            date=day,
            has_food=day in food_dates,
            has_workout=day in workout_dates,
            future=day > today,
        )
        for day in days
    ]


def get_week(
    db: DbSessionType, user_id: uuid.UUID, start: dt.date, now: dt.datetime
) -> list[WeekDayResponse]:
    """Monday to Sunday from `start` (story 6.3): whether food and a workout with a done set
    were logged each day. `start` must be a Monday (422)."""
    if start.weekday() != 0:
        raise AppError(422, NOT_MONDAY_CODE, NOT_MONDAY_MESSAGE)
    try:
        end = start + dt.timedelta(days=WEEK_DAYS - 1)
    except OverflowError:
        raise AppError(422, WEEK_OUT_OF_RANGE_CODE, WEEK_OUT_OF_RANGE_MESSAGE) from None
    return compose_week(
        start,
        now.astimezone(OSLO).date(),
        food_service.dates_with_food(db, user_id, start, end),
        workouts_service.dates_with_workouts(db, user_id, start, end),
    )
