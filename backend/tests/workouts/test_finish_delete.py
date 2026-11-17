"""Finish, list, edit and delete workouts (story 5.4)."""

import datetime as dt
from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.workouts.models import Set, Workout, WorkoutExercise
from tests.workouts.test_workouts_api import (  # noqa: F401 (fixtures)
    ACTIVE_URL,
    PLANK,
    PUSH_UP,
    SQUAT,
    URL,
    _add,
    _count,
    _ex,
    _start,
    consented_client,
    seeded,
)


def _workout(client: TestClient, db: Session, day: str, *slugs: str) -> dict:
    body = _start(client, day).json()
    for slug in slugs:
        body = _add(client, body["id"], _ex(db, slug)).json()
    return body


def _finish(client: TestClient, workout_id: str):
    return client.post(f"{URL}/{workout_id}/finish")


def _done(client: TestClient, workout: dict, index: int, count: int, reps: int = 10) -> dict:
    body = workout
    for set_ in workout["exercises"][index]["sets"][:count]:
        response = client.patch(
            f"{URL}/{workout['id']}/sets/{set_['id']}", json={"reps": reps, "done": True}
        )
        assert response.status_code == 200, response.text
        body = response.json()
    return body


# --- Finish ------------------------------------------------------------------------------


@pytest.mark.usefixtures("seeded")
def test_finish_sets_finished_at_and_clears_active(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, "2026-11-17", PUSH_UP)

    response = _finish(client, workout["id"])

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == workout["id"]
    assert body["finished_at"] is not None
    assert client.get(ACTIVE_URL).json() == {"workout": None}
    assert client.get(f"{URL}/{workout['id']}").json()["finished_at"] == body["finished_at"]


@pytest.mark.usefixtures("seeded")
def test_finishing_twice_is_409(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, "2026-11-17")
    assert _finish(client, workout["id"]).status_code == 200

    response = _finish(client, workout["id"])

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "workout_already_finished"


def test_finish_unknown_or_non_uuid_is_404(consented_client: Callable[..., TestClient]) -> None:
    client = consented_client()
    for workout_id in ("00000000-0000-0000-0000-000000000000", "ikke-en-id"):
        response = _finish(client, workout_id)
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "workout_not_found"


# --- List --------------------------------------------------------------------------------


@pytest.mark.usefixtures("seeded")
def test_list_returns_the_10_newest_finished_and_not_the_active(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    start = dt.date(2026, 11, 1)
    ids = []
    for offset in range(12):
        day = (start + dt.timedelta(days=offset)).isoformat()
        workout = _start(client, day).json()
        assert _finish(client, workout["id"]).status_code == 200
        ids.append(workout["id"])
    active = _start(client, "2026-11-17").json()

    body = client.get(URL).json()

    assert [item["id"] for item in body] == ids[::-1][:10]
    assert active["id"] not in [item["id"] for item in body]
    assert body[0]["date"] == "2026-11-12"
    assert len(client.get(URL, params={"limit": 50}).json()) == 12


@pytest.mark.usefixtures("seeded")
def test_list_counts_exercises_and_done_sets(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, "2026-11-03", PUSH_UP, SQUAT)
    workout = _done(client, workout, 0, 3)
    _done(client, workout, 1, 2)
    finished = _finish(client, workout["id"]).json()

    assert client.get(URL).json() == [
        {
            "id": workout["id"],
            "date": "2026-11-03",
            "finished_at": finished["finished_at"],
            "exercise_count": 2,
            "done_set_count": 5,
        }
    ]


@pytest.mark.usefixtures("seeded")
def test_list_on_the_same_date_newest_created_first(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    first = _start(client, "2026-11-03").json()
    _finish(client, first["id"])
    second = _start(client, "2026-11-03").json()
    _finish(client, second["id"])

    assert [item["id"] for item in client.get(URL).json()] == [second["id"], first["id"]]


@pytest.mark.parametrize("limit", [0, 51, "ti"])
def test_list_limit_out_of_range_is_422(
    consented_client: Callable[..., TestClient], limit: object
) -> None:
    response = consented_client().get(URL, params={"limit": limit})

    assert response.status_code == 422


# --- Edit finished -----------------------------------------------------------------------


@pytest.mark.usefixtures("seeded")
def test_editing_a_finished_workout_changes_last_time(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    earlier = _workout(client, db_session, "2026-11-03", PUSH_UP)
    earlier = _done(client, earlier, 0, 1)
    _finish(client, earlier["id"])
    set_id = earlier["exercises"][0]["sets"][0]["id"]

    edited = client.patch(f"{URL}/{earlier['id']}/sets/{set_id}", json={"reps": 12})
    assert edited.status_code == 200

    today = _workout(client, db_session, "2026-11-17", PUSH_UP)
    assert today["exercises"][0]["last_time"]["sets"] == [
        {"reps": 12, "weight_kg": None, "seconds": None}
    ]


@pytest.mark.usefixtures("seeded")
def test_adding_an_exercise_to_a_finished_workout_is_404(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, "2026-11-17", PUSH_UP)
    _finish(client, workout["id"])

    response = _add(client, workout["id"], _ex(db_session, PLANK))

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "workout_not_found"


# --- Delete ------------------------------------------------------------------------------


@pytest.mark.usefixtures("seeded")
@pytest.mark.parametrize("finish", [False, True])
def test_delete_removes_workout_exercises_and_sets(
    consented_client: Callable[..., TestClient], db_session: Session, finish: bool
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, "2026-11-17", PUSH_UP, SQUAT)
    if finish:
        _finish(client, workout["id"])

    response = client.delete(f"{URL}/{workout['id']}")

    assert response.status_code == 204
    assert client.get(f"{URL}/{workout['id']}").status_code == 404
    assert client.get(URL).json() == []
    assert client.get(ACTIVE_URL).json() == {"workout": None}
    assert _count(db_session, Workout) == 0
    assert _count(db_session, WorkoutExercise) == 0
    assert _count(db_session, Set) == 0


def test_delete_unknown_is_404(consented_client: Callable[..., TestClient]) -> None:
    response = consented_client().delete(f"{URL}/00000000-0000-0000-0000-000000000000")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "workout_not_found"


# --- Isolation and origin ----------------------------------------------------------------


@pytest.mark.usefixtures("seeded")
def test_another_user_cannot_finish_delete_or_list(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    owner = consented_client()
    active = _workout(owner, db_session, "2026-11-17", PUSH_UP)
    other = consented_client("b@eksempel.no")

    for response in (_finish(other, active["id"]), other.delete(f"{URL}/{active['id']}")):
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "workout_not_found"
    assert owner.get(f"{URL}/{active['id']}").json() == active

    _finish(owner, active["id"])
    assert other.get(URL).json() == []
    assert len(owner.get(URL).json()) == 1


@pytest.mark.usefixtures("seeded")
def test_finish_and_delete_require_a_matching_origin(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, "2026-11-17")
    evil = {"Origin": "https://evil.example"}

    for response in (
        client.post(f"{URL}/{workout['id']}/finish", headers=evil),
        client.delete(f"{URL}/{workout['id']}", headers=evil),
    ):
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "origin_mismatch"
    assert _count(db_session, Workout) == 1


@pytest.mark.usefixtures("seeded")
@pytest.mark.parametrize(
    "write", ["add_set", "patch_set", "delete_set", "remove_exercise", "reorder"]
)
def test_another_user_cannot_edit_a_finished_workout(
    consented_client: Callable[..., TestClient], db_session: Session, write: str
) -> None:
    owner = consented_client()
    workout = _workout(owner, db_session, "2026-11-17", PUSH_UP, SQUAT)
    _finish(owner, workout["id"])
    finished = owner.get(f"{URL}/{workout['id']}").json()
    other = consented_client("b@eksempel.no")
    base = f"{URL}/{workout['id']}"
    we_id = workout["exercises"][0]["id"]
    set_id = workout["exercises"][0]["sets"][0]["id"]

    response = {
        "add_set": lambda: other.post(f"{base}/exercises/{we_id}/sets", json={}),
        "patch_set": lambda: other.patch(f"{base}/sets/{set_id}", json={"reps": 5}),
        "delete_set": lambda: other.delete(f"{base}/sets/{set_id}"),
        "remove_exercise": lambda: other.delete(f"{base}/exercises/{we_id}"),
        "reorder": lambda: other.put(
            f"{base}/exercises/order",
            json={"ids": [item["id"] for item in workout["exercises"]][::-1]},
        ),
    }[write]()

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "workout_not_found"
    assert owner.get(base).json() == finished
