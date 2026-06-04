-- DomApp — миграция: добавить comment в requests
ALTER TABLE requests
    ADD COLUMN IF NOT EXISTS comment TEXT;
