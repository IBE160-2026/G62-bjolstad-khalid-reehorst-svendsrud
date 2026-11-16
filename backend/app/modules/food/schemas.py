"""Request and response bodies for /api/food."""

import datetime as dt
import uuid
from enum import StrEnum
from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field, ValidationInfo, field_validator
from pydantic_core import PydanticCustomError

from app.core.errors import FIELD_MESSAGE_ERROR
from app.modules.food.barcode import INVALID_BARCODE_MESSAGE, is_valid_ean

GRAMS_MAX = 5000
GRAMS_MIN_MESSAGE = "Skriv inn en mengde over 0 g."
GRAMS_MAX_MESSAGE = "Skriv inn en mengde på høyst 5 000 g."
GRAMS_DECIMALS_MESSAGE = "Skriv mengden med høyst én desimal."

# Own food items (story 3.2).
NAME_MAX = 200
KCAL_MAX = 900
MACRO_MAX = 100
SERVING_MIN, SERVING_MAX = 1, 2000
NAME_MESSAGE = "Skriv navnet på matvaren."
NAME_LENGTH_MESSAGE = "Skriv et navn på høyst 200 tegn."
KCAL_RANGE_MESSAGE = "Kalorier per 100 g må være mellom 0 og 900."
PROTEIN_RANGE_MESSAGE = "Protein må være mellom 0 og 100 g."
CARBS_RANGE_MESSAGE = "Karbohydrater må være mellom 0 og 100 g."
FAT_RANGE_MESSAGE = "Fett må være mellom 0 og 100 g."
MACROS_SUM_MESSAGE = "Protein, karbohydrater og fett kan til sammen ikke være mer enn 100 g."
SERVING_RANGE_MESSAGE = "Porsjonsstørrelse må være mellom 1 og 2 000 g."
DECIMALS_MESSAGE = "Skriv tallet med høyst én desimal."


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


def _field_error(message: str) -> PydanticCustomError:
    return PydanticCustomError(FIELD_MESSAGE_ERROR, message)


def _number(low: float, high: float, message: str):
    """low ≤ value ≤ high with at most one decimal."""

    def check(value: float) -> float:
        if not low <= value <= high:
            raise _field_error(message)
        if abs(value * 10 - round(value * 10)) > 1e-9:
            raise _field_error(DECIMALS_MESSAGE)
        return round(value, 1)

    return check


def _name(value: str) -> str:
    value = value.strip()
    if not value:
        raise _field_error(NAME_MESSAGE)
    if len(value) > NAME_MAX:
        raise _field_error(NAME_LENGTH_MESSAGE)
    return value


FoodName = Annotated[str, AfterValidator(_name)]


def _barcode(value: str | None) -> str | None:
    """Spaces are ignored; empty means no barcode; otherwise a valid EAN-8/13."""
    if value is None:
        return None
    value = "".join(value.split())
    if not value:
        return None
    if not is_valid_ean(value):
        raise _field_error(INVALID_BARCODE_MESSAGE)
    return value


Barcode = Annotated[str | None, AfterValidator(_barcode)]
KcalPer100g = Annotated[float, AfterValidator(_number(0, KCAL_MAX, KCAL_RANGE_MESSAGE))]
Protein = Annotated[float, AfterValidator(_number(0, MACRO_MAX, PROTEIN_RANGE_MESSAGE))]
Carbs = Annotated[float, AfterValidator(_number(0, MACRO_MAX, CARBS_RANGE_MESSAGE))]
Fat = Annotated[float, AfterValidator(_number(0, MACRO_MAX, FAT_RANGE_MESSAGE))]
ServingSize = Annotated[
    float, AfterValidator(_number(SERVING_MIN, SERVING_MAX, SERVING_RANGE_MESSAGE))
]


class FoodItemResponse(BaseModel):
    id: uuid.UUID
    name: str
    source: FoodSource
    kcal_per_100g: float
    protein_g: float | None
    carbs_g: float | None
    fat_g: float | None
    serving_size_g: float | None
    barcode: str | None


class RecentFoodResponse(FoodItemResponse):
    """A food item the user logged before, with the amount and Meal of its latest entry."""

    last_grams: float
    last_meal: Meal


class FoodItemCreate(BaseModel):
    """A user's own food item. `source` and `owner_id` are set by the server; extra keys
    such as those are ignored (AD-4)."""

    name: FoodName
    kcal_per_100g: KcalPer100g
    protein_g: Protein | None = None
    carbs_g: Carbs | None = None
    # validate_default so the sum check also runs when fat is left out.
    fat_g: Fat | None = Field(default=None, validate_default=True)
    serving_size_g: ServingSize | None = None
    # Optional (story 3.3); prefilled when the form is opened from a barcode lookup.
    barcode: Barcode = None

    @field_validator("fat_g", mode="after")
    @classmethod
    def _macros_sum(cls, fat: float | None, info: ValidationInfo) -> float | None:
        # Reported on fat_g (the last macro field), so it shows under the macro inputs.
        # Protein or carbs that failed their own check are missing here and not summed.
        total = sum(
            value
            for value in (info.data.get("protein_g"), info.data.get("carbs_g"), fat)
            if value is not None
        )
        if total > MACRO_MAX + 1e-9:
            raise _field_error(MACROS_SUM_MESSAGE)
        return fat


class FoodEntryRequest(BaseModel):
    food_item_id: uuid.UUID
    # The calendar date in Europe/Oslo, chosen by the client (AD-12).
    date: dt.date
    meal: Meal
    grams: Grams


class FoodEntryUpdate(BaseModel):
    """Change grams and/or Meal of an entry (story 3.6). Left out or null means unchanged;
    the item, date and kcal snapshot can never be changed (AD-6)."""

    grams: Grams | None = None
    meal: Meal | None = None


class FoodEntryResponse(BaseModel):
    id: uuid.UUID
    food_item_id: uuid.UUID
    name: str
    # The item's source and serving size, so editing can show attribution and servings.
    source: FoodSource
    serving_size_g: float | None
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
