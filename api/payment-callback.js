// Vercel serverless function - WayForPay Service URL webhook
// Викликається сервером WayForPay після оплати.
// Перевіряє підпис, знаходить курс, надсилає клієнту email з посиланням на Telegram-групу.
//
// Env vars (Vercel → Settings → Environment Variables):
//   WAYFORPAY_SECRET        - Merchant Secret Key з кабінету WayForPay
//   WAYFORPAY_ACCOUNT       - Merchant Account (напр. "100candle_shop") - опційно для додаткової перевірки
//   SMTP_HOST               - smtp-pulse.com
//   SMTP_PORT               - 2525 (або 465 для SSL)
//   SMTP_USER               - логін SendPulse SMTP (напр. okvozuk@gmail.com)
//   SMTP_PASS               - пароль SendPulse SMTP
//   SMTP_FROM               - noreply@100candle.shop (верифікований у SendPulse)
//   SMTP_FROM_NAME          - "Крафт-свічки та арома-професія" (опційно)
//   SUPABASE_URL            - вже є
//   SUPABASE_SERVICE_KEY    - вже є

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { renderEmailTemplate } from './_email-template.js';

export const config = {
  api: { bodyParser: false }
};

// ====================== УТИЛІТИ ======================

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

// WayForPay підписує MD5(HMAC) у формулі:
// merchantSignature = HMAC_MD5(secret,
//   merchantAccount;orderReference;amount;currency;authCode;cardPan;transactionStatus;reasonCode
// )
function buildWebhookSignature(secret, data) {
  const fields = [
    data.merchantAccount,
    data.orderReference,
    data.amount,
    data.currency,
    data.authCode,
    data.cardPan,
    data.transactionStatus,
    data.reasonCode
  ];
  const str = fields.join(';');
  return crypto.createHmac('md5', secret).update(str, 'utf8').digest('hex');
}

// Відповідь WayForPay: status;time → HMAC_MD5
function buildAcceptSignature(secret, orderReference, status, time) {
  const str = [orderReference, status, time].join(';');
  return crypto.createHmac('md5', secret).update(str, 'utf8').digest('hex');
}

// Безпечне порівняння рядків (timing-safe)
function safeEqual(a, b) {
  const A = Buffer.from(String(a || ''), 'utf8');
  const B = Buffer.from(String(b || ''), 'utf8');
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

// ====================== SUPABASE ======================

async function supabaseSelect(table, params) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/${table}?${params}`;
  const r = await fetch(url, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_KEY
    }
  });
  if (!r.ok) throw new Error(`Supabase ${table} read ${r.status}`);
  return r.json();
}

async function supabaseUpdate(table, params, body) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/${table}?${params}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_KEY,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Supabase ${table} update ${r.status}: ${txt}`);
  }
  return r.json();
}

// Знаходимо курс за webhook-даними. Стратегії в порядку надійності:
//   1) Унікальне співпадіння ціни (наш міні-курс 550 ₴ - єдиний)
//   2) productName з WayForPay містить title курсу (або навпаки)
//   3) Останнє замовлення по email → product_or_course містить title курсу
async function findCourse({ amount, productName, email }) {
  // Strategy 1: унікальна ціна
  const byPrice = await supabaseSelect(
    'landing_courses',
    `select=*&price=eq.${encodeURIComponent(amount)}`
  );
  if (byPrice.length === 1) {
    console.log(`findCourse: ✅ by-price unique → ${byPrice[0].slug}`);
    return byPrice[0];
  }

  const nameMatch = (haystack, needle) => {
    const h = String(haystack || '').toLowerCase().trim();
    const n = String(needle || '').toLowerCase().trim();
    if (!h || !n) return false;
    return h.includes(n) || n.includes(h);
  };

  // Беремо кандидатів - або всі курси, або тільки ті, що з цією ціною
  const candidates = byPrice.length
    ? byPrice
    : await supabaseSelect('landing_courses', 'select=*');

  // Strategy 2: productName з WayForPay
  if (productName) {
    const pName = Array.isArray(productName) ? productName.join(' ') : productName;
    const found = candidates.find(c => nameMatch(c.title, pName));
    if (found) {
      console.log(`findCourse: ✅ by-productName "${pName}" → ${found.slug}`);
      return found;
    }
  }

  // Strategy 3: останнє замовлення по email
  if (email) {
    try {
      const orders = await supabaseSelect(
        'orders',
        `select=product_or_course&customer_email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=3`
      );
      for (const o of (orders || [])) {
        const poc = o.product_or_course;
        if (!poc) continue;
        const found = candidates.find(c => nameMatch(c.title, poc));
        if (found) {
          console.log(`findCourse: ✅ by-order-history "${poc}" → ${found.slug}`);
          return found;
        }
      }
    } catch (e) {
      console.warn('findCourse: orders lookup failed:', e.message);
    }
  }

  console.warn(`findCourse: ❌ не вдалось визначити курс - amount=${amount}, productName=${productName}, email=${email}, candidates=${candidates.length}`);
  return null;
}

// ====================== SMTP ======================

function buildTransporter() {
  const port = parseInt(process.env.SMTP_PORT || '2525', 10);
  const secure = port === 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-pulse.com',
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function sendCourseEmail({ to, course }) {
  const transporter = buildTransporter();
  const fromName = process.env.SMTP_FROM_NAME || 'Крафт-свічки та арома-професія';
  const fromAddr = process.env.SMTP_FROM || 'noreply@100candle.shop';
  const { html, text } = renderEmailTemplate({ course });
  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromAddr}>`,
    to,
    subject: `Доступ до курсу: ${course.title}`,
    text,
    html,
    headers: {
      'X-Entity-Ref-ID': course.id + '-' + Date.now()
    }
  });
  return info;
}

// ====================== HANDLER ======================

// Лог-helper: записуємо КОЖЕН вхідний webhook у payment_webhooks
async function logWebhook(row) {
  try {
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/payment_webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_KEY,
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(row)
    });
  } catch (e) { console.warn('logWebhook failed:', e.message); }
}

export default async function handler(req, res) {
  // WayForPay шле тільки POST, але приймемо GET для health-check
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, service: 'payment-callback' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';

  // Спершу читаємо raw-body - щоб мати його у логах навіть при помилках
  let rawBody = '';
  try { rawBody = await readRawBody(req); } catch {}

  const SECRET = process.env.WAYFORPAY_SECRET;
  if (!SECRET) {
    console.error('WAYFORPAY_SECRET не налаштовано');
    await logWebhook({ method: req.method, raw_body: rawBody, client_ip: clientIp, error: 'WAYFORPAY_SECRET not set' });
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  let data;
  try {
    data = JSON.parse(rawBody);
  } catch (err) {
    console.error('Bad webhook body:', err.message);
    await logWebhook({ method: req.method, raw_body: rawBody, client_ip: clientIp, error: 'JSON parse: ' + err.message });
    return res.status(400).json({ error: 'Bad body' });
  }

  // ===== Перевірка підпису =====
  const expectedSig = buildWebhookSignature(SECRET, data);
  const sigValid = safeEqual(expectedSig, data.merchantSignature);
  if (!sigValid) {
    console.warn('Invalid WayForPay signature', {
      orderReference: data.orderReference,
      transactionStatus: data.transactionStatus
    });
    await logWebhook({
      method: req.method, raw_body: rawBody, parsed_body: data,
      order_reference: data.orderReference, transaction_status: data.transactionStatus,
      amount: Number(data.amount) || null,
      signature_valid: false, client_ip: clientIp,
      error: `Invalid signature. Expected: ${expectedSig.slice(0, 8)}..., got: ${String(data.merchantSignature || '').slice(0, 8)}...`
    });
    return res.status(403).json({ error: 'Invalid signature' });
  }

  const orderRef = data.orderReference;
  const status = data.transactionStatus;
  const amount = Number(data.amount);
  const clientEmail = data.email || data.clientEmail || null;

  // ===== Готуємо відповідь для WayForPay (завжди accept, інакше WFP буде ретраїти) =====
  const respTime = Math.floor(Date.now() / 1000);
  const respPayload = {
    orderReference: orderRef,
    status: 'accept',
    time: respTime,
    signature: buildAcceptSignature(SECRET, orderRef, 'accept', respTime)
  };

  // Обробляємо тільки успішні оплати; для інших - просто accept без email
  if (status !== 'Approved') {
    console.log(`Webhook ${orderRef}: status=${status} - skipping email`);
    await logWebhook({
      method: req.method, raw_body: rawBody, parsed_body: data,
      order_reference: orderRef, transaction_status: status, amount,
      signature_valid: true, client_ip: clientIp,
      error: `Skipped: status=${status} (не Approved)`
    });
    return res.status(200).json(respPayload);
  }

  if (!clientEmail) {
    console.warn(`Webhook ${orderRef}: Approved але немає email`);
    await logWebhook({
      method: req.method, raw_body: rawBody, parsed_body: data,
      order_reference: orderRef, transaction_status: status, amount,
      signature_valid: true, client_ip: clientIp,
      error: 'Немає clientEmail у webhook'
    });
    return res.status(200).json(respPayload);
  }

  // ===== Idempotency: чи вже відправляли цей orderReference =====
  try {
    const existing = await supabaseSelect(
      'orders',
      `select=id,email_sent&payment_order_ref=eq.${encodeURIComponent(orderRef)}&limit=1`
    );
    if (existing.length && existing[0].email_sent) {
      console.log(`Webhook ${orderRef}: email вже надіслано - skip`);
      return res.status(200).json(respPayload);
    }
  } catch (err) {
    console.warn('Idempotency check failed:', err.message);
  }

  // ===== Знайти курс =====
  let course = null;
  try {
    course = await findCourse({
      amount,
      productName: data.productName,
      email: clientEmail
    });
  } catch (err) {
    console.error('findCourse failed:', err.message);
  }

  if (!course) {
    console.warn(`Webhook ${orderRef}: курс не знайдено за amount=${amount}`);
    // Записуємо у БД, що оплата була, але курс не визначено - клієнтка побачить в адмінці
    try {
      await supabaseUpdate('orders',
        `customer_email=eq.${encodeURIComponent(clientEmail)}&order=created_at.desc&limit=1`,
        {
          payment_order_ref: orderRef,
          payment_status: status,
          payment_amount: amount,
          payment_paid_at: new Date().toISOString(),
          email_error: `Курс не знайдений за сумою ${amount}₴`
        }
      );
    } catch {}
    return res.status(200).json(respPayload);
  }

  if (!course.telegram_url) {
    console.warn(`Webhook ${orderRef}: у курсу ${course.slug} немає telegram_url`);
    return res.status(200).json(respPayload);
  }

  // ===== Надсилаємо email =====
  let emailError = null;
  try {
    await sendCourseEmail({ to: clientEmail, course });
    console.log(`Webhook ${orderRef}: email надіслано на ${clientEmail}`);
  } catch (err) {
    emailError = err.message;
    console.error(`Webhook ${orderRef}: помилка SMTP:`, err.message);
  }

  // Лог фінального результату
  await logWebhook({
    method: req.method, raw_body: rawBody, parsed_body: data,
    order_reference: orderRef, transaction_status: status, amount,
    signature_valid: true, email_attempted: true,
    email_sent: !emailError, error: emailError, client_ip: clientIp
  });

  // ===== Фіксуємо у БД =====
  try {
    // Знаходимо найсвіжіше замовлення цього клієнта
    const orders = await supabaseSelect(
      'orders',
      `select=id&customer_email=eq.${encodeURIComponent(clientEmail)}&order=created_at.desc&limit=1`
    );
    if (orders.length) {
      await supabaseUpdate('orders', `id=eq.${orders[0].id}`, {
        payment_order_ref: orderRef,
        payment_status: status,
        payment_amount: amount,
        payment_paid_at: new Date().toISOString(),
        email_sent: !emailError,
        email_sent_at: emailError ? null : new Date().toISOString(),
        email_error: emailError,
        status: emailError ? 'paid_email_failed' : 'paid_email_sent'
      });
    }
  } catch (err) {
    console.error('orders update failed:', err.message);
  }

  return res.status(200).json(respPayload);
}
