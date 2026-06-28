// ============================================================
// /api/migrate-storage — одноразова міграція Supabase Storage → R2
// ============================================================
// Виклик: GET /api/migrate-storage?token=XXX&offset=0&limit=20
// ============================================================

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Agent, fetch as undiciFetch } from 'undici';

export const config = { maxDuration: 60 };

// Кастомний TLS-агент щоб обійти Cloudflare/Supabase bot detection
const tlsAgent = new Agent({
  connect: {
    rejectUnauthorized: true,
    ALPNProtocols: ['http/1.1'],
    ciphers: 'TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_256_GCM_SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305',
  },
});

const {
  R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL,
  SUPABASE_URL, SUPABASE_SERVICE_KEY,
  MIGRATION_TOKEN,
} = process.env;

const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const supaBase = `${(SUPABASE_URL || '').replace(/\/$/, '')}/storage/v1/object/public/`;
const r2Base = `${(R2_PUBLIC_URL || '').replace(/\/$/, '')}/`;

// ----- PostgREST через raw fetch (без supabase-js, бо v2.45 потребує WebSocket) -----
async function pgSelect(table, query = '*') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: 'Bearer ' + SUPABASE_SERVICE_KEY,
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
  const ext = p.toLowerCase().match(/\.[^.]+$/)?.[0];
  return m[ext] || 'application/octet-stream';
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

  // undici fetch з кастомним TLS-агентом — обходить Cloudflare bot detection
  const authUrl = `${SUPABASE_URL}/storage/v1/object/${parsed.bucket}/${parsed.path}`;
  const res = await undiciFetch(authUrl, {
    dispatcher: tlsAgent,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
      'apikey': SUPABASE_SERVICE_KEY,
      'Accept': '*/*',
      'Accept-Encoding': 'identity',
    },
  });
  if (!res.ok) throw new Error(`fetch ${res.status}: ${authUrl}`);
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
