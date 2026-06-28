# Runbook: міграція на R2 (день старту)

Покрокова інструкція коли сайт розблокується.

## Передумови (зробити заздалегідь)

- [ ] R2 bucket `100candle-storage` створено в Cloudflare
- [ ] Public access (R2.dev subdomain) увімкнено → отримали `R2_PUBLIC_URL`
- [ ] API token створено → є `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`
- [ ] Згенеровано випадковий `ADMIN_UPLOAD_TOKEN` (наприклад `openssl rand -hex 32`)

## День Х: сайт розблоковано — стартуємо

### 1. Бекап Supabase (5 хв)

Supabase Dashboard → Database → Backups → Download a backup
Зберегти `.sql` файл локально.

### 2. Запис токена в БД (1 хв)

Supabase → SQL Editor:

```sql
INSERT INTO site_settings (key, value)
VALUES ('admin_upload_token', 'ВСТАВИТИ_ЗГЕНЕРОВАНИЙ_ТОКЕН')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### 3. Міграція файлів (1-2 години залежно від обʼєму)

```bash
cd migration-r2
cp .env.example .env
# відредагувати .env з реальними значеннями
npm install
node migrate-files.js
```

Чекати завершення. У кінці буде:
- `url-mapping.json` — список переніс. файлів
- `update-urls.sql` — SQL для оновлення БД
- `errors.json` — якщо були помилки

### 4. Перевірка доступності (5 хв)

```bash
node verify.js
```

Має показати `❌ Недоступні: 0`. Якщо є недоступні — перевірити R2 Public Access налаштування.

### 5. Оновити URL у БД (1 хв)

Supabase → SQL Editor → запустити `update-urls.sql`.
В кінці перевірити query повертає `leftovers = 0` для всіх таблиць.
Якщо так — `COMMIT;`. Якщо ні — `ROLLBACK;` і виявити де ще зберігаються URL.

### 6. Деплой коду (5 хв)

```bash
git add api/r2-upload.js assets/r2-uploader.js package.json
# + правки admin.html
git commit -m "feat: migrate file storage to Cloudflare R2"
git push
```

У Vercel → Environment Variables додати:
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET=100candle-storage`
- `R2_PUBLIC_URL`
- `ADMIN_UPLOAD_TOKEN` (той самий що у БД)

Redeploy.

### 7. Тестування (10 хв)

- [ ] Відкрити головну — фото товарів вантажаться
- [ ] Відкрити сторінку курсу — обкладинка є, відгуки є
- [ ] Зайти в адмінку → завантажити нове фото → перевірити що URL = r2.dev
- [ ] Через DevTools перевірити: запити на фото йдуть на pub-XXX.r2.dev, не supabase.co
- [ ] Перевірити що видалення товару не ламається

### 8. Через 1-2 тижні (коли впевнились що все ок)

- [ ] Видалити старі buckets у Supabase Storage (звільнити 0.5 GB)
- [ ] Регенерувати `SUPABASE_SERVICE_KEY` (бо використовували в скрипті)

## Rollback (якщо щось пішло не так)

Supabase SQL Editor → запустити `rollback-urls.sql`.
URL повернуться на Supabase Storage (файли там не видалялись).

Сайт буде працювати як раніше — але з ризиком знов вичерпати квоту.

## Що робити якщо щось зламалось

| Симптом | Причина | Що робити |
|---|---|---|
| Фото 403 Forbidden у браузері | R2 public access вимкнено | R2 → Settings → Public Access → enable r2.dev |
| Upload з адмінки 401 | ADMIN_UPLOAD_TOKEN не співпадає | Перевірити Vercel env vs БД |
| Upload 413 Too Large | Файл > 50 MB | Збільшити sizeLimit у api/r2-upload.js config |
| URL у БД не оновились | update-urls.sql не запустили | Запустити в SQL Editor |
| `errors.json` має багато файлів | Supabase знов restricted | Чекати грейс-період / писати в support |
