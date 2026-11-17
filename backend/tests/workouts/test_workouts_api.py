"""/api/workouts (story 5.1): start/resume, add, reorder, remove, isolation and purge."""

import uuid
from collections.abc import Callable, Iterator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, select
from sqlalchemy.orm import Session

from app.modules.exercises.models import Exercise
from app.modules.identity import service as identity_service
from app.modules.identity.models import User
from app.modules.workouts.models import Workout, WorkoutExercise
from app.seed.seed import seed_exercises
from tests.exercises.test_seed import truncate_exercises
from tests.identity.helpers import count

URL = "/api/workouts"
ACTIVE_URL = f"{URL}/active"
CONSENT_URL = "/api/identity/consent"
DAY = "2026-11-17"

PUSH_UP = "push-up"
SQUAT = "bodyweight-squat"
PLANK = "plank"


@pytest.fixture
def seeded(test_engine: Engine, db_session: Session) -> Iterator[None]:
    truncate_exercises(test_engine)
    seed_exercises(db_session)
    db_session.commit()
    yield
    db_session.rollback()  # end the read transaction, or TRUNCATE waits for its lock
    truncate_exercises(test_engine)


@pytest.fixture
def consented_client(logged_in_client: Callable[..., TestClient]) -> Callable[..., TestClient]:
    def factory(email: str = "sara@eksempel.no") -> TestClient:
        test_client = logged_in_client(email)
        assert test_client.post(CONSENT_URL).status_code == 200
        return test_client

    return factory


def _count(db: Session, model: type) -> int:
    """Count, then end the read transaction so teardown's TRUNCATE is not blocked."""
    try:
        return count(db, model)
    finally:
        db.rollback()


def _ex(db: Session, slug: str) -> str:
    return str(db.scalars(select(Exercise.id).where(Exercise.slug == slug)).one())


def _all_ids(db: Session) -> list[str]:
    return [str(i) for i in db.scalars(select(Exercise.id).order_by(Exercise.slug))]


def _start(client: TestClient, day: str = DAY):
    return client.post(URL, json={"date": day})


def _add(client: TestClient, workout_id: str, exercise_id: str):
    return client.post(f"{URL}/{workout_id}/exercises", json={"exercise_id": exercise_id})


def _names(body: dict) -> list[str]:
    return [item["name"] for item in body["exercises"]]


# --- Start and resume -----------------------------------------------------------------


@pytest.mark.usefixtures("seeded")
def test_start_creates_an_empty_workout_for_the_date(
    consented_client: Callable[..., TestClient],
) -> None:
    client = consented_client()
    assert client.get(ACTIVE_URL).json() == {"workout": None}

    response = _start(client)

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["date"] == DAY
    assert body["exercises"] == []
    uuid.UUID(body["id"])
    assert client.get(ACTIVE_URL).json() == {"workout": body}
    assert client.get(f"{URL}/{body['id']}").json() == body


@pytest.mark.usefixtures("seeded")
def test_start_resumes_the_workout_in_progress(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    first = _start(client).json()

    response = _start(client, "2026-11-18")

    assert response.status_code == 200
    assert response.json() == first  # same workout, date unchanged
    assert _count(db_session, Workout) == 1


@pytest.mark.parametrize("day", ["2026-13-01", "17.11.2026", "", None])
def test_start_with_a_bad_date_is_422(
    consented_client: Callable[..., TestClient], db_session: Session, day: str | None
) -> None:
    response = consented_client().post(URL, json={"date": day})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert _count(db_session, Workout) == 0


def test_workouts_require_consent(logged_in_client: Callable[..., TestClient]) -> None:
    client = logged_in_client("uten@eksempel.no")

    assert client.get(ACTIVE_URL).status_code == 403
    assert _start(client).json()["error"]["code"] == "consent_required"


def test_workouts_require_login(client: TestClient) -> None:
    assert client.get(ACTIVE_URL).status_code == 401


def test_writes_require_a_matching_origin(
    consented_client: Callable[..., TestClient],
) -> None:
    client = consented_client()
    response = client.post(URL, json={"date": DAY}, headers={"Origin": "https://evil.example"})

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "origin_mismatch"


# --- Add --------------------------------------------------------------------------------


@pytest.mark.usefixtures("seeded")
def test_add_puts_exercises_last_with_their_details(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout_id = _start(client).json()["id"]

    _add(client, workout_id, _ex(db_session, PUSH_UP))
    response = _add(client, workout_id, _ex(db_session, SQUAT))

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["id"] == workout_id and body["date"] == DAY
    assert _names(body) == ["Armhevinger (Push-up)", "Kroppsvektknebøy (Bodyweight squat)"]
    push_up = body["exercises"][0]
    assert push_up["exercise_id"] == _ex(db_session, PUSH_UP)
    assert push_up["level"] == "beginner"
    assert push_up["primary_muscle_group"] == "Bryst"
    assert push_up["equipment"] == ["Kroppsvekt"]
    uuid.UUID(push_up["id"])
    assert push_up["id"] != push_up["exercise_id"]
    assert client.get(f"{URL}/{workout_id}").json() == body


@pytest.mark.usefixtures("seeded")
def test_adding_the_same_exercise_twice_is_409(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout_id = _start(client).json()["id"]
    _add(client, workout_id, _ex(db_session, PUSH_UP))

    response = _add(client, workout_id, _ex(db_session, PUSH_UP))

    assert response.status_code == 409
    assert response.json() == {
        "error": {"code": "exercise_already_in_workout", "message": "Øvelsen er allerede i økta."}
    }
    assert _count(db_session, WorkoutExercise) == 1


@pytest.mark.usefixtures("seeded")
def test_at_most_20_exercises(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout_id = _start(client).json()["id"]
    ids = _all_ids(db_session)
    for exercise_id in ids[:20]:
        assert _add(client, workout_id, exercise_id).status_code == 200

    response = _add(client, workout_id, ids[20])

    assert response.status_code == 422
    assert response.json()["error"]["message"] == "Du kan ha opptil 20 øvelser i én økt."
    assert len(client.get(f"{URL}/{workout_id}").json()["exercises"]) == 20


@pytest.mark.usefixtures("seeded")
@pytest.mark.parametrize("exercise_id", [str(uuid.uuid4()), "ikke-en-uuid"])
def test_adding_an_unknown_exercise_is_404(
    consented_client: Callable[..., TestClient], exercise_id: str
) -> None:
    client = consented_client()
    workout_id = _start(client).json()["id"]

    response = _add(client, workout_id, exercise_id)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "exercise_not_found"


@pytest.mark.usefixtures("seeded")
@pytest.mark.parametrize("workout_id", [str(uuid.uuid4()), "ikke-en-uuid"])
def test_unknown_or_non_uuid_workout_is_404(
    consented_client: Callable[..., TestClient], db_session: Session, workout_id: str
) -> None:
    client = consented_client()
    _start(client)

    responses = [
        client.get(f"{URL}/{workout_id}"),
        _add(client, workout_id, _ex(db_session, PUSH_UP)),
        client.put(f"{URL}/{workout_id}/exercises/order", json={"ids": []}),
        client.delete(f"{URL}/{workout_id}/exercises/{uuid.uuid4()}"),
    ]

    for response in responses:
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "workout_not_found"


# --- Reorder ----------------------------------------------------------------------------


def _workout_with(client: TestClient, db: Session, *slugs: str) -> dict:
    workout_id = _start(client).json()["id"]
    body: dict = {}
    for slug in slugs:
        body = _add(client, workout_id, _ex(db, slug)).json()
    return body


@pytest.mark.usefixtures("seeded")
def test_reorder_saves_the_new_order(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout_with(client, db_session, PUSH_UP, SQUAT, PLANK)
    reversed_ids = [item["id"] for item in reversed(workout["exercises"])]

    response = client.put(f"{URL}/{workout['id']}/exercises/order", json={"ids": reversed_ids})

    assert response.status_code == 200, response.text
    assert [item["id"] for item in response.json()["exercises"]] == reversed_ids
    saved = client.get(f"{URL}/{workout['id']}").json()
    assert [item["id"] for item in saved["exercises"]] == reversed_ids


@pytest.mark.usefixtures("seeded")
def test_reorder_needs_exactly_the_workouts_ids(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout_with(client, db_session, PUSH_UP, SQUAT)
    ids = [item["id"] for item in workout["exercises"]]
    other = _workout_with(consented_client("annen@eksempel.no"), db_session, PLANK)
    foreign = other["exercises"][0]["id"]
    order_url = f"{URL}/{workout['id']}/exercises/order"

    for bad in ([ids[0]], [*ids, str(uuid.uuid4())], [ids[0], ids[0]], [ids[0], foreign], ["x"]):
        response = client.put(order_url, json={"ids": bad})
        assert response.status_code == 422, bad

    assert [item["id"] for item in client.get(f"{URL}/{workout['id']}").json()["exercises"]] == ids


# --- Remove -----------------------------------------------------------------------------


@pytest.mark.usefixtures("seeded")
def test_remove_keeps_the_others_in_order(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout_with(client, db_session, PUSH_UP, SQUAT, PLANK)
    middle = workout["exercises"][1]["id"]

    response = client.delete(f"{URL}/{workout['id']}/exercises/{middle}")

    assert response.status_code == 200
    assert _names(response.json()) == ["Armhevinger (Push-up)", "Planke (Plank)"]
    # Adding again goes last, after the renumbered rest.
    again = _add(client, workout["id"], _ex(db_session, SQUAT)).json()
    assert _names(again)[-1] == "Kroppsvektknebøy (Bodyweight squat)"


@pytest.mark.usefixtures("seeded")
@pytest.mark.parametrize("workout_exercise_id", [str(uuid.uuid4()), "ikke-en-uuid"])
def test_removing_an_unknown_workout_exercise_is_404(
    consented_client: Callable[..., TestClient], db_session: Session, workout_exercise_id: str
) -> None:
    client = consented_client()
    workout = _workout_with(client, db_session, PUSH_UP)

    response = client.delete(f"{URL}/{workout['id']}/exercises/{workout_exercise_id}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "workout_exercise_not_found"
    assert len(client.get(f"{URL}/{workout['id']}").json()["exercises"]) == 1


# --- Isolation (FR3) --------------------------------------------------------------------


@pytest.mark.usefixtures("seeded")
def test_another_users_workout_is_404_and_unchanged(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    owner = consented_client("a@eksempel.no")
    workout = _workout_with(owner, db_session, PUSH_UP, SQUAT)
    first = workout["exercises"][0]["id"]
    other = consented_client("b@eksempel.no")
    base = f"{URL}/{workout['id']}"

    responses = [
        other.get(base),
        _add(other, workout["id"], _ex(db_session, PLANK)),
        other.put(f"{base}/exercises/order", json={"ids": [e["id"] for e in workout["exercises"]][::-1]}),
        other.delete(f"{base}/exercises/{first}"),
    ]

    for response in responses:
        assert response.status_code == 404
        assert response.json() == {
            "error": {
                "code": "workout_not_found",
                "message": "Fant ikke økta. Gå tilbake til Trening og prøv igjen.",
            }
        }
    assert other.get(ACTIVE_URL).json() == {"workout": None}
    assert owner.get(base).json() == workout


# --- Purge ------------------------------------------------------------------------------


@pytest.mark.usefixtures("seeded")
def test_purge_removes_workouts_and_their_exercises(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client("gammel@eksempel.no")
    _workout_with(client, db_session, PUSH_UP, SQUAT)
    now = datetime.now(UTC)
    user = db_session.scalars(select(User).where(User.email == "gammel@eksempel.no")).one()
    user.deleted_at = now - timedelta(days=31)
    db_session.commit()

    assert identity_service.purge_deleted(db_session, now) == 1
    db_session.commit()

    assert _count(db_session, Workout) == 0
    assert _count(db_session, WorkoutExercise) == 0


# --- Review follow-ups ------------------------------------------------------------------


def _finish(db: Session, workout_id: str) -> None:
    workout = db.get(Workout, uuid.UUID(workout_id))
    assert workout is not None
    workout.finished_at = datetime.now(UTC)
    db.commit()


@pytest.mark.usefixtures("seeded")
def test_a_finished_workout_cannot_be_changed(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout_with(client, db_session, PUSH_UP, SQUAT)
    ids = [item["id"] for item in workout["exercises"]]
    _finish(db_session, workout["id"])
    base = f"{URL}/{workout['id']}"

    responses = [
        _add(client, workout["id"], _ex(db_session, PLANK)),
        client.put(f"{base}/exercises/order", json={"ids": ids[::-1]}),
        client.delete(f"{base}/exercises/{ids[0]}"),
    ]

    for response in responses:
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "workout_not_found"
    assert client.get(base).json() == workout


@pytest.mark.usefixtures("seeded")
def test_active_ignores_a_finished_workout_but_get_still_returns_it(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    workout = _workout_with(client, db_session, PUSH_UP)
    _finish(db_session, workout["id"])

    assert client.get(ACTIVE_URL).json() == {"workout": None}
    assert client.get(f"{URL}/{workout['id']}").json() == workout
    # A new start creates a new workout (201), not the finished one.
    started = _start(client)
    assert started.status_code == 201
    assert started.json()["id"] != workout["id"]


@pytest.mark.parametrize("days", [-367, 367])
def test_start_with_a_date_over_a_year_away_is_422(
    consented_client: Callable[..., TestClient], db_session: Session, days: int
) -> None:
    day = (datetime.now(UTC).date() + timedelta(days=days)).isoformat()

    response = consented_client().post(URL, json={"date": day})

    assert response.status_code == 422
    assert response.json()["error"]["fields"] == [
        {"field": "date", "message": "Velg en dato innen ett år fra i dag."}
    ]
    assert _count(db_session, Workout) == 0


@pytest.mark.parametrize("days", [-365, 0, 365])
def test_start_within_a_year_is_allowed(
    consented_client: Callable[..., TestClient], days: int
) -> None:
    day = (datetime.now(UTC).date() + timedelta(days=days)).isoformat()

    assert consented_client().post(URL, json={"date": day}).status_code == 201


def test_reorder_of_an_empty_workout_with_no_ids(
    consented_client: Callable[..., TestClient],
) -> None:
    client = consented_client()
    workout_id = _start(client).json()["id"]

    response = client.put(f"{URL}/{workout_id}/exercises/order", json={"ids": []})

    assert response.status_code == 200
    assert response.json()["exercises"] == []


def test_reorder_with_a_non_uuid_workout_id_is_404(
    consented_client: Callable[..., TestClient],
) -> None:
    client = consented_client()
    _start(client)

    response = client.put(f"{URL}/ikke-en-uuid/exercises/order", json={"ids": []})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "workout_not_found"


@pytest.mark.usefixtures("seeded")
def test_a_concurrent_duplicate_add_is_409_not_500(
    consented_client: Callable[..., TestClient],
    db_session: Session,
    test_session_factory,
) -> None:
    """Simulates the race: the request's loaded workout does not see a row another
    transaction committed, so only the unique constraint catches the duplicate."""
    from app.core.errors import AppError
    from app.modules.workouts import service

    client = consented_client()
    workout_id = _start(client).json()["id"]
    push_up = _ex(db_session, PUSH_UP)
    db_session.rollback()
    user_id = db_session.get(Workout, uuid.UUID(workout_id)).user_id

    with test_session_factory() as request_db:
        service.get_workout(request_db, user_id, workout_id)  # loads an empty list
        with test_session_factory() as other:
            other.add(
                WorkoutExercise(
                    workout_id=uuid.UUID(workout_id), exercise_id=uuid.UUID(push_up), position=0
                )
            )
            other.commit()
        with pytest.raises(AppError) as raised:
            service.add_exercise(request_db, user_id, workout_id, push_up, datetime.now(UTC))
        request_db.rollback()

    assert raised.value.status_code == 409
    assert raised.value.code == "exercise_already_in_workout"
    db_session.rollback()
