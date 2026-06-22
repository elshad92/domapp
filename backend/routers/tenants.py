"""
DomApp — Tenants (жильцы) CRUD
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.db import get_supabase
from backend.auth import get_current_company

logger = logging.getLogger(__name__)
router = APIRouter(tags=["tenants"])


def _company_apartment_ids(db, company_id: int) -> list[int]:
    buildings = db.table("buildings").select("id").eq("company_id", company_id).execute()
    building_ids = [row["id"] for row in (buildings.data or [])]
    if not building_ids:
        return []
    apartments = db.table("apartments").select("id").in_("building_id", building_ids).execute()
    return [row["id"] for row in (apartments.data or [])]


def _assert_company_apartment(db, company_id: int, apartment_id: int) -> None:
    building_ids = [row["id"] for row in (db.table("buildings").select("id").eq("company_id", company_id).execute().data or [])]
    if not building_ids:
        raise HTTPException(status_code=403, detail="Apartment is not available for this company")
    apartment = db.table("apartments").select("id").eq("id", apartment_id).in_("building_id", building_ids).maybe_single().execute()
    if not apartment.data:
        raise HTTPException(status_code=403, detail="Apartment is not available for this company")


def _get_company_tenant(db, company_id: int, tenant_id: int) -> dict | None:
    tenant = db.table("tenants").select("*").eq("id", tenant_id).maybe_single().execute()
    if not tenant.data:
        return None
    try:
        _assert_company_apartment(db, company_id, tenant.data["apartment_id"])
    except HTTPException:
        return None
    return tenant.data


class TenantCreate(BaseModel):
    apartment_id: int
    name: str
    phone: str
    email: str | None = None


class TenantUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None


class TenantResponse(BaseModel):
    id: int
    apartment_id: int
    name: str
    phone: str
    email: str | None = None


@router.get("/tenants", response_model=list[TenantResponse])
async def list_tenants(
    apartment_id: int | None = None,
    company: dict = Depends(get_current_company),
):
    db = get_supabase()
    company_id = company["company_id"]
    allowed_apartment_ids = _company_apartment_ids(db, company_id)
    if not allowed_apartment_ids:
        return []
    query = db.table("tenants").select("*")
    if apartment_id is not None:
        if apartment_id not in allowed_apartment_ids:
            raise HTTPException(status_code=403, detail="Apartment is not available for this company")
        query = query.eq("apartment_id", apartment_id)
    else:
        query = query.in_("apartment_id", allowed_apartment_ids)
    return query.execute().data


@router.post("/tenants", response_model=TenantResponse)
async def create_tenant(
    data: TenantCreate,
    company: dict = Depends(get_current_company),
):
    db = get_supabase()
    _assert_company_apartment(db, company["company_id"], data.apartment_id)
    result = db.table("tenants").insert(data.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create tenant")
    logger.info("Tenant created: id=%s", result.data[0]["id"])
    return result.data[0]


@router.patch("/tenants/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: int,
    data: TenantUpdate,
    company: dict = Depends(get_current_company),
):
    db = get_supabase()
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    if not _get_company_tenant(db, company["company_id"], tenant_id):
        raise HTTPException(status_code=404, detail="Tenant not found")
    result = db.table("tenants").update(update_data).eq("id", tenant_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return result.data[0]


@router.delete("/tenants/{tenant_id}")
async def delete_tenant(
    tenant_id: int,
    company: dict = Depends(get_current_company),
):
    db = get_supabase()
    if not _get_company_tenant(db, company["company_id"], tenant_id):
        raise HTTPException(status_code=404, detail="Tenant not found")
    db.table("tenants").delete().eq("id", tenant_id).execute()
    return {"ok": True}
