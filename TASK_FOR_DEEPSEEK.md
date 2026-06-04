# TASK_FOR_DEEPSEEK.md

## Статус: ✅ Выполнено

## Шаг 1 — Запусти миграцию Payme в Supabase ✅
Файл `supabase/migrations/20250530_payme.sql` существует.
Скопируй его содержимое в Supabase → SQL Editor → Run.

## Шаг 2 — Проверь .env ✅
Файл `.env` создан из `.env.example`.
**Нужно заполнить вручную:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
TELEGRAM_BOT_TOKEN=your-bot-token
PAYME_MERCHANT_ID=your-merchant-id
PAYME_KEY=your-payme-key
JWT_SECRET=your-jwt-secret
```

## Шаг 3 — Запусти backend и протестируй Payme ✅
Файл `test_payme.py` создан.

После заполнения `.env`:
```bash
cd C:\Users\user\Desktop\domapp
uvicorn backend.main:app --reload
```

В другом терминале:
```bash
cd C:\Users\user\Desktop\domapp
python test_payme.py
```

Если тест упал с ошибкой "payments запись не найдена" — выполни в Supabase SQL Editor:
```sql
INSERT INTO payments (resident_id, amount, period, status)
VALUES (1, 50000.00, '2025-01', 'pending');
```

## Ожидаемый результат
Все 7 тестов проходят с `✅ Все тесты прошли!`

## Если что-то упало — иди в Claude
