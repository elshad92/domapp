import os
import sys

import httpx

PROJECT_ID = os.getenv("SUPABASE_PROJECT_ID", "")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

if not PROJECT_ID or not SERVICE_KEY or SERVICE_KEY.startswith("CHANGE_ME_"):
    raise RuntimeError("SUPABASE_PROJECT_ID and SUPABASE_SERVICE_KEY must be configured")

SQL = """
CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'basic',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buildings (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    district TEXT NOT NULL,
    floors INT NOT NULL,
    apartments_count INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apartments (
    id BIGSERIAL PRIMARY KEY,
    building_id BIGINT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    floor INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS residents (
    id BIGSERIAL PRIMARY KEY,
    apartment_id BIGINT NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS announcements (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    building_id BIGINT REFERENCES buildings(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    resident_id BIGINT NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    period TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    payme_transaction_id TEXT,
    payme_create_time BIGINT,
    payme_cancel_time BIGINT,
    payme_state INT NOT NULL DEFAULT 1,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_building_status ON requests(building_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_resident ON requests(resident_id);
CREATE INDEX IF NOT EXISTS idx_residents_telegram ON residents(telegram_id);
CREATE INDEX IF NOT EXISTS idx_buildings_company ON buildings(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_resident ON payments(resident_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_payme_tx ON payments(payme_transaction_id) WHERE payme_transaction_id IS NOT NULL;
"""

SEED = """
INSERT INTO companies (name, phone, email, password_hash, plan)
VALUES ('Тестовая УК', '+998901234567', 'admin@domapp.uz',
        encode(digest('admin123', 'sha256'), 'hex'), 'basic')
ON CONFLICT (email) DO NOTHING;

INSERT INTO buildings (company_id, address, district, floors, apartments_count)
VALUES (1, 'ул. Навои 5', 'Юнусабадский', 9, 72)
ON CONFLICT DO NOTHING;

INSERT INTO apartments (building_id, number, floor)
VALUES
  (1, '1', 1),(1, '2', 1),(1, '3', 1),(1, '4', 1),
  (1, '10', 2),(1, '11', 2),(1, '20', 3),(1, '42', 5),
  (1, '50', 6),(1, '72', 9)
ON CONFLICT DO NOTHING;
"""

url = f"https://{PROJECT_ID}.supabase.co/rest/v1/rpc/exec_sql"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

# Supabase не имеет exec_sql — используем pg REST напрямую через management API
# Правильный способ — через postgres endpoint
mgmt_url = f"https://api.supabase.com/v1/projects/{PROJECT_ID}/database/query"
mgmt_headers = {
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

def exec_sql(sql, label):
    r = httpx.post(mgmt_url, headers=mgmt_headers, json={"query": sql}, timeout=30)
    sys.stdout.buffer.write(f"{label}: {r.status_code}\n".encode("utf-8"))
    if r.status_code not in (200, 201):
        sys.stdout.buffer.write(r.text[:300].encode("utf-8", "replace") + b"\n")
    return r.status_code

exec_sql(SQL, "schema")
exec_sql(SEED, "seed")
