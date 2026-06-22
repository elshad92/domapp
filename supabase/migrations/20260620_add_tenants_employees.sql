-- DomApp - add tables/columns used by current backend routers.
-- Backend uses the service_role key; anon/authenticated stay denied by RLS.

ALTER TABLE buildings
    ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS payme_cancel_reason INT;

CREATE TABLE IF NOT EXISTS tenants (
    id BIGSERIAL PRIMARY KEY,
    apartment_id BIGINT NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_apartment ON tenants(apartment_id);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_tenants ON tenants;
DROP POLICY IF EXISTS deny_all_employees ON employees;

CREATE POLICY deny_all_tenants ON tenants FOR ALL TO anon, authenticated USING (false);
CREATE POLICY deny_all_employees ON employees FOR ALL TO anon, authenticated USING (false);

GRANT ALL ON TABLE tenants, employees TO service_role;
GRANT USAGE, SELECT ON SEQUENCE tenants_id_seq, employees_id_seq TO service_role;
