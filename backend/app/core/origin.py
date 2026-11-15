"""Origin check for every state-changing request (AD-3, CSRF protection)."""

from collections.abc import Awaitable, Callable
from urllib.parse import urlsplit

from fastapi import Request, Response

from app.core.errors import error_response

MUTATING_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})
ORIGIN_MISMATCH_MESSAGE = "Forespørselen kom fra et ukjent sted. Last inn siden på nytt og prøv igjen."


def origin_of(url: str) -> str:
    """Scheme, host and port of a URL, e.g. 'http://localhost:3000'."""
    parts = urlsplit(url.strip())
    return f"{parts.scheme.lower()}://{parts.netloc.lower()}"


def make_origin_check(
    app_url: str,
) -> Callable[[Request, Callable[[Request], Awaitable[Response]]], Awaitable[Response]]:
    parts = urlsplit(app_url.strip())
    if not parts.scheme or not parts.netloc:
        raise ValueError("APP_URL must include a scheme and host, e.g. http://localhost:3000.")
    expected = origin_of(app_url)

    async def check_origin(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if request.method in MUTATING_METHODS:
            origin = request.headers.get("origin")
            if origin is None or origin_of(origin) != expected:
                return error_response(403, "origin_mismatch", ORIGIN_MISMATCH_MESSAGE)
        return await call_next(request)

    return check_origin
