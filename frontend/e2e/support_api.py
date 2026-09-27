"""Isolated browser-test API. Never import this module in a deployed server."""
import os
import tempfile
import atexit
from pathlib import Path
os.environ["OPENAI_API_KEY"] = ""
os.environ["CORS_ORIGINS"] = '["http://127.0.0.1:3100"]'
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app import auth
from app.auth import Identity
from app.db import Base, get_db
from app.main import app
temp = tempfile.TemporaryDirectory(prefix="ma-doh-e2e-")
atexit.register(temp.cleanup)
engine = create_engine(f"sqlite:///{Path(temp.name) / 'test.db'}", connect_args={"check_same_thread": False})
Base.metadata.create_all(engine)
def database():
    with Session(engine, expire_on_commit=False) as session:
        yield session
def verify(token):
    if token != "browser-test-token":
        raise HTTPException(401, "Invalid test token")
    return Identity(id="11111111-1111-4111-8111-111111111111", name="Test User")
app.dependency_overrides[get_db] = database
auth.verify_access_token = verify
