"""One error envelope for every error response (AD-11)."""

import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class FieldError(BaseModel):
    """One invalid input field, shown inline under that field in the UI."""

    field: str
    message: str


class ErrorBody(BaseModel):
    code: str
    message: str
    fields: list[FieldError] | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody


class AppError(Exception):
    """Raise from services/routers to return a specific code and Norwegian message."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        fields: list[FieldError] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.fields = fields


VALIDATION_MESSAGE = "Forespørselen er ugyldig. Sjekk feltene og prøv igjen."
INTERNAL_MESSAGE = "Noe gikk galt. Prøv igjen om litt."

# Pydantic error type whose message is already user-facing Norwegian text.
FIELD_MESSAGE_ERROR = "field_message"
MISSING_FIELD_MESSAGE = "Fyll ut dette feltet."
INVALID_FIELD_MESSAGE = "Sjekk verdien i dette feltet."

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


def error_response(
    status_code: int,
    code: str,
    message: str,
    fields: list[FieldError] | None = None,
) -> JSONResponse:
    body = ErrorResponse(error=ErrorBody(code=code, message=message, fields=fields))
    return JSONResponse(status_code=status_code, content=body.model_dump(exclude_none=True))


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
    return error_response(exc.status_code, exc.code, exc.message, exc.fields)


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


def _field_errors(exc: RequestValidationError) -> list[FieldError]:
    """Map pydantic errors to one Norwegian message per field; never echo input values."""
    fields: list[FieldError] = []
    seen: set[str] = set()
    for error in exc.errors():
        loc = [str(part) for part in error.get("loc", ()) if not isinstance(part, int)]
        # Drop the source ("body", "query", ...) and keep the field path.
        name = ".".join(loc[1:])
        if not name or name in seen:
            continue
        seen.add(name)
        if error.get("type") == FIELD_MESSAGE_ERROR:
            message = str(error.get("msg"))
        elif error.get("type") == "missing":
            message = MISSING_FIELD_MESSAGE
        else:
            message = INVALID_FIELD_MESSAGE
        fields.append(FieldError(field=name, message=message))
    return fields


async def _handle_validation_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    return error_response(422, "validation_error", VALIDATION_MESSAGE, _field_errors(exc) or None)


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
