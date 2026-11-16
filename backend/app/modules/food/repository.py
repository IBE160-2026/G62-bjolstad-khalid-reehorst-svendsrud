"""Database access for food items and entries. Only the food service calls this.

Every entry query filters by the current user's id, and item queries return shared items
plus the current user's own items only (AD-4).
"""

import uuid
from datetime import date

from sqlalchemy import case, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSessionType

from app.modules.food.models import FoodItem, FoodLogEntry

SEARCH_LIMIT = 20
RECENT_LIMIT = 10


def _visible_to(user_id: uuid.UUID):
    return or_(FoodItem.owner_id.is_(None), FoodItem.owner_id == user_id)


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def search_items(db: DbSessionType, user_id: uuid.UUID, query: str) -> list[FoodItem]:
    """Case-insensitive "contains"; names starting with the query first, then shorter."""
    needle = _escape_like(query.lower())
    lowered = func.lower(FoodItem.name)
    statement = (
        select(FoodItem)
        .where(_visible_to(user_id), lowered.like(f"%{needle}%", escape="\\"))
        .order_by(
            case((lowered.like(f"{needle}%", escape="\\"), 0), else_=1),
            func.length(FoodItem.name),
            FoodItem.name,
        )
        .limit(SEARCH_LIMIT)
    )
    return list(db.scalars(statement))


def get_visible_item(db: DbSessionType, user_id: uuid.UUID, item_id: uuid.UUID) -> FoodItem | None:
    statement = select(FoodItem).where(FoodItem.id == item_id, _visible_to(user_id))
    return db.scalars(statement).one_or_none()


def add_item(db: DbSessionType, item: FoodItem) -> FoodItem:
    db.add(item)
    db.flush()
    return item


def get_own_item_by_barcode(
    db: DbSessionType, user_id: uuid.UUID, barcode: str
) -> FoodItem | None:
    """The user's newest own item with this barcode (own items may repeat a barcode)."""
    statement = (
        select(FoodItem)
        .where(FoodItem.owner_id == user_id, FoodItem.barcode == barcode)
        .order_by(FoodItem.created_at.desc(), FoodItem.id)
        .limit(1)
    )
    return db.scalars(statement).first()


def get_shared_item_by_barcode(db: DbSessionType, barcode: str) -> FoodItem | None:
    statement = select(FoodItem).where(FoodItem.owner_id.is_(None), FoodItem.barcode == barcode)
    return db.scalars(statement).one_or_none()


def add_shared_item(db: DbSessionType, item: FoodItem) -> FoodItem:
    """Store a shared item with a barcode; if another request stored the same barcode
    first (unique partial index), return that one instead."""
    try:
        with db.begin_nested():
            db.add(item)
            db.flush()
    except IntegrityError:
        existing = get_shared_item_by_barcode(db, item.barcode or "")
        if existing is None:
            raise
        return existing
    return item


def add_entry(db: DbSessionType, entry: FoodLogEntry) -> FoodLogEntry:
    db.add(entry)
    db.flush()
    return entry


def list_entries(
    db: DbSessionType, user_id: uuid.UUID, day: date
) -> list[tuple[FoodLogEntry, str]]:
    """The user's entries for one date with each item's name, oldest first."""
    statement = (
        select(FoodLogEntry, FoodItem.name)
        .join(FoodItem, FoodItem.id == FoodLogEntry.food_item_id)
        .where(FoodLogEntry.user_id == user_id, FoodLogEntry.date == day)
        .order_by(FoodLogEntry.created_at, FoodLogEntry.id)
    )
    return [(entry, name) for entry, name in db.execute(statement)]


def list_recent_items(
    db: DbSessionType, user_id: uuid.UUID, limit: int = RECENT_LIMIT
) -> list[tuple[FoodItem, FoodLogEntry]]:
    """The user's distinct logged items, each with its latest entry (by `date`, then
    `created_at`), newest first; only items the user can still see."""
    newest_first = (
        FoodLogEntry.date.desc(),
        FoodLogEntry.created_at.desc(),
        FoodLogEntry.id.desc(),
    )
    ranked = (
        select(
            FoodLogEntry.id.label("entry_id"),
            func.row_number()
            .over(partition_by=FoodLogEntry.food_item_id, order_by=newest_first)
            .label("rank"),
        )
        .where(FoodLogEntry.user_id == user_id)
        .subquery()
    )
    statement = (
        select(FoodItem, FoodLogEntry)
        .select_from(FoodLogEntry)
        .join(ranked, ranked.c.entry_id == FoodLogEntry.id)
        .join(FoodItem, FoodItem.id == FoodLogEntry.food_item_id)
        .where(ranked.c.rank == 1, FoodLogEntry.user_id == user_id, _visible_to(user_id))
        .order_by(*newest_first)
        .limit(limit)
    )
    return [(item, entry) for item, entry in db.execute(statement)]
