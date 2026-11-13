"""Application settings read from environment variables (AD-16)."""

from functools import lru_cache
from typing import Literal, Self

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SESSION_SECRET = "change-me-local-only"

UNSAFE_SECRET_MESSAGE = (
    "Unsafe configuration: SESSION_SECRET is empty or uses the default value "
    "while APP_ENV=production. Set a strong, unique SESSION_SECRET."
)


class Settings(BaseSettings):
    """Every field has a safe local default and is documented in .env.example."""

    model_config = SettingsConfigDict(env_file=None, extra="ignore")

    app_env: Literal["local", "test", "production"] = "local"
    session_secret: SecretStr = SecretStr(DEFAULT_SESSION_SECRET)
    database_url: str = "postgresql+psycopg://promptforce:promptforce@localhost:5432/promptforce"
    test_database_url: str = (
        "postgresql+psycopg://promptforce:promptforce@localhost:5432/promptforce_test"
    )
    app_url: str = "http://localhost:3000"
    off_mode: Literal["live", "mock"] = "mock"

    @model_validator(mode="after")
    def refuse_unsafe_production(self) -> Self:
        if self.app_env == "production":
            secret = self.session_secret.get_secret_value().strip()
            if not secret or secret == DEFAULT_SESSION_SECRET:
                raise ValueError(UNSAFE_SECRET_MESSAGE)
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
