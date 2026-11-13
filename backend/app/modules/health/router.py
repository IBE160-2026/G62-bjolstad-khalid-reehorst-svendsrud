"""Public health endpoint, reached by the browser through the Next.js /api rewrite."""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["health"])


class HealthResponse(BaseModel):
    status: Literal["ok"]


@router.get("/health", response_model=HealthResponse, operation_id="get_health")
def get_health() -> HealthResponse:
    """Public: no authentication required."""
    return HealthResponse(status="ok")
