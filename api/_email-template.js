// HTML-шаблон листа з посиланням на Telegram-групу після оплати курсу.
// Підтримує всі основні поштові клієнти (Gmail, Outlook, Mail.ru, iCloud).
// Inline CSS, table-based layout - стандарт для email.

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function renderEmailTemplate({ course }) {
  const title = course.title || 'Ваш курс';
  const tgUrl = course.telegram_url;
  // Курс з landing_courses має photo_path; fallback на photo_url
  const photo = course.photo_path || course.photo_url || '';
  const photoFull = photo
    ? (photo.startsWith('http') ? photo : `https://100candle.shop/${photo.replace(/^\//, '')}`)
    : '';

  // ===== TEXT-версія для клієнтів без HTML =====
  const text = [
    `Дякуємо за оплату!`,
    `========================================`,
    ``,
    `Вітаємо! Ваш доступ до курсу "${title}" готовий.`,
    ``,
    `ПОСИЛАННЯ НА TELEGRAM-ГРУПУ КУРСУ:`,
    tgUrl,
    ``,
    `------------------------------------------`,
    `Що далі?`,
    `------------------------------------------`,
    `1. Натисніть посилання вище або відкрийте Telegram`,
    `2. Приєднайтесь до групи курсу`,
    `3. У закріплених повідомленнях - вступне відео і інструкції`,
    ``,
    `Доступ до групи - безстроковий. Можна повертатись до уроків коли захочете.`,
    ``,
    `------------------------------------------`,
    `Потрібна допомога?`,
    `------------------------------------------`,
    `Telegram: @GalunaSpeak`,
    `Email: okvozuk@gmail.com`,
    `Телефон: +380 98 131 45 35`,
    ``,
    `Підписуйтесь на нас в Instagram: instagram.com/100.candle`,
    ``,
    `Гарного навчання!`,
    `Команда "Крафт-свічки та арома-професія"`,
    `100candle.shop`,
    ``,
    `------------------------------------------`,
    `ФОП Барзій Галина Йосифівна`,
    `Україна, Львівська обл., м. Львів`,
    `Цей транзакційний лист надіслано автоматично після успішної оплати курсу.`
  ].join('\n');

  // ===== HTML-версія =====
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
    .px-md { padding-left: 22px !important; padding-right: 22px !important; }
    .h1 { font-size: 26px !important; line-height: 32px !important; }
    .cta { padding: 16px 24px !important; font-size: 15px !important; }
    .step-num { width: 30px !important; height: 30px !important; line-height: 30px !important; font-size: 14px !important; }
    .social-btn { padding: 8px 14px !important; font-size: 12px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#fbf7f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#262626;">

<!-- Preheader (hidden, shows in inbox preview) -->
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#fbf7f4;opacity:0">
  Ваш доступ до курсу «${esc(title)}» готовий. Тисніть кнопку щоб приєднатись до Telegram-групи з усіма матеріалами курсу.
</div>

<table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="background-color:#fbf7f4">
  <tr>
    <td align="center" style="padding:28px 16px 16px">

      <!-- View in browser link -->
      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="600" class="container" style="max-width:600px;width:100%;margin-bottom:10px">
        <tr>
          <td align="right" style="padding:0 8px 8px;font-size:11px;color:#999">
            Не відображається коректно?
            <a href="https://100candle.shop" style="color:#888;text-decoration:underline">Відкрити на сайті</a>
          </td>
        </tr>
      </table>

      <!-- Container -->
      <table role="presentation" border="0" cellspacing="0" cellpadding="0" class="container" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 6px 28px rgba(0,0,0,0.07)">

        <!-- Header з градієнтом -->
        <tr>
          <td align="center" style="background:linear-gradient(135deg,#49C318 0%,#38A30D 100%);background-color:#38A30D;padding:42px 24px 32px;color:#ffffff">
            <table role="presentation" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="padding-bottom:16px">
                  <!-- Чекмарк -->
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="72" height="72" style="background-color:rgba(255,255,255,0.22);border-radius:50%">
                    <tr>
                      <td align="center" valign="middle" style="font-size:38px;color:#ffffff;line-height:72px;font-family:Arial,sans-serif">&#10003;</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td align="center" style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:600;color:#ffffff;line-height:36px;letter-spacing:0.5px">
                  Дякуємо за оплату!
                </td>
              </tr>
              <tr>
                <td align="center" style="font-size:15px;color:rgba(255,255,255,0.92);padding-top:10px">
                  Ваш доступ до курсу вже відкритий
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${photoFull ? `
        <!-- Фото курсу (банер) -->
        <tr>
          <td style="padding:0">
            <img src="${esc(photoFull)}" alt="${esc(title)}" width="600" style="display:block;width:100%;height:auto;max-height:240px;object-fit:cover">
          </td>
        </tr>
        ` : ''}

        <!-- Назва курсу -->
        <tr>
          <td class="px-md" align="center" style="padding:${photoFull ? '32' : '40'}px 40px 0">
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
          <td class="px-md" align="center" style="padding:18px 40px 0;font-size:15px;line-height:1.65;color:#555">
            <p style="margin:0">
              Вітаємо! Натисніть кнопку щоб приєднатись до приватної Telegram-групи з усіма матеріалами курсу.
            </p>
          </td>
        </tr>

        <!-- CTA кнопка -->
        <tr>
          <td align="center" style="padding:24px 40px 12px">
            <table role="presentation" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="border-radius:14px;background-color:#229ED9;box-shadow:0 8px 20px rgba(34,158,217,0.32)">
                  <a href="${esc(tgUrl)}" target="_blank" class="cta"
                     style="display:inline-block;padding:18px 38px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:14px;background-color:#229ED9;mso-padding-alt:0;letter-spacing:0.3px">
                    &#9993;&nbsp;&nbsp;Приєднатись до групи
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Резервне посилання -->
        <tr>
          <td class="px-md" align="center" style="padding:6px 40px 0;font-size:12px;line-height:1.6;color:#999">
            Якщо кнопка не працює:<br>
            <a href="${esc(tgUrl)}" style="color:#38A30D;word-break:break-all;text-decoration:underline">${esc(tgUrl)}</a>
          </td>
        </tr>

        <!-- Що далі - 3 кроки -->
        <tr>
          <td class="px-md" style="padding:34px 40px 0">
            <p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:600;color:#262626;text-align:center">
              Що далі?
            </p>
            <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
              <tr>
                <td style="padding:0 0 14px">
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                    <tr>
                      <td valign="top" width="46" style="padding-right:12px">
                        <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="34" height="34" class="step-num" style="background-color:#38A30D;border-radius:50%">
                          <tr><td align="center" valign="middle" style="color:#ffffff;font-weight:700;font-size:15px;line-height:34px">1</td></tr>
                        </table>
                      </td>
                      <td valign="top" style="font-size:14px;line-height:1.55;color:#444;padding-top:6px">
                        <strong style="color:#262626">Натисніть кнопку</strong> вище або вставте посилання у Telegram.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 0 14px">
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                    <tr>
                      <td valign="top" width="46" style="padding-right:12px">
                        <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="34" height="34" class="step-num" style="background-color:#38A30D;border-radius:50%">
                          <tr><td align="center" valign="middle" style="color:#ffffff;font-weight:700;font-size:15px;line-height:34px">2</td></tr>
                        </table>
                      </td>
                      <td valign="top" style="font-size:14px;line-height:1.55;color:#444;padding-top:6px">
                        <strong style="color:#262626">Приєднайтесь до групи</strong> курсу одним кліком.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td>
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                    <tr>
                      <td valign="top" width="46" style="padding-right:12px">
                        <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="34" height="34" class="step-num" style="background-color:#38A30D;border-radius:50%">
                          <tr><td align="center" valign="middle" style="color:#ffffff;font-weight:700;font-size:15px;line-height:34px">3</td></tr>
                        </table>
                      </td>
                      <td valign="top" style="font-size:14px;line-height:1.55;color:#444;padding-top:6px">
                        У <strong style="color:#262626">закріплених повідомленнях</strong> - вступне відео і інструкції як починати навчання.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Підказка -->
        <tr>
          <td class="px-md" style="padding:24px 40px 0">
            <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="background-color:#fbf7f4;border-radius:12px">
              <tr>
                <td style="padding:18px 22px;font-size:13.5px;line-height:1.6;color:#555">
                  <strong style="color:#38A30D">&#128161;&nbsp;Порада:</strong> <strong style="color:#262626">збережіть цей лист у закладки</strong> -
                  посилання на групу працює з будь-якого пристрою і доступ <strong>безстроковий</strong>.
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

        <!-- Соцмережі -->
        <tr>
          <td class="px-md" align="center" style="padding:24px 40px 0">
            <p style="margin:0 0 14px;font-size:14px;color:#262626;font-weight:600">Долучайтесь до нашої спільноти</p>
            <table role="presentation" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding:0 5px">
                  <a href="https://www.instagram.com/100.candle" target="_blank" class="social-btn"
                     style="display:inline-block;padding:10px 18px;background-color:#fff5f7;color:#E1306C;font-size:13px;font-weight:600;text-decoration:none;border-radius:10px;border:1px solid #f3d4dd">
                    Instagram
                  </a>
                </td>
                <td style="padding:0 5px">
                  <a href="https://t.me/GalunaSpeak" target="_blank" class="social-btn"
                     style="display:inline-block;padding:10px 18px;background-color:#f0f8fc;color:#229ED9;font-size:13px;font-weight:600;text-decoration:none;border-radius:10px;border:1px solid #cfe6f4">
                    Telegram
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Контакти підтримки -->
        <tr>
          <td class="px-md" align="center" style="padding:24px 40px 0;font-size:13.5px;line-height:1.7;color:#666">
            <strong style="color:#262626">Потрібна допомога?</strong><br>
            <a href="mailto:okvozuk@gmail.com" style="color:#38A30D;text-decoration:none;font-weight:600">okvozuk@gmail.com</a>
            &nbsp;·&nbsp;
            <a href="tel:+380981314535" style="color:#38A30D;text-decoration:none;font-weight:600">+380 98 131 45 35</a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:30px 40px 24px;font-size:12px;color:#999;line-height:1.6">
            <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#262626;text-transform:uppercase;letter-spacing:1px;font-weight:600">
              Крафт-свічки та арома-професія
            </p>
            <p style="margin:0 0 4px">
              <a href="https://100candle.shop" style="color:#999;text-decoration:none">100candle.shop</a>
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#999">
              ФОП Барзій Галина Йосифівна<br>
              Україна, Львівська обл., м. Львів
            </p>
            <p style="margin:14px 0 0;font-size:11px;color:#bbb">
              Цей транзакційний лист надіслано автоматично після успішної оплати курсу.<br>
              Якщо ви не оплачували курс - повідомте нам <a href="mailto:okvozuk@gmail.com" style="color:#bbb;text-decoration:underline">okvozuk@gmail.com</a>.
            </p>
            <p style="margin:14px 0 0;padding-top:14px;border-top:1px solid rgba(0,0,0,0.06);font-size:11px;color:#bbb">
              Не хочете отримувати такі листи?
              <a href="mailto:okvozuk@gmail.com?subject=Відписка%20від%20100candle.shop&body=Прошу%20більше%20не%20надсилати%20мені%20листи%20з%20домену%20100candle.shop" style="color:#888;text-decoration:underline">Відписатись</a>
            </p>
          </td>
        </tr>

      </table>

      <!-- Підпис під контейнером -->
      <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="600" class="container" style="max-width:600px;width:100%;margin-top:12px">
        <tr>
          <td align="center" style="padding:8px 16px;font-size:11px;color:#aaa">
            © ${new Date().getFullYear()} 100candle.shop · Зроблено з любовʼю до handmade
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
