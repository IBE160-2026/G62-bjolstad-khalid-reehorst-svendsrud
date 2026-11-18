"""Deactivate my account (story 1.8): sessions end, no data is deleted, login reactivates."""

from collections.abc import Callable
from datetime import timedelta
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.food.models import FoodItem
from app.modules.identity import service
from app.modules.identity.models import Session as UserSession
from app.modules.identity.models import User
from tests.conftest import PASSWORD, REGISTER_URL, Clock
from tests.identity.helpers import (
    INVALID_CREDENTIALS,
    LOGIN_URL,
    ME_URL,
    TOO_MANY_ATTEMPTS,
    UNAUTHORIZED_CODE,
    assert_cookie_cleared,
    count,
    use_token,
)

DEACTIVATE_URL = "/api/identity/deactivate"
CONSENT_URL = "/api/identity/consent"
PROFILE_URL = "/api/profile"
ENTRIES_URL = "/api/food/entries"
WORKOUTS_URL = "/api/workouts"
DAY = "2026-11-18"
EMAIL = "ola@eksempel.no"
PROFILE = {
    "sex": "female",
    "weight_kg": 82,
    "height_cm": 162,
    "age": 23,
    "activity_level": "light",
    "goal": "lose",
}


def _user(db: Session, email: str = EMAIL) -> User:
    db.expire_all()
    return db.scalars(select(User).where(User.email == email)).one()


def _sessions_of(db: Session, user_id: object) -> int:
    db.expire_all()
    return len(list(db.scalars(select(UserSession).where(UserSession.user_id == user_id))))


def _login(client: TestClient, password: str = PASSWORD, email: str = EMAIL):
    return client.post(LOGIN_URL, json={"email": email, "password": password})


def test_deactivate_sets_deactivated_at_and_clears_the_cookie(
    logged_in_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = logged_in_client(EMAIL)

    response = client.post(DEACTIVATE_URL)

    assert response.status_code == 204
    assert response.content == b""
    assert_cookie_cleared(response.headers["set-cookie"])
    user = _user(db_session)
    assert user.deactivated_at == clock.now
    assert user.deleted_at is None
    assert _sessions_of(db_session, user.id) == 0
    assert client.get(ME_URL).status_code == 401


def test_deactivate_ends_every_session_of_the_user(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    db_session: Session,
) -> None:
    phone = logged_in_client(EMAIL)
    laptop = make_client()
    assert _login(laptop).status_code == 200
    kari = logged_in_client("kari@eksempel.no")

    assert phone.post(DEACTIVATE_URL).status_code == 204

    old = laptop.get(ME_URL)
    assert old.status_code == 401
    assert old.json()["error"]["code"] == UNAUTHORIZED_CODE
    assert kari.get(ME_URL).status_code == 200
    assert count(db_session, UserSession) == 1


def test_old_cookie_is_refused_on_every_protected_endpoint(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = logged_in_client(EMAIL)
    assert client.post(CONSENT_URL).status_code == 200
    token = client.cookies.get("pf_session")
    assert client.post(DEACTIVATE_URL).status_code == 204
    use_token(client, token)

    for path in (ME_URL, PROFILE_URL, f"{ENTRIES_URL}?date={DAY}", f"{WORKOUTS_URL}/active"):
        response = client.get(path)
        assert response.status_code == 401, path
        assert response.json()["error"]["code"] == UNAUTHORIZED_CODE


def test_a_session_of_a_deactivated_user_is_not_resolved(
    logged_in_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    """A session row that survived deactivation (a racing login) must not work."""
    client = logged_in_client(EMAIL)
    user = _user(db_session)
    user.deactivated_at = clock.now
    db_session.commit()

    assert _sessions_of(db_session, user.id) == 1
    assert client.get(ME_URL).status_code == 401


def test_reactivating_login_resets_failed_login_count(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    db_session: Session,
) -> None:
    assert logged_in_client(EMAIL).post(DEACTIVATE_URL).status_code == 204
    other = make_client()
    for _ in range(2):
        assert _login(other, "feilpassord").status_code == 401
    assert _user(db_session).failed_login_count == 2

    assert _login(other).json()["reactivated"] is True

    user = _user(db_session)
    assert user.failed_login_count == 0
    assert user.first_failed_at is None
    assert user.deactivated_at is None


def test_login_reactivates_with_the_right_password(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    db_session: Session,
) -> None:
    client = logged_in_client(EMAIL)
    user_id = client.get(ME_URL).json()["id"]
    assert client.post(DEACTIVATE_URL).status_code == 204

    response = _login(make_client())

    assert response.status_code == 200
    body = response.json()
    assert body["reactivated"] is True
    assert body["id"] == user_id
    assert "pf_session" in response.headers["set-cookie"]
    assert _user(db_session).deactivated_at is None


def test_normal_login_is_not_reactivated(
    logged_in_client: Callable[..., TestClient], make_client: Callable[[], TestClient]
) -> None:
    logged_in_client(EMAIL)

    response = _login(make_client())

    assert response.status_code == 200
    assert response.json()["reactivated"] is False


def test_second_login_after_reactivation_is_not_reactivated(
    logged_in_client: Callable[..., TestClient], make_client: Callable[[], TestClient]
) -> None:
    assert logged_in_client(EMAIL).post(DEACTIVATE_URL).status_code == 204
    assert _login(make_client()).json()["reactivated"] is True

    assert _login(make_client()).json()["reactivated"] is False


def test_wrong_password_on_a_deactivated_account_counts_toward_lockout(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    db_session: Session,
) -> None:
    assert logged_in_client(EMAIL).post(DEACTIVATE_URL).status_code == 204
    other = make_client()

    wrong = _login(other, "feilpassord")
    unknown = _login(other, "feilpassord", "ukjent@eksempel.no")

    assert (wrong.status_code, wrong.json()) == (401, INVALID_CREDENTIALS)
    assert (unknown.status_code, unknown.json()) == (wrong.status_code, wrong.json())
    assert "set-cookie" not in wrong.headers
    user = _user(db_session)
    assert user.failed_login_count == 1
    assert user.deactivated_at is not None

    for _ in range(4):
        assert _login(other, "feilpassord").status_code == 401
    locked = _login(other)

    assert (locked.status_code, locked.json()) == (429, TOO_MANY_ATTEMPTS)
    assert _user(db_session).deactivated_at is not None


def test_register_with_the_email_of_a_deactivated_account_is_refused(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    db_session: Session,
) -> None:
    assert logged_in_client(EMAIL).post(DEACTIVATE_URL).status_code == 204
    logged_in_client("kari@eksempel.no")

    deactivated = make_client().post(REGISTER_URL, json={"email": EMAIL, "password": PASSWORD})
    active = make_client().post(
        REGISTER_URL, json={"email": "kari@eksempel.no", "password": PASSWORD}
    )

    assert deactivated.status_code == 409
    assert (deactivated.status_code, deactivated.json()) == (active.status_code, active.json())
    assert _user(db_session).deactivated_at is not None


def test_data_is_unchanged_after_deactivate_and_login(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    db_session: Session,
) -> None:
    client = logged_in_client(EMAIL)
    assert client.post(CONSENT_URL).status_code == 200
    assert client.put(PROFILE_URL, json=PROFILE).status_code == 200
    item = FoodItem(source="matvaretabellen", name="Helmelk", kcal_per_100g=Decimal("63"))
    db_session.add(item)
    db_session.commit()
    entry = client.post(
        ENTRIES_URL,
        json={"food_item_id": str(item.id), "date": DAY, "meal": "lunch", "grams": 150},
    )
    assert entry.status_code == 201, entry.text
    assert client.post(WORKOUTS_URL, json={"date": DAY}).status_code == 201
    before = {
        "me": client.get(ME_URL).json(),
        "profile": client.get(PROFILE_URL).json(),
        "food": client.get(ENTRIES_URL, params={"date": DAY}).json(),
        "workout": client.get(f"{WORKOUTS_URL}/active").json(),
    }

    assert client.post(DEACTIVATE_URL).status_code == 204
    again = make_client()
    assert _login(again).json()["reactivated"] is True

    after = {
        "me": again.get(ME_URL).json(),
        "profile": again.get(PROFILE_URL).json(),
        "food": again.get(ENTRIES_URL, params={"date": DAY}).json(),
        "workout": again.get(f"{WORKOUTS_URL}/active").json(),
    }
    assert after == before
    assert before["food"] and before["workout"]["workout"] is not None


def test_purge_removes_old_deleted_accounts_but_keeps_deactivated_ones(
    logged_in_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    assert logged_in_client(EMAIL).post(DEACTIVATE_URL).status_code == 204
    assert logged_in_client("slettet@eksempel.no").delete(ME_URL).status_code == 204

    purged = service.purge_deleted(db_session, clock.now + service.PURGE_AFTER + timedelta(days=1))
    db_session.commit()

    assert purged == 1
    assert _user(db_session).deactivated_at is not None
    db_session.expire_all()
    assert db_session.scalars(select(User).where(User.email == "slettet@eksempel.no")).all() == []


def test_deactivating_after_reactivation_stores_the_new_time(
    logged_in_client: Callable[..., TestClient], db_session: Session, clock: Clock
) -> None:
    client = logged_in_client(EMAIL)
    assert client.post(DEACTIVATE_URL).status_code == 204
    clock.advance(timedelta(days=1))
    assert _login(client).status_code == 200
    assert client.post(DEACTIVATE_URL).status_code == 204

    assert _user(db_session).deactivated_at == clock.now


def test_deactivate_requires_login(client: TestClient) -> None:
    response = client.post(DEACTIVATE_URL)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == UNAUTHORIZED_CODE


def test_deactivate_with_wrong_origin_is_rejected(
    logged_in_client: Callable[..., TestClient], db_session: Session
) -> None:
    client = logged_in_client(EMAIL)

    response = client.post(DEACTIVATE_URL, headers={"Origin": "https://evil.example"})

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "origin_mismatch"
    assert _user(db_session).deactivated_at is None
    assert client.get(ME_URL).status_code == 200


def test_deleting_a_reactivated_account_still_works(
    logged_in_client: Callable[..., TestClient], make_client: Callable[[], TestClient]
) -> None:
    assert logged_in_client(EMAIL).post(DEACTIVATE_URL).status_code == 204
    again = make_client()
    assert _login(again).status_code == 200

    assert again.delete(ME_URL).status_code == 204
    assert _login(make_client()).json() == INVALID_CREDENTIALS
