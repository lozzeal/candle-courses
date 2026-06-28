import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { S3Client } from '@aws-sdk/client-s3';
import https from 'https';
import tls from 'tls';

tls.DEFAULT_MIN_VERSION = 'TLSv1.2';
tls.DEFAULT_MAX_VERSION = 'TLSv1.3';
const httpsAgent = new https.Agent({
  keepAlive: true,
  ciphers: 'DEFAULT@SECLEVEL=0',
  minVersion: 'TLSv1.2',
});

const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false }});
const r2 = new S3Client({ region: 'auto', endpoint: process.env.R2_ENDPOINT, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }});

// Do a supabase call FIRST
const { data, error } = await supa.from('product_media').select('id').limit(1);
console.log('supa OK', data?.length);

function downloadHttps(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { agent: httpsAgent }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).length));
    });
    req.on('error', reject);
  });
}

const url = 'https://jmfudjhembgeaztowcoe.supabase.co/storage/v1/object/public/product-photos/1780397093841-bo4758.jpeg';
try {
  const size = await downloadHttps(url);
  console.log('https OK', size);
} catch (e) {
  console.log('https FAIL', e.message);
}
