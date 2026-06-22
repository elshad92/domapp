"""
Tests for reports endpoints:
  GET /api/v1/reports — download PDF report (auth required)
"""

from __future__ import annotations

from fastapi.testclient import TestClient


class TestDownloadReport:
    def test_download_report_pdf(self, client: TestClient, auth_headers, mock_supabase):
        """GET /api/v1/reports returns a PDF file."""
        mock_supabase._builder._results = [
            # 1. company info (maybe_single)
            {"id": 1, "name": "TestCo", "email": "test@test.com", "phone": "+998901234567"},
            # 2. building IDs
            [{"id": 1}],
            # 3. buildings data (in_)
            [{"id": 1, "address": "ул. Пушкина, 10", "district": "Мирабадский",
              "floors": 5, "apartments_count": 20}],
            # 4. requests (ordered)
            [
                {"id": 1, "building_id": 1, "category": "сантехника", "status": "done",
                 "created_at": "2026-06-01T10:00:00Z"},
                {"id": 2, "building_id": 1, "category": "электрика", "status": "new",
                 "created_at": "2026-06-02T10:00:00Z"},
            ],
        ]

        resp = client.get("/api/v1/reports", headers=auth_headers)
        assert resp.status_code == 200, resp.text
        assert resp.headers.get("content-type") == "application/pdf"
        assert "attachment" in resp.headers.get("content-disposition", "")
        assert resp.content  # non-empty PDF bytes

    def test_download_report_no_auth(self, client: TestClient):
        """GET /api/v1/reports without token returns 401."""
        resp = client.get("/api/v1/reports")
        assert resp.status_code == 401

    def test_download_report_empty(self, client: TestClient, auth_headers, mock_supabase):
        """GET /api/v1/reports returns a PDF even with no data."""
        mock_supabase._builder._results = [
            # 1. company info
            {"id": 1, "name": "EmptyCo", "email": "", "phone": ""},
            # 2. building IDs (empty)
            [],
            # 3. requests (empty)
            [],
        ]

        resp = client.get("/api/v1/reports", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.headers.get("content-type") == "application/pdf"
        assert resp.content
