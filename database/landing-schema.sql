-- ============================================================
-- Таблиця landing_courses — редагування курсів на лендингу
-- Запустити у Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS landing_courses (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,           -- course-svichkovarinnia → id у HTML
  title TEXT NOT NULL,
  badge TEXT,                          -- "30 відеоуроків", "мінікурс"
  intro TEXT,                          -- абзац вступу (опційно)
  subhead TEXT,                        -- "Освоїмо техніки:" (опційно)
  items JSONB DEFAULT '[]'::JSONB,     -- основний список ['пункт 1', 'пункт 2', ...]
  subhead_2 TEXT,                      -- другий підзаголовок (опційно)
  items_2 JSONB DEFAULT '[]'::JSONB,   -- другий список (опційно)
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  old_price NUMERIC(10, 2),
  payment_url TEXT,                    -- WayForPay
  photo_path TEXT,                     -- 'assets/course-...jpg' або повний URL
  cta_text TEXT DEFAULT 'Обрати цей курс',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','draft','archived')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lc_sort ON landing_courses(sort_order);
CREATE INDEX IF NOT EXISTS idx_lc_status ON landing_courses(status);
CREATE INDEX IF NOT EXISTS idx_lc_slug ON landing_courses(slug);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS landing_courses_updated_at ON landing_courses;
CREATE TRIGGER landing_courses_updated_at BEFORE UPDATE ON landing_courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE landing_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_landing_courses" ON landing_courses;
DROP POLICY IF EXISTS "auth_write_landing_courses" ON landing_courses;
CREATE POLICY "public_read_landing_courses" ON landing_courses
  FOR SELECT USING (status = 'published');
CREATE POLICY "auth_write_landing_courses" ON landing_courses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SEED: поточні 5 курсів з index.html
-- ============================================================

INSERT INTO landing_courses (slug, title, badge, items, price, payment_url, photo_path, cta_text, sort_order)
VALUES (
  'course-svichkovarinnia',
  'Свічковаріння базовий + професійний',
  '30 відеоуроків',
  '["масажні свічки","ароматичні свічки в тарі","формові свічки","свічні букети","свічки з вощини","гелеві свічки","кольорові свічки","насипні свічки","аромадифузори","автопарфуми","аромасаше","як робити воскові листи","як зробити віск пластичним","робота з 12 видами воску","як уникати проблем із запахом, кольором і текстурою","як зробити таємний напис у свічці, який проявляється при запалюванні"]'::JSONB,
  1200,
  'https://secure.wayforpay.com/button/be9efda8c4564',
  'assets/course-04a0c0ad.jpg',
  'Обрати цей курс',
  1
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO landing_courses (slug, title, badge, items, price, payment_url, photo_path, cta_text, sort_order)
VALUES (
  'course-desertna',
  'Десертна свічка',
  '17 відеоуроків',
  '["свічка у вигляді морозива","свічка бенто торт","свічка латте","свічка варення","свічка шампанське","свічка капкейк","свічка налисник","свічка десерт","як робити реалістичний свічний крем","імітація шоколаду, варення, пудри та крихти","робота з різними восками (соєвий, бджолиний, кокосовий, гель)","як зробити, щоб кольори не змішувались","підбір ароматів для десертних свічок"]'::JSONB,
  1200,
  'https://secure.wayforpay.com/button/b797a05100114',
  'assets/course-2-6793c76e.jpg',
  'Обрати цей курс',
  2
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO landing_courses (slug, title, badge, subhead, items, items_2, price, payment_url, photo_path, cta_text, sort_order)
VALUES (
  'course-hips-beton',
  'Гіпсові та бетонні вироби',
  '20 відеоуроків',
  'Освоїмо техніки:',
  '["золотий мармур","тераццо","текстурні поверхні","насичений чорний","техніка зістарювання","перламутрове покриття","білосніжні вироби","мармур","бархатне покриття"]'::JSONB,
  '["навчитесь виготовляти гіпсову та бетонну тару","правильно обробляти та декорувати вироби","робити формули розрахунку сумішей","створювати вироби без бульбашок","досягати рівномірного кольору","робота зі складними формами","підбір матеріалів і лаків","тест декоративних матеріалів"]'::JSONB,
  1200,
  'https://secure.wayforpay.com/button/bfd3f21144041',
  'assets/course-3-7b7b4a75.jpg',
  'Обрати цей курс',
  3
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO landing_courses (slug, title, badge, intro, subhead, items, items_2, price, payment_url, photo_path, cta_text, sort_order)
VALUES (
  'course-betonna',
  'Бетонна свічка',
  '14 відеоуроків',
  'Навчитесь виготовляти високі бетонні свічки та бетонну тару в різних дизайнерських техніках.',
  'Техніки на курсі:',
  '["Зруйнований бетон","Декор камінням","Оздоблення поталю","Створення рельєфу та виямок","Фарбування бетону","Робота з епоксидною смолою"]'::JSONB,
  '["Навчитесь як легко виймати вироби без пошкоджень","Як уникнути окислення і позеленіння поталі","Все про роботу з восками: вибір воску, фарбування та ароматизація"]'::JSONB,
  1200,
  'https://secure.wayforpay.com/button/b20ffaef29e87',
  'assets/course-4-2d5142c3.jpg',
  'Обрати цей курс',
  4
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO landing_courses (slug, title, badge, subhead, items, price, payment_url, photo_path, cta_text, sort_order)
VALUES (
  'course-reklama',
  'Реклама для своїх виробів',
  'мінікурс',
  'Навчитесь:',
  '["запускати рекламу через кнопку «просувати»","правильно налаштовувати покази","отримувати заявки без таргетолога","просувати свої вироби та послуги самостійно"]'::JSONB,
  550,
  'https://secure.wayforpay.com/button/bf32a114536b3',
  'assets/course-5-7c05264b.jpg',
  'Отримати мінікурс',
  5
) ON CONFLICT (slug) DO NOTHING;
