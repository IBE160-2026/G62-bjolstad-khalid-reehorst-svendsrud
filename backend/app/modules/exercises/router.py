"""Endpoints under /api/exercises. Exercises and equipment are read-only (AD-9); the
user's own Equipment Profiles can be created, changed and deleted (story 4.2)."""

import uuid

from fastapi import APIRouter, Response, status

from app.core.auth import CurrentUser
from app.core.clock import Now
from app.core.db import DbSession
from app.core.errors import ErrorResponse
from app.modules.exercises import service
from app.modules.exercises.schemas import (
    EquipmentProfileCreate,
    EquipmentProfileResponse,
    EquipmentProfileUpdate,
    EquipmentResponse,
    ExerciseDetail,
    ExerciseListItem,
    ExerciseSearchResponse,
    SuggestionsResponse,
)

router = APIRouter(prefix="/api/exercises", tags=["exercises"])

PROFILE_NOT_FOUND = {404: {"model": ErrorResponse, "description": "equipment_profile_not_found"}}


# Registered before "/{exercise_id}" so these paths are not read as an exercise id.
@router.get("/equipment", response_model=list[EquipmentResponse], operation_id="list_equipment")
def list_equipment(current_user: CurrentUser, db: DbSession) -> list[EquipmentResponse]:
    """The nine equipment types in seed order."""
    return service.list_equipment(db)


@router.get(
    "/suggestions",
    response_model=SuggestionsResponse,
    operation_id="get_suggestions",
    responses=PROFILE_NOT_FOUND,
)
def get_suggestions(
    profile_id: str, current_user: CurrentUser, db: DbSession
) -> SuggestionsResponse:
    """Exercises whose required equipment is all in the user's chosen Equipment Profile,
    ordered Nybegynner, Middels, Øvet. Another user's profile, or an id that is unknown or
    not a UUID, is 404 `equipment_profile_not_found`."""
    return service.get_suggestions(db, current_user.id, profile_id)


@router.get(
    "/search",
    response_model=ExerciseSearchResponse,
    operation_id="search_exercises",
    responses=PROFILE_NOT_FOUND,
)
def search_exercises(
    profile_id: str, q: str, current_user: CurrentUser, db: DbSession
) -> ExerciseSearchResponse:
    """Every exercise whose name contains `q` (case-insensitive; `q` trimmed, 2–50
    characters, else 422 on `q`), each with whether it fits the user's chosen Equipment
    Profile and which equipment is missing. Fitting first, then level, muscle group, name.
    Another user's profile, or an unknown or non-UUID id, is 404."""
    return service.search_exercises(db, current_user.id, profile_id, q)


@router.get(
    "/equipment-profiles",
    response_model=list[EquipmentProfileResponse],
    operation_id="list_equipment_profiles",
)
def list_equipment_profiles(
    current_user: CurrentUser, db: DbSession, now: Now
) -> list[EquipmentProfileResponse]:
    """The user's Equipment Profiles in creation order. A user with none (registered before
    profiles existed) gets "Hjemme" and "Treningssenter" first."""
    return service.list_profiles(db, current_user.id, now)


@router.post(
    "/equipment-profiles",
    status_code=status.HTTP_201_CREATED,
    response_model=EquipmentProfileResponse,
    operation_id="create_equipment_profile",
)
def create_equipment_profile(
    body: EquipmentProfileCreate, current_user: CurrentUser, db: DbSession, now: Now
) -> EquipmentProfileResponse:
    """New profile; Kroppsvekt is always included. At most 10 profiles, names unique."""
    return service.create_profile(db, current_user.id, body, now)


@router.patch(
    "/equipment-profiles/{profile_id}",
    response_model=EquipmentProfileResponse,
    operation_id="update_equipment_profile",
    responses=PROFILE_NOT_FOUND,
)
def update_equipment_profile(
    profile_id: uuid.UUID, body: EquipmentProfileUpdate, current_user: CurrentUser, db: DbSession
) -> EquipmentProfileResponse:
    """Rename and/or replace the equipment of the user's profile; Kroppsvekt is kept."""
    return service.update_profile(db, current_user.id, profile_id, body)


@router.delete(
    "/equipment-profiles/{profile_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_equipment_profile",
    responses={
        **PROFILE_NOT_FOUND,
        409: {"model": ErrorResponse, "description": "last_equipment_profile"},
    },
)
def delete_equipment_profile(
    profile_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> Response:
    """Delete the user's profile; the last one cannot be deleted."""
    service.delete_profile(db, current_user.id, profile_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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
