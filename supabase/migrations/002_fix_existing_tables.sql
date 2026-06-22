-- DomApp — Migration 002
-- Исправляет существующие таблицы: добавляет недостающие колонки,
-- которые CREATE TABLE IF NOT EXISTS не создал, т.к. таблицы уже существуют.

-- ============================================================
-- 1. Добавить telegram_id в residents (если нет)
-- ============================================================
ALTER TABLE residents ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

-- ============================================================
-- 2. Добавить updated_at в residents (если нет)
-- ============================================================
ALTER TABLE residents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- 3. Добавить updated_at в requests (если нет)
-- ============================================================
ALTER TABLE requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- 4. Добавить updated_at в announcements (если нет)
-- ============================================================
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- 5. Добавить updated_at в payments (если нет)
-- ============================================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- 6. Добавить updated_at в companies (если нет)
-- ============================================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- 7. Добавить updated_at в buildings (если нет)
-- ============================================================
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- 8. Добавить updated_at в apartments (если нет)
-- ============================================================
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- 9. Добавить updated_at в tenants (если нет)
-- ============================================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- 10. Добавить updated_at в employees (если нет)
-- ============================================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- 11. Добавить Payme-колонки в payments (если нет)
-- ============================================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_transaction_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_create_time BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_state INT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_cancel_time BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_cancel_reason TEXT;

-- ============================================================
-- 12. Добавить name колонки в tenants (для CRUD через backend)
-- ============================================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email TEXT;

-- ============================================================
-- 13. Добавить name колонки в employees (для CRUD через backend)
-- ============================================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- ============================================================
-- 14. Добавить name в buildings (если нет)
-- ============================================================
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS name TEXT;

-- ============================================================
-- 15. CHECK constraint на period в payments
-- ============================================================
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_period_check;
ALTER TABLE payments ADD CONSTRAINT payments_period_check CHECK (period ~ '^\d{4}-\d{2}$');

-- ============================================================
-- 16. Updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t text;
    trigger_name text;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema = 'public'
          AND table_name IN ('companies', 'buildings', 'apartments', 'residents', 'payments', 'requests', 'announcements', 'tenants', 'employees')
    LOOP
        trigger_name := 'update_' || t || '_updated_at';
        -- Проверяем, существует ли уже триггер
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = trigger_name
              AND tgrelid = (quote_ident(t)::regclass)
        ) THEN
            EXECUTE format(
                'CREATE TRIGGER %I
                 BEFORE UPDATE ON %I
                 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
                trigger_name, t
            );
        END IF;
    END LOOP;
END;
$$;
