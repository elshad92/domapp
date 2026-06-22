"""
Tests for payments endpoints:
  GET  /api/v1/payments          (auth required)
  POST /api/v1/payments/webhook  (Basic auth via PAYME_KEY)
"""

from __future__ import annotations

import base64
import time

from fastapi.testclient import TestClient


class TestListPayments:
    def test_list_payments(self, client: TestClient, auth_headers, mock_supabase):
        """GET /api/v1/payments returns a list of payments."""
        mock_supabase._builder._results = [
            # 1. buildings for company
            [{"id": 1}],
            # 2. apartments in building
            [{"id": 10}, {"id": 11}],
            # 3. residents in apartments
            [{"id": 100, "name": "Иван"}, {"id": 101, "name": "Пётр"}],
            # 4. payments for residents (ordered, limited)
            [
                {"id": 1, "resident_id": 100, "amount": "150000.00", "period": "2026-06",
                 "status": "paid", "payme_transaction_id": None, "paid_at": None,
                 "created_at": "2026-06-01T10:00:00"},
                {"id": 2, "resident_id": 101, "amount": "150000.00", "period": "2026-06",
                 "status": "pending", "payme_transaction_id": None, "paid_at": None,
                 "created_at": "2026-06-01T10:00:00"},
            ],
        ]

        resp = client.get("/api/v1/payments", headers=auth_headers)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["resident_name"] == "Иван"

    def test_list_payments_no_auth(self, client: TestClient):
        """GET /api/v1/payments without token returns 401."""
        resp = client.get("/api/v1/payments")
        assert resp.status_code == 401

    def test_list_payments_no_buildings(self, client: TestClient, auth_headers, mock_supabase):
        """GET /api/v1/payments returns [] when company has no buildings."""
        mock_supabase._builder._results = [[]]  # no buildings

        resp = client.get("/api/v1/payments", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []


class TestPaymeWebhook:
    def _basic_auth_header(self) -> dict:
        """Generate a valid Basic auth header for Payme."""
        token = base64.b64encode(b"Paycom:test-payme-key").decode("utf-8")
        return {"Authorization": f"Basic {token}"}

    def test_check_perform_transaction(self, client: TestClient, mock_supabase):
        """POST /api/v1/payments/webhook — CheckPerformTransaction returns allow."""
        mock_supabase._builder._results = [
            # _find_by_account: payment found
            {"id": 1, "resident_id": 42, "period": "2026-06",
             "amount": "150000.00", "status": "pending"},
        ]

        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "CheckPerformTransaction",
            "params": {
                "amount": 15000000,  # 150000.00 * 100
                "account": {"resident_id": "42", "period": "2026-06"},
            },
        }
        resp = client.post("/api/v1/payments/webhook",
                           json=payload, headers=self._basic_auth_header())
        assert resp.status_code == 200, resp.text
        assert resp.json()["result"]["allow"] is True

    def test_create_transaction(self, client: TestClient, mock_supabase):
        """POST /api/v1/payments/webhook — CreateTransaction creates a transaction."""
        mock_supabase._builder._results = [
            # 1. _find_by_tx: no existing transaction
            None,
            # 2. _find_by_account: payment found
            {"id": 1, "resident_id": 42, "period": "2026-06",
             "amount": "150000.00", "status": "pending"},
            # 3. update result
            [{"id": 1, "payme_transaction_id": "txn_001"}],
        ]

        payload = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "CreateTransaction",
            "params": {
                "id": "txn_001",
                "time": int(time.time() * 1000),
                "amount": 15000000,
                "account": {"resident_id": "42", "period": "2026-06"},
            },
        }
        resp = client.post("/api/v1/payments/webhook",
                           json=payload, headers=self._basic_auth_header())
        assert resp.status_code == 200, resp.text
        assert "create_time" in resp.json()["result"]
        assert resp.json()["result"]["state"] == 1  # STATE_CREATED

    def test_webhook_unauthorized(self, client: TestClient):
        """POST /api/v1/payments/webhook without auth returns 401."""
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "CheckPerformTransaction",
            "params": {"amount": 10000, "account": {"resident_id": "1", "period": "2026-06"}},
        }
        resp = client.post("/api/v1/payments/webhook", json=payload)
        assert resp.status_code == 401

    def test_webhook_wrong_auth(self, client: TestClient):
        """POST /api/v1/payments/webhook with wrong Basic auth returns 401."""
        wrong_token = base64.b64encode(b"Paycom:wrong-key").decode("utf-8")
        headers = {"Authorization": f"Basic {wrong_token}"}

        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "CheckPerformTransaction",
            "params": {"amount": 10000, "account": {"resident_id": "1", "period": "2026-06"}},
        }
        resp = client.post("/api/v1/payments/webhook", json=payload, headers=headers)
        assert resp.status_code == 401

    def test_perform_transaction(self, client: TestClient, mock_supabase):
        """POST /api/v1/payments/webhook — PerformTransaction marks payment as paid."""
        mock_supabase._builder._results = [
            # _find_by_tx: payment found
            {"id": 1, "resident_id": 42, "period": "2026-06",
             "amount": "150000.00", "status": "pending",
             "payme_transaction_id": "txn_001"},
            # update result
            [{"id": 1, "status": "paid"}],
        ]

        payload = {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "PerformTransaction",
            "params": {"id": "txn_001"},
        }
        resp = client.post("/api/v1/payments/webhook",
                           json=payload, headers=self._basic_auth_header())
        assert resp.status_code == 200, resp.text
        assert resp.json()["result"]["state"] == 2  # STATE_PERFORMED
