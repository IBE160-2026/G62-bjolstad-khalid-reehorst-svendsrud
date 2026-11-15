"""Shared fixtures. Tests run against TEST_DATABASE_URL, never DATABASE_URL."""

from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, make_url, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, sessionmaker

from app.core.db import get_session_factory
from app.core.settings import get_settings
from app.main import create_app

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _reset_schema(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))


@pytest.fixture(scope="session")
def test_engine() -> Iterator[Engine]:
    """Create the schema on the test database with Alembic, and drop it afterwards."""
    settings = get_settings()
    test_db = make_url(settings.test_database_url).database or ""
    app_db = make_url(settings.database_url).database or ""
    # The schema is dropped below, so never touch anything but a dedicated *_test database.
    if test_db == app_db or not test_db.endswith("_test"):
        pytest.exit(
            f"TEST_DATABASE_URL must point at a separate database ending in '_test' "
            f"(got {test_db!r}, app database {app_db!r}).",
            returncode=2,
        )

    engine = create_engine(settings.test_database_url)
    try:
        with engine.connect():
            pass
    except OperationalError:
        pytest.exit(
            f"Fant ikke testdatabasen {test_db!r} / cannot connect to test database "
            f"{test_db!r}. Den opprettes bare når db-volumet lages første gang: kjør "
            "`docker compose down -v` én gang og start på nytt (run it once, then restart).",
            returncode=2,
        )
    _reset_schema(engine)
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.attributes["database_url"] = settings.test_database_url
    command.upgrade(config, "head")
    yield engine
    _reset_schema(engine)
    engine.dispose()


@pytest.fixture
def db_session(test_engine: Engine) -> Iterator[Session]:
    session = sessionmaker(bind=test_engine, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def _truncate_tables(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE users, sessions CASCADE"))


@pytest.fixture
def test_session_factory(test_engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)


@pytest.fixture
def app(test_engine: Engine, test_session_factory: sessionmaker[Session]) -> Iterator[FastAPI]:
    """The real app and the real get_db; only the session factory points at the test DB."""
    application = create_app()
    application.dependency_overrides[get_session_factory] = lambda: test_session_factory
    yield application
    application.dependency_overrides.clear()
    _truncate_tables(test_engine)


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    """Acts like the browser on APP_URL: every request carries a matching Origin."""
    # Do not re-raise server errors so the 500 envelope can be asserted.
    with TestClient(
        app,
        headers={"Origin": get_settings().app_url},
        raise_server_exceptions=False,
    ) as test_client:
        yield test_client


@pytest.fixture
def bare_client(app: FastAPI) -> Iterator[TestClient]:
    """A client that sends no Origin header unless a test adds one."""
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
