from typing import Annotated
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import User

bearer = HTTPBearer(
    auto_error=False,
    description="Supabase Auth session access_token (not a publishable or service-role key).",
)


class Identity(BaseModel):
    id: UUID
    name: str


def auth_client():
    return httpx.Client(timeout=10, follow_redirects=False)


def verify_access_token(token: str) -> Identity:
    """Validate with Supabase Auth; works with both asymmetric and legacy keys.

    Never trust identity decoded from an unverified JWT. No service-role key,
    JWT signing secret, password, or refresh token is needed by the backend.
    """
    config = settings()
    if not config.supabase_url or not config.supabase_publishable_key:
        raise HTTPException(
            503, "Authentication is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY."
        )
    try:
        with auth_client() as client:
            response = client.get(
                f"{config.supabase_url.rstrip('/')}/auth/v1/user",
                headers={
                    "apikey": config.supabase_publishable_key,
                    "Authorization": f"Bearer {token}",
                },
            )
    except httpx.HTTPError:
        raise HTTPException(503, "Authentication service is temporarily unreachable.") from None
    if response.status_code in (401, 403):
        raise HTTPException(
            401, "Invalid or expired Supabase access token.", headers={"WWW-Authenticate": "Bearer"}
        )
    if response.status_code != 200:
        raise HTTPException(503, "Authentication service is temporarily unavailable.")
    try:
        data = response.json()
        if data.get("role") != "authenticated":
            raise ValueError("User session required")
        metadata = data.get("user_metadata") or {}
        name = metadata.get("display_name") or metadata.get("full_name") or "Ma-Doh user"
        return Identity(id=UUID(data["id"]), name=str(name)[:120])
    except (ValueError, KeyError, TypeError, AttributeError):
        raise HTTPException(401, "A valid Supabase user session is required.") from None


def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if not credentials:
        raise HTTPException(
            401, "A Supabase access token is required.", headers={"WWW-Authenticate": "Bearer"}
        )
    identity = verify_access_token(credentials.credentials)
    user = db.get(User, str(identity.id))
    if user is None:
        user = User(id=str(identity.id), name=identity.name)
        db.add(user)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            user = db.get(User, str(identity.id))
            if user is None:
                raise HTTPException(
                    503, "Could not initialize your profile. Retry the request."
                ) from None
    return user
