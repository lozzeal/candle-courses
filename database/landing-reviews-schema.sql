-- ============================================================
-- Таблиця landing_reviews — скріншоти відгуків учнів
-- Запустити у Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS landing_reviews (
  id BIGSERIAL PRIMARY KEY,
  photo_url TEXT NOT NULL,        -- URL зображення (Supabase Storage або assets/)
  author_name TEXT,                -- опційно — імʼя автора
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_sort ON landing_reviews(sort_order);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON landing_reviews(status);

DROP TRIGGER IF EXISTS landing_reviews_updated_at ON landing_reviews;
CREATE TRIGGER landing_reviews_updated_at BEFORE UPDATE ON landing_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE landing_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_landing_reviews" ON landing_reviews;
DROP POLICY IF EXISTS "auth_write_landing_reviews" ON landing_reviews;
CREATE POLICY "public_read_landing_reviews" ON landing_reviews
  FOR SELECT USING (status = 'published');
CREATE POLICY "auth_write_landing_reviews" ON landing_reviews
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SEED: поточні 13 відгуків
INSERT INTO landing_reviews (photo_url, sort_order) VALUES
  ('assets/review-01.jpg', 1),
  ('assets/review-02.jpg', 2),
  ('assets/review-03.jpg', 3),
  ('assets/review-04.jpg', 4),
  ('assets/review-05.jpg', 5),
  ('assets/review-06.jpg', 6),
  ('assets/review-07.jpg', 7),
  ('assets/review-08.jpg', 8),
  ('assets/review-09.jpg', 9),
  ('assets/review-10.jpg', 10),
  ('assets/review-11.jpg', 11),
  ('assets/review-12.jpg', 12),
  ('assets/review-13.jpg', 13)
ON CONFLICT DO NOTHING;
