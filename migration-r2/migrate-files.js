// ============================================================
// HYBRID MIGRATION: Local machine → Supabase Storage → Vercel /api/r2-upload → R2
// ============================================================
// Локальна машина дістає файли (працює), Vercel заливає в R2 (працює).
// Обходить блокування Vercel→Supabase Storage TLS.
// ============================================================

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  R2_PUBLIC_URL,
  VERCEL_URL = 'https://www.100candle.shop',
  MIGRATION_TOKEN,
  ADMIN_UPLOAD_TOKEN, // = MIGRATION_TOKEN, для простоти один токен
  CONCURRENCY = '4',
} = process.env;

const TOKEN = ADMIN_UPLOAD_TOKEN || MIGRATION_TOKEN;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !R2_PUBLIC_URL || !TOKEN) {
  console.error('❌ Не задано env vars. Потрібно: SUPABASE_URL, SUPABASE_ANON_KEY, R2_PUBLIC_URL, MIGRATION_TOKEN');
  process.exit(1);
}

const supaBase = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/`;
const r2Base = `${R2_PUBLIC_URL.replace(/\/$/, '')}/`;
const concurrency = Math.max(1, parseInt(CONCURRENCY, 10) || 4);

// ============================================================
// REST API helper
// ============================================================
async function pgSelect(table, query = '*') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
    },
  });
  if (!res.ok) throw new Error(`PG ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function urlToBucketKey(url) {
  const rest = url.slice(supaBase.length);
  const slash = rest.indexOf('/');
  if (slash < 0) return null;
  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1), full: rest };
}
function guessMime(p) {
  const m = { '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime' };
  return m[path.extname(p).toLowerCase()] || 'application/octet-stream';
}

// ============================================================
// Зібрати всі URL файлів з БД
// ============================================================
async function collectAllFileUrls() {
  const urls = new Set();

  const media = await pgSelect('product_media', 'url,storage_path,type');
  for (const r of media) {
    if (r.url?.startsWith(supaBase)) urls.add(r.url);
    if (r.storage_path && !r.url?.startsWith(supaBase)) {
      const b = r.type === 'video' ? 'product-videos' : 'product-photos';
      urls.add(`${supaBase}${b}/${r.storage_path}`);
    }
  }

  const courses = await pgSelect('landing_courses', 'photo_path,page_blocks');
  for (const r of courses) {
    if (r.photo_path?.startsWith(supaBase)) urls.add(r.photo_path);
    if (r.page_blocks) {
      const str = JSON.stringify(r.page_blocks);
      (str.match(new RegExp(escapeRegex(supaBase) + '[^"\\s\\\\]+', 'g')) || []).forEach(u => urls.add(u));
    }
  }

  const reviews = await pgSelect('landing_reviews', 'photo_url');
  for (const r of reviews) {
    if (r.photo_url?.startsWith(supaBase)) urls.add(r.photo_url);
  }

  const settings = await pgSelect('site_settings', 'value');
  for (const r of settings) {
    if (typeof r.value === 'string' && r.value.startsWith(supaBase)) urls.add(r.value);
  }

  return Array.from(urls).sort();
}

// ============================================================
// Скачати з Supabase Storage (локально) + залити через Vercel в R2
// ============================================================
async function migrateOne(url) {
  const parsed = urlToBucketKey(url);
  if (!parsed) return { error: 'invalid url' };

  // 1) Download from Supabase Storage (locally — works)
  const dlRes = await fetch(url);
  if (!dlRes.ok) throw new Error(`download ${url}: ${dlRes.status}`);
  const arrayBuffer = await dlRes.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  const contentType = dlRes.headers.get('content-type') || guessMime(parsed.path);
  const base64 = buf.toString('base64');

  // 2) Upload via Vercel endpoint → R2
  const upRes = await fetch(`${VERCEL_URL}/api/r2-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': TOKEN,
    },
    body: JSON.stringify({
      bucket: parsed.bucket,
      path: parsed.path,
      contentType,
      base64,
    }),
  });
  if (!upRes.ok) {
    const t = await upRes.text();
    throw new Error(`upload ${upRes.status}: ${t.slice(0, 200)}`);
  }
  const json = await upRes.json();
  return { uploaded: true, key: parsed.full, newUrl: json.url, size: buf.length };
}

// ============================================================
// Concurrency
// ============================================================
async function runWithConcurrency(items, fn, n) {
  let i = 0, done = 0;
  const results = new Array(items.length);
  const workers = Array.from({ length: n }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch (e) {
        results[idx] = { error: e.message };
      }
      done++;
      if (done % 5 === 0 || done === items.length) {
        process.stdout.write(`\r   Прогрес: ${done} / ${items.length}`);
      }
    }
  });
  await Promise.all(workers);
  return results;
}

// ============================================================
// Генерація SQL
// ============================================================
function generateUpdateSql() {
  const tables = [
    { table: 'product_media', column: 'url' },
    { table: 'landing_courses', column: 'photo_path' },
    { table: 'landing_reviews', column: 'photo_url' },
    { table: 'site_settings', column: 'value' },
  ];
  let sql = `-- АВТО-ЗГЕНЕРОВАНО: ${new Date().toISOString()}\nBEGIN;\n\n`;
  for (const { table, column } of tables) {
    sql += `UPDATE ${table} SET ${column} = REPLACE(${column}, '${supaBase}', '${r2Base}') WHERE ${column} LIKE '${supaBase}%';\n`;
  }
  sql += `UPDATE landing_courses SET page_blocks = REPLACE(page_blocks::text, '${supaBase}', '${r2Base}')::jsonb WHERE page_blocks::text LIKE '%${supaBase}%';\n`;
  sql += `\nSELECT 'product_media' AS tbl, COUNT(*) AS leftovers FROM product_media WHERE url LIKE '${supaBase}%'\n`;
  sql += `UNION ALL SELECT 'landing_courses photo_path', COUNT(*) FROM landing_courses WHERE photo_path LIKE '${supaBase}%'\n`;
  sql += `UNION ALL SELECT 'landing_courses page_blocks', COUNT(*) FROM landing_courses WHERE page_blocks::text LIKE '%${supaBase}%'\n`;
  sql += `UNION ALL SELECT 'landing_reviews', COUNT(*) FROM landing_reviews WHERE photo_url LIKE '${supaBase}%'\n`;
  sql += `UNION ALL SELECT 'site_settings', COUNT(*) FROM site_settings WHERE value LIKE '${supaBase}%';\n\n`;
  sql += `COMMIT;\n`;
  return sql;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('🚀 Hybrid migration: Local → Supabase, Vercel → R2');
  console.log(`   Vercel: ${VERCEL_URL}`);
  console.log(`   Concurrency: ${concurrency}`);
  console.log('');

  console.log('📚 Збір URL з БД...');
  const urls = await collectAllFileUrls();
  console.log(`   Знайдено ${urls.length} файлів`);
  console.log('');

  let uploaded = 0, errors = 0, totalBytes = 0;
  const errList = [];
  const mappings = [];

  await runWithConcurrency(urls, async (url) => {
    try {
      const res = await migrateOne(url);
      if (res.uploaded) { uploaded++; totalBytes += res.size || 0; }
      mappings.push({ oldUrl: url, newUrl: res.newUrl, key: res.key });
      return res;
    } catch (e) {
      errors++;
      errList.push({ url, error: e.message });
      return { error: e.message };
    }
  }, concurrency);

  process.stdout.write('\n\n');
  await fs.writeFile(new URL('./url-mapping.json', import.meta.url), JSON.stringify(mappings, null, 2));
  await fs.writeFile(new URL('./update-urls.sql', import.meta.url), generateUpdateSql());
  if (errList.length) {
    await fs.writeFile(new URL('./errors.json', import.meta.url), JSON.stringify(errList, null, 2));
  }

  console.log('═══════════════════════════════════');
  console.log(`✅ Завантажено: ${uploaded}`);
  console.log(`❌ Помилок: ${errors}`);
  console.log(`📦 Розмір: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`📄 SQL: update-urls.sql`);
  if (errList.length) console.log(`📄 Errors: errors.json`);
  console.log('═══════════════════════════════════');
  console.log('');
  console.log('Далі: Supabase SQL Editor → запустити update-urls.sql');
}

main().catch((e) => {
  console.error('💥 Fatal:', e);
  process.exit(1);
});
