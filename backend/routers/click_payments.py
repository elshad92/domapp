"""
DomApp — Click JSON-RPC webhook
Поддерживает: CheckPerformTransaction, CreateTransaction, PerformTransaction,
CancelTransaction, CheckTransaction, GetStatement
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
import time
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from backend.db import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(tags=["click_payments"])

# Click methods
M_CHECK = "CheckPerformTransaction"
M_CREATE = "CreateTransaction"
M_PERFORM = "PerformTransaction"
M_CANCEL = "CancelTransaction"
M_CHECK_TX = "CheckTransaction"
M_STATEMENT = "GetStatement"

# States
STATE_CREATED = 1
STATE_PERFORMED = 2
STATE_CANCELLED = -1
STATE_CANCELLED_AFTER_PERFORM = -2

# Errors
ERR_INVALID_AMOUNT = -31001
ERR_TX_NOT_FOUND = -31003
ERR_ALREADY_PAID = -31099
ERR_ORDER_NOT_FOUND = -31050
ERR_METHOD_NOT_FOUND = -32601
ERR_CANT_CANCEL = -31007
ERR_INVALID_ACCOUNT = -31051
ERR_TIMEOUT = -31008


def _now_ms() -> int:
    return int(time.time() * 1000)


def _to_ms(iso_str: str) -> int:
    if not iso_str:
        return 0
    try:
        return int(datetime.fromisoformat(iso_str.replace("Z", "+00:00")).timestamp() * 1000)
    except (ValueError, TypeError):
        return 0


def _verify_click_auth(
    params: dict,
    secret_key: str,
) -> bool:
    """
    Проверка подписи Click.
    sign_string = click_trans_id + click_paydoc_id + service_id + secret_key + amount + action + sign_time
    """
    try:
        click_trans_id = str(params.get("click_trans_id", ""))
        click_paydoc_id = str(params.get("click_paydoc_id", ""))
        service_id = str(params.get("service_id", ""))
        amount = str(params.get("amount", ""))
        action = str(params.get("action", ""))
        sign_time = str(params.get("sign_time", ""))
        sign_string = params.get("sign_string", "")

        expected = hashlib.md5(
            f"{click_trans_id}{click_paydoc_id}{service_id}{secret_key}{amount}{action}{sign_time}".encode()
        ).hexdigest()

        return hmac.compare_digest(sign_string, expected)
    except Exception:
        return False


def _find_by_account(account: dict):
    """Найти платёж по resident_id и period."""
    rid = account.get("resident_id")
    period = account.get("period")
    if not rid or not period:
        return None
    try:
        rid = int(rid)
    except (ValueError, TypeError):
        return None
    if not isinstance(period, str) or len(period) != 7:
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


def _find_by_click_tx(click_trans_id: str | None):
    """Найти платёж по click_trans_id."""
    if not click_trans_id:
        return None
    return (
        get_supabase()
        .table("payments")
        .select("*")
        .eq("click_transaction_id", click_trans_id)
        .maybe_single()
        .execute()
        .data
    )


def _ok(result: dict) -> dict:
    return {"jsonrpc": "2.0", "result": result}


def _err(code: int, msg: str) -> dict:
    return {
        "jsonrpc": "2.0",
        "error": {"code": code, "message": {"ru": msg, "uz": msg, "en": msg}},
    }


@router.post("/payments/click")
async def click_webhook(request: Request):
    """Click JSON-RPC webhook."""
    body = await request.json()
    method = body.get("method")
    params = body.get("params", {})

    logger.info("Click method=%s params=%s", method, params)

    secret_key = os.getenv("CLICK_SECRET_KEY", "")
    if not secret_key or secret_key.startswith("CHANGE_ME_"):
        logger.error("CLICK_SECRET_KEY is not configured")
        raise HTTPException(status_code=500, detail="Click not configured")

    # Verify signature
    if not _verify_click_auth(params, secret_key):
        logger.warning("Click invalid signature")
        return _err(-1, "Invalid signature")

    db = get_supabase()

    if method == M_CHECK:
        payment = _find_by_account(params.get("account", {}))
        if not payment:
            return _err(ERR_ORDER_NOT_FOUND, "Order not found")
        if payment["status"] == "paid":
            return _err(ERR_ALREADY_PAID, "Already paid")
        expected_tiyin = int(float(payment["amount"]) * 100)
        if params.get("amount") != expected_tiyin:
            return _err(ERR_INVALID_AMOUNT, f"Expected {expected_tiyin} tiyin")
        return _ok({"allow": True})

    if method == M_CREATE:
        click_trans_id = str(params.get("click_trans_id", ""))
        amount = params.get("amount", 0)
        sign_time = params.get("sign_time", "")

        # Check timeout (12 hours)
        try:
            st = datetime.strptime(sign_time, "%Y-%m-%d %H:%M:%S")
            if (datetime.now() - st).total_seconds() > 43200:
                return _err(ERR_TIMEOUT, "Transaction timeout")
        except (ValueError, TypeError):
            pass

        existing = _find_by_click_tx(click_trans_id)
        if existing:
            if existing["status"] == "paid":
                return _err(ERR_ALREADY_PAID, "Already paid")
            return _ok({
                "click_trans_id": click_trans_id,
                "merchant_trans_id": str(existing["id"]),
                "merchant_prepare_id": str(existing["id"]),
                "state": STATE_CREATED,
            })

        payment = _find_by_account(params.get("account", {}))
        if not payment:
            return _err(ERR_ORDER_NOT_FOUND, "Order not found")
        if payment["status"] == "paid":
            return _err(ERR_ALREADY_PAID, "Already paid")

        expected_tiyin = int(float(payment["amount"]) * 100)
        if amount != expected_tiyin:
            return _err(ERR_INVALID_AMOUNT, f"Expected {expected_tiyin} tiyin")

        now = _now_ms()
        update_result = db.table("payments").update({
            "click_transaction_id": click_trans_id,
            "click_create_time": now,
            "click_state": STATE_CREATED,
        }).eq("id", payment["id"]).execute()
        if not update_result.data:
            return _err(ERR_TX_NOT_FOUND, "Failed to create transaction")

        return _ok({
            "click_trans_id": click_trans_id,
            "merchant_trans_id": str(payment["id"]),
            "merchant_prepare_id": str(payment["id"]),
            "state": STATE_CREATED,
        })

    if method == M_PERFORM:
        click_trans_id = str(params.get("click_trans_id", ""))
        payment = _find_by_click_tx(click_trans_id)
        if not payment:
            return _err(ERR_TX_NOT_FOUND, "Transaction not found")

        if payment["status"] == "paid":
            return _ok({
                "click_trans_id": click_trans_id,
                "merchant_trans_id": str(payment["id"]),
                "merchant_confirm_id": str(payment["id"]),
                "state": STATE_PERFORMED,
            })

        now = _now_ms()
        paid_at = datetime.now(timezone.utc).isoformat()
        update_result = db.table("payments").update({
            "status": "paid",
            "paid_at": paid_at,
            "click_state": STATE_PERFORMED,
        }).eq("id", payment["id"]).execute()
        if not update_result.data:
            return _err(ERR_TX_NOT_FOUND, "Failed to perform transaction")

        logger.info("Click payment performed: id=%s click_trans=%s", payment["id"], click_trans_id)
        return _ok({
            "click_trans_id": click_trans_id,
            "merchant_trans_id": str(payment["id"]),
            "merchant_confirm_id": str(payment["id"]),
            "state": STATE_PERFORMED,
        })

    if method == M_CANCEL:
        click_trans_id = str(params.get("click_trans_id", ""))
        reason = params.get("reason")
        payment = _find_by_click_tx(click_trans_id)
        if not payment:
            return _err(ERR_TX_NOT_FOUND, "Transaction not found")

        now = _now_ms()
        if payment["status"] == "paid":
            update_result = db.table("payments").update({
                "click_state": STATE_CANCELLED_AFTER_PERFORM,
                "click_cancel_time": now,
                "click_cancel_reason": reason,
            }).eq("id", payment["id"]).execute()
            if not update_result.data:
                return _err(ERR_TX_NOT_FOUND, "Failed to cancel transaction")
            return _ok({
                "click_trans_id": click_trans_id,
                "merchant_trans_id": str(payment["id"]),
                "merchant_confirm_id": str(payment["id"]),
                "state": STATE_CANCELLED_AFTER_PERFORM,
            })

        update_result = db.table("payments").update({
            "status": "failed",
            "click_state": STATE_CANCELLED,
            "click_cancel_time": now,
            "click_cancel_reason": reason,
        }).eq("id", payment["id"]).execute()
        if not update_result.data:
            return _err(ERR_TX_NOT_FOUND, "Failed to cancel transaction")

        logger.info("Click payment cancelled: id=%s click_trans=%s", payment["id"], click_trans_id)
        return _ok({
            "click_trans_id": click_trans_id,
            "merchant_trans_id": str(payment["id"]),
            "merchant_confirm_id": str(payment["id"]),
            "state": STATE_CANCELLED,
        })

    if method == M_CHECK_TX:
        click_trans_id = str(params.get("click_trans_id", ""))
        payment = _find_by_click_tx(click_trans_id)
        if not payment:
            return _err(ERR_TX_NOT_FOUND, "Transaction not found")

        state_map = {"pending": STATE_CREATED, "paid": STATE_PERFORMED, "failed": STATE_CANCELLED}
        return _ok({
            "click_trans_id": click_trans_id,
            "merchant_trans_id": str(payment["id"]),
            "merchant_confirm_id": str(payment["id"]),
            "state": state_map.get(payment["status"], STATE_CREATED),
        })

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
            transactions.append({
                "id": payment.get("click_transaction_id", ""),
                "time": payment.get("click_create_time") or 0,
                "amount": int(float(payment["amount"]) * 100),
                "account": {"resident_id": payment["resident_id"], "period": payment["period"]},
                "create_time": payment.get("click_create_time") or 0,
                "perform_time": _to_ms(payment.get("paid_at")),
                "cancel_time": payment.get("click_cancel_time") or 0,
                "transaction": str(payment["id"]),
                "state": STATE_PERFORMED,
                "reason": None,
            })
        return _ok({"transactions": transactions})

    logger.warning("Unknown Click method=%s", method)
    return _err(ERR_METHOD_NOT_FOUND, f"Method {method} is not supported")
