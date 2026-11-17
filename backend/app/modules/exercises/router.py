"""Read-only endpoints for exercises under /api/exercises (AD-9: no create/update/delete)."""

from fastapi import APIRouter

from app.core.auth import CurrentUser
from app.core.db import DbSession
from app.core.errors import ErrorResponse
from app.modules.exercises import service
from app.modules.exercises.schemas import ExerciseDetail, ExerciseListItem

router = APIRouter(prefix="/api/exercises", tags=["exercises"])


@router.get("", response_model=list[ExerciseListItem], operation_id="list_exercises")
def list_exercises(current_user: CurrentUser, db: DbSession) -> list[ExerciseListItem]:
    """All exercises, ordered by primary muscle group, then name."""
    return service.list_exercises(db)


@router.get(
    "/{exercise_id}",
    response_model=ExerciseDetail,
    operation_id="get_exercise",
    responses={404: {"model": ErrorResponse, "description": "exercise_not_found"}},
)
def get_exercise(exercise_id: str, current_user: CurrentUser, db: DbSession) -> ExerciseDetail:
    """One exercise with muscle groups, equipment, technique steps and video id. An id that
    is unknown or not a UUID is 404 `exercise_not_found`."""
    return service.get_exercise(db, exercise_id)
