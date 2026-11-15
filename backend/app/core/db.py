"""Synchronous SQLAlchemy engine and one session per request (AD-13)."""

from collections.abc import Iterator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.settings import get_settings


class Base(DeclarativeBase):
    """Declarative base for all models; Alembic reads its metadata."""


@lru_cache
def get_engine() -> Engine:
    return create_engine(get_settings().database_url, pool_pre_ping=True)


@lru_cache
def get_session_factory() -> sessionmaker[Session]:
    """Session factory; also a dependency, so tests override it with the test database."""
    return sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False)


def get_db(
    factory: Annotated[sessionmaker[Session], Depends(get_session_factory)],
) -> Iterator[Session]:
    """Yield one session per request, committed once if the request succeeds.

    Use it through `DbSession`: its function scope runs the commit after the path
    operation returns but before the response is sent, so a failed commit becomes a
    500 error envelope instead of a 2xx with nothing stored.
    """
    session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


DbSession = Annotated[Session, Depends(get_db, scope="function")]
