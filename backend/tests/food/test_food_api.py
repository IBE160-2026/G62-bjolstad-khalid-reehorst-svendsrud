"""/api/food (story 3.1): search, logging entries, day sums, isolation and consent."""

import uuid
from collections.abc import Callable
from datetime import datetime
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.food.models import FoodItem, FoodLogEntry
from app.modules.identity.models import User
from app.seed.seed import seed_food_items
from tests.conftest import Clock
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


@pytest.fixture
def seeded(db_session: Session) -> None:
    seed_food_items(db_session)
    db_session.commit()


def _item(db: Session, name: str) -> FoodItem:
    db.expire_all()
    return db.scalars(select(FoodItem).where(FoodItem.name == name)).one()


def _add_item(db: Session, name: str, kcal: str, owner_email: str | None = None) -> FoodItem:
    owner_id = None
    if owner_email:
        owner_id = db.scalars(select(User.id).where(User.email == owner_email)).one()
    item = FoodItem(
        source="user" if owner_id else "matvaretabellen",
        owner_id=owner_id,
        name=name,
        kcal_per_100g=Decimal(kcal),
    )
    db.add(item)
    db.commit()
    return item


def _log(client: TestClient, item_id: uuid.UUID, grams: float, meal: str = "lunch",
         day: str = DAY):
    return client.post(
        ENTRIES_URL,
        json={"food_item_id": str(item_id), "date": day, "meal": meal, "grams": grams},
    )


def _names(response) -> list[str]:
    assert response.status_code == 200, response.text
    return [item["name"] for item in response.json()]


# --- Search ---------------------------------------------------------------------------


@pytest.mark.usefixtures("seeded")
def test_search_contains_is_case_insensitive(
    consented_client: Callable[..., TestClient],
) -> None:
    client = consented_client()

    lower = _names(client.get(ITEMS_URL, params={"q": "mel"}))
    upper = _names(client.get(ITEMS_URL, params={"q": "MEL"}))

    assert "Havremel" in lower
    assert lower == upper
    assert len(lower) <= 20


@pytest.mark.usefixtures("seeded")
def test_search_puts_prefix_matches_first_then_shorter_names(
    consented_client: Callable[..., TestClient],
) -> None:
    names = _names(consented_client().get(ITEMS_URL, params={"q": "mel"}))

    prefix = [name for name in names if name.lower().startswith("mel")]
    assert names[: len(prefix)] == prefix
    rest = names[len(prefix) :]
    assert [len(name) for name in rest] == sorted(len(name) for name in rest)


@pytest.mark.usefixtures("seeded")
def test_search_returns_at_most_20(consented_client: Callable[..., TestClient]) -> None:
    assert len(_names(consented_client().get(ITEMS_URL, params={"q": "er"}))) == 20


@pytest.mark.usefixtures("seeded")
@pytest.mark.parametrize("query", ["", "m", " m ", "xyzq"])
def test_short_or_unmatched_query_returns_empty_list(
    consented_client: Callable[..., TestClient], query: str
) -> None:
    response = consented_client().get(ITEMS_URL, params={"q": query})

    assert response.status_code == 200
    assert response.json() == []


def test_search_treats_like_wildcards_literally(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    _add_item(db_session, "Melk", "64")

    assert _names(client.get(ITEMS_URL, params={"q": "%%"})) == []
    assert _names(client.get(ITEMS_URL, params={"q": "__"})) == []


def test_search_shows_own_items_but_never_other_users(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    ola = consented_client("ola@eksempel.no")
    kari = consented_client("kari@eksempel.no")
    _add_item(db_session, "Olas havrebrød", "250", owner_email="ola@eksempel.no")
    _add_item(db_session, "Havremel", "369")

    assert _names(ola.get(ITEMS_URL, params={"q": "havre"})) == ["Havremel", "Olas havrebrød"]
    assert _names(kari.get(ITEMS_URL, params={"q": "havre"})) == ["Havremel"]


def test_search_item_has_kcal_and_macros(
    consented_client: Callable[..., TestClient], seeded: None
) -> None:
    item = consented_client().get(ITEMS_URL, params={"q": "havremel"}).json()[0]

    assert item["name"] == "Havremel"
    assert item["source"] == "matvaretabellen"
    assert item["kcal_per_100g"] == 369
    assert item["protein_g"] == 14.1


# --- Logging --------------------------------------------------------------------------


def test_save_stores_entry_with_snapshot(
    consented_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = consented_client()
    milk = _add_item(db_session, "Helmelk", "63")

    response = _log(client, milk.id, 150)

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["name"] == "Helmelk"
    assert body["meal"] == "lunch"
    assert body["date"] == DAY
    assert body["grams"] == 150
    assert body["kcal_per_100g_snapshot"] == 63
    assert body["kcal"] == 94.5
    assert datetime.fromisoformat(body["created_at"]) == clock.now

    db_session.expire_all()
    stored = db_session.scalars(select(FoodLogEntry)).one()
    assert stored.kcal_per_100g_snapshot == Decimal("63")
    assert stored.grams == Decimal("150.0")


def test_snapshot_keeps_history_when_item_changes(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    milk = _add_item(db_session, "Helmelk", "63")
    assert _log(client, milk.id, 100).status_code == 201

    _item(db_session, "Helmelk").kcal_per_100g = Decimal("80")
    db_session.commit()

    assert client.get(ENTRIES_URL, params={"date": DAY}).json()["total_kcal"] == 63


@pytest.mark.parametrize(
    ("grams", "message"),
    [
        (0, "Skriv inn en mengde over 0 g."),
        (-5, "Skriv inn en mengde over 0 g."),
        (5000.1, "Skriv inn en mengde på høyst 5 000 g."),
        (12.34, "Skriv mengden med høyst én desimal."),
    ],
)
def test_bad_grams_give_field_error_and_store_nothing(
    consented_client: Callable[..., TestClient],
    db_session: Session,
    grams: float,
    message: str,
) -> None:
    client = consented_client()
    milk = _add_item(db_session, "Helmelk", "63")

    response = _log(client, milk.id, grams)

    assert response.status_code == 422
    assert response.json()["error"]["fields"] == [{"field": "grams", "message": message}]
    assert count(db_session, FoodLogEntry) == 0


def test_5000_grams_is_allowed(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    milk = _add_item(db_session, "Helmelk", "63")

    assert _log(consented_client(), milk.id, 5000).status_code == 201


def test_unknown_meal_is_a_field_error(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    milk = _add_item(db_session, "Helmelk", "63")

    response = _log(consented_client(), milk.id, 100, meal="brunch")

    assert response.status_code == 422
    assert response.json()["error"]["fields"][0]["field"] == "meal"


def test_cannot_log_another_users_item(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    consented_client("ola@eksempel.no")
    kari = consented_client("kari@eksempel.no")
    olas = _add_item(db_session, "Olas brød", "250", owner_email="ola@eksempel.no")

    response = _log(kari, olas.id, 100)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "food_item_not_found"
    assert count(db_session, FoodLogEntry) == 0


# --- Day sums -------------------------------------------------------------------------


def test_day_groups_by_meal_and_sums_unrounded(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = consented_client()
    milk = _add_item(db_session, "Helmelk", "63")
    oats = _add_item(db_session, "Havremel", "369")
    assert _log(client, milk.id, 50).status_code == 201  # 31.5
    assert _log(client, milk.id, 100).status_code == 201  # 63
    assert _log(client, oats.id, 40, meal="breakfast").status_code == 201  # 147.6
    assert _log(client, oats.id, 10, day="2026-11-15").status_code == 201  # other date

    response = client.get(ENTRIES_URL, params={"date": DAY})

    assert response.status_code == 200
    body = response.json()
    assert body["date"] == DAY
    assert [meal["meal"] for meal in body["meals"]] == ["breakfast", "lunch", "dinner", "snack"]
    totals = {meal["meal"]: meal["total_kcal"] for meal in body["meals"]}
    assert totals == {"breakfast": pytest.approx(147.6), "lunch": 94.5, "dinner": 0, "snack": 0}
    lunch = body["meals"][1]["entries"]
    assert [entry["kcal"] for entry in lunch] == [31.5, 63]
    assert body["total_kcal"] == pytest.approx(242.1)


def test_empty_day_has_four_empty_meals(consented_client: Callable[..., TestClient]) -> None:
    body = consented_client().get(ENTRIES_URL, params={"date": DAY}).json()

    assert [meal["entries"] for meal in body["meals"]] == [[], [], [], []]
    assert body["total_kcal"] == 0


def test_day_shows_only_own_entries(
    consented_client: Callable[..., TestClient], db_session: Session
) -> None:
    ola = consented_client("ola@eksempel.no")
    kari = consented_client("kari@eksempel.no")
    milk = _add_item(db_session, "Helmelk", "63")
    assert _log(ola, milk.id, 100).status_code == 201
    assert _log(kari, milk.id, 200).status_code == 201

    ola_day = ola.get(ENTRIES_URL, params={"date": DAY}).json()

    assert ola_day["total_kcal"] == 63
    assert [e["grams"] for e in ola_day["meals"][1]["entries"]] == [100]


def test_day_requires_a_valid_date(consented_client: Callable[..., TestClient]) -> None:
    client = consented_client()

    assert client.get(ENTRIES_URL).status_code == 422
    assert client.get(ENTRIES_URL, params={"date": "16.11.2026"}).status_code == 422


# --- Access ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("method", "url", "kwargs"),
    [
        ("get", ITEMS_URL, {"params": {"q": "mel"}}),
        ("get", ENTRIES_URL, {"params": {"date": DAY}}),
        (
            "post",
            ENTRIES_URL,
            {
                "json": {
                    "food_item_id": str(uuid.uuid4()),
                    "date": DAY,
                    "meal": "lunch",
                    "grams": 100,
                }
            },
        ),
    ],
)
def test_every_endpoint_requires_consent(
    logged_in_client: Callable[..., TestClient], method: str, url: str, kwargs: dict
) -> None:
    response = getattr(logged_in_client(), method)(url, **kwargs)

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "consent_required"


def test_endpoints_require_login(client: TestClient) -> None:
    assert client.get(ITEMS_URL, params={"q": "mel"}).status_code == 401
    assert client.get(ENTRIES_URL, params={"date": DAY}).status_code == 401
