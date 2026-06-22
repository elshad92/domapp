# Roo Task — DomApp Web/Mobile Product UI

Date: 2026-06-20

You are working in:

`C:\Users\user\Desktop\domapp`

Read `AI_COORDINATION.md` first.

## Scope

Work only on UI/product surfaces:

- `frontend/`
- `mobile/`
- docs only when needed for handoff

Do not edit:

- `.env`
- `backend/`
- `bot/`
- `supabase/`
- `venv/`, `venv312/`
- log files

## Current State

- Frontend build currently passes.
- Mobile has incomplete dependencies: `react-dom` and `react-native-web` show
  as unmet/missing.
- Existing web routes: Login, Dashboard, Buildings, Requests, Request detail,
  Announcements, Reports.
- Missing product pages called out by project docs:
  - Tenants
  - Employees
  - Payments

## Task

Create a UI plan first, then implement only one small slice unless the user says
to continue.

Recommended first slice:

1. Add web navigation/routes/pages for Tenants, Employees, and Payments.
2. Use existing `frontend/src/api.js` and existing page style patterns.
3. Keep empty/loading/error states useful and short.
4. Do not invent fake data.
5. If an API endpoint is missing or unclear, show an honest empty/error state
   and document the backend contract needed.

## Verification

```powershell
cd frontend
npm run build
```

For mobile work, first fix/install dependencies intentionally, then run:

```powershell
cd mobile
npm ls --depth=0
npx expo start --web
```

Do not browse Expo docs unless you are changing mobile code. If you change
mobile code, follow `mobile/AGENTS.md` and use Expo v56 docs.

## Handoff

Report:

- files changed
- screenshots or route names tested
- `npm run build` result
- any backend contract still needed
