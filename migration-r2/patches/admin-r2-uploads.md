# Патч admin.html → uploads йдуть у R2

Цей патч робить так, щоб **нові** завантаження фото/відео в адмінці йшли в Cloudflare R2,
а не в Supabase Storage. Старі URL (вже мігровані) працюватимуть як раніше.

## Крок 1. Підключити uploader

У `<head>` admin.html, ПІСЛЯ підключення supabase-js:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="assets/r2-uploader.js"></script>   <!-- ← ДОДАТИ -->
```

## Крок 2. Записати ADMIN_UPLOAD_TOKEN

Після успішного логіну (наприклад у функції `onAuth()`), записати токен:

```js
// Один раз: у Supabase SQL виконати
//   INSERT INTO site_settings(key, value) VALUES ('admin_upload_token', 'СГЕНЕРОВАНИЙ_ВИПАДКОВИЙ_ТОКЕН');
// Цей токен НЕ публічний; адмінка читає його лише після логіну.

const { data: tok } = await supa.from('site_settings').select('value').eq('key', 'admin_upload_token').single();
if (tok?.value) window.ADMIN_UPLOAD_TOKEN = tok.value;
```

Той самий токен прописати у Vercel → Environment Variables як `ADMIN_UPLOAD_TOKEN`.

## Крок 3. Замінити uploads

У admin.html є **9 місць** з `supa.storage.from(...).upload(...)`. Кожне замінити шаблоном:

### БУЛО

```js
const bucket = 'product-photos'; // або 'product-videos'
const path = `products/${productId}/${Date.now()}-${file.name}`;
const { error } = await supa.storage.from(bucket).upload(path, file, {
  cacheControl: '3600', upsert: false
});
if (error) { alert('Помилка: ' + error.message); return; }
const { data: { publicUrl } } = supa.storage.from(bucket).getPublicUrl(path);
// тепер маємо publicUrl
```

### СТАЛО

```js
const bucket = 'product-photos';
const path = `products/${productId}/${Date.now()}-${file.name}`;
const { url: publicUrl, error } = await uploadToR2({ bucket, path, file });
if (error) { alert('Помилка: ' + error.message); return; }
// тепер маємо publicUrl
```

## Список місць для заміни (рядки на момент написання)

Шукати в admin.html через `Ctrl+F`:

| # | Контекст | Орієнтовний рядок |
|---|---|---|
| 1 | `supa.storage.from(bucket).upload(path, file` (товари — фото/відео) | ~2476 |
| 2 | `supa.storage.from('product-photos').upload(path, file` (logo/банер) | ~3110 |
| 3 | `supa.storage.from('product-photos').upload(path, file` (review picker) | ~3181 |
| 4 | `supa.storage.from('product-photos').upload(path, file` (cover курсу) | ~3484 |
| 5 | `supa.storage.from('product-photos').upload(path, file` (відгуки в редакторі курсу) | ~4096 |
| 6 | `supa.storage.from('product-videos').upload(path, file` (відео курсу) | ~4275 |
| 7 | `supa.storage.from('product-photos').upload(path, file` (інше) | ~4296 |

Замість `.getPublicUrl(path)` після успішного upload **викидати** — `url` уже повертається з `uploadToR2`.

## Крок 4. Delete (видалення)

В адмінці є `supa.storage.from(bucket).remove([path])`. Для R2 поки **залишити як є** — старі файли в Supabase видалятимуться, нові файли в R2 поки залишатимуться (R2 безкоштовний, місце не критичне).

Якщо хочеться повноцінного delete — додати endpoint `/api/r2-delete.js` (аналогічно `r2-upload.js`, але з `DeleteObjectCommand`).

## Крок 5. Тестування

1. Задеплоїти зміни
2. Зайти в адмінку
3. Завантажити нове фото для тестового товару
4. Перевірити що URL у БД починається з `https://pub-XXXXX.r2.dev/...`
5. Перевірити що фото вантажиться на сторінці товару
6. Перевірити DevTools → Network — запит має йти на r2.dev, не на supabase.co
