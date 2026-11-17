"""Suggestions (story 4.3): the pure rule over the seed file, and the endpoint."""

import uuid
from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text
from sqlalchemy.orm import Session

from app.modules.exercises.service import SuggestionCandidate, suggest_exercises
from app.seed.seed import seed_exercises
from tests.exercises.test_seed import DATA, truncate_exercises

URL = "/api/exercises/suggestions"
PROFILES_URL = "/api/exercises/equipment-profiles"
MUSCLE_POSITION = {row["slug"]: index for index, row in enumerate(DATA["muscle_groups"])}
ALL_SLUGS = [row["slug"] for row in DATA["equipment"]]
LEVELS = ["beginner", "intermediate", "advanced"]


def _candidates() -> list[SuggestionCandidate[dict]]:
    return [
        SuggestionCandidate(
            name=row["name"],
            level=row["level"],
            muscle_position=MUSCLE_POSITION[row["primary"]],
            equipment_slugs=frozenset(row["equipment"]),
            item=row,
        )
        for row in DATA["exercises"]
    ]


def _suggest(*extra: str) -> list[dict]:
    slugs = ["kroppsvekt", *extra]
    return [candidate.item for candidate in suggest_exercises(_candidates(), slugs)]


# --- The pure rule over the real seed (AD-5, SM-5) ---


@pytest.mark.parametrize(
    ("extra", "expected"),
    [
        ((), 8),
        (("manualer",), 13),
        (("manualer", "benk"), 16),
        (("strikk",), 11),
        (("kettlebell",), 11),
        (("trekkestang",), 10),
        (tuple(ALL_SLUGS), 34),
    ],
)
def test_coverage_per_profile(extra: tuple[str, ...], expected: int) -> None:
    assert len(_suggest(*extra)) == expected


def test_every_suggestion_fits_the_equipment() -> None:
    for extra in [(), ("manualer",), ("manualer", "benk"), ("strikk",)]:
        available = {"kroppsvekt", *extra}
        assert all(set(row["equipment"]) <= available for row in _suggest(*extra))


def test_dumbbells_never_get_barbell_deadlift() -> None:
    slugs = [row["slug"] for row in _suggest("manualer")]
    assert "deadlift" not in slugs
    assert "Markløft (Deadlift)" not in [row["name"] for row in _suggest("manualer")]
    # The deadlift needs the barbell.
    assert "deadlift" in [row["slug"] for row in _suggest("stang-og-skiver")]


def test_dumbbells_and_bench_need_both() -> None:
    # Story 4.1: "Manualer + benk" needs both, so the bench adds three exercises over
    # dumbbells alone (the PRD addendum's older table said 14, not 16).
    dumbbells = {row["slug"] for row in _suggest("manualer")}
    both = {row["slug"] for row in _suggest("manualer", "benk")}
    assert both - dumbbells == {"dumbbell-bench-press", "single-arm-dumbbell-row", "bench-dips"}
    bench_only = {row["slug"] for row in _suggest("benk")}
    assert "dumbbell-bench-press" not in bench_only
    assert "dumbbell-bench-press" not in dumbbells


def test_order_is_level_then_muscle_group_then_name() -> None:
    rows = _suggest(*ALL_SLUGS)
    keys = [
        (LEVELS.index(row["level"]), MUSCLE_POSITION[row["primary"]], row["name"].lower())
        for row in rows
    ]
    assert keys == sorted(keys)
    levels = [row["level"] for row in rows]
    assert levels.index("intermediate") > max(i for i, v in enumerate(levels) if v == "beginner")
    assert levels.index("advanced") > max(
        i for i, v in enumerate(levels) if v == "intermediate"
    )


def test_order_with_a_stub_input() -> None:
    def candidate(name: str, level: str, muscle: int) -> SuggestionCandidate[str]:
        return SuggestionCandidate(name, level, muscle, frozenset({"kroppsvekt"}), name)

    stub = [
        candidate("b", "advanced", 0),
        candidate("c", "beginner", 1),
        candidate("a", "intermediate", 0),
        candidate("B", "beginner", 1),
        candidate("z", "beginner", 0),
    ]
    result = [c.item for c in suggest_exercises(stub, ["kroppsvekt"])]
    assert result == ["z", "B", "c", "a", "b"]


def test_no_equipment_match_gives_empty_list() -> None:
    stub = [SuggestionCandidate("Benkpress", "beginner", 2, frozenset({"stang-og-skiver"}), 1)]
    assert suggest_exercises(stub, ["kroppsvekt"]) == []
    assert suggest_exercises([], ALL_SLUGS) == []


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


def _suggestions(client: TestClient, profile_id: str):
    return client.get(URL, params={"profile_id": profile_id})


@pytest.mark.usefixtures("seeded")
def test_home_gives_eight_bodyweight_exercises(
    logged_in_client: Callable[..., TestClient],
) -> None:
    test_client = logged_in_client()
    home = _profile_ids(test_client)["Hjemme"]

    response = _suggestions(test_client, home)

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["profile_id"] == home
    assert body["profile_name"] == "Hjemme"
    assert len(body["exercises"]) == 8
    assert all(item["equipment"] == ["Kroppsvekt"] for item in body["exercises"])
    first = body["exercises"][0]
    assert set(first) == {"id", "name", "level", "primary_muscle_group", "equipment"}


@pytest.mark.usefixtures("seeded")
def test_gym_gives_all_34_ordered_by_level(
    logged_in_client: Callable[..., TestClient],
) -> None:
    test_client = logged_in_client()
    gym = _profile_ids(test_client)["Treningssenter"]

    body = _suggestions(test_client, gym).json()

    levels = [item["level"] for item in body["exercises"]]
    assert len(levels) == 34
    assert levels == sorted(levels, key=LEVELS.index)
    muscle_position = {row["name"]: index for index, row in enumerate(DATA["muscle_groups"])}
    keys = [
        (
            LEVELS.index(item["level"]),
            muscle_position[item["primary_muscle_group"]],
            item["name"].lower(),
        )
        for item in body["exercises"]
    ]
    assert keys == sorted(keys)


@pytest.mark.usefixtures("seeded")
def test_profile_without_bodyweight_is_repaired(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    # As if Hjemme was made before the equipment seed ran: no Kroppsvekt item.
    test_client = logged_in_client()
    home = _profile_ids(test_client)["Hjemme"]
    db_session.execute(
        text(
            "DELETE FROM equipment_profile_items WHERE profile_id = :profile AND equipment_id = "
            "(SELECT id FROM equipment WHERE slug = 'kroppsvekt')"
        ),
        {"profile": home},
    )
    db_session.commit()

    response = _suggestions(test_client, home)

    assert response.status_code == 200, response.text
    assert len(response.json()["exercises"]) == 8


@pytest.mark.usefixtures("seeded")
def test_custom_profile_follows_its_equipment(
    logged_in_client: Callable[..., TestClient],
) -> None:
    test_client = logged_in_client()
    created = test_client.post(PROFILES_URL, json={"name": "Hytta", "equipment": ["manualer"]})
    assert created.status_code == 201, created.text

    body = _suggestions(test_client, created.json()["id"]).json()

    names = [item["name"] for item in body["exercises"]]
    assert len(names) == 13
    assert "Markløft (Deadlift)" not in names


@pytest.mark.usefixtures("seeded")
def test_other_users_profile_is_not_found(
    logged_in_client: Callable[..., TestClient],
) -> None:
    owner = logged_in_client("a@eksempel.no")
    home = _profile_ids(owner)["Hjemme"]
    other = logged_in_client("b@eksempel.no")

    response = _suggestions(other, home)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "equipment_profile_not_found"


@pytest.mark.usefixtures("seeded")
@pytest.mark.parametrize("profile_id", ["ikke-en-uuid", str(uuid.uuid4())])
def test_unknown_or_bad_profile_id_is_not_found(
    logged_in_client: Callable[..., TestClient], profile_id: str
) -> None:
    response = _suggestions(logged_in_client(), profile_id)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "equipment_profile_not_found"


def test_suggestions_require_login(client: TestClient) -> None:
    response = client.get(URL, params={"profile_id": str(uuid.uuid4())})

    assert response.status_code == 401
