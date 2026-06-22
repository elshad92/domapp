"""
DomApp — Employees (сотрудники УК) CRUD
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.db import get_supabase
from backend.auth import get_current_company, require_feature

logger = logging.getLogger(__name__)
router = APIRouter(tags=["employees"])


class EmployeeCreate(BaseModel):
    name: str
    phone: str
    email: str | None = None
    role: str = "employee"  # admin, manager, employee


class EmployeeUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    role: str | None = None


class EmployeeResponse(BaseModel):
    id: int
    company_id: int
    name: str
    phone: str
    email: str | None = None
    role: str


@router.get("/employees", response_model=list[EmployeeResponse])
async def list_employees(
    role: str | None = None,
    company: dict = Depends(require_feature("employees")),
):
    db = get_supabase()
    query = db.table("employees").select("*").eq("company_id", company["company_id"])
    if role:
        query = query.eq("role", role)
    return query.execute().data


@router.post("/employees", response_model=EmployeeResponse)
async def create_employee(
    data: EmployeeCreate,
    company: dict = Depends(require_feature("employees")),
):
    db = get_supabase()
    payload = data.model_dump()
    payload["company_id"] = company["company_id"]
    result = db.table("employees").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create employee")
    logger.info("Employee created: id=%s company_id=%s", result.data[0]["id"], company["company_id"])
    return result.data[0]


@router.patch("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    company: dict = Depends(get_current_company),
):
    db = get_supabase()
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = db.table("employees").update(update_data).eq("id", employee_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Employee not found")
    return result.data[0]


@router.delete("/employees/{employee_id}")
async def delete_employee(
    employee_id: int,
    company: dict = Depends(get_current_company),
):
    db = get_supabase()
    result = db.table("employees").delete().eq("id", employee_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"ok": True}
