/* ═══════════════════════════════════════════════════════════════
   LANG-SWITCH.JS — admin.html / superadmin.html uchun til almashtirgich (P05, RISKS R-13)
   index.html da bu ishni src/js/app.js bajaradi; bu fayl faqat app.js yuklanmaydigan sahifalar uchun.
   • .lang-btn[data-lang] bosilganda i18n.setLang(); sahifa ochilganda i18n.apply()
     (data-i18n*, <html lang>, faol tugma). Til localStorage `uc_lang` da (i18n.js).
   • Dinamik kontent `langchange` hodisasida sahifa skripti tomonidan qayta chiziladi.
   CSP `script-src 'self'` — inline skript va onclick yo'q.
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (!window.i18n) return;
  document.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('.lang-btn');
    if (btn && btn.dataset.lang) window.i18n.setLang(btn.dataset.lang);
  });
  const init = () => window.i18n.apply();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
