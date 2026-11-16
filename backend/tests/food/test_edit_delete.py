"""PATCH/DELETE /api/food/entries/{id} and POST .../restore (story 3.6)."""

import uuid
from collections.abc import Callable
from datetime import timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.food.models import FoodItem, FoodLogEntry
from tests.conftest import Clock

ENTRIES_URL = "/api/food/entries"
RECENT_URL = "/api/food/recent"
CONSENT_URL = "/api/identity/consent"
DAY = "2026-11-16"


@pytest.fixture
def consented_client(logged_in_client: Callable[..., TestClient]) -> Callable[..., TestClient]:
    def factory(email: str = "sara@eksempel.no") -> TestClient:
        test_client = logged_in_client(email)
        assert test_client.post(CONSENT_URL).status_code == 200
        return test_client

    return factory


def _add_item(db: Session, name: str = "Helmelk", kcal: str = "63") -> FoodItem:
    item = FoodItem(source="matvaretabellen", name=name, kcal_per_100g=Decimal(kcal))
    db.add(item)
    db.commit()
    return item


def _log(client: TestClient, item: FoodItem, grams: float = 150, meal: str = "lunch") -> dict:
    response = client.post(
        ENTRIES_URL,
        json={"food_item_id": str(item.id), "date": DAY, "meal": meal, "grams": grams},
    )
    assert response.status_code == 201, response.text
    return response.json()


def _day(client: TestClient) -> dict:
    response = client.get(ENTRIES_URL, params={"date": DAY})
    assert response.status_code == 200, response.text
    return response.json()


def _meal(day: dict, meal: str) -> dict:
    return next(summary for summary in day["meals"] if summary["meal"] == meal)


def _stored(db: Session, entry_id: str) -> FoodLogEntry:
    db.expire_all()
    return db.scalars(select(FoodLogEntry).where(FoodLogEntry.id == uuid.UUID(entry_id))).one()


# --- Edit -----------------------------------------------------------------------------


def test_edit_grams_changes_kcal_and_totals_but_not_snapshot(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    milk = _add_item(db_session)
    entry = _log(client, milk, 150)
    before = _day(client)

    # The item changes after logging; the entry keeps its snapshot (AD-6).
    milk.kcal_per_100g = Decimal("70")
    db_session.commit()

    response = client.patch(f"{ENTRIES_URL}/{entry['id']}", json={"grams": 200})

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["id"] == entry["id"]
    assert body["grams"] == 200
    assert body["kcal"] == pytest.approx(126)
    assert body["kcal_per_100g_snapshot"] == 63
    assert (body["source"], body["serving_size_g"]) == ("matvaretabellen", None)
    assert body["meal"] == "lunch"
    assert body["date"] == DAY
    after = _day(client)
    assert _meal(after, "lunch")["total_kcal"] - _meal(before, "lunch")["total_kcal"] == (
        pytest.approx(31.5)
    )
    assert after["total_kcal"] - before["total_kcal"] == pytest.approx(31.5)
    assert _stored(db_session, entry["id"]).kcal_per_100g_snapshot == Decimal("63")


def test_edit_meal_moves_the_entry_and_its_kcal(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    entry = _log(client, _add_item(db_session), 150, "lunch")

    response = client.patch(f"{ENTRIES_URL}/{entry['id']}", json={"meal": "dinner"})

    assert response.status_code == 200, response.text
    assert response.json()["grams"] == 150
    day = _day(client)
    assert _meal(day, "lunch")["entries"] == []
    assert _meal(day, "lunch")["total_kcal"] == 0
    assert [e["id"] for e in _meal(day, "dinner")["entries"]] == [entry["id"]]
    assert _meal(day, "dinner")["total_kcal"] == pytest.approx(94.5)
    assert day["total_kcal"] == pytest.approx(94.5)


def test_edit_ignores_date_item_and_snapshot_in_the_body(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    milk = _add_item(db_session)
    other = _add_item(db_session, "Havremel", "369")
    entry = _log(client, milk, 150)

    response = client.patch(
        f"{ENTRIES_URL}/{entry['id']}",
        json={
            "grams": 100,
            "date": "2026-01-01",
            "food_item_id": str(other.id),
            "kcal_per_100g_snapshot": 999,
        },
    )

    assert response.status_code == 200, response.text
    stored = _stored(db_session, entry["id"])
    assert str(stored.date) == DAY
    assert stored.food_item_id == milk.id
    assert stored.kcal_per_100g_snapshot == Decimal("63")


@pytest.mark.parametrize(
    ("grams", "message"),
    [
        (0, "Skriv inn en mengde over 0 g."),
        (5000.1, "Skriv inn en mengde på høyst 5 000 g."),
        (12.34, "Skriv mengden med høyst én desimal."),
    ],
)
def test_bad_grams_give_field_error_and_change_nothing(
    consented_client: Callable[..., TestClient], db_session: Session, grams: float, message: str
) -> None:
    client = consented_client()
    entry = _log(client, _add_item(db_session), 150)

    response = client.patch(f"{ENTRIES_URL}/{entry['id']}", json={"grams": grams})

    assert response.status_code == 422
    assert response.json()["error"]["fields"] == [{"field": "grams", "message": message}]
    assert _stored(db_session, entry["id"]).grams == Decimal("150")


def test_unknown_meal_is_a_field_error(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    entry = _log(client, _add_item(db_session), 150)

    response = client.patch(f"{ENTRIES_URL}/{entry['id']}", json={"meal": "brunch"})

    assert response.status_code == 422
    assert response.json()["error"]["fields"][0]["field"] == "meal"
    assert _stored(db_session, entry["id"]).meal == "lunch"


# --- Delete and restore ---------------------------------------------------------------


def test_delete_hides_the_entry_from_day_sums_and_recent(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    milk = _add_item(db_session)
    oats = _add_item(db_session, "Havremel", "369")
    _log(client, oats, 50, "breakfast")
    entry = _log(client, milk, 150)

    response = client.delete(f"{ENTRIES_URL}/{entry['id']}")

    assert response.status_code == 204
    assert response.content == b""
    day = _day(client)
    assert _meal(day, "lunch")["entries"] == []
    assert _meal(day, "lunch")["total_kcal"] == 0
    assert day["total_kcal"] == pytest.approx(184.5)
    assert [item["name"] for item in client.get(RECENT_URL).json()] == ["Havremel"]
    assert _stored(db_session, entry["id"]).deleted_at is not None


def test_recent_falls_back_to_an_older_live_entry_of_the_same_item(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    milk = _add_item(db_session)
    _log(client, milk, 100, "breakfast")
    newest = _log(client, milk, 300, "dinner")

    assert client.delete(f"{ENTRIES_URL}/{newest['id']}").status_code == 204

    [recent] = client.get(RECENT_URL).json()
    assert (recent["last_grams"], recent["last_meal"]) == (100, "breakfast")


def test_deleted_entry_cannot_be_edited_or_deleted_again(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    entry = _log(client, _add_item(db_session), 150)
    assert client.delete(f"{ENTRIES_URL}/{entry['id']}").status_code == 204

    for response in (
        client.patch(f"{ENTRIES_URL}/{entry['id']}", json={"grams": 10}),
        client.delete(f"{ENTRIES_URL}/{entry['id']}"),
    ):
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "food_entry_not_found"


def test_restore_brings_back_the_same_entry(
    consented_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = consented_client()
    entry = _log(client, _add_item(db_session), 150)
    assert client.delete(f"{ENTRIES_URL}/{entry['id']}").status_code == 204
    clock.advance(timedelta(minutes=9, seconds=59))

    response = client.post(f"{ENTRIES_URL}/{entry['id']}/restore")

    assert response.status_code == 200, response.text
    assert response.json() == entry
    assert [e["id"] for e in _meal(_day(client), "lunch")["entries"]] == [entry["id"]]
    assert _stored(db_session, entry["id"]).deleted_at is None


def test_restore_after_10_minutes_is_not_found(
    consented_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = consented_client()
    entry = _log(client, _add_item(db_session), 150)
    assert client.delete(f"{ENTRIES_URL}/{entry['id']}").status_code == 204
    clock.advance(timedelta(minutes=10))

    response = client.post(f"{ENTRIES_URL}/{entry['id']}/restore")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "food_entry_not_found"
    assert _meal(_day(client), "lunch")["entries"] == []


def test_restore_of_a_live_or_missing_entry_is_not_found(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    entry = _log(client, _add_item(db_session), 150)

    for entry_id in (entry["id"], str(uuid.uuid4())):
        response = client.post(f"{ENTRIES_URL}/{entry_id}/restore")
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "food_entry_not_found"


# --- Access control -------------------------------------------------------------------


def test_another_users_entry_is_not_found_and_unchanged(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    ola = consented_client("ola@eksempel.no")
    kari = consented_client("kari@eksempel.no")
    entry = _log(ola, _add_item(db_session), 150)
    url = f"{ENTRIES_URL}/{entry['id']}"

    responses = [
        kari.patch(url, json={"grams": 10, "meal": "dinner"}),
        kari.delete(url),
        kari.post(f"{url}/restore"),
    ]

    for response in responses:
        assert response.status_code == 404
        error = response.json()["error"]
        assert error["code"] == "food_entry_not_found"
        assert entry["id"] not in response.text
        assert "Helmelk" not in response.text
    stored = _stored(db_session, entry["id"])
    assert (stored.grams, stored.meal, stored.deleted_at) == (Decimal("150"), "lunch", None)

    # Kari cannot restore Ola's own delete either.
    assert ola.delete(url).status_code == 204
    assert kari.post(f"{url}/restore").status_code == 404
    assert _stored(db_session, entry["id"]).deleted_at is not None


def test_missing_entry_is_not_found(consented_client: Callable[..., TestClient]) -> None:
    client = consented_client()
    url = f"{ENTRIES_URL}/{uuid.uuid4()}"

    assert client.patch(url, json={"grams": 10}).json()["error"]["code"] == "food_entry_not_found"
    assert client.delete(url).status_code == 404


@pytest.mark.parametrize(
    ("method", "suffix", "kwargs"),
    [
        ("patch", "", {"json": {"grams": 10}}),
        ("delete", "", {}),
        ("post", "/restore", {}),
    ],
)
def test_entry_mutations_require_consent(
    logged_in_client: Callable[..., TestClient], method: str, suffix: str, kwargs: dict
) -> None:
    url = f"{ENTRIES_URL}/{uuid.uuid4()}{suffix}"

    response = getattr(logged_in_client(), method)(url, **kwargs)

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "consent_required"
