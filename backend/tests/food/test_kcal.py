"""Pure kcal rules (AD-5): per entry, per Meal and per date, unrounded."""

from decimal import Decimal

from app.modules.food.service import entry_kcal, sum_kcal


def test_entry_kcal_is_grams_times_snapshot_over_100_unrounded() -> None:
    assert entry_kcal(Decimal("150"), Decimal("63")) == Decimal("94.5")
    assert entry_kcal(Decimal("50"), Decimal("63")) == Decimal("31.5")
    assert entry_kcal(Decimal("33.3"), Decimal("369")) == Decimal("122.877")


def test_sum_kcal_adds_unrounded_values() -> None:
    lunch = sum_kcal([Decimal("31.5"), Decimal("63")])

    assert lunch == Decimal("94.5")
    assert sum_kcal([lunch, Decimal("0.4"), Decimal("0.4")]) == Decimal("95.3")


def test_sum_kcal_of_nothing_is_zero() -> None:
    assert sum_kcal([]) == 0
