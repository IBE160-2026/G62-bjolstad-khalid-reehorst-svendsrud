"""Workout tables (story 5.1): a user's workouts and the exercises in each, in order.
Every query filters by the owner's `user_id` (AD-4)."""

import datetime as dt
import uuid

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    UniqueConstraint,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class WorkoutExercise(Base):
    """One exercise in a workout. RESTRICT on the exercise: reference data must never
    silently disappear from a logged workout."""

    __tablename__ = "workout_exercises"
    __table_args__ = (
        # The same exercise once per workout; the service answers 409 before this fires.
        UniqueConstraint("workout_id", "exercise_id", name="uq_workout_exercises_exercise"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    workout_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workouts.id", ondelete="CASCADE"), index=True
    )
    exercise_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("exercises.id", ondelete="RESTRICT")
    )
    # 0-based order within the workout; kept gapless by the service.
    position: Mapped[int] = mapped_column(Integer)


class Workout(Base):
    """A workout on one calendar date (AD-12). At most one unfinished workout per user."""

    __tablename__ = "workouts"
    __table_args__ = (
        Index(
            "uq_workouts_user_unfinished",
            "user_id",
            unique=True,
            postgresql_where=text("finished_at IS NULL"),
        ),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # Never taken from the client (AD-4); CASCADE so purge removes the workouts too.
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # The calendar date chosen by the client in Europe/Oslo (AD-12).
    date: Mapped[dt.date] = mapped_column(Date)
    # Set when the workout is finished (story 5.4); NULL while it is in progress.
    finished_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    exercises: Mapped[list[WorkoutExercise]] = relationship(
        lazy="selectin",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by=WorkoutExercise.position,
    )
