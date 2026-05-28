-- ============================================================
-- Таблиця page_views для власної аналітики
-- Запустити у Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS page_views (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  referrer_source TEXT,        -- direct | search | social | ads | email | other
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  country TEXT,                -- 2-letter ISO (наприклад UA, DE, US)
  city TEXT,
  device_type TEXT,            -- desktop | mobile | tablet
  ip_hash TEXT,                -- хеш IP для приватності
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pv_session ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_pv_created ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pv_path ON page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_pv_country ON page_views(country);
CREATE INDEX IF NOT EXISTS idx_pv_source ON page_views(referrer_source);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_read_page_views" ON page_views;
CREATE POLICY "auth_read_page_views" ON page_views
  FOR SELECT TO authenticated USING (true);
-- INSERT тільки через service_role (з API)
