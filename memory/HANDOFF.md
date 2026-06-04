# HANDOFF — candle-courses (повний контекст для нового чату)

> Скопіюйте цей файл або вставте посилання на нього на початку нового чату.
> Документ містить ВСЕ, що треба, щоб продовжити проєкт без втрати контексту.

---

## 1. Клієнт і продукт

- **Клієнт:** Галина Барзій (Telegram: @GalunaSpeak, email: okvozuk@gmail.com)
- **Менеджер/власник:** Дмитро (denys_creo@ukr.net)
- **Проєкт:** інтернет-магазин курсів зі свічковаріння та декору
- **Домен (prod):** https://100candle.shop
- **Vercel preview:** https://candle-courses-teal.vercel.app
- **GitHub:** `lozzeal/candle-courses` (public)
- **Vercel team:** `denys-creo-1974s-projects` (особистий акаунт Дмитра)
- **Мова сайту й чату:** українська. Формальне "ви" в усіх текстах.

### Курси (5 шт)
| slug | назва | telegram-група |
|---|---|---|
| course-svichkovarinnia | Свічковаріння | https://t.me/+zl-Rvs5uFl00MTg8 |
| course-desertna | Десертна | https://t.me/+2582i_9mOWMyODJk |
| course-hips-beton | Гіпс/Бетон | https://t.me/+RKlz8j6xFWE3ZjVk |
| course-betonna | Бетонна | https://t.me/+LQLU1wO3FhgzZDJk |
| course-reklama | Реклама | https://t.me/+Zt0u0R2HNU03MGY6 |

---

## 2. Технічний стек

- **Frontend:** статичні HTML/CSS/Vanilla JS (без фреймворку, без білду)
- **Hosting:** Vercel (serverless functions у `/api`)
- **DB + Auth + Storage:** Supabase
- **Платіжка:** WayForPay (5 окремих кнопок, по одній на курс)
- **Сповіщення:** Telegram Bot API (notify в адмін-групу) + WayForPay
- **Email (в розробці):** SendPulse SMTP
- **DNS / пошта:** Ukraine.com.ua (редирект `*@100candle.shop` → `okvozuk@gmail.com`)
- **Аналітика:** GA4, Meta Pixel, GTM, TikTok (керується з адмінки)

### Ключі (зберігаються у Vercel env vars, НЕ в коді):
- `SUPABASE_URL` = `https://jmfudjhembgeaztowcoe.supabase.co`
- `SUPABASE_ANON_KEY` (публічний, у клієнт-коді)
- `SUPABASE_SERVICE_ROLE_KEY` (секретний)
- `TELEGRAM_BOT_TOKEN` = `8567819677:AAFlCBvDBqNHj1wSXSpogcmFrujo47G8HBM`
- `TELEGRAM_CHAT_ID` (адмін-група)

⚠️ **Security note:** клієнт випадково пастив паролі/ключі в чат раніше — нагадувати їх НЕ повторювати, а змінювати скомпрометовані.

---

## 3. Структура файлів

```
candle-courses/
├── index.html              ← головний лендинг (динамічно тягне з Supabase)
├── shop.html               ← магазин фізичних товарів
├── product.html            ← картка товару
├── thanks.html             ← сторінка подяки після оплати (?course=ID або ?slug=...)
├── admin.html              ← єдина SPA-адмінка для клієнтки
├── offer.html, privacy.html ← юр. сторінки
├── api/
│   ├── send-form.js        ← форма → Telegram + Supabase + редирект на WayForPay
│   └── track.js            ← page view → page_views (з геолокацією Vercel headers)
├── assets/
│   ├── analytics-loader.js ← підвантажує піксели з site_settings
│   ├── favicon.svg
│   ├── author-photo-new.jpg, hero-*.png, course-*.jpg, review-01..13.jpg, petals-*.png
│   └── products/           ← фото продуктів
├── database/
│   ├── schema.sql                       ← основна схема (products, orders, site_settings)
│   ├── analytics-schema.sql             ← page_views
│   ├── landing-schema.sql               ← landing_courses
│   ├── landing-faq-schema.sql           ← landing_faq
│   ├── landing-reviews-schema.sql       ← landing_reviews
│   ├── landing-texts-seed.sql           ← seed hero_title_1, author_item_*, etc.
│   ├── landing-courses-telegram.sql     ← ALTER + UPDATE telegram_url для 5 курсів
│   └── storage-policies.sql             ← RLS для Storage
├── memory/                              ← цей файл і daily логи
├── CLAUDE.md, AGENTS.md, README.md, CHANGELOG.md
└── serve.ps1                            ← локальний dev-сервер для Windows
```

---

## 4. Supabase — схема (ключові таблиці)

- **`landing_courses`** — 5 курсів лендингу. Колонки: `id, slug, title, description, price, old_price, photo_url, payment_url, telegram_url, position, is_visible, created_at`
- **`landing_faq`** — FAQ. `id, question, answer, position, is_visible`
- **`landing_reviews`** — відгуки. `id, image_url, position, is_visible`
- **`site_settings`** — k/v налаштування (тексти hero, author_*, аналітика, email-шаблон). Ключі: `hero_title_1`, `hero_title_accent`, `hero_title_2`, `hero_info_1`, `hero_info_2`, `author_sub`, `author_photo`, `author_item_1..4`, плюс piksel ID, кастомний HEAD/BODY HTML.
- **`products`** — фізичні товари (магазин)
- **`orders`** — замовлення з форми. `id, name, phone, email, course_slug, amount, status, telegram_sent, created_at`
- **`page_views`** — аналітика (country, city, path, referrer, ts)

⚠️ Після `ALTER TABLE` бажано додавати `NOTIFY pgrst, 'reload schema';` (інакше PostgREST кешує і дає помилку "Could not find column").

---

## 5. Адмінка (admin.html) — що вже працює

Єдина SPA з вкладками, доступ через Supabase Auth (email/password клієнтки).

**Розділи:**
- **Дашборд** — графіки (page_views по днях з SVG, niceMax-Y-вісь, мобільний бургер)
- **Замовлення** — CRUD усіх полів (не лише статус), фільтри
- **Товари (магазин)** — CRUD + photo upload, видимість 👁️/🔒
- **Лендинг** (4 підвкладки):
  - **Курси** — CRUD, photo upload, `telegram_url`, кнопка «🔗 Доступ» (копія URL), price + old_price з % знижки
  - **FAQ** — CRUD
  - **Відгуки** — CRUD + photo upload
  - **Тексти** — редагування hero/author текстів через `site_settings`
- **Налаштування** — піксели, кастомний HTML/CSS, (планується) шаблон email

**Клієнтка все редагує сама** — без SQL, без коду. Це ключова вимога: цитата клієнта — *"Мені потрібно щоб було зручно: клієнтака буде наприклад змінювати посилання на оплату або на бота"*.

---

## 6. WayForPay — як налаштовано

- 5 окремих кнопок (по одній на курс), URL зберігається у `landing_courses.payment_url`
- **Approve URL:** `https://100candle.shop/thanks.html?slug={course-slug}` — куди редиректить після оплати
- **Service URL:** `https://100candle.shop/api/payment-callback` — *планується* (webhook для email)
- На сторінці thanks.html: зелений чекмарк + назва курсу + кнопка «Приєднатись до Telegram-групи» з `telegram_url`

---

## 7. ⚠️ АКТИВНА ЗАДАЧА: автоматичний email після оплати

### Контекст
Клієнтка переживає: *"Може люди закривають цю сторінку подяки або не бачать її"* — тому треба дублювати посилання на Telegram на email.

### Вибраний підхід — "Спосіб 2"
Кастомний backend (`/api/payment-callback`) + SendPulse SMTP. Чому: клієнтка змінює telegram-посилання в адмінці ОДИН раз — і thanks.html, і email автоматично використовують свіже значення.

### Архітектура майбутнього `/api/payment-callback`
1. Приймає webhook від WayForPay (POST з orderReference, amount, merchantSignature)
2. Перевіряє HMAC-MD5 підпис з Merchant Secret Key
3. По `orderReference` шукає замовлення в `orders`
4. По `course_slug` бере `telegram_url` з `landing_courses`
5. Бере шаблон листа з `site_settings.email_template`
6. Відсилає email через SendPulse SMTP
7. Відповідає WayForPay стандартним JSON з підписом
8. Лог у `orders.email_sent = true`

### Що залишилось зробити
1. ⏳ Клієнтка зберегла редирект `*@100candle.shop → okvozuk@gmail.com` на Ukraine.com.ua
2. ⏳ Клієнтка реєструється на SendPulse, вводить `noreply@100candle.shop` у "Анкеті користувача"
3. ⏳ Підтверджує email (лист прийде на Gmail через редирект)
4. ⏳ SendPulse дасть DKIM-запис → додати в DNS Ukraine.com.ua
5. ⏳ Клієнтка надсилає SMTP-логін + пароль
6. ⏳ Клієнтка дає Merchant Secret Key з WayForPay
7. 📝 Розробити `/api/payment-callback.js` (Node.js, без зовнішніх deps або `nodemailer`)
8. 📝 HTML шаблон email — українською, з брендом, кнопкою на Telegram
9. 📝 Додати поле "Шаблон листа" в адмінку → Налаштування (`site_settings.email_template`)
10. 📝 Бонус: кнопка «Надіслати лист повторно» в адмінці на замовленні
11. ✅ Тест на реальній оплаті
12. ⏳ Прописати Service URL у всі 5 кнопок WayForPay

### Альтернативи, які розглядали і відкинули
- ❌ SendPulse прямий drag&drop (бо клієнтка б редагувала посилання в ДВОХ місцях)
- ❌ Gmail SMTP (SendPulse не приймає безкоштовні домени)

---

## 8. Виправлені баги (історія, щоб не повторювати)

| Баг | Причина | Фікс |
|---|---|---|
| "Could not find column telegram_url" | PostgREST schema cache | `NOTIFY pgrst, 'reload schema';` |
| "ОПУБЛ." бейдж у лівому-верхньому куті | `position:absolute` витікав з картки магазину | inline `position:static;display:inline-block` |
| Y-вісь графіку 0–5 при 1 точці | `niceMax()` не масштабував | Адаптовано під реальний max |
| Точки графіку розтягнуті | SVG `preserveAspectRatio="none"` | Замінено на `xMidYMid meet` |
| Підписи X не співпадали з точками | Окремий HTML контейнер | Перенесено всередину SVG |
| Стара ціна не відображалась | `old_price` не рендерився | Додано price-block зі strikethrough + % |
| Кирилиця ламалась у Telegram-нотифі | Vercel auto-parser body | Вимкнуто, читаємо raw UTF-8 |
| SQL syntax error на "-" | Користувач пастив у ту саму вкладку | Відкривати нову вкладку SQL Editor |

---

## 9. Безпека на формі замовлення (api/send-form.js)

4 шари захисту:
1. **Origin check** — лише з `100candle.shop`
2. **Rate limit** — по IP
3. **Honeypot** — приховане поле, бот заповнює → відкидаємо
4. **Empty check** — обовʼязкові поля

---

## 10. Правила роботи (з CLAUDE.md проєкту)

- ❌ Не редизайнити секції лендингу — все signed off клієнтом
- ❌ Не міняти кольори/шрифти (CSS змінні в `:root`)
- ❌ Не міняти формальне "ви" на "ти"
- ❌ Не чіпати мобільний hero без явного запиту (pixel-perfect на background image)
- ❌ Не видаляти файли з `assets/` (навіть якщо здається невикористовуваним)
- ❌ Не додавати emoji в розмітку (тільки inline SVG)
- ❌ Не додавати зовнішні JS/CSS файли — все inline у `index.html`
- ✅ Реплай завжди українською
- ✅ Пояснювати простою мовою (клієнтка нетехнічна)
- ✅ Малі, оборотні diff-и; питати перед широкими змінами

---

## 11. Дизайн-система (recap)

```css
--color-text:       #262626;
--color-accent:     #38A30D;            /* зелений CTA */
--gradient-cta:     linear-gradient(#49C318, #38A30D);
--gradient-soft:    linear-gradient(#FFFCFC, #FFF0F0);   /* світло-рожеві панелі */
--gradient-pink:    linear-gradient(#FFE5E0, #FFD9D2);   /* темно-рожеві */
--color-bg:         #A69D97;            /* сірий фон */
--color-author-border: #F5D9D0;
```

- **Заголовки:** Cormorant Garamond uppercase 600
- **Body:** Inter
- **Структура:** чергування світло-рожевого і сірого фонів, кожна секція ≈ один viewport на desktop

---

## 12. Як починати новий чат

Просто скиньте Claude перше повідомлення на кшталт:

> Продовжуємо проєкт candle-courses. Прочитай контекст:
> `E:/Cloude/clients/candle-courses/memory/HANDOFF.md`
> і `E:/Cloude/clients/candle-courses/CLAUDE.md`.
> Поточна задача — [опишіть конкретно, що робити далі].

Claude підхопить весь контекст і продовжить без втрати деталей.

---

_Останнє оновлення: 2026-06-02_
