"""HTTP endpoints for food search and the user's food log under /api/food. All require consent."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.core.clock import Now
from app.core.db import DbSession
from app.modules.food import service
from app.modules.food.schemas import (
    FoodDayResponse,
    FoodEntryRequest,
    FoodEntryResponse,
    FoodItemResponse,
)
from app.modules.identity.consent import ConsentedUser

router = APIRouter(prefix="/api/food", tags=["food"])


@router.get("/items", response_model=list[FoodItemResponse], operation_id="search_food_items")
def search_food_items(
    current_user: ConsentedUser,
    db: DbSession,
    q: Annotated[str, Query(max_length=100)] = "",
) -> list[FoodItemResponse]:
    """Shared items plus the user's own whose name contains `q`; max 20; `[]` under 2 chars."""
    items = service.search_items(db, current_user.id, q)
    return [service.item_response(item) for item in items]


@router.get("/entries", response_model=FoodDayResponse, operation_id="get_food_day")
def get_food_day(
    current_user: ConsentedUser,
    db: DbSession,
    day: Annotated[date, Query(alias="date")],
) -> FoodDayResponse:
    """The user's entries for one date (YYYY-MM-DD) by Meal, with Meal and day totals."""
    return service.get_day(db, current_user.id, day)


@router.post(
    "/entries",
    response_model=FoodEntryResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="add_food_entry",
)
def add_food_entry(
    body: FoodEntryRequest, current_user: ConsentedUser, db: DbSession, now: Now
) -> FoodEntryResponse:
    """Log grams of a food item in a Meal; kcal per 100 g is copied as a snapshot."""
    return service.add_entry(db, current_user.id, body, now)
