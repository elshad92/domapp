-- DomApp resident web/mobile features.
-- Backend uses service_role through PostgREST; anon/authenticated stay denied by RLS.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS area DECIMAL(10, 2);

ALTER TABLE employees ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees ADD CONSTRAINT employees_role_check CHECK (role IN ('admin', 'manager', 'employee', 'accountant', 'dispatcher'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'telegram_id'
  ) THEN
    ALTER TABLE tenants ALTER COLUMN telegram_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE tenants ALTER COLUMN full_name DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE employees ALTER COLUMN full_name DROP NOT NULL;
  END IF;
END $$;

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

GRANT ALL ON TABLE meter_readings, request_messages, polls, poll_votes TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
