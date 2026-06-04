# Задача для Claude — DomApp

## Статус проекта
- ✅ Backend (FastAPI) — работает на http://localhost:8000
- ✅ Frontend (Vite + React) — работает на http://localhost:3000
- ⏳ Telegram бот — не запущен
- ⏳ .env — не настроен
- ⏳ Supabase — не подключён

## Что нужно сделать

### 1. Настроить .env
Создать `domapp/.env` из `domapp/.env.example` и прописать реальные значения:
- `SUPABASE_URL` — URL твоего Supabase проекта
- `SUPABASE_SERVICE_KEY` — service_role ключ из Supabase
- `TELEGRAM_BOT_TOKEN` — токен от @BotFather
- `JWT_SECRET` — любой сложный секрет (можно сгенерировать)
- `INTERNAL_API_KEY` — любой сложный ключ для бота

Используй инструмент `check_env` чтобы проверить, и `setup_env` чтобы создать.

### 2. Выполнить SQL схему в Supabase
Файл: `domapp/supabase/schema.sql`
Нужно открыть Supabase SQL Editor и выполнить этот SQL.
Используй инструмент `run_schema` чтобы посмотреть SQL.

### 3. Запустить Telegram бота
После настройки .env запусти бота:
```
python -m bot.main
```
Или используй инструмент `start_bot`.

### 4. Проверить healthcheck
Используй инструмент `healthcheck` чтобы убедиться что всё работает.

### 5. Деплой на сервер (опционально)
Если нужно задеплоить — используй deploy агента.

## Инструменты DomApp Agent
У тебя есть доступ к `domapp-agent` со следующими инструментами:
- `healthcheck` — проверить всё сразу
- `start_backend`, `start_frontend`, `start_bot` — запуск сервисов
- `stop_service` — остановка сервиса
- `check_env`, `setup_env` — управление .env
- `review_python_code` — проверка Python кода
- `run_schema` — показать SQL схему
- `project_status` — полный статус проекта

## Структура проекта
```
domapp/
├── backend/          # FastAPI (Python)
│   ├── main.py       # точка входа
│   ├── db.py         # REST клиент Supabase
│   ├── routers/      # auth, buildings, requests, residents, etc.
│   └── models/       # Pydantic схемы
├── bot/              # Telegram бот (Python)
│   ├── main.py       # точка входа
│   ├── api.py        # HTTP клиент для backend
│   └── handlers/     # start, request, status, announcements
├── frontend/         # React + Vite
│   └── src/
│       ├── pages/    # Login, Dashboard, Buildings, Requests, etc.
│       └── components/
└── supabase/
    └── schema.sql    # SQL схема БД
```
