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
from app.modules.identity.schemas import LoginRequest, RegisterRequest, UserResponse

router = APIRouter(prefix="/api/identity", tags=["identity"])


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
    return UserResponse(id=registration.user.id, email=registration.user.email)


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
    return UserResponse(id=result.user.id, email=result.user.email)


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
    return UserResponse(id=current_user.id, email=current_user.email)
