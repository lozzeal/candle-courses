// ============================================================
// Convert .mov files on R2 to .mp4 + update DB URLs
// ============================================================
// 1. Знаходить усі .mov файли (з url-mapping.json)
// 2. Скачує кожен з R2
// 3. Конвертує через FFmpeg → .mp4 (h.264, AAC, 720p max)
// 4. Завантажує .mp4 у R2 через wrangler
// 5. Генерує SQL для оновлення URL у БД (.mov → .mp4)
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
} = process.env;

const r2Base = `${R2_PUBLIC_URL.replace(/\/$/, '')}/`;
const tempDir = path.join(os.tmpdir(), 'mov-convert-' + Date.now());
await fs.mkdir(tempDir, { recursive: true });

// ============================================================
// Збираємо .mov файли через REST + page_blocks JSONB
// ============================================================
async function pgSelect(table, query = '*') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
  });
  if (!res.ok) throw new Error(`PG ${table}: ${res.status}`);
  return res.json();
}

async function collectMovFiles() {
  const movs = new Set();

  const media = await pgSelect('product_media', 'url,storage_path,type');
  for (const r of media) {
    if (r.url?.toLowerCase().endsWith('.mov') && r.url.startsWith(r2Base)) movs.add(r.url);
  }

  const courses = await pgSelect('landing_courses', 'photo_path,page_blocks');
  for (const r of courses) {
    if (r.photo_path?.toLowerCase().endsWith('.mov') && r.photo_path.startsWith(r2Base)) movs.add(r.photo_path);
    if (r.page_blocks) {
      const str = JSON.stringify(r.page_blocks);
      const matches = str.match(/https:\/\/pub-[a-z0-9]+\.r2\.dev\/[^"\s\\]+\.mov/gi) || [];
      matches.forEach((u) => movs.add(u));
    }
  }

  return Array.from(movs).sort();
}

// ============================================================
// Run command (FFmpeg or wrangler)
// ============================================================
function run(cmd, args) {
  return new Promise((resolve, reject) => {
    // shell:true дозволяє Windows резолвити .exe/.cmd через PATH автоматично
    const p = spawn(cmd, args, { shell: true });
    let stdout = '', stderr = '';
    p.stdout.on('data', (d) => stdout += d.toString());
    p.stderr.on('data', (d) => stderr += d.toString());
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exit ${code}: ${stderr || stdout}`));
    });
  });
}

// ============================================================
// Process one .mov file
// ============================================================
async function convertOne(movUrl) {
  // URL виду: https://pub-XXX.r2.dev/product-videos/abc.mov
  // R2 повний key: "product-videos/abc.mov" (під bucket = R2_BUCKET)
  const fullKey = movUrl.slice(r2Base.length); // 'product-videos/abc.mov'
  const movKey = fullKey;
  const mp4Key = movKey.replace(/\.mov$/i, '.mp4');
  const mp4Url = r2Base + mp4Key;

  const movPath = path.join(tempDir, path.basename(movKey));
  const mp4Path = movPath.replace(/\.mov$/i, '.mp4');

  // 1. Завантажити .mov з R2
  const dlRes = await fetch(movUrl);
  if (!dlRes.ok) throw new Error(`download ${dlRes.status}`);
  await fs.writeFile(movPath, Buffer.from(await dlRes.arrayBuffer()));

  // 2. Конвертувати через FFmpeg
  //    h.264, AAC, max 720p вертикалі, web-optimized (moov atom на початку)
  await run('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-i', movPath,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
    '-vf', "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'",
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    '-pix_fmt', 'yuv420p',
    mp4Path,
  ]);

  // 3. Завантажити .mp4 на R2 (bucket = R2_BUCKET з .env, key = product-videos/...)
  await run('wrangler', [
    'r2', 'object', 'put',
    `${R2_BUCKET}/${mp4Key}`,
    '--file', mp4Path,
    '--remote',
    '--content-type', 'video/mp4',
  ]);

  // Прибрати temp
  await fs.unlink(movPath).catch(() => {});
  const stat = await fs.stat(mp4Path);
  await fs.unlink(mp4Path).catch(() => {});

  return { movUrl, mp4Url, sizeMp4: stat.size };
}

// ============================================================
// SQL generator: .mov → .mp4 URL replacements
// ============================================================
function generateUpdateSql(mappings) {
  let sql = `-- Конвертація .mov → .mp4 URL у БД\n-- ЗГЕНЕРОВАНО: ${new Date().toISOString()}\nBEGIN;\n\n`;
  for (const { movUrl, mp4Url } of mappings) {
    sql += `-- ${path.basename(movUrl)}\n`;
    sql += `UPDATE product_media SET url = '${mp4Url}' WHERE url = '${movUrl}';\n`;
    sql += `UPDATE landing_courses SET photo_path = '${mp4Url}' WHERE photo_path = '${movUrl}';\n`;
    sql += `UPDATE landing_reviews SET photo_url = '${mp4Url}' WHERE photo_url = '${movUrl}';\n`;
    sql += `UPDATE landing_courses SET page_blocks = REPLACE(page_blocks::text, '${movUrl}', '${mp4Url}')::jsonb WHERE page_blocks::text LIKE '%${movUrl}%';\n\n`;
  }
  sql += `\nCOMMIT;\n`;
  return sql;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('🎬 Convert .mov → .mp4 on R2');
  console.log(`   Temp dir: ${tempDir}\n`);

  // Перевірка ffmpeg
  try {
    const { stdout } = await run('ffmpeg', ['-version']);
    console.log('🔧 FFmpeg:', stdout.split('\n')[0]);
  } catch (e) {
    console.error('❌ FFmpeg не знайдено. Перезапусти PowerShell.');
    console.error('   Помилка:', e.message);
    process.exit(1);
  }
  console.log('');

  console.log('📚 Шукаю .mov файли...');
  const movs = await collectMovFiles();
  console.log(`   Знайдено ${movs.length} .mov файлів\n`);

  if (!movs.length) {
    console.log('Нічого конвертувати.');
    return;
  }

  const mappings = [];
  const errors = [];

  for (let i = 0; i < movs.length; i++) {
    const url = movs[i];
    const name = path.basename(url);
    process.stdout.write(`[${i + 1}/${movs.length}] ${name} ... `);
    try {
      const res = await convertOne(url);
      mappings.push(res);
      console.log(`✓ ${(res.sizeMp4 / 1024 / 1024).toFixed(1)} MB`);
    } catch (e) {
      errors.push({ url, error: e.message });
      console.log(`✗ ${e.message.slice(0, 80)}`);
    }
  }

  await fs.writeFile(
    new URL('./mov-to-mp4-sql.sql', import.meta.url),
    generateUpdateSql(mappings),
  );
  if (errors.length) {
    await fs.writeFile(
      new URL('./convert-errors.json', import.meta.url),
      JSON.stringify(errors, null, 2),
    );
  }
  await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

  console.log('');
  console.log('═══════════════════════════════════');
  console.log(`✅ Конвертовано: ${mappings.length}`);
  console.log(`❌ Помилок: ${errors.length}`);
  console.log(`📄 SQL: mov-to-mp4-sql.sql`);
  console.log('═══════════════════════════════════');
  console.log('');
  console.log('Далі: Supabase SQL Editor → запустити mov-to-mp4-sql.sql');
}

main().catch((e) => {
  console.error('💥 Fatal:', e);
  fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  process.exit(1);
});
