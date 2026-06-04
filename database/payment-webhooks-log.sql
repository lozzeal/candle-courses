-- ============================================================
-- Лог-таблиця для всіх вхідних webhook-ів від WayForPay
-- Запустити у Supabase SQL Editor (нова вкладка)
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_webhooks (
  id BIGSERIAL PRIMARY KEY,
  received_at TIMESTAMPTZ DEFAULT now(),
  method TEXT,
  raw_body TEXT,
  parsed_body JSONB,
  order_reference TEXT,
  transaction_status TEXT,
  amount NUMERIC(12,2),
  signature_valid BOOLEAN,
  email_attempted BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  error TEXT,
  client_ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_payment_webhooks_received_at ON payment_webhooks(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_order_ref ON payment_webhooks(order_reference);

NOTIFY pgrst, 'reload schema';
