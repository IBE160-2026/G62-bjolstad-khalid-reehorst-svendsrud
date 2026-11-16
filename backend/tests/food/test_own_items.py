"""POST /api/food/items (story 3.2): a user's own food items, validation and isolation."""

import uuid
from collections.abc import Callable
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.food.models import FoodItem, FoodLogEntry
from app.modules.identity.models import User
from tests.identity.helpers import count

ITEMS_URL = "/api/food/items"
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


def _stored(db: Session) -> FoodItem:
    db.expire_all()
    return db.scalars(select(FoodItem)).one()


def _fields(response) -> dict[str, str]:
    assert response.status_code == 422, response.text
    return {item["field"]: item["message"] for item in response.json()["error"]["fields"]}


def test_create_returns_201_and_stores_own_item(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()

    response = client.post(ITEMS_URL, json={"name": "  Mormors lefse ", "kcal_per_100g": 320})

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["name"] == "Mormors lefse"
    assert body["source"] == "user"
    assert body["kcal_per_100g"] == 320
    assert body["protein_g"] is None
    assert body["serving_size_g"] is None
    stored = _stored(db_session)
    assert str(stored.id) == body["id"]
    assert stored.source == "user"
    assert stored.owner_id == _user_id(db_session, "sara@eksempel.no")


def test_optional_values_are_stored(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    response = consented_client().post(
        ITEMS_URL,
        json={
            "name": "Mormors lefse",
            "kcal_per_100g": 320.5,
            "protein_g": 8,
            "carbs_g": 50,
            "fat_g": 10,
            "serving_size_g": 60,
        },
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert (body["protein_g"], body["carbs_g"], body["fat_g"]) == (8, 50, 10)
    assert body["serving_size_g"] == 60
    stored = _stored(db_session)
    assert stored.kcal_per_100g == Decimal("320.5")
    assert stored.serving_size_g == Decimal("60.0")


def test_bad_values_give_one_field_error_each_and_store_nothing(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    response = consented_client().post(
        ITEMS_URL,
        json={"name": "   ", "kcal_per_100g": 901, "protein_g": 40, "carbs_g": 40, "fat_g": 40},
    )

    assert _fields(response) == {
        "name": "Skriv navnet på matvaren.",
        "kcal_per_100g": "Kalorier per 100 g må være mellom 0 og 900.",
        "fat_g": "Protein, karbohydrater og fett kan til sammen ikke være mer enn 100 g.",
    }
    assert count(db_session, FoodItem) == 0


def test_macro_sum_is_checked_when_fat_is_left_out(
    consented_client: Callable[..., TestClient],
) -> None:
    response = consented_client().post(
        ITEMS_URL, json={"name": "Lefse", "kcal_per_100g": 300, "protein_g": 60, "carbs_g": 60}
    )

    assert _fields(response) == {
        "fat_g": "Protein, karbohydrater og fett kan til sammen ikke være mer enn 100 g."
    }


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("name", "x" * 201, "Skriv et navn på høyst 200 tegn."),
        ("kcal_per_100g", -1, "Kalorier per 100 g må være mellom 0 og 900."),
        ("kcal_per_100g", 12.34, "Skriv tallet med høyst én desimal."),
        ("protein_g", 101, "Protein må være mellom 0 og 100 g."),
        ("carbs_g", -0.1, "Karbohydrater må være mellom 0 og 100 g."),
        ("fat_g", 100.1, "Fett må være mellom 0 og 100 g."),
        ("serving_size_g", 0.5, "Porsjonsstørrelse må være mellom 1 og 2 000 g."),
        ("serving_size_g", 2000.1, "Porsjonsstørrelse må være mellom 1 og 2 000 g."),
    ],
)
def test_out_of_range_values_are_field_errors(
    consented_client: Callable[..., TestClient], field: str, value: object, message: str
) -> None:
    body = {"name": "Lefse", "kcal_per_100g": 300, field: value}

    assert _fields(consented_client().post(ITEMS_URL, json=body)) == {field: message}


def test_limits_are_inclusive(consented_client: Callable[..., TestClient]) -> None:
    client = consented_client()
    edge = {"name": "x" * 200, "kcal_per_100g": 900, "protein_g": 100, "serving_size_g": 2000}
    low = {"name": "Vann", "kcal_per_100g": 0, "fat_g": 0, "serving_size_g": 1}

    assert client.post(ITEMS_URL, json=edge).status_code == 201
    assert client.post(ITEMS_URL, json=low).status_code == 201


def test_missing_required_fields(consented_client: Callable[..., TestClient]) -> None:
    fields = _fields(consented_client().post(ITEMS_URL, json={}))

    assert set(fields) == {"name", "kcal_per_100g"}


def test_client_cannot_set_owner_or_source(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    sara = consented_client()
    consented_client("ola@eksempel.no")
    ola_id = _user_id(db_session, "ola@eksempel.no")

    response = sara.post(
        ITEMS_URL,
        json={
            "name": "Lefse",
            "kcal_per_100g": 320,
            "owner_id": str(ola_id),
            "source": "matvaretabellen",
        },
    )

    assert response.status_code == 201
    stored = _stored(db_session)
    assert stored.source == "user"
    assert stored.owner_id == _user_id(db_session, "sara@eksempel.no")


def test_owner_finds_and_logs_own_item_others_never_see_it(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    ola = consented_client("ola@eksempel.no")
    kari = consented_client("kari@eksempel.no")
    # A shared item that also matches, so over-filtering would show up too.
    db_session.add(
        FoodItem(source="matvaretabellen", owner_id=None, name="Potetlefse",
                 kcal_per_100g=Decimal("164"))
    )
    db_session.commit()
    item = ola.post(ITEMS_URL, json={"name": "Mormors lefse", "kcal_per_100g": 320}).json()

    assert sorted(i["name"] for i in ola.get(ITEMS_URL, params={"q": "lefse"}).json()) == [
        "Mormors lefse",
        "Potetlefse",
    ]
    assert [i["name"] for i in kari.get(ITEMS_URL, params={"q": "lefse"}).json()] == [
        "Potetlefse"
    ]

    entry = {"food_item_id": item["id"], "date": DAY, "meal": "dinner", "grams": 80}
    logged = ola.post(ENTRIES_URL, json=entry)
    assert logged.status_code == 201
    assert logged.json()["kcal"] == 256

    refused = kari.post(ENTRIES_URL, json=entry)
    assert refused.status_code == 404
    assert refused.json()["error"]["code"] == "food_item_not_found"
    assert count(db_session, FoodLogEntry) == 1


def test_create_requires_consent(logged_in_client: Callable[..., TestClient]) -> None:
    response = logged_in_client().post(ITEMS_URL, json={"name": "Lefse", "kcal_per_100g": 320})

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "consent_required"


def test_create_requires_login(client: TestClient) -> None:
    response = client.post(ITEMS_URL, json={"name": "Lefse", "kcal_per_100g": 320})

    assert response.status_code == 401
