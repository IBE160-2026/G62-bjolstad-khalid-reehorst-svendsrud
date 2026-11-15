"""GET/PUT /api/profile (story 2.1): consent guard, validation, storage and isolation."""

from collections.abc import Callable
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.settings import get_settings
from app.modules.identity.models import User
from app.modules.profile.models import Profile
from tests.conftest import Clock
from tests.identity.helpers import count

PROFILE_URL = "/api/profile"
CONSENT_URL = "/api/identity/consent"
SARA = {
    "sex": "female",
    "weight_kg": 82,
    "height_cm": 162,
    "age": 23,
    "activity_level": "light",
    "goal": "lose",
}


@pytest.fixture
def consented_client(logged_in_client: Callable[..., TestClient]) -> Callable[..., TestClient]:
    def factory(email: str = "sara@eksempel.no") -> TestClient:
        test_client = logged_in_client(email)
        assert test_client.post(CONSENT_URL).status_code == 200
        return test_client

    return factory


def test_get_without_profile_is_404(consented_client: Callable[..., TestClient]) -> None:
    response = consented_client().get(PROFILE_URL)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "profile_not_found"


def test_save_returns_and_stores_the_target(
    consented_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = consented_client()

    response = client.put(PROFILE_URL, json=SARA)

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["target_kcal"] == 1640
    assert body["floor_applied"] is False
    assert body["weight_kg"] == 82
    assert body["activity_level"] == "light"
    assert datetime.fromisoformat(body["updated_at"]) == clock.now
    assert client.get(PROFILE_URL).json() == body

    db_session.expire_all()
    stored = db_session.scalars(select(Profile)).one()
    assert (stored.target_kcal, stored.floor_applied) == (1640, False)


def test_second_save_replaces_the_profile(
    consented_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = consented_client()
    assert client.put(PROFILE_URL, json=SARA).status_code == 200
    clock.advance(timedelta(minutes=5))

    floor = {**SARA, "weight_kg": 45, "height_cm": 150, "age": 60, "activity_level": "sedentary"}
    response = client.put(PROFILE_URL, json=floor)

    assert response.status_code == 200
    assert response.json()["target_kcal"] == 1200
    assert response.json()["floor_applied"] is True
    assert count(db_session, Profile) == 1
    assert client.get(PROFILE_URL).json()["target_kcal"] == 1200


def test_weight_with_one_decimal_is_kept(consented_client: Callable[..., TestClient]) -> None:
    response = consented_client().put(PROFILE_URL, json={**SARA, "weight_kg": 82.5})

    assert response.status_code == 200
    assert response.json()["weight_kg"] == 82.5


def test_out_of_range_gives_one_field_error_per_field(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    body = {**SARA, "weight_kg": 29, "height_cm": 251, "age": 15}

    response = consented_client().put(PROFILE_URL, json=body)

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert error["fields"] == [
        {"field": "weight_kg", "message": "Vekt må være mellom 30 og 300 kg."},
        {"field": "height_cm", "message": "Høyde må være mellom 100 og 250 cm."},
        {"field": "age", "message": "Alder må være mellom 16 og 100 år."},
    ]
    assert count(db_session, Profile) == 0


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("weight_kg", 82.25, "Skriv vekten med høyst én desimal."),
        ("height_cm", 170.5, "Skriv høyden i hele centimeter."),
        ("age", 30.5, "Skriv alderen i hele år."),
        ("sex", "other", "Sjekk verdien i dette feltet."),
        ("goal", "bulk", "Sjekk verdien i dette feltet."),
    ],
)
def test_invalid_values_are_rejected(
    consented_client: Callable[..., TestClient], field: str, value: object, message: str
) -> None:
    response = consented_client().put(PROFILE_URL, json={**SARA, field: value})

    assert response.status_code == 422
    assert response.json()["error"]["fields"] == [{"field": field, "message": message}]


def test_range_edges_are_accepted(consented_client: Callable[..., TestClient]) -> None:
    client = consented_client()
    low = {**SARA, "weight_kg": 30, "height_cm": 100, "age": 16}
    high = {**SARA, "weight_kg": 300, "height_cm": 250, "age": 100}

    assert client.put(PROFILE_URL, json=low).status_code == 200
    assert client.put(PROFILE_URL, json=high).status_code == 200


def test_every_field_is_required(consented_client: Callable[..., TestClient]) -> None:
    response = consented_client().put(PROFILE_URL, json={})

    assert response.status_code == 422
    fields = {entry["field"] for entry in response.json()["error"]["fields"]}
    assert fields == set(SARA)


@pytest.mark.parametrize("method", ["get", "put"])
def test_profile_requires_consent(
    logged_in_client: Callable[..., TestClient], db_session: Session, method: str
) -> None:
    client = logged_in_client()

    response = client.get(PROFILE_URL) if method == "get" else client.put(PROFILE_URL, json=SARA)

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "consent_required"
    assert count(db_session, Profile) == 0


def test_profile_requires_login(client: TestClient) -> None:
    assert client.get(PROFILE_URL).status_code == 401
    assert client.put(PROFILE_URL, json=SARA).status_code == 401


def test_save_with_wrong_origin_is_rejected(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()

    response = client.put(PROFILE_URL, json=SARA, headers={"Origin": "https://evil.example"})

    assert response.status_code == 403
    assert count(db_session, Profile) == 0
    assert get_settings().app_url != "https://evil.example"


def test_users_only_see_their_own_profile(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    sara = consented_client("sara@eksempel.no")
    ola = consented_client("ola@eksempel.no")
    assert sara.put(PROFILE_URL, json=SARA).status_code == 200

    assert ola.get(PROFILE_URL).status_code == 404

    male = {**SARA, "sex": "male", "weight_kg": 80, "height_cm": 180, "age": 25}
    ola_body = {**male, "activity_level": "moderate", "goal": "maintain"}
    assert ola.put(PROFILE_URL, json=ola_body).status_code == 200
    assert sara.get(PROFILE_URL).json()["target_kcal"] == 1640
    assert ola.get(PROFILE_URL).json()["target_kcal"] == 2798
    assert count(db_session, Profile) == 2


def test_client_cannot_choose_user_id_or_target(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    sara = consented_client("sara@eksempel.no")
    ola = consented_client("ola@eksempel.no")
    db_session.expire_all()
    ola_id = db_session.scalars(select(User.id).where(User.email == "ola@eksempel.no")).one()

    body = {**SARA, "user_id": str(ola_id), "target_kcal": 9999, "floor_applied": True}
    response = sara.put(PROFILE_URL, json=body)

    assert response.status_code == 200
    assert response.json()["target_kcal"] == 1640
    assert ola.get(PROFILE_URL).status_code == 404
    db_session.expire_all()
    assert db_session.scalars(select(Profile.user_id)).one() != ola_id
