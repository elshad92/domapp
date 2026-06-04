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
    period TEXT NOT NULL,
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
CREATE POLICY deny_all_companies ON companies FOR ALL TO anon, authenticated USING (false);
CREATE POLICY deny_all_buildings ON buildings FOR ALL TO anon, authenticated USING (false);
CREATE POLICY deny_all_apartments ON apartments FOR ALL TO anon, authenticated USING (false);
CREATE POLICY deny_all_residents ON residents FOR ALL TO anon, authenticated USING (false);
CREATE POLICY deny_all_requests ON requests FOR ALL TO anon, authenticated USING (false);
CREATE POLICY deny_all_announcements ON announcements FOR ALL TO anon, authenticated USING (false);
CREATE POLICY deny_all_payments ON payments FOR ALL TO anon, authenticated USING (false);
