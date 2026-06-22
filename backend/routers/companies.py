"""
DomApp — Companies (управляющие компании) profile API.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.db import get_supabase
from backend.auth import get_current_company

logger = logging.getLogger(__name__)
router = APIRouter(tags=["companies"])


class CompanyResponse(BaseModel):
    id: int
    name: str
    phone: str
    email: str
    plan: str


class CompanyUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    password: str | None = None
    plan: str | None = None


@router.get("/companies/me", response_model=CompanyResponse)
async def get_my_company(company: dict = Depends(get_current_company)):
    """Получить информацию о своей компании."""
    db = get_supabase()
    result = db.table("companies").select("*").eq("id", company["company_id"]).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Company not found")
    return result.data


@router.patch("/companies/me", response_model=CompanyResponse)
async def update_my_company(
    data: CompanyUpdate,
    company: dict = Depends(get_current_company),
):
    """Обновить информацию о компании."""
    db = get_supabase()
    update_data = data.model_dump(exclude={"password", "email"}, exclude_none=True)
    if data.password:
        from passlib.hash import pbkdf2_sha256
        update_data["password_hash"] = pbkdf2_sha256.hash(data.password)
    result = db.table("companies").update(update_data).eq("id", company["company_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to update company")
    return result.data[0]
