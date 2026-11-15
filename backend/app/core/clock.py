"""The current UTC time as a dependency, so tests can control time (NFR-8)."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends


def utc_now() -> datetime:
    return datetime.now(UTC)


Now = Annotated[datetime, Depends(utc_now)]
