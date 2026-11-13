"""One error envelope for every error response (AD-11)."""

import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class ErrorBody(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorBody


class AppError(Exception):
    """Raise from services/routers to return a specific code and Norwegian message."""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


VALIDATION_MESSAGE = "Forespørselen er ugyldig. Sjekk feltene og prøv igjen."
INTERNAL_MESSAGE = "Noe gikk galt. Prøv igjen om litt."

# Default code and Norwegian message per HTTP status.
_STATUS_ERRORS: dict[int, tuple[str, str]] = {
    400: ("bad_request", "Forespørselen er ugyldig."),
    401: ("unauthorized", "Du må logge inn."),
    403: ("forbidden", "Du har ikke tilgang til dette."),
    404: ("not_found", "Fant ikke siden."),
    405: ("method_not_allowed", "Metoden er ikke tillatt."),
    409: ("conflict", "Forespørselen er i konflikt med eksisterende data."),
    429: ("too_many_requests", "For mange forsøk. Prøv igjen om litt."),
}


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    body = ErrorResponse(error=ErrorBody(code=code, message=message))
    return JSONResponse(status_code=status_code, content=body.model_dump())


def _fallback(status_code: int) -> tuple[str, str]:
    if status_code in _STATUS_ERRORS:
        return _STATUS_ERRORS[status_code]
    if status_code >= 500:
        return "internal_error", INTERNAL_MESSAGE
    try:
        code = HTTPStatus(status_code).phrase.lower().replace(" ", "_").replace("-", "_")
    except ValueError:
        code = "error"
    return code, "Forespørselen kunne ikke fullføres."


async def _handle_app_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)
    return error_response(exc.status_code, exc.code, exc.message)


async def _handle_http_exception(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    code, message = _fallback(exc.status_code)
    detail = exc.detail
    if isinstance(detail, dict) and {"code", "message"} <= detail.keys():
        code, message = str(detail["code"]), str(detail["message"])
    response = error_response(exc.status_code, code, message)
    if exc.headers:
        response.headers.update(exc.headers)
    return response


async def _handle_validation_error(_: Request, exc: Exception) -> JSONResponse:
    return error_response(422, "validation_error", VALIDATION_MESSAGE)


async def _handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
    # Log only method, path and exception type; never request bodies (conventions).
    logger.error(
        "Unhandled error on %s %s: %s",
        request.method,
        request.url.path,
        type(exc).__name__,
        exc_info=exc,
    )
    return error_response(500, "internal_error", INTERNAL_MESSAGE)


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _handle_app_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(Exception, _handle_unexpected)
