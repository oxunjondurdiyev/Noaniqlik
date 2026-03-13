/* ═══════════════════════════════════════════════════════════════
   I18N.JS — Internationalization: Uzbek, Russian, English
═══════════════════════════════════════════════════════════════ */

const TRANSLATIONS = {
  en: {
    app_name:          'UncertaintyCalc',
    welcome_title:     'Measurement Uncertainty Calculator',
    welcome_subtitle:  'ISO/IEC 17025:2017 · GUM:2008 Compliant',
    label_n:           'Number of measurements (n)',
    label_p:           'Number of parameters (p)',
    label_preset:      'Load preset',
    opt_none:          '— None —',
    btn_start:         'Start Calculation →',
    btn_new:           'New Session',
    btn_report:        'Print Report',
    btn_apply:         'Apply',
    btn_add_param:     'Add Parameter',
    btn_sample:        'Fill Sample Data',
    btn_clear:         'Clear All',
    btn_calc_a:        'Calculate Type A Uncertainty →',
    btn_calc_combined: 'Calculate Combined Uncertainty →',
    btn_add_component: 'Add Component',

    sidebar_session:   'Session',
    sidebar_params:    'Parameters',
    sidebar_derived:   'Derived Quantities',
    sidebar_presets:   'Presets',
    derived_hint:      'Detected from parameters',

    tab_data:          'Data Entry',
    tab_typeb:         'Type B',
    tab_results:       'Results',

    data_title:        'Measurement Data',
    data_sub:          'Enter your observed values for each measurement',
    typeb_title:       'Type B Uncertainty',
    typeb_sub:         'Add uncertainty components from certificates, specifications, or experience',
    results_title:     'Uncertainty Budget',
    results_sub:       'Combined and expanded uncertainty per ISO/IEC 17025:2017',
    results_empty:     'Complete Type A and Type B calculations first',

    col_i:             '#',
    col_value:         'Value',
    col_dev:           'Deviation (xᵢ − x̄)',
    col_dev2:          'Deviation²',
    foot_mean:         'Mean (x̄)',
    foot_variance:     'Variance (s²)',
    foot_std:          'Std Dev (s)',
    foot_ua:           'u_A (std of mean)',

    label_component:   'Component name',
    label_half_width:  'Half-width (a)',
    label_distribution:'Distribution',
    label_divisor:     'Divisor (k)',
    label_std_unc:     'Standard uncertainty u_B',
    label_sensitivity: 'Sensitivity coefficient (cᵢ)',
    label_contribution:'Contribution (cᵢ · u_Bᵢ)',
    label_unit:        'Unit',

    dist_rect:         'Rectangular (uniform)',
    dist_normal:       'Normal (Gaussian)',
    dist_triang:       'Triangular',
    dist_ushape:       'U-shape (arcsine)',

    kpi_mean:          'Mean Value',
    kpi_ua:            'Type A u_A',
    kpi_ub:            'Type B u_B',
    kpi_uc:            'Combined u_c',
    kpi_u95:           'Expanded U (k=2)',
    kpi_u99:           'Expanded U (k=3)',

    budget_source:     'Source',
    budget_type:       'Type',
    budget_dist:       'Distribution',
    budget_ui:         'u_i',
    budget_ci:         'c_i',
    budget_ciui:       'c_i · u_i',
    budget_ciui2:      '(c_i · u_i)²',

    report_title:      'Measurement Uncertainty Report',
    report_standard:   'ISO/IEC 17025:2017 | GUM:2008',
    report_date:       'Date',
    report_operator:   'Operator',
    report_lab:        'Laboratory',
    section_typeA:     'Type A Uncertainty Analysis',
    section_typeB:     'Type B Uncertainty Budget',
    section_combined:  'Combined Uncertainty',
    section_expanded:  'Expanded Uncertainty',

    toast_calc_done:   'Calculation complete!',
    toast_need_data:   'Please enter measurement data first.',
    toast_need_typeb:  'Add at least one Type B component.',

    opt_load_preset:        '— Load Preset —',
    preset_group_mass_vol:  'Mass & Volume',
    preset_group_elec:      'Electrical',
    preset_group_dim:       'Dimensional',
    preset_mass:            'Mass measurement',
    preset_volume:          'Volume measurement',
    preset_density:         'Density (ρ = m/V)',
    preset_voltage:         'DC Voltage',
    preset_resistance:      'Resistance',
    preset_power:           'Electrical Power (P = U·I)',
    preset_length:          'Length',
    preset_area:            'Area (A = L×W)',
    preset_temperature:     'Temperature',
  },

  ru: {
    app_name:          'UncertaintyCalc',
    welcome_title:     'Калькулятор неопределённости измерений',
    welcome_subtitle:  'Соответствует ISO/IEC 17025:2017 · GUM:2008',
    label_n:           'Число измерений (n)',
    label_p:           'Число параметров (p)',
    label_preset:      'Загрузить пресет',
    opt_none:          '— Нет —',
    btn_start:         'Начать расчёт →',
    btn_new:           'Новая сессия',
    btn_report:        'Печать отчёта',
    btn_apply:         'Применить',
    btn_add_param:     'Добавить параметр',
    btn_sample:        'Заполнить образец',
    btn_clear:         'Очистить всё',
    btn_calc_a:        'Рассчитать неопред. типа A →',
    btn_calc_combined: 'Рассчитать суммарную неопред. →',
    btn_add_component: 'Добавить компонент',

    sidebar_session:   'Сессия',
    sidebar_params:    'Параметры',
    sidebar_derived:   'Производные величины',
    sidebar_presets:   'Пресеты',
    derived_hint:      'Обнаружены по параметрам',

    tab_data:          'Ввод данных',
    tab_typeb:         'Тип B',
    tab_results:       'Результаты',

    data_title:        'Данные измерений',
    data_sub:          'Введите наблюдённые значения для каждого измерения',
    typeb_title:       'Неопределённость типа B',
    typeb_sub:         'Добавьте компоненты из сертификатов, спецификаций или опыта',
    results_title:     'Бюджет неопределённости',
    results_sub:       'Суммарная и расширенная неопред. по ISO/IEC 17025:2017',
    results_empty:     'Сначала выполните расчёты типа A и типа B',

    col_i:             '№',
    col_value:         'Значение',
    col_dev:           'Отклонение (xᵢ − x̄)',
    col_dev2:          'Откл.²',
    foot_mean:         'Среднее (x̄)',
    foot_variance:     'Дисперсия (s²)',
    foot_std:          'СКО (s)',
    foot_ua:           'u_A (СКО среднего)',

    label_component:   'Название компонента',
    label_half_width:  'Полуширина (a)',
    label_distribution:'Распределение',
    label_divisor:     'Делитель (k)',
    label_std_unc:     'Стандартная неопред. u_B',
    label_sensitivity: 'Коэффициент чувствительности (cᵢ)',
    label_contribution:'Вклад (cᵢ · u_Bᵢ)',
    label_unit:        'Единица',

    dist_rect:         'Прямоугольное (равномерное)',
    dist_normal:       'Нормальное (Гауссово)',
    dist_triang:       'Треугольное',
    dist_ushape:       'U-образное (арксинусное)',

    kpi_mean:          'Среднее значение',
    kpi_ua:            'Тип A u_A',
    kpi_ub:            'Тип B u_B',
    kpi_uc:            'Суммарная u_c',
    kpi_u95:           'Расширенная U (k=2)',
    kpi_u99:           'Расширенная U (k=3)',

    budget_source:     'Источник',
    budget_type:       'Тип',
    budget_dist:       'Распределение',
    budget_ui:         'u_i',
    budget_ci:         'c_i',
    budget_ciui:       'c_i · u_i',
    budget_ciui2:      '(c_i · u_i)²',

    report_title:      'Отчёт о неопределённости измерений',
    report_standard:   'ISO/IEC 17025:2017 | GUM:2008',
    report_date:       'Дата',
    report_operator:   'Оператор',
    report_lab:        'Лаборатория',
    section_typeA:     'Анализ неопределённости типа A',
    section_typeB:     'Бюджет неопределённости типа B',
    section_combined:  'Суммарная неопределённость',
    section_expanded:  'Расширенная неопределённость',

    toast_calc_done:   'Расчёт завершён!',
    toast_need_data:   'Сначала введите данные измерений.',
    toast_need_typeb:  'Добавьте хотя бы один компонент типа B.',

    opt_load_preset:        '— Загрузить пресет —',
    preset_group_mass_vol:  'Масса и объём',
    preset_group_elec:      'Электрические',
    preset_group_dim:       'Геометрические',
    preset_mass:            'Измерение массы',
    preset_volume:          'Измерение объёма',
    preset_density:         'Плотность (ρ = m/V)',
    preset_voltage:         'Напряжение постоянного тока',
    preset_resistance:      'Сопротивление',
    preset_power:           'Электрическая мощность (P = U·I)',
    preset_length:          'Длина',
    preset_area:            'Площадь (A = L×W)',
    preset_temperature:     'Температура',
  },

  uz: {
    app_name:          'UncertaintyCalc',
    welcome_title:     'O\'lchov noaniqligini hisoblash',
    welcome_subtitle:  'ISO/IEC 17025:2017 · GUM:2008 ga mos',
    label_n:           'O\'lchashlar soni (n)',
    label_p:           'Parametrlar soni (p)',
    label_preset:      'Oldindan sozlamani yuklash',
    opt_none:          '— Yo\'q —',
    btn_start:         'Hisoblashni boshlash →',
    btn_new:           'Yangi sessiya',
    btn_report:        'Hisobot chop etish',
    btn_apply:         'Qo\'llash',
    btn_add_param:     'Parametr qo\'shish',
    btn_sample:        'Namuna ma\'lumotni to\'ldirish',
    btn_clear:         'Hammasini tozalash',
    btn_calc_a:        'A-tip noaniqlikni hisoblash →',
    btn_calc_combined: 'Umumiy noaniqlikni hisoblash →',
    btn_add_component: 'Komponent qo\'shish',

    sidebar_session:   'Sessiya',
    sidebar_params:    'Parametrlar',
    sidebar_derived:   'Hosil qilingan miqdorlar',
    sidebar_presets:   'Oldindan sozlamalar',
    derived_hint:      'Parametrlardan aniqlangan',

    tab_data:          'Ma\'lumot kiritish',
    tab_typeb:         'B-tip',
    tab_results:       'Natijalar',

    data_title:        'O\'lchash ma\'lumotlari',
    data_sub:          'Har bir o\'lchash uchun kuzatilgan qiymatlarni kiriting',
    typeb_title:       'B-tip noaniqlik',
    typeb_sub:         'Sertifikatlar, spetsifikatsiyalar yoki tajribadan komponentlar qo\'shing',
    results_title:     'Noaniqlik byudjeti',
    results_sub:       'ISO/IEC 17025:2017 bo\'yicha umumiy va kengaytirilgan noaniqlik',
    results_empty:     'Avval A-tip va B-tip hisob-kitoblarini bajaring',

    col_i:             '№',
    col_value:         'Qiymat',
    col_dev:           'Og\'ish (xᵢ − x̄)',
    col_dev2:          'Og\'ish²',
    foot_mean:         'O\'rtacha (x̄)',
    foot_variance:     'Dispersiya (s²)',
    foot_std:          'Standart og\'ish (s)',
    foot_ua:           'u_A (o\'rtachaning standart og\'ishi)',

    label_component:   'Komponent nomi',
    label_half_width:  'Yarim kenglik (a)',
    label_distribution:'Taqsimot',
    label_divisor:     'Bo\'luvchi (k)',
    label_std_unc:     'Standart noaniqlik u_B',
    label_sensitivity: 'Sezuvchanlik koeffitsiyenti (cᵢ)',
    label_contribution:'Hissa (cᵢ · u_Bᵢ)',
    label_unit:        'Birlik',

    dist_rect:         'To\'rtburchak (bir tekisda)',
    dist_normal:       'Normal (Gauss)',
    dist_triang:       'Uchburchak',
    dist_ushape:       'U-shaklli (arksinusli)',

    kpi_mean:          'O\'rtacha qiymat',
    kpi_ua:            'A-tip u_A',
    kpi_ub:            'B-tip u_B',
    kpi_uc:            'Umumiy u_c',
    kpi_u95:           'Kengaytirilgan U (k=2)',
    kpi_u99:           'Kengaytirilgan U (k=3)',

    budget_source:     'Manba',
    budget_type:       'Tur',
    budget_dist:       'Taqsimot',
    budget_ui:         'u_i',
    budget_ci:         'c_i',
    budget_ciui:       'c_i · u_i',
    budget_ciui2:      '(c_i · u_i)²',

    report_title:      'O\'lchov noaniqlik hisoboti',
    report_standard:   'ISO/IEC 17025:2017 | GUM:2008',
    report_date:       'Sana',
    report_operator:   'Operator',
    report_lab:        'Laboratoriya',
    section_typeA:     'A-tip noaniqlik tahlili',
    section_typeB:     'B-tip noaniqlik byudjeti',
    section_combined:  'Umumiy noaniqlik',
    section_expanded:  'Kengaytirilgan noaniqlik',

    toast_calc_done:   'Hisoblash yakunlandi!',
    toast_need_data:   'Avval o\'lchash ma\'lumotlarini kiriting.',
    toast_need_typeb:  'Kamida bitta B-tip komponent qo\'shing.',

    opt_load_preset:        '— Sozlamani yuklash —',
    preset_group_mass_vol:  'Massa va hajm',
    preset_group_elec:      'Elektr',
    preset_group_dim:       'Geometrik',
    preset_mass:            'Massani o\'lchash',
    preset_volume:          'Hajmni o\'lchash',
    preset_density:         'Zichlik (ρ = m/V)',
    preset_voltage:         'O\'zgarmas kuchlanish',
    preset_resistance:      'Qarshilik',
    preset_power:           'Elektr quvvat (P = U·I)',
    preset_length:          'Uzunlik',
    preset_area:            'Yuza (A = L×W)',
    preset_temperature:     'Harorat',
  }
};

class I18n {
  constructor() {
    this.lang = localStorage.getItem('uc_lang') || 'en';
  }

  t(key) {
    return (TRANSLATIONS[this.lang] && TRANSLATIONS[this.lang][key]) ||
           (TRANSLATIONS['en'][key]) || key;
  }

  setLang(lang) {
    if (!TRANSLATIONS[lang]) return;
    this.lang = lang;
    localStorage.setItem('uc_lang', lang);
    this.apply();
  }

  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });
    // optgroup label="..." attributes
    document.querySelectorAll('[data-i18n-label]').forEach(el => {
      el.label = this.t(el.getAttribute('data-i18n-label'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = this.t(el.getAttribute('data-i18n-placeholder'));
    });
    // Update active lang button
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === this.lang);
    });
    // Fire event so other modules can react
    document.dispatchEvent(new CustomEvent('langchange', { detail: this.lang }));
  }
}

window.i18n = new I18n();
