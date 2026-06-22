"""
DomApp — Polls (опросы жильцов)
GET    /api/v1/polls              — список опросов (для УК)
POST   /api/v1/polls              — создать опрос
GET    /api/v1/polls/{id}         — детали опроса
POST   /api/v1/polls/{id}/vote    — проголосовать
GET    /api/v1/polls/{id}/results — результаты опроса
GET    /api/v1/resident/me/polls  — опросы для жильца
POST   /api/v1/resident/me/polls/{id}/vote — голосование жильца
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from backend.auth import get_current_company, require_feature
from backend.db import get_supabase
from backend.models.schemas import PollCreate, PollResponse, PollVoteRequest
from backend.routers.resident_api import get_current_resident

logger = logging.getLogger(__name__)
router = APIRouter(tags=["polls"])


def _company_building_ids(db, company_id: int) -> list[int]:
    result = db.table("buildings").select("id").eq("company_id", company_id).execute()
    return [row["id"] for row in (result.data or [])]


@router.get("/polls", response_model=list[PollResponse])
async def list_polls(
    building_id: int | None = None,
    company: dict = Depends(require_feature("polls")),
):
    """Список опросов для УК (фильтр по дому)."""
    db = get_supabase()
    company_id = company["company_id"]

    query = db.table("polls").select("*").eq("company_id", company_id)
    if building_id:
        query = query.eq("building_id", building_id)
    result = query.order("created_at", desc=True).execute()
    return result.data or []


@router.post("/polls", response_model=PollResponse)
async def create_poll(
    data: PollCreate,
    company: dict = Depends(require_feature("polls")),
):
    """Создать новый опрос."""
    db = get_supabase()
    company_id = company["company_id"]

    # Проверяем, что дом принадлежит компании
    building = db.table("buildings").select("id").eq("id", data.building_id).eq("company_id", company_id).maybe_single().execute()
    if not building.data:
        raise HTTPException(status_code=403, detail="Дом не принадлежит вашей компании")

    poll_data = data.model_dump()
    poll_data["company_id"] = company_id
    poll_data["created_at"] = datetime.now(timezone.utc).isoformat()

    result = db.table("polls").insert(poll_data).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Не удалось создать опрос")

    logger.info("Poll created: id=%s company_id=%s", result.data[0]["id"], company_id)
    return result.data[0]


@router.get("/polls/{poll_id}", response_model=PollResponse)
async def get_poll(
    poll_id: int,
    company: dict = Depends(get_current_company),
):
    """Детали опроса."""
    db = get_supabase()
    result = db.table("polls").select("*").eq("id", poll_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Опрос не найден")
    return result.data


@router.get("/polls/{poll_id}/results")
async def get_poll_results(
    poll_id: int,
    company: dict = Depends(get_current_company),
):
    """Результаты опроса (количество голосов за каждый вариант)."""
    db = get_supabase()

    poll = db.table("polls").select("*").eq("id", poll_id).maybe_single().execute()
    if not poll.data:
        raise HTTPException(status_code=404, detail="Опрос не найден")

    options = poll.data.get("options", [])
    votes = db.table("poll_votes").select("option_index").eq("poll_id", poll_id).execute()

    # Считаем голоса
    results = {str(i): {"option": options[i], "votes": 0} for i in range(len(options))}
    for v in (votes.data or []):
        idx = v.get("option_index")
        if idx is not None and str(idx) in results:
            results[str(idx)]["votes"] += 1

    total_votes = len(votes.data or [])
    return {
        "poll_id": poll_id,
        "question": poll.data.get("question"),
        "total_votes": total_votes,
        "results": list(results.values()),
    }


# === Resident endpoints ===


@router.get("/resident/me/polls", response_model=list[PollResponse])
async def resident_polls(
    resident: dict = Depends(get_current_resident),
):
    """Список опросов для жильца (по его дому)."""
    db = get_supabase()
    resident_id = resident["resident_id"]

    # Получаем building_id жильца
    res = db.table("residents").select("apartment_id").eq("id", resident_id).maybe_single().execute()
    if not res.data:
        return []

    apartment_id = res.data.get("apartment_id")
    if not apartment_id:
        return []

    apt = db.table("apartments").select("building_id").eq("id", apartment_id).maybe_single().execute()
    if not apt.data:
        return []

    building_id = apt.data["building_id"]

    # Получаем опросы для этого дома
    result = db.table("polls").select("*").eq("building_id", building_id).order("created_at", desc=True).execute()
    polls = result.data or []

    # Отмечаем, голосовал ли жилец
    for poll in polls:
        vote = db.table("poll_votes").select("id").eq("poll_id", poll["id"]).eq("resident_id", resident_id).maybe_single().execute()
        poll["voted"] = vote.data is not None

    return polls


@router.post("/resident/me/polls/{poll_id}/vote")
async def resident_vote(
    poll_id: int,
    data: PollVoteRequest,
    resident: dict = Depends(get_current_resident),
):
    """Проголосовать в опросе."""
    db = get_supabase()
    resident_id = resident["resident_id"]

    # Проверяем, существует ли опрос
    poll = db.table("polls").select("*").eq("id", poll_id).maybe_single().execute()
    if not poll.data:
        raise HTTPException(status_code=404, detail="Опрос не найден")

    # Проверяем, не истёк ли опрос
    ends_at = poll.data.get("ends_at")
    if ends_at:
        try:
            ends = datetime.fromisoformat(ends_at.replace("Z", "+00:00"))
            if ends < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="Опрос завершён")
        except (ValueError, TypeError):
            pass

    # Проверяем, не голосовал ли уже
    existing = db.table("poll_votes").select("id").eq("poll_id", poll_id).eq("resident_id", resident_id).maybe_single().execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Вы уже проголосовали в этом опросе")

    # Проверяем, что вариант ответа существует
    options = poll.data.get("options", [])
    if data.option_index < 0 or data.option_index >= len(options):
        raise HTTPException(status_code=400, detail="Неверный вариант ответа")

    vote_data = {
        "poll_id": poll_id,
        "resident_id": resident_id,
        "option_index": data.option_index,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = db.table("poll_votes").insert(vote_data).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Не удалось сохранить голос")

    logger.info("Vote recorded: poll_id=%s resident_id=%s option=%s", poll_id, resident_id, data.option_index)
    return {"success": True, "message": "Голос учтён"}
