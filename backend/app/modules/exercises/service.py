"""Exercise rules: map reference rows to responses and order the list."""

import uuid

from sqlalchemy.orm import Session as DbSessionType

from app.core.errors import AppError
from app.modules.exercises import repository
from app.modules.exercises.models import Exercise, MuscleGroup
from app.modules.exercises.schemas import ExerciseDetail, ExerciseListItem

EXERCISE_NOT_FOUND_CODE = "exercise_not_found"
EXERCISE_NOT_FOUND_MESSAGE = "Fant ikke øvelsen. Gå tilbake til Trening og velg en øvelse."


class MissingPrimaryMuscleGroup(RuntimeError):
    """Seed data broke the one-primary rule; a data bug, not a user error."""


def _primary(exercise: Exercise) -> MuscleGroup:
    for link in exercise.muscle_links:
        if link.role == "primary":
            return link.muscle_group
    raise MissingPrimaryMuscleGroup(f"Exercise {exercise.slug!r} has no primary muscle group")


def _secondary(exercise: Exercise) -> list[str]:
    groups = [link.muscle_group for link in exercise.muscle_links if link.role == "secondary"]
    return [group.name for group in sorted(groups, key=lambda group: group.position)]


def _equipment(exercise: Exercise) -> list[str]:
    items = sorted((link.equipment for link in exercise.equipment_links), key=lambda e: e.position)
    return [item.name for item in items]


def list_exercises(db: DbSessionType) -> list[ExerciseListItem]:
    """Every exercise, ordered by primary muscle group (seed order), then name."""
    rows = [(exercise, _primary(exercise)) for exercise in repository.list_exercises(db)]
    rows.sort(key=lambda row: (row[1].position, row[0].name.lower()))
    return [
        ExerciseListItem(
            id=exercise.id,
            name=exercise.name,
            level=exercise.level,
            primary_muscle_group=primary.name,
            equipment=_equipment(exercise),
        )
        for exercise, primary in rows
    ]


def get_exercise(db: DbSessionType, exercise_id: str) -> ExerciseDetail:
    """One exercise; an unknown id or one that is not a UUID is 404 `exercise_not_found`."""
    try:
        parsed = uuid.UUID(exercise_id)
    except ValueError:
        exercise = None
    else:
        exercise = repository.get_exercise(db, parsed)
    if exercise is None:
        raise AppError(404, EXERCISE_NOT_FOUND_CODE, EXERCISE_NOT_FOUND_MESSAGE)
    return ExerciseDetail(
        id=exercise.id,
        name=exercise.name,
        level=exercise.level,
        type=exercise.type,
        primary_muscle_group=_primary(exercise).name,
        secondary_muscle_groups=_secondary(exercise),
        equipment=_equipment(exercise),
        steps=list(exercise.steps),
        video_id=exercise.video_id,
    )
