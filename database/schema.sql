-- ============================================================
-- 100candle.shop — повна схема БД
-- Запустити у Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ============================================================
-- 1. CATEGORIES (категорії та підкатегорії)
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  icon_svg TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- ============================================================
-- 2. PRODUCTS (товари)
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_description TEXT,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  old_price NUMERIC(10, 2) CHECK (old_price >= 0),
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  tag TEXT CHECK (tag IN ('hit','new','sale')),
  sort_order INTEGER DEFAULT 0,
  characteristics JSONB DEFAULT '[]'::JSONB,  -- [{key:"Висота", value:"18 см"}, ...]
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_sort ON products(sort_order);

-- ============================================================
-- 3. PRODUCT MEDIA (фото та відео для товарів)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_media (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('photo','video')),
  url TEXT NOT NULL,
  storage_path TEXT,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_media_product ON product_media(product_id);
CREATE INDEX IF NOT EXISTS idx_media_sort ON product_media(sort_order);

-- ============================================================
-- 4. ORDERS (заявки з форм)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  subject TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  product_or_course TEXT,
  comment TEXT,
  source_page TEXT,
  amount NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','confirmed','paid','shipped','cancelled')),
  payment_status TEXT,
  raw_data JSONB,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);

-- ============================================================
-- 5. SITE SETTINGS (налаштування з адмінки)
-- ============================================================
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS settings_updated_at ON site_settings;
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS) — хто що бачить
-- ============================================================

-- CATEGORIES: публічно читати, тільки auth писати
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_categories" ON categories;
DROP POLICY IF EXISTS "auth_write_categories" ON categories;
CREATE POLICY "public_read_categories" ON categories FOR SELECT USING (true);
CREATE POLICY "auth_write_categories" ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PRODUCTS: публічно читати тільки published, auth — все
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_published_products" ON products;
DROP POLICY IF EXISTS "auth_full_access_products" ON products;
CREATE POLICY "public_read_published_products" ON products FOR SELECT USING (status = 'published');
CREATE POLICY "auth_full_access_products" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PRODUCT_MEDIA: публічно — тільки для published товарів, auth — все
ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_media_published" ON product_media;
DROP POLICY IF EXISTS "auth_full_access_media" ON product_media;
CREATE POLICY "public_read_media_published" ON product_media FOR SELECT USING (
  EXISTS (SELECT 1 FROM products WHERE products.id = product_media.product_id AND products.status = 'published')
);
CREATE POLICY "auth_full_access_media" ON product_media FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ORDERS: будь-хто може INSERT (через service_role з API), auth — читає/змінює
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_can_insert_orders" ON orders;
DROP POLICY IF EXISTS "auth_can_read_orders" ON orders;
DROP POLICY IF EXISTS "auth_can_update_orders" ON orders;
CREATE POLICY "anyone_can_insert_orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "auth_can_read_orders" ON orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_can_update_orders" ON orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- SITE_SETTINGS: публічно читати, тільки auth писати
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_settings" ON site_settings;
DROP POLICY IF EXISTS "auth_write_settings" ON site_settings;
CREATE POLICY "public_read_settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "auth_write_settings" ON site_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 8. SEED DATA — категорії
-- ============================================================
INSERT INTO categories (name, slug, sort_order, icon_svg) VALUES
  ('Свічки', 'svichky', 1, '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3v10M9 6c0-1.657 1.343-3 3-3s3 1.343 3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="7" y="13" width="10" height="8" rx="2" stroke="currentColor" stroke-width="1.8"/></svg>'),
  ('Аромапродукти', 'aromaprodukty', 2, '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2c0 0-4 4-4 8a4 4 0 008 0c0-4-4-8-4-8z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT n, s, p.id, o FROM (VALUES
  ('Подарункові набори', 'podarunkovi-nabory', 1),
  ('Фігурні свічки', 'figurni-svichky', 2),
  ('Аромасвічки', 'aromasvichky', 3),
  ('Весільні свічки', 'vesilni-svichky', 4),
  ('З таємним написом', 'taemnyi-napys', 5)
) AS sub(n, s, o), categories p WHERE p.slug = 'svichky'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, parent_id, sort_order)
SELECT n, s, p.id, o FROM (VALUES
  ('Спреї для дому', 'sprei-dlia-domu', 1)
) AS sub(n, s, o), categories p WHERE p.slug = 'aromaprodukty'
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 9. SEED DATA — 11 поточних товарів (як приклад)
-- ============================================================
INSERT INTO products (name, slug, short_description, price, old_price, category_id, status, tag, sort_order)
SELECT n, s, sd, p, op, c.id, 'published', t, o FROM (VALUES
  ('Букет «Полуничний рай»', 'buket-poluniciny-ray', 'Соєвий букет із троянд та полуниць у рожевій коробці', 980, 1150, 'podarunkovi-nabory', 'sale', 1),
  ('Набір «Романтичний вечір»', 'nabir-romanticnyi-vechir', 'Набір з 3 свічок різних форм', 1200, NULL, 'podarunkovi-nabory', NULL, 2),
  ('Букет троянд', 'buket-troyand', 'Фігурна свічка-троянда', 380, NULL, 'figurni-svichky', NULL, 3),
  ('Свічка-піон білий', 'svichka-pion-bilyi', 'Фігурна свічка у вигляді піону', 270, 320, 'figurni-svichky', 'sale', 4),
  ('Соєва свічка «Ваніль»', 'sojeva-svichka-vanil', 'Ароматна соєва свічка з ароматом ванілі', 220, NULL, 'aromasvichky', NULL, 5),
  ('Соєва свічка «Лаванда»', 'sojeva-svichka-lavanda', 'Ароматна соєва свічка з ароматом лаванди', 240, NULL, 'aromasvichky', 'hit', 6),
  ('Свічки для церемонії (пара)', 'svichky-tseremonia', 'Весільні свічки для церемонії', 680, NULL, 'vesilni-svichky', NULL, 7),
  ('Сімейне вогнище (набір 3 шт)', 'simejne-vohnyshche', 'Весільний набір для сімейного вогнища', 950, NULL, 'vesilni-svichky', NULL, 8),
  ('Свічка-сюрприз «Я тебе кохаю»', 'svichka-syurpryz-kohanyy', 'Свічка з таємним написом-сюрпризом', 320, NULL, 'taemnyi-napys', 'new', 9),
  ('З персональним повідомленням', 'svichka-personalna', 'Свічка з вашим індивідуальним написом', 350, NULL, 'taemnyi-napys', NULL, 10),
  ('Спрей для дому «Сандал»', 'sprey-sandal-100ml', 'Аромаспрей для дому з ароматом сандалу, 50 мл', 280, NULL, 'sprei-dlia-domu', NULL, 11)
) AS sub(n, s, sd, p, op, cat_slug, t, o), categories c WHERE c.slug = sub.cat_slug
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 10. SEED DATA — налаштування за замовчуванням
-- ============================================================
INSERT INTO site_settings (key, value) VALUES
  ('contact_telegram', '@GalunaSpeak'),
  ('contact_phone', '+380 98 131 45 35'),
  ('contact_email', 'okvozuk@gmail.com'),
  ('company_name', 'ФОП Барзій Галина Йосифівна'),
  ('company_tax_id', '3052920946'),
  ('ga4_id', ''),
  ('meta_pixel_id', ''),
  ('gtm_id', ''),
  ('custom_head_html', '')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- ГОТОВО
-- ============================================================
-- Перевірка: SELECT * FROM categories;
-- Перевірка: SELECT * FROM products;
