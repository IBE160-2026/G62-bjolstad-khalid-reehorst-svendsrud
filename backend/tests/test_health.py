from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_migrations_ran_on_separate_test_database(db_session: Session) -> None:
    database = db_session.execute(text("SELECT current_database()")).scalar_one()
    version = db_session.execute(text("SELECT version_num FROM alembic_version")).scalar_one()

    assert database.endswith("_test")
    assert version == "0001"
