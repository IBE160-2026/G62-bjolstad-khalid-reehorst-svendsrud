"""Endpoints under /api/workouts (story 5.1). All require consent; every write returns the
whole workout. Another user's or a missing workout is 404 `workout_not_found` (FR3)."""

from fastapi import APIRouter, Response, status

from app.core.clock import Now
from app.core.db import DbSession
from app.core.errors import ErrorResponse
from app.modules.identity.consent import ConsentedUser
from app.modules.workouts import service
from app.modules.workouts.schemas import (
    ActiveWorkoutResponse,
    WorkoutCreate,
    WorkoutExerciseAdd,
    WorkoutExerciseOrder,
    WorkoutResponse,
)

router = APIRouter(prefix="/api/workouts", tags=["workouts"])

WORKOUT_NOT_FOUND = {404: {"model": ErrorResponse, "description": "workout_not_found"}}


@router.get("/active", response_model=ActiveWorkoutResponse, operation_id="get_active_workout")
def get_active_workout(current_user: ConsentedUser, db: DbSession) -> ActiveWorkoutResponse:
    """The user's workout in progress, or `{"workout": null}`."""
    return ActiveWorkoutResponse(workout=service.get_active(db, current_user.id))


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=WorkoutResponse,
    operation_id="start_workout",
    responses={200: {"model": WorkoutResponse, "description": "The workout in progress"}},
)
def start_workout(
    body: WorkoutCreate, response: Response, current_user: ConsentedUser, db: DbSession, now: Now
) -> WorkoutResponse:
    """Start an empty workout for `date` (201), or return the one already in progress
    unchanged, date included (200)."""
    workout, created = service.start_workout(db, current_user.id, body.date, now)
    if not created:
        response.status_code = status.HTTP_200_OK
    return workout


@router.get(
    "/{workout_id}",
    response_model=WorkoutResponse,
    operation_id="get_workout",
    responses=WORKOUT_NOT_FOUND,
)
def get_workout(workout_id: str, current_user: ConsentedUser, db: DbSession) -> WorkoutResponse:
    """One of the user's workouts with its exercises in order."""
    return service.get_workout(db, current_user.id, workout_id)


@router.post(
    "/{workout_id}/exercises",
    response_model=WorkoutResponse,
    operation_id="add_workout_exercise",
    responses={
        404: {"model": ErrorResponse, "description": "workout_not_found, exercise_not_found"},
        409: {"model": ErrorResponse, "description": "exercise_already_in_workout"},
    },
)
def add_workout_exercise(
    workout_id: str, body: WorkoutExerciseAdd, current_user: ConsentedUser, db: DbSession
) -> WorkoutResponse:
    """Add an exercise last. Each exercise once (409), at most 20 (422)."""
    return service.add_exercise(db, current_user.id, workout_id, body.exercise_id)


@router.put(
    "/{workout_id}/exercises/order",
    response_model=WorkoutResponse,
    operation_id="reorder_workout_exercises",
    responses=WORKOUT_NOT_FOUND,
)
def reorder_workout_exercises(
    workout_id: str, body: WorkoutExerciseOrder, current_user: ConsentedUser, db: DbSession
) -> WorkoutResponse:
    """Save a new order; `ids` must be exactly the workout's workout exercise ids (422)."""
    return service.reorder_exercises(db, current_user.id, workout_id, body.ids)


@router.delete(
    "/{workout_id}/exercises/{workout_exercise_id}",
    response_model=WorkoutResponse,
    operation_id="remove_workout_exercise",
    responses={
        404: {"model": ErrorResponse, "description": "workout_not_found, workout_exercise_not_found"}
    },
)
def remove_workout_exercise(
    workout_id: str, workout_exercise_id: str, current_user: ConsentedUser, db: DbSession
) -> WorkoutResponse:
    """Remove one exercise from the workout; the others keep their order."""
    return service.remove_exercise(db, current_user.id, workout_id, workout_exercise_id)
