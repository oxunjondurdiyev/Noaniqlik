/* ═══════════════════════════════════════════════════════════════
   I18N-BUILD.JS — P13: yangi versiya banneri (bld_*) va "Validatsiya" sahifasi (val_*).
   TRANSLATIONS ga qo'shiladi. Har bir kalit uch tilda (tests/i18n.test.js). Matnlar DOM ga textContent / data-i18n orqali.
═══════════════════════════════════════════════════════════════ */

(function () {
  const EXT = {
    uz: {
      bld_new_version: "Yangi versiya chiqdi — sahifani yangilang. Kiritilgan ma'lumot yo'qolmasligi uchun sahifa avtomatik yangilanmaydi: avval hisobni saqlang yoki eksport qiling.",
      bld_dismiss: "Yopish",
    },
    ru: {
      bld_new_version: "Вышла новая версия — обновите страницу. Чтобы введённые данные не потерялись, страница не обновляется автоматически: сначала сохраните или экспортируйте расчёт.",
      bld_dismiss: "Закрыть",
    },
    en: {
      bld_new_version: "A new version is available — reload the page. The page does not reload automatically so that entered data are not lost: save or export the calculation first.",
      bld_dismiss: "Dismiss",
    },
  };
  Object.keys(EXT).forEach(lang => {
    if (TRANSLATIONS[lang]) Object.assign(TRANSLATIONS[lang], EXT[lang]);
  });
})();
