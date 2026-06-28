// ============================================================
// Migrate-files: Supabase Storage → Cloudflare R2
// ============================================================
// Що робить:
//   1. Читає всі URL файлів з БД (product_media, landing_courses,
//      landing_reviews, site_settings) — використовує лише anon key
//   2. Кожен файл скачує через публічний URL і завантажує у R2
//   3. Складає мапінг старого URL → нового R2 URL у url-mapping.json
//   4. Генерує update-urls.sql для оновлення усіх URL у БД
//
// Запуск: node migrate-files.js
// ============================================================

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import tls from 'tls';

// Fix Node v24 SSL handshake failure with Supabase Storage CDN.
// Cloudflare-fronted Storage CDN refuses Node's default TLS config (alert 40).
// Lowering security level lets the handshake complete.
tls.DEFAULT_MIN_VERSION = 'TLSv1.2';
tls.DEFAULT_MAX_VERSION = 'TLSv1.3';
const httpsAgent = new https.Agent({
  keepAlive: true,
  ciphers: 'DEFAULT@SECLEVEL=0',
  minVersion: 'TLSv1.2',
});

const {
  R2_ENDPOINT,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  CONCURRENCY = '4',
} = process.env;

// ----- Валідація env -----
const required = { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL, SUPABASE_URL, SUPABASE_ANON_KEY };
const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error('❌ Не задано env vars:', missing.join(', '));
  console.error('   Створіть .env (див. .env.example)');
  process.exit(1);
}

const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  requestHandler: new NodeHttpHandler({ httpsAgent }),
});

const concurrency = Math.max(1, parseInt(CONCURRENCY, 10) || 4);
const supaBase = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/`;
const r2Base = `${R2_PUBLIC_URL.replace(/\/$/, '')}/`;

// ============================================================
// Збір усіх URL з БД
// ============================================================
async function collectAllFileUrls() {
  const urls = new Set();

  // 1) product_media (url + storage_path)
  const { data: media, error: e1 } = await supa
    .from('product_media')
    .select('id, url, storage_path, type');
  if (e1) throw new Error('product_media: ' + e1.message);
  for (const row of media || []) {
    if (row.url && row.url.startsWith(supaBase)) urls.add(row.url);
    // Деякі рядки можуть мати лише storage_path
    if (row.storage_path && !row.url?.startsWith(supaBase)) {
      const bucket = row.type === 'video' ? 'product-videos' : 'product-photos';
      urls.add(`${supaBase}${bucket}/${row.storage_path}`);
    }
  }

  // 2) landing_courses.photo_path
  const { data: courses, error: e2 } = await supa
    .from('landing_courses')
    .select('id, photo_path');
  if (e2) throw new Error('landing_courses: ' + e2.message);
  for (const row of courses || []) {
    if (row.photo_path && row.photo_path.startsWith(supaBase)) urls.add(row.photo_path);
  }

  // 3) landing_reviews.photo_url
  const { data: reviews, error: e3 } = await supa
    .from('landing_reviews')
    .select('id, photo_url');
  if (e3) throw new Error('landing_reviews: ' + e3.message);
  for (const row of reviews || []) {
    if (row.photo_url && row.photo_url.startsWith(supaBase)) urls.add(row.photo_url);
  }

  // 4) site_settings (логотипи, банери)
  const { data: settings, error: e4 } = await supa
    .from('site_settings')
    .select('key, value');
  if (e4) throw new Error('site_settings: ' + e4.message);
  for (const row of settings || []) {
    if (row.value && typeof row.value === 'string' && row.value.startsWith(supaBase)) urls.add(row.value);
  }

  // 5) landing_courses.page_blocks (JSONB може містити URL на фото/відео всередині блоків)
  const { data: pages, error: e5 } = await supa
    .from('landing_courses')
    .select('id, page_blocks');
  if (e5) throw new Error('landing_courses.page_blocks: ' + e5.message);
  for (const row of pages || []) {
    if (!row.page_blocks) continue;
    const str = JSON.stringify(row.page_blocks);
    const matches = str.match(new RegExp(escapeRegex(supaBase) + '[^"\\s\\\\]+', 'g')) || [];
    matches.forEach((m) => urls.add(m));
  }

  return Array.from(urls);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function urlToBucketKey(url) {
  // supaBase = https://xxx.supabase.co/storage/v1/object/public/
  // url       = supaBase + bucket + '/' + path
  const rest = url.slice(supaBase.length);
  const slash = rest.indexOf('/');
  if (slash < 0) return null;
  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1), full: rest };
}

// ============================================================
// Перевірка чи файл вже в R2 (idempotent)
// ============================================================
async function existsInR2(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch (e) {
    if (e.$metadata?.httpStatusCode === 404 || e.name === 'NotFound') return false;
    throw e;
  }
}

// ============================================================
// Завантажити з публічного Supabase URL → upload в R2
// ============================================================
function downloadHttps(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { agent: httpsAgent }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      const contentType = res.headers['content-type'] || '';
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ buf: Buffer.concat(chunks), contentType }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy(new Error('timeout'));
    });
  });
}

async function migrateOne(url) {
  const parsed = urlToBucketKey(url);
  if (!parsed) return { error: 'invalid url: ' + url };
  const key = parsed.full; // 'bucket/path' — використовуємо як ключ у R2

  let phase = 'head';
  try {
    if (await existsInR2(key)) {
      return { skipped: true, key };
    }
    phase = 'download';
    const { buf, contentType: ct } = await downloadHttps(url);
    const contentType = ct || guessMime(parsed.path);
    phase = 'upload';
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET, Key: key, Body: buf, ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    return { skipped: false, key, size: buf.length, contentType };
  } catch (e) {
    throw new Error(`[${phase}] ${e.message}`);
  }
}

async function migrateOneOriginal(url) {
  const parsed = urlToBucketKey(url);
  if (!parsed) return { error: 'invalid url: ' + url };
  const key = parsed.full;

  if (await existsInR2(key)) {
    return { skipped: true, key };
  }

  const { buf, contentType: ct } = await downloadHttps(url);
  const contentType = ct || guessMime(parsed.path);

  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buf,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return { skipped: false, key, size: buf.length, contentType };
}

function guessMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  };
  return map[ext] || 'application/octet-stream';
}

// ============================================================
// Concurrency wrapper
// ============================================================
async function runWithConcurrency(items, fn, n) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: n }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch (e) {
        results[idx] = { error: e.message };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

// ============================================================
// Генерація SQL для оновлення URL у БД
// ============================================================
function generateUpdateSql() {
  const tables = [
    { table: 'product_media',     column: 'url' },
    { table: 'landing_courses',   column: 'photo_path' },
    { table: 'landing_reviews',   column: 'photo_url' },
    { table: 'site_settings',     column: 'value' },
  ];

  let sql = `-- ============================================================
-- АВТО-ЗГЕНЕРОВАНО: ${new Date().toISOString()}
-- Оновлення URL з Supabase Storage на Cloudflare R2
-- ============================================================
-- Перед запуском зробити бекап:
-- Supabase Dashboard → Database → Backups → Download
-- ============================================================

BEGIN;

`;

  for (const { table, column } of tables) {
    sql += `-- ${table}.${column}\n`;
    sql += `UPDATE ${table}\n`;
    sql += `   SET ${column} = REPLACE(${column}, '${supaBase}', '${r2Base}')\n`;
    sql += ` WHERE ${column} LIKE '${supaBase}%';\n\n`;
  }

  // page_blocks JSONB
  sql += `-- landing_courses.page_blocks (JSONB)\n`;
  sql += `UPDATE landing_courses\n`;
  sql += `   SET page_blocks = REPLACE(page_blocks::text, '${supaBase}', '${r2Base}')::jsonb\n`;
  sql += ` WHERE page_blocks::text LIKE '%${supaBase}%';\n\n`;

  sql += `-- Перевірка leftovers\n`;
  sql += `SELECT 'product_media' AS tbl, COUNT(*) AS leftovers FROM product_media WHERE url LIKE '${supaBase}%'\n`;
  sql += `UNION ALL SELECT 'landing_courses photo_path', COUNT(*) FROM landing_courses WHERE photo_path LIKE '${supaBase}%'\n`;
  sql += `UNION ALL SELECT 'landing_courses page_blocks', COUNT(*) FROM landing_courses WHERE page_blocks::text LIKE '%${supaBase}%'\n`;
  sql += `UNION ALL SELECT 'landing_reviews', COUNT(*) FROM landing_reviews WHERE photo_url LIKE '${supaBase}%'\n`;
  sql += `UNION ALL SELECT 'site_settings', COUNT(*) FROM site_settings WHERE value LIKE '${supaBase}%';\n\n`;

  sql += `-- Якщо leftovers = 0 у всіх рядках — COMMIT.\n`;
  sql += `-- Якщо ні — ROLLBACK і подивитись де ще зберігаються URL.\n`;
  sql += `COMMIT;\n`;

  return sql;
}

function generateRollbackSql() {
  const tables = [
    { table: 'product_media',     column: 'url' },
    { table: 'landing_courses',   column: 'photo_path' },
    { table: 'landing_reviews',   column: 'photo_url' },
    { table: 'site_settings',     column: 'value' },
  ];
  let sql = `-- ROLLBACK: повертає URL з R2 назад на Supabase\nBEGIN;\n\n`;
  for (const { table, column } of tables) {
    sql += `UPDATE ${table} SET ${column} = REPLACE(${column}, '${r2Base}', '${supaBase}') WHERE ${column} LIKE '${r2Base}%';\n`;
  }
  sql += `UPDATE landing_courses SET page_blocks = REPLACE(page_blocks::text, '${r2Base}', '${supaBase}')::jsonb WHERE page_blocks::text LIKE '%${r2Base}%';\n`;
  sql += `\nCOMMIT;\n`;
  return sql;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('🚀 Старт міграції Supabase Storage → Cloudflare R2');
  console.log(`   R2 bucket: ${R2_BUCKET}`);
  console.log(`   Concurrency: ${concurrency}`);
  console.log('');

  console.log('📚 Збір URL файлів з БД...');
  let urls;
  try {
    urls = await collectAllFileUrls();
  } catch (e) {
    console.error('❌ Не вдалося прочитати БД:', e.message);
    process.exit(1);
  }
  console.log(`   Знайдено ${urls.length} унікальних файлів`);
  console.log('');

  if (!urls.length) {
    console.log('⚠️  Немає файлів для перенесення.');
    return;
  }

  let totalUploaded = 0;
  let totalSkipped = 0;
  let totalBytes = 0;
  const errors = [];
  const mappings = [];

  let done = 0;
  await runWithConcurrency(urls, async (url) => {
    try {
      const res = await migrateOne(url);
      done++;
      if (done % 10 === 0 || done === urls.length) {
        process.stdout.write(`\r   Прогрес: ${done} / ${urls.length}`);
      }
      if (res.skipped) totalSkipped++;
      else { totalUploaded++; totalBytes += res.size || 0; }
      mappings.push({ oldUrl: url, newUrl: r2Base + res.key, key: res.key });
      return res;
    } catch (e) {
      errors.push({ url, error: e.message });
      done++;
      return { error: e.message };
    }
  }, concurrency);
  process.stdout.write('\n');

  // ----- Зберігаємо результат -----
  await fs.writeFile(
    new URL('./url-mapping.json', import.meta.url),
    JSON.stringify(mappings, null, 2),
    'utf8'
  );
  await fs.writeFile(
    new URL('./update-urls.sql', import.meta.url),
    generateUpdateSql(),
    'utf8'
  );
  await fs.writeFile(
    new URL('./rollback-urls.sql', import.meta.url),
    generateRollbackSql(),
    'utf8'
  );
  if (errors.length) {
    await fs.writeFile(
      new URL('./errors.json', import.meta.url),
      JSON.stringify(errors, null, 2),
      'utf8'
    );
  }

  // ----- Підсумок -----
  console.log('');
  console.log('═══════════════════════════════════');
  console.log(`✅ Завантажено в R2: ${totalUploaded}`);
  console.log(`⏭️  Пропущено (вже були): ${totalSkipped}`);
  console.log(`📦 Розмір даних: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`❌ Помилок: ${errors.length}`);
  console.log(`📄 URL-мапінг: url-mapping.json (${mappings.length} записів)`);
  console.log(`📄 SQL для БД: update-urls.sql`);
  if (errors.length) console.log(`📄 Помилки: errors.json`);
  console.log('═══════════════════════════════════');
  console.log('');
  console.log('Наступний крок:');
  console.log('  1. Supabase Dashboard → Database → Backups → Download backup');
  console.log('  2. Supabase Dashboard → SQL Editor → запустити update-urls.sql');
  console.log('  3. Перевірити сайт — фото мають вантажитись з R2');
  console.log('  4. node verify.js — перевірка доступності');
}

main().catch((e) => {
  console.error('💥 Fatal:', e);
  process.exit(1);
});
