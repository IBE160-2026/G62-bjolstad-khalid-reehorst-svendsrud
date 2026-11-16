"""GET /api/food/barcode/{code} (story 3.3) and the optional barcode on own items."""

from collections.abc import Callable
from datetime import timedelta
from urllib.parse import quote
from decimal import Decimal

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.food.models import FoodItem
from app.modules.food.repository import add_shared_item
from app.ports.off import (
    MOCK_NO_KCAL,
    MOCK_NOT_FOUND,
    MOCK_UNREACHABLE,
    LiveOffAdapter,
    MockOffAdapter,
    OffProduct,
    OffResult,
    RateLimiter,
    get_off_port,
)
from tests.identity.helpers import count

BARCODE_URL = "/api/food/barcode/{}"
ITEMS_URL = "/api/food/items"
ENTRIES_URL = "/api/food/entries"
CONSENT_URL = "/api/identity/consent"
MILK = "7038010000980"
INVALID = {
    "code": "invalid_barcode",
    "message": "Sjekk at strekkoden har 8 eller 13 siffer.",
}
NOT_FOUND = {
    "code": "barcode_not_found",
    "message": "Vi fant ikke denne varen. Vil du registrere den selv?",
}
UNAVAILABLE = {
    "code": "off_unavailable",
    "message": "Vi får ikke kontakt med Open Food Facts nå. Du kan registrere varen selv.",
}


@pytest.fixture
def off(app: FastAPI) -> MockOffAdapter:
    """The mock adapter the app uses, so tests can see which codes reached OFF."""
    return app.dependency_overrides[get_off_port]()


@pytest.fixture
def consented_client(logged_in_client: Callable[..., TestClient]) -> Callable[..., TestClient]:
    def factory(email: str = "sara@eksempel.no") -> TestClient:
        test_client = logged_in_client(email)
        assert test_client.post(CONSENT_URL).status_code == 200
        return test_client

    return factory


def _lookup(client: TestClient, code: str):
    return client.get(BARCODE_URL.format(quote(code, safe="")))


@pytest.mark.parametrize(
    "code", ["12345", "7038010000981", "70380100009a0", "703801000098000", "7038010000980\n"]
)
def test_invalid_codes_give_422_without_calling_off(
    consented_client: Callable[..., TestClient], off: MockOffAdapter, code: str
) -> None:
    response = _lookup(consented_client(), code)

    assert response.status_code == 422
    assert response.json() == {"error": INVALID}
    assert off.calls == []


def test_found_is_stored_as_shared_off_item_and_second_lookup_hits_cache(
    consented_client: Callable[..., TestClient], off: MockOffAdapter, db_session: Session
) -> None:
    sara = consented_client()

    response = _lookup(sara, MILK)

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["name"] == "TINE Lettmelk"
    assert body["source"] == "off"
    assert body["kcal_per_100g"] == 42
    assert body["barcode"] == MILK
    db_session.expire_all()
    stored = db_session.scalars(select(FoodItem)).one()
    assert str(stored.id) == body["id"]
    assert (stored.source, stored.owner_id, stored.external_id, stored.barcode) == (
        "off", None, MILK, MILK
    )

    # Another user gets the cached shared item; OFF is asked only once.
    again = _lookup(consented_client("ola@eksempel.no"), MILK)
    assert again.status_code == 200
    assert again.json()["id"] == body["id"]
    assert off.calls == [MILK]
    assert count(db_session, FoodItem) == 1


def test_found_item_can_be_logged(
    consented_client: Callable[..., TestClient],
) -> None:
    sara = consented_client()
    item = _lookup(sara, MILK).json()

    logged = sara.post(
        ENTRIES_URL,
        json={"food_item_id": item["id"], "date": "2026-11-16", "meal": "breakfast", "grams": 200},
    )

    assert logged.status_code == 201
    assert logged.json()["name"] == "TINE Lettmelk"
    assert logged.json()["kcal"] == 84


def test_bad_off_kcal_is_kept_as_is(consented_client: Callable[..., TestClient]) -> None:
    response = _lookup(consented_client(), "7026450051051")

    assert response.status_code == 200
    assert response.json()["kcal_per_100g"] == 95


def test_cached_shared_item_is_returned_without_off(
    consented_client: Callable[..., TestClient], off: MockOffAdapter, db_session: Session
) -> None:
    db_session.add(
        FoodItem(source="off", owner_id=None, external_id=MOCK_NOT_FOUND,
                 barcode=MOCK_NOT_FOUND, name="Bufret vare", kcal_per_100g=Decimal("100"))
    )
    db_session.commit()

    response = _lookup(consented_client(), MOCK_NOT_FOUND)

    assert response.status_code == 200
    assert response.json()["name"] == "Bufret vare"
    assert off.calls == []


def test_own_item_comes_first_and_is_not_seen_by_others(
    consented_client: Callable[..., TestClient], off: MockOffAdapter, db_session: Session
) -> None:
    sara = consented_client()
    ola = consented_client("ola@eksempel.no")
    db_session.add(
        FoodItem(source="off", owner_id=None, external_id=MILK, barcode=MILK,
                 name="TINE Lettmelk", kcal_per_100g=Decimal("42"))
    )
    db_session.commit()
    created = sara.post(
        ITEMS_URL, json={"name": "Min melk", "kcal_per_100g": 40, "barcode": MILK}
    )
    assert created.status_code == 201
    assert created.json()["barcode"] == MILK

    assert _lookup(sara, MILK).json()["name"] == "Min melk"
    assert _lookup(ola, MILK).json()["name"] == "TINE Lettmelk"
    assert off.calls == []


def test_own_item_with_barcode_is_found_without_off(
    consented_client: Callable[..., TestClient], off: MockOffAdapter
) -> None:
    sara = consented_client()
    sara.post(ITEMS_URL, json={"name": "Mormors lefse", "kcal_per_100g": 320,
                               "barcode": MOCK_NOT_FOUND})

    response = _lookup(sara, MOCK_NOT_FOUND)

    assert response.status_code == 200
    assert response.json()["name"] == "Mormors lefse"
    assert response.json()["source"] == "user"
    assert off.calls == []


@pytest.mark.parametrize("code", [MOCK_NO_KCAL, MOCK_NOT_FOUND])
def test_not_found_and_no_kcal_give_404_and_store_nothing(
    consented_client: Callable[..., TestClient], db_session: Session, code: str
) -> None:
    response = _lookup(consented_client(), code)

    assert response.status_code == 404
    assert response.json() == {"error": NOT_FOUND}
    assert count(db_session, FoodItem) == 0


def test_unreachable_gives_503_and_stores_nothing(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    response = _lookup(consented_client(), MOCK_UNREACHABLE)

    assert response.status_code == 503
    assert response.json() == {"error": UNAVAILABLE}
    assert count(db_session, FoodItem) == 0


def test_fifteenth_live_lookup_in_a_minute_is_unavailable(
    app: FastAPI, consented_client: Callable[..., TestClient]
) -> None:
    calls: list[str] = []

    def urlopen(request, timeout):  # noqa: ANN001, ANN202 - a stub that is always "404"
        import urllib.error

        calls.append(request.full_url)
        raise urllib.error.HTTPError(request.full_url, 404, "Not Found", {}, None)  # type: ignore[arg-type]

    live = LiveOffAdapter(urlopen=urlopen, limiter=RateLimiter(clock=lambda: 0.0))
    app.dependency_overrides[get_off_port] = lambda: live
    sara = consented_client()

    statuses = [_lookup(sara, MOCK_NOT_FOUND).status_code for _ in range(15)]

    assert statuses == [404] * 14 + [503]
    assert len(calls) == 14


def test_concurrent_cache_insert_returns_the_existing_item(db_session: Session) -> None:
    first = FoodItem(source="off", owner_id=None, external_id=MILK, barcode=MILK,
                     name="TINE Lettmelk", kcal_per_100g=Decimal("42"))
    db_session.add(first)
    db_session.flush()

    duplicate = FoodItem(source="off", owner_id=None, external_id=MILK, barcode=MILK,
                         name="Dobbel", kcal_per_100g=Decimal("42"))

    assert add_shared_item(db_session, duplicate) is first


def test_shared_barcode_is_unique_but_own_items_may_repeat_it(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    sara = consented_client()
    ola = consented_client("ola@eksempel.no")
    _lookup(sara, MILK)
    body = {"name": "Min melk", "kcal_per_100g": 40, "barcode": MILK}

    assert sara.post(ITEMS_URL, json=body).status_code == 201
    assert sara.post(ITEMS_URL, json=body).status_code == 201
    assert ola.post(ITEMS_URL, json=body).status_code == 201
    assert count(db_session, FoodItem) == 4


@pytest.mark.parametrize(
    ("barcode", "stored"),
    [(None, None), ("", None), ("  ", None), ("7038 0100 0098 0", MILK), ("96385074", "96385074")],
)
def test_own_item_barcode_is_optional_and_normalised(
    consented_client: Callable[..., TestClient], barcode: str | None, stored: str | None
) -> None:
    response = consented_client().post(
        ITEMS_URL, json={"name": "Lefse", "kcal_per_100g": 300, "barcode": barcode}
    )

    assert response.status_code == 201, response.text
    assert response.json()["barcode"] == stored


@pytest.mark.parametrize("barcode", ["12345", "7038010000981", "abc", "1" * 40])
def test_own_item_invalid_barcode_is_a_field_error(
    consented_client: Callable[..., TestClient], db_session: Session, barcode: str
) -> None:
    response = consented_client().post(
        ITEMS_URL, json={"name": "Lefse", "kcal_per_100g": 300, "barcode": barcode}
    )

    assert response.status_code == 422
    assert response.json()["error"]["fields"] == [
        {"field": "barcode", "message": INVALID["message"]}
    ]
    assert count(db_session, FoodItem) == 0


def test_lookup_requires_consent(logged_in_client: Callable[..., TestClient]) -> None:
    response = _lookup(logged_in_client(), MILK)

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "consent_required"


def test_lookup_requires_login(client: TestClient, off: MockOffAdapter) -> None:
    assert _lookup(client, MILK).status_code == 401
    assert off.calls == []


class StubPort:
    def __init__(self, result: OffResult) -> None:
        self.result = result

    def lookup(self, barcode: str) -> OffResult:
        return self.result


def test_off_macros_and_serving_size_are_cached(
    app: FastAPI, consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    product = OffProduct(
        name="AXA Havregryn",
        kcal_per_100g=Decimal("367"),
        protein_g=Decimal("13.5"),
        carbs_g=Decimal("58.2"),
        fat_g=Decimal("7.1"),
        serving_size_g=Decimal("40.0"),
    )
    app.dependency_overrides[get_off_port] = lambda: StubPort(product)

    response = _lookup(consented_client(), "7044416013141")

    assert response.status_code == 200, response.text
    body = response.json()
    assert (body["protein_g"], body["carbs_g"], body["fat_g"], body["serving_size_g"]) == (
        13.5, 58.2, 7.1, 40
    )
    db_session.expire_all()
    stored = db_session.scalars(select(FoodItem)).one()
    assert (stored.protein_g, stored.carbs_g, stored.fat_g, stored.serving_size_g) == (
        Decimal("13.5"), Decimal("58.2"), Decimal("7.1"), Decimal("40.0")
    )


def test_newest_own_item_with_the_barcode_wins(
    consented_client: Callable[..., TestClient], clock, off: MockOffAdapter
) -> None:
    sara = consented_client()
    sara.post(ITEMS_URL, json={"name": "Gammel melk", "kcal_per_100g": 40, "barcode": MILK})
    clock.advance(timedelta(minutes=1))
    sara.post(ITEMS_URL, json={"name": "Ny melk", "kcal_per_100g": 41, "barcode": MILK})

    response = _lookup(sara, MILK)

    assert response.json()["name"] == "Ny melk"
    assert off.calls == []
