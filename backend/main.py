"""
DomApp FastAPI backend.
"""

from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import announcements, buildings, payments, requests
from backend.routers import auth, reports, residents

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
    origins = [item.strip() for item in raw.split(",") if item.strip()]
    if "*" in origins:
        raise RuntimeError("CORS_ORIGINS must not contain '*' when credentials are enabled")
    return origins


app = FastAPI(title="DomApp API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Internal-Key"],
)

for router in [
    auth.router,
    residents.router,
    requests.router,
    announcements.router,
    buildings.router,
    payments.router,
    reports.router,
]:
    app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.3.0"}
