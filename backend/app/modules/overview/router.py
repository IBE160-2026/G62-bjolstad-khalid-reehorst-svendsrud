"""GET /api/overview (story 6.1): the Daily Overview for one date, and GET /api/overview/week
(story 6.3): the week strip's marks. Both require consent."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query

from app.core.clock import Now
from app.core.db import DbSession
from app.core.errors import ErrorResponse
from app.modules.identity.consent import ConsentedUser
from app.modules.overview import service
from app.modules.overview.schemas import OverviewResponse, WeekDayResponse

router = APIRouter(prefix="/api/overview", tags=["overview"])


@router.get(
    "",
    response_model=OverviewResponse,
    operation_id="get_overview",
    responses={422: {"model": ErrorResponse, "description": "date_in_future, validation_error"}},
)
def get_overview(
    current_user: ConsentedUser,
    db: DbSession,
    now: Now,
    day: Annotated[date, Query(alias="date")],
) -> OverviewResponse:
    """Target, kcal eaten and remaining, the Meals and the done workouts for one date
    (YYYY-MM-DD). Read-only; any date after today (Europe/Oslo) is 422."""
    return service.get_day(db, current_user.id, day, now)


@router.get(
    "/week",
    response_model=list[WeekDayResponse],
    operation_id="get_overview_week",
    responses={
        422: {
            "model": ErrorResponse,
            "description": "week_start_not_monday, week_out_of_range, validation_error",
        }
    },
)
def get_overview_week(
    current_user: ConsentedUser,
    db: DbSession,
    now: Now,
    start: Annotated[date, Query()],
) -> list[WeekDayResponse]:
    """Monday to Sunday from `start` (a Monday, YYYY-MM-DD): whether food and a workout with
    a done set were logged each day, and whether the day is after today (Europe/Oslo)."""
    return service.get_week(db, current_user.id, start, now)
