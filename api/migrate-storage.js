// ============================================================
// /api/migrate-storage — одноразова міграція файлів з Supabase Storage в R2
// ============================================================
// Запускається пакетами щоб вписатись у Vercel timeout (60 сек на Hobby).
//
// Виклик: GET /api/migrate-storage?token=XXX&offset=0&limit=20
// Повертає: { offset, processed, totalFound, uploaded, skipped, errors, nextOffset }
//
// ENV:
//   R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
//   SUPABASE_URL, SUPABASE_ANON_KEY
//   MIGRATION_TOKEN (одноразовий секрет для авторизації)
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

export const config = { maxDuration: 60 };

const {
  R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL,
  SUPABASE_URL, SUPABASE_ANON_KEY,
  MIGRATION_TOKEN,
} = process.env;

const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const supaBase = `${SUPABASE_URL?.replace(/\/$/, '')}/storage/v1/object/public/`;
const r2Base = `${R2_PUBLIC_URL?.replace(/\/$/, '')}/`;

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function urlToBucketKey(url) {
  const rest = url.slice(supaBase.length);
  const slash = rest.indexOf('/');
  if (slash < 0) return null;
  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1), full: rest };
}
function guessMime(p) {
  const m = { '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime' };
  const ext = p.toLowerCase().match(/\.[^.]+$/)?.[0];
  return m[ext] || 'application/octet-stream';
}

async function collectAllFileUrls() {
  const urls = new Set();

  const { data: media } = await supa.from('product_media').select('url, storage_path, type');
  for (const r of media || []) {
    if (r.url?.startsWith(supaBase)) urls.add(r.url);
    if (r.storage_path && !r.url?.startsWith(supaBase)) {
      const b = r.type === 'video' ? 'product-videos' : 'product-photos';
      urls.add(`${supaBase}${b}/${r.storage_path}`);
    }
  }

  const { data: courses } = await supa.from('landing_courses').select('photo_path, page_blocks');
  for (const r of courses || []) {
    if (r.photo_path?.startsWith(supaBase)) urls.add(r.photo_path);
    if (r.page_blocks) {
      const str = JSON.stringify(r.page_blocks);
      (str.match(new RegExp(escapeRegex(supaBase) + '[^"\\s\\\\]+', 'g')) || []).forEach(u => urls.add(u));
    }
  }

  const { data: reviews } = await supa.from('landing_reviews').select('photo_url');
  for (const r of reviews || []) {
    if (r.photo_url?.startsWith(supaBase)) urls.add(r.photo_url);
  }

  const { data: settings } = await supa.from('site_settings').select('value');
  for (const r of settings || []) {
    if (typeof r.value === 'string' && r.value.startsWith(supaBase)) urls.add(r.value);
  }

  return Array.from(urls).sort();
}

async function existsInR2(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch (e) {
    if (e.$metadata?.httpStatusCode === 404 || e.name === 'NotFound') return false;
    throw e;
  }
}

async function migrateOne(url) {
  const parsed = urlToBucketKey(url);
  if (!parsed) return { error: 'invalid url' };
  const key = parsed.full;

  if (await existsInR2(key)) return { skipped: true, key, newUrl: r2Base + key };

  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const ct = res.headers.get('content-type') || guessMime(parsed.path);
  const buf = Buffer.from(await res.arrayBuffer());

  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key: key, Body: buf, ContentType: ct,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return { uploaded: true, key, newUrl: r2Base + key, size: buf.length };
}

export default async function handler(req, res) {
  const token = (req.query?.token) || (req.headers['x-migration-token']);
  if (!MIGRATION_TOKEN || token !== MIGRATION_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const offset = parseInt(req.query?.offset || '0', 10) || 0;
  const limit = Math.min(parseInt(req.query?.limit || '20', 10) || 20, 30);

  try {
    const allUrls = await collectAllFileUrls();
    const batch = allUrls.slice(offset, offset + limit);

    const results = [];
    for (const url of batch) {
      try {
        const r = await migrateOne(url);
        results.push({ url, ...r });
      } catch (e) {
        results.push({ url, error: e.message });
      }
    }

    const uploaded = results.filter(r => r.uploaded).length;
    const skipped = results.filter(r => r.skipped).length;
    const errors = results.filter(r => r.error).length;

    return res.status(200).json({
      offset,
      limit,
      processed: batch.length,
      totalFound: allUrls.length,
      uploaded,
      skipped,
      errors,
      nextOffset: offset + batch.length < allUrls.length ? offset + batch.length : null,
      results,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
}
