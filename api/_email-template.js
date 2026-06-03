// HTML-шаблон листа з посиланням на Telegram-групу після оплати курсу.
// Підтримує всі основні поштові клієнти (Gmail, Outlook, Mail.ru, iCloud).
// Inline CSS, table-based layout — стандарт для email.

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function renderEmailTemplate({ course }) {
  const title = course.title || 'Ваш курс';
  const tgUrl = course.telegram_url;
  const photo = course.photo_url || '';

  const text = [
    `Вітаємо!`,
    ``,
    `Дякуємо за оплату курсу «${title}».`,
    ``,
    `Ваш доступ до приватної Telegram-групи з усіма матеріалами:`,
    tgUrl,
    ``,
    `Якщо посилання не відкривається — скопіюйте його у браузер або натисніть пряму кнопку у листі.`,
    ``,
    `Виникли питання? Напишіть нам у Telegram @GalunaSpeak або на okvozuk@gmail.com.`,
    ``,
    `Гарного навчання!`,
    `Команда «Крафт-свічки та арома-професія»`,
    `100candle.shop`
  ].join('\n');

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="format-detection" content="telephone=no">
<title>Доступ до курсу: ${esc(title)}</title>
<style type="text/css">
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
  body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  @media screen and (max-width: 600px) {
    .container { width: 100% !important; }
    .px-md { padding-left: 24px !important; padding-right: 24px !important; }
    .h1 { font-size: 26px !important; line-height: 32px !important; }
    .cta { padding: 16px 28px !important; font-size: 15px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#fbf7f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#262626;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#fbf7f4;opacity:0">
  Ваш доступ до Telegram-групи курсу «${esc(title)}» готовий!
</div>

<table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="background-color:#fbf7f4">
  <tr>
    <td align="center" style="padding:32px 16px">

      <!-- Контейнер -->
      <table role="presentation" border="0" cellspacing="0" cellpadding="0" class="container" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.06)">

        <!-- Header з градієнтом -->
        <tr>
          <td align="center" style="background:linear-gradient(135deg,#49C318 0%,#38A30D 100%);background-color:#38A30D;padding:36px 24px 28px;color:#ffffff">
            <table role="presentation" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="padding-bottom:14px">
                  <!-- Чекмарк -->
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="64" height="64" style="background-color:rgba(255,255,255,0.18);border-radius:50%">
                    <tr>
                      <td align="center" valign="middle" style="font-size:34px;color:#ffffff;line-height:64px;font-family:Arial,sans-serif">&#10003;</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td align="center" style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:600;color:#ffffff;line-height:34px;letter-spacing:0.5px">
                  Дякуємо за оплату!
                </td>
              </tr>
              <tr>
                <td align="center" style="font-size:14px;color:rgba(255,255,255,0.9);padding-top:8px">
                  Ваш доступ готовий
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Назва курсу -->
        <tr>
          <td class="px-md" align="center" style="padding:36px 40px 0">
            <table role="presentation" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td style="background-color:rgba(56,163,13,0.1);color:#38A30D;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;padding:6px 14px;border-radius:14px">
                  Ваш курс
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td class="px-md h1" align="center" style="padding:14px 40px 0;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:600;color:#262626;line-height:36px">
            ${esc(title)}
          </td>
        </tr>

        <!-- Привітання -->
        <tr>
          <td class="px-md" style="padding:24px 40px 8px;font-size:15px;line-height:1.65;color:#444">
            <p style="margin:0 0 14px">Вітаємо!</p>
            <p style="margin:0 0 14px">
              Ваш доступ до приватної Telegram-групи з усіма матеріалами курсу — готовий.
              Натисніть кнопку нижче, щоб приєднатись:
            </p>
          </td>
        </tr>

        <!-- CTA кнопка -->
        <tr>
          <td align="center" style="padding:18px 40px 8px">
            <table role="presentation" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="border-radius:14px;background-color:#229ED9">
                  <a href="${esc(tgUrl)}" target="_blank" class="cta"
                     style="display:inline-block;padding:18px 38px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:14px;background-color:#229ED9;mso-padding-alt:0;letter-spacing:0.3px">
                    &#9993;&nbsp;&nbsp;Приєднатись до Telegram-групи
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Резервне посилання -->
        <tr>
          <td class="px-md" align="center" style="padding:18px 40px 0;font-size:13px;line-height:1.6;color:#888">
            Якщо кнопка не працює, скопіюйте посилання:<br>
            <a href="${esc(tgUrl)}" style="color:#38A30D;word-break:break-all;text-decoration:underline">${esc(tgUrl)}</a>
          </td>
        </tr>

        <!-- Підказка -->
        <tr>
          <td class="px-md" style="padding:28px 40px 0">
            <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="background-color:#fbf7f4;border-radius:12px">
              <tr>
                <td style="padding:18px 22px;font-size:13.5px;line-height:1.6;color:#555">
                  <strong style="color:#262626">Порада:</strong> збережіть цей лист у закладки —
                  посилання на групу працює з будь-якого пристрою. Усередині групи ви знайдете
                  всі відео-уроки, конспекти та зможете ставити запитання.
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Розділювач -->
        <tr>
          <td class="px-md" style="padding:32px 40px 0">
            <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
              <tr><td style="border-top:1px solid rgba(38,38,38,0.08);height:1px;line-height:1px">&nbsp;</td></tr>
            </table>
          </td>
        </tr>

        <!-- Контакти -->
        <tr>
          <td class="px-md" align="center" style="padding:24px 40px 8px;font-size:13.5px;line-height:1.7;color:#666">
            <strong style="color:#262626">Виникли питання?</strong><br>
            Telegram: <a href="https://t.me/GalunaSpeak" style="color:#38A30D;text-decoration:none;font-weight:600">@GalunaSpeak</a>
            &nbsp;·&nbsp;
            Email: <a href="mailto:okvozuk@gmail.com" style="color:#38A30D;text-decoration:none;font-weight:600">okvozuk@gmail.com</a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:24px 40px 32px;font-size:12px;color:#999;line-height:1.6">
            <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#262626;text-transform:uppercase;letter-spacing:1px;font-weight:600">
              Крафт-свічки та арома-професія
            </p>
            <p style="margin:0">
              <a href="https://100candle.shop" style="color:#999;text-decoration:none">100candle.shop</a>
              · ФОП Барзій Галина Йосифівна
            </p>
            <p style="margin:8px 0 0;font-size:11px;color:#bbb">
              Цей лист надіслано автоматично після успішної оплати.
              Якщо ви не оплачували курс — повідомте нам.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { html, text };
}
