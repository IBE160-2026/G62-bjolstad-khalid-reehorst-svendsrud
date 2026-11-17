"""Response bodies for /api/exercises (read-only, AD-9)."""

import uuid
from enum import StrEnum

from pydantic import BaseModel


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
