"""Seed reference data and demo users on startup (AD-8)."""

import logging

from app.core.settings import Settings

logger = logging.getLogger(__name__)


def seed_if_empty(settings: Settings) -> bool:
    """Seed only when APP_ENV=local. Returns True if seeding ran.

    No-op stub for now: reference data and demo users arrive in later stories.
    """
    if settings.app_env != "local":
        logger.info("Skipping seed: APP_ENV=%s", settings.app_env)
        return False
    logger.info("Seed: nothing to seed yet")
    return True
