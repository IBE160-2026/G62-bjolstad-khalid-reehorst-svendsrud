"""Request and response bodies for /api/food."""

import datetime as dt
import uuid
from enum import StrEnum
from typing import Annotated

from pydantic import AfterValidator, BaseModel
from pydantic_core import PydanticCustomError

from app.core.errors import FIELD_MESSAGE_ERROR

GRAMS_MAX = 5000
GRAMS_MIN_MESSAGE = "Skriv inn en mengde over 0 g."
GRAMS_MAX_MESSAGE = "Skriv inn en mengde på høyst 5 000 g."
GRAMS_DECIMALS_MESSAGE = "Skriv mengden med høyst én desimal."


class Meal(StrEnum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


class FoodSource(StrEnum):
    MATVARETABELLEN = "matvaretabellen"
    OFF = "off"
    USER = "user"


def _grams(value: float) -> float:
    if value <= 0:
        raise PydanticCustomError(FIELD_MESSAGE_ERROR, GRAMS_MIN_MESSAGE)
    if value > GRAMS_MAX:
        raise PydanticCustomError(FIELD_MESSAGE_ERROR, GRAMS_MAX_MESSAGE)
    if abs(value * 10 - round(value * 10)) > 1e-9:
        raise PydanticCustomError(FIELD_MESSAGE_ERROR, GRAMS_DECIMALS_MESSAGE)
    return round(value, 1)


Grams = Annotated[float, AfterValidator(_grams)]


class FoodItemResponse(BaseModel):
    id: uuid.UUID
    name: str
    source: FoodSource
    kcal_per_100g: float
    protein_g: float | None
    carbs_g: float | None
    fat_g: float | None


class FoodEntryRequest(BaseModel):
    food_item_id: uuid.UUID
    # The calendar date in Europe/Oslo, chosen by the client (AD-12).
    date: dt.date
    meal: Meal
    grams: Grams


class FoodEntryResponse(BaseModel):
    id: uuid.UUID
    food_item_id: uuid.UUID
    name: str
    date: dt.date
    meal: Meal
    grams: float
    kcal_per_100g_snapshot: float
    # grams × snapshot / 100, unrounded; round only for display.
    kcal: float
    created_at: dt.datetime


class MealSummary(BaseModel):
    meal: Meal
    entries: list[FoodEntryResponse]
    # Sum of the entries' unrounded kcal.
    total_kcal: float


class FoodDayResponse(BaseModel):
    date: dt.date
    # Always the four Meals, in order: breakfast, lunch, dinner, snack.
    meals: list[MealSummary]
    total_kcal: float
