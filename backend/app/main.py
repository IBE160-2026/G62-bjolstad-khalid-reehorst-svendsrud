"""FastAPI application factory."""

import logging

from fastapi import FastAPI

from app.core.errors import ErrorResponse, register_error_handlers
from app.core.settings import get_settings
from app.modules.health.router import router as health_router

ERROR_RESPONSES: dict[int | str, dict] = {"default": {"model": ErrorResponse}}


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
    app.include_router(health_router, responses=ERROR_RESPONSES)
    return app


app = create_app()
