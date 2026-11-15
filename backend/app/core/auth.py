"""Auth dependency: resolves the logged-in user from the `pf_session` cookie (AD-3).

Every endpoint uses `CurrentUser` unless it is explicitly public (register, login,
health). Other modules get the user's id from here and never read sessions themselves.
"""

from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, Response

from app.core.clock import Now
from app.core.db import DbSession
from app.modules.identity import service
from app.modules.identity.service import SessionUser

SESSION_COOKIE = "pf_session"
_COOKIE_ATTRIBUTES = {"path": "/", "httponly": True, "secure": True, "samesite": "lax"}


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=int(service.SESSION_LIFETIME.total_seconds()),
        **_COOKIE_ATTRIBUTES,
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, **_COOKIE_ATTRIBUTES)


def _clearing_cookie_header() -> str:
    response = Response()
    clear_session_cookie(response)
    return response.headers["set-cookie"]


def _unauthorized() -> HTTPException:
    # The error handler fills in code `unauthorized` and its Norwegian message.
    return HTTPException(status_code=401, headers={"set-cookie": _clearing_cookie_header()})


def get_current_user(
    db: DbSession,
    now: Now,
    token: Annotated[str | None, Cookie(alias=SESSION_COOKIE, include_in_schema=False)] = None,
) -> SessionUser:
    """401 `unauthorized` and a cleared cookie for a missing, unknown or expired session."""
    if not token:
        raise _unauthorized()
    user = service.resolve_session(db, token, now)
    if user is None:
        # Store the removal of an expired session; the request itself fails.
        db.commit()
        raise _unauthorized()
    return user


CurrentUser = Annotated[SessionUser, Depends(get_current_user)]
