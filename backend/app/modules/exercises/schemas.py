"""Request and response bodies for /api/exercises. Reference data is read-only (AD-9);
Equipment Profiles (story 4.2) are the user's own and can be changed."""

import uuid
from enum import StrEnum
from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field
from pydantic_core import PydanticCustomError

from app.core.errors import FIELD_MESSAGE_ERROR

SEARCH_MIN_LENGTH = 2
SEARCH_MAX_LENGTH = 50
PROFILE_NAME_MAX = 40
PROFILE_NAME_MESSAGE = "Skriv et navn på profilen."
PROFILE_NAME_LENGTH_MESSAGE = "Skriv et navn på høyst 40 tegn."
# Nine equipment types exist; a cap keeps an oversized body from reaching the database.
EQUIPMENT_LIST_MAX = 20


class Level(StrEnum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class ExerciseType(StrEnum):
    REPS = "reps"
    TIME = "time"


class ExerciseListItem(BaseModel):
    id: uuid.UUID
    name: str
    level: Level
    primary_muscle_group: str
    equipment: list[str]


class ExerciseDetail(BaseModel):
    id: uuid.UUID
    name: str
    level: Level
    type: ExerciseType
    primary_muscle_group: str
    secondary_muscle_groups: list[str]
    equipment: list[str]
    steps: list[str]
    video_id: str


def _profile_name(value: str) -> str:
    value = value.strip()
    if not value:
        raise PydanticCustomError(FIELD_MESSAGE_ERROR, PROFILE_NAME_MESSAGE)
    if len(value) > PROFILE_NAME_MAX:
        raise PydanticCustomError(FIELD_MESSAGE_ERROR, PROFILE_NAME_LENGTH_MESSAGE)
    return value


ProfileName = Annotated[str, AfterValidator(_profile_name)]


class EquipmentResponse(BaseModel):
    slug: str
    name: str


class EquipmentProfileResponse(BaseModel):
    id: uuid.UUID
    name: str
    # In seed order; always includes Kroppsvekt.
    equipment: list[EquipmentResponse]


class EquipmentProfileCreate(BaseModel):
    """A new profile. `kroppsvekt` is always added by the server, whatever is sent."""

    name: ProfileName
    equipment: list[str] = Field(default=[], max_length=EQUIPMENT_LIST_MAX)


class EquipmentProfileUpdate(BaseModel):
    """Rename and/or replace the equipment. Left out or null means unchanged; `kroppsvekt`
    is always kept."""

    name: ProfileName | None = None
    equipment: list[str] | None = Field(default=None, max_length=EQUIPMENT_LIST_MAX)


class SuggestionsResponse(BaseModel):
    """Exercises that fit one Equipment Profile (story 4.3), ordered Nybegynner, Middels,
    Øvet, then muscle group, then name."""

    profile_id: uuid.UUID
    profile_name: str
    exercises: list[ExerciseListItem]


class ExerciseSearchItem(ExerciseListItem):
    """A search result (story 4.4): the list item plus whether it fits the chosen profile
    and, if not, the missing equipment (Norwegian names, seed order)."""

    fits: bool
    missing_equipment: list[str]


class ExerciseSearchResponse(BaseModel):
    """Exercises whose name contains the query, fitting ones first, then Nybegynner,
    Middels, Øvet, muscle group and name."""

    profile_id: uuid.UUID
    profile_name: str
    exercises: list[ExerciseSearchItem]
