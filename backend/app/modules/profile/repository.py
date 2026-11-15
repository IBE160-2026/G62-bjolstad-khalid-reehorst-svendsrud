"""Database access for profiles. Only the profile service calls this.

Every query filters by the current user's id (AD-4); the id never comes from the client.
"""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session as DbSessionType

from app.modules.profile.models import Profile


def get_profile(db: DbSessionType, user_id: uuid.UUID) -> Profile | None:
    return db.scalars(select(Profile).where(Profile.user_id == user_id)).one_or_none()


def upsert_profile(db: DbSessionType, user_id: uuid.UUID, values: dict[str, Any]) -> Profile:
    """Create the user's profile or replace its values; safe against concurrent first saves."""
    statement = (
        insert(Profile)
        .values(id=uuid.uuid4(), user_id=user_id, created_at=values["updated_at"], **values)
        .on_conflict_do_update(index_elements=[Profile.user_id], set_=values)
        .returning(Profile)
    )
    return db.scalars(statement, execution_options={"populate_existing": True}).one()
