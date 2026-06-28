// ============================================================
// Plan G: Migration via wrangler CLI (native Cloudflare API)
// ============================================================
// 1. Завантажує файли з Supabase Storage у локальну temp папку
// 2. Завантажує кожен на R2 через wrangler (native CF API, без TLS issues)
// 3. Прибирає temp папку
//
// Передумови:
//   npm install -g wrangler
//   wrangler login   ← відкриє браузер, треба авторизуватись у CF
//
// Запуск:
//   node migrate-via-wrangler.js
// ============================================================

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import os from 'os';

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL,
  CONCURRENCY = '3',
} = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
  console.error('❌ Не задано env vars: SUPABASE_URL, SUPABASE_ANON_KEY, R2_BUCKET, R2_PUBLIC_URL');
  process.exit(1);
}

const supaBase = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/`;
const r2Base = `${R2_PUBLIC_URL.replace(/\/$/, '')}/`;
const concurrency = Math.max(1, parseInt(CONCURRENCY, 10) || 3);

const tempDir = path.join(os.tmpdir(), 'r2-migration-' + Date.now());
await fs.mkdir(tempDir, { recursive: true });

// ============================================================
// REST API helper
// ============================================================
async function pgSelect(table, query = '*') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
  });
  if (!res.ok) throw new Error(`PG ${table}: ${res.status}`);
  return res.json();
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function urlToBucketKey(url) {
  const rest = url.slice(supaBase.length);
  const slash = rest.indexOf('/');
  if (slash < 0) return null;
  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1), full: rest };
}

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
// Wrangler invoker
// ============================================================
function runWrangler(args) {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'wrangler.cmd' : 'wrangler';
    const p = spawn(cmd, args, { shell: isWin });
    let stdout = '', stderr = '';
    p.stdout.on('data', (d) => stdout += d.toString());
    p.stderr.on('data', (d) => stderr += d.toString());
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`wrangler exit ${code}: ${stderr || stdout}`));
    });
  });
}

// ============================================================
// Migrate one file
// ============================================================
async function migrateOne(url) {
  const parsed = urlToBucketKey(url);
  if (!parsed) return { error: 'invalid url' };
  const key = parsed.full; // bucket/path

  // Download from Supabase to temp
  const dlRes = await fetch(url);
  if (!dlRes.ok) throw new Error(`download ${dlRes.status}`);
  const buf = Buffer.from(await dlRes.arrayBuffer());

  // Save to temp file
  const safeKey = key.replace(/[\/\\]/g, '_');
  const tempPath = path.join(tempDir, safeKey);
  await fs.writeFile(tempPath, buf);

  // Upload via wrangler
  try {
    await runWrangler([
      'r2', 'object', 'put',
      `${R2_BUCKET}/${key}`,
      '--file', tempPath,
      '--remote',
      '--content-type', dlRes.headers.get('content-type') || 'application/octet-stream',
    ]);
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }

  return { uploaded: true, key, newUrl: r2Base + key, size: buf.length };
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
      process.stdout.write(`\r   Прогрес: ${done} / ${items.length}`);
    }
  });
  await Promise.all(workers);
  return results;
}

// ============================================================
// SQL generators
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
  sql += `UPDATE landing_courses SET page_blocks = REPLACE(page_blocks::text, '${supaBase}', '${r2Base}')::jsonb WHERE page_blocks::text LIKE '%${supaBase}%';\n\n`;
  sql += `SELECT 'product_media' AS tbl, COUNT(*) AS leftovers FROM product_media WHERE url LIKE '${supaBase}%'\n`;
  sql += `UNION ALL SELECT 'landing_courses photo_path', COUNT(*) FROM landing_courses WHERE photo_path LIKE '${supaBase}%'\n`;
  sql += `UNION ALL SELECT 'landing_courses page_blocks', COUNT(*) FROM landing_courses WHERE page_blocks::text LIKE '%${supaBase}%'\n`;
  sql += `UNION ALL SELECT 'landing_reviews', COUNT(*) FROM landing_reviews WHERE photo_url LIKE '${supaBase}%'\n`;
  sql += `UNION ALL SELECT 'site_settings', COUNT(*) FROM site_settings WHERE value LIKE '${supaBase}%';\n\nCOMMIT;\n`;
  return sql;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('🚀 Migration via wrangler CLI (native Cloudflare API)');
  console.log(`   R2 bucket: ${R2_BUCKET}`);
  console.log(`   Temp dir: ${tempDir}`);
  console.log(`   Concurrency: ${concurrency}`);
  console.log('');

  // Перевірка що wrangler авторизований
  try {
    const { stdout } = await runWrangler(['whoami']);
    console.log('🔑 wrangler:', stdout.split('\n').find(l => l.includes('@')) || 'OK');
  } catch (e) {
    console.error('❌ wrangler не авторизований. Запусти: wrangler login');
    console.error('   Помилка:', e.message);
    process.exit(1);
  }
  console.log('');

  console.log('📚 Збір URL з БД...');
  const urls = await collectAllFileUrls();
  console.log(`   Знайдено ${urls.length} файлів\n`);

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
  await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

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
  fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  process.exit(1);
});
