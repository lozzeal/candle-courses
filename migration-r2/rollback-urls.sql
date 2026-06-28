-- ROLLBACK: повертає URL з R2 назад на Supabase
BEGIN;

UPDATE product_media SET url = REPLACE(url, 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/', 'https://jmfudjhembgeaztowcoe.supabase.co/storage/v1/object/public/') WHERE url LIKE 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/%';
UPDATE landing_courses SET photo_path = REPLACE(photo_path, 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/', 'https://jmfudjhembgeaztowcoe.supabase.co/storage/v1/object/public/') WHERE photo_path LIKE 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/%';
UPDATE landing_reviews SET photo_url = REPLACE(photo_url, 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/', 'https://jmfudjhembgeaztowcoe.supabase.co/storage/v1/object/public/') WHERE photo_url LIKE 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/%';
UPDATE site_settings SET value = REPLACE(value, 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/', 'https://jmfudjhembgeaztowcoe.supabase.co/storage/v1/object/public/') WHERE value LIKE 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/%';
UPDATE landing_courses SET page_blocks = REPLACE(page_blocks::text, 'https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/', 'https://jmfudjhembgeaztowcoe.supabase.co/storage/v1/object/public/')::jsonb WHERE page_blocks::text LIKE '%https://pub-c592ff7c5525495eaa72bd1913f1c053.r2.dev/%';

COMMIT;
