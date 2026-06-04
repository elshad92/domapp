"""
Buildings API.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from backend.auth import get_current_company
from backend.db import get_supabase
from backend.models.schemas import BuildingCreate, BuildingResponse

logger = logging.getLogger(__name__)
router = APIRouter(tags=["buildings"])


@router.get("/buildings", response_model=list[BuildingResponse])
async def list_buildings(company: dict = Depends(get_current_company)):
    db = get_supabase()
    result = db.table("buildings").select("*").eq("company_id", company["company_id"]).execute()
    return result.data


@router.post("/buildings", response_model=BuildingResponse)
async def create_building(data: BuildingCreate, company: dict = Depends(get_current_company)):
    db = get_supabase()
    payload = data.model_dump()
    payload["company_id"] = company["company_id"]

    result = db.table("buildings").insert(payload).execute()
    if not result.data:
        logger.error("Failed to create building for company_id=%s", company["company_id"])
        raise HTTPException(status_code=400, detail="Failed to create building")
    logger.info("Building created: id=%s company_id=%s", result.data[0]["id"], company["company_id"])
    return result.data[0]
