/* Juda eski brauzer (ES modules qo'llab-quvvatlanmaydi) uchun oddiy ogohlantirish.
   <script nomodule> orqali yuklanadi — zamonaviy brauzerlar bu faylni umuman yuklamaydi. */
(function () {
  var msg = "Brauzeringiz juda eski — UncertaintyCalc to'g'ri ishlamasligi mumkin. Iltimos, brauzerni yangilang. / " +
            "Ваш браузер устарел — обновите его. / Your browser is outdated — please update it.";
  var d = document.createElement('div');
  d.setAttribute('role', 'alert');
  d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;padding:12px;background:#b91c1c;color:#fff;font:14px sans-serif;text-align:center';
  d.appendChild(document.createTextNode(msg));
  function add() { document.body.appendChild(d); }
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();
