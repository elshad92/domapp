# 🏠 DomApp — Управляющая компания ЖКХ

Полноценная платформа для управления многоквартирными домами:
- **Telegram бот** для жильцов (заявки, объявления, AI помощник)
- **Веб-панель** для УК (React + Vite + Tailwind)
- **Мобильное приложение** для УК (React Native / Expo)
- **Оплата через Payme**

## 🚀 Быстрый старт

### 1. Клонировать и настроить
```bash
git clone <repo> /opt/domapp
cd /opt/domapp
cp .env.example .env
# Заполнить .env
```

### 2. Backend
```bash
python -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
python run_migrations.py
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run build
# Статика в frontend/dist — раздаётся nginx
```

### 4. Telegram Bot
```bash
cd /opt/domapp
source venv/bin/activate
python -m bot.main
```

### 5. Mobile (React Native)
```bash
cd mobile
npm install
npx expo start
# Сканировать QR через Expo Go
```

### 6. Деплой на сервер
```bash
bash deploy.sh
```

## 🏗 Структура проекта

```
domapp/
├── backend/           # FastAPI + Supabase
│   ├── main.py        # Точка входа
│   ├── auth.py        # JWT авторизация
│   ├── db.py          # Supabase клиент
│   ├── models/        # Pydantic модели
│   └── routers/       # API роутеры
│       ├── auth.py
│       ├── buildings.py
│       ├── residents.py
│       ├── requests.py
│       ├── announcements.py
│       └── payme.py
├── bot/               # Telegram бот
│   ├── main.py
│   ├── api.py         # Клиент backend API
│   ├── deepseek.py    # AI помощник (DeepSeek)
│   ├── keyboards.py   # Клавиатуры
│   └── handlers/
│       ├── ai_chat.py
│       └── notifications.py
├── frontend/          # React + Vite + Tailwind
│   └── src/
│       ├── pages/     # Dashboard, Requests, Buildings...
│       └── components/
├── mobile/            # React Native / Expo
│   └── src/
│       └── screens/   # Login, Dashboard, Requests...
├── supabase/          # БД
│   └── schema.sql
├── deploy.sh          # Скрипт деплоя
├── nginx.conf         # Nginx конфиг
├── domapp-backend.service  # systemd
└── domapp-bot.service      # systemd
```

## 🤖 AI Помощник (DeepSeek)

Telegram бот с AI:
- Отвечает на вопросы по ЖКХ
- Создаёт заявки через диалог
- Видит контекст пользователя (имя, квартира, заявки)
- Адаптирован под Ташкент (Payme, Click, махалля)

## 🔔 Уведомления

- **Статус заявки** — жилец получает уведомление в Telegram
- **Новое объявление** — всем жильцам дома
- **AI помощник** — всегда доступен в боте

## 💳 Payme

Полный JSON-RPC webhook:
- CheckPerform, Create, Perform, Cancel, Check, GetStatement
- Basic Auth, работа с тийинами

## 📱 Мобильное приложение

React Native (Expo) для УК:
- Дашборд со статистикой
- Управление заявками
- Смена статуса, комментарии
- Публикация: Google Play ($25) + App Store ($99/год)

## 🖥 Веб-панель

React + Vite + Tailwind:
- Дашборд с графиками
- Заявки (фильтр, детали, статус)
- Объявления
- Дома и жильцы
- Отчёты
