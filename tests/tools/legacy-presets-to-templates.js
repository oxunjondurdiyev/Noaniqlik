#!/usr/bin/env node
/* Bir martalik ko'chirish (P04): src/data/presets.js dagi 11 ta preset → templates/builtin/<key>.json.
   Raqamlar presets.js dan O'ZGARISHSIZ olinadi (snapshot test: tests/templates/builtin.test.js).
   Nomlar uch tilda: sarlavha — src/js/i18n*.js dagi preset_* kalitlari; manba nomlari — quyidagi lug'at.
   legacyName — P03 dagi inglizcha nom (dvigatel byudjet qatorida aynan shu nom chiqadi → snapshot bir xil).
   Ishga tushirish:  node tests/tools/legacy-presets-to-templates.js  (fayllar qayta yoziladi) */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..', '..');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src/data/presets.js'), 'utf8'), ctx);
const PRESETS = JSON.parse(JSON.stringify(ctx.window.PRESETS));

const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
const T = dom.window.eval(['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js']
  .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') + '\n;TRANSLATIONS');
const L = key => ({ uz: T.uz[key], ru: T.ru[key], en: T.en[key] });
const t3 = (uz, ru, en) => ({ uz, ru, en });

const TITLE_KEY = {
  mass: 'preset_mass', volume: 'preset_volume', density: 'preset_density', voltage: 'preset_voltage',
  resistance: 'preset_resistance', power: 'preset_power', length: 'preset_length', area: 'preset_area',
  temperature: 'preset_temperature', gas_analyzer: 'preset_gas', thermometer: 'preset_thermo',
};

const INPUT = {
  m: t3('Massa', 'Масса', 'Mass'),
  V: t3('Hajm', 'Объём', 'Volume'),
  U: t3('Kuchlanish', 'Напряжение', 'Voltage'),
  R: t3('Qarshilik', 'Сопротивление', 'Resistance'),
  I: t3('Tok kuchi', 'Сила тока', 'Current'),
  L: t3('Uzunlik', 'Длина', 'Length'),
  W: t3('Kenglik', 'Ширина', 'Width'),
  T: t3('Harorat', 'Температура', 'Temperature'),
  Ce: t3('Etalon qiymati / tuzatma', 'Значение / поправка эталона', 'Reference value / correction'),
  Te: t3('Etalon termometr ko\'rsatishi', 'Показание эталонного термометра', 'Reference thermometer reading'),
  Tv: t3('Kalibrlanayotgan termometr ko\'rsatishi', 'Показание калибруемого термометра', 'Reading of the thermometer under calibration'),
};
const INPUT_GAS = { I: t3('Chiqish signali (tok)', 'Выходной сигнал (ток)', 'Output signal (current)'),
                    Ce: t3('PGS (etalon gaz aralashmasi) qiymati', 'Значение ПГС (эталонной газовой смеси)', 'Reference gas mixture (PGS) value') };

// P03 dagi inglizcha nom → uch tildagi nom
const SRC = {
  'Calibration certificate': t3('Kalibrlash sertifikati', 'Сертификат калибровки', 'Calibration certificate'),
  'Resolution (digital readout)': t3('Ajratish qobiliyati (raqamli ko\'rsatkich)', 'Разрешение (цифровой индикатор)', 'Resolution (digital readout)'),
  'Buoyancy correction': t3('Havo ko\'tarish kuchiga tuzatma', 'Поправка на выталкивающую силу воздуха', 'Buoyancy correction'),
  'Temperature effect': t3('Harorat ta\'siri', 'Влияние температуры', 'Temperature effect'),
  'Calibration of glassware': t3('Shisha idish kalibrlovi', 'Калибровка мерной посуды', 'Calibration of glassware'),
  'Temperature deviation (thermal expansion)': t3('Harorat chetlanishi (issiqlikdan kengayish)', 'Отклонение температуры (тепловое расширение)', 'Temperature deviation (thermal expansion)'),
  'Meniscus reading': t3('Meniskni o\'qish', 'Отсчёт по мениску', 'Meniscus reading'),
  'Balance calibration (U, k=2)': t3('Tarozi kalibrlovi (U, k = 2)', 'Калибровка весов (U, k = 2)', 'Balance calibration (U, k=2)'),
  'Balance resolution d': t3('Tarozi ajratish qobiliyati d', 'Дискретность весов d', 'Balance resolution d'),
  'Non-linearity / eccentricity': t3('Nochiziqlilik / ekssentriklik', 'Нелинейность / эксцентриситет', 'Non-linearity / eccentricity'),
  'Glassware tolerance': t3('Idish ruxsat etilgan chetlanishi', 'Допуск мерной посуды', 'Glassware tolerance'),
  'Scale reading d': t3('Shkaladan o\'qish d', 'Отсчёт по шкале d', 'Scale reading d'),
  'Temperature ±ΔT (×V·γ)': t3('Harorat ±ΔT (×V·γ)', 'Температура ±ΔT (×V·γ)', 'Temperature ±ΔT (×V·γ)'),
  'DMM calibration certificate': t3('Multimetr kalibrlash sertifikati', 'Сертификат калибровки мультиметра', 'DMM calibration certificate'),
  'Reference standard uncertainty': t3('Etalon noaniqligi', 'Неопределённость эталона', 'Reference standard uncertainty'),
  'Resolution': t3('Ajratish qobiliyati', 'Разрешение', 'Resolution'),
  'Thermal EMF': t3('Termo-EYuK', 'Термо-ЭДС', 'Thermal EMF'),
  'Calibration uncertainty': t3('Kalibrlash noaniqligi', 'Неопределённость калибровки', 'Calibration uncertainty'),
  'Stability of reference': t3('Etalon barqarorligi', 'Стабильность эталона', 'Stability of reference'),
  'Voltage DMM calibration': t3('Kuchlanish multimetri kalibrlovi', 'Калибровка мультиметра (напряжение)', 'Voltage DMM calibration'),
  'Current shunt calibration': t3('Tok shunti kalibrlovi', 'Калибровка токового шунта', 'Current shunt calibration'),
  'Calibration of micrometer': t3('Mikrometr kalibrlovi', 'Калибровка микрометра', 'Calibration of micrometer'),
  'Resolution (0.001 mm)': t3('Ajratish qobiliyati (0,001 mm)', 'Разрешение (0,001 мм)', 'Resolution (0.001 mm)'),
  'Thermal expansion (ΔT = ±1 °C)': t3('Issiqlikdan kengayish (ΔT = ±1 °C)', 'Тепловое расширение (ΔT = ±1 °C)', 'Thermal expansion (ΔT = ±1 °C)'),
  'Length calibration': t3('Uzunlik kalibrlovi', 'Калибровка длины', 'Length calibration'),
  'Width calibration': t3('Kenglik kalibrlovi', 'Калибровка ширины', 'Width calibration'),
  'Thermometer calibration': t3('Termometr kalibrlovi', 'Калибровка термометра', 'Thermometer calibration'),
  'Self-heating effect': t3('O\'z-o\'zidan qizish ta\'siri', 'Эффект самонагрева', 'Self-heating effect'),
  'Calibrator error (Fluke 725Ex) ±(0.02 %·I + 0.002 mA)': t3('Kalibrator xatosi (Fluke 725Ex) ±(0,02 %·I + 0,002 mA)', 'Погрешность калибратора (Fluke 725Ex) ±(0,02 %·I + 0,002 мА)', 'Calibrator error (Fluke 725Ex) ±(0.02 %·I + 0.002 mA)'),
  'Calibrator resolution d': t3('Kalibrator ajratish qobiliyati d', 'Разрешение калибратора d', 'Calibrator resolution d'),
  'Reference gas mixture (PGS) value': t3('PGS (etalon gaz aralashmasi) qiymati', 'Значение ПГС (эталонной газовой смеси)', 'Reference gas mixture (PGS) value'),
  'Reference readout resolution': t3('Etalon ko\'rsatkichi ajratish qobiliyati', 'Разрешение отсчёта эталона', 'Reference readout resolution'),
  'Measuring instrument (bridge) error': t3('O\'lchash qurilmasi (ko\'prik) xatosi', 'Погрешность измерительного прибора (моста)', 'Measuring instrument (bridge) error'),
  'Reference drift': t3('Etalon dreyfi', 'Дрейф эталона', 'Reference drift'),
  'Bath stability': t3('Vanna barqarorligi', 'Стабильность термостата', 'Bath stability'),
  'Bath uniformity': t3('Vanna bir jinsliligi', 'Однородность термостата', 'Bath uniformity'),
  'Immersion / heat conduction': t3('Botirish / issiqlik o\'tkazish', 'Погружение / теплопроводность', 'Immersion / heat conduction'),
  'Reference certificate (Ue, k = 2)': t3('Etalon sertifikati (Ue, k = 2)', 'Сертификат эталона (Ue, k = 2)', 'Reference certificate (Ue, k = 2)'),
  'Thermometer reading interpolation dv/(2·nI)': t3('Termometr shkalasini interpolyatsiya dv/(2·nI)', 'Интерполяция отсчёта термометра dv/(2·nI)', 'Thermometer reading interpolation dv/(2·nI)'),
};

function kindOf(name, dist) {
  if (dist === 'resol' || /resolution|reading d|Scale reading/i.test(name)) return 'resolution';
  if (/certificate|calibration|Calibration|uncertainty/i.test(name)) return 'certificate';
  if (/drift|Stability/i.test(name)) return 'drift';
  if (/Temperature|Thermal|Bath|Buoyancy|Immersion|Self-heating/i.test(name)) return 'environment';
  if (/PGS|Reference/i.test(name)) return 'reference';
  if (/error|tolerance|Non-linearity|Glassware/i.test(name)) return 'specification';
  return 'other';
}

const SOURCE_NOTES = {
  default: t3('P03 dagi src/data/presets.js shablonidan o\'zgarishsiz ko\'chirilgan (P04).',
              'Перенесён без изменений из шаблона src/data/presets.js (P03) в P04.',
              'Migrated unchanged from the src/data/presets.js preset (P03) in P04.'),
};

const SAMPLE_SOURCE = {
  gas_analyzer: 'tests/fixtures/Noaniqlik_hisobi_gazoanalizator_KEDR-07.xlsx; tests/fixtures/Qollanma_noaniqlik_gazoanalizator_C75QM.docx (Ilova A)',
  thermometer: 'tests/fixtures/Noaniqlik_hisobi_termometr_MS-MK-3.xlsx (o\'quv namunasi, real laboratoriya ma\'lumoti emas)',
  density: 'tests/fixtures/Zichlik_noaniqligi_hisobi.xlsx (2_Kirish!B6:C10)',
};

const MEASURAND = {
  mass: ['m', t3('Massa', 'Масса', 'Mass')], volume: ['V', t3('Hajm', 'Объём', 'Volume')],
  density: ['ρ', t3('Zichlik', 'Плотность', 'Density')], voltage: ['U', t3('O\'zgarmas kuchlanish', 'Постоянное напряжение', 'DC voltage')],
  resistance: ['R', t3('Qarshilik', 'Сопротивление', 'Resistance')], power: ['P', t3('Elektr quvvati', 'Электрическая мощность', 'Electrical power')],
  length: ['L', t3('Uzunlik', 'Длина', 'Length')], area: ['A', t3('Yuza', 'Площадь', 'Area')],
  temperature: ['T', t3('Harorat', 'Температура', 'Temperature')],
  gas_analyzer: ['E', t3('Gazoanalizator xatosi', 'Погрешность газоанализатора', 'Gas analyzer error')],
  thermometer: ['Cv', t3('Termometrga tuzatma', 'Поправка к термометру', 'Thermometer correction')],
};

const out = path.join(ROOT, 'templates/builtin');
fs.mkdirSync(out, { recursive: true });
const index = [];
for (const [key, pd] of Object.entries(PRESETS)) {
  const ids = pd.typeBComponents.map((c, i) => `${c.param}_${i + 1}`);
  const isCal = !!pd.points;
  const tpl = {
    schemaVersion: 'uc-template/1',
    id: `legacy-${key}`,
    version: '1.0.0',
    status: 'DRAFT',
    domain: 'CALIBRATION',
    section: 'calibration',
    evaluationMode: 'GUM_BOTTOM_UP',
    title: L(TITLE_KEY[key]),
    standards: [],
    labCount: null,
    sourceNote: SOURCE_NOTES.default,
    ref: 'src/data/presets.js (P03) — ' + key,
    legacyPresetKey: key,
    origin: 'example',          // P22-1: katalogda "Namuna" belgisi (src/ui/tpl/view.js)
    measurand: { symbol: MEASURAND[key][0], name: MEASURAND[key][1], unit: pd.unit || '' },
    model: { formula: pd.formula || '' },
    inputs: pd.params.map(p => ({
      symbol: p,
      name: (key === 'gas_analyzer' ? INPUT_GAS[p] : null) || INPUT[p],
      unit: '',
      kind: (key === 'thermometer' && p === 'Ce') || (key === 'gas_analyzer' && p === 'Ce') ? 'reference' : 'observation',
      ...(pd.settings && pd.settings.typeA && pd.settings.typeA[p] ? { typeA: pd.settings.typeA[p] } : {}),
    })),
    typeBSources: pd.typeBComponents.map((c, i) => {
      if (!SRC[c.name]) throw new Error('no translation: ' + c.name);
      const s = {
        id: ids[i], input: c.param, name: SRC[c.name], legacyName: c.name, kind: kindOf(c.name, c.distribution),
        distribution: c.distribution, halfWidth: c.halfWidth,
      };
      if (c.k !== undefined) s.k = c.k;
      if (c.sensitivity !== undefined) s.sensitivity = c.sensitivity;
      if (c.unit !== undefined) s.unit = c.unit;
      return s;
    }),
  };
  if (pd.directions) tpl.directions = [...pd.directions];
  if (pd.settings) {
    const st = JSON.parse(JSON.stringify(pd.settings));
    delete st.typeA; // inputs[].typeA ga ko'chirildi
    tpl.settings = { ...st, ...(pd.settings.typeA ? { typeA: pd.settings.typeA } : {}) };
  }
  const demo = key !== 'gas_analyzer' && key !== 'density';
  if (pd.points) {
    tpl.points = pd.points.map(pt => {
      const patch = {};
      for (const [name, p] of Object.entries(pt.patch || {})) patch[ids[pd.typeBComponents.findIndex(c => c.name === name)]] = p;
      return { label: pt.label, demo, data: pt.data, ...(Object.keys(patch).length ? { patch } : {}) };
    });
  } else {
    tpl.sampleData = {
      demo,
      note: demo
        ? t3('Namunaviy ma\'lumot — real emas (o\'quv misoli).', 'Пример данных — не реальные (учебный пример).', 'Sample data — not real (training example).')
        : t3('Laboratoriya Excel misolidan.', 'Из лабораторного примера Excel.', 'From the laboratory Excel example.'),
      ...(SAMPLE_SOURCE[key] ? { source: SAMPLE_SOURCE[key] } : {}),
      data: pd.sampleData,
    };
  }
  if (pd.points) tpl.sampleData = undefined;
  if (SAMPLE_SOURCE[key] && pd.points) tpl.sourceNote = t3(
    SOURCE_NOTES.default.uz + ' Ma\'lumot manbasi: ' + SAMPLE_SOURCE[key] + '.',
    SOURCE_NOTES.default.ru + ' Источник данных: ' + SAMPLE_SOURCE[key] + '.',
    SOURCE_NOTES.default.en + ' Data source: ' + SAMPLE_SOURCE[key] + '.');
  tpl.reporting = { reportType: isCal ? 'calibration_certificate' : 'budget' };
  const json = JSON.stringify(tpl, null, 2) + '\n';
  fs.writeFileSync(path.join(out, `legacy-${key}.json`), json);
  index.push(`legacy-${key}.json`);
}
console.log(index.join('\n'));
