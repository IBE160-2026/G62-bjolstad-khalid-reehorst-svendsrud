"""Search exercises by name (story 4.4): the pure ranking over stub input, and the endpoint
over the real seed."""

import uuid
from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.modules.exercises.service import SuggestionCandidate, rank_search_matches
from app.seed.seed import seed_exercises
from tests.exercises.test_seed import DATA, truncate_exercises

URL = "/api/exercises/search"
PROFILES_URL = "/api/exercises/equipment-profiles"
LEVELS = ["beginner", "intermediate", "advanced"]
MUSCLE_POSITION = {row["name"]: index for index, row in enumerate(DATA["muscle_groups"])}

SQUAT = "Kroppsvektknebøy (Bodyweight squat)"
BARBELL_SQUAT = "Knebøy med stang (Barbell back squat)"
DEADLIFT = "Markløft (Deadlift)"
DB_RDL = "Rumensk markløft med manualer (Dumbbell Romanian deadlift)"


# --- The pure ranking (reuses the 4.3 fit check) ---


def _candidate(name: str, level: str, muscle: int, *slugs: str) -> SuggestionCandidate[str]:
    return SuggestionCandidate(name, level, muscle, frozenset(slugs), name)


def test_fitting_first_then_suggestion_order() -> None:
    stub = [
        _candidate("a-bar", "beginner", 0, "kroppsvekt", "stang-og-skiver"),
        _candidate("b-fit", "advanced", 0, "kroppsvekt"),
        _candidate("c-fit", "beginner", 1, "kroppsvekt"),
        _candidate("d-dumb", "beginner", 0, "manualer", "benk"),
    ]

    matches = rank_search_matches(stub, ["kroppsvekt", "benk"])

    assert [m.candidate.item for m in matches] == ["c-fit", "b-fit", "a-bar", "d-dumb"]
    assert [m.fits for m in matches] == [True, True, False, False]
    assert matches[2].missing == {"stang-og-skiver"}
    assert matches[3].missing == {"manualer"}


def test_empty_input_gives_empty_list() -> None:
    assert rank_search_matches([], ["kroppsvekt"]) == []


# --- The endpoint ---


@pytest.fixture
def seeded(test_engine: Engine, db_session: Session) -> Iterator[None]:
    truncate_exercises(test_engine)
    seed_exercises(db_session)
    db_session.commit()
    yield
    db_session.rollback()  # end the read transaction, or TRUNCATE waits for its lock
    truncate_exercises(test_engine)


def _profile_ids(client: TestClient) -> dict[str, str]:
    response = client.get(PROFILES_URL)
    assert response.status_code == 200, response.text
    return {profile["name"]: profile["id"] for profile in response.json()}


def _search(client: TestClient, profile_id: str, q: str):
    return client.get(URL, params={"profile_id": profile_id, "q": q})


def _by_name(body: dict) -> dict[str, dict]:
    return {item["name"]: item for item in body["exercises"]}


@pytest.mark.usefixtures("seeded")
def test_contains_marks_fit_and_missing_equipment(
    logged_in_client: Callable[..., TestClient],
) -> None:
    client = logged_in_client()
    home = _profile_ids(client)["Hjemme"]

    response = _search(client, home, "knebøy")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["profile_id"] == home
    assert body["profile_name"] == "Hjemme"
    expected = {row["name"] for row in DATA["exercises"] if "knebøy" in row["name"].lower()}
    items = _by_name(body)
    assert set(items) == expected
    assert items[SQUAT]["fits"] is True
    assert items[SQUAT]["missing_equipment"] == []
    assert items[BARBELL_SQUAT]["fits"] is False
    assert items[BARBELL_SQUAT]["missing_equipment"] == ["Stang og skiver"]
    assert set(items[SQUAT]) == {
        "id",
        "name",
        "level",
        "primary_muscle_group",
        "equipment",
        "fits",
        "missing_equipment",
    }


@pytest.mark.usefixtures("seeded")
@pytest.mark.parametrize("q", ["KNEBØY", "  Knebøy  ", "kNeBøY"])
def test_case_and_whitespace_do_not_matter(
    logged_in_client: Callable[..., TestClient], q: str
) -> None:
    client = logged_in_client()
    home = _profile_ids(client)["Hjemme"]

    upper = _search(client, home, q).json()
    lower = _search(client, home, "knebøy").json()

    assert upper["exercises"] == lower["exercises"]
    assert len(upper["exercises"]) >= 2


@pytest.mark.usefixtures("seeded")
def test_searches_the_whole_list_not_only_suggestions(
    logged_in_client: Callable[..., TestClient],
) -> None:
    client = logged_in_client()
    home = _profile_ids(client)["Hjemme"]

    items = _by_name(_search(client, home, "markløft").json())

    assert set(items) == {DEADLIFT, DB_RDL}
    assert items[DEADLIFT]["fits"] is False
    assert items[DEADLIFT]["missing_equipment"] == ["Stang og skiver"]
    assert items[DB_RDL]["fits"] is False
    assert items[DB_RDL]["missing_equipment"] == ["Manualer"]


@pytest.mark.usefixtures("seeded")
def test_english_part_of_the_name_matches(
    logged_in_client: Callable[..., TestClient],
) -> None:
    client = logged_in_client()
    home = _profile_ids(client)["Hjemme"]

    names = [item["name"] for item in _search(client, home, "deadlift").json()["exercises"]]

    assert set(names) == {DEADLIFT, DB_RDL}


@pytest.mark.usefixtures("seeded")
def test_fitting_first_then_level_muscle_name(
    logged_in_client: Callable[..., TestClient],
) -> None:
    client = logged_in_client()
    created = client.post(PROFILES_URL, json={"name": "Hytta", "equipment": ["manualer"]})
    assert created.status_code == 201, created.text

    # "er" matches much of the list, so fitting and non-fitting are mixed.
    items = _search(client, created.json()["id"], "er").json()["exercises"]

    fits = [item["fits"] for item in items]
    assert True in fits and False in fits
    assert fits == sorted(fits, reverse=True)
    for group in (True, False):
        keys = [
            (
                LEVELS.index(item["level"]),
                MUSCLE_POSITION[item["primary_muscle_group"]],
                item["name"].lower(),
            )
            for item in items
            if item["fits"] is group
        ]
        assert keys == sorted(keys)
    for item in items:
        assert item["fits"] == (item["missing_equipment"] == [])


@pytest.mark.usefixtures("seeded")
def test_missing_equipment_in_seed_order(
    logged_in_client: Callable[..., TestClient],
) -> None:
    client = logged_in_client()
    home = _profile_ids(client)["Hjemme"]
    seed_order = [row["name"] for row in DATA["equipment"]]

    for item in _search(client, home, "er").json()["exercises"]:
        missing = item["missing_equipment"]
        assert missing == sorted(missing, key=seed_order.index)
        assert "Kroppsvekt" not in missing


@pytest.mark.usefixtures("seeded")
def test_several_missing_items_in_seed_order(
    logged_in_client: Callable[..., TestClient],
) -> None:
    client = logged_in_client()
    home = _profile_ids(client)["Hjemme"]

    items = _by_name(_search(client, home, "benk").json())

    assert items["Manual benkpress (Dumbbell bench press)"]["missing_equipment"] == [
        "Manualer",
        "Benk",
    ]
    assert items["Benkpress (Barbell bench press)"]["missing_equipment"] == [
        "Stang og skiver",
        "Benk",
    ]


@pytest.mark.usefixtures("seeded")
def test_decomposed_letters_match_and_count_once(
    logged_in_client: Callable[..., TestClient],
) -> None:
    client = logged_in_client()
    home = _profile_ids(client)["Hjemme"]
    # A decomposed "å" ("a" + U+030A) is two code points; after NFC it is one character,
    # so it is too short, like "k".
    response = _search(client, home, "a\u030a")

    assert response.status_code == 422
    assert [f["field"] for f in response.json()["error"]["fields"]] == ["q"]


@pytest.mark.usefixtures("seeded")
def test_no_match_gives_empty_list(logged_in_client: Callable[..., TestClient]) -> None:
    client = logged_in_client()
    home = _profile_ids(client)["Hjemme"]

    response = _search(client, home, "zzz")

    assert response.status_code == 200
    assert response.json()["exercises"] == []


@pytest.mark.usefixtures("seeded")
@pytest.mark.parametrize("q", ["%%", "__", "\\\\"])
def test_like_wildcards_match_themselves(
    logged_in_client: Callable[..., TestClient], q: str
) -> None:
    client = logged_in_client()
    home = _profile_ids(client)["Hjemme"]

    response = _search(client, home, q)

    assert response.status_code == 200, response.text
    assert response.json()["exercises"] == []


@pytest.mark.usefixtures("seeded")
@pytest.mark.parametrize("q", ["k", " k ", "", "   ", "x" * 51])
def test_query_length_is_checked(logged_in_client: Callable[..., TestClient], q: str) -> None:
    client = logged_in_client()
    home = _profile_ids(client)["Hjemme"]

    response = _search(client, home, q)

    assert response.status_code == 422
    fields = response.json()["error"]["fields"]
    assert [field["field"] for field in fields] == ["q"]


@pytest.mark.usefixtures("seeded")
@pytest.mark.parametrize("missing", ["q", "profile_id"])
def test_missing_parameter_is_422_in_app_shape(
    logged_in_client: Callable[..., TestClient], missing: str
) -> None:
    client = logged_in_client()
    params = {"profile_id": _profile_ids(client)["Hjemme"], "q": "knebøy"}
    del params[missing]

    response = client.get(URL, params=params)

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert [field["field"] for field in error["fields"]] == [missing]


@pytest.mark.usefixtures("seeded")
def test_other_users_profile_wins_over_short_query(
    logged_in_client: Callable[..., TestClient],
) -> None:
    owner = logged_in_client("a@eksempel.no")
    home = _profile_ids(owner)["Hjemme"]
    other = logged_in_client("b@eksempel.no")

    response = _search(other, home, "k")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "equipment_profile_not_found"


@pytest.mark.usefixtures("seeded")
def test_fifty_characters_are_allowed(logged_in_client: Callable[..., TestClient]) -> None:
    client = logged_in_client()
    home = _profile_ids(client)["Hjemme"]

    assert _search(client, home, "x" * 50).status_code == 200


@pytest.mark.usefixtures("seeded")
def test_other_users_profile_is_not_found(
    logged_in_client: Callable[..., TestClient],
) -> None:
    owner = logged_in_client("a@eksempel.no")
    home = _profile_ids(owner)["Hjemme"]
    other = logged_in_client("b@eksempel.no")

    response = _search(other, home, "knebøy")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "equipment_profile_not_found"


@pytest.mark.usefixtures("seeded")
@pytest.mark.parametrize("profile_id", ["ikke-en-uuid", str(uuid.uuid4())])
def test_unknown_or_bad_profile_id_is_not_found(
    logged_in_client: Callable[..., TestClient], profile_id: str
) -> None:
    response = _search(logged_in_client(), profile_id, "knebøy")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "equipment_profile_not_found"


def test_search_requires_login(client: TestClient) -> None:
    response = client.get(URL, params={"profile_id": str(uuid.uuid4()), "q": "knebøy"})

    assert response.status_code == 401
