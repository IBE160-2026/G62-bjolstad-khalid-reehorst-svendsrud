"""Food tables: food items (shared or user-owned) and the user's food log entries."""

import datetime as dt
import uuid
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Index, Numeric, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.modules.identity.models import utc_now


class FoodItem(Base):
    __tablename__ = "food_items"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # matvaretabellen | off | user; kept per row so attribution can be shown per item.
    source: Mapped[str] = mapped_column(String(16))
    # NULL for shared items; set for a user's own items. CASCADE so purge removes them.
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # The id in the source (e.g. Matvaretabellen "05.004"); NULL for user items.
    external_id: Mapped[str | None] = mapped_column(String(32))
    name: Mapped[str] = mapped_column(String(200))
    kcal_per_100g: Mapped[Decimal] = mapped_column(Numeric(7, 2))
    protein_g: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    carbs_g: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    fat_g: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    # Optional grams per serving (story 3.2); servings in the amount picker come in 3.5.
    serving_size_g: Mapped[Decimal | None] = mapped_column(Numeric(6, 1))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class FoodLogEntry(Base):
    __tablename__ = "food_log_entries"
    __table_args__ = (Index("ix_food_log_entries_user_date", "user_id", "date"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # Never taken from the client (AD-4); CASCADE so purge removes the entries too.
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    # No CASCADE: deleting an item must never erase logged history (AD-6).
    food_item_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("food_items.id")
    )
    # The calendar date chosen by the client in Europe/Oslo (AD-12).
    date: Mapped[dt.date] = mapped_column(Date)
    meal: Mapped[str] = mapped_column(String(16))
    grams: Mapped[Decimal] = mapped_column(Numeric(6, 1))
    # Copied from the item when logged, so history never changes (AD-6).
    kcal_per_100g_snapshot: Mapped[Decimal] = mapped_column(Numeric(7, 2))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))


# Search matches on lower(name) (story 3.1).
Index("ix_food_items_lower_name", func.lower(FoodItem.name))
