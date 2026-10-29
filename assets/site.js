/* Фабрика моментів — спільний скрипт сайту.
   Версія 1, 28.10.2026.
   Підключається на всіх сторінках: <script src="/assets/site.js" defer></script>

   ЩО РОБИТЬ
   1. Заглушки посилань: <a href="#" data-fm-stub="Telegram тимчасово недоступний">.
   2. Банер згоди на cookies + режим згоди Google (Consent Mode v2, базовий).
   3. Завантаження Google Tag Manager — лише коли банер увімкнено.

   ЯК УВІМКНУТИ АНАЛІТИКУ (Частина 5 пам'ятки-інструкції, все в ОДИН день):
   - bannerEnabled: true
   - gtmId: 'GTM-XXXXXXX'
   - коміт → Cloudflare опублікує всі сторінки разом.
   Політику не змінюємо: розділ «Cookies та статистика» вже остаточний. */
(function () {
  'use strict';

  var SETTINGS = {
    bannerEnabled: false,   // true — лише разом з gtmId, того самого дня
    gtmId: '',              // 'GTM-XXXXXXX'
    policyUrl: '/polityka-konfidentsiinosti/#cookies',
    consentDays: 182        // скільки пам'ятати вибір (≈ 6 місяців)
  };
  var KEY = 'fm_consent';

  /* ---------- 1. Заглушки ---------- */
  var toastTimer = null;
  function toast(text) {
    var t = document.querySelector('.fm-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'fm-toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2500);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-fm-stub]') : null;
    if (!a) return;
    e.preventDefault();
    toast(a.getAttribute('data-fm-stub') || 'Тимчасово недоступно');
  });

  /* ---------- 2. Згода ---------- */
  if (!SETTINGS.bannerEnabled) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  if (!window.gtag) window.gtag = gtag;

  // До згоди — нічого не збирається
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied'
  });

  function readChoice() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || 'null');
      return c && c.exp > Date.now() ? c : null;
    } catch (e) { return null; }
  }
  function saveChoice(v) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ analytics: v, exp: Date.now() + SETTINGS.consentDays * 864e5 }));
    } catch (e) { /* приватний режим: вибір не збережеться */ }
  }

  var saved = readChoice();
  if (saved && saved.analytics === 'granted') {
    gtag('consent', 'update', { analytics_storage: 'granted' });
    window.dataLayer.push({ event: 'fm_consent_ready', fm_analytics: 'granted' });
  }

  // Внутрішній трафік: відкрити сайт один раз з ?internal=1
  try { if (/[?&]internal=1/.test(location.search)) localStorage.setItem('fm_internal', '1'); } catch (e) {}

  /* ---------- 3. Google Tag Manager ---------- */
  if (SETTINGS.gtmId) {
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(SETTINGS.gtmId);
    document.head.appendChild(s);
  }

  /* ---------- Банер ---------- */
  var box = document.createElement('div');
  box.className = 'fm-cookie';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-live', 'polite');
  box.setAttribute('aria-label', 'Налаштування cookies');
  box.hidden = true;
  box.innerHTML =
    '<p>Ми використовуємо cookies, щоб розуміти, як покращити сайт. Аналітику вмикаємо лише з вашої згоди. ' +
    '<a href="' + SETTINGS.policyUrl + '">Детальніше</a></p>' +
    '<div class="fm-cookie-actions">' +
    '<button type="button" class="fm-btn fm-btn-accent" data-consent="granted">Прийняти</button>' +
    '<button type="button" class="fm-btn" data-consent="denied">Відхилити</button>' +
    '</div>';
  document.body.appendChild(box);

  function choose(v) {
    saveChoice(v);
    gtag('consent', 'update', { analytics_storage: v });
    window.dataLayer.push({ event: 'fm_consent_update', fm_analytics: v });
    if (v === 'denied' && window.clarity) {
      window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
    }
    box.hidden = true;
  }
  box.addEventListener('click', function (e) {
    var v = e.target.getAttribute && e.target.getAttribute('data-consent');
    if (v) choose(v);
  });

  // Посилання «Налаштування cookies» у футері: <a href="#" data-fm-cookie-settings hidden>
  var links = document.querySelectorAll('[data-fm-cookie-settings]');
  for (var i = 0; i < links.length; i++) {
    links[i].hidden = false;
    links[i].addEventListener('click', function (e) { e.preventDefault(); box.hidden = false; });
  }

  if (!saved) box.hidden = false;
})();
