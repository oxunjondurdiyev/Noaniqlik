/* ═══════════════════════════════════════════════════════════════
   I18N-VIZLAB.JS — P16: Vizual laboratoriya (vz_*). TRANSLATIONS ga qo'shiladi.
   Har bir kalit uch tilda (tests/i18n.test.js).
═══════════════════════════════════════════════════════════════ */

(function () {
  const EXT = {
    uz: {
      vz_title: "Vizual laboratoriya",
    },
    ru: {
      vz_title: "Визуальная лаборатория",
    },
    en: {
      vz_title: "Visual lab",
    },
  };
  Object.keys(EXT).forEach(lang => {
    if (TRANSLATIONS[lang]) Object.assign(TRANSLATIONS[lang], EXT[lang]);
  });
})();
