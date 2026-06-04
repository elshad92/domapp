"""
Reports API.
"""

from __future__ import annotations

import io
import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from backend.auth import get_current_company
from backend.db import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(tags=["reports"])

try:
    pdfmetrics.registerFont(TTFont("DejaVu", "DejaVuSans.ttf"))
    FONT = "DejaVu"
except Exception:
    FONT = "Helvetica"


@router.get("/reports")
async def generate_report(
    date_from: date = Query(..., description="Start date, YYYY-MM-DD"),
    date_to: date = Query(..., description="End date, YYYY-MM-DD"),
    company: dict = Depends(get_current_company),
):
    if date_from > date_to:
        raise HTTPException(status_code=400, detail="date_from must be before date_to")

    db = get_supabase()
    company_id = company["company_id"]
    company_name = company.get("company_name", f"Company #{company_id}")

    buildings = db.table("buildings").select("id,address").eq("company_id", company_id).execute()
    building_ids = [row["id"] for row in (buildings.data or [])]
    building_map = {row["id"]: row["address"] for row in (buildings.data or [])}

    if not building_ids:
        raise HTTPException(status_code=404, detail="No buildings found for this company")

    requests = (
        db.table("requests")
        .select("*")
        .in_("building_id", building_ids)
        .gte("created_at", date_from.isoformat())
        .lte("created_at", date_to.isoformat())
        .order("created_at", desc=True)
        .execute()
    )
    request_rows = requests.data or []

    total = len(request_rows)
    new_count = sum(1 for row in request_rows if row["status"] == "new")
    in_progress_count = sum(1 for row in request_rows if row["status"] == "in_progress")
    done_count = sum(1 for row in request_rows if row["status"] == "done")

    buf = io.BytesIO()
    pdf = canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    pdf.setFont(FONT, 16)
    pdf.drawString(20 * mm, height - 20 * mm, "Requests report")
    pdf.setFont(FONT, 12)
    pdf.drawString(20 * mm, height - 30 * mm, f"Company: {company_name}")
    pdf.drawString(20 * mm, height - 38 * mm, f"Period: {date_from} - {date_to}")
    pdf.drawString(20 * mm, height - 46 * mm, f"Generated: {date.today()}")

    pdf.setFont(FONT, 14)
    pdf.drawString(20 * mm, height - 60 * mm, "Stats:")
    pdf.setFont(FONT, 12)
    pdf.drawString(20 * mm, height - 70 * mm, f"Total: {total}")
    pdf.drawString(20 * mm, height - 78 * mm, f"New: {new_count}")
    pdf.drawString(20 * mm, height - 86 * mm, f"In progress: {in_progress_count}")
    pdf.drawString(20 * mm, height - 94 * mm, f"Done: {done_count}")

    y = height - 110 * mm
    pdf.setFont(FONT, 14)
    pdf.drawString(20 * mm, y, "Requests:")
    y -= 10 * mm

    pdf.setFont(FONT, 10)
    for row in request_rows:
        if y < 20 * mm:
            pdf.showPage()
            pdf.setFont(FONT, 10)
            y = height - 20 * mm

        address = building_map.get(row["building_id"], f"Building #{row['building_id']}")
        created = row["created_at"][:10] if row.get("created_at") else "-"
        desc = row.get("description", "")
        if len(desc) > 60:
            desc = desc[:57] + "..."
        pdf.drawString(20 * mm, y, f"{created} | {address} | {row['status']} | {desc}")
        y -= 6 * mm

    pdf.save()
    buf.seek(0)

    filename = f"report_{company_id}_{date_from}_{date_to}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
