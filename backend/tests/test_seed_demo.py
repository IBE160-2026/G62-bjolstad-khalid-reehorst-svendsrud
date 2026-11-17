"""Demo users for the examiner (story 6.4): counts, idempotency, local only, consent,
"Sist" through the API, a missing food item and dates relative to today in Oslo."""

import dataclasses
import datetime as dt
import logging
from collections.abc import Callable, Iterator
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, func, select, text
from sqlalchemy.orm import Session, sessionmaker

import app.core.db
from app.core.settings import get_settings
from app.modules.food import service as food_service
from app.modules.food.models import FoodLogEntry
from app.modules.exercises import service as exercises_service
from app.modules.identity.models import Session as UserSession
from app.modules.identity.models import User
from app.modules.profile import service as profile_service
from app.modules.workouts.models import Set, Workout, WorkoutExercise
from app.seed import demo, seed
from tests.conftest import Clock
from tests.exercises.test_seed import truncate_exercises

# 23:30 UTC on 16 November is already 17 November in Oslo.
NOW = datetime(2026, 11, 16, 23, 30, tzinfo=UTC)
OSLO_TODAY = dt.date(2026, 11, 17)


def _truncate_all(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE users, sessions, food_items CASCADE"))
    truncate_exercises(engine)


@pytest.fixture
def factory(test_engine: Engine) -> Iterator[sessionmaker[Session]]:
    """Reference data seeded and committed; everything removed afterwards."""
    _truncate_all(test_engine)
    session_factory = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)
    with session_factory() as db:
        seed.seed_food_items(db)
        seed.seed_exercises(db)
        db.commit()
    yield session_factory
    _truncate_all(test_engine)


def _seed(factory: sessionmaker[Session], now: datetime = NOW) -> bool:
    with factory() as db:
        created = demo.seed_demo_users(db, now)
        db.commit()
    return created


def _user(db: Session, email: str) -> User:
    return db.scalars(select(User).where(User.email == email)).one()


def _entries(db: Session, user: User) -> list[FoodLogEntry]:
    return list(db.scalars(select(FoodLogEntry).where(FoodLogEntry.user_id == user.id)))


def _workouts(db: Session, user: User) -> list[Workout]:
    return list(db.scalars(select(Workout).where(Workout.user_id == user.id)))


def test_creates_two_users_with_food_and_workouts(factory: sessionmaker[Session]) -> None:
    assert _seed(factory) is True

    with factory() as db:
        total_workouts = 0
        for email in (demo.SARA_EMAIL, demo.JONAS_EMAIL):
            user = _user(db, email)
            assert user.consent_at is not None and user.intro_dismissed_at is not None
            assert profile_service.find_profile(db, user.id) is not None

            entries = _entries(db, user)
            earlier = [e for e in entries if e.date < OSLO_TODAY]
            assert len(earlier) >= 30, email
            assert {e.meal for e in earlier} == {"breakfast", "lunch", "dinner", "snack"}
            first_day = OSLO_TODAY - timedelta(days=14)
            assert all(first_day <= e.date <= OSLO_TODAY for e in entries)
            days = {e.date for e in earlier}
            assert 10 <= len(days) <= 14
            for day in days:
                assert 3 <= sum(e.date == day for e in earlier) <= 4

            workouts = _workouts(db, user)
            assert len(workouts) == 6  # three per week
            assert all(w.finished_at is not None for w in workouts)
            assert all(first_day <= w.date < OSLO_TODAY for w in workouts)
            total_workouts += len(workouts)
            sets = db.scalars(
                select(Set)
                .join(WorkoutExercise, Set.workout_exercise_id == WorkoutExercise.id)
                .join(Workout, WorkoutExercise.workout_id == Workout.id)
                .where(Workout.user_id == user.id)
            ).all()
            assert sets and all(s.done and s.reps for s in sets)
        assert total_workouts >= 10
        # The session `register` made is dropped: nobody holds its cookie.
        assert db.scalar(select(func.count()).select_from(UserSession)) == 0


def test_sara_trains_at_home_with_dumbbells(factory: sessionmaker[Session]) -> None:
    _seed(factory)

    with factory() as db:
        sara = _user(db, demo.SARA_EMAIL)
        profiles = exercises_service.list_profiles(db, sara.id, NOW)
        home = next(p for p in profiles if p.name == "Hjemme")
        assert {e.slug for e in home.equipment} == {"kroppsvekt", "manualer"}

        names = exercises_service.get_list_items(
            db, {we.exercise_id for w in _workouts(db, sara) for we in w.exercises}
        )
        assert {item.name for item in names.values()} == {lift.name for lift in demo.SARA.lifts}
        assert all(len(w.exercises) == 3 for w in _workouts(db, sara))


def test_sara_has_todays_breakfast_and_one_day_over_target(
    factory: sessionmaker[Session],
) -> None:
    _seed(factory)

    with factory() as db:
        sara = _user(db, demo.SARA_EMAIL)
        today = [e for e in _entries(db, sara) if e.date == OSLO_TODAY]
        assert today and {e.meal for e in today} == {"breakfast"}
        jonas = _user(db, demo.JONAS_EMAIL)
        assert not [e for e in _entries(db, jonas) if e.date == OSLO_TODAY]

        target = profile_service.find_profile(db, sara.id).target_kcal
        over = [
            offset
            for offset in range(1, 15)
            if food_service.day_kcal(db, sara.id, OSLO_TODAY - timedelta(days=offset)) > target
        ]
        assert over == [demo.SARA.over_offset]


def test_weights_and_reps_rise(factory: sessionmaker[Session]) -> None:
    _seed(factory)

    with factory() as db:
        jonas = _user(db, demo.JONAS_EMAIL)
        workouts = sorted(_workouts(db, jonas), key=lambda w: w.date)
        top = [max(float(s.weight_kg) for we in w.exercises for s in we.sets) for w in workouts]
        assert top == sorted(top) and top[0] < top[-1]


def test_second_start_adds_nothing(factory: sessionmaker[Session]) -> None:
    assert _seed(factory) is True
    with factory() as db:
        before = (
            db.scalar(select(func.count()).select_from(User)),
            db.scalar(select(func.count()).select_from(FoodLogEntry)),
            db.scalar(select(func.count()).select_from(Workout)),
        )

    assert _seed(factory, NOW + timedelta(days=1)) is False
    with factory() as db:
        after = (
            db.scalar(select(func.count()).select_from(User)),
            db.scalar(select(func.count()).select_from(FoodLogEntry)),
            db.scalar(select(func.count()).select_from(Workout)),
        )
    assert before == after == (2, before[1], 12)


def test_soft_deleted_sara_adds_nothing(factory: sessionmaker[Session]) -> None:
    _seed(factory)
    with factory() as db:
        db.execute(
            text("UPDATE users SET deleted_at = now() WHERE email = :e"), {"e": demo.SARA_EMAIL}
        )
        db.commit()
        before = db.scalar(select(func.count()).select_from(FoodLogEntry))

    assert _seed(factory) is False
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(User)) == 2
        assert db.scalar(select(func.count()).select_from(FoodLogEntry)) == before


def test_failure_never_stops_startup(
    factory: sessionmaker[Session],
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    monkeypatch.setattr(app.core.db, "get_session_factory", lambda: factory)
    monkeypatch.setattr(seed, "OFF_NORWAY_FILE", Path("/finnes-ikke/off_norway.json"))

    def broken(*_args: object) -> int:
        raise RuntimeError("boom")

    monkeypatch.setattr(demo, "_log_workouts", broken)
    settings = get_settings().model_copy(update={"app_env": "local"})

    with caplog.at_level(logging.WARNING, logger="app.seed.demo"):
        assert seed.seed_if_empty(settings) is True
    assert "Demo seed failed" in caplog.text
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(User)) == 0
        assert db.scalar(select(func.count()).select_from(FoodLogEntry)) == 0


def test_missing_food_item_is_skipped_and_logged(
    factory: sessionmaker[Session],
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    sara = dataclasses.replace(demo.SARA, today_breakfast=[("Finnes ikke-grøt", 300)])
    monkeypatch.setattr(demo, "DEMO_USERS", (sara, demo.JONAS))

    with caplog.at_level(logging.WARNING, logger="app.seed.demo"):
        assert _seed(factory) is True
    assert "Finnes ikke-grøt" in caplog.text
    with factory() as db:
        sara_user = _user(db, demo.SARA_EMAIL)
        assert not [e for e in _entries(db, sara_user) if e.date == OSLO_TODAY]


def test_seed_if_empty_creates_demo_users_only_locally(
    factory: sessionmaker[Session],
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    monkeypatch.setattr(app.core.db, "get_session_factory", lambda: factory)
    monkeypatch.setattr(seed, "OFF_NORWAY_FILE", Path("/finnes-ikke/off_norway.json"))

    for env in ("test", "production"):
        settings = get_settings().model_copy(update={"app_env": env})
        # model_copy skips validation, so the production secret check does not apply.
        assert seed.seed_if_empty(settings) is False
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(User)) == 0

    settings = get_settings().model_copy(update={"app_env": "local"})
    with caplog.at_level(logging.INFO, logger="app.seed.demo"):
        assert seed.seed_if_empty(settings) is True
    assert "Seeded demo users (" in caplog.text
    with factory() as db:
        emails = set(db.scalars(select(User.email)))
    assert emails == {demo.SARA_EMAIL, demo.JONAS_EMAIL}


def test_sist_shows_saras_latest_earlier_workout(
    factory: sessionmaker[Session], make_client: Callable[[], TestClient], clock: Clock
) -> None:
    clock.now = NOW
    today = OSLO_TODAY
    _seed(factory, NOW)
    client = make_client()

    login = client.post(
        "/api/identity/login",
        json={"email": demo.SARA_EMAIL, "password": demo.SARA_PASSWORD},
    )
    assert login.status_code == 200, login.text
    assert login.json()["consent_at"] is not None

    overview = client.get("/api/overview", params={"date": today.isoformat()})
    assert overview.status_code == 200, overview.text
    breakfast = overview.json()["meals"][0]
    assert breakfast["meal"] == "breakfast" and breakfast["entries"]
    assert overview.json()["workouts"] == []

    started = client.post("/api/workouts", json={"date": today.isoformat()})
    assert started.status_code == 201, started.text
    push_up = next(
        item["id"]
        for item in client.get("/api/exercises").json()
        if item["name"] == "Armhevinger (Push-up)"
    )
    added = client.post(
        f"/api/workouts/{started.json()['id']}/exercises", json={"exercise_id": push_up}
    )
    assert added.status_code == 200, added.text
    last = added.json()["exercises"][0]["last_time"]
    latest = (today - timedelta(days=min(demo.WORKOUT_OFFSETS))).isoformat()
    assert last["date"] == latest
    final_reps = 8 + len(demo.WORKOUT_OFFSETS) - 1
    assert [s["reps"] for s in last["sets"]] == [final_reps] * 3
