"""Response body for /api/overview (story 6.1)."""

import datetime as dt

from pydantic import BaseModel

from app.modules.food.schemas import MealSummary
from app.modules.workouts.schemas import WorkoutResponse


class OverviewResponse(BaseModel):
    date: dt.date
    # The stored daily target in whole kcal (the current one for every date, AD-17), or
    # null before the profile is set up.
    calorie_target: int | None
    # Sum of the date's entries, unrounded; round only for display.
    kcal_eaten: float
    # calorie_target − kcal_eaten (negative when over); null without a target.
    kcal_remaining: float | None
    # Always the four Meals, in order, with entries and totals.
    meals: list[MealSummary]
    # The date's workouts (finished or not) with at least one done set, oldest first; each
    # has only its exercises with done sets, and only the done sets.
    workouts: list[WorkoutResponse]


class WeekDayResponse(BaseModel):
    """One day in the week strip (story 6.3)."""

    date: dt.date
    # At least one live food entry on the date.
    has_food: bool
    # At least one workout on the date with a done set.
    has_workout: bool
    # After today in Europe/Oslo; the strip disables it.
    future: bool
