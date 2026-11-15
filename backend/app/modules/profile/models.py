"""The profiles table: one row per user (User 1:1 Profile)."""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # Never taken from the client; CASCADE so account purge removes the profile too.
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    sex: Mapped[str] = mapped_column(String(16))
    weight_kg: Mapped[Decimal] = mapped_column(Numeric(4, 1))
    height_cm: Mapped[int] = mapped_column(Integer)
    age: Mapped[int] = mapped_column(Integer)
    activity_level: Mapped[str] = mapped_column(String(32))
    goal: Mapped[str] = mapped_column(String(16))
    # Computed by the calculator on every save and stored (AD-17); no history in v1.
    target_kcal: Mapped[int] = mapped_column(Integer)
    floor_applied: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
