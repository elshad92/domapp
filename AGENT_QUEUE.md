# DomApp Agent Queue

Date: 2026-06-20

Coordinator: Codex

## Active Assignments

### Cline

Status: completed via multi-agent runtime

Agent id: `019ee498-5ba9-7c92-8911-4fd3c283a33d`

Open `CLINE_TASK.md`.

Goal: stabilize backend/bot runtime hazards.

Files allowed:

- `backend/`
- `bot/`
- `supabase/`
- docs only for handoff

First deliverable:

- fix or report the missing `logger` issue in `backend/main.py`
- audit Telegram `409 Conflict`
- verify whether Supabase schema covers router tables
- run the verification commands from `CLINE_TASK.md`

### Roo Code

Status: completed via multi-agent runtime

Agent id: `019ee498-80c0-7461-a9a9-7cb89fe7e30d`

Open `ROO_TASK.md`.

Goal: improve web/mobile product UI without touching backend.

Files allowed:

- `frontend/`
- `mobile/`
- docs only for handoff

First deliverable:

- add or plan Tenants / Employees / Payments web pages using existing UI patterns
- run `npm run build` in `frontend`
- report any backend contract gaps

## Integration Rules

- Codex reviews both outputs before merge/commit/deploy.
- Agents must not touch `.env`, logs, virtualenvs, node_modules, or build output.
- Agents must not commit.
- Agents must report changed files and verification output.

## Current Coordinator Notes

- Backend uses `.\venv`; `.\venv312` is not valid for backend checks.
- Frontend build currently passes.
- Mobile dependencies currently show missing `react-dom` and `react-native-web`.
- There are already many local uncommitted changes; do not revert them.
- Bot logs show active or recent Telegram polling conflicts.
- Integration pass removed duplicate `/auth/register` and `/auth/login` routes from `backend/routers/companies.py`; `backend/routers/auth.py` remains the single auth source used by the web login.
