"""Application settings read from environment variables (AD-16)."""

from functools import lru_cache
from typing import Literal, Self

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SESSION_SECRET = "change-me-local-only"

UNSAFE_EMAIL_MESSAGE = (
    "Unsafe configuration: APP_ENV=production needs a working mail setup for password "
    "reset e-mails. Set EMAIL_MODE=smtp and SMTP_HOST (not mock)."
)

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
    # E-mail (story 1.7): smtp sends to SMTP_HOST (Mailpit in Compose, never delivered);
    # mock records mails in memory and is what tests use.
    email_mode: Literal["smtp", "mock"] = "smtp"
    smtp_host: str = "mailpit"
    smtp_port: int = 1025
    smtp_username: str = ""
    smtp_password: SecretStr = SecretStr("")
    smtp_starttls: bool = False
    email_from: str = "Prompt Force <ikke-svar@promptforce.local>"

    @model_validator(mode="after")
    def refuse_unsafe_production(self) -> Self:
        if self.app_env == "production":
            secret = self.session_secret.get_secret_value().strip()
            if not secret or secret == DEFAULT_SESSION_SECRET:
                raise ValueError(UNSAFE_SECRET_MESSAGE)
            # Refuse to start rather than silently dropping reset mails (AD-16).
            if self.email_mode != "smtp" or not self.smtp_host.strip():
                raise ValueError(UNSAFE_EMAIL_MESSAGE)
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
