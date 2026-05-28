// Завантажувач трекінг-кодів з Supabase site_settings
// Включається у <head> усіх публічних сторінок
(function() {
  const SUPABASE_URL = 'https://jmfudjhembgeaztowcoe.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptZnVkamhlbWJnZWF6dG93Y29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDEyODMsImV4cCI6MjA5NTM3NzI4M30.AQC4uLLBE6lsbdRorypc6gKkZQU4n6yg4gGG_rG55iM';

  // Cache 1 хв через localStorage щоб не смикати БД на кожен перехід
  const CACHE_KEY = 'analytics_cache';
  const CACHE_TTL = 60 * 1000;

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() - obj.ts > CACHE_TTL) return null;
      return obj.data;
    } catch { return null; }
  }
  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
  }

  function injectGA4(id) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', id);
  }

  function injectMetaPixel(id) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', id);
    window.fbq('track', 'PageView');
  }

  function injectGTM(id) {
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',id);
  }

  function injectTikTok(id) {
    !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i='https://analytics.tiktok.com/i18n/pixel/events.js';ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement('script');o.type='text/javascript';o.async=!0;o.src=i+'?sdkid='+e+'&lib='+t;var a=document.getElementsByTagName('script')[0];a.parentNode.insertBefore(o,a)};ttq.load(id);ttq.page();}(window,document,'ttq');
  }

  function injectCustomHTML(html) {
    if (!html || !html.trim()) return;
    const container = document.createElement('div');
    container.innerHTML = html;
    // Виконати скрипти
    Array.from(container.children).forEach(node => {
      if (node.tagName === 'SCRIPT') {
        const s = document.createElement('script');
        Array.from(node.attributes).forEach(a => s.setAttribute(a.name, a.value));
        s.text = node.text;
        document.head.appendChild(s);
      } else {
        document.head.appendChild(node);
      }
    });
  }

  function applySettings(settings) {
    if (settings.gtm_id) injectGTM(settings.gtm_id);
    if (settings.ga4_id) injectGA4(settings.ga4_id);
    if (settings.meta_pixel_id) injectMetaPixel(settings.meta_pixel_id);
    if (settings.tiktok_pixel_id) injectTikTok(settings.tiktok_pixel_id);
    if (settings.custom_head_html) injectCustomHTML(settings.custom_head_html);
  }

  // Кеш — миттєво з local, потім свіжі дані з БД
  const cached = readCache();
  if (cached) applySettings(cached);

  fetch(`${SUPABASE_URL}/rest/v1/site_settings?select=key,value`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY }
  })
  .then(r => r.json())
  .then(rows => {
    const settings = {};
    (rows || []).forEach(r => settings[r.key] = r.value || '');
    writeCache(settings);
    // Якщо не було кешу — застосувати зараз
    if (!cached) applySettings(settings);
  })
  .catch(e => console.warn('Analytics loader:', e));
})();
