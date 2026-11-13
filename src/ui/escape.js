/* ═══════════════════════════════════════════════════════════════
   ESCAPE.JS — yagona HTML escape funksiyasi (P02, RISKS R-S5)
   ─────────────────────────────────────────────────────────────
   innerHTML'ga qo'yiladigan HAR QANDAY foydalanuvchi / bazadan
   kelgan qiymat shu funksiyadan o'tadi. Matn tugunlari uchun esa
   innerHTML emas, textContent ishlatiladi.

   & < > " ' — beshala belgi almashtiriladi, shuning uchun natija
   matn tugunida ham, "..." va '...' atribut qiymatlarida ham xavfsiz.
   JS-satr kontekstida (inline hodisa atributi ichida) ishlatilmaydi — inline
   handler'lar o'rniga addEventListener + data-* atributlari.

   Brauzer: window.escHtml.  Node (testlar): module.exports.escHtml.
═══════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, ch => MAP[ch]);
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { escHtml };
  if (root) root.escHtml = escHtml;
})(typeof window !== 'undefined' ? window : null);
