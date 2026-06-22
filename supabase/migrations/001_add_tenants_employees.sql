-- DomApp — Migration 001
-- Добавляет таблицы tenants и employees (если ещё не созданы schema.sql),
-- Payme-колонки для таблицы payments, updated_at триггеры,
-- и недостающие колонки для CRUD через backend.

-- ============================================================
-- 1. Таблица жильцов (tenants) — для CRUD через backend
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
    id BIGSERIAL PRIMARY KEY,
    apartment_id BIGINT NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_apartment ON tenants(apartment_id);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all_tenants ON tenants;
CREATE POLICY deny_all_tenants ON tenants FOR ALL TO anon, authenticated USING (false);

-- ============================================================
-- 2. Таблица сотрудников УК (employees)
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee', 'accountant', 'dispatcher')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all_employees ON employees;
CREATE POLICY deny_all_employees ON employees FOR ALL TO anon, authenticated USING (false);

-- ============================================================
-- 3. Payme-колонки для таблицы payments
-- ============================================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_transaction_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_create_time BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_state INT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_cancel_time BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_cancel_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_payme_tx ON payments(payme_transaction_id);

-- ============================================================
-- 4. Недостающие колонки для tenants/employees (CRUD через backend)
-- ============================================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- ============================================================
-- 5. updated_at колонки для всех таблиц
-- ============================================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE residents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- 6. updated_at триггеры (автообновление при UPDATE)
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
        IF EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = trigger_name
              AND tgrelid = (quote_ident(t)::regclass)
        ) THEN
            CONTINUE;
        END IF;
        EXECUTE format(
            'CREATE TRIGGER %I
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
            trigger_name, t
        );
    END LOOP;
END;
$$;

-- ============================================================
-- 7. CHECK constraint на period в payments (формат: ГГГГ-ММ)
-- ============================================================
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_period_check;
ALTER TABLE payments ADD CONSTRAINT payments_period_check CHECK (period ~ '^\d{4}-\d{2}$');
