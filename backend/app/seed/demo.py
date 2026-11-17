"""Demo users for the examiner (story 6.4, AD-16): only with APP_ENV=local, created once.

Two fictional users with consent, a profile, the default equipment profiles, food logged
over the 14 days before today and finished workouts with weights that rise, so I dag,
Mat, Trening and "Sist" show something at once. Everything goes through the module
services, never their repositories. Dates are relative to today in Europe/Oslo.
"""

import datetime as dt
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session as DbSessionType

from app.core.clock import utc_now
from app.modules.exercises import service as exercises_service
from app.modules.exercises.schemas import EquipmentProfileUpdate
from app.modules.food import service as food_service
from app.modules.food.schemas import FoodEntryRequest, Meal
from app.modules.identity import service as identity_service
from app.modules.profile import service as profile_service
from app.modules.profile.calculator import ActivityLevel, Goal, Sex
from app.modules.profile.schemas import ProfileRequest
from app.modules.workouts import service as workouts_service
from app.modules.workouts.schemas import SetUpdate

logger = logging.getLogger(__name__)

OSLO = ZoneInfo("Europe/Oslo")
MATVARETABELLEN_SOURCE = "matvaretabellen"
DAYS = 14
# Offsets (days before today) with no food logged: "most" of the 14 days have food.
NO_FOOD_OFFSETS = {6, 13}
# Offsets with a workout: three per week.
WORKOUT_OFFSETS = (12, 10, 8, 5, 3, 1)

SARA_EMAIL = "sara@demo.test"
SARA_PASSWORD = "Demo-passord-1"
JONAS_EMAIL = "jonas@demo.test"
JONAS_PASSWORD = "Demo-passord-2"

Food = tuple[str, float]  # (Matvaretabellen name, grams)


@dataclass(frozen=True)
class Lift:
    """One exercise in every demo workout: 3 sets, rising by `step_*` per workout."""

    name: str
    reps: int
    kg: float | None = None
    step_reps: int = 0
    step_kg: float = 0


@dataclass(frozen=True)
class DemoUser:
    email: str
    password: str
    profile: ProfileRequest
    breakfast: list[Food]
    lunch: list[Food]
    dinner: list[Food]
    snack: list[Food]
    lifts: list[Lift]
    # Extra equipment for the "Hjemme" profile (Sara trains at home with dumbbells).
    home_equipment: list[str] = field(default_factory=list)
    # Offset (days before today) of one day well over the target, and what is eaten then.
    over_offset: int | None = None
    over_foods: list[tuple[Meal, Food]] = field(default_factory=list)
    today_breakfast: list[Food] = field(default_factory=list)


SARA = DemoUser(
    email=SARA_EMAIL,
    password=SARA_PASSWORD,
    profile=ProfileRequest(
        sex=Sex.FEMALE,
        weight_kg=64,
        height_cm=168,
        age=29,
        activity_level=ActivityLevel.MODERATE,
        goal=Goal.MAINTAIN,
    ),
    breakfast=[
        ("Havregrøt, med melk", 400),
        ("Brød, grovt (50-75 %), kjøpt", 120),
        ("Yoghurt, naturell, 2 % fett, gresk/tyrkisk", 250),
    ],
    lunch=[
        ("Brød, ekstra grovt (75-100 %), kjøpt", 150),
        ("Tortilla, wraps/burrito, hvetemel", 150),
        ("Laks, røkt", 120),
    ],
    dinner=[
        ("Laks, filet, ovnsstekt", 200),
        ("Kylling, filet, stekt uten fett", 250),
        ("Pasta, naturell, kokt", 350),
        ("Kjøttkaker, kjøpt", 250),
    ],
    snack=[("Banan, rå", 120), ("Eple, uspesifisert, rå", 150), ("Mandler", 30)],
    lifts=[
        Lift("Armhevinger (Push-up)", reps=8, step_reps=1),
        Lift("Kroppsvektknebøy (Bodyweight squat)", reps=12, step_reps=1),
        Lift("Manual skulderpress (Dumbbell shoulder press)", reps=10, kg=6, step_kg=0.5),
    ],
    home_equipment=["kroppsvekt", "manualer"],
    over_offset=3,
    over_foods=[
        (Meal.BREAKFAST, ("Havregrøt, med melk", 400)),
        (Meal.LUNCH, ("Tortilla, wraps/burrito, hvetemel", 200)),
        (Meal.DINNER, ("Pommes frites, gatekjøkken", 400)),
        (Meal.SNACK, ("Sjokolade, melkesjokolade", 200)),
    ],
    today_breakfast=[("Havregrøt, med melk", 400), ("Blåbær, rå", 100)],
)

JONAS = DemoUser(
    email=JONAS_EMAIL,
    password=JONAS_PASSWORD,
    profile=ProfileRequest(
        sex=Sex.MALE,
        weight_kg=84,
        height_cm=182,
        age=35,
        activity_level=ActivityLevel.LIGHT,
        goal=Goal.MAINTAIN,
    ),
    breakfast=[
        ("Eggerøre, stekt i fett", 200),
        ("Havregrøt, med melk", 500),
        ("Brød, grovt (50-75 %), kjøpt", 160),
    ],
    lunch=[
        ("Brød, ekstra grovt (75-100 %), kjøpt", 200),
        ("Tunfisk, i vann, avrent, hermetisk", 150),
        ("Ris, basmati, kokt", 300),
    ],
    dinner=[
        ("Kylling, filet, stekt uten fett", 300),
        ("Kjøttdeig, storfe, 14 % fett, med salt og vann, rå", 250),
        ("Laks, filet, ovnsstekt", 250),
        ("Pasta, fullkorn, kokt med salt", 400),
    ],
    snack=[("Skyr, med smak, kunstig søtet", 170), ("Peanøtter", 50), ("Banan, rå", 150)],
    lifts=[
        Lift("Benkpress (Barbell bench press)", reps=8, kg=60, step_kg=2.5),
        Lift("Knebøy med stang (Barbell back squat)", reps=8, kg=80, step_kg=2.5),
        Lift("Markløft (Deadlift)", reps=5, kg=100, step_kg=5),
    ],
)

DEMO_USERS = (SARA, JONAS)


def oslo_today(now: datetime) -> dt.date:
    return now.astimezone(OSLO).date()


def _at(day: dt.date, hour: int) -> datetime:
    """A wall-clock time on an Oslo date, as an aware datetime."""
    return datetime.combine(day, dt.time(hour), tzinfo=OSLO)


class _FoodLookup:
    """Matvaretabellen items by exact name, through the food service's search."""

    def __init__(self, db: DbSessionType, user_id: uuid.UUID) -> None:
        self._db = db
        self._user_id = user_id
        self._cache: dict[str, uuid.UUID | None] = {}

    def find(self, name: str) -> uuid.UUID | None:
        if name not in self._cache:
            matches = food_service.search_items(self._db, self._user_id, name)
            item = next(
                (m for m in matches if m.name == name and m.source == MATVARETABELLEN_SOURCE),
                None,
            )
            if item is None:
                logger.warning("Demo seed: food item %r not found, skipped", name)
            self._cache[name] = item.id if item else None
        return self._cache[name]


def _day_menu(user: DemoUser, offset: int) -> list[tuple[Meal, Food]]:
    """3 entries (breakfast, lunch, dinner) on odd offsets, 4 (plus a snack) on even."""
    if offset == user.over_offset:
        return user.over_foods
    menu = [
        (Meal.BREAKFAST, user.breakfast[offset % len(user.breakfast)]),
        (Meal.LUNCH, user.lunch[offset % len(user.lunch)]),
        (Meal.DINNER, user.dinner[offset % len(user.dinner)]),
    ]
    if offset % 2 == 0:
        menu.append((Meal.SNACK, user.snack[offset % len(user.snack)]))
    return menu


def _log_food(db: DbSessionType, user_id: uuid.UUID, user: DemoUser, now: datetime) -> int:
    today = oslo_today(now)
    lookup = _FoodLookup(db, user_id)
    plan: list[tuple[dt.date, Meal, Food, int]] = []
    for offset in range(DAYS, 0, -1):
        if offset in NO_FOOD_OFFSETS:
            continue
        day = today - timedelta(days=offset)
        menu = _day_menu(user, offset)
        plan += [(day, meal, food, 8 + 4 * i) for i, (meal, food) in enumerate(menu)]
    plan += [(today, Meal.BREAKFAST, food, 8) for food in user.today_breakfast]

    added = 0
    for day, meal, (name, grams), hour in plan:
        item_id = lookup.find(name)
        if item_id is None:
            continue
        food_service.add_entry(
            db,
            user_id,
            FoodEntryRequest(food_item_id=item_id, date=day, meal=meal, grams=grams),
            min(_at(day, hour), now),  # never after the seed itself
        )
        added += 1
    return added


def _exercise_ids(db: DbSessionType, names: list[str]) -> dict[str, str]:
    by_name = {item.name: str(item.id) for item in exercises_service.list_exercises(db)}
    found = {}
    for name in names:
        if name in by_name:
            found[name] = by_name[name]
        else:
            logger.warning("Demo seed: exercise %r not found, skipped", name)
    return found


def _log_workouts(db: DbSessionType, user_id: uuid.UUID, user: DemoUser, now: datetime) -> int:
    today = oslo_today(now)
    ids = _exercise_ids(db, [lift.name for lift in user.lifts])
    lifts = [lift for lift in user.lifts if lift.name in ids]
    if not lifts:
        return 0
    for index, offset in enumerate(WORKOUT_OFFSETS):
        day = today - timedelta(days=offset)
        started = min(_at(day, 18), now - timedelta(hours=1))
        workout, _ = workouts_service.start_workout(db, user_id, day, started)
        workout_id = str(workout.id)
        for lift in lifts:
            workout = workouts_service.add_exercise(
                db, user_id, workout_id, ids[lift.name], started
            )
            we = workout.exercises[-1]
            values = {"reps": lift.reps + lift.step_reps * index, "done": True}
            if lift.kg is not None:
                values["weight_kg"] = lift.kg + lift.step_kg * index
            for set_ in we.sets:
                workouts_service.update_set(
                    db, user_id, workout_id, str(set_.id), SetUpdate(**values)
                )
        workouts_service.finish_workout(db, user_id, workout_id, started + timedelta(hours=1))
    return len(WORKOUT_OFFSETS)


def _create_user(db: DbSessionType, user: DemoUser, now: datetime) -> tuple[int, int]:
    """One demo user with everything; returns (food entries, workouts)."""
    registration = identity_service.register(db, user.email, user.password, now)
    user_id = registration.user.id
    identity_service.end_all_sessions(db, user_id)  # nobody holds that session's cookie
    identity_service.give_consent(db, user_id, now)
    identity_service.dismiss_intro(db, user_id, now)
    profile_service.save_profile(db, user_id, user.profile, now)
    if user.home_equipment:
        profiles = exercises_service.list_profiles(db, user_id, now)
        home = next(p for p in profiles if p.name == exercises_service.DEFAULT_HOME_NAME)
        exercises_service.update_profile(
            db, user_id, home.id, EquipmentProfileUpdate(equipment=user.home_equipment)
        )
    return _log_food(db, user_id, user, now), _log_workouts(db, user_id, user, now)


def seed_demo_users(db: DbSessionType, now: datetime | None = None) -> bool:
    """Create the demo users unless `sara@demo.test` exists (also soft-deleted). The caller
    checks APP_ENV, commits the reference seeds before and this afterwards. Never raises:
    a failure rolls back the demo part only and is logged. Returns True if they were
    created."""
    if identity_service.email_in_use(db, SARA_EMAIL):
        logger.info("Demo users already exist; nothing added")
        return False
    now = now or utc_now()
    entries = workouts = 0
    try:
        for user in DEMO_USERS:
            if identity_service.email_in_use(db, user.email):
                continue
            user_entries, user_workouts = _create_user(db, user, now)
            entries += user_entries
            workouts += user_workouts
    except Exception:
        # Demo data must never stop the backend from starting.
        logger.warning("Demo seed failed; no demo users added", exc_info=True)
        db.rollback()
        return False
    logger.info("Seeded demo users (%d food entries, %d workouts).", entries, workouts)
    return True
