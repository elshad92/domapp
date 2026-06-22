-- Migration 003: Resident features (meter_readings, request_messages, polls, assigned_to)

-- ============================================================
-- 1. Meter readings (показания счётчиков)
-- ============================================================
CREATE TABLE IF NOT EXISTS meter_readings (
  id SERIAL PRIMARY KEY,
  apartment_id INT NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  resident_id INT NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  meter_type TEXT NOT NULL CHECK (meter_type IN ('water_cold', 'water_hot', 'electricity', 'gas')),
  value DECIMAL(10,2) NOT NULL,
  photo_url TEXT,
  period DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. Request messages (чат по заявкам)
-- ============================================================
CREATE TABLE IF NOT EXISTS request_messages (
  id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('resident', 'uk', 'employee')),
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. Polls (голосования)
-- ============================================================
CREATE TABLE IF NOT EXISTS polls (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  building_id INT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id SERIAL PRIMARY KEY,
  poll_id INT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  resident_id INT NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  option_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, resident_id)
);

-- ============================================================
-- 4. Add assigned_to to requests
-- ============================================================
ALTER TABLE requests ADD COLUMN IF NOT EXISTS assigned_to INT REFERENCES employees(id);

-- ============================================================
-- 5. Add Click payment columns to payments
-- ============================================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS click_transaction_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS click_create_time BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS click_state INT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS click_cancel_time BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS click_cancel_reason TEXT;

-- ============================================================
-- 6. Add phone_verified and avatar to residents
-- ============================================================
ALTER TABLE residents ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ============================================================
-- 7. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_meter_readings_apartment ON meter_readings(apartment_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_resident ON meter_readings(resident_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_period ON meter_readings(period);
CREATE INDEX IF NOT EXISTS idx_request_messages_request ON request_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_polls_building ON polls(building_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_payments_click_tx ON payments(click_transaction_id);
