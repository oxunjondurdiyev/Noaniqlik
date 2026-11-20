/* THEME-BOOT.JS — P16: saqlangan mavzuni (`uc_theme`: 'dark' | 'light') sahifa ochilganda qo'llash.
   Faqat O'QIYDI; boshqa hech narsa qilmaydi. AI kodidan ALOHIDA (src/ui/ai/ da doimiy xotiraga murojaat taqiqlangan —
   tests/ai/key.test.js); ai.html kabi o'z mavzu tugmasi yo'q sahifalar uchun. */
(function () {
  'use strict';
  var theme = 'dark';
  try { if (window.localStorage.getItem('uc_theme') === 'light') theme = 'light'; } catch (e) { /* standart — qorong'i */ }
  document.documentElement.setAttribute('data-theme', theme);
})();
