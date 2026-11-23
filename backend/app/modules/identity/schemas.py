"""Request and response bodies for /api/identity."""

import uuid
from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel
from pydantic_core import PydanticCustomError

from app.core.errors import FIELD_MESSAGE_ERROR

EMAIL_MAX_LENGTH = 254
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128

EMAIL_MISSING_MESSAGE = "Skriv inn e-postadressen din."
EMAIL_INVALID_MESSAGE = "Skriv inn en gyldig e-postadresse."
PASSWORD_TOO_SHORT_MESSAGE = "Velg et passord på minst 8 tegn."
PASSWORD_TOO_LONG_MESSAGE = "Velg et passord på høyst 128 tegn."
PASSWORD_MISSING_MESSAGE = "Skriv inn passordet ditt."


def _field_error(message: str) -> PydanticCustomError:
    return PydanticCustomError(FIELD_MESSAGE_ERROR, message)


def is_valid_email(email: str) -> bool:
    """Simple check: one @, non-empty local part, a domain with a dot, at most 254 chars."""
    if len(email) > EMAIL_MAX_LENGTH or email.count("@") != 1 or any(c.isspace() for c in email):
        return False
    local, domain = email.split("@")
    labels = domain.split(".")
    return bool(local) and len(labels) > 1 and all(labels)


def _check_email(value: str) -> str:
    email = value.strip().lower()
    if not email:
        raise _field_error(EMAIL_MISSING_MESSAGE)
    if not is_valid_email(email):
        raise _field_error(EMAIL_INVALID_MESSAGE)
    return email


def _check_password(value: str) -> str:
    if len(value) < PASSWORD_MIN_LENGTH:
        raise _field_error(PASSWORD_TOO_SHORT_MESSAGE)
    if len(value) > PASSWORD_MAX_LENGTH:
        raise _field_error(PASSWORD_TOO_LONG_MESSAGE)
    return value


class RegisterRequest(BaseModel):
    email: Annotated[str, AfterValidator(_check_email)]
    password: Annotated[str, AfterValidator(_check_password)]


def _check_login_password(value: str) -> str:
    # No minimum here: the login answer must not hint at the password rules.
    if not value:
        raise _field_error(PASSWORD_MISSING_MESSAGE)
    if len(value) > PASSWORD_MAX_LENGTH:
        raise _field_error(PASSWORD_TOO_LONG_MESSAGE)
    return value


class LoginRequest(BaseModel):
    email: Annotated[str, AfterValidator(_check_email)]
    password: Annotated[str, AfterValidator(_check_login_password)]


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    # Null until the user has given consent to storing health data (story 1.5).
    consent_at: datetime | None
    # Null until the user has closed the first-run introduction (story 2.3).
    intro_dismissed_at: datetime | None


class LoginResponse(UserResponse):
    # True when this login reactivated a deactivated account (story 1.8).
    reactivated: bool


class PasswordResetRequest(BaseModel):
    email: Annotated[str, AfterValidator(_check_email)]


class PasswordResetConfirm(BaseModel):
    # Not validated here: a bad token gets the same 400 as an unknown one.
    token: str
    # The same rules as registration.
    password: Annotated[str, AfterValidator(_check_password)]
