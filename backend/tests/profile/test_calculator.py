"""The daily calorie target (NFR-8): every example from epic-2-context.md, no tolerance."""

from decimal import Decimal

import pytest

from app.modules.profile.calculator import (
    ActivityLevel,
    CalorieTarget,
    Goal,
    Sex,
    calculate_target,
)

F, M = Sex.FEMALE, Sex.MALE
A = ActivityLevel


@pytest.mark.parametrize(
    ("sex", "weight", "height", "age", "activity", "goal", "expected"),
    [
        (M, "80", 180, 25, A.MODERATE, Goal.MAINTAIN, 2798),
        (M, "80", 180, 25, A.MODERATE, Goal.LOSE, 2298),
        (M, "80", 180, 25, A.MODERATE, Goal.GAIN, 3098),
        (F, "65", 165, 30, A.LIGHT, Goal.MAINTAIN, 1884),
        (M, "95", 178, 50, A.SEDENTARY, Goal.MAINTAIN, 2181),
        (F, "55", 160, 22, A.VERY_ACTIVE, Goal.MAINTAIN, 2206),
        (F, "82", 162, 23, A.LIGHT, Goal.LOSE, 1640),  # Sara
    ],
)
def test_examples_match_exactly(
    sex: Sex,
    weight: str,
    height: int,
    age: int,
    activity: ActivityLevel,
    goal: Goal,
    expected: int,
) -> None:
    result = calculate_target(sex, Decimal(weight), height, age, activity, goal)

    assert result == CalorieTarget(target_kcal=expected, floor_applied=False)


def test_extremely_active_factor() -> None:
    # Base 1805 × 1.9 = 3429.5, a half that rounds up.
    result = calculate_target(M, Decimal(80), 180, 25, A.EXTREMELY_ACTIVE, Goal.MAINTAIN)

    assert result.target_kcal == 3430


def test_female_floor_is_applied_after_the_goal_adjustment() -> None:
    # The formula gives 612 kcal.
    result = calculate_target(F, Decimal(45), 150, 60, A.SEDENTARY, Goal.LOSE)

    assert result == CalorieTarget(target_kcal=1200, floor_applied=True)


def test_male_floor_is_1500() -> None:
    # Base 450 + 937.5 - 300 + 5 = 1092.5; × 1.2 - 500 = 811.
    result = calculate_target(M, Decimal(45), 150, 60, A.SEDENTARY, Goal.LOSE)

    assert result == CalorieTarget(target_kcal=1500, floor_applied=True)


def test_floor_applies_only_below_it() -> None:
    # Female base 10w + 937.5 - 300 - 161 = 10w + 476.5; × 1.2 = 12w + 571.8. With w = 52.4:
    # 628.8 + 571.8 = 1200.6 → 1201. With w = 52.3: 1199.4 → 1199 → floor.
    above = calculate_target(F, Decimal("52.4"), 150, 60, A.SEDENTARY, Goal.MAINTAIN)
    below = calculate_target(F, Decimal("52.3"), 150, 60, A.SEDENTARY, Goal.MAINTAIN)

    assert above == CalorieTarget(target_kcal=1201, floor_applied=False)
    assert below == CalorieTarget(target_kcal=1200, floor_applied=True)
