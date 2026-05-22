// Vercel serverless function — приймає форму, шле у Telegram, опційно редиректить
// Env vars: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

// Вимикаємо автопарсинг — самі читаємо у UTF-8
export const config = {
  api: { bodyParser: false }
};

// ====================== ЗАХИСТ ======================

// 1. Дозволені домени (Origin/Referer)
function isAllowedOrigin(originOrReferer) {
  if (!originOrReferer) return false;
  try {
    const url = new URL(originOrReferer);
    const host = url.hostname.toLowerCase();
    if (host === '100candle.shop' || host === 'www.100candle.shop') return true;
    if (host.endsWith('.vercel.app') && host.includes('candle-courses')) return true;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    return false;
  } catch {
    return false;
  }
}

// 2. Rate limit — в памʼяті (скидається при cold start, це ок)
const RL_MAX = 5;            // макс запитів
const RL_WINDOW = 60 * 1000; // у вікні 1 хвилина
const rlMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const arr = (rlMap.get(ip) || []).filter(t => now - t < RL_WINDOW);
  if (arr.length >= RL_MAX) return false;
  arr.push(now);
  rlMap.set(ip, arr);
  // Очищення мапи від старих IP
  if (rlMap.size > 1000) {
    for (const [k, v] of rlMap) {
      const fresh = v.filter(t => now - t < RL_WINDOW);
      if (fresh.length === 0) rlMap.delete(k);
      else rlMap.set(k, fresh);
    }
  }
  return true;
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

// ====================== ПАРСИНГ ======================

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function parseBody(rawBody, contentType = '') {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('application/json')) {
    try { return JSON.parse(rawBody); } catch { return {}; }
  }
  if (ct.includes('application/x-www-form-urlencoded') || rawBody.includes('=')) {
    const params = new URLSearchParams(rawBody);
    const obj = {};
    for (const [k, v] of params) obj[k] = v;
    return obj;
  }
  return {};
}

// ====================== HANDLER ======================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  // 🛡️ ШАР 1: перевірка домену
  const origin = req.headers.origin || req.headers.referer || '';
  if (!isAllowedOrigin(origin)) {
    return res.status(403).send('Forbidden');
  }

  // 🛡️ ШАР 2: rate-limit
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).send('Too many requests. Try again in a minute.');
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(500).send('Bot is not configured');
  }

  let body = {};
  try {
    const rawBody = await readRawBody(req);
    body = parseBody(rawBody, req.headers['content-type']);
  } catch (err) {
    return res.status(400).send('Bad request: cannot read body');
  }

  // 🛡️ ШАР 3: honeypot — якщо поле _honey заповнене, це бот
  if (body._honey && String(body._honey).trim() !== '') {
    // Тихо вдаємо успіх, не повідомляючи Telegram
    return res.status(200).send('OK');
  }

  // 🛡️ ШАР 4: мінімум 1 заповнене поле користувача (інакше пуста заявка)
  const reservedKeys = new Set(['_subject', '_next', '_captcha', '_template', '_honey', '_return_url']);
  const userFields = Object.entries(body).filter(([k, v]) =>
    !reservedKeys.has(k) && String(v || '').trim() !== ''
  );
  if (userFields.length === 0) {
    return res.status(400).send('Bad request: empty form');
  }

  // ====================== ФОРМУВАННЯ ПОВІДОМЛЕННЯ ======================

  const subject = (body._subject || 'Нова заявка з сайту').toString();
  const next = body._next ? body._next.toString() : null;
  const returnUrl = (body._return_url || '/').toString();
  let returnLabel = '← Повернутись на сайт';
  if (returnUrl.includes('shop')) returnLabel = '← Повернутись до магазину';
  else if (returnUrl.includes('product')) returnLabel = '← Повернутись до товару';

  let icon = '🆕';
  const subjLower = subject.toLowerCase();
  if (subjLower.includes('курс') || subjLower.includes('мінікурс')) icon = '📚';
  else if (subjLower.includes('замовлення')) icon = '🛍️';
  else if (subjLower.includes('питання')) icon = '❓';
  else if (subjLower.includes('доступ')) icon = '🔑';

  const lines = [`${icon} ${subject}`, '━━━━━━━━━━━━━━━━'];
  const fieldEmoji = {
    'Курс': '🎯', 'Товар': '🎁',
    'Імʼя': '👤', "Ім'я": '👤',
    'Телефон': '📞', 'Контакт': '📞',
    'Email': '✉️',
    'Адреса': '📍', 'Місто': '🏙️',
    'Побажання': '💬', 'Запитання': '💬',
    'Джерело': '🌐',
  };

  for (const [key, value] of userFields) {
    const em = fieldEmoji[key] || '•';
    lines.push(`${em} ${key}: ${String(value).trim()}`);
  }

  lines.push('━━━━━━━━━━━━━━━━');
  const kyivTime = new Date().toLocaleString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  lines.push(`⏰ ${kyivTime} (Київ)`);

  const message = lines.join('\n');

  // ====================== TELEGRAM ======================

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        disable_web_page_preview: true
      })
    });
    const tgData = await tgRes.json();
    if (!tgData.ok) {
      console.error('Telegram API error:', tgData);
      return res.status(500).send('Failed to send Telegram message');
    }
  } catch (err) {
    console.error('Telegram fetch error:', err);
    return res.status(500).send('Network error');
  }

  // ====================== ВІДПОВІДЬ ======================

  if (next) {
    return res.redirect(302, next);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Дякуємо! — Крафт-свічки</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,sans-serif;background:#fbf7f4;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;color:#262626}
.box{background:#fff;padding:56px 36px 44px;border-radius:24px;max-width:480px;width:100%;text-align:center;box-shadow:0 14px 40px rgba(0,0,0,0.08);border:1px solid rgba(38,38,38,0.05)}
.icon{width:72px;height:72px;border-radius:50%;background:linear-gradient(180deg,#49C318,#38A30D);display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;box-shadow:0 10px 24px rgba(56,163,13,0.35)}
.icon svg{width:36px;height:36px;color:#fff}
h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:34px;color:#262626;margin-bottom:14px;letter-spacing:0.02em}
p{color:#666;line-height:1.6;margin-bottom:28px;font-size:15px}
a{display:inline-block;padding:14px 32px;background:linear-gradient(180deg,#49C318,#38A30D);color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;box-shadow:0 8px 20px rgba(56,163,13,0.3);transition:transform 0.15s}
a:hover{transform:translateY(-2px)}
</style>
</head>
<body>
  <div class="box">
    <div class="icon"><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <h1>Дякуємо!</h1>
    <p>Ваша заявка прийнята.<br>Ми зв'яжемось з вами найближчим часом для уточнення деталей.</p>
    <a href="${returnUrl.replace(/"/g, '%22')}">${returnLabel}</a>
  </div>
</body>
</html>`);
}
