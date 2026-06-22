"""
DomApp — Reports (отчёты для УК)
Статистика по заявкам, платежам, жильцам + PDF генерация
"""

from __future__ import annotations

import io
import logging
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

from backend.auth import get_current_company
from backend.db import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(tags=["reports"])


def _company_building_ids(db, company_id: int) -> list[int]:
    result = db.table("buildings").select("id").eq("company_id", company_id).execute()
    return [row["id"] for row in (result.data or [])]


@router.get("/reports/summary")
async def get_summary(
    company: dict = Depends(get_current_company),
):
    """Общая статистика по компании."""
    db = get_supabase()
    company_id = company["company_id"]
    building_ids = _company_building_ids(db, company_id)

    if not building_ids:
        return {
            "buildings": 0,
            "apartments": 0,
            "residents": 0,
            "requests": {"total": 0, "new": 0, "in_progress": 0, "done": 0},
            "payments": {"total": 0, "paid": 0, "pending": 0},
        }

    # Количество домов
    buildings_count = len(building_ids)

    # Количество квартир
    apartments = db.table("apartments").select("id").in_("building_id", building_ids).execute()
    apartments_count = len(apartments.data or [])

    # Количество жильцов
    if apartments.data:
        apartment_ids = [a["id"] for a in apartments.data]
        residents = db.table("residents").select("id").in_("apartment_id", apartment_ids).execute()
        residents_count = len(residents.data or [])
    else:
        residents_count = 0

    # Статистика по заявкам
    requests_total = db.table("requests").select("id").in_("building_id", building_ids).execute()
    requests_new = (
        db.table("requests").select("id").in_("building_id", building_ids).eq("status", "new").execute()
    )
    requests_progress = (
        db.table("requests").select("id").in_("building_id", building_ids).eq("status", "in_progress").execute()
    )
    requests_done = (
        db.table("requests").select("id").in_("building_id", building_ids).eq("status", "done").execute()
    )

    # Статистика по платежам
    if apartments.data:
        resident_ids = [r["id"] for r in (residents.data or [])]
        if resident_ids:
            payments_total = (
                db.table("payments").select("id").in_("resident_id", resident_ids).execute()
            )
            payments_paid = (
                db.table("payments").select("id").in_("resident_id", resident_ids).eq("status", "paid").execute()
            )
            payments_pending = (
                db.table("payments").select("id").in_("resident_id", resident_ids).eq("status", "pending").execute()
            )
        else:
            payments_total = payments_paid = payments_pending = type("obj", (), {"data": []})()
    else:
        payments_total = payments_paid = payments_pending = type("obj", (), {"data": []})()

    return {
        "buildings": buildings_count,
        "apartments": apartments_count,
        "residents": residents_count,
        "requests": {
            "total": len(requests_total.data or []),
            "new": len(requests_new.data or []),
            "in_progress": len(requests_progress.data or []),
            "done": len(requests_done.data or []),
        },
        "payments": {
            "total": len(payments_total.data or []),
            "paid": len(payments_paid.data or []),
            "pending": len(payments_pending.data or []),
        },
    }


@router.get("/reports/requests-by-category")
async def get_requests_by_category(
    company: dict = Depends(get_current_company),
):
    """Заявки по категориям."""
    db = get_supabase()
    company_id = company["company_id"]
    building_ids = _company_building_ids(db, company_id)

    if not building_ids:
        return []

    requests = db.table("requests").select("category, status").in_("building_id", building_ids).execute()
    categories = {}
    for req in requests.data or []:
        cat = req.get("category", "other")
        if cat not in categories:
            categories[cat] = {"category": cat, "total": 0, "new": 0, "in_progress": 0, "done": 0}
        categories[cat]["total"] += 1
        status = req.get("status", "new")
        if status in categories[cat]:
            categories[cat][status] += 1

    return list(categories.values())


@router.get("/reports/payments-by-month")
async def get_payments_by_month(
    year: int | None = None,
    company: dict = Depends(get_current_company),
):
    """Платежи по месяцам."""
    db = get_supabase()
    company_id = company["company_id"]
    building_ids = _company_building_ids(db, company_id)

    if not building_ids:
        return []

    # Получаем все квартиры компании
    apartments = db.table("apartments").select("id").in_("building_id", building_ids).execute()
    if not apartments.data:
        return []

    apartment_ids = [a["id"] for a in apartments.data]
    residents = db.table("residents").select("id").in_("apartment_id", apartment_ids).execute()
    if not residents.data:
        return []

    resident_ids = [r["id"] for r in residents.data]
    payments = db.table("payments").select("period, amount, status").in_("resident_id", resident_ids).execute()

    months = {}
    for pay in payments.data or []:
        period = pay.get("period", "")
        if year and not period.startswith(str(year)):
            continue
        if period not in months:
            months[period] = {"period": period, "total": 0, "paid": 0, "pending": 0, "amount": 0}
        months[period]["total"] += 1
        if pay.get("status") == "paid":
            months[period]["paid"] += 1
            months[period]["amount"] += float(pay.get("amount", 0))
        else:
            months[period]["pending"] += 1

    return sorted(months.values(), key=lambda x: x["period"], reverse=True)


# ============================================================
# PDF Report generation
# ============================================================


def _company_building_ids_all(db, company_id: int) -> list[int]:
    """Get all building IDs for a company (helper)."""
    result = db.table("buildings").select("id").eq("company_id", company_id).execute()
    return [row["id"] for row in (result.data or [])]


@router.get("/reports")
async def download_report(
    date_from: str | None = None,
    date_to: str | None = None,
    company: dict = Depends(get_current_company),
):
    """
    Generate and download a PDF report with request statistics.
    """
    db = get_supabase()
    company_id = company["company_id"]
    company_name = company.get("company_name", "УК")

    # Get company info
    company_info = db.table("companies").select("*").eq("id", company_id).maybe_single().execute()
    company_data = company_info.data or {}

    # Get buildings
    building_ids = _company_building_ids_all(db, company_id)
    buildings = []
    if building_ids:
        bld_result = db.table("buildings").select("*").in_("id", building_ids).execute()
        buildings = bld_result.data or []

    # Get requests with optional date filter
    req_query = db.table("requests").select("*")
    if building_ids:
        req_query = req_query.in_("building_id", building_ids)
    if date_from:
        req_query = req_query.gte("created_at", date_from)
    if date_to:
        req_query = req_query.lte("created_at", date_to)
    requests_data = req_query.order("created_at", desc=True).execute().data or []

    # Count by status
    status_counts = {"new": 0, "in_progress": 0, "done": 0}
    for r in requests_data:
        s = r.get("status", "new")
        if s in status_counts:
            status_counts[s] += 1

    # Count by category
    category_counts = {}
    for r in requests_data:
        cat = r.get("category", "other")
        category_counts[cat] = category_counts.get(cat, 0) + 1

    # Generate PDF
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph("DomApp — Отчёт по заявкам", styles["Title"]))
    elements.append(Spacer(1, 6 * mm))
    elements.append(Paragraph(f"<b>Компания:</b> {company_data.get('name', company_name)}", styles["Normal"]))
    elements.append(Paragraph(f"<b>Email:</b> {company_data.get('email', '—')}", styles["Normal"]))
    elements.append(Paragraph(f"<b>Телефон:</b> {company_data.get('phone', '—')}", styles["Normal"]))
    if date_from and date_to:
        elements.append(Paragraph(f"<b>Период:</b> {date_from} — {date_to}", styles["Normal"]))
    now_str = datetime.now().strftime("%d.%m.%Y %H:%M")
    elements.append(Paragraph(f"<b>Дата формирования:</b> {now_str}", styles["Normal"]))
    elements.append(Spacer(1, 8 * mm))

    # Summary section
    elements.append(Paragraph("<b>Сводка</b>", styles["Heading2"]))
    elements.append(Spacer(1, 3 * mm))

    summary_data = [
        ["Показатель", "Значение"],
        ["Всего заявок", str(len(requests_data))],
        ["Новые", str(status_counts["new"])],
        ["В работе", str(status_counts["in_progress"])],
        ["Выполнено", str(status_counts["done"])],
        ["Домов", str(len(buildings))],
    ]
    summary_table = Table(summary_data, colWidths=[120 * mm, 50 * mm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F4F6")]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 8 * mm))

    # By category section
    if category_counts:
        elements.append(Paragraph("<b>По категориям</b>", styles["Heading2"]))
        elements.append(Spacer(1, 3 * mm))
        cat_data = [["Категория", "Количество"]]
        for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
            cat_data.append([cat, str(count)])
        cat_table = Table(cat_data, colWidths=[120 * mm, 50 * mm])
        cat_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F4F6")]),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(cat_table)
        elements.append(Spacer(1, 8 * mm))

    # Recent requests table
    elements.append(Paragraph("<b>Последние заявки</b>", styles["Heading2"]))
    elements.append(Spacer(1, 3 * mm))

    status_labels = {"new": "Новая", "in_progress": "В работе", "done": "Выполнено"}
    req_table_data = [["ID", "Категория", "Статус", "Дата"]]
    for r in requests_data[:50]:  # max 50 in PDF
        created = r.get("created_at", "")
        if created:
            try:
                created = datetime.fromisoformat(created.replace("Z", "+00:00")).strftime("%d.%m.%Y")
            except (ValueError, TypeError):
                created = created[:10]
        req_table_data.append([
            str(r.get("id", "")),
            r.get("category", ""),
            status_labels.get(r.get("status", ""), r.get("status", "")),
            created,
        ])

    if len(req_table_data) > 1:
        req_table = Table(req_table_data, colWidths=[20 * mm, 50 * mm, 40 * mm, 40 * mm])
        req_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F4F6")]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(req_table)
    else:
        elements.append(Paragraph("Нет заявок за выбранный период.", styles["Normal"]))

    doc.build(elements)
    buf.seek(0)

    filename = f"report_{company_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
