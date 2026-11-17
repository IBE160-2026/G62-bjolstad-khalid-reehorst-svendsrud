"""Equipment Profiles (story 4.2): defaults, CRUD, bodyweight always in, limits, isolation."""

import uuid
from collections.abc import Callable, Iterator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, func, select, text, update
from sqlalchemy.orm import Session

from app.modules.exercises.models import EquipmentProfile, EquipmentProfileItem
from app.modules.identity import service as identity_service
from app.modules.identity.models import User
from app.seed.seed import seed_exercises
from tests.exercises.test_seed import truncate_exercises

EQUIPMENT_URL = "/api/exercises/equipment"
URL = "/api/exercises/equipment-profiles"
ALL_NAMES = [
    "Kroppsvekt",
    "Manualer",
    "Stang og skiver",
    "Benk",
    "Kettlebell",
    "Strikk",
    "Trekkestang",
    "Kabelmaskin",
    "Beinpress/maskiner",
]


@pytest.fixture(autouse=True)
def seeded(test_engine: Engine, db_session: Session) -> Iterator[None]:
    truncate_exercises(test_engine)
    seed_exercises(db_session)
    db_session.commit()
    yield
    db_session.rollback()  # end the read transaction, or TRUNCATE waits for its lock
    truncate_exercises(test_engine)


def _names(profile: dict) -> list[str]:
    return [item["name"] for item in profile["equipment"]]


def _profiles(client: TestClient) -> list[dict]:
    response = client.get(URL)
    assert response.status_code == 200, response.text
    return response.json()


def _count(db: Session, model: type) -> int:
    db.expire_all()
    value = db.scalar(select(func.count()).select_from(model)) or 0
    db.rollback()  # end the read transaction, or the teardown TRUNCATE waits for its lock
    return value


def _field_errors(response) -> dict[str, str]:
    return {f["field"]: f["message"] for f in response.json()["error"].get("fields", [])}


def test_equipment_lists_nine_types_in_seed_order(
    logged_in_client: Callable[..., TestClient],
) -> None:
    response = logged_in_client().get(EQUIPMENT_URL)

    assert response.status_code == 200
    assert [item["name"] for item in response.json()] == ALL_NAMES
    assert response.json()[0]["slug"] == "kroppsvekt"


def test_profiles_require_login(client: TestClient) -> None:
    assert client.get(URL).status_code == 401
    assert client.post(URL, json={"name": "Hytta"}).status_code == 401


def test_register_creates_exactly_the_two_defaults(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    test_client = logged_in_client()
    # Counted before any GET, so these come from registration, not lazy creation.
    assert _count(db_session, EquipmentProfile) == 2
    assert _count(db_session, EquipmentProfileItem) == 10

    profiles = _profiles(test_client)

    assert [p["name"] for p in profiles] == ["Hjemme", "Treningssenter"]
    assert _names(profiles[0]) == ["Kroppsvekt"]
    assert _names(profiles[1]) == ALL_NAMES
    assert _count(db_session, EquipmentProfile) == 2


def test_profile_without_bodyweight_is_repaired_on_read(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    # As if the profile was made before the equipment seed ran.
    test_client = logged_in_client()
    db_session.execute(
        text(
            "DELETE FROM equipment_profile_items WHERE equipment_id = "
            "(SELECT id FROM equipment WHERE slug = 'kroppsvekt')"
        )
    )
    db_session.commit()

    profiles = _profiles(test_client)

    assert _names(profiles[0]) == ["Kroppsvekt"]
    assert _names(profiles[1]) == ALL_NAMES
    assert _count(db_session, EquipmentProfileItem) == 10


def test_old_user_gets_defaults_once(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    test_client = logged_in_client()
    db_session.execute(text("DELETE FROM equipment_profiles"))
    db_session.commit()

    first = _profiles(test_client)
    second = _profiles(test_client)

    assert [p["name"] for p in first] == ["Hjemme", "Treningssenter"]
    assert second == first
    assert _count(db_session, EquipmentProfile) == 2


def test_create_adds_bodyweight(logged_in_client: Callable[..., TestClient]) -> None:
    test_client = logged_in_client()

    response = test_client.post(URL, json={"name": "  Hytta ", "equipment": ["manualer"]})

    assert response.status_code == 201, response.text
    assert response.json()["name"] == "Hytta"
    assert _names(response.json()) == ["Kroppsvekt", "Manualer"]
    assert [p["name"] for p in _profiles(test_client)] == ["Hjemme", "Treningssenter", "Hytta"]


def test_untick_bodyweight_keeps_it(logged_in_client: Callable[..., TestClient]) -> None:
    test_client = logged_in_client()
    home = _profiles(test_client)[0]

    response = test_client.patch(f"{URL}/{home['id']}", json={"equipment": ["manualer"]})

    assert response.status_code == 200, response.text
    assert response.json()["name"] == "Hjemme"
    assert _names(response.json()) == ["Kroppsvekt", "Manualer"]


def test_rename_and_change_equipment(logged_in_client: Callable[..., TestClient]) -> None:
    test_client = logged_in_client()
    gym = _profiles(test_client)[1]

    response = test_client.patch(
        f"{URL}/{gym['id']}", json={"name": "Senteret", "equipment": ["benk", "kroppsvekt"]}
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Senteret"
    assert _names(response.json()) == ["Kroppsvekt", "Benk"]
    # Changing only the case of its own name is allowed.
    response = test_client.patch(f"{URL}/{gym['id']}", json={"name": "senteret"})
    assert response.status_code == 200
    assert _names(response.json()) == ["Kroppsvekt", "Benk"]


@pytest.mark.parametrize(
    ("body", "field", "message"),
    [
        ({"name": "   "}, "name", "Skriv et navn på profilen."),
        ({"name": "x" * 41}, "name", "Skriv et navn på høyst 40 tegn."),
        ({"name": "hjemme"}, "name", "Du har allerede en profil som heter det."),
        ({"name": "Hytta", "equipment": ["laser"]}, "equipment", "Velg utstyr fra listen."),
    ],
)
def test_create_rejects_bad_input(
    logged_in_client: Callable[..., TestClient],
    db_session: Session,
    body: dict,
    field: str,
    message: str,
) -> None:
    response = logged_in_client().post(URL, json=body)

    assert response.status_code == 422
    assert _field_errors(response) == {field: message}
    assert _count(db_session, EquipmentProfile) == 2


def test_update_rejects_duplicate_and_unknown_slug(
    logged_in_client: Callable[..., TestClient],
) -> None:
    test_client = logged_in_client()
    home, gym = _profiles(test_client)

    duplicate = test_client.patch(f"{URL}/{gym['id']}", json={"name": "HJEMME"})
    unknown = test_client.patch(f"{URL}/{home['id']}", json={"equipment": ["laser"]})

    assert duplicate.status_code == 422
    assert _field_errors(duplicate) == {"name": "Du har allerede en profil som heter det."}
    assert unknown.status_code == 422
    assert "equipment" in _field_errors(unknown)
    assert _profiles(test_client) == [home, gym]


def test_eleventh_profile_is_refused(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    test_client = logged_in_client()
    for number in range(8):
        assert test_client.post(URL, json={"name": f"Sted {number}"}).status_code == 201

    response = test_client.post(URL, json={"name": "Ett for mye"})

    assert response.status_code == 422
    assert response.json()["error"] == {
        "code": "equipment_profile_limit",
        "message": "Du kan ha opptil 10 utstyrsprofiler.",
    }
    assert _count(db_session, EquipmentProfile) == 10


def test_delete_and_last_profile_is_kept(logged_in_client: Callable[..., TestClient]) -> None:
    test_client = logged_in_client()
    home, gym = _profiles(test_client)

    assert test_client.delete(f"{URL}/{gym['id']}").status_code == 204
    response = test_client.delete(f"{URL}/{home['id']}")

    assert response.status_code == 409
    assert response.json()["error"] == {
        "code": "last_equipment_profile",
        "message": "Du må ha minst én utstyrsprofil.",
    }
    assert [p["name"] for p in _profiles(test_client)] == ["Hjemme"]


def test_other_users_profile_is_not_found(
    logged_in_client: Callable[..., TestClient],
) -> None:
    ola = logged_in_client("ola@eksempel.no")
    kari = logged_in_client("kari@eksempel.no")
    ola_profiles = _profiles(ola)
    target = f"{URL}/{ola_profiles[0]['id']}"

    for response in (
        kari.patch(target, json={"name": "Min nå"}),
        kari.delete(target),
        kari.patch(f"{URL}/00000000-0000-4000-8000-000000000000", json={"name": "X"}),
    ):
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "equipment_profile_not_found"
    assert ola_profiles[0]["id"] not in {p["id"] for p in _profiles(kari)}
    assert _profiles(ola) == ola_profiles


def test_purge_removes_profiles_and_items(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    logged_in_client()
    assert _count(db_session, EquipmentProfileItem) == 10
    now = datetime.now(UTC)
    db_session.execute(update(User).values(deleted_at=now - timedelta(days=31)))
    db_session.commit()

    assert identity_service.purge_deleted(db_session, now) == 1
    db_session.commit()

    assert _count(db_session, EquipmentProfile) == 0
    assert _count(db_session, EquipmentProfileItem) == 0


def test_limits_and_names_are_per_user(logged_in_client: Callable[..., TestClient]) -> None:
    ola = logged_in_client("ola@eksempel.no")
    kari = logged_in_client("kari@eksempel.no")
    assert ola.post(URL, json={"name": "Hytta"}).status_code == 201
    for number in range(7):
        assert ola.post(URL, json={"name": f"Sted {number}"}).status_code == 201
    assert len(_profiles(ola)) == 10

    assert kari.post(URL, json={"name": "Hytta"}).status_code == 201
    home, gym, cabin = _profiles(kari)
    assert kari.delete(f"{URL}/{gym['id']}").status_code == 204
    assert kari.delete(f"{URL}/{cabin['id']}").status_code == 204
    response = kari.delete(f"{URL}/{home['id']}")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "last_equipment_profile"
    assert len(_profiles(ola)) == 10


def test_writes_need_a_matching_origin(logged_in_client: Callable[..., TestClient]) -> None:
    test_client = logged_in_client()
    home = _profiles(test_client)[0]
    target = f"{URL}/{home['id']}"
    bad = {"Origin": "https://evil.example"}

    patch = test_client.patch(target, json={"name": "Borte"}, headers=bad)
    delete = test_client.delete(target, headers=bad)

    assert patch.status_code == 403
    assert delete.status_code == 403
    assert patch.json()["error"]["code"] == "origin_mismatch"
    assert _profiles(test_client)[0] == home


def test_change_and_equipment_require_login(client: TestClient) -> None:
    target = f"{URL}/00000000-0000-4000-8000-000000000000"
    for response in (
        client.get(EQUIPMENT_URL),
        client.patch(target, json={"name": "X"}),
        client.delete(target),
    ):
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "unauthorized"


@pytest.mark.parametrize(
    ("name", "message"),
    [("  ", "Skriv et navn på profilen."), ("x" * 41, "Skriv et navn på høyst 40 tegn.")],
)
def test_update_rejects_bad_name(
    logged_in_client: Callable[..., TestClient], name: str, message: str
) -> None:
    test_client = logged_in_client()
    home = _profiles(test_client)[0]

    response = test_client.patch(f"{URL}/{home['id']}", json={"name": name})

    assert response.status_code == 422
    assert _field_errors(response) == {"name": message}
    assert _profiles(test_client)[0] == home


def test_too_many_equipment_entries_are_refused(
    logged_in_client: Callable[..., TestClient],
) -> None:
    response = logged_in_client().post(URL, json={"name": "Hytta", "equipment": ["benk"] * 21})

    assert response.status_code == 422
    assert "equipment" in _field_errors(response)


def test_delete_unknown_profile_is_not_found(
    logged_in_client: Callable[..., TestClient],
) -> None:
    response = logged_in_client().delete(f"{URL}/{uuid.uuid4()}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "equipment_profile_not_found"
