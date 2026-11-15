"""HTTP endpoints for accounts and sessions under /api/identity."""

from fastapi import APIRouter, Response, status

from app.core.db import DbSession
from app.modules.identity import service
from app.modules.identity.schemas import RegisterRequest, UserResponse

SESSION_COOKIE = "pf_session"

router = APIRouter(prefix="/api/identity", tags=["identity"])


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=int(service.SESSION_LIFETIME.total_seconds()),
        path="/",
        httponly=True,
        secure=True,
        samesite="lax",
    )


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=UserResponse,
    operation_id="register",
)
def register(body: RegisterRequest, response: Response, db: DbSession) -> UserResponse:
    """Public: no authentication required. Creates the account and logs the user in."""
    registration = service.register(db, body.email, body.password)
    set_session_cookie(response, registration.session_token)
    return UserResponse(id=registration.user.id, email=registration.user.email)
