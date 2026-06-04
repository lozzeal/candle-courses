// /api/track - приймає pageview події і пише у БД page_views
// Працює серверно, тому має доступ до x-vercel-ip-country, IP тощо

export const config = { api: { bodyParser: false } };

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function hashIp(ip) {
  // Простий хеш для приватності (не оригінальний IP)
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const ch = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return 'ip_' + Math.abs(hash).toString(36);
}

function parseSource(referrer) {
  if (!referrer) return 'direct';
  try {
    const url = new URL(referrer);
    const host = url.hostname.toLowerCase();
    if (host.includes('google.') || host.includes('bing.') || host.includes('yandex.') || host.includes('duckduckgo.') || host.includes('yahoo.')) return 'search';
    if (host.includes('facebook.') || host.includes('instagram.') || host.includes('twitter.') || host.includes('t.me') || host.includes('telegram.') || host.includes('tiktok.') || host.includes('youtube.') || host.includes('linkedin.')) return 'social';
    if (host.includes('mail.') || host.includes('gmail.')) return 'email';
    return 'other';
  } catch { return 'other'; }
}

function detectDevice(ua) {
  if (!ua) return 'desktop';
  const u = ua.toLowerCase();
  if (/tablet|ipad/.test(u)) return 'tablet';
  if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(u)) return 'mobile';
  return 'desktop';
}

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPA_URL || !SUPA_KEY) return res.status(204).end();

  try {
    const raw = await readBody(req);
    const body = raw ? JSON.parse(raw) : {};

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.headers['x-real-ip'] || 'unknown';
    const country = req.headers['x-vercel-ip-country'] || null;
    const city = req.headers['x-vercel-ip-city'] ? decodeURIComponent(req.headers['x-vercel-ip-city']) : null;
    const ua = req.headers['user-agent'] || null;
    const referrer = body.referrer || null;

    const row = {
      session_id: String(body.session_id || 'unknown').slice(0, 40),
      page_path: String(body.path || '/').slice(0, 200),
      page_title: body.title ? String(body.title).slice(0, 200) : null,
      referrer,
      referrer_source: parseSource(referrer),
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      country,
      city,
      device_type: detectDevice(ua),
      ip_hash: hashIp(ip),
      user_agent: ua
    };

    // Fire-and-forget; не блокуємо відповідь користувачу
    fetch(`${SUPA_URL}/rest/v1/page_views`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPA_KEY,
        Authorization: 'Bearer ' + SUPA_KEY,
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(row)
    }).catch(e => console.warn('track insert:', e.message));

    return res.status(204).end();
  } catch (err) {
    console.warn('track error:', err.message);
    return res.status(204).end();
  }
}
