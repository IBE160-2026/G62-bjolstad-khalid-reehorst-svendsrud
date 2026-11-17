"""Exercise reference tables (AD-9): read-only, filled only by the seed in app/seed/.
Equipment Profiles (story 4.2) are user-owned and live here too."""

import datetime as dt
import uuid

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

LEVELS = ("beginner", "intermediate", "advanced")
EXERCISE_TYPES = ("reps", "time")
ROLES = ("primary", "secondary")


class Equipment(Base):
    __tablename__ = "equipment"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(32), unique=True)
    name: Mapped[str] = mapped_column(String(64))
    # Order in the seed file; lists show equipment in this order.
    position: Mapped[int] = mapped_column(Integer)


class MuscleGroup(Base):
    __tablename__ = "muscle_groups"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(32), unique=True)
    name: Mapped[str] = mapped_column(String(64))
    position: Mapped[int] = mapped_column(Integer)


class ExerciseEquipment(Base):
    """Equipment an exercise requires; all of it is needed. RESTRICT: deleting equipment
    must never silently change what an exercise requires."""

    __tablename__ = "exercise_equipment"
    exercise_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("exercises.id", ondelete="CASCADE"), primary_key=True
    )
    equipment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("equipment.id", ondelete="RESTRICT"), primary_key=True
    )
    equipment: Mapped[Equipment] = relationship(lazy="joined")


class ExerciseMuscleGroup(Base):
    """A muscle group an exercise works: exactly one `primary`, 0–2 `secondary`."""

    __tablename__ = "exercise_muscle_groups"
    __table_args__ = (
        CheckConstraint("role IN ('primary', 'secondary')", name="ck_exercise_muscle_groups_role"),
        # At most one primary per exercise; "at least one" is checked by the seed tests.
        Index(
            "uq_exercise_muscle_groups_primary",
            "exercise_id",
            unique=True,
            postgresql_where=text("role = 'primary'"),
        ),
    )
    exercise_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("exercises.id", ondelete="CASCADE"), primary_key=True
    )
    muscle_group_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("muscle_groups.id", ondelete="RESTRICT"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(16))
    muscle_group: Mapped[MuscleGroup] = relationship(lazy="joined")


class Exercise(Base):
    __tablename__ = "exercises"
    __table_args__ = (
        CheckConstraint(
            "level IN ('beginner', 'intermediate', 'advanced')", name="ck_exercises_level"
        ),
        CheckConstraint("type IN ('reps', 'time')", name="ck_exercises_type"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    level: Mapped[str] = mapped_column(String(16))
    # reps | time: decides whether sets log reps + kg or seconds (Epic 5).
    type: Mapped[str] = mapped_column(String(8))
    # Short technique description as numbered steps (Norwegian).
    steps: Mapped[list[str]] = mapped_column(JSON)
    # YouTube video id, embedded from youtube-nocookie.com.
    video_id: Mapped[str] = mapped_column(String(32))
    equipment_links: Mapped[list[ExerciseEquipment]] = relationship(
        lazy="selectin", cascade="all, delete-orphan"
    )
    muscle_links: Mapped[list[ExerciseMuscleGroup]] = relationship(
        lazy="selectin", cascade="all, delete-orphan"
    )


class EquipmentProfileItem(Base):
    """One equipment type in a profile. RESTRICT: equipment is reference data and must
    never silently disappear from a user's profile."""

    __tablename__ = "equipment_profile_items"
    profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("equipment_profiles.id", ondelete="CASCADE"), primary_key=True
    )
    equipment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("equipment.id", ondelete="RESTRICT"), primary_key=True
    )
    equipment: Mapped[Equipment] = relationship(lazy="joined")


class EquipmentProfile(Base):
    """A named set of equipment a user has ("Hjemme", "Treningssenter", ...). Owned by one
    user; every query filters by `user_id` (AD-4). Names are unique per user ignoring case."""

    __tablename__ = "equipment_profiles"
    __table_args__ = (
        Index("uq_equipment_profiles_user_name", "user_id", text("lower(name)"), unique=True),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(40))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    items: Mapped[list[EquipmentProfileItem]] = relationship(
        lazy="selectin", cascade="all, delete-orphan", passive_deletes=True
    )
