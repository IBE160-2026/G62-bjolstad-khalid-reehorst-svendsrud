import os
import subprocess
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.settings import DEFAULT_SESSION_SECRET, Settings
from app.seed.seed import seed_if_empty

BACKEND_DIR = Path(__file__).resolve().parent.parent


@pytest.mark.parametrize("secret", ["", "   ", DEFAULT_SESSION_SECRET])
def test_production_refuses_empty_or_default_secret(secret: str) -> None:
    with pytest.raises(ValidationError, match="SESSION_SECRET"):
        Settings(app_env="production", session_secret=secret)


def test_production_accepts_strong_secret() -> None:
    settings = Settings(app_env="production", session_secret="a-long-random-production-secret")

    assert settings.app_env == "production"


def test_local_defaults_are_safe(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("APP_ENV", "SESSION_SECRET", "OFF_MODE", "APP_URL"):
        monkeypatch.delenv(name, raising=False)
    settings = Settings()

    assert settings.off_mode == "mock"
    assert settings.app_url == "http://localhost:3000"


def test_secret_is_not_shown_in_repr() -> None:
    settings = Settings(app_env="production", session_secret="a-long-random-production-secret")

    assert "a-long-random-production-secret" not in repr(settings)


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


def test_seed_runs_only_locally() -> None:
    assert seed_if_empty(Settings(app_env="local")) is True
    assert seed_if_empty(Settings(app_env="production", session_secret="strong-secret-x")) is False
