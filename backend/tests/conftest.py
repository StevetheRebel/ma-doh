import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app import auth
from app.config import settings
from app.db import Base, get_db
from app.main import app


@pytest.fixture
def db_engine():
    # Postgres test database must be disposable. SQLite is the quick offline fallback.
    url = os.getenv("TEST_DATABASE_URL", "sqlite://")
    if url.startswith("sqlite"):
        engine = create_engine(url, connect_args={"check_same_thread": False}, poolclass=StaticPool)

        @event.listens_for(engine, "connect")
        def foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
    else:
        if not url.rsplit("/", 1)[-1].split("?", 1)[0].endswith("_test"):
            raise RuntimeError("Use a disposable database whose name ends in _test.")
        engine = create_engine(url)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def client(db_engine, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "test-publishable-key")
    settings.cache_clear()

    def db_override():
        with Session(db_engine, expire_on_commit=False) as session:
            yield session

    app.dependency_overrides[get_db] = db_override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    settings.cache_clear()


@pytest.fixture
def users(db_engine, monkeypatch):
    from uuid import uuid4

    from fastapi import HTTPException

    from app.auth import Identity
    from app.models import User

    with Session(db_engine) as db:
        first = User(id=str(uuid4()), name="Amina")
        second = User(id=str(uuid4()), name="Brian")
        db.add_all([first, second])
        db.commit()
        first_token, second_token = "test-amina", "test-brian"
        identities = {
            first_token: Identity(id=first.id, name=first.name),
            second_token: Identity(id=second.id, name=second.name),
        }

        def verify(token):
            if token not in identities:
                raise HTTPException(401, "Invalid token")
            return identities[token]

        monkeypatch.setattr(auth, "verify_access_token", verify)
        return [
            {"id": first.id, "headers": {"Authorization": f"Bearer {first_token}"}},
            {"id": second.id, "headers": {"Authorization": f"Bearer {second_token}"}},
        ]


@pytest.fixture
def account(client, users):
    response = client.post(
        "/accounts",
        headers=users[0]["headers"],
        json={
            "name": "M-Pesa",
            "kind": "mpesa",
            "opening_balance": "1000.00",
            "opening_date": "2020-01-01",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def entry(account):
    return {
        "account_id": account["id"],
        "type": "expense",
        "category": "transport",
        "amount": "120.50",
        "occurred_on": "2026-01-10",
        "description": "Matatu",
    }
