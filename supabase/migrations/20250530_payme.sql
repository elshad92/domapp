-- DomApp — миграция для Payme
-- Добавляет payme_create_time для идемпотентности CreateTransaction

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS payme_create_time BIGINT,
    ADD COLUMN IF NOT EXISTS payme_cancel_time BIGINT,
    ADD COLUMN IF NOT EXISTS payme_state INT NOT NULL DEFAULT 1;

-- Комментарий: payme_state значения
-- 1 = создана (CreateTransaction выполнен)
-- 2 = выполнена (PerformTransaction)
-- -1 = отменена до perform
-- -2 = отменена после perform

-- Уникальный индекс на payme_transaction_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_payme_tx
    ON payments(payme_transaction_id)
    WHERE payme_transaction_id IS NOT NULL;

-- Тестовые данные для проверки Payme (только для dev)
-- Запускать только если таблицы уже заполнены базовыми данными
-- INSERT INTO payments (resident_id, amount, period, status)
-- VALUES (1, 50000.00, '2025-01', 'pending');
