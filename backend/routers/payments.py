"""
Payme JSON-RPC webhook + payment list endpoint.
Поддерживает: CheckPerformTransaction, CreateTransaction, PerformTransaction,
CancelTransaction, CheckTransaction, GetStatement
"""

from __future__ import annotations

import base64
import hmac
import logging
import os
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from backend.auth import get_current_company
from backend.db import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(tags=["payments"])

M_CHECK_PERFORM = "CheckPerformTransaction"
M_CREATE = "CreateTransaction"
M_PERFORM = "PerformTransaction"
M_CANCEL = "CancelTransaction"
M_CHECK = "CheckTransaction"
M_STATEMENT = "GetStatement"

STATE_CREATED = 1
STATE_PERFORMED = 2
STATE_CANCELLED = -1
STATE_CANCELLED_AFTER_PERFORM = -2

ERR_INVALID_AMOUNT = -31001
ERR_TX_NOT_FOUND = -31003
ERR_ALREADY_PAID = -31099
ERR_ORDER_NOT_FOUND = -31050
ERR_METHOD_NOT_FOUND = -32601
ERR_CANT_CANCEL = -31007
ERR_INVALID_ACCOUNT = -31051
ERR_TIMEOUT = -31008


def _verify_auth(authorization: str) -> bool:
    expected_key = os.getenv("PAYME_KEY", "")
    if not expected_key or expected_key.startswith("CHANGE_ME_"):
        logger.error("PAYME_KEY is not configured")
        return False
    try:
        scheme, credentials = authorization.split(" ", 1)
        if scheme.lower() != "basic":
            return False
        decoded = base64.b64decode(credentials).decode("utf-8")
        username, password = decoded.split(":", 1)
        return username == "Paycom" and hmac.compare_digest(password, expected_key)
    except Exception:
        return False


def _ok(result: dict, req_id=None) -> dict:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def _err(code: int, msg: str, req_id=None) -> dict:
    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": code, "message": {"ru": msg, "uz": msg, "en": msg}},
    }


def _now_ms() -> int:
    return int(time.time() * 1000)


def _to_ms(iso_str: str) -> int:
    if not iso_str:
        return 0
    try:
        return int(datetime.fromisoformat(iso_str.replace("Z", "+00:00")).timestamp() * 1000)
    except (ValueError, TypeError):
        return 0


def _validate_account(account: dict) -> tuple[int | None, str | None]:
    """Проверить account и вернуть (resident_id, period)."""
    rid = account.get("resident_id")
    period = account.get("period")
    if not rid:
        return None, None
    try:
        rid = int(rid)
    except (ValueError, TypeError):
        return None, None
    if not period or not isinstance(period, str) or len(period) != 7:
        return None, None
    return rid, period


def _find_by_account(account: dict):
    rid, period = _validate_account(account)
    if not rid or not period:
        return None
    return (
        get_supabase()
        .table("payments")
        .select("*")
        .eq("resident_id", rid)
        .eq("period", period)
        .maybe_single()
        .execute()
        .data
    )


def _find_by_tx(tx_id: str | None):
    if not tx_id:
        return None
    return (
        get_supabase()
        .table("payments")
        .select("*")
        .eq("payme_transaction_id", tx_id)
        .maybe_single()
        .execute()
        .data
    )


@router.post("/payments/webhook")
async def payme_webhook(
    request: Request,
    authorization: str = Header(default=""),
):
    if not _verify_auth(authorization):
        logger.warning("Payme unauthorized request")
        raise HTTPException(status_code=401, detail="Unauthorized")

    body = await request.json()
    method = body.get("method")
    params = body.get("params", {})
    rid = body.get("id")
    db = get_supabase()

    logger.info("Payme method=%s id=%s", method, rid)

    if method == M_CHECK_PERFORM:
        payment = _find_by_account(params.get("account", {}))
        if not payment:
            return _err(ERR_ORDER_NOT_FOUND, "Order not found", rid)
        if payment["status"] == "paid":
            return _err(ERR_ALREADY_PAID, "Already paid", rid)
        expected_tiyin = int(float(payment["amount"]) * 100)
        if params.get("amount") != expected_tiyin:
            return _err(ERR_INVALID_AMOUNT, f"Expected {expected_tiyin} tiyin", rid)
        return _ok({"allow": True}, rid)

    if method == M_CREATE:
        tx_id = params.get("id")
        amount = params.get("amount", 0)
        create_time = params.get("time", _now_ms())

        # Проверяем timeout (Payme даёт 43 200 000 ms = 12 часов)
        if _now_ms() - create_time > 43_200_000:
            return _err(ERR_TIMEOUT, "Transaction timeout", rid)

        existing = _find_by_tx(tx_id)
        if existing:
            if existing["status"] == "paid":
                return _err(ERR_ALREADY_PAID, "Already paid", rid)
            return _ok(
                {
                    "create_time": existing.get("payme_create_time") or 0,
                    "transaction": str(existing["id"]),
                    "state": STATE_CREATED,
                },
                rid,
            )

        payment = _find_by_account(params.get("account", {}))
        if not payment:
            return _err(ERR_ORDER_NOT_FOUND, "Order not found", rid)
        if payment["status"] == "paid":
            return _err(ERR_ALREADY_PAID, "Already paid", rid)

        expected_tiyin = int(float(payment["amount"]) * 100)
        if amount != expected_tiyin:
            return _err(ERR_INVALID_AMOUNT, f"Expected {expected_tiyin} tiyin", rid)

        now = _now_ms()
        update_result = db.table("payments").update(
            {
                "payme_transaction_id": tx_id,
                "payme_create_time": now,
                "payme_state": STATE_CREATED,
            }
        ).eq("id", payment["id"]).execute()
        if not update_result.data:
            return _err(ERR_TX_NOT_FOUND, "Failed to create transaction", rid)

        return _ok({"create_time": now, "transaction": str(payment["id"]), "state": STATE_CREATED}, rid)

    if method == M_PERFORM:
        tx_id = params.get("id")
        payment = _find_by_tx(tx_id)
        if not payment:
            return _err(ERR_TX_NOT_FOUND, "Transaction not found", rid)

        if payment["status"] == "paid":
            return _ok(
                {
                    "perform_time": _to_ms(payment.get("paid_at")),
                    "transaction": str(payment["id"]),
                    "state": STATE_PERFORMED,
                },
                rid,
            )

        now = _now_ms()
        paid_at = datetime.now(timezone.utc).isoformat()
        update_result = db.table("payments").update(
            {"status": "paid", "paid_at": paid_at, "payme_state": STATE_PERFORMED}
        ).eq("id", payment["id"]).execute()
        if not update_result.data:
            return _err(ERR_TX_NOT_FOUND, "Failed to perform transaction", rid)
        logger.info("Payment performed: id=%s tx=%s", payment["id"], tx_id)
        return _ok({"perform_time": now, "transaction": str(payment["id"]), "state": STATE_PERFORMED}, rid)

    if method == M_CANCEL:
        tx_id = params.get("id")
        reason = params.get("reason")
        payment = _find_by_tx(tx_id)
        if not payment:
            return _err(ERR_TX_NOT_FOUND, "Transaction not found", rid)

        now = _now_ms()
        if payment["status"] == "paid":
            # Отмена после выполнения — особый статус
            update_result = db.table("payments").update(
                {
                    "payme_state": STATE_CANCELLED_AFTER_PERFORM,
                    "payme_cancel_time": now,
                    "payme_cancel_reason": reason,
                }
            ).eq("id", payment["id"]).execute()
            if not update_result.data:
                return _err(ERR_TX_NOT_FOUND, "Failed to cancel transaction", rid)
            return _ok(
                {"cancel_time": now, "transaction": str(payment["id"]), "state": STATE_CANCELLED_AFTER_PERFORM},
                rid,
            )

        update_result = db.table("payments").update(
            {
                "status": "failed",
                "payme_state": STATE_CANCELLED,
                "payme_cancel_time": now,
                "payme_cancel_reason": reason,
            }
        ).eq("id", payment["id"]).execute()
        if not update_result.data:
            return _err(ERR_TX_NOT_FOUND, "Failed to cancel transaction", rid)
        logger.info("Payment cancelled: id=%s tx=%s reason=%s", payment["id"], tx_id, reason)
        return _ok({"cancel_time": now, "transaction": str(payment["id"]), "state": STATE_CANCELLED}, rid)

    if method == M_CHECK:
        tx_id = params.get("id")
        payment = _find_by_tx(tx_id)
        if not payment:
            return _err(ERR_TX_NOT_FOUND, "Transaction not found", rid)

        state_map = {"pending": STATE_CREATED, "paid": STATE_PERFORMED, "failed": STATE_CANCELLED}
        return _ok(
            {
                "create_time": payment.get("payme_create_time") or 0,
                "perform_time": _to_ms(payment.get("paid_at")),
                "cancel_time": payment.get("payme_cancel_time") or 0,
                "transaction": str(payment["id"]),
                "state": state_map.get(payment["status"], STATE_CREATED),
                "reason": payment.get("payme_cancel_reason"),
            },
            rid,
        )

    if method == M_STATEMENT:
        from_ms = params.get("from", 0)
        to_ms = params.get("to", _now_ms())
        from_dt = datetime.fromtimestamp(from_ms / 1000, tz=timezone.utc).isoformat()
        to_dt = datetime.fromtimestamp(to_ms / 1000, tz=timezone.utc).isoformat()

        res = (
            db.table("payments")
            .select("*")
            .eq("status", "paid")
            .gte("paid_at", from_dt)
            .lte("paid_at", to_dt)
            .execute()
        )

        transactions = []
        for payment in res.data or []:
            transactions.append(
                {
                    "id": payment["payme_transaction_id"],
                    "time": payment.get("payme_create_time") or 0,
                    "amount": int(float(payment["amount"]) * 100),
                    "account": {"resident_id": payment["resident_id"], "period": payment["period"]},
                    "create_time": payment.get("payme_create_time") or 0,
                    "perform_time": _to_ms(payment.get("paid_at")),
                    "cancel_time": payment.get("payme_cancel_time") or 0,
                    "transaction": str(payment["id"]),
                    "state": STATE_PERFORMED,
                    "reason": None,
                }
            )
        return _ok({"transactions": transactions}, rid)

    logger.warning("Unknown Payme method=%s", method)
    return _err(ERR_METHOD_NOT_FOUND, f"Method {method} is not supported", rid)


# ============================================================
# Payment list endpoint (for the admin panel frontend)
# ============================================================


@router.get("/payments")
async def list_payments(
    building_id: int | None = None,
    status: str | None = None,
    period: str | None = None,
    limit: int = 100,
    offset: int = 0,
    company: dict = Depends(get_current_company),
):
    """
    Get a list of payments for the current company.
    Supports filtering by building_id, status, and period.
    """
    db = get_supabase()
    company_id = company["company_id"]

    # Get all building IDs for this company
    buildings = db.table("buildings").select("id").eq("company_id", company_id).execute()
    building_ids = [b["id"] for b in (buildings.data or [])]
    if not building_ids:
        return []

    # Get all apartment IDs for those buildings
    apt_query = db.table("apartments").select("id").in_("building_id", building_ids)
    if building_id is not None:
        if building_id not in building_ids:
            raise HTTPException(status_code=403, detail="Building is not available for this company")
        apt_query = db.table("apartments").select("id").eq("building_id", building_id)
    apartments = apt_query.execute()
    apartment_ids = [a["id"] for a in (apartments.data or [])]
    if not apartment_ids:
        return []

    # Get all resident IDs for those apartments
    residents = db.table("residents").select("id, name").in_("apartment_id", apartment_ids).execute()
    resident_map = {r["id"]: r.get("name", "") for r in (residents.data or [])}
    resident_ids = list(resident_map.keys())
    if not resident_ids:
        return []

    # Query payments
    pay_query = db.table("payments").select("*").in_("resident_id", resident_ids)
    if status:
        pay_query = pay_query.eq("status", status)
    if period:
        pay_query = pay_query.eq("period", period)
    payments = pay_query.order("created_at", desc=True).limit(limit).execute()

    result = []
    for p in (payments.data or []):
        result.append({
            "id": p["id"],
            "resident_id": p["resident_id"],
            "resident_name": resident_map.get(p["resident_id"], ""),
            "amount": float(p["amount"]),
            "period": p["period"],
            "status": p["status"],
            "payme_transaction_id": p.get("payme_transaction_id"),
            "paid_at": p.get("paid_at"),
            "created_at": p.get("created_at"),
        })

    return result
