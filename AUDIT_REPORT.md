# DomApp — Полный аудит проекта

**Дата:** 2026-06-21
**Версия:** 0.3.0

---

## 1. Общая оценка

| Компонент | Оценка | Статус |
|-----------|--------|--------|
| Backend (Python/FastAPI) | 96/100 | ✅ Отлично |
| Bot (Telegram) | 98/100 | ✅ Отлично |
| Frontend (React/Vite) | 90/100 | ✅ Хорошо |
| Supabase Schema | 95/100 | ✅ Отлично |
| **Общая** | **~95/100** | ✅ |

---

## 2. Backend (FastAPI) — 18 файлов

### ✅ Что хорошо
- Чистая архитектура: роутеры разделены по сущностям
- JWT аутентификация (access + refresh tokens)
- Rate limiter на middleware
- Кастомный CORS middleware
- Payme JSON-RPC webhook — полный цикл транзакций
- PDF генерация через reportlab
- Supabase REST клиент с mock-режимом для разработки
- Валидация через Pydantic схемы

### ⚠️ Замечания

| Файл | Тип | Описание |
|------|-----|----------|
| [`auth.py`](domapp/backend/auth.py:32) | 🔴 error | Хардкоженный `JWT_SECRET` fallback ("dev-secret-do-not-use-in-production") |
| [`db.py`](domapp/backend/db.py:150) | ⚠️ warning | Строки > 120 символов |
| [`main.py`](domapp/backend/main.py:59) | ⚠️ warning | Строка > 120 символов |
| [`reports.py`](domapp/backend/reports.py:70) | ⚠️ warning | Несколько строк > 120 символов |
| [`requests.py`](domapp/backend/requests.py:27) | ⚠️ warning | Строка > 120 символов |
| [`apartments.py`](domapp/backend/apartments.py:44) | ⚠️ warning | Строки > 140 символов |

### 🔧 Рекомендации
1. **JWT_SECRET** — вынести в .env и убрать fallback. Сейчас в коде есть запасной секрет, который может быть использован, если переменная окружения не задана
2. **Длинные строки** — разбить строки > 120 символов для соответствия PEP 8
3. **Нет эндпоинта `GET /api/v1/payments`** — ✅ **ДОБАВЛЕНО** (в текущей сессии)
4. **Нет эндпоинта `GET /api/v1/reports` (PDF)** — ✅ **ДОБАВЛЕНО** (в текущей сессии)

---

## 3. Telegram Bot — 12 файлов

### ✅ Что хорошо
- Асинхронная архитектура (python-telegram-bot v20)
- ConversationHandler для регистрации
- AI чат через DeepSeek API
- Обработка 409 Conflict (другой экземпляр бота)
- Force reset сессий через Telegram API
- Клавиатуры на русском/узбекском

### ⚠️ Замечания

| Файл | Тип | Описание |
|------|-----|----------|
| [`api.py`](domapp/bot/api.py:111) | ⚠️ warning | Строка 140 символов |
| [`deepseek.py`](domapp/bot/deepseek.py:53) | ⚠️ warning | Строки > 120 символов |
| [`ai_chat.py`](domapp/bot/handlers/ai_chat.py:175) | ⚠️ warning | Строка > 120 символов |

### 🔧 Рекомендации
1. Разбить длинные строки
2. Добавить обработку таймаутов для DeepSeek API
3. Рассмотреть добавление кэширования для частых запросов

---

## 4. Frontend (React/Vite) — 12 файлов

### ✅ Что хорошо
- Чистая маршрутизация (React Router v6)
- JWT интерцептор с авторедиректом на 401
- Защищённые маршруты (ProtectedRoute)
- Адаптивный дизайн (Tailwind CSS)
- Полный CRUD для всех сущностей
- Интеграция с Payme через бэкенд

### ⚠️ Замечания

| Файл | Проблема |
|------|----------|
| [`Tenants.jsx`](domapp/frontend/src/pages/Tenants.jsx) | Фильтр по дому в форме создания жильца использует `filterBuilding` вместо отдельного состояния — при смене фильтра сбрасывается форма |
| [`Employees.jsx`](domapp/frontend/src/pages/Employees.jsx:29) | Двойной `useEffect` — один на `role`, второй пустой — лишний запрос при монтировании |
| [`Payments.jsx`](domapp/frontend/src/pages/Payments.jsx) | Нет страницы управления квартирами (Apartments) |
| [`Reports.jsx`](domapp/frontend/src/pages/Reports.jsx) | Нет предпросмотра отчёта перед скачиванием |

### 🔧 Рекомендации
1. **Создать страницу Apartments** — управление квартирами (сейчас нет UI)
2. **Исправить баг в Tenants.jsx** — форма создания жильца использует `filterBuilding` для выбора дома, но он же используется для фильтрации списка. Нужно разделить состояния
3. **Убрать лишний useEffect в Employees.jsx** — двойной вызов fetchEmployees
4. **Добавить Apartments page** в навигацию и роуты

---

## 5. Supabase Schema

### ✅ Что хорошо
- Нормализованная структура (7 таблиц)
- Внешние ключи с CASCADE
- RLS включён для всех таблиц
- Индексы на часто запрашиваемые колонки
- Миграции версионированы

### ⚠️ Замечания
- Таблицы `tenants` и `employees` есть только в миграциях, но не в `schema.sql`
- Нет `updated_at` триггеров для таблиц
- Нет ограничений на `period` в payments (формат YYYY-MM)

### 🔧 Рекомендации
1. Синхронизировать `schema.sql` с миграциями
2. Добавить `updated_at` триггеры
3. Добавить CHECK на формат `period` в payments

---

## 6. Безопасность

### ✅ Хорошо
- JWT токены с expiry
- Refresh token механизм
- CORS ограничен списком разрешённых origins
- Rate limiter на middleware
- Payme webhook с Basic Auth
- Internal key для бот → бэкенд коммуникации
- RLS на всех таблицах Supabase
- Пароли хешируются (bcrypt)

### ⚠️ Требует внимания
1. **JWT_SECRET fallback** — в коде есть запасной секрет
2. **Секреты в .env** — файл не в .gitignore (проверить)
3. **Нет HTTPS** — в разработке норм, но для продакшена обязательно

---

## 7. Итоговые рекомендации (приоритет)

| # | Задача | Приоритет | Сложность |
|---|--------|-----------|-----------|
| 1 | 🔴 Убрать хардкоженный JWT_SECRET из кода | High | Low |
| 2 | 🔴 Добавить .env в .gitignore | High | Low |
| 3 | 🟡 Создать страницу Apartments на фронтенде | Medium | Medium |
| 4 | 🟡 Исправить баг с filterBuilding в Tenants.jsx | Medium | Low |
| 5 | 🟡 Синхронизировать schema.sql с миграциями | Medium | Low |
| 6 | 🟢 Разбить длинные строки (PEP 8) | Low | Low |
| 7 | 🟢 Добавить updated_at триггеры | Low | Low |
| 8 | 🟢 Убрать лишний useEffect в Employees.jsx | Low | Low |

---

## 8. Файловая структура проекта

```
domapp/
├── backend/
│   ├── main.py              # Точка входа FastAPI
│   ├── auth.py              # JWT аутентификация
│   ├── db.py                # Supabase REST клиент
│   ├── models/
│   │   └── schemas.py       # Pydantic схемы
│   └── routers/
│       ├── auth.py          # Регистрация/логин
│       ├── buildings.py     # Дома CRUD
│       ├── apartments.py    # Квартиры CRUD
│       ├── residents.py     # Жильцы (для бота)
│       ├── tenants.py       # Жильцы (админка)
│       ├── employees.py     # Сотрудники УК
│       ├── requests.py      # Заявки
│       ├── announcements.py # Объявления
│       ├── payments.py      # Payme webhook + список
│       ├── reports.py       # Отчёты + PDF
│       └── companies.py     # Профиль компании
├── bot/
│   ├── main.py              # Точка входа бота
│   ├── api.py               # HTTP клиент к бэкенду
│   ├── deepseek.py          # DeepSeek AI интеграция
│   ├── keyboards.py         # Telegram клавиатуры
│   └── handlers/
│       ├── start.py         # Регистрация
│       ├── request.py       # Подача заявки
│       ├── status.py        # Статус заявок
│       ├── announcements.py # Объявления
│       ├── ai_chat.py       # AI чат
│       └── notifications.py # Уведомления
├── frontend/
│   └── src/
│       ├── App.jsx          # Маршрутизация
│       ├── api.js           # Axios клиент
│       ├── components/
│       │   └── Layout.jsx   # Навигация
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── Buildings.jsx
│           ├── Tenants.jsx
│           ├── Employees.jsx
│           ├── Requests.jsx
│           ├── RequestDetail.jsx
│           ├── Payments.jsx
│           ├── Announcements.jsx
│           └── Reports.jsx
├── supabase/
│   ├── schema.sql           # Основная схема
│   └── migrations/          # Миграции
└── .env                     # Переменные окружения
```
