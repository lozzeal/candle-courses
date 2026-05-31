-- ============================================================
-- Додаємо колонку telegram_url до landing_courses
-- Запустити у Supabase SQL Editor
-- ============================================================

ALTER TABLE landing_courses ADD COLUMN IF NOT EXISTS telegram_url TEXT;

-- Заповнюємо для існуючих 5 курсів
UPDATE landing_courses SET telegram_url = 'https://t.me/+zl-Rvs5uFl00MTg8' WHERE slug = 'course-svichkovarinnia';
UPDATE landing_courses SET telegram_url = 'https://t.me/+2582i_9mOWMyODJk' WHERE slug = 'course-desertna';
UPDATE landing_courses SET telegram_url = 'https://t.me/+RKlz8j6xFWE3ZjVk' WHERE slug = 'course-hips-beton';
UPDATE landing_courses SET telegram_url = 'https://t.me/+LQLU1wO3FhgzZDJk' WHERE slug = 'course-betonna';
UPDATE landing_courses SET telegram_url = 'https://t.me/+Zt0u0R2HNU03MGY6' WHERE slug = 'course-reklama';
