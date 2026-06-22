-- DomApp — Supabase Schema
-- Все таблицы для SaaS платформы управляющих компаний

-- Управляющие компании
CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'basic',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Дома под управлением
CREATE TABLE IF NOT EXISTS buildings (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    district TEXT NOT NULL,
    floors INT NOT NULL,
    apartments_count INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Квартиры
CREATE TABLE IF NOT EXISTS apartments (
    id BIGSERIAL PRIMARY KEY,
    building_id BIGINT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    floor INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Жильцы
CREATE TABLE IF NOT EXISTS residents (
    id BIGSERIAL PRIMARY KEY,
    apartment_id BIGINT NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Заявки
CREATE TABLE IF NOT EXISTS requests (
    id BIGSERIAL PRIMARY KEY,
    resident_id BIGINT NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    building_id BIGINT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    comment TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'done')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Объявления
CREATE TABLE IF NOT EXISTS announcements (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    building_id BIGINT REFERENCES buildings(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- Платежи квартплаты
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    resident_id BIGINT NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    period TEXT NOT NULL CHECK (period ~ '^\d{4}-\d{2}$'),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    payme_transaction_id TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_requests_building_status ON requests(building_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_resident ON requests(resident_id);
CREATE INDEX IF NOT EXISTS idx_residents_telegram ON residents(telegram_id);
CREATE INDEX IF NOT EXISTS idx_buildings_company ON buildings(company_id);
CREATE INDEX IF NOT EXISTS idx_announcements_company ON announcements(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_resident ON payments(resident_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments(payme_transaction_id);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
-- ВАЖНО: backend использует service_role key → обходит RLS.
-- RLS защищает прямые запросы через anon key (frontend публичные).

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- service_role обходит RLS автоматически — дополнительных политик не нужно.

-- anon/authenticated: полный запрет (backend работает только через service_role)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deny_all_companies' AND tablename = 'companies') THEN
        CREATE POLICY deny_all_companies ON companies FOR ALL TO anon, authenticated USING (false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deny_all_buildings' AND tablename = 'buildings') THEN
        CREATE POLICY deny_all_buildings ON buildings FOR ALL TO anon, authenticated USING (false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deny_all_apartments' AND tablename = 'apartments') THEN
        CREATE POLICY deny_all_apartments ON apartments FOR ALL TO anon, authenticated USING (false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deny_all_residents' AND tablename = 'residents') THEN
        CREATE POLICY deny_all_residents ON residents FOR ALL TO anon, authenticated USING (false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deny_all_requests' AND tablename = 'requests') THEN
        CREATE POLICY deny_all_requests ON requests FOR ALL TO anon, authenticated USING (false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deny_all_announcements' AND tablename = 'announcements') THEN
        CREATE POLICY deny_all_announcements ON announcements FOR ALL TO anon, authenticated USING (false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deny_all_payments' AND tablename = 'payments') THEN
        CREATE POLICY deny_all_payments ON payments FOR ALL TO anon, authenticated USING (false);
    END IF;
END;
$$;

-- ============================================================
-- Tenants (жильцы, для бота)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    apartment_id BIGINT NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    language TEXT DEFAULT 'ru',
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_apartment ON tenants(apartment_id);
CREATE INDEX IF NOT EXISTS idx_tenants_telegram ON tenants(telegram_id);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deny_all_tenants' AND tablename = 'tenants') THEN
        CREATE POLICY deny_all_tenants ON tenants FOR ALL TO anon, authenticated USING (false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenants_service_role' AND tablename = 'tenants') THEN
        CREATE POLICY "tenants_service_role" ON tenants FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END;
$$;

-- ============================================================
-- Employees (сотрудники УК)
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'accountant', 'dispatcher')),
    phone TEXT,
    telegram_id BIGINT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deny_all_employees' AND tablename = 'employees') THEN
        CREATE POLICY deny_all_employees ON employees FOR ALL TO anon, authenticated USING (false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'employees_service_role' AND tablename = 'employees') THEN
        CREATE POLICY "employees_service_role" ON employees FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END;
$$;

-- ============================================================
-- Missing columns (добавление колонок, которых нет в CREATE TABLE)
-- ============================================================
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_transaction_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_create_time BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_state INT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_cancel_time BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_cancel_reason TEXT;

-- Tenants: добавить колонки из миграции 001 (для CRUD через backend)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email TEXT;

-- Employees: добавить колонки из миграции 001 (для CRUD через backend)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Добавить updated_at в таблицы, где его нет
ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE residents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- Updated_at triggers (автообновление updated_at)
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
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema = 'public'
          AND table_name IN ('companies', 'buildings', 'apartments', 'residents', 'payments', 'requests', 'announcements', 'tenants', 'employees')
    LOOP
        EXECUTE format(
            'CREATE TRIGGER update_%I_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
            t, t
        );
    END LOOP;
END;
$$;
