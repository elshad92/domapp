"""
DomApp — Seed demo data for demo@domapp.uz company.
Run once after deploy: python seed_demo.py
"""

import logging
import sys
from backend.db import get_supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

DEMO_EMAIL = "demo@domapp.uz"


def get_demo_company(supabase):
    result = supabase.table("companies").select("*").eq("email", DEMO_EMAIL).maybe_single().execute()
    return result.data


def seed_buildings(supabase, company_id: int):
    buildings_data = [
        {"company_id": company_id, "address": "ул. Амира Темура, 100", "district": "Мирабадский", "floors": 9, "apartments_count": 36},
        {"company_id": company_id, "address": "ул. Чиланзар, 25", "district": "Чиланзарский", "floors": 5, "apartments_count": 20},
    ]
    ids = []
    for b in buildings_data:
        existing = supabase.table("buildings").select("id").eq("company_id", company_id).eq("address", b["address"]).maybe_single().execute()
        if existing.data:
            ids.append(existing.data["id"])
            continue
        result = supabase.table("buildings").insert(b).execute()
        if result.data:
            ids.append(result.data[0]["id"])
            logger.info("Building created: %s", b["address"])
    return ids


def seed_apartments(supabase, company_id: int, building_ids: list[int]):
    apts = []
    for bid in building_ids:
        existing = supabase.table("apartments").select("id").eq("building_id", bid).execute()
        if existing.data and len(existing.data) >= 5:
            continue
        for i in range(1, 6):
            apts.append({"building_id": bid, "number": str(i), "floor": (i - 1) // 2 + 1})
    if not apts:
        return
    result = supabase.table("apartments").insert(apts).execute()
    if result.data:
        logger.info("Apartments created: %d", len(result.data))


def seed_residents(supabase, company_id: int, building_ids: list[int]):
    # Get apartments
    all_apts = []
    for bid in building_ids:
        result = supabase.table("apartments").select("*").eq("building_id", bid).execute()
        if result.data:
            all_apts.extend(result.data)

    residents_data = [
        {"apartment_id": all_apts[0]["id"], "name": "Алишер Каримов", "phone": "+998901111111"},
        {"apartment_id": all_apts[1]["id"], "name": "Нигора Азимова", "phone": "+998902222222"},
        {"apartment_id": all_apts[2]["id"] if len(all_apts) > 2 else all_apts[0]["id"], "name": "Бахром Усманов", "phone": "+998903333333"},
    ]
    for r in residents_data:
        existing = supabase.table("residents").select("id").eq("phone", r["phone"]).maybe_single().execute()
        if existing.data:
            continue
        result = supabase.table("residents").insert(r).execute()
        if result.data:
            logger.info("Resident created: %s", r["name"])


def seed_requests(supabase, company_id: int, building_ids: list[int]):
    # Get residents
    all_residents = []
    for bid in building_ids:
        apts = supabase.table("apartments").select("id").eq("building_id", bid).execute()
        if apts.data:
            for apt in apts.data:
                res = supabase.table("residents").select("*").eq("apartment_id", apt["id"]).maybe_single().execute()
                if res.data:
                    all_residents.append(res.data)

    if not all_residents:
        return

    import random
    requests_data = [
        {"company_id": company_id, "building_id": building_ids[0], "resident_id": all_residents[0]["id"],
         "category": "сантехника", "description": "Течёт кран на кухне", "status": "new"},
        {"company_id": company_id, "building_id": building_ids[0], "resident_id": all_residents[0]["id"],
         "category": "электрика", "description": "Розетка не работает", "status": "in_progress"},
        {"company_id": company_id, "building_id": building_ids[1] if len(building_ids) > 1 else building_ids[0],
         "resident_id": all_residents[-1]["id"], "category": "отопление", "description": "Батарея холодная", "status": "done"},
        {"company_id": company_id, "building_id": building_ids[0], "resident_id": all_residents[0]["id"],
         "category": "уборка", "description": "Мусор не вывезли", "status": "new"},
    ]
    for r in requests_data:
        result = supabase.table("requests").insert(r).execute()
        if result.data:
            logger.info("Request created: %s", r["description"][:30])


def seed_payments(supabase, company_id: int, building_ids: list[int]):
    # Get residents
    all_residents = []
    for bid in building_ids:
        apts = supabase.table("apartments").select("id").eq("building_id", bid).execute()
        if apts.data:
            for apt in apts.data:
                res = supabase.table("residents").select("*").eq("apartment_id", apt["id"]).maybe_single().execute()
                if res.data:
                    all_residents.append(res.data)

    if not all_residents:
        return

    payments_data = [
        {"company_id": company_id, "resident_id": all_residents[0]["id"], "amount": 350000, "status": "paid", "period": "2026-01"},
        {"company_id": company_id, "resident_id": all_residents[0]["id"], "amount": 350000, "status": "paid", "period": "2026-02"},
        {"company_id": company_id, "resident_id": all_residents[0]["id"], "amount": 350000, "status": "pending", "period": "2026-03"},
        {"company_id": company_id, "resident_id": all_residents[-1]["id"], "amount": 420000, "status": "paid", "period": "2026-01"},
        {"company_id": company_id, "resident_id": all_residents[-1]["id"], "amount": 420000, "status": "paid", "period": "2026-02"},
    ]
    for p in payments_data:
        result = supabase.table("payments").insert(p).execute()
        if result.data:
            logger.info("Payment created: %s %s", p["period"], p["amount"])


def seed_polls(supabase, company_id: int, building_ids: list[int]):
    polls_data = [
        {"company_id": company_id, "building_id": building_ids[0],
         "question": "Нужна ли видеонаблюдение во дворе?", "options": ["Да", "Нет", "Не знаю"]},
        {"company_id": company_id, "building_id": building_ids[0],
         "question": "Устраивает ли вас работа УК?", "options": ["Отлично", "Хорошо", "Удовлетворительно", "Плохо"]},
    ]
    for p in polls_data:
        existing = supabase.table("polls").select("id").eq("company_id", company_id).eq("question", p["question"]).maybe_single().execute()
        if existing.data:
            continue
        result = supabase.table("polls").insert(p).execute()
        if result.data:
            logger.info("Poll created: %s", p["question"][:40])


def seed_announcements(supabase, company_id: int, building_ids: list[int]):
    announcements = [
        {"company_id": company_id, "building_id": building_ids[0],
         "text": "Уважаемые жильцы! 15 марта с 10:00 до 16:00 будет отключена горячая вода в связи с профилактическими работами."},
        {"company_id": company_id, "building_id": building_ids[0],
         "text": "Напоминаем о необходимости оплаты коммунальных услуг до 25 числа каждого месяца."},
        {"company_id": company_id, "building_id": None,
         "text": "В нашем доме запущена система электронных заявок! Теперь вы можете подать заявку через приложение DomApp."},
    ]
    for a in announcements:
        result = supabase.table("announcements").insert(a).execute()
        if result.data:
            logger.info("Announcement created: %s", a["text"][:40])


def main():
    supabase = get_supabase()
    company = get_demo_company(supabase)
    if not company:
        logger.error("Demo company not found. Run the server first and login via /auth/demo-login")
        sys.exit(1)

    company_id = company["id"]
    logger.info("Seeding data for demo company: id=%s name=%s", company_id, company["name"])

    building_ids = seed_buildings(supabase, company_id)
    seed_apartments(supabase, company_id, building_ids)
    seed_residents(supabase, company_id, building_ids)
    seed_requests(supabase, company_id, building_ids)
    seed_payments(supabase, company_id, building_ids)
    seed_polls(supabase, company_id, building_ids)
    seed_announcements(supabase, company_id, building_ids)

    logger.info("Demo data seeding complete!")


if __name__ == "__main__":
    main()
