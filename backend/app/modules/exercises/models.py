"""Exercise reference tables (AD-9): read-only, filled only by the seed in app/seed/."""

import uuid

from sqlalchemy import JSON, CheckConstraint, ForeignKey, Index, Integer, String, Uuid, text
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
