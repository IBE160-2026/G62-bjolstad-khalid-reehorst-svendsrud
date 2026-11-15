"""HTTP endpoints for accounts and sessions under /api/identity."""

from typing import Annotated

from fastapi import APIRouter, Cookie, Response, status

from app.core.auth import (
    SESSION_COOKIE,
    CurrentUser,
    clear_session_cookie,
    set_session_cookie,
)
from app.core.clock import Now
from app.core.db import DbSession
from app.modules.identity import service
from app.modules.identity.models import User
from app.modules.identity.schemas import LoginRequest, RegisterRequest, UserResponse

router = APIRouter(prefix="/api/identity", tags=["identity"])


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        consent_at=user.consent_at,
        intro_dismissed_at=user.intro_dismissed_at,
    )


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=UserResponse,
    operation_id="register",
)
def register(body: RegisterRequest, response: Response, db: DbSession, now: Now) -> UserResponse:
    """Public: no authentication required. Creates the account and logs the user in."""
    registration = service.register(db, body.email, body.password, now)
    set_session_cookie(response, registration.session_token)
    return _user_response(registration.user)


@router.post("/login", response_model=UserResponse, operation_id="login")
def login(
    body: LoginRequest,
    response: Response,
    db: DbSession,
    now: Now,
    current_token: Annotated[
        str | None, Cookie(alias=SESSION_COOKIE, include_in_schema=False)
    ] = None,
) -> UserResponse:
    """Public: no authentication required. Starts a new session for the account."""
    try:
        result = service.login(db, body.email, body.password, now, current_token)
    except service.LoginRejected:
        # Keep the failure count: the request fails, so get_db would roll it back.
        db.commit()
        raise
    set_session_cookie(response, result.session_token)
    return _user_response(result.user)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    operation_id="logout",
)
def logout(current_user: CurrentUser, db: DbSession) -> Response:
    """Ends only the session of the cookie that was sent."""
    service.logout(db, current_user.session_id)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_session_cookie(response)
    return response


@router.get("/me", response_model=UserResponse, operation_id="me")
def me(current_user: CurrentUser) -> UserResponse:
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        consent_at=current_user.consent_at,
        intro_dismissed_at=current_user.intro_dismissed_at,
    )


@router.post("/consent", response_model=UserResponse, operation_id="give_consent")
def give_consent(current_user: CurrentUser, db: DbSession, now: Now) -> UserResponse:
    """Records consent to storing health data. Requires login, not consent."""
    return _user_response(service.give_consent(db, current_user.id, now))


@router.post("/intro/dismiss", response_model=UserResponse, operation_id="dismiss_intro")
def dismiss_intro(current_user: CurrentUser, db: DbSession, now: Now) -> UserResponse:
    """Records that the first-run introduction was closed. Requires login, not consent."""
    return _user_response(service.dismiss_intro(db, current_user.id, now))


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    operation_id="delete_account",
)
def delete_account(current_user: CurrentUser, db: DbSession, now: Now) -> Response:
    """Deletes the account (soft delete) and logs out every device. Requires login, not consent."""
    service.delete_account(db, current_user.id, now)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_session_cookie(response)
    return response
