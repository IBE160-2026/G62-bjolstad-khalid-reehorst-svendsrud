"""Profile rules: read the user's profile and save it with a freshly computed target."""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session as DbSessionType

from app.core.errors import AppError
from app.modules.profile import repository
from app.modules.profile.calculator import calculate_target
from app.modules.profile.models import Profile
from app.modules.profile.schemas import ProfileRequest

PROFILE_NOT_FOUND_MESSAGE = "Du har ikke satt opp profilen ennå."


def find_profile(db: DbSessionType, user_id: uuid.UUID) -> Profile | None:
    """The user's profile, or None before setup (overview, Epic 6)."""
    return repository.get_profile(db, user_id)


def get_profile(db: DbSessionType, user_id: uuid.UUID) -> Profile:
    profile = find_profile(db, user_id)
    if profile is None:
        raise AppError(404, "profile_not_found", PROFILE_NOT_FOUND_MESSAGE)
    return profile


def save_profile(
    db: DbSessionType, user_id: uuid.UUID, data: ProfileRequest, now: datetime
) -> Profile:
    """Store the profile and the target computed from it (AD-17); replaces any earlier one."""
    weight_kg = Decimal(str(data.weight_kg))
    target = calculate_target(
        data.sex, weight_kg, data.height_cm, data.age, data.activity_level, data.goal
    )
    values = {
        "sex": data.sex.value,
        "weight_kg": weight_kg,
        "height_cm": data.height_cm,
        "age": data.age,
        "activity_level": data.activity_level.value,
        "goal": data.goal.value,
        "target_kcal": target.target_kcal,
        "floor_applied": target.floor_applied,
        "updated_at": now,
    }
    return repository.upsert_profile(db, user_id, values)
