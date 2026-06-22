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

# Справочник районов Ташкента
TASHKENT_DISTRICTS = [
    "Бектемирский",
    "Мирабадский",
    "Мирзо-Улугбекский",
    "Сергелийский",
    "Учтепинский",
    "Чиланзарский",
    "Шайхантахурский",
    "Юнусабадский",
    "Яккасарайский",
    "Яшнабадский",
    "Алмазарский",
    "Бунедкорский",
    "Карасуйский",
    "Кукча",
    "Олмазор",
    "Хамзинский",
]


@router.get("/buildings/districts")
async def list_districts():
    """Получить список районов Ташкента."""
    return TASHKENT_DISTRICTS


@router.get("/buildings", response_model=list[BuildingResponse])
async def list_buildings(
    district: str | None = None,
    company: dict = Depends(get_current_company),
):
    db = get_supabase()
    query = db.table("buildings").select("*").eq("company_id", company["company_id"])
    if district:
        query = query.eq("district", district)
    return query.execute().data


@router.post("/buildings", response_model=BuildingResponse)
async def create_building(data: BuildingCreate, company: dict = Depends(get_current_company)):
    db = get_supabase()
    company_id = company["company_id"]

    # Проверяем район
    if data.district not in TASHKENT_DISTRICTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid district. Allowed: {', '.join(TASHKENT_DISTRICTS)}",
        )

    payload = data.model_dump()
    payload["company_id"] = company["company_id"]

    result = db.table("buildings").insert(payload).execute()
    if not result.data:
        logger.error("Failed to create building for company_id=%s", company["company_id"])
        raise HTTPException(status_code=400, detail="Failed to create building")
    logger.info("Building created: id=%s company_id=%s", result.data[0]["id"], company["company_id"])
    return result.data[0]


@router.patch("/buildings/{building_id}", response_model=BuildingResponse)
async def update_building(
    building_id: int,
    data: BuildingCreate,
    company: dict = Depends(get_current_company),
):
    db = get_supabase()
    company_id = company["company_id"]

    old = db.table("buildings").select("*").eq("id", building_id).eq("company_id", company_id).maybe_single().execute()
    if not old.data:
        raise HTTPException(status_code=404, detail="Building not found")

    if data.district not in TASHKENT_DISTRICTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid district. Allowed: {', '.join(TASHKENT_DISTRICTS)}",
        )

    update_data = data.model_dump()
    result = db.table("buildings").update(update_data).eq("id", building_id).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to update building")
    return result.data[0]


@router.delete("/buildings/{building_id}")
async def delete_building(
    building_id: int,
    company: dict = Depends(get_current_company),
):
    db = get_supabase()
    company_id = company["company_id"]

    old = db.table("buildings").select("*").eq("id", building_id).eq("company_id", company_id).maybe_single().execute()
    if not old.data:
        raise HTTPException(status_code=404, detail="Building not found")

    # Проверяем, есть ли квартиры в этом доме
    apartments = db.table("apartments").select("id").eq("building_id", building_id).limit(1).execute()
    if apartments.data:
        raise HTTPException(status_code=400, detail="Cannot delete building with existing apartments")

    db.table("buildings").delete().eq("id", building_id).execute()
    logger.info("Building %s deleted by company_id=%s", building_id, company_id)
    return {"ok": True}
