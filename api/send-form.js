// Vercel serverless function — приймає форму, шле у Telegram, опційно редиректить
// Env vars: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

// Вимикаємо автопарсинг — самі читаємо у UTF-8 (інакше кирилиця ламається)
export const config = {
  api: { bodyParser: false }
};

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(500).send('Bot is not configured: missing env vars');
  }

  // Читаємо тіло у UTF-8 і парсимо
  let body = {};
  try {
    const rawBody = await readRawBody(req);
    body = parseBody(rawBody, req.headers['content-type']);
  } catch (err) {
    console.error('Body read/parse error:', err);
    return res.status(400).send('Bad request: cannot read body');
  }

  const subject = (body._subject || 'Нова заявка з сайту').toString();
  const next = body._next ? body._next.toString() : null;

  // Іконка залежно від типу заявки
  let icon = '🆕';
  const subjLower = subject.toLowerCase();
  if (subjLower.includes('курс') || subjLower.includes('мінікурс')) icon = '📚';
  else if (subjLower.includes('замовлення')) icon = '🛍️';
  else if (subjLower.includes('питання')) icon = '❓';
  else if (subjLower.includes('доступ')) icon = '🔑';

  const lines = [`${icon} ${subject}`, '━━━━━━━━━━━━━━━━'];
  const skipKeys = new Set(['_subject', '_next', '_captcha', '_template', '_honey']);
  const fieldEmoji = {
    'Курс': '🎯',
    'Товар': '🎁',
    'Імʼя': '👤',
    "Ім'я": '👤',
    'Телефон': '📞',
    'Контакт': '📞',
    'Email': '✉️',
    'Адреса': '📍',
    'Місто': '🏙️',
    'Побажання': '💬',
    'Запитання': '💬',
    'Джерело': '🌐',
  };

  for (const [key, value] of Object.entries(body)) {
    if (skipKeys.has(key)) continue;
    const v = String(value || '').trim();
    if (!v) continue;
    const em = fieldEmoji[key] || '•';
    lines.push(`${em} ${key}: ${v}`);
  }

  lines.push('━━━━━━━━━━━━━━━━');
  const kyivTime = new Date().toLocaleString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  lines.push(`⏰ ${kyivTime} (Київ)`);

  const message = lines.join('\n');

  // Відправляємо у Telegram
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
      return res.status(500).send('Failed to send Telegram message: ' + (tgData.description || 'unknown'));
    }
  } catch (err) {
    console.error('Telegram fetch error:', err);
    return res.status(500).send('Network error: ' + err.message);
  }

  // Редирект на оплату якщо вказано _next
  if (next) {
    return res.redirect(302, next);
  }

  // Інакше — сторінка подяки
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
    <a href="/">← Повернутися на сайт</a>
  </div>
</body>
</html>`);
}
