# DomApp AI Coordination

Date: 2026-06-20

This project may be worked on by Codex, Roo Code, and Cline. Keep work split by
area and leave clear handoff notes.

## Current Baseline

- Main project: `C:\Users\user\Desktop\domapp`
- Branch: `master`
- Git remote: not configured
- Working tree: already dirty before this coordination file was added
- Backend runtime: use `.\venv`, not `.\venv312`
- Backend health check passes locally with `.\venv`
- Frontend build passes
- Mobile dependencies are currently incomplete
- Telegram bot logs show `409 Conflict`, likely from more than one bot instance

## Hard Rules

- Do not print, copy, commit, or paste `.env` values.
- Do not edit `.env` unless the user explicitly asks.
- Do not commit or push unless the user explicitly asks.
- Do not delete existing local changes.
- Do not work inside `venv`, `venv312`, `node_modules`, `dist`, or log files.
- Before changing a file, check `git status --short` and stay inside your lane.
- After work, report changed files and exact verification commands.

## Ownership

### Codex

- Owns repo orientation, task split, integration, final review, and verification.
- Owns backend safety bugs that affect all flows.
- Owns Git cleanup decisions and final handoff.

### Roo Code

- Owns web/mobile product UI tasks only.
- Should avoid backend authorization, payments, and bot polling logic.
- Current task file: `ROO_TASK.md`.

### Cline

- Owns backend/bot operational hardening only.
- Should avoid frontend/mobile UI unless explicitly reassigned.
- Current task file: `CLINE_TASK.md`.

## Immediate Priority

1. Stabilize backend/bot runtime hazards.
2. Fill missing frontend/mobile management pages after backend contracts are clear.
3. Verify Payme separately.
4. Only then prepare deploy/GitHub cleanup.

## Known Risks

- `backend/main.py` uses `logger.warning` without a module logger.
- `mobile` is a nested git repository but the parent repository has no
  `.gitmodules`; treat it carefully.
- `venv312` does not contain backend dependencies such as FastAPI.
- Bot logs contain Telegram API URLs; do not commit logs.
