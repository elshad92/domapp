"""
DomApp — Apartments (квартиры) CRUD
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.db import get_supabase
from backend.auth import get_current_company

logger = logging.getLogger(__name__)
router = APIRouter(tags=["apartments"])


def _get_company_building_ids(db, company_id: int) -> list[int]:
    result = db.table("buildings").select("id").eq("company_id", company_id).execute()
    return [row["id"] for row in (result.data or [])]


def _get_company_apartment(db, company_id: int, apartment_id: int) -> dict | None:
    allowed_building_ids = _get_company_building_ids(db, company_id)
    if not allowed_building_ids:
        return None
    apartment = db.table("apartments").select("*").eq("id", apartment_id).maybe_single().execute()
    if not apartment.data or apartment.data.get("building_id") not in allowed_building_ids:
        return None
    return apartment.data


class ApartmentCreate(BaseModel):
    building_id: int
    number: str
    floor: int
    area: float | None = None


class ApartmentUpdate(BaseModel):
    number: str | None = None
    floor: int | None = None
    area: float | None = None


class ApartmentResponse(BaseModel):
    id: int
    building_id: int
    number: str
    floor: int
    area: float | None = None


@router.get("/apartments", response_model=list[ApartmentResponse])
async def list_apartments(
    building_id: int | None = None,
    company: dict = Depends(get_current_company),
):
    db = get_supabase()
    query = db.table("apartments").select("*")

    if building_id is not None:
        # Проверяем, что здание принадлежит компании
        building = (
            db.table("buildings")
            .select("id")
            .eq("id", building_id)
            .eq("company_id", company["company_id"])
            .maybe_single()
            .execute()
        )
        if not building.data:
            raise HTTPException(status_code=403, detail="Building is not available for this company")
        query = query.eq("building_id", building_id)
    else:
        # Получаем все здания компании
        buildings = db.table("buildings").select("id").eq("company_id", company["company_id"]).execute()
        building_ids = [b["id"] for b in (buildings.data or [])]
        if not building_ids:
            return []
        query = query.in_("building_id", building_ids)

    return query.order("number").execute().data


@router.post("/apartments", response_model=ApartmentResponse)
async def create_apartment(
    data: ApartmentCreate,
    company: dict = Depends(get_current_company),
):
    db = get_supabase()

    # Проверяем, что здание принадлежит компании
    building = (
        db.table("buildings")
        .select("id")
        .eq("id", data.building_id)
        .eq("company_id", company["company_id"])
        .maybe_single()
        .execute()
    )
    if not building.data:
        raise HTTPException(status_code=403, detail="Building is not available for this company")

    result = db.table("apartments").insert(data.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create apartment")
    logger.info("Apartment created: id=%s building_id=%s", result.data[0]["id"], data.building_id)
    return result.data[0]


@router.patch("/apartments/{apartment_id}", response_model=ApartmentResponse)
async def update_apartment(
    apartment_id: int,
    data: ApartmentUpdate,
    company: dict = Depends(get_current_company),
):
    db = get_supabase()
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    if not _get_company_apartment(db, company["company_id"], apartment_id):
        raise HTTPException(status_code=404, detail="Apartment not found")
    result = db.table("apartments").update(update_data).eq("id", apartment_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Apartment not found")
    return result.data[0]


@router.delete("/apartments/{apartment_id}")
async def delete_apartment(
    apartment_id: int,
    company: dict = Depends(get_current_company),
):
    db = get_supabase()
    if not _get_company_apartment(db, company["company_id"], apartment_id):
        raise HTTPException(status_code=404, detail="Apartment not found")
    db.table("apartments").delete().eq("id", apartment_id).execute()
    return {"ok": True}
