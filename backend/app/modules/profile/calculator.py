"""The daily calorie target ("dagens mål"): one pure function, no I/O (AD-5).

Only this module computes the target. The service stores the result on the profile on
every save (AD-17); every other module and the frontend read the stored number.
Decimal arithmetic keeps the result exact, and halves round up, never to even.
"""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from enum import StrEnum


class Sex(StrEnum):
    FEMALE = "female"
    MALE = "male"


class ActivityLevel(StrEnum):
    SEDENTARY = "sedentary"
    LIGHT = "light"
    MODERATE = "moderate"
    VERY_ACTIVE = "very_active"
    EXTREMELY_ACTIVE = "extremely_active"


class Goal(StrEnum):
    LOSE = "lose"
    MAINTAIN = "maintain"
    GAIN = "gain"


SEX_CONSTANT: dict[Sex, Decimal] = {Sex.MALE: Decimal(5), Sex.FEMALE: Decimal(-161)}

ACTIVITY_FACTORS: dict[ActivityLevel, Decimal] = {
    ActivityLevel.SEDENTARY: Decimal("1.2"),
    ActivityLevel.LIGHT: Decimal("1.375"),
    ActivityLevel.MODERATE: Decimal("1.55"),
    ActivityLevel.VERY_ACTIVE: Decimal("1.725"),
    ActivityLevel.EXTREMELY_ACTIVE: Decimal("1.9"),
}

GOAL_ADJUSTMENT: dict[Goal, Decimal] = {
    Goal.LOSE: Decimal(-500),
    Goal.MAINTAIN: Decimal(0),
    Goal.GAIN: Decimal(300),
}

# Safe minimum per sex, applied after the goal adjustment.
FLOOR_KCAL: dict[Sex, int] = {Sex.FEMALE: 1200, Sex.MALE: 1500}


@dataclass(frozen=True)
class CalorieTarget:
    target_kcal: int
    floor_applied: bool


def calculate_target(
    sex: Sex,
    weight_kg: Decimal,
    height_cm: int,
    age: int,
    activity_level: ActivityLevel,
    goal: Goal,
) -> CalorieTarget:
    """Base × activity factor + goal adjustment, rounded to whole kcal, then floored."""
    base = 10 * weight_kg + Decimal("6.25") * height_cm - 5 * age + SEX_CONSTANT[sex]
    raw = base * ACTIVITY_FACTORS[activity_level] + GOAL_ADJUSTMENT[goal]
    target = int(raw.quantize(Decimal(1), rounding=ROUND_HALF_UP))
    floor = FLOOR_KCAL[sex]
    if target < floor:
        return CalorieTarget(target_kcal=floor, floor_applied=True)
    return CalorieTarget(target_kcal=target, floor_applied=False)
