"""Reset a forgotten password (story 1.7): request, mail, confirm, limits and no enumeration."""

import re
from collections.abc import Callable
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.settings import get_settings
from app.modules.identity import service
from app.modules.identity.models import PasswordReset, User
from app.modules.identity.models import Session as UserSession
from app.ports.email import MockEmailAdapter
from tests.conftest import PASSWORD, Clock
from tests.identity.helpers import (
    INVALID_CREDENTIALS,
    LOGIN_URL,
    ME_URL,
    TOO_MANY_ATTEMPTS,
    count,
)

REQUEST_URL = "/api/identity/password-reset"
CONFIRM_URL = "/api/identity/password-reset/confirm"
DEACTIVATE_URL = "/api/identity/deactivate"
EMAIL = "ola@eksempel.no"
NEW_PASSWORD = "nytt-passord-1"
RESET_LINK_INVALID = {
    "error": {
        "code": "reset_link_invalid",
        "message": "Lenken er utløpt eller allerede brukt. Be om en ny.",
    }
}
LINK = re.compile(r"(\S+/nytt-passord\?token=(\S+))")


def _user(db: Session, email: str = EMAIL) -> User:
    db.expire_all()
    return db.scalars(select(User).where(User.email == email, User.deleted_at.is_(None))).one()


def _request(client: TestClient, email: str = EMAIL):
    return client.post(REQUEST_URL, json={"email": email})


def _confirm(client: TestClient, token: str, password: str = NEW_PASSWORD):
    return client.post(CONFIRM_URL, json={"token": token, "password": password})


def _login(client: TestClient, password: str, email: str = EMAIL):
    return client.post(LOGIN_URL, json={"email": email, "password": password})


def _token(mailbox: MockEmailAdapter, index: int = -1) -> str:
    match = LINK.search(mailbox.sent[index].body)
    assert match, mailbox.sent[index].body
    return match.group(2)


def test_request_for_an_existing_account_sends_one_mail_with_a_link(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    mailbox: MockEmailAdapter,
    db_session: Session,
    clock: Clock,
) -> None:
    logged_in_client(EMAIL)

    response = _request(make_client(), "  Ola@Eksempel.no ")

    assert response.status_code == 204
    assert response.content == b""
    assert len(mailbox.sent) == 1
    mail = mailbox.sent[0]
    assert mail.to == EMAIL
    assert mail.subject == "Nytt passord til Prompt Force"
    link, token = LINK.search(mail.body).groups()  # type: ignore[union-attr]
    assert link == f"{get_settings().app_url}/nytt-passord?token={token}"
    assert "60 minutter" in mail.body

    db_session.expire_all()
    reset = db_session.scalars(select(PasswordReset)).one()
    # Only the hash is stored, the same HMAC as session tokens.
    assert reset.token_hash == service.hash_session_token(token)
    assert token not in reset.token_hash
    assert reset.expires_at == clock.now + timedelta(minutes=60)
    assert reset.used_at is None


def test_unknown_and_deleted_emails_get_the_same_answer_and_no_mail(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    mailbox: MockEmailAdapter,
    db_session: Session,
) -> None:
    existing = _request(make_client(), "kari@eksempel.no")
    deleted_client = logged_in_client(EMAIL)
    assert deleted_client.delete(ME_URL).status_code == 204
    other = make_client()

    unknown = _request(other, "ukjent@eksempel.no")
    deleted = _request(other, EMAIL)

    for response in (existing, unknown, deleted):
        assert response.status_code == 204
        assert response.content == b""
        assert "set-cookie" not in response.headers
    assert mailbox.sent == []
    assert count(db_session, PasswordReset) == 0


def test_answer_does_not_depend_on_the_account(
    logged_in_client: Callable[..., TestClient], make_client: Callable[[], TestClient]
) -> None:
    logged_in_client(EMAIL)
    client = make_client()

    known = _request(client, EMAIL)
    unknown = _request(client, "ukjent@eksempel.no")

    assert (known.status_code, known.content) == (unknown.status_code, unknown.content)
    assert set(known.headers) == set(unknown.headers)


def test_invalid_email_is_a_field_error(make_client: Callable[[], TestClient]) -> None:
    response = _request(make_client(), "ikke-en-epost")

    assert response.status_code == 422
    assert response.json()["error"]["fields"] == [
        {"field": "email", "message": "Skriv inn en gyldig e-postadresse."}
    ]


def test_fourth_request_within_an_hour_sends_nothing(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    mailbox: MockEmailAdapter,
    clock: Clock,
) -> None:
    logged_in_client(EMAIL)
    client = make_client()

    for _ in range(3):
        assert _request(client).status_code == 204
        clock.advance(timedelta(minutes=10))
    fourth = _request(client)

    assert fourth.status_code == 204
    assert len(mailbox.sent) == 3

    # The window rolls: an hour after the first, one more is allowed.
    clock.advance(timedelta(minutes=31))
    assert _request(client).status_code == 204
    assert len(mailbox.sent) == 4


def test_the_limit_is_per_account(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    mailbox: MockEmailAdapter,
) -> None:
    logged_in_client(EMAIL)
    logged_in_client("kari@eksempel.no")
    client = make_client()
    for _ in range(4):
        _request(client)

    assert _request(client, "kari@eksempel.no").status_code == 204
    assert [mail.to for mail in mailbox.sent] == [EMAIL] * 3 + ["kari@eksempel.no"]


def test_valid_link_changes_the_password_and_ends_every_session(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    mailbox: MockEmailAdapter,
    db_session: Session,
    clock: Clock,
) -> None:
    phone = logged_in_client(EMAIL)
    kari = logged_in_client("kari@eksempel.no")
    visitor = make_client()
    _request(visitor)

    response = _confirm(visitor, _token(mailbox))

    assert response.status_code == 204
    # No login straight after the reset.
    assert "set-cookie" not in response.headers
    assert phone.get(ME_URL).status_code == 401
    assert kari.get(ME_URL).status_code == 200
    user = _user(db_session)
    db_session.expire_all()
    assert db_session.scalars(
        select(UserSession).where(UserSession.user_id == user.id)
    ).all() == []
    assert db_session.scalars(select(PasswordReset)).one().used_at == clock.now

    old = _login(visitor, PASSWORD)
    assert (old.status_code, old.json()) == (401, INVALID_CREDENTIALS)
    assert _login(make_client(), NEW_PASSWORD).status_code == 200


def test_link_works_only_once(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    mailbox: MockEmailAdapter,
    db_session: Session,
) -> None:
    logged_in_client(EMAIL)
    client = make_client()
    _request(client)
    token = _token(mailbox)
    assert _confirm(client, token).status_code == 204
    hash_after_first = _user(db_session).password_hash

    second = _confirm(client, token, "et-annet-passord")

    assert (second.status_code, second.json()) == (400, RESET_LINK_INVALID)
    assert _user(db_session).password_hash == hash_after_first


def test_a_new_request_keeps_older_links_valid(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    mailbox: MockEmailAdapter,
) -> None:
    logged_in_client(EMAIL)
    client = make_client()
    _request(client)
    _request(client)

    assert _confirm(client, _token(mailbox, 0)).status_code == 204
    # Once the password has changed, the other unused link is used up as well.
    assert _confirm(client, _token(mailbox, 1)).status_code == 400


def test_expired_link_changes_nothing(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    mailbox: MockEmailAdapter,
    db_session: Session,
    clock: Clock,
) -> None:
    session_client = logged_in_client(EMAIL)
    client = make_client()
    _request(client)
    before = _user(db_session).password_hash

    clock.advance(timedelta(minutes=59, seconds=59))
    token = _token(mailbox)
    clock.advance(timedelta(seconds=1))
    response = _confirm(client, token)

    assert (response.status_code, response.json()) == (400, RESET_LINK_INVALID)
    assert _user(db_session).password_hash == before
    assert session_client.get(ME_URL).status_code == 200
    db_session.expire_all()
    assert db_session.scalars(select(PasswordReset)).one().used_at is None


def test_link_is_valid_just_before_it_expires(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    mailbox: MockEmailAdapter,
    clock: Clock,
) -> None:
    logged_in_client(EMAIL)
    client = make_client()
    _request(client)

    clock.advance(timedelta(minutes=59, seconds=59))

    assert _confirm(client, _token(mailbox)).status_code == 204


def test_unknown_and_malformed_tokens_are_refused(make_client: Callable[[], TestClient]) -> None:
    client = make_client()

    for token in ("finnes-ikke", "", "x" * 1000):
        response = _confirm(client, token)
        assert (response.status_code, response.json()) == (400, RESET_LINK_INVALID), token


def test_link_of_a_deleted_account_is_refused(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    mailbox: MockEmailAdapter,
) -> None:
    session_client = logged_in_client(EMAIL)
    client = make_client()
    _request(client)
    assert session_client.delete(ME_URL).status_code == 204

    response = _confirm(client, _token(mailbox))

    assert (response.status_code, response.json()) == (400, RESET_LINK_INVALID)


def test_short_password_is_a_field_error_and_keeps_the_link(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    mailbox: MockEmailAdapter,
    db_session: Session,
) -> None:
    logged_in_client(EMAIL)
    client = make_client()
    _request(client)
    token = _token(mailbox)
    before = _user(db_session).password_hash

    response = _confirm(client, token, "1234567")

    assert response.status_code == 422
    assert response.json()["error"]["fields"] == [
        {"field": "password", "message": "Velg et passord på minst 8 tegn."}
    ]
    assert _user(db_session).password_hash == before
    assert _confirm(client, token).status_code == 204


def test_reset_does_not_reactivate_but_the_next_login_does(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    mailbox: MockEmailAdapter,
    db_session: Session,
) -> None:
    assert logged_in_client(EMAIL).post(DEACTIVATE_URL).status_code == 204
    client = make_client()
    _request(client)
    assert len(mailbox.sent) == 1

    assert _confirm(client, _token(mailbox)).status_code == 204
    assert _user(db_session).deactivated_at is not None

    login = _login(client, NEW_PASSWORD)
    assert login.status_code == 200
    assert login.json()["reactivated"] is True
    assert _user(db_session).deactivated_at is None


def test_reset_clears_the_lockout(
    logged_in_client: Callable[..., TestClient],
    make_client: Callable[[], TestClient],
    mailbox: MockEmailAdapter,
    db_session: Session,
) -> None:
    logged_in_client(EMAIL)
    client = make_client()
    for _ in range(5):
        assert _login(client, "feilpassord").status_code == 401
    locked = _login(client, PASSWORD)
    assert (locked.status_code, locked.json()) == (429, TOO_MANY_ATTEMPTS)

    _request(client)
    assert _confirm(client, _token(mailbox)).status_code == 204

    user = _user(db_session)
    assert (user.locked_until, user.failed_login_count, user.first_failed_at) == (None, 0, None)
    assert _login(client, NEW_PASSWORD).status_code == 200


def test_both_endpoints_need_a_matching_origin(bare_client: TestClient) -> None:
    for url, body in (
        (REQUEST_URL, {"email": EMAIL}),
        (CONFIRM_URL, {"token": "x", "password": NEW_PASSWORD}),
    ):
        response = bare_client.post(url, json=body)
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "origin_mismatch"


def test_both_endpoints_are_public(make_client: Callable[[], TestClient]) -> None:
    client = make_client()

    assert _request(client).status_code == 204
    assert _confirm(client, "ukjent").status_code == 400
