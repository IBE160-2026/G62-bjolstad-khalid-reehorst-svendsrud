"""Food rules: kcal per entry, Meal and date (AD-5), search, and logging entries.

The kcal functions are pure. Values stay unrounded; only the UI rounds for display.
`overview` (Epic 6) reads day sums through this service.
"""

import uuid
from collections.abc import Iterable
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session as DbSessionType

from app.core.errors import AppError
from app.modules.food import repository
from app.modules.food.barcode import INVALID_BARCODE_MESSAGE, is_valid_ean
from app.modules.food.models import FoodItem, FoodLogEntry
from app.modules.food.schemas import (
    FoodDayResponse,
    FoodEntryRequest,
    FoodEntryResponse,
    FoodEntryUpdate,
    FoodItemCreate,
    FoodItemResponse,
    FoodSource,
    Meal,
    MealSummary,
    RecentFoodResponse,
)
from app.ports.off import OffNotFound, OffPort, OffProduct

SEARCH_MIN_LENGTH = 2
FOOD_ITEM_NOT_FOUND_MESSAGE = "Fant ikke matvaren. Søk etter den på nytt."
FOOD_ENTRY_NOT_FOUND_MESSAGE = "Fant ikke denne registreringen. Last inn siden på nytt."
# "Angre" can restore a deleted entry this long after the delete (story 3.6).
RESTORE_WINDOW = timedelta(minutes=10)
# Soft-deleted entries are kept this long before `purge` removes them for good.
ENTRY_PURGE_AFTER = timedelta(days=1)
BARCODE_NOT_FOUND_MESSAGE = "Vi fant ikke denne varen. Vil du registrere den selv?"
OFF_UNAVAILABLE_MESSAGE = (
    "Vi får ikke kontakt med Open Food Facts nå. Du kan registrere varen selv."
)


def entry_kcal(grams: Decimal, kcal_per_100g: Decimal) -> Decimal:
    """grams × kcal per 100 g / 100, unrounded (AD-6: always from the snapshot)."""
    return grams * kcal_per_100g / 100


def sum_kcal(values: Iterable[Decimal]) -> Decimal:
    """Sum unrounded kcal values; an empty Meal or day is 0."""
    return sum(values, Decimal(0))


def _optional(value: Decimal | None) -> float | None:
    return None if value is None else float(value)


def item_response(item: FoodItem) -> FoodItemResponse:
    return FoodItemResponse(
        id=item.id,
        name=item.name,
        source=item.source,
        kcal_per_100g=float(item.kcal_per_100g),
        protein_g=_optional(item.protein_g),
        carbs_g=_optional(item.carbs_g),
        fat_g=_optional(item.fat_g),
        serving_size_g=_optional(item.serving_size_g),
        barcode=item.barcode,
    )


def _decimal(value: float | None) -> Decimal | None:
    return None if value is None else Decimal(str(value))


def create_own_item(
    db: DbSessionType, user_id: uuid.UUID, data: FoodItemCreate, now: datetime
) -> FoodItemResponse:
    """A food item only its owner can see; source and owner always come from the server."""
    item = FoodItem(
        source=FoodSource.USER.value,
        owner_id=user_id,
        name=data.name,
        kcal_per_100g=Decimal(str(data.kcal_per_100g)),
        protein_g=_decimal(data.protein_g),
        carbs_g=_decimal(data.carbs_g),
        fat_g=_decimal(data.fat_g),
        serving_size_g=_decimal(data.serving_size_g),
        barcode=data.barcode,
        created_at=now,
    )
    repository.add_item(db, item)
    return item_response(item)


def lookup_barcode(
    db: DbSessionType, user_id: uuid.UUID, code: str, off: OffPort, now: datetime
) -> FoodItemResponse:
    """Own item → shared item → Open Food Facts. A found OFF product is stored as a
    shared item (`source="off"`), so the next lookup never leaves the app (NFR6)."""
    if not is_valid_ean(code):
        raise AppError(422, "invalid_barcode", INVALID_BARCODE_MESSAGE)
    item = repository.get_own_item_by_barcode(db, user_id, code)
    if item is None:
        item = repository.get_shared_item_by_barcode(db, code)
    if item is not None:
        return item_response(item)

    result = off.lookup(code)
    if isinstance(result, OffNotFound):
        raise AppError(404, "barcode_not_found", BARCODE_NOT_FOUND_MESSAGE)
    if not isinstance(result, OffProduct):
        raise AppError(503, "off_unavailable", OFF_UNAVAILABLE_MESSAGE)
    item = repository.add_shared_item(
        db,
        FoodItem(
            source=FoodSource.OFF.value,
            owner_id=None,
            external_id=code,
            barcode=code,
            name=result.name,
            kcal_per_100g=result.kcal_per_100g,
            protein_g=result.protein_g,
            carbs_g=result.carbs_g,
            fat_g=result.fat_g,
            serving_size_g=result.serving_size_g,
            created_at=now,
        ),
    )
    return item_response(item)


def recent_items(db: DbSessionType, user_id: uuid.UUID) -> list[RecentFoodResponse]:
    """The user's 10 most recently logged distinct items with the last grams and Meal."""
    return [
        RecentFoodResponse(
            **item_response(item).model_dump(),
            last_grams=float(entry.grams),
            last_meal=Meal(entry.meal),
        )
        for item, entry in repository.list_recent_items(db, user_id)
    ]


def _entry_response(entry: FoodLogEntry, item: FoodItem) -> FoodEntryResponse:
    return FoodEntryResponse(
        id=entry.id,
        food_item_id=entry.food_item_id,
        name=item.name,
        source=item.source,
        serving_size_g=_optional(item.serving_size_g),
        date=entry.date,
        meal=entry.meal,
        grams=float(entry.grams),
        kcal_per_100g_snapshot=float(entry.kcal_per_100g_snapshot),
        kcal=float(entry_kcal(entry.grams, entry.kcal_per_100g_snapshot)),
        created_at=entry.created_at,
    )


def search_items(db: DbSessionType, user_id: uuid.UUID, query: str) -> list[FoodItem]:
    """Shared and own items only; never calls Open Food Facts. Under 2 characters: none."""
    query = query.strip()
    if len(query) < SEARCH_MIN_LENGTH:
        return []
    return repository.search_items(db, user_id, query)


def add_entry(
    db: DbSessionType, user_id: uuid.UUID, data: FoodEntryRequest, now: datetime
) -> FoodEntryResponse:
    item = repository.get_visible_item(db, user_id, data.food_item_id)
    if item is None:
        raise AppError(404, "food_item_not_found", FOOD_ITEM_NOT_FOUND_MESSAGE)
    entry = FoodLogEntry(
        user_id=user_id,
        food_item_id=item.id,
        date=data.date,
        meal=data.meal.value,
        grams=Decimal(str(data.grams)),
        kcal_per_100g_snapshot=item.kcal_per_100g,
        created_at=now,
    )
    repository.add_entry(db, entry)
    return _entry_response(entry, item)


def day_kcal(db: DbSessionType, user_id: uuid.UUID, day: date) -> Decimal:
    """The user's total kcal eaten on one date (for overview, Epic 6)."""
    return sum_kcal(
        entry_kcal(entry.grams, entry.kcal_per_100g_snapshot)
        for entry, _ in repository.list_entries(db, user_id, day)
    )


def get_day(db: DbSessionType, user_id: uuid.UUID, day: date) -> FoodDayResponse:
    """The date's entries grouped by Meal, with Meal totals and the day total."""
    rows = repository.list_entries(db, user_id, day)
    meals: list[MealSummary] = []
    day_values: list[Decimal] = []
    for meal in Meal:
        in_meal = [(entry, item) for entry, item in rows if entry.meal == meal.value]
        values = [entry_kcal(e.grams, e.kcal_per_100g_snapshot) for e, _ in in_meal]
        day_values.extend(values)
        meals.append(
            MealSummary(
                meal=meal,
                entries=[_entry_response(entry, item) for entry, item in in_meal],
                total_kcal=float(sum_kcal(values)),
            )
        )
    return FoodDayResponse(date=day, meals=meals, total_kcal=float(sum_kcal(day_values)))


def _entry_not_found() -> AppError:
    # Same answer for a missing entry and another user's entry, with no data (FR3).
    return AppError(404, "food_entry_not_found", FOOD_ENTRY_NOT_FOUND_MESSAGE)


def update_entry(
    db: DbSessionType, user_id: uuid.UUID, entry_id: uuid.UUID, data: FoodEntryUpdate
) -> FoodEntryResponse:
    """Change grams and/or Meal; never the item, date or kcal snapshot (AD-6)."""
    row = repository.get_entry(db, user_id, entry_id)
    if row is None:
        raise _entry_not_found()
    entry, item = row
    if data.grams is not None:
        entry.grams = Decimal(str(data.grams))
    if data.meal is not None:
        entry.meal = data.meal.value
    db.flush()
    return _entry_response(entry, item)


def delete_entry(
    db: DbSessionType, user_id: uuid.UUID, entry_id: uuid.UUID, now: datetime
) -> None:
    """Soft delete, so "Angre" can bring back the same entry."""
    row = repository.get_entry(db, user_id, entry_id)
    if row is None:
        raise _entry_not_found()
    row[0].deleted_at = now
    db.flush()


def restore_entry(
    db: DbSessionType, user_id: uuid.UUID, entry_id: uuid.UUID, now: datetime
) -> FoodEntryResponse:
    """Undo a delete made within `RESTORE_WINDOW`; otherwise (or never deleted) 404."""
    row = repository.get_deleted_entry(db, user_id, entry_id, now - RESTORE_WINDOW)
    if row is None:
        raise _entry_not_found()
    entry, item = row
    entry.deleted_at = None
    db.flush()
    return _entry_response(entry, item)


def purge_deleted_entries(db: DbSessionType, now: datetime) -> int:
    """Hard-delete entries soft-deleted at least `ENTRY_PURGE_AFTER` ago; returns how many."""
    return repository.purge_deleted_entries(db, now - ENTRY_PURGE_AFTER)
