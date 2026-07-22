// ============================================================
// /api/resend-failed-emails
// ============================================================
// Знаходить усі Approved webhook-и з email_sent=false і повторно
// шле лист з посиланням на Telegram-канал курсу.
//
// Виклик: POST /api/resend-failed-emails
// Headers: x-admin-token: <MIGRATION_TOKEN>
// Body (JSON, опціонально):
//   { "orderReference": "WFP-BTN-..." }  ← якщо треба лише один
//   {}  ← або всі failed
// ============================================================

import nodemailer from 'nodemailer';
import buildEmailHtml from './_email-template.js';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  SMTP_FROM_NAME,
  SMTP_REPLY_TO,
  MIGRATION_TOKEN,
} = process.env;

// Мапінг назв продуктів WayForPay → slug курсу в БД
function mapProductNameToSlug(productName) {
  const s = (productName || '').toLowerCase();
  if (s.includes('десертн')) return 'course-desertna';
  if (s.includes('бетонн') && !s.includes('гіпс')) return 'course-betonna';
  if (s.includes('гіпс')) return 'course-hips-beton';
  if (s.includes('реклам') || s.includes('таргет')) return 'course-reklama';
  if (s.includes('свічковарінн') || s.includes('базов') || s.includes('професійн')) return 'course-svichkovarinnia';
  return null;
}

async function pgSelect(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + SUPABASE_SERVICE_KEY },
  });
  if (!res.ok) throw new Error(`PG error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function pgUpdate(path, body) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: 'Bearer ' + SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  const token = req.headers['x-admin-token'];
  if (!MIGRATION_TOKEN || token !== MIGRATION_TOKEN) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Читаємо body
    let body = {};
    try { body = req.body || {}; } catch {}
    const singleOrderRef = body.orderReference;

    // Знайти всі кандидати
    const filter = singleOrderRef
      ? `payment_webhooks?transaction_status=eq.Approved&order_reference=eq.${encodeURIComponent(singleOrderRef)}`
      : `payment_webhooks?transaction_status=eq.Approved&email_sent=eq.false&order=received_at.desc`;
    const webhooks = await pgSelect(filter);

    if (!webhooks.length) {
      return res.status(200).json({ processed: 0, sent: 0, failed: 0, results: [], message: 'No failed emails found' });
    }

    // Готуємо SMTP
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '465', 10),
      secure: parseInt(SMTP_PORT || '465', 10) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    // Всі курси одразу (для мапінгу)
    const courses = await pgSelect('landing_courses?select=id,slug,title,telegram_url,photo_path');

    const results = [];
    let sent = 0, failed = 0;

    for (const wh of webhooks) {
      const parsed = wh.parsed_body || {};
      const email = parsed.email;
      const firstName = parsed.clientFirstName || '';
      // Назва продукту може бути у різних місцях
      let productName = '';
      if (Array.isArray(parsed.productName)) productName = parsed.productName.join(', ');
      else if (typeof parsed.productName === 'string') productName = parsed.productName;
      else if (Array.isArray(parsed.products) && parsed.products[0]) productName = parsed.products[0].name || '';

      const slug = mapProductNameToSlug(productName);
      const course = courses.find((c) => c.slug === slug);

      if (!email) { results.push({ ref: wh.order_reference, error: 'no email' }); failed++; continue; }
      if (!course) { results.push({ ref: wh.order_reference, email, error: 'course not matched: ' + productName }); failed++; continue; }
      if (!course.telegram_url) { results.push({ ref: wh.order_reference, email, error: 'no telegram_url for ' + course.slug }); failed++; continue; }

      try {
        const html = buildEmailHtml({
          course,
          orderRef: wh.order_reference,
          clientFirstName: firstName,
          brandUrl: 'https://100candle.shop',
        });
        const text = `Вітаємо${firstName ? ', ' + firstName : ''}!\n\nДякуємо за оплату курсу "${course.title}".\n\nВаше посилання на Telegram-групу: ${course.telegram_url}\n\nЯкщо будуть питання — @GalunaSpeak.\n\nЗ повагою, Галина, 100candle.shop`;

        await transporter.sendMail({
          from: `"${SMTP_FROM_NAME || '100candle.shop'}" <${SMTP_FROM || SMTP_USER}>`,
          to: email,
          replyTo: SMTP_REPLY_TO || 'okvozuk@gmail.com',
          subject: `Доступ до курсу: ${course.title}`,
          text,
          html,
          headers: {
            'X-Entity-Ref-ID': course.id + '-resend-' + Date.now(),
            'List-Unsubscribe': `<mailto:${SMTP_REPLY_TO || 'okvozuk@gmail.com'}?subject=Unsubscribe>`,
          },
        });

        // Оновлюємо стан
        await pgUpdate(`payment_webhooks?id=eq.${wh.id}`, {
          email_sent: true,
          email_attempted: true,
          error: null,
        });

        results.push({ ref: wh.order_reference, email, course: course.slug, status: 'sent' });
        sent++;
      } catch (e) {
        results.push({ ref: wh.order_reference, email, error: e.message });
        failed++;
      }
    }

    return res.status(200).json({ processed: webhooks.length, sent, failed, results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
