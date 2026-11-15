"""Request and response bodies for /api/profile."""

from datetime import datetime
from typing import Annotated, Any

from pydantic import AfterValidator, BaseModel, BeforeValidator
from pydantic_core import PydanticCustomError

from app.core.errors import FIELD_MESSAGE_ERROR
from app.modules.profile.calculator import ActivityLevel, Goal, Sex

WEIGHT_MIN, WEIGHT_MAX = 30, 300
HEIGHT_MIN, HEIGHT_MAX = 100, 250
AGE_MIN, AGE_MAX = 16, 100

WEIGHT_RANGE_MESSAGE = "Vekt må være mellom 30 og 300 kg."
WEIGHT_DECIMALS_MESSAGE = "Skriv vekten med høyst én desimal."
HEIGHT_RANGE_MESSAGE = "Høyde må være mellom 100 og 250 cm."
HEIGHT_WHOLE_MESSAGE = "Skriv høyden i hele centimeter."
AGE_RANGE_MESSAGE = "Alder må være mellom 16 og 100 år."
AGE_WHOLE_MESSAGE = "Skriv alderen i hele år."


def _field_error(message: str) -> PydanticCustomError:
    return PydanticCustomError(FIELD_MESSAGE_ERROR, message)


def _whole(message: str):
    def check(value: Any) -> Any:
        # Other wrong types fall through to the int validation (generic message).
        if isinstance(value, float) and not value.is_integer():
            raise _field_error(message)
        return value

    return check


def _in_range(low: float, high: float, message: str):
    def check(value: float) -> float:
        if not low <= value <= high:
            raise _field_error(message)
        return value

    return check


def _one_decimal(value: float) -> float:
    if abs(value * 10 - round(value * 10)) > 1e-9:
        raise _field_error(WEIGHT_DECIMALS_MESSAGE)
    return round(value, 1)


WeightKg = Annotated[
    float,
    AfterValidator(_in_range(WEIGHT_MIN, WEIGHT_MAX, WEIGHT_RANGE_MESSAGE)),
    AfterValidator(_one_decimal),
]
HeightCm = Annotated[
    int,
    BeforeValidator(_whole(HEIGHT_WHOLE_MESSAGE)),
    AfterValidator(_in_range(HEIGHT_MIN, HEIGHT_MAX, HEIGHT_RANGE_MESSAGE)),
]
AgeYears = Annotated[
    int,
    BeforeValidator(_whole(AGE_WHOLE_MESSAGE)),
    AfterValidator(_in_range(AGE_MIN, AGE_MAX, AGE_RANGE_MESSAGE)),
]


class ProfileRequest(BaseModel):
    sex: Sex
    weight_kg: WeightKg
    height_cm: HeightCm
    age: AgeYears
    activity_level: ActivityLevel
    goal: Goal


class ProfileResponse(BaseModel):
    sex: Sex
    weight_kg: float
    height_cm: int
    age: int
    activity_level: ActivityLevel
    goal: Goal
    # The daily target in whole kcal, computed and stored by the backend.
    target_kcal: int
    # True when the target was raised to the safe minimum (1 200 / 1 500 kcal).
    floor_applied: bool
    updated_at: datetime
