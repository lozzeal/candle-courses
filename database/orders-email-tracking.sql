-- ============================================================
-- Додаємо колонки для трекінгу email-розсилки після оплати
-- Запустити у Supabase SQL Editor (нова вкладка)
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_order_ref TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(12,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_paid_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email_error TEXT;

-- Індекс на payment_order_ref для швидкого пошуку у webhook
CREATE INDEX IF NOT EXISTS idx_orders_payment_order_ref ON orders(payment_order_ref);

-- Оновлюємо schema cache PostgREST
NOTIFY pgrst, 'reload schema';
