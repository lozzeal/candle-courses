-- ============================================================
-- product_media: додаємо metadata JSONB для зберігання
-- налаштувань відео плеєра (autoplay, loop, muted, aspect_ratio тощо)
-- та підтримки URL-відео (YouTube/Vimeo) без storage_path
-- ============================================================

ALTER TABLE product_media ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Зробити storage_path NULLable, бо для URL-відео його не буде
ALTER TABLE product_media ALTER COLUMN storage_path DROP NOT NULL;

NOTIFY pgrst, 'reload schema';
