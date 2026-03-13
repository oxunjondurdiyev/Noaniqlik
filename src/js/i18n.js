/* ═══════════════════════════════════════════════════════════════
   I18N.JS — Internationalization: Uzbek, Russian, English
═══════════════════════════════════════════════════════════════ */

const TRANSLATIONS = {

  /* ═══════════════  ENGLISH  ═══════════════════════════════ */
  en: {
    /* App shell */
    app_name:          'UncertaintyCalc',

    /* Home page — hero */
    home_hero_title:   'Professional Measurement Uncertainty Calculator',
    home_hero_sub:     'Fully compliant with ISO/IEC\u00a017025:2017 and GUM:2008 — the global gold standards for calibration laboratories.',
    home_hero_cta:     'Open Calculator',
    home_hero_github:  'View on GitHub',
    home_formula_label:'Core formula (GUM\u00a05.1):',

    /* Home page — features */
    home_feat_heading: 'Everything a Metrologist Needs',
    home_f1_title:     'Type A Analysis',
    home_f1_desc:      'Automatic statistical evaluation: mean, standard deviation, and standard uncertainty of the mean (u_A\u00a0=\u00a0s/√n).',
    home_f2_title:     'Type B Distributions',
    home_f2_desc:      'Four distributions from GUM\u00a04.3: rectangular\u00a0(√3), normal\u00a0(k=2), triangular\u00a0(√6), U-shape\u00a0(√2).',
    home_f3_title:     'Combined Uncertainty',
    home_f3_desc:      'Law of propagation with sensitivity coefficients. Welch-Satterthwaite effective degrees of freedom.',
    home_f4_title:     'ISO/IEC\u00a017025 Report',
    home_f4_desc:      'Printable uncertainty budget table in professional format — ready to attach to calibration certificates.',
    home_f5_title:     'Three Languages',
    home_f5_desc:      'Full interface in Uzbek, Russian and English. Language preference saved automatically.',
    home_f6_title:     '9 Lab Presets',
    home_f6_desc:      'Mass, volume, density, voltage, resistance, power, length, area and temperature — with realistic typical uncertainty budgets.',

    /* Home page — how it works */
    home_how_heading:  'Three Steps to Your Result',
    home_s1_title:     '1 — Enter Data',
    home_s1_desc:      'Set the number of measurements and parameters. Load a preset or start from scratch.',
    home_s2_title:     '2 — Analyse',
    home_s2_desc:      'The calculator evaluates Type A statistics and guides you through each Type B uncertainty source.',
    home_s3_title:     '3 — Print Report',
    home_s3_desc:      'Get a complete ISO/IEC\u00a017025-formatted uncertainty budget — ready to sign and archive.',

    /* Home page — standards */
    home_std_heading:  'Built on Authoritative Standards',
    home_std_gum:      'Guide to the Expression of Uncertainty in Measurement',
    home_std_iso:      'General Requirements for Testing and Calibration Laboratories',
    home_std_eu:       'Quantifying Uncertainty in Analytical Measurement',

    /* Home page — about */
    home_about_heading:'About the Developer',
    home_about_name:   'Oxunjon Durdiyev',
    home_about_role:   'Metrologist & Software Developer · Uzbekistan',
    home_about_desc:   'This tool was created to make rigorous measurement uncertainty analysis accessible to every laboratory — from research institutes to small calibration workshops. Built with a deep respect for the GUM methodology and the practitioners who use it every day.',
    home_about_open:   'Open source · Free to use · MIT License',

    /* Home page — collaboration */
    home_collab_heading:'Open for Collaboration',
    home_collab_desc:  'Are you a metrologist, laboratory manager, or developer? Contributions, feature requests and feedback are warmly welcome. Let\'s make uncertainty analysis easier for everyone.',
    home_collab_btn:   'Contribute on GitHub',
    home_collab_contact:'or reach out directly',

    /* Home page — stats strip */
    home_stat_formulas:'GUM Formulas',
    home_stat_presets: 'Lab Presets',
    home_stat_langs:   'Languages',
    home_stat_dist:    'Distributions',

    /* Home page — footer */
    home_footer_by:    'Developed by Oxunjon Durdiyev',
    home_footer_std:   'ISO/IEC\u00a017025:2017 · GUM:2008',
    home_footer_open:  'Open Source',

    /* Welcome screen */
    welcome_title:     'Set Up Your Calculation',
    welcome_subtitle:  'ISO/IEC\u00a017025:2017 · GUM:2008 Compliant',
    label_n:           'Number of measurements (n)',
    label_p:           'Number of parameters (p)',
    label_preset:      'Load a preset',
    opt_none:          '— None —',
    btn_start:         'Start Calculation \u2192',
    btn_back_home:     '\u2190 Back',

    /* Main app */
    btn_new:           'New Session',
    btn_report:        'Print Report',
    btn_apply:         'Apply',
    btn_add_param:     'Add Parameter',
    btn_sample:        'Fill Sample Data',
    btn_clear:         'Clear All',
    btn_calc_a:        'Calculate Type A Uncertainty \u2192',
    btn_calc_combined: 'Calculate Combined Uncertainty \u2192',
    btn_add_component: 'Add Component',

    sidebar_session:   'Session',
    sidebar_params:    'Parameters',
    sidebar_derived:   'Derived Quantities',
    sidebar_presets:   'Presets',
    derived_hint:      'Auto-detected from parameters',

    tab_data:          'Data Entry',
    tab_typeb:         'Type B',
    tab_results:       'Results',

    data_title:        'Measurement Data',
    data_sub:          'Enter observed values for each measurement',
    typeb_title:       'Type B Uncertainty',
    typeb_sub:         'Add components from certificates, specifications or experience',
    results_title:     'Uncertainty Budget',
    results_sub:       'Combined and expanded uncertainty per ISO/IEC\u00a017025:2017',
    results_empty:     'Complete Type A and Type B calculations first',

    col_i:             '#',
    col_value:         'Value',
    col_dev:           'Deviation (x\u1d62 \u2212 x\u0305)',
    col_dev2:          'Deviation\u00b2',
    foot_mean:         'Mean (x\u0305)',
    foot_variance:     'Variance (s\u00b2)',
    foot_std:          'Std Dev (s)',
    foot_ua:           'u\u2090 (std of mean)',

    label_component:   'Component name',
    label_half_width:  'Half-width (a)',
    label_distribution:'Distribution',
    label_divisor:     'Divisor',
    label_std_unc:     'Standard uncertainty u_B',
    label_sensitivity: 'Sensitivity coefficient (c\u1d62)',
    label_contribution:'Contribution (c\u1d62\u00b7u_B\u1d62)',
    label_unit:        'Unit',

    dist_rect:         'Rectangular (uniform)',
    dist_normal:       'Normal (Gaussian)',
    dist_triang:       'Triangular',
    dist_ushape:       'U-shape (arcsine)',

    kpi_mean:          'Mean Value',
    kpi_ua:            'Type A  u\u2090',
    kpi_ub:            'Type B  u_B',
    kpi_uc:            'Combined  u\u1d04',
    kpi_u95:           'Expanded U (k=2)',
    kpi_u99:           'Expanded U (k=3)',

    budget_source:     'Source',
    budget_type:       'Type',
    budget_dist:       'Distribution',
    budget_ui:         'u\u1d62',
    budget_ci:         'c\u1d62',
    budget_ciui:       'c\u1d62\u00b7u\u1d62',
    budget_ciui2:      '(c\u1d62\u00b7u\u1d62)\u00b2',

    report_title:      'Measurement Uncertainty Report',
    report_standard:   'ISO/IEC\u00a017025:2017 | GUM:2008',
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

    /* Preset select options */
    opt_load_preset:        '\u2014 Load Preset \u2014',
    preset_group_mass_vol:  'Mass & Volume',
    preset_group_elec:      'Electrical',
    preset_group_dim:       'Dimensional',
    preset_mass:            'Mass measurement',
    preset_volume:          'Volume measurement',
    preset_density:         'Density  \u03c1 = m/V',
    preset_voltage:         'DC Voltage',
    preset_resistance:      'Resistance',
    preset_power:           'Electrical Power  P = U\u00b7I',
    preset_length:          'Length',
    preset_area:            'Area  A = L\u00d7W',
    preset_temperature:     'Temperature',
  },

  /* ═══════════════  RUSSIAN  ═══════════════════════════════ */
  ru: {
    app_name:          'UncertaintyCalc',

    home_hero_title:   'Профессиональный калькулятор неопределённости измерений',
    home_hero_sub:     'Полностью соответствует ISO/IEC\u00a017025:2017 и GUM:2008 — международным стандартам для калибровочных лабораторий.',
    home_hero_cta:     'Открыть калькулятор',
    home_hero_github:  'GitHub',
    home_formula_label:'Основная формула (GUM\u00a05.1):',

    home_feat_heading: 'Всё необходимое метрологу',
    home_f1_title:     'Оценка типа A',
    home_f1_desc:      'Автоматический статистический анализ: среднее, СКО и стандартная неопределённость среднего (u_A\u00a0=\u00a0s/√n).',
    home_f2_title:     'Распределения типа B',
    home_f2_desc:      'Четыре распределения по GUM\u00a04.3: равномерное\u00a0(√3), нормальное\u00a0(k=2), треугольное\u00a0(√6), U-образное\u00a0(√2).',
    home_f3_title:     'Суммарная неопределённость',
    home_f3_desc:      'Закон распространения неопределённости с коэффициентами чувствительности. Формула Уэлча–Сэттертуэйта.',
    home_f4_title:     'Отчёт по ISO/IEC\u00a017025',
    home_f4_desc:      'Печатный бюджет неопределённости в профессиональном формате — готов к приложению к свидетельству о калибровке.',
    home_f5_title:     'Три языка',
    home_f5_desc:      'Полный интерфейс на узбекском, русском и английском языках. Выбор языка сохраняется автоматически.',
    home_f6_title:     '9 лабораторных пресетов',
    home_f6_desc:      'Масса, объём, плотность, напряжение, сопротивление, мощность, длина, площадь и температура.',

    home_how_heading:  'Три шага к результату',
    home_s1_title:     '1 — Ввод данных',
    home_s1_desc:      'Укажите число измерений и параметров. Загрузите пресет или начните с нуля.',
    home_s2_title:     '2 — Анализ',
    home_s2_desc:      'Калькулятор оценивает статистику типа A и проводит через каждый источник неопределённости типа B.',
    home_s3_title:     '3 — Печать отчёта',
    home_s3_desc:      'Получите полный бюджет неопределённости в формате ISO/IEC\u00a017025 — готовый к подписи и архивированию.',

    home_std_heading:  'Основан на авторитетных стандартах',
    home_std_gum:      'Руководство по выражению неопределённости измерений',
    home_std_iso:      'Общие требования к компетентности испытательных и калибровочных лабораторий',
    home_std_eu:       'Количественная оценка неопределённости в аналитических измерениях',

    home_about_heading:'О разработчике',
    home_about_name:   'Охунжон Дурдиев',
    home_about_role:   'Метролог и разработчик ПО · Узбекистан',
    home_about_desc:   'Этот инструмент создан для того, чтобы сделать строгий анализ неопределённости измерений доступным каждой лаборатории — от научно-исследовательских институтов до небольших калибровочных мастерских.',
    home_about_open:   'Открытый исходный код · Бесплатно · Лицензия MIT',

    home_collab_heading:'Открыт для сотрудничества',
    home_collab_desc:  'Вы метролог, руководитель лаборатории или разработчик? Вклад в проект, запросы функций и отзывы всегда приветствуются.',
    home_collab_btn:   'Внести вклад на GitHub',
    home_collab_contact:'или связаться напрямую',

    home_stat_formulas:'Формулы GUM',
    home_stat_presets: 'Пресетов',
    home_stat_langs:   'Языка',
    home_stat_dist:    'Распределения',

    home_footer_by:    'Разработано Охунжоном Дурдиевым',
    home_footer_std:   'ISO/IEC\u00a017025:2017 · GUM:2008',
    home_footer_open:  'Открытый исходный код',

    welcome_title:     'Настройка расчёта',
    welcome_subtitle:  'Соответствует ISO/IEC\u00a017025:2017 · GUM:2008',
    label_n:           'Число измерений (n)',
    label_p:           'Число параметров (p)',
    label_preset:      'Загрузить пресет',
    opt_none:          '\u2014 Нет \u2014',
    btn_start:         'Начать расчёт \u2192',
    btn_back_home:     '\u2190 Назад',

    btn_new:           'Новая сессия',
    btn_report:        'Печать отчёта',
    btn_apply:         'Применить',
    btn_add_param:     'Добавить параметр',
    btn_sample:        'Заполнить образец',
    btn_clear:         'Очистить всё',
    btn_calc_a:        'Рассчитать неопред. типа A \u2192',
    btn_calc_combined: 'Рассчитать суммарную неопред. \u2192',
    btn_add_component: 'Добавить компонент',

    sidebar_session:   'Сессия',
    sidebar_params:    'Параметры',
    sidebar_derived:   'Производные величины',
    sidebar_presets:   'Пресеты',
    derived_hint:      'Определяется автоматически',

    tab_data:          'Ввод данных',
    tab_typeb:         'Тип B',
    tab_results:       'Результаты',

    data_title:        'Данные измерений',
    data_sub:          'Введите наблюдённые значения для каждого измерения',
    typeb_title:       'Неопределённость типа B',
    typeb_sub:         'Добавьте компоненты из сертификатов, спецификаций или опыта',
    results_title:     'Бюджет неопределённости',
    results_sub:       'Суммарная и расширенная неопред. по ISO/IEC\u00a017025:2017',
    results_empty:     'Сначала выполните расчёты типа A и типа B',

    col_i:             '№',
    col_value:         'Значение',
    col_dev:           'Отклонение (x\u1d62 \u2212 x\u0305)',
    col_dev2:          'Откл.\u00b2',
    foot_mean:         'Среднее (x\u0305)',
    foot_variance:     'Дисперсия (s\u00b2)',
    foot_std:          'СКО (s)',
    foot_ua:           'u\u2090 (СКО среднего)',

    label_component:   'Название компонента',
    label_half_width:  'Полуширина (a)',
    label_distribution:'Распределение',
    label_divisor:     'Делитель',
    label_std_unc:     'Станд. неопред. u_B',
    label_sensitivity: 'Коэф. чувствительности (c\u1d62)',
    label_contribution:'Вклад (c\u1d62\u00b7u_B\u1d62)',
    label_unit:        'Единица',

    dist_rect:         'Прямоугольное (равномерное)',
    dist_normal:       'Нормальное (Гауссово)',
    dist_triang:       'Треугольное',
    dist_ushape:       'U-образное (арксинусное)',

    kpi_mean:          'Среднее значение',
    kpi_ua:            'Тип A  u\u2090',
    kpi_ub:            'Тип B  u_B',
    kpi_uc:            'Суммарная  u\u1d04',
    kpi_u95:           'Расширенная U (k=2)',
    kpi_u99:           'Расширенная U (k=3)',

    budget_source:     'Источник',
    budget_type:       'Тип',
    budget_dist:       'Распределение',
    budget_ui:         'u\u1d62',
    budget_ci:         'c\u1d62',
    budget_ciui:       'c\u1d62\u00b7u\u1d62',
    budget_ciui2:      '(c\u1d62\u00b7u\u1d62)\u00b2',

    report_title:      'Отчёт о неопределённости измерений',
    report_standard:   'ISO/IEC\u00a017025:2017 | GUM:2008',
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

    opt_load_preset:        '\u2014 Загрузить пресет \u2014',
    preset_group_mass_vol:  'Масса и объём',
    preset_group_elec:      'Электрические',
    preset_group_dim:       'Геометрические',
    preset_mass:            'Измерение массы',
    preset_volume:          'Измерение объёма',
    preset_density:         'Плотность  \u03c1 = m/V',
    preset_voltage:         'Напряжение постоянного тока',
    preset_resistance:      'Сопротивление',
    preset_power:           'Электрическая мощность  P = U\u00b7I',
    preset_length:          'Длина',
    preset_area:            'Площадь  A = L\u00d7W',
    preset_temperature:     'Температура',
  },

  /* ═══════════════  UZBEK  ══════════════════════════════════ */
  uz: {
    app_name:          'UncertaintyCalc',

    home_hero_title:   'Professional o\'lchov noaniqligini hisoblash',
    home_hero_sub:     'ISO/IEC\u00a017025:2017 va GUM:2008 ga to\'liq mos — butun dunyo kalibrlash laboratoriyalarining oltin standarti.',
    home_hero_cta:     'Kalkulyatorni ochish',
    home_hero_github:  'GitHub',
    home_formula_label:'Asosiy formula (GUM\u00a05.1):',

    home_feat_heading: 'Metrologga kerak bo\'lgan hamma narsa',
    home_f1_title:     'A-tip tahlil',
    home_f1_desc:      'Avtomatik statistik baholash: o\'rtacha, standart og\'ish va o\'rtachaning standart noaniqligini hisoblash (u_A\u00a0=\u00a0s/√n).',
    home_f2_title:     'B-tip taqsimotlar',
    home_f2_desc:      'GUM\u00a04.3 bo\'yicha to\'rtta taqsimot: to\'rtburchak\u00a0(√3), normal\u00a0(k=2), uchburchak\u00a0(√6), U-shakl\u00a0(√2).',
    home_f3_title:     'Umumiy noaniqlik',
    home_f3_desc:      'Sezuvchanlik koeffitsiyentlari bilan noaniqlikning tarqalish qonuni. Welch-Satterthwaite samarali erkinlik darajasi.',
    home_f4_title:     'ISO/IEC\u00a017025 Hisoboti',
    home_f4_desc:      'Professional formatdagi chop etiladigan noaniqlik byudjeti — kalibrlash sertifikatiga ilova qilishga tayyor.',
    home_f5_title:     'Uch til',
    home_f5_desc:      "To'liq interfeys o'zbek, rus va ingliz tillarida. Til tanlovi avtomatik saqlanadi.",
    home_f6_title:     '9 ta laboratoriya sozlamasi',
    home_f6_desc:      "Massa, hajm, zichlik, kuchlanish, qarshilik, quvvat, uzunlik, yuza va harorat — realistik noaniqlik byudjetlari bilan.",

    home_how_heading:  'Natijaga uch qadam',
    home_s1_title:     '1 — Ma\'lumot kiritish',
    home_s1_desc:      'O\'lchashlar va parametrlar sonini belgilang. Sozlamani yuklang yoki noldan boshlang.',
    home_s2_title:     '2 — Tahlil qilish',
    home_s2_desc:      'Kalkulyator A-tip statistikasini baholaydi va har bir B-tip noaniqlik manbaini ko\'rib chiqishda yordam beradi.',
    home_s3_title:     '3 — Hisobotni chop etish',
    home_s3_desc:      'ISO/IEC\u00a017025 formatida to\'liq noaniqlik byudjetini oling — imzolash va arxivlashga tayyor.',

    home_std_heading:  'Vakolatli standartlar asosida qurilgan',
    home_std_gum:      'O\'lchov noaniqligini ifodalash bo\'yicha qo\'llanma',
    home_std_iso:      'Sinov va kalibrlash laboratoriyalari kompetentligiga umumiy talablar',
    home_std_eu:       'Analitik o\'lchovlarda noaniqlikni miqdoriy baholash',

    home_about_heading:'Dasturchi haqida',
    home_about_name:   'Oxunjon Durdiyev',
    home_about_role:   'Metrologiya mutaxassisi va dasturchi · O\'zbekiston',
    home_about_desc:   'Bu vosita har bir laboratoriyada — ilmiy-tadqiqot institutlaridan tortib kichik kalibrlash ustaxonalarigacha — o\'lchov noaniqligini professional darajada tahlil qilishni ta\'minlash maqsadida yaratilgan.',
    home_about_open:   'Ochiq manba · Bepul · MIT litsenziyasi',

    home_collab_heading:'Hamkorlikka tayyor',
    home_collab_desc:  'Siz metrologmisiz, laboratoriya rahbarimisiz yoki dasturchimisiz? Loyihaga hissa qo\'shish, funksiya so\'rovlari va fikr-mulohazalar doimo xush kelibdi.',
    home_collab_btn:   'GitHub\'da ishtirok etish',
    home_collab_contact:'yoki to\'g\'ridan-to\'g\'ri bog\'lanish',

    home_stat_formulas:'GUM Formulalar',
    home_stat_presets: 'Sozlama',
    home_stat_langs:   'Til',
    home_stat_dist:    'Taqsimot',

    home_footer_by:    'Oxunjon Durdiyev tomonidan ishlab chiqilgan',
    home_footer_std:   'ISO/IEC\u00a017025:2017 · GUM:2008',
    home_footer_open:  'Ochiq manba',

    welcome_title:     'Hisoblashni sozlash',
    welcome_subtitle:  'ISO/IEC\u00a017025:2017 · GUM:2008 ga mos',
    label_n:           'O\'lchashlar soni (n)',
    label_p:           'Parametrlar soni (p)',
    label_preset:      'Sozlamani yuklash',
    opt_none:          '\u2014 Yo\'q \u2014',
    btn_start:         'Hisoblashni boshlash \u2192',
    btn_back_home:     '\u2190 Orqaga',

    btn_new:           'Yangi sessiya',
    btn_report:        'Hisobot chop etish',
    btn_apply:         'Qo\'llash',
    btn_add_param:     'Parametr qo\'shish',
    btn_sample:        'Namuna ma\'lumotlarni to\'ldirish',
    btn_clear:         'Hammasini tozalash',
    btn_calc_a:        'A-tip noaniqlikni hisoblash \u2192',
    btn_calc_combined: 'Umumiy noaniqlikni hisoblash \u2192',
    btn_add_component: 'Komponent qo\'shish',

    sidebar_session:   'Sessiya',
    sidebar_params:    'Parametrlar',
    sidebar_derived:   'Hosil bo\'lgan miqdorlar',
    sidebar_presets:   'Sozlamalar',
    derived_hint:      'Parametrlardan avtomatik aniqlanadi',

    tab_data:          'Ma\'lumot kiritish',
    tab_typeb:         'B-tip',
    tab_results:       'Natijalar',

    data_title:        'O\'lchash ma\'lumotlari',
    data_sub:          'Har bir o\'lchash uchun kuzatilgan qiymatlarni kiriting',
    typeb_title:       'B-tip noaniqlik',
    typeb_sub:         'Sertifikatlar, spetsifikatsiyalar yoki tajribadan komponentlar qo\'shing',
    results_title:     'Noaniqlik byudjeti',
    results_sub:       'ISO/IEC\u00a017025:2017 bo\'yicha umumiy va kengaytirilgan noaniqlik',
    results_empty:     'Avval A-tip va B-tip hisob-kitoblarini bajaring',

    col_i:             '\u2116',
    col_value:         'Qiymat',
    col_dev:           'Og\'ish (x\u1d62 \u2212 x\u0305)',
    col_dev2:          'Og\'ish\u00b2',
    foot_mean:         'O\'rtacha (x\u0305)',
    foot_variance:     'Dispersiya (s\u00b2)',
    foot_std:          'Standart og\'ish (s)',
    foot_ua:           'u\u2090 (o\'rtachaning standart og\'ishi)',

    label_component:   'Komponent nomi',
    label_half_width:  'Yarim kenglik (a)',
    label_distribution:'Taqsimot',
    label_divisor:     'Bo\'luvchi',
    label_std_unc:     'Standart noaniqlik u_B',
    label_sensitivity: 'Sezuvchanlik koeff. (c\u1d62)',
    label_contribution:'Hissa (c\u1d62\u00b7u_B\u1d62)',
    label_unit:        'O\'lchov birligi',

    dist_rect:         'To\'rtburchak (bir xil)',
    dist_normal:       'Normal (Gauss)',
    dist_triang:       'Uchburchak',
    dist_ushape:       'U-shaklli (arksinusli)',

    kpi_mean:          'O\'rtacha qiymat',
    kpi_ua:            'A-tip  u\u2090',
    kpi_ub:            'B-tip  u_B',
    kpi_uc:            'Umumiy  u\u1d04',
    kpi_u95:           'Kengaytirilgan U (k=2)',
    kpi_u99:           'Kengaytirilgan U (k=3)',

    budget_source:     'Manba',
    budget_type:       'Tur',
    budget_dist:       'Taqsimot',
    budget_ui:         'u\u1d62',
    budget_ci:         'c\u1d62',
    budget_ciui:       'c\u1d62\u00b7u\u1d62',
    budget_ciui2:      '(c\u1d62\u00b7u\u1d62)\u00b2',

    report_title:      'O\'lchov noaniqlik hisoboti',
    report_standard:   'ISO/IEC\u00a017025:2017 | GUM:2008',
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

    opt_load_preset:        '\u2014 Sozlamani yuklash \u2014',
    preset_group_mass_vol:  'Massa va hajm',
    preset_group_elec:      'Elektr',
    preset_group_dim:       'Geometrik',
    preset_mass:            'Massani o\'lchash',
    preset_volume:          'Hajmni o\'lchash',
    preset_density:         'Zichlik  \u03c1 = m/V',
    preset_voltage:         'O\'zgarmas kuchlanish',
    preset_resistance:      'Qarshilik',
    preset_power:           'Elektr quvvat  P = U\u00b7I',
    preset_length:          'Uzunlik',
    preset_area:            'Yuza  A = L\u00d7W',
    preset_temperature:     'Harorat',
  }
};

/* ─── I18n class ────────────────────────────────────── */
class I18n {
  constructor() {
    this.lang = localStorage.getItem('uc_lang') || 'en';
  }

  t(key) {
    const lang = TRANSLATIONS[this.lang];
    if (lang && lang[key] !== undefined) return lang[key];
    const en = TRANSLATIONS['en'];
    if (en && en[key] !== undefined) return en[key];
    return key;
  }

  setLang(lang) {
    if (!TRANSLATIONS[lang]) return;
    this.lang = lang;
    localStorage.setItem('uc_lang', lang);
    this.apply();
  }

  apply() {
    /* text content */
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.getAttribute('data-i18n'));
    });
    /* optgroup label="..." attribute */
    document.querySelectorAll('[data-i18n-label]').forEach(el => {
      el.label = this.t(el.getAttribute('data-i18n-label'));
    });
    /* input placeholder */
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.placeholder = this.t(el.getAttribute('data-i18n-ph'));
    });
    /* active lang button */
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === this.lang);
    });
    document.dispatchEvent(new CustomEvent('langchange', { detail: this.lang }));
  }
}

window.i18n = new I18n();
