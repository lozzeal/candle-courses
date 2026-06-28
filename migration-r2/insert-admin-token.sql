-- Додаємо токен для авторизації admin uploads через /api/r2-upload
-- Той самий що MIGRATION_TOKEN у Vercel env
INSERT INTO site_settings (key, value)
VALUES ('admin_upload_token', '99c28288dccaf13b17a2a6a29f1c63f4')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
