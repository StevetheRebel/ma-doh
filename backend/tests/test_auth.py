from uuid import uuid4

import httpx
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import auth
from app.models import User


def mock_supabase(monkeypatch, handler):
    monkeypatch.setattr(
        auth, "auth_client", lambda: httpx.Client(transport=httpx.MockTransport(handler))
    )


def test_verified_session_creates_profile_once(client, db_engine, monkeypatch):
    id_ = str(uuid4())

    def handler(request):
        assert str(request.url) == "https://example.supabase.co/auth/v1/user"
        assert request.headers["apikey"] == "test-publishable-key"
        assert request.headers["authorization"] == "Bearer valid-session"
        return httpx.Response(
            200,
            json={"id": id_, "role": "authenticated", "user_metadata": {"display_name": "Amina"}},
        )

    mock_supabase(monkeypatch, handler)
    headers = {"Authorization": "Bearer valid-session"}
    for _ in range(2):
        response = client.get("/me", headers=headers)
        assert response.status_code == 200, response.text
        assert response.json()["id"] == id_
        assert response.json()["name"] == "Amina"
    with Session(db_engine) as db:
        assert db.scalar(select(func.count()).select_from(User)) == 1


@pytest.mark.parametrize(
    "status,body,expected",
    [
        (401, {"msg": "expired"}, 401),
        (403, {"msg": "invalid"}, 401),
        (429, {"msg": "slow down"}, 503),
        (500, {"msg": "internal"}, 503),
        (200, {"id": str(uuid4()), "role": "service_role"}, 401),
        (200, {"id": "not-a-uuid", "role": "authenticated"}, 401),
        (200, {"id": str(uuid4())}, 401),
    ],
)
def test_invalid_auth_never_creates_users(client, db_engine, monkeypatch, status, body, expected):
    mock_supabase(monkeypatch, lambda request: httpx.Response(status, json=body))
    response = client.get("/me", headers={"Authorization": "Bearer untrusted"})
    assert response.status_code == expected
    with Session(db_engine) as db:
        assert db.scalar(select(func.count()).select_from(User)) == 0


def test_auth_network_error_fails_closed(client, monkeypatch):
    def fail(request):
        raise httpx.ConnectError("network unavailable", request=request)

    mock_supabase(monkeypatch, fail)
    assert client.get("/me", headers={"Authorization": "Bearer token"}).status_code == 503
