import os
import subprocess
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.settings import DEFAULT_SESSION_SECRET, Settings

BACKEND_DIR = Path(__file__).resolve().parent.parent


@pytest.mark.parametrize("secret", ["", "   ", DEFAULT_SESSION_SECRET])
def test_production_refuses_empty_or_default_secret(secret: str) -> None:
    with pytest.raises(ValidationError, match="SESSION_SECRET"):
        Settings(app_env="production", session_secret=secret)


STRONG_SECRET = "a-long-random-production-secret"


def test_production_accepts_strong_secret() -> None:
    settings = Settings(
        app_env="production",
        session_secret=STRONG_SECRET,
        email_mode="smtp",
        smtp_host="smtp.eksempel.no",
    )

    assert settings.app_env == "production"


def test_local_defaults_are_safe(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("APP_ENV", "SESSION_SECRET", "OFF_MODE", "APP_URL", "EMAIL_MODE", "SMTP_HOST"):
        monkeypatch.delenv(name, raising=False)
    settings = Settings()

    assert settings.off_mode == "mock"
    assert settings.app_url == "http://localhost:3000"
    # Locally, mail goes to the Mailpit catcher in Compose; nothing leaves the machine.
    assert (settings.email_mode, settings.smtp_host) == ("smtp", "mailpit")


def test_secret_is_not_shown_in_repr() -> None:
    settings = Settings(
        app_env="production",
        session_secret=STRONG_SECRET,
        smtp_host="smtp.eksempel.no",
        smtp_password="smtp-hemmelig",
    )

    assert STRONG_SECRET not in repr(settings)
    assert "smtp-hemmelig" not in repr(settings)


@pytest.mark.parametrize(
    ("email_mode", "smtp_host"), [("mock", "smtp.eksempel.no"), ("smtp", ""), ("smtp", "  ")]
)
def test_production_refuses_a_missing_mail_setup(email_mode: str, smtp_host: str) -> None:
    """Story 1.7: reset mails must not be dropped silently in production (AD-16)."""
    with pytest.raises(ValidationError, match="EMAIL_MODE"):
        Settings(
            app_env="production",
            session_secret=STRONG_SECRET,
            email_mode=email_mode,
            smtp_host=smtp_host,
        )


def test_local_allows_the_mock_mail_adapter() -> None:
    assert Settings(app_env="local", email_mode="mock").email_mode == "mock"


def test_startup_check_refuses_production_with_mock_mail() -> None:
    result = _run_check_config(
        APP_ENV="production", SESSION_SECRET=STRONG_SECRET, EMAIL_MODE="mock"
    )

    assert result.returncode != 0
    assert "EMAIL_MODE" in result.stderr


def _run_check_config(**overrides: str) -> subprocess.CompletedProcess[str]:
    env = {**os.environ, **overrides}
    return subprocess.run(
        [sys.executable, "-m", "app.cli", "check-config"],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )


def test_startup_check_exits_non_zero_on_unsafe_production() -> None:
    result = _run_check_config(APP_ENV="production", SESSION_SECRET="")

    assert result.returncode != 0
    assert "SESSION_SECRET" in result.stderr


def test_startup_check_names_the_invalid_variable() -> None:
    result = _run_check_config(APP_ENV="prod")

    assert result.returncode != 0
    assert "APP_ENV" in result.stderr
    assert "prod'" not in result.stderr


def test_startup_check_passes_locally() -> None:
    result = _run_check_config(APP_ENV="local", SESSION_SECRET=DEFAULT_SESSION_SECRET)

    assert result.returncode == 0


# The seed (local only, once) is tested against the test database in tests/food/test_seed.py.
