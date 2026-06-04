# DomApp — Статус проекта

> Последнее обновление: 2026-06-03 23:44

## Сервер
- **Хост:** 51.38.119.218 (root / DpXWg9oz38fO)
- **Backend:** FastAPI на порту 8000
- **БД:** Supabase (project: zoezzzvbqrvzbnyaglkt)
- **Telegram Bot:** токен есть в .env

---

## ✅ Что сделано

### 1. Исправлен main.py
- **Проблема:** `app.include_router(auth, ...)` вместо `app.include_router(auth.router, ...)`
- **Ошибка:** `module 'backend.routers.auth' has no attribute 'routes'`
- **Решение:** добавлен `.router` ко всем 10 роутерам

### 2. Исправлен residents.py
- **Проблема:** отсутствовал импорт `get_current_company`
- **Ошибка:** `NameError: name 'get_current_company' is not defined`
- **Решение:** добавлен импорт `from backend.auth import verify_internal_key, get_current_company`

### 3. Очищен __pycache__
- Удалены старые .pyc файлы, чтобы не было кэшированных ошибок

### 4. Сервер запущен и работает
- Health check: `{"status":"ok","version":"0.3.0","database":"connected"}`
- Аутентификация работает (admin@domapp.uz / test123)

---

## ❌ Что осталось сделать

### 1. Создать таблицы tenants и employees в Supabase
- **Проблема:** таблицы не существуют → 500 ошибка на `/api/v1/tenants` и `/api/v1/employees`
- **Причина:** Supabase блокирует прямой доступ к PostgreSQL, Management API требует access token
- **Решение:** создать таблицы вручную через Supabase Dashboard → SQL Editor

**SQL для выполнения:**
```sql
CREATE TABLE IF NOT EXISTS public.tenants (
    id BIGSERIAL PRIMARY KEY,
    apartment_id BIGINT NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.employees (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'employee',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
```

**Ссылка:** https://supabase.com/dashboard/project/zoezzzvbqrvzbnyaglkt

### 2. Проверить фронтенд (React)
- Не проверялся

### 3. Проверить мобильное приложение (React Native)
- Не проверялось

### 4. Проверить Telegram бот
- Не проверялся

---

## Полезные команды

```bash
# Подключение к серверу
ssh root@51.38.119.218

# Логи backend
journalctl -u domapp-backend --no-pager -n 50

# Перезапуск backend
systemctl restart domapp-backend

# Проверка health
curl http://localhost:8000/health

# Получение токена
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@domapp.uz","password":"test123"}'

# Тест эндпоинта
curl -s -H "Authorization: Bearer TOKEN" http://localhost:8000/api/v1/apartments
```

## Файлы на сервере

| Файл | Описание |
|---|---|
| `/opt/domapp/backend/main.py` | Главный файл FastAPI (исправлен) |
| `/opt/domapp/backend/routers/residents.py` | Роутер residents (исправлен) |
| `/opt/domapp/backend/routers/tenants.py` | Роутер tenants (ждёт таблицу) |
| `/opt/domapp/backend/routers/employees.py` | Роутер employees (ждёт таблицу) |
| `/opt/domapp/create_tables.sql` | SQL для создания таблиц |
| `/opt/domapp/.env` | Конфигурация (ключи API) |
