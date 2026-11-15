"""One user's session never reaches another user's account."""

from collections.abc import Callable

from fastapi.testclient import TestClient

from tests.identity.helpers import LOGOUT_URL, ME_URL


def test_each_cookie_sees_only_its_own_user(
    logged_in_client: Callable[..., TestClient],
) -> None:
    ola = logged_in_client("ola@eksempel.no")
    kari = logged_in_client("kari@eksempel.no")

    ola_me = ola.get(ME_URL).json()
    kari_me = kari.get(ME_URL).json()

    assert ola_me["email"] == "ola@eksempel.no"
    assert kari_me["email"] == "kari@eksempel.no"
    assert ola_me["id"] != kari_me["id"]


def test_logout_leaves_other_users_logged_in(
    logged_in_client: Callable[..., TestClient],
) -> None:
    ola = logged_in_client("ola@eksempel.no")
    kari = logged_in_client("kari@eksempel.no")

    assert ola.post(LOGOUT_URL).status_code == 204

    assert ola.get(ME_URL).status_code == 401
    response = kari.get(ME_URL)
    assert response.status_code == 200
    assert response.json()["email"] == "kari@eksempel.no"


def test_logout_ends_only_the_presented_session_of_the_same_user(
    logged_in_client: Callable[..., TestClient], make_client: Callable[[], TestClient]
) -> None:
    laptop = logged_in_client("ola@eksempel.no")
    phone = make_client()
    login = phone.post(
        "/api/identity/login", json={"email": "ola@eksempel.no", "password": "hemmelig1"}
    )
    assert login.status_code == 200

    assert laptop.post(LOGOUT_URL).status_code == 204

    assert laptop.get(ME_URL).status_code == 401
    assert phone.get(ME_URL).status_code == 200
