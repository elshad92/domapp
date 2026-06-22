"""
Tests for apartments endpoints:
  GET    /api/v1/apartments
  POST   /api/v1/apartments
  PATCH  /api/v1/apartments/{id}
  DELETE /api/v1/apartments/{id}
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


class TestListApartments:
    def test_list_apartments(self, client: TestClient, auth_headers, mock_supabase):
        """GET /api/v1/apartments returns a list of apartments."""
        mock_supabase._builder._results = [
            # first execute: buildings for company
            [{"id": 1}, {"id": 2}],
            # second execute: apartments in those buildings (ordered)
            [
                {"id": 10, "building_id": 1, "number": "1", "floor": 1},
                {"id": 11, "building_id": 1, "number": "2", "floor": 1},
                {"id": 20, "building_id": 2, "number": "1", "floor": 2},
            ],
        ]

        resp = client.get("/api/v1/apartments", headers=auth_headers)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 3

    def test_list_apartments_no_buildings(self, client: TestClient, auth_headers, mock_supabase):
        """GET /api/v1/apartments returns [] when company has no buildings."""
        mock_supabase._builder._results = [[]]  # no buildings

        resp = client.get("/api/v1/apartments", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_apartments_no_auth(self, client: TestClient):
        """GET /api/v1/apartments without token returns 401."""
        resp = client.get("/api/v1/apartments")
        assert resp.status_code == 401

    def test_list_apartments_filter_by_building(self, client: TestClient, auth_headers, mock_supabase):
        """GET /api/v1/apartments?building_id=... filters by building."""
        mock_supabase._builder._results = [
            # first execute: check building exists
            {"id": 1},
            # second execute: apartments in that building
            [
                {"id": 10, "building_id": 1, "number": "1", "floor": 1},
            ],
        ]

        resp = client.get("/api/v1/apartments?building_id=1", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["building_id"] == 1


class TestCreateApartment:
    def test_create_apartment(self, client: TestClient, auth_headers, mock_supabase):
        """POST /api/v1/apartments creates a new apartment."""
        mock_supabase._builder._results = [
            # first execute: check building exists
            {"id": 1},
            # second execute: insert returns new apartment
            [{"id": 100, "building_id": 1, "number": "5", "floor": 3}],
        ]

        payload = {"building_id": 1, "number": "5", "floor": 3}
        resp = client.post("/api/v1/apartments", json=payload, headers=auth_headers)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["id"] == 100
        assert body["number"] == "5"

    def test_create_apartment_building_not_found(self, client: TestClient, auth_headers, mock_supabase):
        """POST /api/v1/apartments with non-existent building returns 403."""
        mock_supabase._builder._results = [None]  # building not found

        payload = {"building_id": 999, "number": "1", "floor": 1}
        resp = client.post("/api/v1/apartments", json=payload, headers=auth_headers)
        assert resp.status_code == 403


class TestUpdateApartment:
    def test_update_apartment(self, client: TestClient, auth_headers, mock_supabase):
        """PATCH /api/v1/apartments/{id} updates an apartment."""
        mock_supabase._builder._results = [
            [{"id": 10, "building_id": 1, "number": "5A", "floor": 3}]
        ]

        payload = {"number": "5A"}
        resp = client.patch("/api/v1/apartments/10", json=payload, headers=auth_headers)
        assert resp.status_code == 200, resp.text
        assert resp.json()["number"] == "5A"

    def test_update_apartment_not_found(self, client: TestClient, auth_headers, mock_supabase):
        """PATCH /api/v1/apartments/{id} on non-existent returns 404."""
        mock_supabase._builder._results = [[]]  # empty result = not found

        payload = {"number": "X"}
        resp = client.patch("/api/v1/apartments/999", json=payload, headers=auth_headers)
        assert resp.status_code == 404

    def test_update_apartment_no_fields(self, client: TestClient, auth_headers, mock_supabase):
        """PATCH /api/v1/apartments/{id} with empty body returns 400."""
        resp = client.patch("/api/v1/apartments/1", json={}, headers=auth_headers)
        assert resp.status_code == 400


class TestDeleteApartment:
    def test_delete_apartment(self, client: TestClient, auth_headers, mock_supabase):
        """DELETE /api/v1/apartments/{id} deletes an apartment."""
        mock_supabase._builder._results = [
            [{"id": 10}]  # deleted apartment returned
        ]

        resp = client.delete("/api/v1/apartments/10", headers=auth_headers)
        assert resp.status_code == 200, resp.text
        assert resp.json() == {"ok": True}

    def test_delete_apartment_not_found(self, client: TestClient, auth_headers, mock_supabase):
        """DELETE /api/v1/apartments/{id} on non-existent returns 404."""
        mock_supabase._builder._results = [[]]  # empty = not found

        resp = client.delete("/api/v1/apartments/999", headers=auth_headers)
        assert resp.status_code == 404
