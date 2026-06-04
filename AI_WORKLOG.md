# DomApp AI Worklog

Date: 2026-06-03

This file is a handoff note for future AI/developer work in this project.

## What Was Fixed

- Rebuilt `backend/db.py` so the custom Supabase REST wrapper supports the query methods used by routers:
  - `select`, `insert`, `update`, `delete`
  - `eq`, `in_`, `gte`, `lte`
  - `maybe_single`, `single`, `order`, `limit`
  - result access through both `.data` and `["data"]`
- Rebuilt `backend/auth.py`:
  - no default JWT secret
  - rejects `CHANGE_ME_*` placeholders
  - validates token payload contains `company_id`
  - uses constant-time comparison for `INTERNAL_API_KEY`
- Rebuilt `backend/main.py`:
  - removed wildcard CORS
  - added `CORS_ORIGINS` env configuration
  - rejects `*` with credentials enabled
- Rebuilt `backend/routers/buildings.py`:
  - company ownership now comes from JWT only
  - client-provided `company_id` is ignored on create
- Rebuilt `backend/routers/requests.py`:
  - list and update are restricted to buildings owned by the JWT company
  - fixed use of the custom DB result object
  - blocks updating another company's request by ID
- Rebuilt `backend/routers/announcements.py`:
  - uses `company_id` from JWT
  - validates `building_id` belongs to the current company
  - fixed notification lookup through apartments/residents
- Rebuilt `backend/routers/reports.py`:
  - uses `company_id` and `company_name` from JWT correctly
  - filters report data to the current company's buildings
  - validates date order
- Rebuilt `backend/routers/payments.py`:
  - Payme Basic Auth now requires configured non-placeholder `PAYME_KEY`
  - rejects empty Payme key
  - uses constant-time comparison
  - checks payment amount in `CheckPerformTransaction`
- Replaced exposed real secrets in project files with `CHANGE_ME_*` placeholders.
- Replaced `.env` with a safe placeholder template and added `CORS_ORIGINS`.

## Critical Manual Follow-Up

Previously exposed secrets must be considered compromised. Rotate them before running or deploying:

- Server/root SSH password or SSH credentials
- Supabase service role key
- Supabase anon/publishable key if needed
- Telegram bot token via BotFather
- DeepSeek API key
- `JWT_SECRET`
- `INTERNAL_API_KEY`
- Payme credentials before enabling payments

Do not reuse any old values that appeared in this folder.

## Current Startup Expectations

The app should intentionally fail fast if these are missing or still placeholders:

- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `PAYME_KEY` for Payme webhook authorization

Fill `.env` with fresh real values before starting services.

## Important Invariants For Future Work

- The backend uses Supabase `service_role`, so RLS does not protect API mistakes. Every tenant check must happen in FastAPI routers.
- Never trust `company_id` from frontend/localStorage/query params for authorization.
- Use `company["company_id"]` from JWT as the source of truth.
- Before returning or mutating building/request/announcement/report data, verify it belongs to the JWT company.
- Do not add wildcard CORS with credentials.
- Do not commit or store live secrets in scripts, docs, `.env`, screenshots, or generated fix files.
- Keep the custom `backend/db.py` wrapper API compatible with existing router chains.

## Known Remaining Risks

- The folder is not a git repository. Initialize git before further changes so future audits can diff and roll back safely.
- Several legacy deploy/fix scripts still contain placeholder SSH variables and root-based deployment patterns. Prefer replacing them with key-based, non-root deployment before production use.
- Existing Russian text in older files appears mojibaked because of prior encoding damage. New security-critical files were rewritten in ASCII to avoid making that worse.
