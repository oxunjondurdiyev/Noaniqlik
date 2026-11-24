/* ═══════════════════════════════════════════════════════════════
   I18N-FLOW.JS — P22-1 (audit 21.11.2026: UX-01, UX-02, UX-04): yagona "Yangi hisob" oqimi matnlari
   (Model → Ma'lumotlar → B tur → Natija → Hisobot). TRANSLATIONS ga qo'shiladi; har bir kalit uch tilda
   (tests/i18n.test.js). Matnlar HTML ga escHtml / textContent orqali qo'yiladi.
═══════════════════════════════════════════════════════════════ */

(function () {
  const EXT = {
    uz: {
      sh_st_data: "Ma'lumotlar",
      flow_model_title: "O'lchash modeli",
      flow_model_sub: "Formulani kiriting — parametrlar undan avtomatik olinadi. To'g'ridan-to'g'ri o'lchashda bo'sh qoldiring (y = x).",
      flow_data_sub: "Kuzatilgan qiymatlarni kiriting yoki Excel / CSV dan qo'ying. Qatorlar o'zi qo'shiladi; A tur noaniqligi avtomatik hisoblanadi.",
      flow_next_data: "Keyingi: Ma'lumotlar →",
      flow_next_typeb: "Keyingi: B tur →",
      flow_next_results: "Hisoblash: Natija →",
      flow_next_report: "Keyingi: Hisobot →",
      flow_new_params: "yangi parametr",
      flow_unused: "«{p}» formulada qatnashmaydi, lekin unda kiritilgan ma'lumot bor.",
      flow_unused_move: "Ma'lumotni «{p}» ga ko'chirish",
      flow_unused_drop: "Olib tashlash",
      flow_unused_confirm: "«{p}» parametri kuzatuvlari va B tur manbalari bilan birga o'chirilsinmi?",
      flow_examples: "Namunalar",
      tpl_example_badge: "Namuna",
      tpl_example_hint: "O'quv namunasi: model va namunaviy qiymatlar bilan ochiladi. Rasmiy hisob uchun o'z ma'lumotlaringizni kiriting.",
    },
    ru: {
      sh_st_data: "Данные",
      flow_model_title: "Модель измерения",
      flow_model_sub: "Введите формулу — параметры берутся из неё автоматически. Для прямого измерения оставьте поле пустым (y = x).",
      flow_data_sub: "Введите наблюдённые значения или вставьте их из Excel / CSV. Строки добавляются сами; неопределённость типа A рассчитывается автоматически.",
      flow_next_data: "Далее: Данные →",
      flow_next_typeb: "Далее: Тип B →",
      flow_next_results: "Рассчитать: Результат →",
      flow_next_report: "Далее: Отчёт →",
      flow_new_params: "новый параметр",
      flow_unused: "«{p}» не входит в формулу, но для него введены данные.",
      flow_unused_move: "Перенести данные в «{p}»",
      flow_unused_drop: "Удалить",
      flow_unused_confirm: "Удалить параметр «{p}» вместе с наблюдениями и источниками типа B?",
      flow_examples: "Примеры",
      tpl_example_badge: "Пример",
      tpl_example_hint: "Учебный пример: открывается с моделью и примерными значениями. Для официального расчёта введите свои данные.",
    },
    en: {
      sh_st_data: "Data",
      flow_model_title: "Measurement model",
      flow_model_sub: "Enter the formula — the parameters are taken from it automatically. For a direct measurement leave it empty (y = x).",
      flow_data_sub: "Enter the observed values or paste them from Excel / CSV. Rows are added as you go; Type A uncertainty is evaluated automatically.",
      flow_next_data: "Next: Data →",
      flow_next_typeb: "Next: Type B →",
      flow_next_results: "Calculate: Result →",
      flow_next_report: "Next: Report →",
      flow_new_params: "new parameter",
      flow_unused: "«{p}» is not used in the formula, but it has data entered.",
      flow_unused_move: "Move the data to «{p}»",
      flow_unused_drop: "Remove",
      flow_unused_confirm: "Remove parameter «{p}» together with its observations and Type B sources?",
      flow_examples: "Examples",
      tpl_example_badge: "Example",
      tpl_example_hint: "Training example: opens with a model and sample values. Enter your own data for an official calculation.",
    },
  };
  Object.keys(EXT).forEach(lang => {
    if (TRANSLATIONS[lang]) Object.assign(TRANSLATIONS[lang], EXT[lang]);
  });
})();
