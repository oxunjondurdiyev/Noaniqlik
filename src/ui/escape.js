/* ═══════════════════════════════════════════════════════════════
   ESCAPE.JS — yagona HTML escape funksiyasi (P02, RISKS R-S5)
   ─────────────────────────────────────────────────────────────
   Foydalanuvchi ma'lumoti innerHTML'ga faqat shu funksiya orqali
   qo'yiladi. Escape qilinadigan belgilar: & < > " '
   (' — atribut qiymati bir tirnoqda bo'lsa ham xavfsiz bo'lishi uchun).

   Eslatma: HTML-escape JS-satr kontekstida (onclick="f('…')") yetarli
   emas — shuning uchun loyihada inline on*-handler ishlatilmaydi,
   qiymatlar data-* atributlarida uzatiladi va addEventListener bilan
   o'qiladi.

   Klassik <script> (window.UCEscape) va Node (module.exports) da ishlaydi.
═══════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const RE  = /[&<>"']/g;

  /** Matnni HTML matn yoki atribut qiymati sifatida xavfsiz qiladi.
   *  null/undefined → '' */
  function escHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(RE, ch => MAP[ch]);
  }

  const api = Object.freeze({ escHtml, escAttr: escHtml });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.UCEscape = api;
})(typeof window !== 'undefined' ? window : null);
