"""
DomApp — Tenants (жильцы) CRUD
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.db import get_supabase
from backend.auth import get_current_company

logger = logging.getLogger(__name__)
router = APIRouter(tags=["tenants"])


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
    query = db.table("tenants").select("*")
    if apartment_id is not None:
        query = query.eq("apartment_id", apartment_id)
    return query.execute().data


@router.post("/tenants", response_model=TenantResponse)
async def create_tenant(
    data: TenantCreate,
    company: dict = Depends(get_current_company),
):
    db = get_supabase()
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
    result = db.table("tenants").delete().eq("id", tenant_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {"ok": True}
