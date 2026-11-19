"""Exercise seed (story 4.1): integrity of the whole JSON file and loading it once."""

import json
import re
from collections.abc import Iterator
from pathlib import Path

import pytest
from sqlalchemy import Engine, func, select, text
from sqlalchemy.orm import Session, sessionmaker

import app.core.db
from app.core.settings import get_settings
from app.modules.exercises.models import Equipment, Exercise, MuscleGroup
from app.seed import seed
from tests.conftest import _truncate_tables

DATA = json.loads(seed.EXERCISES_FILE.read_text(encoding="utf-8"))
EQUIPMENT = {row["slug"] for row in DATA["equipment"]}
MUSCLES = {row["slug"] for row in DATA["muscle_groups"]}
EXERCISES = DATA["exercises"]
LIST_FILE = (
    Path(__file__).resolve().parents[3] / ".docs" / "planning-artifacts" / "ovelsesliste.md"
)


def truncate_exercises(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE exercises, equipment, muscle_groups CASCADE"))


@pytest.fixture
def factory(test_engine: Engine) -> Iterator[sessionmaker[Session]]:
    truncate_exercises(test_engine)
    yield sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)
    _truncate_tables(test_engine)
    truncate_exercises(test_engine)


def _count(factory: sessionmaker[Session], model: type) -> int:
    with factory() as db:
        return db.scalar(select(func.count()).select_from(model)) or 0


def test_seed_file_is_marked_as_a_draft() -> None:
    assert DATA["review_status"] == "utkast – gruppen må lese beskrivelser og hjelpemuskler"


def test_seed_file_has_fixed_equipment_and_muscle_groups() -> None:
    assert [row["name"] for row in DATA["equipment"]] == [
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
    assert sorted(row["name"] for row in DATA["muscle_groups"]) == sorted(
        ["Ben", "Rygg", "Bryst", "Skuldre", "Armer", "Mage/kjerne"]
    )


def test_every_exercise_is_complete() -> None:
    assert 30 <= len(EXERCISES) <= 50
    assert len(EXERCISES) == 34  # #35–39 wait for issue #8
    assert [row["list_no"] for row in EXERCISES] == list(range(1, 35))
    assert len({row["slug"] for row in EXERCISES}) == len(EXERCISES)
    assert len({row["name"] for row in EXERCISES}) == len(EXERCISES)
    for row in EXERCISES:
        label = row["name"]
        assert row["primary"] in MUSCLES, label
        assert 0 <= len(row["secondary"]) <= 2, label
        assert set(row["secondary"]) <= MUSCLES, label
        assert row["primary"] not in row["secondary"], label
        assert len(set(row["secondary"])) == len(row["secondary"]), label
        assert len(row["equipment"]) >= 1, label
        assert set(row["equipment"]) <= EQUIPMENT, label
        assert row["level"] in {"beginner", "intermediate", "advanced"}, label
        assert row["type"] in {"reps", "time"}, label
        assert re.fullmatch(r"[A-Za-z0-9_-]{11}", row["video_id"]), label
        assert isinstance(row.get("video_short"), bool), label
        assert len(row["steps"]) >= 1, label
        assert all(step.strip() for step in row["steps"]), label


VIDEO_IDS_FILE = Path(__file__).resolve().parent / "video_ids.json"


def _fixture_video_ids() -> dict[int, str]:
    rows = json.loads(VIDEO_IDS_FILE.read_text(encoding="utf-8"))["videos"]
    return {row["list_no"]: row["video_id"] for row in rows}


def test_video_ids_match_the_committed_fixture() -> None:
    fixture = _fixture_video_ids()
    assert len(fixture) == 34
    assert {row["list_no"]: row["video_id"] for row in EXERCISES} == fixture


def test_fixture_matches_the_source_list_when_available() -> None:
    # .docs is not in the Docker image; the seed is still checked against the fixture above.
    if not LIST_FILE.exists():
        return
    ids = re.findall(r"^\| (\d+) \|.*watch\?v=([A-Za-z0-9_-]{11})", LIST_FILE.read_text(), re.M)
    assert {int(number): video for number, video in ids} == _fixture_video_ids()


# The YouTube Shorts swapped in by PR #52 (list numbers); shown in a 9:16 player.
SHORTS = {5, 8, 9, 13, 14, 15, 16, 24, 26, 27, 29}


def test_shorts_are_flagged() -> None:
    assert {row["list_no"] for row in EXERCISES if row["video_short"]} == SHORTS


def _by_slug(slug: str) -> dict:
    return next(row for row in EXERCISES if row["slug"] == slug)


def test_label_mapping() -> None:
    deadlift = _by_slug("deadlift")  # #13 "Rygg / hele kroppen"
    assert (deadlift["primary"], deadlift["secondary"]) == ("rygg", ["ben"])
    assert _by_slug("dumbbell-bench-press")["equipment"] == ["manualer", "benk"]  # #7
    assert _by_slug("single-arm-dumbbell-row")["equipment"] == ["manualer", "benk"]  # #10
    assert _by_slug("barbell-bench-press")["equipment"] == ["stang-og-skiver", "benk"]  # #15
    assert _by_slug("plank")["primary"] == "mage-kjerne"  # "Kjerne"
    assert _by_slug("plank")["type"] == "time"
    # "Hele kroppen" gets one primary from the six groups.
    assert _by_slug("burpees")["primary"] == "ben"  # #6
    assert _by_slug("kettlebell-swing")["primary"] == "ben"  # #18


def test_seed_inserts_reference_data_once(
    factory: sessionmaker[Session], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(app.core.db, "get_session_factory", lambda: factory)
    settings = get_settings().model_copy(update={"app_env": "local"})

    assert seed.seed_if_empty(settings) is True
    counts = (_count(factory, Equipment), _count(factory, MuscleGroup), _count(factory, Exercise))
    assert counts == (9, 6, 34)
    assert seed.seed_if_empty(settings) is True
    assert (
        _count(factory, Equipment),
        _count(factory, MuscleGroup),
        _count(factory, Exercise),
    ) == counts  # the second start adds nothing

    with factory() as db:
        for exercise in db.scalars(select(Exercise)):
            roles = [link.role for link in exercise.muscle_links]
            assert roles.count("primary") == 1, exercise.name
            assert roles.count("secondary") <= 2, exercise.name
            assert exercise.equipment_links, exercise.name
            assert exercise.video_id and exercise.steps, exercise.name


def test_seed_skips_outside_local(
    factory: sessionmaker[Session], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(app.core.db, "get_session_factory", lambda: factory)
    settings = get_settings().model_copy(update={"app_env": "test"})

    assert seed.seed_if_empty(settings) is False
    assert _count(factory, Exercise) == 0


def test_seed_adds_only_missing_exercises(
    factory: sessionmaker[Session], tmp_path: Path
) -> None:
    extra = {
        "list_no": 35,
        "slug": "pike-push-up",
        "name": "Pike push-up",
        "equipment": ["kroppsvekt"],
        "primary": "skuldre",
        "secondary": ["armer"],
        "level": "intermediate",
        "type": "reps",
        "steps": ["Steg en.", "Steg to.", "Steg tre."],
        "video_id": "abcdefghijk",
        "video_short": True,
    }
    with factory() as db:
        assert seed.seed_exercises(db) == 34
        db.commit()
    bigger = tmp_path / "exercises.json"
    bigger.write_text(json.dumps({**DATA, "exercises": [*EXERCISES, extra]}), encoding="utf-8")

    with factory() as db:
        assert seed.seed_exercises(db, bigger) == 1
        db.commit()
    with factory() as db:
        assert seed.seed_exercises(db, bigger) == 0

    assert (
        _count(factory, Equipment),
        _count(factory, MuscleGroup),
        _count(factory, Exercise),
    ) == (9, 6, 35)
    with factory() as db:
        added = db.scalars(select(Exercise).where(Exercise.slug == "pike-push-up")).one()
        assert sorted((link.role, link.muscle_group.slug) for link in added.muscle_links) == [
            ("primary", "skuldre"),
            ("secondary", "armer"),
        ]
        assert [link.equipment.slug for link in added.equipment_links] == ["kroppsvekt"]
        assert added.video_short is True


def test_seed_updates_video_short_of_existing_exercises(
    factory: sessionmaker[Session],
) -> None:
    with factory() as db:
        assert seed.seed_exercises(db) == 34
        db.commit()
    with factory() as db:
        # A database seeded before the flag existed: every exercise defaults to False.
        for exercise in db.scalars(select(Exercise)):
            exercise.video_short = False
        db.commit()

    with factory() as db:
        assert seed.seed_exercises(db) == 0
        db.commit()

    with factory() as db:
        flagged = {e.slug for e in db.scalars(select(Exercise)) if e.video_short}
    assert flagged == {row["slug"] for row in EXERCISES if row["video_short"]}
    assert "deadlift" in flagged and "push-up" not in flagged


def test_seed_updates_only_video_id_of_existing_exercises(
    factory: sessionmaker[Session], tmp_path: Path
) -> None:
    with factory() as db:
        assert seed.seed_exercises(db) == 34
        db.commit()
    slug = EXERCISES[0]["slug"]
    with factory() as db:
        old = db.scalars(select(Exercise).where(Exercise.slug == slug)).one()
        old.video_id = "gammelvideo"  # an existing database seeded with the old video
        db.commit()
        before = (
            old.name,
            old.level,
            old.type,
            old.steps,
            sorted((link.role, link.muscle_group.slug) for link in old.muscle_links),
            sorted(link.equipment.slug for link in old.equipment_links),
        )

    with factory() as db:
        assert seed.seed_exercises(db) == 0
        db.commit()

    with factory() as db:
        updated = db.scalars(select(Exercise).where(Exercise.slug == slug)).one()
        assert updated.video_id == EXERCISES[0]["video_id"]
        assert (
            updated.name,
            updated.level,
            updated.type,
            updated.steps,
            sorted((link.role, link.muscle_group.slug) for link in updated.muscle_links),
            sorted(link.equipment.slug for link in updated.equipment_links),
        ) == before

    # Only video_id follows the file: changed steps in the file do not reach the database.
    changed = [{**EXERCISES[0], "steps": ["Nytt steg."]}, *EXERCISES[1:]]
    edited = tmp_path / "exercises.json"
    edited.write_text(json.dumps({**DATA, "exercises": changed}), encoding="utf-8")
    with factory() as db:
        assert seed.seed_exercises(db, edited) == 0
        db.commit()
    with factory() as db:
        kept = db.scalars(select(Exercise).where(Exercise.slug == slug)).one()
        assert kept.steps == before[3]
