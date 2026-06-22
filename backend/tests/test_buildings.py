"""
Tests for buildings endpoints:
  GET    /api/v1/buildings
  POST   /api/v1/buildings
  PATCH  /api/v1/buildings/{id}
  DELETE /api/v1/buildings/{id}
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


class TestListBuildings:
    def test_list_buildings(self, client: TestClient, auth_headers, mock_supabase):
        """GET /api/v1/buildings returns a list of buildings."""
        mock_supabase._builder._results = [
            [
                {"id": 1, "company_id": 1, "address": "ул. Пушкина, 10",
                 "district": "Мирабадский", "floors": 5, "apartments_count": 20},
                {"id": 2, "company_id": 1, "address": "ул. Лермонтова, 5",
                 "district": "Чиланзарский", "floors": 9, "apartments_count": 36},
            ]
        ]

        resp = client.get("/api/v1/buildings", headers=auth_headers)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["address"] == "ул. Пушкина, 10"

    def test_list_buildings_no_auth(self, client: TestClient):
        """GET /api/v1/buildings without token returns 401."""
        resp = client.get("/api/v1/buildings")
        assert resp.status_code == 401

    def test_list_buildings_filter_by_district(self, client: TestClient, auth_headers, mock_supabase):
        """GET /api/v1/buildings?district=... filters results."""
        mock_supabase._builder._results = [
            [
                {"id": 1, "company_id": 1, "address": "ул. Пушкина, 10",
                 "district": "Мирабадский", "floors": 5, "apartments_count": 20},
            ]
        ]

        resp = client.get("/api/v1/buildings?district=Мирабадский", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert all(b["district"] == "Мирабадский" for b in data)


class TestCreateBuilding:
    def test_create_building(self, client: TestClient, auth_headers, mock_supabase):
        """POST /api/v1/buildings creates a new building."""
        mock_supabase._builder._results = [
            [{"id": 10, "company_id": 1, "address": "ул. Новая, 1",
              "district": "Юнусабадский", "floors": 7, "apartments_count": 28}]
        ]

        payload = {
            "address": "ул. Новая, 1",
            "district": "Юнусабадский",
            "floors": 7,
            "apartments_count": 28,
        }
        resp = client.post("/api/v1/buildings", json=payload, headers=auth_headers)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["id"] == 10
        assert body["address"] == "ул. Новая, 1"

    def test_create_building_invalid_district(self, client: TestClient, auth_headers, mock_supabase):
        """POST /api/v1/buildings with invalid district returns 400."""
        payload = {
            "address": "ул. Фейковая, 1",
            "district": "Несуществующий",
            "floors": 3,
            "apartments_count": 10,
        }
        resp = client.post("/api/v1/buildings", json=payload, headers=auth_headers)
        assert resp.status_code == 400
        assert "Invalid district" in resp.text


class TestUpdateBuilding:
    def test_update_building(self, client: TestClient, auth_headers, mock_supabase):
        """PATCH /api/v1/buildings/{id} updates an existing building."""
        mock_supabase._builder._results = [
            # first execute: check building exists (maybe_single)
            {"id": 1, "company_id": 1, "address": "ул. Старая, 1",
             "district": "Мирабадский", "floors": 5, "apartments_count": 20},
            # second execute: update returns new data
            [{"id": 1, "company_id": 1, "address": "ул. Обновлённая, 1",
              "district": "Мирабадский", "floors": 6, "apartments_count": 24}],
        ]

        payload = {
            "address": "ул. Обновлённая, 1",
            "district": "Мирабадский",
            "floors": 6,
            "apartments_count": 24,
        }
        resp = client.patch("/api/v1/buildings/1", json=payload, headers=auth_headers)
        assert resp.status_code == 200, resp.text
        assert resp.json()["floors"] == 6

    def test_update_nonexistent_building(self, client: TestClient, auth_headers, mock_supabase):
        """PATCH /api/v1/buildings/{id} on non-existent returns 404."""
        mock_supabase._builder._results = [None]  # building not found

        payload = {
            "address": "ул. Нет, 0",
            "district": "Мирабадский",
            "floors": 1,
            "apartments_count": 1,
        }
        resp = client.patch("/api/v1/buildings/999", json=payload, headers=auth_headers)
        assert resp.status_code == 404


class TestDeleteBuilding:
    def test_delete_building(self, client: TestClient, auth_headers, mock_supabase):
        """DELETE /api/v1/buildings/{id} deletes a building."""
        mock_supabase._builder._results = [
            # first execute: check building exists
            {"id": 1, "company_id": 1},
            # second execute: check no apartments
            [],
        ]

        resp = client.delete("/api/v1/buildings/1", headers=auth_headers)
        assert resp.status_code == 200, resp.text
        assert resp.json() == {"ok": True}

    def test_delete_building_with_apartments(self, client: TestClient, auth_headers, mock_supabase):
        """DELETE /api/v1/buildings/{id} with existing apartments returns 400."""
        mock_supabase._builder._results = [
            # first execute: check building exists
            {"id": 1, "company_id": 1},
            # second execute: apartments found
            [{"id": 100}],
        ]

        resp = client.delete("/api/v1/buildings/1", headers=auth_headers)
        assert resp.status_code == 400
        assert "Cannot delete building" in resp.text

    def test_delete_nonexistent_building(self, client: TestClient, auth_headers, mock_supabase):
        """DELETE /api/v1/buildings/{id} on non-existent returns 404."""
        mock_supabase._builder._results = [None]

        resp = client.delete("/api/v1/buildings/999", headers=auth_headers)
        assert resp.status_code == 404
