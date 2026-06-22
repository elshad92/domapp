"""
DomApp — pytest fixtures for backend tests.

All tests use mocks — no real Supabase calls.
"""

from __future__ import annotations

import os
from unittest.mock import patch

import jwt
import pytest
from fastapi.testclient import TestClient

# Set test env vars BEFORE importing the app
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-pytest")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-service-key")
os.environ.setdefault("PAYME_KEY", "test-payme-key")
os.environ.setdefault("INTERNAL_API_KEY", "test-internal-key")

from backend.main import app
from backend.auth import JWT_SECRET, JWT_ALGORITHM


@pytest.fixture
def client():
    """TestClient for the FastAPI app."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_headers():
    """Generate a valid JWT access token and return Authorization headers."""
    import uuid
    from datetime import datetime, timedelta, timezone

    payload = {
        "company_id": 1,
        "company_name": "Test Company",
        "type": "access",
        "jti": str(uuid.uuid4()),
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"Authorization": f"Bearer {token}"}


class MockQueryResult:
    """Wrapper that mimics QueryResult with a .data attribute."""

    def __init__(self, data):
        self.data = data


class MockQueryBuilder:
    """
    A chainable mock query builder.

    Each call to .execute() returns the next result from `_results` list.
    If `_results` is empty or exhausted, returns MockQueryResult(data=[]).
    """

    def __init__(self):
        self._results: list | None = None
        self._result_index = 0

    def select(self, query="*"):
        return self

    def eq(self, column, value):
        return self

    def in_(self, column, values):
        return self

    def gte(self, column, value):
        return self

    def lte(self, column, value):
        return self

    def order(self, column, desc=False):
        return self

    def limit(self, n):
        return self

    def maybe_single(self):
        return self

    def single(self):
        return self

    def insert(self, data):
        return self

    def update(self, data):
        return self

    def delete(self):
        return self

    def execute(self):
        if self._results is not None and self._result_index < len(self._results):
            result = self._results[self._result_index]
            self._result_index += 1
            return MockQueryResult(result)
        return MockQueryResult(data=[])


class MockSupabaseClient:
    """
    A mock Supabase client that returns a MockQueryBuilder for any table.
    """

    def __init__(self):
        self._builder = MockQueryBuilder()

    def table(self, name):
        return self._builder


# All modules that import `get_supabase` via `from backend.db import get_supabase`
_PATCH_TARGETS = [
    "backend.routers.auth",
    "backend.routers.buildings",
    "backend.routers.apartments",
    "backend.routers.payments",
    "backend.routers.reports",
    "backend.routers.announcements",
    "backend.routers.companies",
    "backend.routers.employees",
    "backend.routers.requests",
    "backend.routers.residents",
    "backend.routers.tenants",
]


@pytest.fixture
def mock_supabase():
    """
    Mock `get_supabase()` in ALL router modules that import it.

    Returns a MockSupabaseClient. Tests set
    `mock_supabase._builder._results = [...]` to control sequential
    execute() return values.
    """
    client_obj = MockSupabaseClient()

    # Patch in backend.db (the source)
    patchers = [patch("backend.db.get_supabase", return_value=client_obj)]

    # Patch in every router module that does `from backend.db import get_supabase`
    for target in _PATCH_TARGETS:
        patchers.append(patch(f"{target}.get_supabase", return_value=client_obj))

    for p in patchers:
        p.start()

    yield client_obj

    for p in patchers:
        p.stop()
