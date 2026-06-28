# Міграція Storage: Supabase → Cloudflare R2

## Що це робить

Переносить ВСІ файли (фото товарів, фото курсів, фото відгуків, відео)
з Supabase Storage на безкоштовний Cloudflare R2. Після міграції — **без лімітів трафіку**.

## Перед стартом — потрібно від клієнта

### 1. Cloudflare R2 bucket
В дашборді Cloudflare → R2 → Create bucket:
- Назва: `100candle-storage`
- Локація: Auto / EU
- Public access: **увімкнути R2.dev subdomain** (Settings → Public Access → r2.dev)

Запам'ятати **публічний URL** виду:
```
https://pub-xxxxxxxxxxxxx.r2.dev
```

### 2. API Token
Cloudflare R2 → Manage R2 API Tokens → Create API token:
- Permissions: **Object Read & Write**
- Bucket: `100candle-storage` (або All buckets)

Скопіювати:
- `Access Key ID`
- `Secret Access Key`
- `Endpoint URL` (виду `https://<account-id>.r2.cloudflarestorage.com`)

### 3. Supabase Service Role Key
У Supabase Dashboard → Settings → API → `service_role` secret.
Це БЕЗПЕЧНО — використовуємо ОДНОРАЗОВО для читання Storage. Після міграції потрібно регенерувати.

## Налаштування

Створити файл `.env` у цій папці:

```env
# Cloudflare R2
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=100candle-storage
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxx.r2.dev

# Supabase (тимчасово)
SUPABASE_URL=https://jmfudjhembgeaztowcoe.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...   # service_role, НЕ anon
```

## Запуск міграції

```bash
cd migration-r2
npm install
node migrate-files.js
```

Що відбувається:
1. Скрипт **читає список усіх файлів** з `product-photos` і `product-videos` buckets
2. Для кожного — **скачує з Supabase**, **завантажує в R2**
3. Зберігає мапінг старого URL → новий R2 URL у `url-mapping.json`
4. Прогрес видно в консолі (X / Y файлів)
5. У кінці — генерує файл `update-urls.sql` з SQL для оновлення БД

## Після завантаження файлів

1. Відкрити Supabase Dashboard → SQL Editor
2. Запустити `update-urls.sql` (згенерується автоматично)
3. Перевірити що сайт працює з R2 URL
4. Через 1-2 тижні (як упевнимось) — видалити старі buckets у Supabase

## Зміни в коді

Після успішної міграції — застосувати патчі з папки `patches/`:

- `admin.html` — uploads перенаправляються на R2 замість Supabase
- `api/r2-upload.js` — новий API endpoint для signed uploads з адмінки

## Rollback

Якщо щось піде не так — старі файли в Supabase **не видаляються** автоматично.
Можна повернутись на старі URL через зворотний SQL у `rollback-urls.sql`.

## Структура файлів

```
migration-r2/
├── README.md             ← цей файл
├── package.json          ← залежності (S3 SDK, Supabase)
├── .env.example          ← шаблон env vars
├── migrate-files.js      ← головний скрипт міграції
├── verify.js             ← перевіряє що всі файли доступні з R2
├── patches/
│   ├── admin-r2-uploads.md      ← інструкція як змінити admin.html
│   └── api-r2-upload.js         ← новий API endpoint (опційно)
└── (генерується)
    ├── url-mapping.json   ← результат міграції
    ├── update-urls.sql    ← SQL для оновлення БД
    └── rollback-urls.sql  ← SQL для відкату
```
