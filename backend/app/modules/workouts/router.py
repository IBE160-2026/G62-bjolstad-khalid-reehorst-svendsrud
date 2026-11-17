"""Endpoints under /api/workouts (stories 5.1, 5.2). All require consent; every write returns the
whole workout. Another user's or a missing workout is 404 `workout_not_found` (FR3)."""

from fastapi import APIRouter, Response, status

from app.core.clock import Now
from app.core.db import DbSession
from app.core.errors import ErrorResponse
from app.modules.identity.consent import ConsentedUser
from app.modules.workouts import service
from app.modules.workouts.schemas import (
    ActiveWorkoutResponse,
    SetCreate,
    SetUpdate,
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
    workout_id: str,
    body: WorkoutExerciseAdd,
    current_user: ConsentedUser,
    db: DbSession,
    now: Now,
) -> WorkoutResponse:
    """Add an exercise last with three empty sets. Each exercise once (409), at most 20
    (422)."""
    return service.add_exercise(db, current_user.id, workout_id, body.exercise_id, now)


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


@router.post(
    "/{workout_id}/exercises/{workout_exercise_id}/sets",
    response_model=WorkoutResponse,
    operation_id="add_set",
    responses={
        404: {"model": ErrorResponse, "description": "workout_not_found, workout_exercise_not_found"},
        422: {"model": ErrorResponse, "description": "set_limit, validation_error"},
    },
)
def add_set(
    workout_id: str,
    workout_exercise_id: str,
    current_user: ConsentedUser,
    db: DbSession,
    now: Now,
    body: SetCreate | None = None,
) -> WorkoutResponse:
    """Add a set to an exercise, last or at `position`. At most 20 sets per exercise."""
    return service.add_set(
        db, current_user.id, workout_id, workout_exercise_id, body or SetCreate(), now
    )


@router.patch(
    "/{workout_id}/sets/{set_id}",
    response_model=WorkoutResponse,
    operation_id="update_set",
    responses={
        404: {"model": ErrorResponse, "description": "workout_not_found, set_not_found"},
        422: {"model": ErrorResponse, "description": "validation_error"},
    },
)
def update_set(
    workout_id: str, set_id: str, body: SetUpdate, current_user: ConsentedUser, db: DbSession
) -> WorkoutResponse:
    """Change reps, kg, seconds or done; null clears a value."""
    return service.update_set(db, current_user.id, workout_id, set_id, body)


@router.delete(
    "/{workout_id}/sets/{set_id}",
    response_model=WorkoutResponse,
    operation_id="delete_set",
    responses={404: {"model": ErrorResponse, "description": "workout_not_found, set_not_found"}},
)
def delete_set(
    workout_id: str, set_id: str, current_user: ConsentedUser, db: DbSession
) -> WorkoutResponse:
    """Delete a set; the others keep their order."""
    return service.delete_set(db, current_user.id, workout_id, set_id)
