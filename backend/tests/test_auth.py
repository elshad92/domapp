"""
Tests for auth endpoints:
  POST /api/v1/auth/register
  POST /api/v1/auth/login
  POST /api/v1/auth/refresh
"""

from __future__ import annotations

import jwt
from fastapi.testclient import TestClient

from backend.auth import JWT_ALGORITHM, JWT_SECRET


class TestRegister:
    def test_successful_registration(self, client: TestClient, mock_supabase):
        """POST /api/v1/auth/register returns token + company_id + company_name."""
        mock_supabase._builder._results = [
            None,  # first execute: no existing company
            [{"id": 42, "name": "NewCo", "email": "new@test.com",
              "phone": "+998901234567", "plan": "basic"}],  # second execute: insert result
        ]

        payload = {
            "name": "NewCo",
            "phone": "+998901234567",
            "email": "new@test.com",
            "password": "securepass123",
        }
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "token" in body
        assert body["company_id"] == 42
        assert body["company_name"] == "NewCo"

    def test_duplicate_email(self, client: TestClient, mock_supabase):
        """POST /api/v1/auth/register returns 400 when email already exists."""
        mock_supabase._builder._results = [
            [{"id": 1}],  # existing company found
        ]

        payload = {
            "name": "Dupe",
            "phone": "+998901234567",
            "email": "existing@test.com",
            "password": "pass123",
        }
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 400
        assert "зарегистрирован" in resp.text


class TestLogin:
    def test_successful_login(self, client: TestClient, mock_supabase):
        """POST /api/v1/auth/login returns token for valid credentials."""
        from passlib.hash import pbkdf2_sha256

        hashed = pbkdf2_sha256.hash("correctpassword")

        mock_supabase._builder._results = [
            {"id": 1, "name": "TestCo", "email": "test@test.com",
             "password_hash": hashed, "plan": "basic"},
        ]

        payload = {"email": "test@test.com", "password": "correctpassword"}
        resp = client.post("/api/v1/auth/login", json=payload)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "token" in body
        assert body["company_id"] == 1
        assert body["company_name"] == "TestCo"

    def test_invalid_password(self, client: TestClient, mock_supabase):
        """POST /api/v1/auth/login returns 401 for wrong password."""
        from passlib.hash import pbkdf2_sha256

        hashed = pbkdf2_sha256.hash("correctpassword")

        mock_supabase._builder._results = [
            {"id": 1, "name": "TestCo", "email": "test@test.com",
             "password_hash": hashed, "plan": "basic"},
        ]

        payload = {"email": "test@test.com", "password": "wrongpassword"}
        resp = client.post("/api/v1/auth/login", json=payload)
        assert resp.status_code == 401

    def test_nonexistent_email(self, client: TestClient, mock_supabase):
        """POST /api/v1/auth/login returns 401 for unknown email."""
        mock_supabase._builder._results = [None]

        payload = {"email": "nobody@test.com", "password": "anypass"}
        resp = client.post("/api/v1/auth/login", json=payload)
        assert resp.status_code == 401


class TestRefresh:
    def test_successful_refresh(self, client: TestClient):
        """POST /api/v1/auth/refresh returns a new access token."""
        import uuid
        from datetime import datetime, timedelta, timezone

        refresh_payload = {
            "company_id": 1,
            "type": "refresh",
            "jti": str(uuid.uuid4()),
            "exp": datetime.now(timezone.utc) + timedelta(days=1),
        }
        refresh_token = jwt.encode(refresh_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

    def test_refresh_with_access_token_fails(self, client: TestClient):
        """POST /api/v1/auth/refresh returns 401 when using an access token."""
        import uuid
        from datetime import datetime, timedelta, timezone

        access_payload = {
            "company_id": 1,
            "type": "access",
            "jti": str(uuid.uuid4()),
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        access_token = jwt.encode(access_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        resp = client.post("/api/v1/auth/refresh", json={"refresh_token": access_token})
        assert resp.status_code == 401
