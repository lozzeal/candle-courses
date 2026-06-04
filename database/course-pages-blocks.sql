-- ============================================================
-- Сторінки курсів: блоки контенту як JSONB у landing_courses
-- Запустити у Supabase SQL Editor (нова вкладка)
-- ============================================================

-- Колонка для блоків сторінки (масив обʼєктів)
ALTER TABLE landing_courses ADD COLUMN IF NOT EXISTS page_blocks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE landing_courses ADD COLUMN IF NOT EXISTS page_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE landing_courses ADD COLUMN IF NOT EXISTS page_meta_description TEXT;

-- Структура одного блоку у масиві:
-- {
--   "id": "block-1717428923",                  // унікальний (для drag/sort)
--   "type": "hero" | "text" | "program" | "video" | "reviews" | "works" | "author" | "info" | "cta",
--   "visible": true,
--   "data": {  /* залежить від type */  }
-- }
--
-- Приклади data для кожного типу:
--
-- hero:    { "title": "...", "subtitle": "...", "image": "..." }
-- text:    { "title": "...", "body": "markdown text" }
-- program: { "title": "Програма курсу", "items": [{"title": "...", "details": "..."}] }
-- video:   { "title": "...", "url": "https://...", "type": "youtube|mp4" }
-- reviews: { "title": "...", "review_ids": [1, 2, 3] }
-- works:   { "title": "...", "photos": ["url1", "url2"] }
-- author:  { "use_landing": true, "title": "Про автора" }   // або свій контент
-- info:    { "title": "...", "items": [{"icon": "📚", "text": "..."}] }
-- cta:     { "title": "...", "subtitle": "...", "button_text": "Купити курс" }

NOTIFY pgrst, 'reload schema';
