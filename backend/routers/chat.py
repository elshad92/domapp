"""
DomApp — Chat router (чат по заявкам)
GET  /api/v1/chat/{request_id}       — история сообщений
POST /api/v1/chat/{request_id}       — отправить сообщение
"""

import logging

from fastapi import APIRouter, Depends, HTTPException

from backend.auth import get_current_company
from backend.db import get_supabase
from backend.models.schemas import ChatMessageCreate, ChatMessageResponse

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])


@router.get("/chat/{request_id}", response_model=list[ChatMessageResponse])
async def get_chat_messages(
    request_id: int,
    company: dict = Depends(get_current_company),
):
    """Получить историю сообщений по заявке."""
    db = get_supabase()
    company_id = company["company_id"]

    # Проверяем, что заявка принадлежит компании
    req = db.table("requests").select("building_id").eq("id", request_id).maybe_single().execute()
    if not req.data:
        raise HTTPException(status_code=404, detail="Request not found")

    building = db.table("buildings").select("company_id").eq("id", req.data["building_id"]).maybe_single().execute()
    if not building.data or building.data["company_id"] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")

    result = (
        db.table("request_messages")
        .select("*")
        .eq("request_id", request_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data or []


@router.post("/chat/{request_id}", response_model=ChatMessageResponse)
async def send_chat_message(
    request_id: int,
    data: ChatMessageCreate,
    company: dict = Depends(get_current_company),
):
    """Отправить сообщение в чат заявки (от УК)."""
    db = get_supabase()
    company_id = company["company_id"]

    # Проверяем, что заявка принадлежит компании
    req = db.table("requests").select("building_id").eq("id", request_id).maybe_single().execute()
    if not req.data:
        raise HTTPException(status_code=404, detail="Request not found")

    building = db.table("buildings").select("company_id").eq("id", req.data["building_id"]).maybe_single().execute()
    if not building.data or building.data["company_id"] != company_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if data.request_id != request_id:
        raise HTTPException(status_code=400, detail="Request ID mismatch")

    result = db.table("request_messages").insert(data.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to send message")

    logger.info("Chat message sent: request_id=%s sender=%s", request_id, data.sender_type)
    return result.data[0]
