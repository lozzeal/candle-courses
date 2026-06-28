-- ============================================================
-- Оновлення URL з Supabase Storage на Cloudflare R2
-- ============================================================
-- УВАГА: Запустити ПІСЛЯ завершення міграції файлів!
--
-- Перед запуском зробити бекап:
-- Supabase Dashboard → Database → Backups → Download
-- ============================================================

BEGIN;

-- product_media.url (фото і відео товарів)
UPDATE product_media
   SET url = REPLACE(url, 'https://jmfudjhembgeaztowcoe.supabase.co/storage/v1/object/public/', 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/')
 WHERE url LIKE 'https://jmfudjhembgeaztowcoe.supabase.co/storage/v1/object/public/%';

-- landing_courses.photo_path (обкладинки курсів)
UPDATE landing_courses
   SET photo_path = REPLACE(photo_path, 'https://jmfudjhembgeaztowcoe.supabase.co/storage/v1/object/public/', 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/')
 WHERE photo_path LIKE 'https://jmfudjhembgeaztowcoe.supabase.co/storage/v1/object/public/%';

-- landing_courses.page_blocks (URL всередині JSONB блоків курсів)
UPDATE landing_courses
   SET page_blocks = REPLACE(page_blocks::text, 'https://jmfudjhembgeaztowcoe.supabase.co/storage/v1/object/public/', 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/')::jsonb
 WHERE page_blocks::text LIKE '%https://jmfudjhembgeaztowcoe.supabase.co/storage/v1/object/public/%';

-- landing_reviews.photo_url (фото відгуків)
UPDATE landing_reviews
   SET photo_url = REPLACE(photo_url, 'https://jmfudjhembgeaztowcoe.supabase.co/storage/v1/object/public/', 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/')
 WHERE photo_url LIKE 'https://jmfudjhembgeaztowcoe.supabase.co/storage/v1/object/public/%';

-- site_settings.value (на випадок якщо там URL логотипів тощо)
UPDATE site_settings
   SET value = REPLACE(value, 'https://jmfudjhembgeaztowcoe.supabase.co/storage/v1/object/public/', 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/')
 WHERE value LIKE 'https://jmfudjhembgeaztowcoe.supabase.co/storage/v1/object/public/%';

-- ============================================================
-- Перевірка: чи залишились старі URL (має бути 0 в усіх рядках)
-- ============================================================
SELECT 'product_media' AS tbl, COUNT(*) AS leftovers FROM product_media WHERE url LIKE 'https://jmfudjhembgeaztowcoe.supabase.co/%'
UNION ALL SELECT 'landing_courses.photo_path', COUNT(*) FROM landing_courses WHERE photo_path LIKE 'https://jmfudjhembgeaztowcoe.supabase.co/%'
UNION ALL SELECT 'landing_courses.page_blocks', COUNT(*) FROM landing_courses WHERE page_blocks::text LIKE '%https://jmfudjhembgeaztowcoe.supabase.co/%'
UNION ALL SELECT 'landing_reviews', COUNT(*) FROM landing_reviews WHERE photo_url LIKE 'https://jmfudjhembgeaztowcoe.supabase.co/%'
UNION ALL SELECT 'site_settings', COUNT(*) FROM site_settings WHERE value LIKE 'https://jmfudjhembgeaztowcoe.supabase.co/%';

-- Якщо leftovers = 0 у всіх рядках → COMMIT;
-- Якщо ні — ROLLBACK; і подивитись де ще зберігаються URL
COMMIT;
