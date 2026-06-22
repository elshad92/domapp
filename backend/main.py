"""
DomApp FastAPI backend.
"""

from __future__ import annotations

import logging
import os
import time
from collections import defaultdict
from logging.handlers import RotatingFileHandler

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response

from backend.routers import announcements, buildings, payments, requests
from backend.routers import auth, reports, residents, tenants, employees
from backend.routers import companies, apartments
from backend.routers import resident_auth, resident_api, click_payments, chat, polls, guest_qr
from backend.auth import JWT_SECRET
from backend.db import get_supabase

# Configure logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FILE = os.getenv("LOG_FILE", "logs/app.log")

# Ensure logs directory exists
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

# File handler with rotation (10MB per file, 5 backups)
file_handler = RotatingFileHandler(LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=5)
file_handler.setFormatter(logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
))

# Console handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter(
    "%(asctime)s - %(levelname)s - %(message)s"
))

# Root logger
root_logger = logging.getLogger()
root_logger.setLevel(LOG_LEVEL)
root_logger.addHandler(file_handler)
root_logger.addHandler(console_handler)

logger = logging.getLogger(__name__)


def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
    origins = [item.strip() for item in raw.split(",") if item.strip()]
    if "*" in origins:
        raise RuntimeError("CORS_ORIGINS must not contain '*' when credentials are enabled")
    return origins


app = FastAPI(title="DomApp API", version="0.3.0")


# Rate limiting (in-memory, сбрасывается при перезапуске)
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))  # запросов
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))       # секунд
_rate_store: dict[str, list[float]] = defaultdict(list)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Простой rate limiter по IP."""
    # Не ограничиваем health check и webhook
    if request.url.path in ("/health", "/api/v1/payments/webhook"):
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW

    # Очищаем старые записи
    timestamps = _rate_store[client_ip]
    _rate_store[client_ip] = [t for t in timestamps if t > window_start]

    if len(_rate_store[client_ip]) >= RATE_LIMIT_REQUESTS:
        logger.warning(
            "Rate limit exceeded for %s (%d requests in %ds)",
            client_ip,
            RATE_LIMIT_REQUESTS,
            RATE_LIMIT_WINDOW,
        )
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please try again later."},
        )

    _rate_store[client_ip].append(now)
    return await call_next(request)


# === Кастомный CORS middleware (обрабатывает preflight и добавляет заголовки) ===
@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    """Обрабатывает CORS preflight (OPTIONS) и добавляет CORS заголовки ко всем ответам."""
    # Preflight
    if request.method == "OPTIONS":
        origin = request.headers.get("origin", "")
        allowed = _cors_origins()
        if origin in allowed:
            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Internal-Key",
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Max-Age": "600",
                },
            )
        return Response(status_code=200)

    # Обычный запрос — добавляем CORS заголовки к ответу
    response = await call_next(request)
    origin = request.headers.get("origin", "")
    allowed = _cors_origins()
    if origin in allowed:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-Internal-Key"
    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests and their duration."""
    start_time = time.time()

    response = await call_next(request)

    duration = time.time() - start_time
    logger.info(
        f"{request.method} {request.url.path} - {response.status_code} - {duration:.3f}s"
    )

    return response


for router in [
    auth.router,
    residents.router,
    requests.router,
    announcements.router,
    buildings.router,
    payments.router,
    reports.router,
    tenants.router,
    employees.router,
    companies.router,
    apartments.router,
    resident_auth.router,
    resident_api.router,
    click_payments.router,
    chat.router,
    polls.router,
    guest_qr.router,
]:
    app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint with dependency checks."""
    health_status = {"status": "healthy", "version": "0.3.0", "checks": {}}

    # Check Supabase connectivity
    try:
        db = get_supabase()
        # Try a simple query
        db.table("companies").select("count").limit(1).execute()
        health_status["checks"]["supabase"] = "ok"
    except Exception as e:
        health_status["checks"]["supabase"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    # Check JWT secret is configured
    if not JWT_SECRET or JWT_SECRET == "dev-secret-do-not-use-in-production":
        health_status["checks"]["jwt"] = "misconfigured"
        health_status["status"] = "degraded"
    else:
        health_status["checks"]["jwt"] = "ok"

    # Return 200 if healthy, 503 if degraded
    status_code = 200 if health_status["status"] == "healthy" else 503
    return JSONResponse(content=health_status, status_code=status_code)


# === Refresh token endpoint ===
from pydantic import BaseModel
from backend.auth import decode_token, create_token


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@app.post("/api/v1/auth/refresh", response_model=RefreshResponse)
async def refresh_access_token(data: RefreshRequest):
    """Обновить access token с помощью refresh token."""
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token required")

    company_id = payload["company_id"]
    company_name = payload.get("company_name", "")
    plan = payload.get("plan", "basic")

    new_token = create_token(company_id, company_name, plan)
    return {"access_token": new_token}
