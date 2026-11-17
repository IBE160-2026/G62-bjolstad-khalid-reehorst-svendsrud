"""compose_day (story 6.1): pure sums and the done-set filter, no database."""

import datetime as dt
import uuid

from app.modules.food.schemas import FoodDayResponse, Meal, MealSummary
from app.modules.overview.service import compose_day, compose_week
from app.modules.workouts.schemas import SetResponse, WorkoutExerciseResponse, WorkoutResponse

DAY = dt.date(2026, 11, 16)


def _food_day(total: float) -> FoodDayResponse:
    meals = [MealSummary(meal=meal, entries=[], total_kcal=0) for meal in Meal]
    return FoodDayResponse(date=DAY, meals=meals, total_kcal=total)


def _set(position: int, done: bool) -> SetResponse:
    return SetResponse(
        id=uuid.uuid4(), position=position, reps=10, weight_kg=None, seconds=None, done=done
    )


def _exercise(name: str, *done: bool) -> WorkoutExerciseResponse:
    return WorkoutExerciseResponse(
        id=uuid.uuid4(),
        exercise_id=uuid.uuid4(),
        name=name,
        level="beginner",
        type="reps",
        primary_muscle_group="Bryst",
        equipment=[],
        sets=[_set(i, flag) for i, flag in enumerate(done)],
        last_time=None,
    )


def _workout(*exercises: WorkoutExerciseResponse) -> WorkoutResponse:
    return WorkoutResponse(id=uuid.uuid4(), date=DAY, finished_at=None, exercises=list(exercises))


def test_remaining_is_target_minus_eaten() -> None:
    overview = compose_day(DAY, 1640, _food_day(1420), [])

    assert overview.calorie_target == 1640
    assert overview.kcal_eaten == 1420
    assert overview.kcal_remaining == 220
    assert [m.meal for m in overview.meals] == list(Meal)


def test_over_target_is_negative() -> None:
    assert compose_day(DAY, 1640, _food_day(1760), []).kcal_remaining == -120


def test_nothing_eaten_leaves_the_full_target() -> None:
    overview = compose_day(DAY, 1640, _food_day(0), [])

    assert overview.kcal_eaten == 0
    assert overview.kcal_remaining == 1640


def test_without_target_remaining_is_null() -> None:
    overview = compose_day(DAY, None, _food_day(300), [])

    assert overview.calorie_target is None
    assert overview.kcal_remaining is None
    assert overview.kcal_eaten == 300


def test_only_done_sets_and_workouts_with_any() -> None:
    kept = _workout(_exercise("Armhevinger", True, False, True), _exercise("Planke", False))
    empty = _workout(_exercise("Knebøy", False, False))

    overview = compose_day(DAY, 1640, _food_day(0), [kept, empty, _workout()])

    assert [w.id for w in overview.workouts] == [kept.id]
    exercises = overview.workouts[0].exercises
    assert [e.name for e in exercises] == ["Armhevinger"]
    assert [s.position for s in exercises[0].sets] == [0, 2]
    assert all(s.done for s in exercises[0].sets)
    # The input is not changed.
    assert len(kept.exercises) == 2


def test_compose_week_marks_and_future() -> None:
    days = compose_week(
        DAY,
        dt.date(2026, 11, 18),
        {dt.date(2026, 11, 16)},
        {dt.date(2026, 11, 16), dt.date(2026, 11, 18)},
    )

    assert [d.date for d in days] == [DAY + dt.timedelta(days=i) for i in range(7)]
    assert [(d.has_food, d.has_workout) for d in days[:3]] == [
        (True, True),
        (False, False),
        (False, True),
    ]
    assert [d.future for d in days] == [False, False, False, True, True, True, True]
