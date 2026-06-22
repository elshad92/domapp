"""
Requests API.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from backend.auth import get_current_company, verify_internal_key
from backend.db import get_supabase
from backend.models.schemas import RequestCreate, RequestResponse, RequestUpdate
from backend.services.telegram_notifications import notify_request_status

logger = logging.getLogger(__name__)
router = APIRouter(tags=["requests"])


def _company_building_ids(db, company_id: int) -> list[int]:
    result = db.table("buildings").select("id").eq("company_id", company_id).execute()
    return [row["id"] for row in (result.data or [])]


def _ensure_company_building(db, company_id: int, building_id: int) -> None:
    allowed = (
        db.table("buildings")
        .select("id")
        .eq("id", building_id)
        .eq("company_id", company_id)
        .maybe_single()
        .execute()
    )
    if not allowed.data:
        raise HTTPException(status_code=403, detail="Building is not available for this company")


@router.post("/requests", response_model=RequestResponse)
async def create_request(
    data: RequestCreate,
    _: bool = Depends(verify_internal_key),
):
    db = get_supabase()
    result = db.table("requests").insert(data.model_dump()).execute()
    if not result.data:
        logger.error("Failed to create request: %s", data)
        raise HTTPException(status_code=400, detail="Failed to create request")
    logger.info("Request created: id=%s", result.data[0]["id"])
    return result.data[0]


@router.get("/requests", response_model=list[RequestResponse])
async def list_requests(
    building_id: int | None = None,
    status: str | None = None,
    category: str | None = None,
    resident_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 100,
    offset: int = 0,
    company: dict = Depends(get_current_company),
):
    db = get_supabase()
    company_id = company["company_id"]
    allowed_ids = _company_building_ids(db, company_id)
    if not allowed_ids:
        return []

    query = db.table("requests").select("*")
    if building_id is not None:
        if building_id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Building is not available for this company")
        query = query.eq("building_id", building_id)
    else:
        query = query.in_("building_id", allowed_ids)

    if status:
        query = query.eq("status", status)
    if category:
        query = query.eq("category", category)
    if resident_id is not None:
        query = query.eq("resident_id", resident_id)
    if date_from:
        query = query.gte("created_at", date_from)
    if date_to:
        query = query.lte("created_at", date_to)

    return query.order("created_at", desc=True).limit(limit).execute().data


@router.get("/bot/requests", response_model=list[RequestResponse])
async def list_resident_requests(
    resident_id: int,
    _: bool = Depends(verify_internal_key),
):
    db = get_supabase()
    return (
        db.table("requests")
        .select("*")
        .eq("resident_id", resident_id)
        .order("created_at", desc=True)
        .execute()
        .data
    )


@router.patch("/requests/{request_id}", response_model=RequestResponse)
async def update_request_status(
    request_id: int,
    data: RequestUpdate,
    company: dict = Depends(get_current_company),
):
    db = get_supabase()
    company_id = company["company_id"]

    old = db.table("requests").select("*").eq("id", request_id).maybe_single().execute()
    if not old.data:
        raise HTTPException(status_code=404, detail="Request not found")
    _ensure_company_building(db, company_id, old.data["building_id"])

    update_data = {}
    if data.status:
        update_data["status"] = data.status
        if data.status == "done":
            update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()
    if data.comment is not None:
        update_data["comment"] = data.comment
    if data.assigned_to is not None:
        update_data["assigned_to"] = data.assigned_to
        update_data["assigned_at"] = datetime.now(timezone.utc).isoformat()
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = db.table("requests").update(update_data).eq("id", request_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Request not found")

    updated = result.data[0]
    logger.info("Request %s updated by company_id=%s: %s", request_id, company_id, update_data)

    if data.status and old.data.get("status") != data.status:
        try:
            resident_id = updated.get("resident_id")
            if resident_id:
                resident = db.table("residents").select("telegram_id").eq("id", resident_id).maybe_single().execute()
                if resident.data and resident.data.get("telegram_id"):
                    await notify_request_status(
                        telegram_id=resident.data["telegram_id"],
                        request_id=request_id,
                        category=updated.get("category", ""),
                        old_status=old.data.get("status", ""),
                        new_status=data.status,
                        comment=data.comment,
                    )
        except Exception as exc:
            logger.error("Failed to send notification for request %s: %s", request_id, exc)

    return updated


@router.delete("/requests/{request_id}")
async def delete_request(
    request_id: int,
    company: dict = Depends(get_current_company),
):
    """Удалить заявку (только для УК)."""
    db = get_supabase()
    company_id = company["company_id"]

    old = db.table("requests").select("*").eq("id", request_id).maybe_single().execute()
    if not old.data:
        raise HTTPException(status_code=404, detail="Request not found")
    _ensure_company_building(db, company_id, old.data["building_id"])

    db.table("requests").delete().eq("id", request_id).execute()
    logger.info("Request %s deleted by company_id=%s", request_id, company_id)
    return {"ok": True}
