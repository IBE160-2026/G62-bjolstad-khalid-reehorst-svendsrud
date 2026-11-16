"""FastAPI application factory."""

import logging

from fastapi import FastAPI

from app.core.errors import ErrorResponse, register_error_handlers
from app.core.origin import make_origin_check
from app.core.settings import get_settings
from app.modules.exercises.router import router as exercises_router
from app.modules.food.router import router as food_router
from app.modules.health.router import router as health_router
from app.modules.identity.router import router as identity_router
from app.modules.profile.router import router as profile_router

# 422 is listed so OpenAPI documents the error envelope, not FastAPI's HTTPValidationError.
ERROR_RESPONSES: dict[int | str, dict] = {
    422: {"model": ErrorResponse, "description": "Validation error"},
    "default": {"model": ErrorResponse},
}


def create_app() -> FastAPI:
    settings = get_settings()  # Fails fast on unsafe production config (AD-16).
    logging.basicConfig(level=logging.INFO)

    app = FastAPI(
        title="Prompt Force API",
        version="0.1.0",
        docs_url="/api/docs" if settings.app_env != "production" else None,
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )
    register_error_handlers(app)
    # Every POST/PUT/PATCH/DELETE must come from APP_URL (AD-3); runs before routing.
    app.middleware("http")(make_origin_check(settings.app_url))
    app.include_router(health_router, responses=ERROR_RESPONSES)
    app.include_router(identity_router, responses=ERROR_RESPONSES)
    app.include_router(profile_router, responses=ERROR_RESPONSES)
    app.include_router(food_router, responses=ERROR_RESPONSES)
    app.include_router(exercises_router, responses=ERROR_RESPONSES)
    return app


app = create_app()
