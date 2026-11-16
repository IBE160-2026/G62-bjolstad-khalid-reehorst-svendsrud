"""GET /api/food/recent (story 3.4): distinct recent items with the last grams and Meal."""

import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.food.models import FoodItem, FoodLogEntry
from app.modules.identity.models import User
from tests.conftest import Clock

RECENT_URL = "/api/food/recent"
ENTRIES_URL = "/api/food/entries"
CONSENT_URL = "/api/identity/consent"
DAY = "2026-11-16"


@pytest.fixture
def consented_client(logged_in_client: Callable[..., TestClient]) -> Callable[..., TestClient]:
    def factory(email: str = "sara@eksempel.no") -> TestClient:
        test_client = logged_in_client(email)
        assert test_client.post(CONSENT_URL).status_code == 200
        return test_client

    return factory


def _user_id(db: Session, email: str) -> uuid.UUID:
    return db.scalars(select(User.id).where(User.email == email)).one()


def _add_item(db: Session, name: str, kcal: str = "100", owner_email: str | None = None):
    owner_id = _user_id(db, owner_email) if owner_email else None
    item = FoodItem(
        source="user" if owner_id else "matvaretabellen",
        owner_id=owner_id,
        name=name,
        kcal_per_100g=Decimal(kcal),
    )
    db.add(item)
    db.commit()
    return item


def _log(client: TestClient, item: FoodItem, grams: float, meal: str = "lunch",
         day: str = DAY) -> None:
    response = client.post(
        ENTRIES_URL,
        json={"food_item_id": str(item.id), "date": day, "meal": meal, "grams": grams},
    )
    assert response.status_code == 201, response.text


def _recent(client: TestClient) -> list[dict]:
    response = client.get(RECENT_URL)
    assert response.status_code == 200, response.text
    return response.json()


def test_new_user_has_no_recent_foods(consented_client: Callable[..., TestClient]) -> None:
    assert _recent(consented_client()) == []


def test_each_item_once_newest_first_with_latest_grams_and_meal(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    oats = _add_item(db_session, "Havremel", "369")
    milk = _add_item(db_session, "Lettmelk", "37")
    _log(client, oats, 100, "breakfast")
    _log(client, oats, 120, "dinner")
    _log(client, milk, 200, "breakfast")
    _log(client, oats, 150, "lunch")

    recent = _recent(client)

    assert [item["name"] for item in recent] == ["Havremel", "Lettmelk"]
    assert recent[0]["id"] == str(oats.id)
    assert (recent[0]["last_grams"], recent[0]["last_meal"]) == (150, "lunch")
    assert (recent[1]["last_grams"], recent[1]["last_meal"]) == (200, "breakfast")
    assert recent[0]["kcal_per_100g"] == 369
    assert recent[0]["source"] == "matvaretabellen"


def test_at_most_ten_newest_items(
    consented_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = consented_client()
    for number in range(12):
        # A distinct logging time each, so the order never falls back to the random id.
        clock.advance(timedelta(minutes=1))
        _log(client, _add_item(db_session, f"Vare {number:02d}"), 100)

    recent = _recent(client)

    assert [item["name"] for item in recent] == [f"Vare {n:02d}" for n in range(11, 1, -1)]


def test_ordered_by_entry_date_then_logging_time(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    bread = _add_item(db_session, "Brød")
    egg = _add_item(db_session, "Egg")
    rice = _add_item(db_session, "Ris")
    _log(client, bread, 80, day="2026-11-16")
    # Logged later, but for earlier dates.
    _log(client, egg, 60, day="2026-11-10")
    _log(client, rice, 150, day="2026-11-12")
    _log(client, egg, 120, "dinner", day="2026-11-12")

    recent = _recent(client)

    assert [item["name"] for item in recent] == ["Brød", "Egg", "Ris"]
    assert (recent[1]["last_grams"], recent[1]["last_meal"]) == (120, "dinner")


def test_an_earlier_date_logged_later_does_not_replace_the_latest_entry(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    oats = _add_item(db_session, "Havremel", "369")
    _log(client, oats, 150, "lunch", day="2026-11-16")
    _log(client, oats, 50, "snack", day="2026-11-01")

    recent = _recent(client)

    assert (recent[0]["last_grams"], recent[0]["last_meal"]) == (150, "lunch")


def test_other_users_entries_are_never_shown(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    sara = consented_client("sara@eksempel.no")
    ola = consented_client("ola@eksempel.no")
    oats = _add_item(db_session, "Havremel", "369")
    olas = _add_item(db_session, "Olas brød", "250", owner_email="ola@eksempel.no")
    _log(ola, oats, 100)
    _log(ola, olas, 100)

    assert _recent(sara) == []
    assert [item["name"] for item in _recent(ola)] == ["Olas brød", "Havremel"]


def test_items_the_user_cannot_see_are_left_out(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client("sara@eksempel.no")
    consented_client("ola@eksempel.no")
    oats = _add_item(db_session, "Havremel", "369")
    olas = _add_item(db_session, "Olas brød", "250", owner_email="ola@eksempel.no")
    _log(client, oats, 100)
    # An entry pointing at an item Sara cannot see (not possible through the API).
    db_session.add(
        FoodLogEntry(
            user_id=_user_id(db_session, "sara@eksempel.no"),
            food_item_id=olas.id,
            date=datetime(2026, 11, 17).date(),
            meal="lunch",
            grams=Decimal(100),
            kcal_per_100g_snapshot=Decimal(250),
            created_at=datetime.now(UTC),
        )
    )
    db_session.commit()

    assert [item["name"] for item in _recent(client)] == ["Havremel"]


def test_limit_counts_only_items_the_user_can_see(
    consented_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = consented_client("sara@eksempel.no")
    consented_client("ola@eksempel.no")
    for number in range(10):
        clock.advance(timedelta(minutes=1))
        _log(client, _add_item(db_session, f"Vare {number:02d}"), 100)
    olas = _add_item(db_session, "Olas brød", "250", owner_email="ola@eksempel.no")
    # A newer entry (later date) for an item Sara cannot see.
    db_session.add(
        FoodLogEntry(
            user_id=_user_id(db_session, "sara@eksempel.no"),
            food_item_id=olas.id,
            date=datetime(2026, 11, 17).date(),
            meal="lunch",
            grams=Decimal(100),
            kcal_per_100g_snapshot=Decimal(250),
            created_at=clock.now + timedelta(minutes=1),
        )
    )
    db_session.commit()

    recent = _recent(client)

    assert [item["name"] for item in recent] == [f"Vare {n:02d}" for n in range(9, -1, -1)]


def test_requires_consent(logged_in_client: Callable[..., TestClient]) -> None:
    response = logged_in_client().get(RECENT_URL)

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "consent_required"


def test_requires_login(client: TestClient) -> None:
    assert client.get(RECENT_URL).status_code == 401
