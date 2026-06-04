-- ============================================================
-- Таблиця landing_faq - редагування FAQ лендингу
-- Запустити у Supabase SQL Editor (в окремій вкладці!)
-- ============================================================

CREATE TABLE IF NOT EXISTS landing_faq (
  id BIGSERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faq_sort ON landing_faq(sort_order);
CREATE INDEX IF NOT EXISTS idx_faq_status ON landing_faq(status);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS landing_faq_updated_at ON landing_faq;
CREATE TRIGGER landing_faq_updated_at BEFORE UPDATE ON landing_faq
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE landing_faq ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_landing_faq" ON landing_faq;
DROP POLICY IF EXISTS "auth_write_landing_faq" ON landing_faq;
CREATE POLICY "public_read_landing_faq" ON landing_faq
  FOR SELECT USING (status = 'published');
CREATE POLICY "auth_write_landing_faq" ON landing_faq
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SEED: поточні 5 FAQ з index.html
-- ============================================================

INSERT INTO landing_faq (question, answer, sort_order) VALUES
  ('Чи потрібен досвід?', 'Ні, підходить для новачків.', 1),
  ('Чи потрібне дороге обладнання?', 'Можна почати вдома, без складного обладнання.', 2),
  ('Чи є підтримка?', 'Так, є підтримка, необмежена часом, є чат.', 3),
  ('Де проходить навчання?', 'В Telegram, відеоуроки в записі.', 4),
  ('Що ви зможете створювати?', 'Відповідно до обраного курсу ви зможете створювати свічки, аромапродукти, бетонні та гіпсові вироби.', 5)
ON CONFLICT DO NOTHING;
