"""HTTP endpoints for food search and the user's food log under /api/food. All require consent."""

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.core.clock import Now
from app.core.db import DbSession
from app.core.errors import ErrorResponse
from app.modules.food import service
from app.modules.food.schemas import (
    FoodDayResponse,
    FoodEntryRequest,
    FoodEntryResponse,
    FoodEntryUpdate,
    FoodItemCreate,
    FoodItemResponse,
    RecentFoodResponse,
)
from app.modules.identity.consent import ConsentedUser
from app.ports.off import OffPort, get_off_port

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


@router.post(
    "/items",
    response_model=FoodItemResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="create_food_item",
)
def create_food_item(
    body: FoodItemCreate, current_user: ConsentedUser, db: DbSession, now: Now
) -> FoodItemResponse:
    """Register the user's own food item (`source="user"`); only its owner can see it."""
    return service.create_own_item(db, current_user.id, body, now)


@router.get(
    "/recent", response_model=list[RecentFoodResponse], operation_id="get_recent_foods"
)
def get_recent_foods(current_user: ConsentedUser, db: DbSession) -> list[RecentFoodResponse]:
    """The user's 10 most recently logged distinct items, newest first (by entry `date`,
    then `created_at`), each with the last grams and Meal."""
    return service.recent_items(db, current_user.id)


@router.get(
    "/barcode/{code}",
    response_model=FoodItemResponse,
    operation_id="lookup_barcode",
    responses={
        404: {"model": ErrorResponse, "description": "barcode_not_found"},
        422: {"model": ErrorResponse, "description": "invalid_barcode"},
        503: {"model": ErrorResponse, "description": "off_unavailable"},
    },
)
def lookup_barcode(
    current_user: ConsentedUser,
    db: DbSession,
    now: Now,
    off: Annotated[OffPort, Depends(get_off_port)],
    code: str,
) -> FoodItemResponse:
    """Find a food by EAN-8/13: the user's own items, then shared items, then Open Food
    Facts (a found product is cached as a shared item). Only called on submit."""
    return service.lookup_barcode(db, current_user.id, code, off, now)


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


ENTRY_NOT_FOUND = {404: {"model": ErrorResponse, "description": "food_entry_not_found"}}


@router.patch(
    "/entries/{entry_id}",
    response_model=FoodEntryResponse,
    operation_id="update_food_entry",
    responses=ENTRY_NOT_FOUND,
)
def update_food_entry(
    entry_id: uuid.UUID, body: FoodEntryUpdate, current_user: ConsentedUser, db: DbSession
) -> FoodEntryResponse:
    """Change grams and/or Meal of the user's entry; the date and kcal snapshot never change."""
    return service.update_entry(db, current_user.id, entry_id, body)


@router.delete(
    "/entries/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_food_entry",
    responses=ENTRY_NOT_FOUND,
)
def delete_food_entry(
    entry_id: uuid.UUID, current_user: ConsentedUser, db: DbSession, now: Now
) -> Response:
    """Delete the user's entry at once; it can be restored for 10 minutes."""
    service.delete_entry(db, current_user.id, entry_id, now)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/entries/{entry_id}/restore",
    response_model=FoodEntryResponse,
    operation_id="restore_food_entry",
    responses=ENTRY_NOT_FOUND,
)
def restore_food_entry(
    entry_id: uuid.UUID, current_user: ConsentedUser, db: DbSession, now: Now
) -> FoodEntryResponse:
    """Undo a delete made within the last 10 minutes ("Angre"); otherwise 404."""
    return service.restore_entry(db, current_user.id, entry_id, now)
