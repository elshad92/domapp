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
    area DECIMAL(10, 2),
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
-- Tenants (жильцы для CRUD админки)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
    id BIGSERIAL PRIMARY KEY,
    apartment_id BIGINT NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_apartment ON tenants(apartment_id);

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
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee', 'accountant', 'dispatcher')),
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
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS area DECIMAL(10, 2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_transaction_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_create_time BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_state INT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_cancel_time BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payme_cancel_reason TEXT;

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
-- Resident web/mobile features
-- ============================================================
CREATE TABLE IF NOT EXISTS meter_readings (
    id BIGSERIAL PRIMARY KEY,
    apartment_id BIGINT NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    resident_id BIGINT NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    meter_type TEXT NOT NULL CHECK (meter_type IN ('water_cold', 'water_hot', 'electricity', 'gas')),
    value DECIMAL(10,2) NOT NULL,
    photo_url TEXT,
    period DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS request_messages (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('resident', 'uk', 'employee')),
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS polls (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    building_id BIGINT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poll_votes (
    id BIGSERIAL PRIMARY KEY,
    poll_id BIGINT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    resident_id BIGINT NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    option_index INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(poll_id, resident_id)
);

ALTER TABLE requests ADD COLUMN IF NOT EXISTS assigned_to BIGINT REFERENCES employees(id);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS click_transaction_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS click_create_time BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS click_state INT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS click_cancel_time BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS click_cancel_reason TEXT;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE INDEX IF NOT EXISTS idx_meter_readings_apartment ON meter_readings(apartment_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_resident ON meter_readings(resident_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_period ON meter_readings(period);
CREATE INDEX IF NOT EXISTS idx_request_messages_request ON request_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_polls_building ON polls(building_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_payments_click_tx ON payments(click_transaction_id);

ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_meter_readings ON meter_readings;
DROP POLICY IF EXISTS deny_all_request_messages ON request_messages;
DROP POLICY IF EXISTS deny_all_polls ON polls;
DROP POLICY IF EXISTS deny_all_poll_votes ON poll_votes;

CREATE POLICY deny_all_meter_readings ON meter_readings FOR ALL TO anon, authenticated USING (false);
CREATE POLICY deny_all_request_messages ON request_messages FOR ALL TO anon, authenticated USING (false);
CREATE POLICY deny_all_polls ON polls FOR ALL TO anon, authenticated USING (false);
CREATE POLICY deny_all_poll_votes ON poll_votes FOR ALL TO anon, authenticated USING (false);

GRANT ALL ON TABLE tenants, employees, meter_readings, request_messages, polls, poll_votes TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
