import os, paramiko, sys

HOST = os.getenv("DOMAPP_SSH_HOST", "")
USER = os.getenv("DOMAPP_SSH_USER", "root")
PASS = os.getenv("DOMAPP_SSH_PASSWORD", "")
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL", "")

if not HOST or not PASS:
    raise RuntimeError("DOMAPP_SSH_HOST and DOMAPP_SSH_PASSWORD must be configured")
if not SUPABASE_DB_URL:
    raise RuntimeError("SUPABASE_DB_URL must be configured")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=USER, password=PASS, timeout=30)

def run(cmd, wait=60):
    _, o, e = c.exec_command(cmd, timeout=wait)
    out = o.read().decode("utf-8", errors="replace").strip()
    err = e.read().decode("utf-8", errors="replace").strip()
    if out: sys.stdout.buffer.write((out + "\n").encode("utf-8"))
    if err: sys.stdout.buffer.write(("[err] " + err[-300:] + "\n").encode("utf-8"))
    return out

# Установить psycopg2 и выполнить миграции
run("/opt/domapp/venv/bin/pip install psycopg2-binary -q", wait=60)

SQL = """
CREATE TABLE IF NOT EXISTS companies (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'basic', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS buildings (id BIGSERIAL PRIMARY KEY, company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, address TEXT NOT NULL, district TEXT NOT NULL, floors INT NOT NULL, apartments_count INT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS apartments (id BIGSERIAL PRIMARY KEY, building_id BIGINT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE, number TEXT NOT NULL, floor INT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS residents (id BIGSERIAL PRIMARY KEY, apartment_id BIGINT NOT NULL REFERENCES apartments(id) ON DELETE CASCADE, telegram_id BIGINT NOT NULL UNIQUE, name TEXT NOT NULL, phone TEXT NOT NULL, registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS requests (id BIGSERIAL PRIMARY KEY, resident_id BIGINT NOT NULL REFERENCES residents(id) ON DELETE CASCADE, building_id BIGINT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE, category TEXT NOT NULL, description TEXT NOT NULL, photo_url TEXT, comment TEXT, status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','done')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resolved_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS announcements (id BIGSERIAL PRIMARY KEY, company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE, building_id BIGINT REFERENCES buildings(id) ON DELETE CASCADE, text TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), sent_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS payments (id BIGSERIAL PRIMARY KEY, resident_id BIGINT NOT NULL REFERENCES residents(id) ON DELETE CASCADE, amount DECIMAL(10,2) NOT NULL, period TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')), payme_transaction_id TEXT, payme_create_time BIGINT, payme_cancel_time BIGINT, payme_state INT NOT NULL DEFAULT 1, paid_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_requests_building_status ON requests(building_id, status);
CREATE INDEX IF NOT EXISTS idx_residents_telegram ON residents(telegram_id);
CREATE INDEX IF NOT EXISTS idx_buildings_company ON buildings(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_payme_tx ON payments(payme_transaction_id) WHERE payme_transaction_id IS NOT NULL;
INSERT INTO companies (name, phone, email, password_hash, plan) VALUES ('Тестовая УК', '+998901234567', 'admin@domapp.uz', encode(digest('admin123', 'sha256'), 'hex'), 'basic') ON CONFLICT (email) DO NOTHING;
INSERT INTO buildings (company_id, address, district, floors, apartments_count) VALUES (1, 'ул. Навои 5', 'Юнусабадский', 9, 72) ON CONFLICT DO NOTHING;
INSERT INTO apartments (building_id, number, floor) VALUES (1,'1',1),(1,'2',1),(1,'10',2),(1,'20',3),(1,'42',5),(1,'50',6),(1,'72',9) ON CONFLICT DO NOTHING;
"""

script = f'''
import psycopg2, sys
DB = {SUPABASE_DB_URL!r}
try:
    conn = psycopg2.connect(DB, connect_timeout=15)
    conn.autocommit = True
    cur = conn.cursor()
    statements = [s.strip() for s in """{SQL}""".split(";") if s.strip()]
    for s in statements:
        try:
            cur.execute(s)
            print("OK:", s[:60])
        except Exception as e:
            print("ERR:", e, s[:40])
    conn.close()
    print("DONE")
except Exception as e:
    print("CONNECT ERROR:", e)
'''

run(f"cat > /tmp/migrate.py << 'PYEOF'\n{script}\nPYEOF")
run("/opt/domapp/venv/bin/python /tmp/migrate.py", wait=60)

c.close()
