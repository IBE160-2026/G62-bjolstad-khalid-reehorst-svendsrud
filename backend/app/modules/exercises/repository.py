"""Database access for exercises. Only the exercises service calls this. Reference data is
read-only (AD-9); Equipment Profiles are always filtered by the owner's `user_id` (AD-4)."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSessionType
from sqlalchemy.orm import selectinload

from app.modules.exercises.models import Equipment, EquipmentProfile, Exercise


def list_exercises(db: DbSessionType) -> list[Exercise]:
    return list(db.scalars(select(Exercise)))


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def search_exercises(db: DbSessionType, query: str) -> list[Exercise]:
    """Exercises whose name contains `query`, ignoring case (story 4.4). Unordered; the
    service orders them. `%`, `_` and `\\` in the query match themselves."""
    needle = _escape_like(query)
    statement = (
        select(Exercise)
        .where(Exercise.name.ilike(f"%{needle}%", escape="\\"))
        .options(selectinload(Exercise.equipment_links), selectinload(Exercise.muscle_links))
    )
    return list(db.scalars(statement))


def get_exercise(db: DbSessionType, exercise_id: uuid.UUID) -> Exercise | None:
    return db.get(Exercise, exercise_id)


def list_equipment(db: DbSessionType) -> list[Equipment]:
    """The equipment types in seed order."""
    return list(db.scalars(select(Equipment).order_by(Equipment.position)))


# Namespace for the two-argument pg_advisory_xact_lock, so these locks never collide with
# advisory locks taken elsewhere for other purposes.
EQUIPMENT_PROFILE_LOCK_NAMESPACE = 4202


def get_equipment_by_slug(db: DbSessionType, slug: str) -> Equipment | None:
    return db.scalars(select(Equipment).where(Equipment.slug == slug)).one_or_none()


def lock_user_profiles(db: DbSessionType, user_id: uuid.UUID) -> None:
    """Serialise changes to one user's profiles until the transaction ends, so two requests
    cannot both create the defaults or slip past the limit and last-profile rules."""
    key = (user_id.int & 0xFFFFFFFF) - (1 << 31)  # signed 32-bit key within the namespace
    db.execute(select(func.pg_advisory_xact_lock(EQUIPMENT_PROFILE_LOCK_NAMESPACE, key)))


def list_profiles(db: DbSessionType, user_id: uuid.UUID) -> list[EquipmentProfile]:
    """The user's profiles in creation order."""
    query = (
        select(EquipmentProfile)
        .where(EquipmentProfile.user_id == user_id)
        .order_by(EquipmentProfile.created_at, EquipmentProfile.id)
    )
    return list(db.scalars(query))


def count_profiles(db: DbSessionType, user_id: uuid.UUID) -> int:
    query = select(func.count()).where(EquipmentProfile.user_id == user_id)
    return db.scalar(query) or 0


def get_profile(
    db: DbSessionType, user_id: uuid.UUID, profile_id: uuid.UUID
) -> EquipmentProfile | None:
    """The user's profile, or None if it is missing or belongs to someone else."""
    query = select(EquipmentProfile).where(
        EquipmentProfile.id == profile_id, EquipmentProfile.user_id == user_id
    )
    return db.scalars(query).one_or_none()


def name_taken(
    db: DbSessionType, user_id: uuid.UUID, name: str, except_id: uuid.UUID | None = None
) -> bool:
    """Whether the user already has a profile with this name, ignoring case."""
    query = select(EquipmentProfile.id).where(
        EquipmentProfile.user_id == user_id,
        func.lower(EquipmentProfile.name) == func.lower(name),
    )
    if except_id is not None:
        query = query.where(EquipmentProfile.id != except_id)
    return db.scalars(query).first() is not None


def add_profile(db: DbSessionType, profile: EquipmentProfile) -> EquipmentProfile:
    db.add(profile)
    db.flush()
    return profile


def delete_profile(db: DbSessionType, profile: EquipmentProfile) -> None:
    db.delete(profile)
    db.flush()
