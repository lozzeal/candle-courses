// ============================================================
// form-handler.js — універсальний AJAX-обробник форм /api/send-form
// Показує помилки валідації ІНЛАЙН у формі (як native email-помилки)
// ============================================================
(function () {
  'use strict';

  function isSendFormAction(action) {
    if (!action) return false;
    try {
      return new URL(action, window.location.origin).pathname === '/api/send-form';
    } catch { return false; }
  }

  function findTargetInput(form, errorText) {
    const t = (errorText || '').toLowerCase();
    if (t.includes('телефон')) {
      return form.querySelector('[name="Телефон"], [name="Контакт"]');
    }
    if (t.includes('email')) {
      return form.querySelector('[name="Email"]');
    }
    if (t.includes('спам') || t.includes('spam')) {
      return form.querySelector('textarea, [name="Побажання"], [name="Запитання"]')
          || form.querySelector('input[type="text"]:not([type="hidden"])');
    }
    // Default: перше видиме поле
    return form.querySelector('input:not([type="hidden"]):not([type="submit"]), textarea');
  }

  function clearValidity(form) {
    form.querySelectorAll('input, textarea, select').forEach((el) => {
      if (typeof el.setCustomValidity === 'function') el.setCustomValidity('');
    });
  }

  function attachError(input, message) {
    if (!input || typeof input.setCustomValidity !== 'function') {
      alert(message);
      return;
    }
    input.setCustomValidity(message);
    input.reportValidity();
    input.focus();
    // При першій зміні прибираємо помилку
    const onInput = () => {
      input.setCustomValidity('');
      input.removeEventListener('input', onInput);
    };
    input.addEventListener('input', onInput);
  }

  document.addEventListener('submit', async function (e) {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!isSendFormAction(form.getAttribute('action'))) return;

    e.preventDefault();
    clearValidity(form);

    const submitBtn = form.querySelector('[type="submit"], button:not([type])');
    const originalText = submitBtn ? submitBtn.textContent : null;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Відправляємо…';
    }

    try {
      const formData = new FormData(form);
      const params = new URLSearchParams();
      for (const [k, v] of formData.entries()) params.append(k, v);

      const resp = await fetch(form.getAttribute('action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        redirect: 'follow',
      });

      if (resp.ok) {
        const contentType = (resp.headers.get('content-type') || '').toLowerCase();
        const text = await resp.text();

        // Якщо сервер повернув HTML сторінку «Дякуємо!» — показуємо її
        if (contentType.includes('text/html') && text.trim().startsWith('<!DOCTYPE')) {
          document.open();
          document.write(text);
          document.close();
          return;
        }

        // Інакше — редирект на _return_url або на головну
        const returnUrl = form.querySelector('[name="_return_url"]')?.value || '/';
        window.location.href = returnUrl;
        return;
      }

      // Помилка — показуємо ІНЛАЙН
      const errorText = (await resp.text()) || 'Помилка відправки. Перевірте дані.';
      const target = findTargetInput(form, errorText);
      attachError(target, errorText);
    } catch (err) {
      alert('Помилка з\'єднання: ' + (err && err.message ? err.message : 'спробуйте ще раз'));
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        if (originalText) submitBtn.textContent = originalText;
      }
    }
  }, true);
})();
