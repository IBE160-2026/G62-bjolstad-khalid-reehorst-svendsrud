"""GET /api/overview (story 6.1): sums, over target, done workouts, empty day, no profile,
isolation, future dates and consent."""

from collections.abc import Callable, Iterator
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text
from sqlalchemy.orm import Session

from app.modules.food.models import FoodItem
from tests.conftest import Clock
from tests.workouts.test_workouts_api import (  # noqa: F401 (fixtures)
    PUSH_UP,
    SQUAT,
    URL as WORKOUTS_URL,
    _add,
    _ex,
    _start,
    consented_client,
    seeded,
)

URL = "/api/overview"
ENTRIES_URL = "/api/food/entries"
PROFILE_URL = "/api/profile"
DAY = "2026-11-16"
# Sara's example profile gives exactly 1 640 kcal (EXPERIENCE.md).
SARA = {
    "sex": "female",
    "weight_kg": 82,
    "height_cm": 162,
    "age": 23,
    "activity_level": "light",
    "goal": "lose",
}


@pytest.fixture(autouse=True)
def remove_test_food(test_engine: Engine) -> Iterator[None]:
    """Set up before the app, so this runs after its teardown has removed the entries."""
    yield
    with test_engine.begin() as conn:
        conn.execute(text("DELETE FROM food_items WHERE name LIKE 'Testmat %'"))


@pytest.fixture(autouse=True)
def fixed_clock(remove_test_food: None, clock: Clock) -> Clock:
    clock.now = datetime(2026, 11, 16, 20, 0, tzinfo=UTC)
    return clock


def _food(db: Session, kcal: str) -> str:
    """A shared item with `kcal` per 100 g, so 100 g logs exactly `kcal`."""
    item = FoodItem(source="matvaretabellen", name=f"Testmat {kcal}", kcal_per_100g=Decimal(kcal))
    db.add(item)
    db.commit()
    return str(item.id)


def _log(client: TestClient, item_id: str, meal: str = "lunch", day: str = DAY) -> None:
    response = client.post(
        ENTRIES_URL, json={"food_item_id": item_id, "date": day, "meal": meal, "grams": 100}
    )
    assert response.status_code == 201, response.text


def _overview(client: TestClient, day: str = DAY) -> dict:
    response = client.get(URL, params={"date": day})
    assert response.status_code == 200, response.text
    return response.json()


def _tick(client: TestClient, workout: dict, index: int, count: int) -> dict:
    body = workout
    for set_ in workout["exercises"][index]["sets"][:count]:
        response = client.patch(
            f"{WORKOUTS_URL}/{workout['id']}/sets/{set_['id']}",
            json={"reps": 10, "weight_kg": 10, "done": True},
        )
        assert response.status_code == 200, response.text
        body = response.json()
    return body


def test_sums_target_eaten_and_remaining(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    assert client.put(PROFILE_URL, json=SARA).status_code == 200
    _log(client, _food(db_session, "900"), "breakfast")
    _log(client, _food(db_session, "520"), "dinner")

    body = _overview(client)

    assert body["date"] == DAY
    assert body["calorie_target"] == 1640
    assert body["kcal_eaten"] == 1420
    assert body["kcal_remaining"] == 220
    assert [meal["meal"] for meal in body["meals"]] == ["breakfast", "lunch", "dinner", "snack"]
    assert body["meals"][0]["total_kcal"] == 900
    assert body["meals"][0]["entries"][0]["name"] == "Testmat 900"
    assert body["meals"][2]["total_kcal"] == 520
    assert body["workouts"] == []


def test_over_target_gives_negative_remaining(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    client.put(PROFILE_URL, json=SARA)
    _log(client, _food(db_session, "880"))
    _log(client, _food(db_session, "880"), "snack")

    body = _overview(client)

    assert body["kcal_eaten"] == 1760
    assert body["kcal_remaining"] == -120


def test_empty_day_shows_the_full_target(consented_client: Callable[..., TestClient]) -> None:
    client = consented_client()
    client.put(PROFILE_URL, json=SARA)

    body = _overview(client, "2026-11-10")

    assert body["kcal_eaten"] == 0
    assert body["kcal_remaining"] == 1640
    assert all(meal["entries"] == [] for meal in body["meals"])
    assert body["workouts"] == []


def test_without_profile_target_is_null(consented_client: Callable[..., TestClient]) -> None:
    body = _overview(consented_client())

    assert body["calorie_target"] is None
    assert body["kcal_remaining"] is None
    assert body["kcal_eaten"] == 0


@pytest.mark.usefixtures("seeded")
def test_only_workouts_with_done_sets_and_only_done_sets(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    first = _add(client, _start(client, DAY).json()["id"], _ex(db_session, PUSH_UP)).json()
    first = _add(client, first["id"], _ex(db_session, SQUAT)).json()
    first = _tick(client, first, 0, 2)
    assert client.post(f"{WORKOUTS_URL}/{first['id']}/finish").status_code == 200
    # A second workout the same day with no done sets is left out.
    second = _add(client, _start(client, DAY).json()["id"], _ex(db_session, PUSH_UP)).json()
    assert second["id"] != first["id"]

    body = _overview(client)

    assert [w["id"] for w in body["workouts"]] == [first["id"]]
    exercises = body["workouts"][0]["exercises"]
    assert [e["exercise_id"] for e in exercises] == [_ex(db_session, PUSH_UP)]
    assert [(s["reps"], s["weight_kg"], s["done"]) for s in exercises[0]["sets"]] == [
        (10, 10, True),
        (10, 10, True),
    ]
    assert "last_time" in exercises[0]
    db_session.rollback()


@pytest.mark.usefixtures("seeded")
def test_training_adds_no_kcal(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    client.put(PROFILE_URL, json=SARA)
    workout = _add(client, _start(client, DAY).json()["id"], _ex(db_session, PUSH_UP)).json()
    _tick(client, workout, 0, 3)

    body = _overview(client)

    assert body["kcal_remaining"] == 1640
    assert len(body["workouts"][0]["exercises"][0]["sets"]) == 3
    db_session.rollback()


@pytest.mark.usefixtures("seeded")
def test_never_shows_another_users_data(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    sara = consented_client()
    sara.put(PROFILE_URL, json=SARA)
    _log(sara, _food(db_session, "500"))
    workout = _add(sara, _start(sara, DAY).json()["id"], _ex(db_session, PUSH_UP)).json()
    _tick(sara, workout, 0, 1)
    ola = consented_client("ola@eksempel.no")

    body = _overview(ola)

    assert body["calorie_target"] is None
    assert body["kcal_eaten"] == 0
    assert all(meal["entries"] == [] for meal in body["meals"])
    assert body["workouts"] == []
    db_session.rollback()


@pytest.mark.usefixtures("seeded")
def test_two_users_on_the_same_date_each_see_only_their_own(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    sara = consented_client()
    ola = consented_client("ola@eksempel.no")
    _log(sara, _food(db_session, "500"), "breakfast")
    _log(ola, _food(db_session, "300"), "dinner")
    sara_workout = _add(sara, _start(sara, DAY).json()["id"], _ex(db_session, PUSH_UP)).json()
    _tick(sara, sara_workout, 0, 1)
    ola_workout = _add(ola, _start(ola, DAY).json()["id"], _ex(db_session, SQUAT)).json()
    _tick(ola, ola_workout, 0, 2)

    for client, kcal, name, workout, sets in [
        (sara, 500, "Testmat 500", sara_workout, 1),
        (ola, 300, "Testmat 300", ola_workout, 2),
    ]:
        body = _overview(client)
        assert body["kcal_eaten"] == kcal
        entries = [e["name"] for meal in body["meals"] for e in meal["entries"]]
        assert entries == [name]
        assert [w["id"] for w in body["workouts"]] == [workout["id"]]
        assert len(body["workouts"][0]["exercises"][0]["sets"]) == sets
    db_session.rollback()


def test_future_is_after_today_in_oslo(
    consented_client: Callable[..., TestClient], fixed_clock: Clock
) -> None:
    # 23:30 UTC on 16 Nov is 00:30 on 17 Nov in Oslo.
    fixed_clock.now = datetime(2026, 11, 16, 23, 30, tzinfo=UTC)
    client = consented_client()

    assert client.get(URL, params={"date": "2026-11-17"}).status_code == 200
    response = client.get(URL, params={"date": "2026-11-18"})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "date_in_future"


def test_future_date_uses_oslo_not_utc_tomorrow(
    consented_client: Callable[..., TestClient], fixed_clock: Clock
) -> None:
    # 12:00 UTC on 16 Nov is still 16 Nov in Oslo, so the 17th is in the future.
    fixed_clock.now = datetime(2026, 11, 16, 12, 0, tzinfo=UTC)

    assert consented_client().get(URL, params={"date": "2026-11-17"}).status_code == 422


@pytest.mark.parametrize("params", [{}, {"date": "i-dag"}, {"date": "2026-02-30"}])
def test_date_is_required_and_valid(
    consented_client: Callable[..., TestClient], params: dict
) -> None:
    assert consented_client().get(URL, params=params).status_code == 422


def test_requires_consent_and_login(
    logged_in_client: Callable[..., TestClient], client: TestClient
) -> None:
    response = logged_in_client("ny@eksempel.no").get(URL, params={"date": DAY})
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "consent_required"
    assert client.get(URL, params={"date": DAY}).status_code == 401
