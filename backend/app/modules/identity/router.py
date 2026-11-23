"""HTTP endpoints for accounts and sessions under /api/identity."""

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, Response, status

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
from app.modules.identity.schemas import (
    LoginRequest,
    LoginResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    RegisterRequest,
    UserResponse,
)
from app.ports.email import EmailPort, get_email_port

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


@router.post("/login", response_model=LoginResponse, operation_id="login")
def login(
    body: LoginRequest,
    response: Response,
    db: DbSession,
    now: Now,
    current_token: Annotated[
        str | None, Cookie(alias=SESSION_COOKIE, include_in_schema=False)
    ] = None,
) -> LoginResponse:
    """Public: no authentication required. Starts a new session for the account.

    The right password on a deactivated account reactivates it (`reactivated: true`).
    """
    try:
        result = service.login(db, body.email, body.password, now, current_token)
    except service.LoginRejected:
        # Keep the failure count: the request fails, so get_db would roll it back.
        db.commit()
        raise
    set_session_cookie(response, result.session_token)
    return LoginResponse(
        **_user_response(result.user).model_dump(), reactivated=result.reactivated
    )


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


@router.post(
    "/password-reset",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    operation_id="request_password_reset",
)
def request_password_reset(
    body: PasswordResetRequest,
    db: DbSession,
    now: Now,
    email: Annotated[EmailPort, Depends(get_email_port)],
    background: BackgroundTasks,
) -> Response:
    """Public: no authentication required. Sends a reset link if the account exists.

    Always 204, whether or not the e-mail has an account or the hourly limit is reached.
    The mail is sent after the response (and after the commit), so the response time does
    not depend on it.
    """
    message = service.request_password_reset(db, body.email, now)
    if message is not None:
        background.add_task(email.send, message)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/password-reset/confirm",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    operation_id="confirm_password_reset",
)
def confirm_password_reset(body: PasswordResetConfirm, db: DbSession, now: Now) -> Response:
    """Public: no authentication required. Sets a new password from a reset link.

    Ends every session of the account and clears the login lockout; does not log in.
    An expired, used or unknown link answers 400 `reset_link_invalid`.
    """
    service.confirm_password_reset(db, body.token, body.password, now)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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


@router.post(
    "/deactivate",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    operation_id="deactivate_account",
)
def deactivate_account(current_user: CurrentUser, db: DbSession, now: Now) -> Response:
    """Deactivates the account (no data deleted) and logs out every device.

    Requires login, not consent. Logging in again with the right password reactivates it.
    """
    service.deactivate_account(db, current_user.id, now)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_session_cookie(response)
    return response


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
