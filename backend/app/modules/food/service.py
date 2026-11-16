"""Food rules: kcal per entry, Meal and date (AD-5), search, and logging entries.

The kcal functions are pure. Values stay unrounded; only the UI rounds for display.
`overview` (Epic 6) reads day sums through this service.
"""

import uuid
from collections.abc import Iterable
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy.orm import Session as DbSessionType

from app.core.errors import AppError
from app.modules.food import repository
from app.modules.food.models import FoodItem, FoodLogEntry
from app.modules.food.schemas import (
    FoodDayResponse,
    FoodEntryRequest,
    FoodEntryResponse,
    FoodItemCreate,
    FoodItemResponse,
    FoodSource,
    Meal,
    MealSummary,
)

SEARCH_MIN_LENGTH = 2
FOOD_ITEM_NOT_FOUND_MESSAGE = "Fant ikke matvaren. Søk etter den på nytt."


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
        created_at=now,
    )
    repository.add_item(db, item)
    return item_response(item)


def _entry_response(entry: FoodLogEntry, name: str) -> FoodEntryResponse:
    return FoodEntryResponse(
        id=entry.id,
        food_item_id=entry.food_item_id,
        name=name,
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
    return _entry_response(entry, item.name)


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
        in_meal = [(entry, name) for entry, name in rows if entry.meal == meal.value]
        values = [entry_kcal(e.grams, e.kcal_per_100g_snapshot) for e, _ in in_meal]
        day_values.extend(values)
        meals.append(
            MealSummary(
                meal=meal,
                entries=[_entry_response(entry, name) for entry, name in in_meal],
                total_kcal=float(sum_kcal(values)),
            )
        )
    return FoodDayResponse(date=day, meals=meals, total_kcal=float(sum_kcal(day_values)))
