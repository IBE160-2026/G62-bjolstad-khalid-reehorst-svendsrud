"""Exercise rules: map reference rows to responses and order the list; Equipment Profiles
(story 4.2) with their defaults, limits and the always-included bodyweight."""

import uuid
from datetime import datetime, timedelta

from sqlalchemy.orm import Session as DbSessionType

from app.core.clock import utc_now
from app.core.errors import VALIDATION_MESSAGE, AppError, FieldError
from app.modules.exercises import repository
from app.modules.exercises.models import (
    Equipment,
    EquipmentProfile,
    EquipmentProfileItem,
    Exercise,
    MuscleGroup,
)
from app.modules.exercises.schemas import (
    EquipmentProfileCreate,
    EquipmentProfileResponse,
    EquipmentProfileUpdate,
    EquipmentResponse,
    ExerciseDetail,
    ExerciseListItem,
)

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


# --- Equipment Profiles (story 4.2) ---

BODYWEIGHT_SLUG = "kroppsvekt"
MAX_PROFILES = 10
DEFAULT_HOME_NAME = "Hjemme"
DEFAULT_GYM_NAME = "Treningssenter"

PROFILE_NOT_FOUND_CODE = "equipment_profile_not_found"
PROFILE_NOT_FOUND_MESSAGE = "Fant ikke utstyrsprofilen. Last inn siden på nytt."
PROFILE_NAME_TAKEN_MESSAGE = "Du har allerede en profil som heter det."
PROFILE_LIMIT_CODE = "equipment_profile_limit"
PROFILE_LIMIT_MESSAGE = "Du kan ha opptil 10 utstyrsprofiler."
LAST_PROFILE_CODE = "last_equipment_profile"
LAST_PROFILE_MESSAGE = "Du må ha minst én utstyrsprofil."
UNKNOWN_EQUIPMENT_MESSAGE = "Velg utstyr fra listen."


def list_equipment(db: DbSessionType) -> list[EquipmentResponse]:
    """The nine equipment types in seed order."""
    return [EquipmentResponse(slug=e.slug, name=e.name) for e in repository.list_equipment(db)]


def _profile_response(profile: EquipmentProfile) -> EquipmentProfileResponse:
    items = sorted((item.equipment for item in profile.items), key=lambda e: e.position)
    return EquipmentProfileResponse(
        id=profile.id,
        name=profile.name,
        equipment=[EquipmentResponse(slug=e.slug, name=e.name) for e in items],
    )


def _field_error(field: str, message: str) -> AppError:
    fields = [FieldError(field=field, message=message)]
    return AppError(422, "validation_error", VALIDATION_MESSAGE, fields)


def _resolve_equipment(db: DbSessionType, slugs: list[str]) -> list[Equipment]:
    """The equipment for these slugs plus bodyweight, in seed order; an unknown slug is a
    422 field error on `equipment`."""
    by_slug = {e.slug: e for e in repository.list_equipment(db)}
    if any(slug not in by_slug for slug in slugs):
        raise _field_error("equipment", UNKNOWN_EQUIPMENT_MESSAGE)
    wanted = set(slugs) | {BODYWEIGHT_SLUG}
    return [e for e in by_slug.values() if e.slug in wanted]


def _set_equipment(profile: EquipmentProfile, equipment: list[Equipment]) -> None:
    current = {item.equipment_id: item for item in profile.items}
    profile.items = [
        current.get(e.id) or EquipmentProfileItem(equipment_id=e.id, equipment=e)
        for e in equipment
    ]


def _check_name_free(
    db: DbSessionType, user_id: uuid.UUID, name: str, except_id: uuid.UUID | None = None
) -> None:
    if repository.name_taken(db, user_id, name, except_id):
        raise _field_error("name", PROFILE_NAME_TAKEN_MESSAGE)


def create_default_profiles(
    db: DbSessionType, user_id: uuid.UUID, now: datetime | None = None
) -> list[EquipmentProfile]:
    """Create "Hjemme" (bodyweight only) and "Treningssenter" (every equipment type).

    Called once by identity right after registration, and by `list_profiles` for users
    from before story 4.2. If the equipment reference data is not seeded yet, the
    profiles are created with whatever equipment exists.
    """
    now = now or utc_now()
    equipment = repository.list_equipment(db)
    home = EquipmentProfile(user_id=user_id, name=DEFAULT_HOME_NAME, created_at=now)
    _set_equipment(home, [e for e in equipment if e.slug == BODYWEIGHT_SLUG])
    # One microsecond later, so creation order (Hjemme first) is stable.
    gym = EquipmentProfile(
        user_id=user_id, name=DEFAULT_GYM_NAME, created_at=now + timedelta(microseconds=1)
    )
    _set_equipment(gym, equipment)
    return [repository.add_profile(db, home), repository.add_profile(db, gym)]


def _ensure_bodyweight(db: DbSessionType, profiles: list[EquipmentProfile]) -> None:
    """Repair profiles created while the equipment table was empty (no seed yet): add
    Kroppsvekt to any profile that lacks it, once that equipment row exists."""
    bodyweight = repository.get_equipment_by_slug(db, BODYWEIGHT_SLUG)
    if bodyweight is None:
        return
    changed = False
    for profile in profiles:
        if all(item.equipment_id != bodyweight.id for item in profile.items):
            profile.items.append(
                EquipmentProfileItem(equipment_id=bodyweight.id, equipment=bodyweight)
            )
            changed = True
    if changed:
        db.flush()


def list_profiles(
    db: DbSessionType, user_id: uuid.UUID, now: datetime
) -> list[EquipmentProfileResponse]:
    """The user's profiles in creation order; a user with none gets the two defaults."""
    profiles = repository.list_profiles(db, user_id)
    if not profiles:
        repository.lock_user_profiles(db, user_id)
        profiles = repository.list_profiles(db, user_id)
        if not profiles:
            profiles = create_default_profiles(db, user_id, now)
    _ensure_bodyweight(db, profiles)
    return [_profile_response(profile) for profile in profiles]


def _get_profile(
    db: DbSessionType, user_id: uuid.UUID, profile_id: uuid.UUID
) -> EquipmentProfile:
    profile = repository.get_profile(db, user_id, profile_id)
    if profile is None:
        # Same answer for a missing profile and another user's profile (FR3).
        raise AppError(404, PROFILE_NOT_FOUND_CODE, PROFILE_NOT_FOUND_MESSAGE)
    return profile


def create_profile(
    db: DbSessionType, user_id: uuid.UUID, data: EquipmentProfileCreate, now: datetime
) -> EquipmentProfileResponse:
    repository.lock_user_profiles(db, user_id)
    if repository.count_profiles(db, user_id) >= MAX_PROFILES:
        raise AppError(422, PROFILE_LIMIT_CODE, PROFILE_LIMIT_MESSAGE)
    _check_name_free(db, user_id, data.name)
    equipment = _resolve_equipment(db, data.equipment)
    profile = EquipmentProfile(user_id=user_id, name=data.name, created_at=now)
    _set_equipment(profile, equipment)
    return _profile_response(repository.add_profile(db, profile))


def update_profile(
    db: DbSessionType, user_id: uuid.UUID, profile_id: uuid.UUID, data: EquipmentProfileUpdate
) -> EquipmentProfileResponse:
    repository.lock_user_profiles(db, user_id)
    profile = _get_profile(db, user_id, profile_id)
    if data.name is not None:
        _check_name_free(db, user_id, data.name, except_id=profile.id)
    equipment = _resolve_equipment(db, data.equipment) if data.equipment is not None else None
    if data.name is not None:
        profile.name = data.name
    if equipment is not None:
        _set_equipment(profile, equipment)
    db.flush()
    _ensure_bodyweight(db, [profile])
    return _profile_response(profile)


def delete_profile(db: DbSessionType, user_id: uuid.UUID, profile_id: uuid.UUID) -> None:
    """Delete the user's profile; the last one is kept (409 `last_equipment_profile`)."""
    repository.lock_user_profiles(db, user_id)
    profile = _get_profile(db, user_id, profile_id)
    if repository.count_profiles(db, user_id) <= 1:
        raise AppError(409, LAST_PROFILE_CODE, LAST_PROFILE_MESSAGE)
    repository.delete_profile(db, profile)
