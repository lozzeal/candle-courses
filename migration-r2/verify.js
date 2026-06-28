// ============================================================
// Verify: перевірка доступності файлів через публічний R2 URL
// ============================================================
// Робить HEAD-запити на кожен новий URL з url-mapping.json
// і повідомляє про недоступні / зі статусом != 200.
//
// Запуск: node verify.js
// ============================================================

import 'dotenv/config';
import fs from 'fs/promises';

const CONCURRENCY = parseInt(process.env.CONCURRENCY, 10) || 8;

async function main() {
  const raw = await fs.readFile(new URL('./url-mapping.json', import.meta.url), 'utf8');
  const mapping = JSON.parse(raw);
  if (!mapping.length) {
    console.log('⚠️  url-mapping.json порожній. Спочатку запустіть migrate-files.js');
    return;
  }

  console.log(`🔍 Перевірка ${mapping.length} файлів у R2…`);
  let ok = 0, fail = 0;
  const failures = [];

  await runWithConcurrency(mapping, async ({ newUrl, oldUrl, bucket, path }) => {
    try {
      const res = await fetch(newUrl, { method: 'HEAD' });
      if (res.ok) ok++;
      else {
        fail++;
        failures.push({ newUrl, status: res.status, bucket, path });
      }
    } catch (e) {
      fail++;
      failures.push({ newUrl, error: e.message, bucket, path });
    }
    if ((ok + fail) % 50 === 0) {
      process.stdout.write(`\r   ${ok + fail} / ${mapping.length} (✅ ${ok}  ❌ ${fail})`);
    }
  }, CONCURRENCY);
  process.stdout.write('\n');

  console.log('');
  console.log('═══════════════════════════════════');
  console.log(`✅ Доступні: ${ok}`);
  console.log(`❌ Недоступні: ${fail}`);
  console.log('═══════════════════════════════════');

  if (failures.length) {
    await fs.writeFile(
      new URL('./verify-failures.json', import.meta.url),
      JSON.stringify(failures, null, 2),
      'utf8'
    );
    console.log('📄 Деталі помилок: verify-failures.json');
    console.log('');
    console.log('Можливі причини:');
    console.log('  • Bucket public access вимкнено (увімкнути R2.dev subdomain)');
    console.log('  • Файл не догрузився — запустити migrate-files.js повторно (idempotent)');
    console.log('  • Невірний R2_PUBLIC_URL в .env');
  } else {
    console.log('🎉 Усі файли доступні. Можна запускати update-urls.sql у Supabase.');
  }
}

async function runWithConcurrency(items, fn, n) {
  let i = 0;
  const workers = Array.from({ length: n }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}

main().catch((e) => {
  console.error('💥 Fatal:', e);
  process.exit(1);
});
