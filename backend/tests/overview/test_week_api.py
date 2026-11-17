"""GET /api/overview/week (story 6.3): the week strip's marks per day, Monday start,
future days in Oslo, isolation and consent."""

from collections.abc import Callable
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import Clock
from tests.overview.test_overview_api import (  # noqa: F401 (fixtures)
    ENTRIES_URL,
    _food,
    _tick,
    remove_test_food,
)
from tests.workouts.test_workouts_api import (  # noqa: F401 (fixtures)
    PUSH_UP,
    URL as WORKOUTS_URL,
    _add,
    _ex,
    _start,
    consented_client,
    seeded,
)

URL = "/api/overview/week"
MONDAY = "2026-11-16"
WEEK = [f"2026-11-{day}" for day in range(16, 23)]


@pytest.fixture(autouse=True)
def thursday(remove_test_food: None, clock: Clock) -> Clock:  # noqa: F811
    # Thursday 19 November 2026, evening in Oslo.
    clock.now = datetime(2026, 11, 19, 18, 0, tzinfo=UTC)
    return clock


def _log(client: TestClient, item_id: str, day: str) -> dict:
    response = client.post(
        ENTRIES_URL, json={"food_item_id": item_id, "date": day, "meal": "lunch", "grams": 100}
    )
    assert response.status_code == 201, response.text
    return response.json()


def _week(client: TestClient, start: str = MONDAY) -> list[dict]:
    response = client.get(URL, params={"start": start})
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.usefixtures("seeded")
def test_marks_food_and_workouts_with_done_sets(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    item = _food(db_session, "300")
    _log(client, item, "2026-11-16")
    _log(client, item, "2026-11-18")
    deleted = _log(client, item, "2026-11-17")
    assert client.delete(f"{ENTRIES_URL}/{deleted['id']}").status_code == 204
    # A workout with a done set on the 18th, and one with no done set on the 17th.
    done = _add(client, _start(client, "2026-11-18").json()["id"], _ex(db_session, PUSH_UP))
    _tick(client, done.json(), 0, 1)
    assert client.post(f"{WORKOUTS_URL}/{done.json()['id']}/finish").status_code == 200
    _add(client, _start(client, "2026-11-17").json()["id"], _ex(db_session, PUSH_UP))
    # Another user's food and workout never show.
    other = consented_client("ola@eksempel.no")
    _log(other, item, "2026-11-19")

    days = _week(client)

    assert [day["date"] for day in days] == WEEK
    marks = {day["date"]: (day["has_food"], day["has_workout"]) for day in days}
    assert marks == {
        "2026-11-16": (True, False),
        "2026-11-17": (False, False),
        "2026-11-18": (True, True),
        "2026-11-19": (False, False),
        "2026-11-20": (False, False),
        "2026-11-21": (False, False),
        "2026-11-22": (False, False),
    }
    db_session.rollback()


def test_days_after_today_in_oslo_are_future(
    consented_client: Callable[..., TestClient], thursday: Clock
) -> None:
    # 23:30 UTC on the 19th is 00:30 on the 20th in Oslo.
    thursday.now = datetime(2026, 11, 19, 23, 30, tzinfo=UTC)

    days = _week(consented_client())

    assert [day["future"] for day in days] == [False] * 5 + [True] * 2


def test_a_later_week_is_all_future(consented_client: Callable[..., TestClient]) -> None:
    days = _week(consented_client(), "2026-11-23")

    assert all(day["future"] for day in days)
    assert not any(day["has_food"] or day["has_workout"] for day in days)


@pytest.mark.parametrize("start", ["2026-11-17", "2026-11-22"])
def test_start_must_be_a_monday(consented_client: Callable[..., TestClient], start: str) -> None:
    response = consented_client().get(URL, params={"start": start})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "week_start_not_monday"


def test_a_week_past_the_last_date_is_422(consented_client: Callable[..., TestClient]) -> None:
    # 9999-12-27 is a Monday; its Sunday would be after 9999-12-31.
    response = consented_client().get(URL, params={"start": "9999-12-27"})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "week_out_of_range"


@pytest.mark.usefixtures("seeded")
def test_an_unfinished_workout_counts_and_another_users_never_does(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    sara = consented_client()
    ola = consented_client("ola@eksempel.no")
    # Ola's finished workout with a done set on the 16th.
    other = _add(ola, _start(ola, "2026-11-16").json()["id"], _ex(db_session, PUSH_UP)).json()
    _tick(ola, other, 0, 1)
    assert ola.post(f"{WORKOUTS_URL}/{other['id']}/finish").status_code == 200
    # Sara's unfinished workout with a done set on the 17th.
    mine = _add(sara, _start(sara, "2026-11-17").json()["id"], _ex(db_session, PUSH_UP)).json()
    _tick(sara, mine, 0, 1)

    marks = {day["date"]: day["has_workout"] for day in _week(sara)}

    assert marks["2026-11-16"] is False
    assert marks["2026-11-17"] is True
    assert {day["date"]: day["has_workout"] for day in _week(ola)}["2026-11-16"] is True
    db_session.rollback()


@pytest.mark.parametrize("params", [{}, {"start": "mandag"}, {"start": "2026-02-30"}])
def test_start_is_required_and_valid(
    consented_client: Callable[..., TestClient], params: dict
) -> None:
    assert consented_client().get(URL, params=params).status_code == 422


def test_requires_consent_and_login(
    logged_in_client: Callable[..., TestClient], client: TestClient
) -> None:
    response = logged_in_client("ny@eksempel.no").get(URL, params={"start": MONDAY})
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "consent_required"
    assert client.get(URL, params={"start": MONDAY}).status_code == 401
