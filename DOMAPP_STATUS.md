# DomApp — Статус проекта

> Последнее обновление: 2026-06-04 21:10

## Локальная среда (Windows)
- **Backend:** FastAPI — зависимости установлены, импорты работают
- **Frontend:** React + Vite — зависимости установлены, сборка проходит успешно
- **Telegram Bot:** зависимости установлены
- **Git:** инициализирован, все изменения закоммичены

---

## ✅ Что сделано (локально)

### 1. Установлены все зависимости
- Backend: FastAPI, uvicorn, httpx, PyJWT, python-jose, passlib, reportlab и др.
- Bot: python-telegram-bot, openai, httpx
- Frontend: React, Vite, Tailwind, axios, react-router-dom

### 2. Исправлены критические баги

#### Backend
- **BuildingCreate schema:** удалено поле `company_id` (backend использует JWT, не доверяет клиенту)
- **JWT_SECRET:** теперь не падает с RuntimeError при дефолтном значении — использует dev-секрет с предупреждением
- **Supabase client:** добавлен mock-клиент для разработки без Supabase (возвращает пустые данные)
- **Announcements:** добавлен эндпоинт `/bot/announcements` для бота (использует internal key вместо JWT)

#### Frontend
- **Buildings.jsx:** удалена отправка `company_id` в query params и POST body
- **Announcements.jsx:** удалена отправка `company_id` в query params
- **Requests.jsx:** удалена отправка `company_id` в query params

#### Telegram Bot
- **request.py:** исправлено `apartment_id` → `building_id` при создании заявки
- **announcements.py:** исправлено `apartment_id` → `building_id` при получении объявлений
- **api.py:** изменён путь с `/announcements` на `/bot/announcements`

### 3. Git-репозиторий
- Инициализирован, все файлы под версионным контролем
- Первый коммит: `f09b644` — Initial commit
- Второй коммит: `78d1b7f` — Fix critical bugs

---

## ❌ Что осталось сделать

### 1. Настроить .env с реальными ключами
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`
- `TELEGRAM_BOT_TOKEN`
- `DEEPSEEK_API_KEY`
- `INTERNAL_API_KEY`, `JWT_SECRET`
- `PAYME_MERCHANT_ID`, `PAYME_KEY`

### 2. Применить Supabase миграции
- Выполнить `supabase/schema.sql` через Supabase Dashboard → SQL Editor
- Выполнить миграции из `supabase/migrations/`

### 3. Проверить мобильное приложение (React Native)
- Находится в поддиректории `mobile/` (отдельный git-репозиторий)

### 4. Развернуть на сервере
- Использовать `deploy.sh` или `deploy_via_ssh.py`

---

## Структура проекта

```
domapp/
├── backend/           # FastAPI backend
│   ├── main.py        # Точка входа
│   ├── auth.py        # JWT + internal key auth
│   ├── db.py          # Supabase REST клиент (+ mock для dev)
│   ├── models/        # Pydantic схемы
│   └── routers/       # API роутеры
├── bot/               # Telegram bot
│   ├── main.py        # Точка входа
│   ├── api.py         # HTTP клиент для backend
│   ├── deepseek.py    # DeepSeek AI интеграция
│   └── handlers/      # Обработчики команд
├── frontend/          # React + Vite web-панель
│   └── src/pages/     # Страницы (Login, Dashboard, Buildings, etc.)
├── mobile/            # React Native (Expo) приложение
├── supabase/          # SQL миграции
├── .env               # Конфигурация (заполнить!)
└── deploy.sh          # Скрипт деплоя
```

## Полезные команды

```bash
# Запуск backend (локально)
cd domapp
.\venv\Scripts\uvicorn backend.main:app --reload --port 8000

# Запуск frontend (локально)
cd domapp\frontend
npx vite --port 5173

# Запуск бота (локально)
cd domapp
.\venv\Scripts\python -m bot.main

# Сборка frontend
cd domapp\frontend
npx vite build
```
