/* Фабрика моментів — форма «Замовити момент», джерело переходу й події аналітики.
   Версія 1.2, 04.11.2026: список «Що замовляєте» оновлюється разом із даними таблиці; набори згруповано за святами; набори без ціни — «скоро».
   Версія 1.1, 04.11.2026: перевірка номера телефону і запис у вигляді +380 XX XXX XX XX.
   Версія 1.0, 29.10.2026. Заявка йде в скрипт заявок (config.js → ordersUrl). */
(function () {
  'use strict';
  var CFG = window.FM_CONFIG || {};

  /* ---------- Аналітика: місце готове, працює лише після ввімкнення GTM у site.js ---------- */
  window.dataLayer = window.dataLayer || [];
  window.fmEvent = function (name, params) {
    try {
      if (localStorage.getItem('fm_internal') === '1') return;
    } catch (e) {}
    var o = { event: name };
    for (var k in params || {}) o[k] = params[k];
    window.dataLayer.push(o);
  };

  /* ---------- Джерело переходу до кінця візиту (sessionStorage, не cookie) ---------- */
  var KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  try {
    var p = new URLSearchParams(location.search), found = {}, has = false;
    KEYS.forEach(function (k) { var v = p.get(k); if (v) { found[k] = v.toLowerCase().slice(0, 80); has = true; } });
    if (has) sessionStorage.setItem('fm_utm', JSON.stringify(found));
    if (!sessionStorage.getItem('fm_ref')) {
      var r = document.referrer ? new URL(document.referrer).hostname : '';
      if (r === location.hostname) r = '';
      sessionStorage.setItem('fm_ref', r || 'direct');
    }
  } catch (e) {}
  function sourceFields() {
    var u = {}, ref = '';
    try { u = JSON.parse(sessionStorage.getItem('fm_utm') || '{}'); ref = sessionStorage.getItem('fm_ref') || ''; } catch (e) {}
    return { utm_source: u.utm_source || '', utm_medium: u.utm_medium || '', utm_campaign: u.utm_campaign || '',
             utm_content: u.utm_content || '', referrer: ref };
  }

  /* ---------- Форма ---------- */
  var form = document.getElementById('orderForm');
  if (!form) return;
  var sel = form.elements.product, opened = 0, started = false, sending = false;

  // Список товарів — з даних сайту. Сайт викликає fmFillProducts() щоразу, коли приходять свіжі дані таблиці.
  // Набори — групами за святами в порядку каталогу (window.FM_SETGROUPS: у продажу → скоро → минулі).
  function fillProducts() {
    var keep = sel.options[sel.selectedIndex] ? (sel.options[sel.selectedIndex].dataset.id || sel.value) : '';
    var list = (window.FM_PRODUCTS || []).slice().sort(function (a, b) { return (a.sort || 99) - (b.sort || 99); });
    var by = {}; list.forEach(function (p) { by[p.item_id] = p; });
    function opt(p) {
      var t = p.form_label || p.title;
      if (p.section === 'sets' && (p.price_from === '' || p.price_from == null)) t += ' — скоро';
      return '<option value="' + esc(t) + '" data-id="' + esc(p.item_id) + '">' + esc(t) + '</option>';
    }
    function grp(label, items) { return items.length ? '<optgroup label="' + esc(label) + '">' + items.map(opt).join('') + '</optgroup>' : ''; }
    var html = '<option value="">Ще не вирішили — допоможемо обрати</option>', used = {};
    (window.FM_SETGROUPS || []).forEach(function (g) {
      var items = (g.ids || []).map(function (id) { return by[id]; }).filter(function (p) { return p && p.section === 'sets' && !used[p.item_id]; });
      items.forEach(function (p) { used[p.item_id] = 1; });
      html += grp('Набори · ' + g.label, items);
    });
    html += grp('Набори', list.filter(function (p) { return p.section === 'sets' && !used[p.item_id]; }));
    var groups = { '3d': '3D-друк', badges: 'Значки', packaging: 'Пакування' };
    Object.keys(groups).forEach(function (g) { html += grp(groups[g], list.filter(function (p) { return p.section === g; })); });
    html += '<option value="Інше / індивідуальне">Інше / індивідуальне</option>';
    sel.innerHTML = html;
    if (keep) for (var i = 0; i < sel.options.length; i++) if ((sel.options[i].dataset.id || sel.options[i].value) === keep) { sel.selectedIndex = i; break; }
  }
  window.fmFillProducts = fillProducts;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Відкрити форму з вибраним товаром / приводом (викликають кнопки «Замовити»)
  window.fmOpenOrder = function (opts) {
    opts = opts || {};
    if (!sel.options.length) fillProducts();
    if (opts.productId) {
      for (var i = 0; i < sel.options.length; i++) if (sel.options[i].dataset.id === opts.productId) { sel.selectedIndex = i; break; }
    } else if (opts.other) sel.value = 'Інше / індивідуальне';
    if (opts.occasion) form.elements.occasion.value = opts.occasion;
    form.elements.campaign_id.value = opts.campaignId || window.FM_CAMPAIGN || '';
    var sec = document.getElementById('zamovyty');
    sec.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    setTimeout(function () { form.elements.name.focus({ preventScroll: true }); }, 500);
    fmEvent('order_click', { fm_section: opts.place || 'other', fm_product: opts.productId || '' });
  };

  form.addEventListener('focusin', function () {
    if (!opened) opened = Date.now();
    if (!started) { started = true; fmEvent('form_start', {}); }
  });

  // Оплата: показ за налаштуванням таблиці (form_payment_show)
  if (window.FM_PAYMENT_SHOW === false) { var pf = document.getElementById('payField'); if (pf) pf.hidden = true; }

  function setErr(name, on) {
    var el = form.elements[name]; if (!el) return;
    var box = el.closest('.fld') || el.parentNode;
    box.classList.toggle('bad', on);
    el.setAttribute('aria-invalid', on ? 'true' : 'false');
  }
  // Номер: 0XXXXXXXXX, +380…, 80… або 9 цифр → +380 XX XXX XX XX; іноземний — з «+», 8–15 цифр
  function normPhone(raw) {
    var s = String(raw || '').trim(), d = s.replace(/\D/g, '');
    if (/^\+/.test(s) && d.indexOf('380') !== 0) return (d.length >= 8 && d.length <= 15) ? '+' + d : '';
    if (d.length === 12 && d.indexOf('380') === 0) d = d.slice(3);
    else if (d.length === 11 && d.indexOf('80') === 0) d = d.slice(2);
    else if (d.length === 10 && d.charAt(0) === '0') d = d.slice(1);
    else if (d.length !== 9) return '';
    if (d.charAt(0) === '0') return '';
    return '+380 ' + d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5, 7) + ' ' + d.slice(7);
  }
  // Підказка одразу після введення номера (поле втратило фокус), а не лише при надсиланні
  form.elements.phone.addEventListener('blur', function () {
    var el = this; if (!el.value.trim()) return;
    var ph = normPhone(el.value);
    if (ph) el.value = ph;
    setErr('phone', !ph);
  });
  form.elements.phone.addEventListener('input', function () {
    var box = this.closest('.fld'); if (box && box.classList.contains('bad') && normPhone(this.value)) setErr('phone', false);
  });
  function validate() {
    var bad = [];
    var f = form.elements;
    if (!f.name.value.trim()) bad.push('name');
    var ph = normPhone(f.phone.value);
    if (ph) f.phone.value = ph; else bad.push('phone');
    if (f.email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) bad.push('email');
    if (!f.consent_terms.checked) bad.push('consent_terms');
    ['name', 'phone', 'email', 'consent_terms'].forEach(function (n) { setErr(n, bad.indexOf(n) >= 0); });
    return bad;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    var bad = validate(), msg = document.getElementById('formMsg');
    if (bad.length) {
      msg.textContent = 'Перевірте позначені поля.';
      form.elements[bad[0]].focus();
      return;
    }
    if (!CFG.ordersUrl) {
      msg.innerHTML = 'Форма запрацює найближчим часом. Поки що напишіть нам в <a href="' + (CFG.instagram || '#') + '" target="_blank" rel="noopener">Instagram</a> або на <a href="mailto:' + CFG.email + '">' + CFG.email + '</a>.';
      return;
    }
    var f = form.elements, opt = sel.options[sel.selectedIndex];
    var data = {
      name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(),
      messenger: f.messenger.value, product: sel.value, product_id: opt && opt.dataset.id || '',
      campaign_id: f.campaign_id.value, occasion: f.occasion.value.trim(), whom: f.whom.value,
      desired_date: f.desired_date.value, payment: f.payment ? f.payment.value : '', comment: f.comment.value.trim(),
      consent_terms: f.consent_terms.checked, consent_reminders: f.consent_reminders.checked,
      website: f.website.value, fill_ms: opened ? Date.now() - opened : 0,
      page: location.pathname + location.hash, request_id: f.request_id.value
    };
    var src = sourceFields(); for (var k in src) data[k] = src[k];
    sending = true;
    var btn = form.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Надсилаємо…';
    msg.textContent = '';
    fetch(CFG.ordersUrl, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'text/plain;charset=utf-8' } })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.ok) {
          fmEvent('generate_lead', { fm_product: data.product_id, fm_campaign: data.campaign_id });
          showDone(data.name, res.order_id);
          form.reset(); f.request_id.value = rid(); opened = 0; started = false;
        } else if (res && res.error === 'invalid') {
          (res.fields || []).forEach(function (n) { setErr(n, true); });
          msg.textContent = 'Перевірте позначені поля.';
        } else throw new Error(res && res.error);
      })
      .catch(function () {
        msg.innerHTML = 'Не вдалося надіслати. Спробуйте ще раз або напишіть нам в <a href="' + (CFG.instagram || '#') + '" target="_blank" rel="noopener">Instagram</a>.';
      })
      .then(function () { sending = false; btn.disabled = false; btn.textContent = 'Надіслати заявку'; });
  });

  function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  form.elements.request_id.value = rid();

  /* ---------- «Момент прийнято» ---------- */
  var dlg = document.getElementById('done');
  function showDone(name, id) {
    document.getElementById('doneName').textContent = name;
    document.getElementById('doneId').textContent = id;
    dlg.hidden = false;
    document.body.style.overflow = 'hidden';
    dlg.querySelector('button').focus();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) confetti(dlg.querySelector('.done-card'));
  }
  function closeDone() { dlg.hidden = true; document.body.style.overflow = ''; }
  dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.hasAttribute('data-close')) closeDone(); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !dlg.hidden) closeDone(); });
  function confetti(box) {
    var c = ['#FFC233', '#D81B5C', '#3DDBB0', '#6C3BFF', '#ff8a00'];
    for (var i = 0; i < 24; i++) {
      var d = document.createElement('i'); d.className = 'cf';
      d.style.cssText = 'left:' + (10 + Math.random() * 80) + '%;background:' + c[i % 5] + ';--dx:' + ((Math.random() - .5) * 120) + 'px;animation-delay:' + (Math.random() * .3) + 's';
      box.appendChild(d); setTimeout(function (x) { return function () { x.remove(); }; }(d), 2300);
    }
  }

  fillProducts();
})();
