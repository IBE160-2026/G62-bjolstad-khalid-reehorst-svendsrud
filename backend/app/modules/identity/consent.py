"""Consent guard (GDPR art. 9): the one place that checks consent.

Every endpoint that reads or writes health data (profile, food logs, workouts,
overview) depends on `ConsentedUser` instead of `CurrentUser`. Identity endpoints
(me, logout, consent, delete account) never require consent.
"""

from typing import Annotated

from fastapi import Depends

from app.core.auth import CurrentUser
from app.core.errors import AppError
from app.modules.identity.service import SessionUser

CONSENT_REQUIRED_CODE = "consent_required"
CONSENT_REQUIRED_MESSAGE = "Du må godta samtykket før du kan legge inn helsedata."


def require_consent(current_user: CurrentUser) -> SessionUser:
    """403 `consent_required` for a logged-in user who has not given consent."""
    if current_user.consent_at is None:
        raise AppError(403, CONSENT_REQUIRED_CODE, CONSENT_REQUIRED_MESSAGE)
    return current_user


ConsentedUser = Annotated[SessionUser, Depends(require_consent)]
