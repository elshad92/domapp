"""
Announcements API.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from backend.auth import get_current_company, verify_internal_key
from backend.db import get_supabase
from backend.models.schemas import AnnouncementCreate, AnnouncementResponse
from bot.handlers.notifications import notify_new_announcement

logger = logging.getLogger(__name__)
router = APIRouter(tags=["announcements"])


def _assert_company_building(db, company_id: int, building_id: int | None) -> None:
    if building_id is None:
        return
    result = db.table("buildings").select("id").eq("id", building_id).eq("company_id", company_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=403, detail="Building is not available for this company")


@router.post("/announcements", response_model=AnnouncementResponse)
async def create_announcement(data: AnnouncementCreate, company: dict = Depends(get_current_company)):
    db = get_supabase()
    company_id = company["company_id"]
    _assert_company_building(db, company_id, data.building_id)

    payload = data.model_dump()
    payload["company_id"] = company_id
    result = db.table("announcements").insert(payload).execute()
    if not result.data:
        logger.error("Failed to create announcement for company_id=%s", company_id)
        raise HTTPException(status_code=400, detail="Failed to create announcement")

    try:
        if data.building_id:
            apartments = db.table("apartments").select("id").eq("building_id", data.building_id).execute()
            apartment_ids = [row["id"] for row in (apartments.data or [])]
            if apartment_ids:
                residents = db.table("residents").select("telegram_id").in_("apartment_id", apartment_ids).execute()
                tg_ids = [row["telegram_id"] for row in (residents.data or []) if row.get("telegram_id")]
                if tg_ids:
                    await notify_new_announcement(
                        building_id=data.building_id,
                        title="📢 Новое объявление",
                        content=data.text,
                        resident_telegram_ids=tg_ids,
                    )
    except Exception as exc:
        logger.error("Failed to send announcement notification: %s", exc)

    return result.data[0]


@router.get("/announcements", response_model=list[AnnouncementResponse])
async def list_announcements(
    building_id: int | None = None,
    company: dict = Depends(get_current_company),
):
    db = get_supabase()
    company_id = company["company_id"]
    _assert_company_building(db, company_id, building_id)

    query = db.table("announcements").select("*").eq("company_id", company_id)
    if building_id:
        query = query.eq("building_id", building_id)
    return query.order("created_at", desc=True).execute().data


@router.get("/bot/announcements", response_model=list[AnnouncementResponse])
async def list_bot_announcements(
    building_id: int | None = None,
    _: bool = Depends(verify_internal_key),
):
    """Get announcements for bot (uses internal key instead of JWT)."""
    db = get_supabase()
    query = db.table("announcements").select("*")
    if building_id:
        query = query.eq("building_id", building_id)
    return query.order("created_at", desc=True).execute().data
