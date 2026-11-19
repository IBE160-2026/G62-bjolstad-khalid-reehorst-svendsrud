"""/api/exercises (story 4.1): read-only list and detail, login required."""

import uuid
from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, select
from sqlalchemy.orm import Session

from app.modules.exercises.models import Exercise
from app.seed.seed import seed_exercises
from tests.exercises.test_seed import truncate_exercises
from tests.identity.helpers import ME_URL

URL = "/api/exercises"


@pytest.fixture
def seeded(test_engine: Engine, db_session: Session) -> Iterator[None]:
    truncate_exercises(test_engine)
    seed_exercises(db_session)
    db_session.commit()
    yield
    db_session.rollback()  # end the read transaction, or TRUNCATE waits for its lock
    truncate_exercises(test_engine)


def _id(db: Session, slug: str) -> str:
    return str(db.scalars(select(Exercise.id).where(Exercise.slug == slug)).one())


@pytest.mark.usefixtures("seeded")
def test_list_returns_every_exercise(logged_in_client: Callable[..., TestClient]) -> None:
    response = logged_in_client().get(URL)

    assert response.status_code == 200
    items = response.json()
    assert len(items) == 34
    push_up = next(item for item in items if item["name"] == "Armhevinger (Push-up)")
    assert push_up["level"] == "beginner"
    assert push_up["primary_muscle_group"] == "Bryst"
    assert push_up["equipment"] == ["Kroppsvekt"]
    bench = next(item for item in items if item["name"].startswith("Manual benkpress"))
    assert bench["equipment"] == ["Manualer", "Benk"]
    # Grouped by primary muscle group: each group appears in one unbroken run.
    groups = [item["primary_muscle_group"] for item in items]
    runs = [group for index, group in enumerate(groups) if index == 0 or groups[index - 1] != group]
    assert len(runs) == len(set(runs)) == 6


@pytest.mark.usefixtures("seeded")
def test_list_works_without_consent(logged_in_client: Callable[..., TestClient]) -> None:
    # Reference data, not health data: CurrentUser is enough (spec 4.1).
    test_client = logged_in_client("uten-samtykke@eksempel.no")
    assert test_client.get(ME_URL).json()["consent_at"] is None
    assert test_client.get(URL).status_code == 200


def test_list_requires_login(client: TestClient) -> None:
    response = client.get(URL)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


@pytest.mark.usefixtures("seeded")
def test_detail_of_push_up(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    response = logged_in_client().get(f"{URL}/{_id(db_session, 'push-up')}")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Armhevinger (Push-up)"
    assert body["equipment"] == ["Kroppsvekt"]
    assert body["primary_muscle_group"] == "Bryst"
    assert body["secondary_muscle_groups"] == ["Skuldre", "Armer"]
    assert body["level"] == "beginner"
    assert body["type"] == "reps"
    assert body["video_id"] == "YwFmEsa_lIk"
    assert body["video_short"] is False
    assert len(body["steps"]) == 3


@pytest.mark.usefixtures("seeded")
def test_detail_of_deadlift_maps_to_back_and_legs(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    body = logged_in_client().get(f"{URL}/{_id(db_session, 'deadlift')}").json()

    assert body["primary_muscle_group"] == "Rygg"
    assert body["secondary_muscle_groups"] == ["Ben"]
    assert body["equipment"] == ["Stang og skiver"]
    assert body["video_short"] is True  # a YouTube Short (#13)


@pytest.mark.usefixtures("seeded")
def test_unknown_exercise_is_404(logged_in_client: Callable[..., TestClient]) -> None:
    response = logged_in_client().get(f"{URL}/{uuid.uuid4()}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "exercise_not_found"


@pytest.mark.usefixtures("seeded")
@pytest.mark.parametrize("bad_id", ["ukjent", "123", "not-a-uuid-at-all"])
def test_non_uuid_exercise_id_is_404(
    logged_in_client: Callable[..., TestClient], bad_id: str
) -> None:
    response = logged_in_client().get(f"{URL}/{bad_id}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "exercise_not_found"


def test_detail_requires_login(client: TestClient) -> None:
    assert client.get(f"{URL}/{uuid.uuid4()}").status_code == 401


@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH", "DELETE"])
def test_exercises_are_read_only(
    logged_in_client: Callable[..., TestClient], method: str
) -> None:
    test_client = logged_in_client()
    assert test_client.request(method, URL, json={}).status_code == 405
    assert test_client.request(method, f"{URL}/{uuid.uuid4()}", json={}).status_code == 405
