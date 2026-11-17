"""Last time (story 5.3): the pure `last_time` rule and `last_time` in the workout response."""

import datetime as dt
import uuid
from collections.abc import Callable
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.workouts.service import HistoryRow, last_time
from tests.workouts.test_workouts_api import (  # noqa: F401 (fixtures)
    PLANK,
    PUSH_UP,
    SQUAT,
    URL,
    _add,
    _ex,
    _finish,
    _start,
    consented_client,
    seeded,
)

EXERCISE = uuid.uuid4()
OTHER_EXERCISE = uuid.uuid4()
TODAY = dt.date(2026, 11, 17)
BASE_TIME = dt.datetime(2026, 11, 1, 8, tzinfo=dt.UTC)


def _rows(
    date: dt.date,
    *sets: tuple[int | None, Decimal | None, int | None, bool],
    created_minutes: int = 0,
    exercise_id: uuid.UUID = EXERCISE,
    workout_id: uuid.UUID | None = None,
) -> list[HistoryRow]:
    """One workout's rows: each set is (reps, weight_kg, seconds, done), in position order."""
    workout_id = workout_id or uuid.uuid4()
    created = BASE_TIME + dt.timedelta(minutes=created_minutes)
    return [
        HistoryRow(workout_id, date, created, exercise_id, position, reps, kg, seconds, done)
        for position, (reps, kg, seconds, done) in enumerate(sets)
    ]


def _summary(result) -> tuple[dt.date, list[tuple]] | None:
    if result is None:
        return None
    return result.date, [(s.reps, s.weight_kg, s.seconds) for s in result.sets]


# --- Pure rule -------------------------------------------------------------------------


def test_no_history_is_none() -> None:
    assert last_time([], EXERCISE, TODAY) is None


def test_todays_workout_is_excluded() -> None:
    history = _rows(TODAY, (10, None, None, True))
    assert last_time(history, EXERCISE, TODAY) is None


def test_the_latest_date_wins() -> None:
    history = [
        *_rows(dt.date(2026, 11, 1), (5, None, None, True)),
        *_rows(dt.date(2026, 11, 3), (8, Decimal("8"), None, True), (8, Decimal("8"), None, True)),
    ]
    assert _summary(last_time(history, EXERCISE, TODAY)) == (
        dt.date(2026, 11, 3),
        [(8, 8.0, None), (8, 8.0, None)],
    )


def test_on_the_same_date_the_later_created_workout_wins() -> None:
    day = dt.date(2026, 11, 3)
    history = [
        *_rows(day, (12, None, None, True), created_minutes=60),
        *_rows(day, (6, None, None, True), created_minutes=0),
    ]
    assert _summary(last_time(history, EXERCISE, TODAY)) == (day, [(12, None, None)])


def test_sets_not_done_are_ignored_and_older_done_ones_used() -> None:
    history = [
        *_rows(dt.date(2026, 11, 1), (7, None, None, True)),
        *_rows(dt.date(2026, 11, 3), (9, None, None, False), (None, None, None, False)),
    ]
    assert _summary(last_time(history, EXERCISE, TODAY)) == (
        dt.date(2026, 11, 1),
        [(7, None, None)],
    )


def test_only_done_sets_with_a_value_count() -> None:
    history = _rows(
        dt.date(2026, 11, 3),
        (10, None, None, True),
        (11, None, None, False),
        (None, Decimal("20"), None, True),  # done without reps: no value, skipped
        (8, None, None, True),
    )
    assert _summary(last_time(history, EXERCISE, TODAY)) == (
        dt.date(2026, 11, 3),
        [(10, None, None), (8, None, None)],
    )


def test_a_later_date_is_not_used() -> None:
    history = [
        *_rows(dt.date(2026, 11, 20), (20, None, None, True)),
        *_rows(dt.date(2026, 11, 3), (10, None, None, True)),
    ]
    assert _summary(last_time(history, EXERCISE, TODAY)) == (
        dt.date(2026, 11, 3),
        [(10, None, None)],
    )


def test_other_exercises_are_ignored() -> None:
    history = _rows(dt.date(2026, 11, 3), (10, None, None, True), exercise_id=OTHER_EXERCISE)
    assert last_time(history, EXERCISE, TODAY) is None


def test_sets_come_in_position_order() -> None:
    workout_id = uuid.uuid4()
    rows = _rows(
        dt.date(2026, 11, 3),
        (1, None, None, True),
        (2, None, None, True),
        (3, None, None, True),
        workout_id=workout_id,
    )
    result = last_time(list(reversed(rows)), EXERCISE, TODAY)
    assert [s.reps for s in result.sets] == [1, 2, 3]


def test_kg_bodyweight_and_seconds_values_are_returned_as_numbers() -> None:
    history = [
        *_rows(
            dt.date(2026, 11, 3),
            (10, Decimal("8.00"), None, True),
            (10, None, None, True),
            (8, Decimal("12.50"), None, True),
        ),
        *_rows(dt.date(2026, 11, 3), (None, None, 45, True), exercise_id=OTHER_EXERCISE),
    ]
    assert _summary(last_time(history, EXERCISE, TODAY))[1] == [
        (10, 8.0, None),
        (10, None, None),
        (8, 12.5, None),
    ]
    assert _summary(last_time(history, OTHER_EXERCISE, TODAY))[1] == [(None, None, 45)]


# --- API -------------------------------------------------------------------------------


def _log_done(client: TestClient, workout: dict, index: int, **values) -> dict:
    """Tick done on every set of the exercise at `index` with `values`."""
    body = workout
    for set_ in workout["exercises"][index]["sets"]:
        response = client.patch(
            f"{URL}/{workout['id']}/sets/{set_['id']}", json={**values, "done": True}
        )
        assert response.status_code == 200, response.text
        body = response.json()
    return body


def _earlier(client: TestClient, db: Session, day: str, slug: str, **values) -> None:
    """A finished workout on `day` with `slug` and its 3 default sets done."""
    workout = _add(client, _start(client, day).json()["id"], _ex(db, slug)).json()
    _log_done(client, workout, 0, **values)
    _finish(db, workout["id"])


@pytest.mark.usefixtures("seeded")
def test_last_time_in_the_response(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    other = consented_client("b@eksempel.no")
    _earlier(other, db_session, "2026-11-10", SQUAT, reps=50)  # B only: never shown to A
    client = consented_client()
    # 3. nov: Armhevinger, two of three sets done with 10 reps.
    workout = _add(client, _start(client, "2026-11-03").json()["id"], _ex(db_session, PUSH_UP))
    workout = workout.json()
    for set_ in workout["exercises"][0]["sets"][:2]:
        response = client.patch(
            f"{URL}/{workout['id']}/sets/{set_['id']}", json={"reps": 10, "done": True}
        )
        assert response.status_code == 200, response.text
    _finish(db_session, workout["id"])

    today = _start(client, "2026-11-17").json()
    body = _add(client, today["id"], _ex(db_session, PUSH_UP)).json()
    body = _add(client, today["id"], _ex(db_session, SQUAT)).json()
    body = _add(client, today["id"], _ex(db_session, PLANK)).json()
    # Done sets in today's workout do not count as last time.
    body = _log_done(client, body, 2, seconds=45)

    push_up, squat, plank = body["exercises"]
    assert push_up["last_time"] == {
        "date": "2026-11-03",
        "sets": [
            {"reps": 10, "weight_kg": None, "seconds": None},
            {"reps": 10, "weight_kg": None, "seconds": None},
        ],
    }
    assert squat["last_time"] is None
    assert plank["last_time"] is None
    assert client.get(f"{URL}/{today['id']}").json() == body
    assert client.get(f"{URL}/active").json()["workout"] == body


@pytest.mark.usefixtures("seeded")
def test_last_time_skips_undone_and_later_workouts(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    _earlier(client, db_session, "2026-11-01", PUSH_UP, reps=7)
    # 3. nov: newer, but no set is done, so 1. nov is used.
    newer = _add(client, _start(client, "2026-11-03").json()["id"], _ex(db_session, PUSH_UP))
    newer = newer.json()
    for set_ in newer["exercises"][0]["sets"]:
        response = client.patch(f"{URL}/{newer['id']}/sets/{set_['id']}", json={"reps": 9})
        assert response.status_code == 200, response.text
    _finish(db_session, newer["id"])
    # 20. nov: after this workout's date, so never used.
    _earlier(client, db_session, "2026-11-20", PUSH_UP, reps=20)

    today = _start(client, "2026-11-17").json()
    body = _add(client, today["id"], _ex(db_session, PUSH_UP)).json()

    assert body["exercises"][0]["last_time"] == {
        "date": "2026-11-01",
        "sets": [{"reps": 7, "weight_kg": None, "seconds": None}] * 3,
    }
