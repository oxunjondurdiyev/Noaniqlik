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
      flow_tpl_locked: "Formula shablondan olingan va qulflangan: shablon — tekshirilgan metodika. Qo'shimcha ta'sir qiluvchi omil (harorat, asbob sertifikati, ajratish qobiliyati) B tur manbasi sifatida qo'shiladi. Formulaga yangi kattalik kerak bo'lsa — shablondan ajrating.",
      flow_tpl_detach: "Shablondan ajratib tahrirlash",
      flow_tpl_detach_confirm: "Hisob shablondan ajratiladi: kuzatuvlar, B tur manbalari va korrelyatsiya saqlanadi, natija o'zgarmaydi. Shundan keyin formula erkin tahrirlanadi, lekin hisobot shablonga tayanmaydi va \"manba bilan mos\" belgisi ko'rsatilmaydi. Davom etasizmi?",
      flow_tpl_detached: "Hisob shablondan ajratildi — formulani tahrirlash mumkin.",
      flow_row_ph: "Keyingi o'lchash yoki Ctrl+V",
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
      flow_tpl_locked: "Формула взята из шаблона и заблокирована: шаблон — проверенная методика. Дополнительный влияющий фактор (температура, сертификат прибора, разрешение) добавляется как источник типа B. Если в формулу нужна новая величина — отсоедините расчёт от шаблона.",
      flow_tpl_detach: "Отсоединить от шаблона и редактировать",
      flow_tpl_detach_confirm: "Расчёт будет отсоединён от шаблона: наблюдения, источники типа B и корреляция сохранятся, результат не изменится. После этого формулу можно свободно редактировать, но отчёт не будет опираться на шаблон и отметка «соответствует источнику» не показывается. Продолжить?",
      flow_tpl_detached: "Расчёт отсоединён от шаблона — формулу можно редактировать.",
      flow_row_ph: "Следующее измерение или Ctrl+V",
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
      flow_tpl_locked: "The formula comes from the template and is locked: the template is a verified method. An additional influence factor (temperature, instrument certificate, resolution) is added as a Type B source. If the formula needs a new quantity, detach the calculation from the template.",
      flow_tpl_detach: "Detach from template and edit",
      flow_tpl_detach_confirm: "The calculation will be detached from the template: observations, Type B sources and correlation are kept and the result does not change. The formula then becomes freely editable, but the report no longer relies on the template and the \"matches source\" mark is not shown. Continue?",
      flow_tpl_detached: "Calculation detached from the template — the formula can now be edited.",
      flow_row_ph: "Next reading or Ctrl+V",
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
