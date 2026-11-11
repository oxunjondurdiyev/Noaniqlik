/* Faqat <script nomodule> orqali — ES modules'ni qo'llamaydigan juda eski
   brauzerlarda ishlaydi (PLAN P02, egasining 9-javobi). ES5 sintaksisi. */
(function () {
  var lang = 'uz';
  try { lang = window.localStorage.getItem('uc_lang') || 'uz'; } catch (e) {}
  var msg = {
    uz: "Brauzeringiz juda eski va bu sayt unda ishlamaydi. Iltimos, brauzerni yangilang.",
    ru: "Ваш браузер устарел, сайт в нём не работает. Пожалуйста, обновите браузер.",
    en: "Your browser is too old to run this site. Please update your browser."
  };
  var div = document.createElement('div');
  div.setAttribute('role', 'alert');
  div.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;padding:12px;background:#b91c1c;color:#fff;font:14px sans-serif;text-align:center';
  div.appendChild(document.createTextNode(msg[lang] || msg.uz));
  function add() { document.body.insertBefore(div, document.body.firstChild); }
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();
