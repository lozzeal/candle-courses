-- ============================================================
-- Замінити довге тире — на дефіс - у всьому існуючому контенті БД
-- Запустити у Supabase SQL Editor (нова вкладка)
-- ============================================================

-- 1. landing_courses — назви, описи, програма, блоки сторінки
UPDATE landing_courses
SET
  title       = REPLACE(title, '—', '-'),
  badge       = REPLACE(badge, '—', '-'),
  intro       = REPLACE(intro, '—', '-'),
  subhead     = REPLACE(subhead, '—', '-'),
  subhead_2   = REPLACE(subhead_2, '—', '-'),
  cta_text    = REPLACE(cta_text, '—', '-'),
  items       = REPLACE(items::text, '—', '-')::jsonb,
  items_2     = REPLACE(items_2::text, '—', '-')::jsonb,
  page_blocks = REPLACE(page_blocks::text, '—', '-')::jsonb,
  page_meta_description = REPLACE(page_meta_description, '—', '-')
WHERE TRUE;

-- 2. landing_faq
UPDATE landing_faq
SET
  question = REPLACE(question, '—', '-'),
  answer   = REPLACE(answer, '—', '-')
WHERE question LIKE '%—%' OR answer LIKE '%—%';

-- 3. site_settings — тексти лендингу
UPDATE site_settings
SET value = REPLACE(value, '—', '-')
WHERE value LIKE '%—%';

-- 4. products — товари
UPDATE products
SET
  name              = REPLACE(name, '—', '-'),
  short_description = REPLACE(short_description, '—', '-'),
  description       = REPLACE(description, '—', '-'),
  characteristics   = REPLACE(characteristics::text, '—', '-')::jsonb
WHERE TRUE;

-- 5. categories
UPDATE categories
SET name = REPLACE(name, '—', '-')
WHERE name LIKE '%—%';

NOTIFY pgrst, 'reload schema';
