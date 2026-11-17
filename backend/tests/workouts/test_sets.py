"""Sets (story 5.2): default sets, add/update/delete, validation, isolation and CASCADE."""

from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.workouts.models import Set
from tests.workouts.test_workouts_api import (  # noqa: F401 (fixtures)
    PLANK,
    PUSH_UP,
    URL,
    _add,
    _count,
    _ex,
    _finish,
    _start,
    consented_client,
    seeded,
)


def _workout(client: TestClient, db: Session, *slugs: str) -> dict:
    workout_id = _start(client).json()["id"]
    body: dict = {}
    for slug in slugs:
        body = _add(client, workout_id, _ex(db, slug)).json()
    return body


def _sets(body: dict, index: int = 0) -> list[dict]:
    return body["exercises"][index]["sets"]


def _patch(client: TestClient, workout: dict, set_id: str, **values):
    return client.patch(f"{URL}/{workout['id']}/sets/{set_id}", json=values)


def _post_set(client: TestClient, workout: dict, index: int = 0, json: dict | None = None):
    we_id = workout["exercises"][index]["id"]
    return client.post(f"{URL}/{workout['id']}/exercises/{we_id}/sets", json=json)


def _field_errors(response) -> dict[str, str]:
    assert response.status_code == 422, response.text
    return {f["field"]: f["message"] for f in response.json()["error"].get("fields", [])}


EMPTY = {"reps": None, "weight_kg": None, "seconds": None, "done": False}


def _values(set_: dict) -> dict:
    return {key: set_[key] for key in EMPTY}


# --- Add exercise ----------------------------------------------------------------------


@pytest.mark.usefixtures("seeded")
def test_adding_an_exercise_creates_three_empty_sets(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    body = _workout(client, db_session, PUSH_UP, PLANK)

    assert body["exercises"][0]["type"] == "reps"
    assert body["exercises"][1]["type"] == "time"
    for index in (0, 1):
        sets = _sets(body, index)
        assert [s["position"] for s in sets] == [0, 1, 2]
        assert all(_values(s) == EMPTY for s in sets)
    assert client.get(f"{URL}/{body['id']}").json() == body


# --- Update ----------------------------------------------------------------------------


@pytest.mark.usefixtures("seeded")
def test_reps_without_kg_is_bodyweight(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PUSH_UP)
    set_id = _sets(workout)[0]["id"]

    response = _patch(client, workout, set_id, reps=12)

    assert response.status_code == 200, response.text
    assert _values(_sets(response.json())[0]) == {**EMPTY, "reps": 12}


@pytest.mark.usefixtures("seeded")
@pytest.mark.parametrize("reps", [0, 101, 2.5, "12", True, -1])
def test_bad_reps_is_422(
    consented_client: Callable[..., TestClient], db_session: Session, reps: object
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PUSH_UP)

    errors = _field_errors(_patch(client, workout, _sets(workout)[0]["id"], reps=reps))

    assert errors == {"reps": "Skriv repetisjoner som et helt tall fra 1 til 100."}
    assert client.get(f"{URL}/{workout['id']}").json() == workout


@pytest.mark.usefixtures("seeded")
@pytest.mark.parametrize(("kg", "saved"), [(12.5, 12.5), (0, 0), (500, 500), (1.25, 1.25)])
def test_kg_is_saved(
    consented_client: Callable[..., TestClient], db_session: Session, kg: float, saved: float
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PUSH_UP)
    set_id = _sets(workout)[0]["id"]

    response = _patch(client, workout, set_id, weight_kg=kg)

    assert response.status_code == 200, response.text
    assert _sets(response.json())[0]["weight_kg"] == saved


@pytest.mark.usefixtures("seeded")
@pytest.mark.parametrize("kg", [501, 1.255, -1, "12,5"])
def test_bad_kg_is_422(
    consented_client: Callable[..., TestClient], db_session: Session, kg: object
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PUSH_UP)

    errors = _field_errors(_patch(client, workout, _sets(workout)[0]["id"], weight_kg=kg))

    assert errors == {"weight_kg": "Skriv kg som et tall fra 0 til 500, med høyst to desimaler."}


@pytest.mark.usefixtures("seeded")
def test_null_clears_a_value_and_missing_keeps_it(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PUSH_UP)
    set_id = _sets(workout)[0]["id"]
    _patch(client, workout, set_id, reps=8, weight_kg=20)

    response = _patch(client, workout, set_id, weight_kg=None)

    assert _values(_sets(response.json())[0]) == {**EMPTY, "reps": 8}


@pytest.mark.usefixtures("seeded")
def test_time_exercise_uses_seconds(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PLANK)
    set_id = _sets(workout)[0]["id"]

    response = _patch(client, workout, set_id, seconds=45)

    assert response.status_code == 200, response.text
    assert _values(_sets(response.json())[0]) == {**EMPTY, "seconds": 45}
    for bad in (0, 3601, 1.5):
        errors = _field_errors(_patch(client, workout, set_id, seconds=bad))
        assert errors == {"seconds": "Skriv sekunder som et helt tall fra 1 til 3600."}


@pytest.mark.usefixtures("seeded")
def test_values_must_fit_the_exercise_type(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PUSH_UP, PLANK)
    push_up_set = _sets(workout, 0)[0]["id"]
    plank_set = _sets(workout, 1)[0]["id"]

    assert set(_field_errors(_patch(client, workout, plank_set, reps=10))) == {"reps"}
    assert set(_field_errors(_patch(client, workout, plank_set, weight_kg=5))) == {"weight_kg"}
    assert set(_field_errors(_patch(client, workout, push_up_set, seconds=30))) == {"seconds"}
    assert set(_field_errors(_post_set(client, workout, 1, {"reps": 10}))) == {"reps"}
    # Null for the other type's value is harmless.
    assert _patch(client, workout, plank_set, reps=None).status_code == 200
    assert client.get(f"{URL}/{workout['id']}").json() == workout


@pytest.mark.usefixtures("seeded")
def test_done_needs_reps_or_seconds(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PUSH_UP, PLANK)
    push_up_set = _sets(workout, 0)[0]["id"]
    plank_set = _sets(workout, 1)[0]["id"]

    assert _field_errors(_patch(client, workout, push_up_set, done=True)) == {
        "reps": "Fyll inn repetisjoner."
    }
    assert _field_errors(_patch(client, workout, plank_set, done=True)) == {
        "seconds": "Fyll inn sekunder."
    }

    # The UI sends the suggestion (10) with done when reps are empty.
    response = _patch(client, workout, push_up_set, reps=10, done=True)
    assert response.status_code == 200, response.text
    assert _values(_sets(response.json())[0]) == {**EMPTY, "reps": 10, "done": True}
    # A done set cannot lose its reps.
    assert set(_field_errors(_patch(client, workout, push_up_set, reps=None))) == {"reps"}
    # Undone again.
    response = _patch(client, workout, push_up_set, done=False)
    assert _sets(response.json())[0]["done"] is False


@pytest.mark.usefixtures("seeded")
def test_acceptance_12_10_10_all_done(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PUSH_UP)
    ids = [s["id"] for s in _sets(workout)]

    _patch(client, workout, ids[0], reps=12)
    _patch(client, workout, ids[0], done=True)
    _patch(client, workout, ids[1], reps=10, done=True)
    _patch(client, workout, ids[2], reps=10, done=True)

    sets = _sets(client.get(f"{URL}/{workout['id']}").json())
    assert [(s["reps"], s["done"]) for s in sets] == [(12, True), (10, True), (10, True)]


# --- Add set ---------------------------------------------------------------------------


@pytest.mark.usefixtures("seeded")
def test_add_set_goes_last_and_empty(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PUSH_UP)

    response = _post_set(client, workout)

    assert response.status_code == 200, response.text
    sets = _sets(response.json())
    assert [s["position"] for s in sets] == [0, 1, 2, 3]
    assert _values(sets[3]) == EMPTY
    assert [s["id"] for s in sets[:3]] == [s["id"] for s in _sets(workout)]


@pytest.mark.usefixtures("seeded")
def test_at_most_20_sets(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PUSH_UP)
    for _ in range(17):
        assert _post_set(client, workout).status_code == 200

    response = _post_set(client, workout)

    assert response.status_code == 422
    assert response.json()["error"] == {
        "code": "set_limit",
        "message": "Du kan ha opptil 20 sett per øvelse.",
    }
    assert len(_sets(client.get(f"{URL}/{workout['id']}").json())) == 20


@pytest.mark.usefixtures("seeded")
def test_add_set_to_an_unknown_workout_exercise_is_404(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PUSH_UP)

    for we_id in ("nope", "00000000-0000-0000-0000-000000000000"):
        response = client.post(f"{URL}/{workout['id']}/exercises/{we_id}/sets")
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "workout_exercise_not_found"


# --- Delete and undo -------------------------------------------------------------------


@pytest.mark.usefixtures("seeded")
def test_delete_then_undo_restores_the_set_in_place(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PUSH_UP)
    ids = [s["id"] for s in _sets(workout)]
    _patch(client, workout, ids[1], reps=8, weight_kg=12.5, done=True)

    response = client.delete(f"{URL}/{workout['id']}/sets/{ids[1]}")

    assert response.status_code == 200, response.text
    sets = _sets(response.json())
    assert [s["id"] for s in sets] == [ids[0], ids[2]]
    assert [s["position"] for s in sets] == [0, 1]

    undo = {"reps": 8, "weight_kg": 12.5, "seconds": None, "done": True, "position": 1}
    response = _post_set(client, workout, json=undo)

    assert response.status_code == 200, response.text
    sets = _sets(response.json())
    assert [s["position"] for s in sets] == [0, 1, 2]
    assert [s["id"] for s in sets][::2] == [ids[0], ids[2]]
    assert _values(sets[1]) == {"reps": 8, "weight_kg": 12.5, "seconds": None, "done": True}


@pytest.mark.usefixtures("seeded")
def test_position_past_the_end_adds_last(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PUSH_UP)

    response = _post_set(client, workout, json={"position": 19, "reps": 5})

    assert [s["reps"] for s in _sets(response.json())] == [None, None, None, 5]
    for bad in (20, -1, 1.5, "1", True):
        assert _field_errors(_post_set(client, workout, json={"position": bad})) == {
            "position": "Velg en plass fra 0 til 19."
        }


@pytest.mark.usefixtures("seeded")
def test_unknown_set_is_404(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PUSH_UP)

    for set_id in ("nope", "00000000-0000-0000-0000-000000000000"):
        for response in (
            _patch(client, workout, set_id, reps=5),
            client.delete(f"{URL}/{workout['id']}/sets/{set_id}"),
        ):
            assert response.status_code == 404
            assert response.json()["error"] == {
                "code": "set_not_found",
                "message": "Fant ikke settet. Last inn siden på nytt.",
            }


# --- Remove exercise, isolation, finished ----------------------------------------------


@pytest.mark.usefixtures("seeded")
def test_removing_an_exercise_removes_its_sets(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PUSH_UP, PLANK)
    assert _count(db_session, Set) == 6

    client.delete(f"{URL}/{workout['id']}/exercises/{workout['exercises'][0]['id']}")

    assert _count(db_session, Set) == 3


@pytest.mark.usefixtures("seeded")
def test_another_users_set_is_404_and_unchanged(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    owner = consented_client("a@eksempel.no")
    workout = _workout(owner, db_session, PUSH_UP)
    set_id = _sets(workout)[0]["id"]
    other = consented_client("b@eksempel.no")
    own = _workout(other, db_session, PUSH_UP)

    responses = [
        _patch(other, workout, set_id, reps=5),
        other.delete(f"{URL}/{workout['id']}/sets/{set_id}"),
        _post_set(other, workout),
    ]
    for response in responses:
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "workout_not_found"

    # Through B's own workout, A's set is still not found.
    responses = [
        _patch(other, own, set_id, reps=5),
        other.delete(f"{URL}/{own['id']}/sets/{set_id}"),
    ]
    for response in responses:
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "set_not_found"
    assert owner.get(f"{URL}/{workout['id']}").json() == workout


@pytest.mark.usefixtures("seeded")
def test_sets_of_a_finished_workout_can_be_changed(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PUSH_UP)
    set_id = _sets(workout)[0]["id"]
    _finish(db_session, workout["id"])

    patched = _patch(client, workout, set_id, reps=5)
    assert patched.status_code == 200
    assert _sets(patched.json())[0]["reps"] == 5
    added = _post_set(client, workout)
    assert added.status_code == 200
    assert len(_sets(added.json())) == 4
    deleted = client.delete(f"{URL}/{workout['id']}/sets/{set_id}")
    assert deleted.status_code == 200
    assert len(_sets(deleted.json())) == 3


@pytest.mark.usefixtures("seeded")
def test_set_writes_require_a_matching_origin(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PUSH_UP)
    set_id = _sets(workout)[0]["id"]

    response = client.patch(
        f"{URL}/{workout['id']}/sets/{set_id}",
        json={"reps": 5},
        headers={"Origin": "https://evil.example"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "origin_mismatch"


@pytest.mark.usefixtures("seeded")
def test_add_set_checks_done_and_type(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout(client, db_session, PUSH_UP, PLANK)

    assert _field_errors(_post_set(client, workout, 0, {"done": True})) == {
        "reps": "Fyll inn repetisjoner."
    }
    assert _field_errors(_post_set(client, workout, 1, {"done": True})) == {
        "seconds": "Fyll inn sekunder."
    }
    assert set(_field_errors(_post_set(client, workout, 0, {"seconds": 30}))) == {"seconds"}
    for bad in ("true", 1, "ja"):
        assert _field_errors(_patch(client, workout, _sets(workout)[0]["id"], done=bad)) == {
            "done": "Send ferdig som true eller false."
        }
    assert client.get(f"{URL}/{workout['id']}").json() == workout
