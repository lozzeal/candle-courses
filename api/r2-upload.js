// ============================================================
// /api/r2-upload — приймає файл і завантажує в Cloudflare R2
// ============================================================
// Виклик з адмінки:
//   POST /api/r2-upload
//   Body: multipart/form-data { file, bucket, path }
//   або:  { contentType, base64, bucket, path }
//
// Повертає: { url, key }
//
// ENV (Vercel):
//   R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//   R2_BUCKET, R2_PUBLIC_URL, ADMIN_UPLOAD_TOKEN
//
// Захист: заголовок x-admin-token має співпадати з ADMIN_UPLOAD_TOKEN.
// Адмінка отримує цей токен після логіну (зберігається в site_settings).
// ============================================================

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const {
  R2_ENDPOINT,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL,
  ADMIN_UPLOAD_TOKEN,
} = process.env;

const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

export const config = {
  api: {
    bodyParser: { sizeLimit: '50mb' }, // відео можуть бути великі
  },
};

const ALLOWED_BUCKETS = new Set(['product-photos', 'product-videos']);

function sanitizePath(p) {
  if (!p || typeof p !== 'string') return null;
  // Заборонити .. та абсолютні шляхи
  if (p.includes('..') || p.startsWith('/')) return null;
  // Тільки латиниця, цифри, /, -, _, .
  if (!/^[a-zA-Z0-9._/\-]+$/.test(p)) return null;
  return p;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ----- Auth -----
  const token = req.headers['x-admin-token'];
  if (!ADMIN_UPLOAD_TOKEN || token !== ADMIN_UPLOAD_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { bucket, path: filePath, contentType, base64 } = req.body || {};

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket' });
    }
    const safePath = sanitizePath(filePath);
    if (!safePath) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    if (!base64 || !contentType) {
      return res.status(400).json({ error: 'Missing file' });
    }

    const buf = Buffer.from(base64, 'base64');
    if (buf.length > 50 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large (max 50MB)' });
    }

    const key = `${bucket}/${safePath}`;

    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buf,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    const url = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
    return res.status(200).json({ url, key });
  } catch (err) {
    console.error('[r2-upload] error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
}
