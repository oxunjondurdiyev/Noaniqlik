/* ═══════════════════════════════════════════════════════════════
   I18N-ACCESS.JS — kirish rejimi (src/js/access-mode.js) matnlari: ochiq test rejimi belgisi.
   TRANSLATIONS ga qo'shiladi; har bir kalit uch tilda (tests/i18n.test.js). Matn HTML ga textContent orqali.
   Litsenziya yopiq — "bepul" / "ochiq kod" yozilmaydi (tests/ui/p20-pages.test.js, tests/ui/access.test.js).
═══════════════════════════════════════════════════════════════ */

(function () {
  const EXT = {
    uz: {
      acc_test_note: "Test rejimi: ro'yxatdan o'tish talab qilinmaydi. Hisoblar faqat shu brauzerda saqlanadi.",
      acc_test_feedback: "Taklif va xatolar haqida yozing (Telegram)",
    },
    ru: {
      acc_test_note: "Тестовый режим: регистрация не требуется. Расчёты хранятся только в этом браузере.",
      acc_test_feedback: "Отправить отзыв или сообщить об ошибке (Telegram)",
    },
    en: {
      acc_test_note: "Test mode: no registration is required. Calculations are stored only in this browser.",
      acc_test_feedback: "Send feedback or report a bug (Telegram)",
    },
  };
  Object.keys(EXT).forEach(lang => {
    if (TRANSLATIONS[lang]) Object.assign(TRANSLATIONS[lang], EXT[lang]);
  });
})();
