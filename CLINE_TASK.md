# Cline Task — DomApp Backend/Bot Stabilization

Date: 2026-06-20

You are working in:

`C:\Users\user\Desktop\domapp`

Read `AI_COORDINATION.md` first.

## Scope

Work only on backend and Telegram bot stabilization:

- `backend/`
- `bot/`
- `supabase/`
- docs only when needed for handoff

Do not edit:

- `.env`
- `frontend/`
- `mobile/`
- `venv/`, `venv312/`
- log files

## Task

Make the backend/bot safer to run locally without changing product behavior.

### Required Checks

1. Fix `backend/main.py` so rate limiting cannot crash because of a missing
   logger.
2. Audit Telegram polling startup in `bot/main.py`.
   - Current logs show `409 Conflict`.
   - Do not start or stop the bot unless the user explicitly asks.
   - Propose a minimal code hardening if needed, but do not hide the conflict.
3. Check whether `supabase/schema.sql` includes all tables used by current
   routers:
   - `companies`
   - `buildings`
   - `apartments`
   - `residents`
   - `requests`
   - `announcements`
   - `payments`
   - `tenants`
   - `employees`
4. If schema is missing tables/columns used by routers, add a migration file
   under `supabase/migrations/` instead of editing old migrations.

## Verification

Use the working Python environment:

```powershell
$env:PYTHONPATH=(Get-Location).Path
.\venv\Scripts\python.exe -m compileall -q backend bot
.\venv\Scripts\python.exe -c "from fastapi.testclient import TestClient; from backend.main import app; r=TestClient(app).get('/health'); print(r.status_code, r.json())"
```

Do not use `.\venv312` for backend checks.

## Handoff

Report:

- files changed
- verification output
- any remaining runtime risk
- whether Supabase manual SQL action is still required
