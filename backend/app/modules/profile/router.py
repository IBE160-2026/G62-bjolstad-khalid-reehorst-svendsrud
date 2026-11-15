"""HTTP endpoints for the user's own profile under /api/profile. All require consent."""

from fastapi import APIRouter

from app.core.clock import Now
from app.core.db import DbSession
from app.modules.identity.consent import ConsentedUser
from app.modules.profile import service
from app.modules.profile.models import Profile
from app.modules.profile.schemas import ProfileRequest, ProfileResponse

router = APIRouter(prefix="/api/profile", tags=["profile"])


def _profile_response(profile: Profile) -> ProfileResponse:
    return ProfileResponse(
        sex=profile.sex,
        weight_kg=float(profile.weight_kg),
        height_cm=profile.height_cm,
        age=profile.age,
        activity_level=profile.activity_level,
        goal=profile.goal,
        target_kcal=profile.target_kcal,
        floor_applied=profile.floor_applied,
        updated_at=profile.updated_at,
    )


@router.get("", response_model=ProfileResponse, operation_id="get_profile")
def get_profile(current_user: ConsentedUser, db: DbSession) -> ProfileResponse:
    """The user's profile and stored daily target; 404 `profile_not_found` before setup."""
    return _profile_response(service.get_profile(db, current_user.id))


@router.put("", response_model=ProfileResponse, operation_id="save_profile")
def save_profile(
    body: ProfileRequest, current_user: ConsentedUser, db: DbSession, now: Now
) -> ProfileResponse:
    """Create or replace the profile; the target is recomputed and stored on every save."""
    return _profile_response(service.save_profile(db, current_user.id, body, now))
