/* P10: "Maxsus rejimlar" oynasi — holat → modelSpec, qo'yilgan jadvalni o'qish, shakllar HTML'i, hisobot bo'limlari
   (src/js/report.js::specialSection) uch tilda: yondashuv nomi va cheklovlar, BETA belgisi, escape (XSS), CSP;
   kontroller (src/ui/special/app.js) jsdom'da boshidan oxirigacha; shablonlar SP-01…SP-04. */
'use strict';
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { JSDOM } = require('jsdom');
const E = require('../../src/engine/index.js');
const B = require('../../src/ui/special/build.js');
const V = require('../../src/ui/special/view.js');
const T = require('../../src/templates/interpreter.js');
const { validate } = require('../../src/templates/validator.js');
const { byId, schema } = require('../templates/lib.js');
const { roundResult, roundHalfAway, roundUpAway } = require('../../src/report/rounding.js');
const { fmt, fmtSci } = require('../../src/report/format.js');
const { reportBridge } = require('./lib.js');
const { escHtml } = require('../../src/ui/escape.js');
const A1 = require('../cases/ufs/ufs-a1-nitrate-robust.json');
const A2 = require('../cases/ufs/ufs-a2-lead-classical.json');
const E6 = require('../cases/aqa/aqa-e6-sarscov2.json');

const ROOT = path.join(__dirname, '..', '..');
const LANGS = ['uz', 'ru', 'en'];
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const I18N_FILES = ['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js', 'src/js/i18n-regression.js', 'src/js/i18n-topdown.js', 'src/js/i18n-special.js', 'src/js/i18n-linter.js', 'src/js/i18n-report.js'];
function loadReport(lang) {
  const dom = new JSDOM('<!doctype html><body><div id="special-root"></div><button id="btn-print"></button><div id="print-report"></div></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  const w = dom.window;
  w.eval(read('src/ui/escape.js'));
  w.eval(I18N_FILES.map(read).join('\n;\n'));
  w.i18n.lang = lang;
  w.Calc = { roundResult, roundHalfAway, roundUpAway, fmt, fmtSci, ...reportBridge };   // P05a: linter / topilmalar bloki
  w.appState = { get: () => ({}), subscribe() {} };
  w.showToast = () => {};
  w.eval(read('src/js/report.js'));
  return w;
}
const frag = (w, html) => { const d = w.document.createElement('div'); d.innerHTML = html; return d; };
const ctxOf = w => ({ t: k => w.i18n.t(k), esc: escHtml });
const st = extra => ({ ...B.defaults(), ...extra });
const comma = v => String(v).replace('.', ',');
const A1_TEXT = 'target\tS1A1\tS1A2\tS2A1\tS2A2\r\n' + A1.modelSpec.targets.map(t => [t.id, ...t.values].join('\t')).join('\r\n');

/* ── holat → modelSpec ── */

test('namuna olish: Excel\'dan qo\'yilgan UfS A1 jadvali (5 ustun, sarlavha) → manba natijasi; 4 ustun ham', () => {
  const g = B.samplingRows(A1_TEXT);
  assert.equal(g.targets.length, 8); assert.equal(g.skipped, 1);
  assert.deepEqual(g.targets[2], { id: 'C', values: [5708, 5903, 4061, 3782] });
  const { spec, bad } = B.buildSpec(st({ mode: 'sampling', saTargets: A1_TEXT, saMethod: 'robust', saUnit: 'mg/kg' }));
  assert.deepEqual(bad, []);
  const r = E.evaluate(spec), ref = E.evaluate(A1.modelSpec);
  assert.equal(r.uc, ref.uc); assert.equal(r.relU, ref.relU);
  assert.ok(Math.abs(r.relU - 16.4) < 0.05);                        // UfS A1 (p. 42): 16,4 %
  const four = B.samplingRows('3898 4139 4466 4693\n3910;3993;4201;4126');
  assert.deepEqual(four.targets.map(t => t.id), ['1', '2']);
  // to'liq bo'lmagan qator jimgina to'ldirilmaydi — dvigatel "muvozanatsiz" xatosini beradi
  assert.equal(E.evaluate(B.buildSpec(st({ mode: 'sampling', saTargets: '1\t2\t3\n1\t2\t3\t4' })).spec).error, 'sampling_unbalanced');
});

test('namuna olish: o\'nlik vergul va ᶠU (UfS A2: 2,6207)', () => {
  const text = A2.modelSpec.targets.map(t => t.values.map(comma).join('\t')).join('\n');
  const r = E.evaluate(B.buildSpec(st({ mode: 'sampling', saTargets: text, saLog: true })).spec);
  assert.ok(Math.abs(r.log.uncertaintyFactor.measurement - 2.6207) < 0.00005);
});

test('sifatli test: 2×2 kataklar va tarqalganlik (%) → AQA Table E6.2; yaroqsiz qiymat → bad', () => {
  const { spec, bad } = B.buildSpec(st({ mode: 'qualitative', qlTp: '100', qlFn: '0', qlFp: '3', qlTn: '97', qlPrev: '10' }));
  assert.deepEqual(bad, []);
  assert.equal(spec.prevalence, 0.1);
  const r = E.evaluate(spec), ref = E.evaluate(E6.modelSpec);
  assert.deepEqual(r.specificity.wilson, ref.specificity.wilson);
  assert.deepEqual(B.buildSpec(st({ mode: 'qualitative', qlTp: 'x', qlFn: '0', qlFp: '3', qlTn: '97' })).bad, ['tp']);
  assert.equal(E.evaluate(B.buildSpec(st({ mode: 'qualitative', qlTp: '', qlFn: '0', qlFp: '3', qlTn: '97' })).spec).error, 'qualitative_bad_data'); // bo'sh ≠ 0
});

test('mikrobiologiya va tibbiy laboratoriya: maydonlar → spetsifikatsiya; bo\'sh maydon 0 emas', () => {
  const mi = B.buildSpec(st({ mode: 'micro', miValue: '1,5e4', miSum: '150', miPairs: '100\t120\n2000\t1800', miMatrix: '0,1' }));
  assert.deepEqual(mi.bad, []);
  assert.deepEqual(mi.spec.technical.pairs, [[100, 120], [2000, 1800]]);
  const r = E.evaluate(mi.spec);
  assert.equal(r.mode, 'MICROBIOLOGY'); assert.equal(r.nPairs, 2);
  assert.equal(E.evaluate(B.buildSpec(st({ mode: 'micro', miValue: '', miSum: '' })).spec).error, 'micro_need_result');
  const me = B.buildSpec(st({ mode: 'medical', meUnit: 'mmol/L', meLevels: 'mean\tCV\tn\n5\t3\t60\n20\t2\t60', meCal: '4', meY: '6' }));
  assert.deepEqual(me.spec.levels, [{ id: 'L1', mean: 5, cv: 3, n: 60 }, { id: 'L2', mean: 20, cv: 2, n: 60 }]);
  const m = E.evaluate(me.spec);
  assert.ok(Math.abs(m.levels[0].u.rel - 5) < 1e-12);
  assert.equal(E.evaluate(B.buildSpec(st({ mode: 'medical', meUnit: '', meLevels: '5\t3' })).spec).error, 'medical_need_scale');
  assert.deepEqual(B.buildSpec(st({ mode: 'medical', meUnit: 'g/L', meLevels: '5' })).bad, ['levels']);
});

/* ── shakllar ── */

test('oyna: 4 rejim, BETA belgisi mikrobiologiya va tibbiy laboratoriyada; har bir rejim shakli uch tilda', () => {
  for (const lang of LANGS) {
    const w = loadReport(lang), ctx = ctxOf(w);
    const modes = frag(w, V.modesHTML(st({ mode: 'micro' }), ctx));
    assert.deepEqual([...modes.querySelectorAll('[data-sp-mode]')].map(b => b.dataset.spMode), B.MODES);
    assert.equal(modes.querySelectorAll('.badge').length, 2);
    assert.equal(modes.querySelector('.active').dataset.spMode, 'micro');
    for (const mode of B.MODES) {
      const f = frag(w, V.formHTML(st({ mode }), ctx));
      assert.equal(f.querySelector('[data-sp-form]').dataset.spForm, mode);
      assert.equal(!!f.querySelector('[data-sp-beta]'), mode === 'micro' || mode === 'medical', `${lang} ${mode}`);
      assert.ok(!/(sp|td)_[a-z_]+/.test(f.textContent), `${lang} ${mode}: tarjima qilinmagan kalit`);
    }
  }
});

test('escape: foydalanuvchi matni (birlik, jadval matni, ob\'ekt belgisi) HTML sifatida talqin qilinmaydi', () => {
  const w = loadReport('en'), ctx = ctxOf(w);
  const evil = '<img src=x onerror=alert(1)>';
  for (const mode of B.MODES) {
    const d = frag(w, V.formHTML(st({ mode, saUnit: evil, saTargets: evil, miUnit: evil, miPairs: evil, meUnit: evil, meLevels: evil, qlTp: evil }), ctx));
    assert.equal(d.querySelector('img'), null, mode);
  }
  const results = [
    E.evaluate({ format: 'uc-sampling/1', unit: evil, targets: A1.modelSpec.targets.map(t => ({ id: evil, values: t.values })), measurement: { value: 4000 } }),
    E.evaluate({ format: 'uc-micro/1', unit: evil, result: { value: 1e4, sumCounts: 100 }, technical: { s: 0.1 } }),
    E.evaluate({ format: 'uc-medical/1', unit: evil, levels: [{ id: evil, mean: 5, cv: 2, n: 50 }], uCal: { value: 1, relative: true }, measurement: { value: 5 } }),
  ];
  for (const r of results) {
    assert.ok(!r.error, r.error);
    const d = frag(w, w.Results.specialSection(r));
    assert.equal(d.querySelector('img'), null, r.mode);
    assert.match(d.textContent, /<img src=x/);
  }
});

/* ── hisobot bo'limlari ── */

test('hisobot — namuna olish: s_samp, s_anal, s_meas, U′, klassik va robust taqqoslash, yondashuv va cheklovlar (uch tilda)', () => {
  const r = E.evaluate({ ...A1.modelSpec, measurement: { value: 4408 } });
  for (const lang of LANGS) {
    const w = loadReport(lang);
    const d = frag(w, w.Results.specialSection(r));
    assert.equal(d.querySelector('[data-sp-report]').dataset.spReport, 'SAMPLING');
    assert.equal(d.querySelector('[data-sp-urel]').textContent.trim(), '16 %');           // 16,36 % → 2 qiymatli raqam (UfS: 16,4 %)
    assert.equal(d.querySelector('[data-sp-u]').textContent.trim(), '720 mg/kg');        // 4408 · 16,36 % = 721 → 2 qiymatli raqam
    assert.match(d.querySelector('[data-sp-ssamp]').textContent, /319\.0/);
    assert.match(d.querySelector('[data-sp-sanal]').textContent, /167\.9/);
    assert.match(d.querySelector('[data-sp-smeas]').textContent, /360\.5/);
    assert.equal(d.querySelectorAll('[data-sp-anova] tbody tr').length, 2);
    assert.ok(d.querySelector('[data-sp-method="robust"]').classList.contains('td-total'));
    assert.equal(d.querySelector('[data-sp-approach]').dataset.spApproach, 'DUPLICATE_ROBUST_ANOVA');
    assert.match(d.querySelector('[data-sp-approach]').textContent, /UfS:2019/);
    assert.ok(d.querySelector('[data-sp-limits]').textContent.length > 40);
    assert.ok(d.querySelector('[data-sp-warning="sampling_bias_not_included"]'));
    assert.ok(!/(sp|td|w)_[a-z_]+|undefined|NaN|\{v\}/.test(d.textContent), lang);
  }
  const w = loadReport('en');
  const fu = frag(w, w.Results.specialSection(E.evaluate(A2.modelSpec)));
  assert.match(fu.querySelector('[data-sp-fu]').textContent, /2\.6207/);
});

test('hisobot — sifatli test: jadval, ulushlar, Wilson intervali (standart), usul nomi va P, LR, posterior (uch tilda)', () => {
  const r = E.evaluate({ ...E6.modelSpec, prevalence: 0.1 });
  for (const lang of LANGS) {
    const w = loadReport(lang);
    const d = frag(w, w.Results.specialSection(r));
    assert.ok(d.querySelector('[data-sp-table]'));
    assert.equal(d.querySelector('[data-sp-rate="ss"] [data-sp-ci="wilson"]').textContent, '[96.3; 100.0]');   // AQA Table E6.2
    assert.equal(d.querySelector('[data-sp-rate="sp"] [data-sp-ci="wilson"]').textContent, '[91.5; 99.0]');    // manba: 91,6 (D-17)
    // ekrandagi batafsil ko'rinish: ikkinchi usul solishtirish uchun
    assert.equal(d.querySelector('[data-sp-rate="ss"] [data-sp-ci-compare="clopper_pearson"]').textContent, '[96.4; 100.0]');
    const m = d.querySelector('[data-sp-cimethod]');
    assert.equal(m.dataset.spCimethod, 'wilson');
    assert.match(m.textContent, /Wilson|Уилсон/); assert.match(m.textContent, /95 %/); assert.match(m.textContent, /AQA:2021 §4\.4/);
    assert.equal(d.querySelector('[data-sp-warning="qualitative_cp_project_addition"]'), null);
    assert.match(d.querySelector('[data-sp-lr]').textContent, /33\.33/);
    assert.ok(d.querySelector('[data-sp-posterior]'));
    assert.equal(d.querySelector('[data-sp-approach]').dataset.spApproach, 'CONTINGENCY_2X2');
    assert.ok(d.querySelector('[data-sp-warning="qualitative_zero_false"]'));
    assert.ok(!/(sp|td|w)_[a-z_]+|undefined|NaN|\{[vP]\}/.test(d.textContent), lang);
  }
});

test('hisobot — mikrobiologiya va tibbiy laboratoriya: BETA belgisi va "tekshirilmagan" ogohlantirishi bosma hisobotda ham', () => {
  const micro = E.evaluate({ format: 'uc-micro/1', unit: 'CFU/g', result: { value: 1e4, sumCounts: 100 }, technical: { s: 0.1 }, matrix: { u: 0.05 } });
  const med = E.evaluate({ format: 'uc-medical/1', unit: 'mmol/L', levels: [{ id: 'L1', mean: 5, cv: 3, n: 60 }], uCal: { value: 4, relative: true }, measurement: { value: 6 } });
  for (const lang of LANGS) {
    const w = loadReport(lang);
    w.print = () => {};
    for (const [r, code] of [[micro, 'micro_unverified'], [med, 'medical_unverified']]) {
      w.Results.printSpecial(r, {});
      const d = w.document.getElementById('print-report');
      assert.ok(d.querySelector(`.warn-box [data-sp-warning="${code}"]`), `${lang} ${code}`);
      assert.ok(d.querySelector('[data-sp-beta]'));
      assert.match(d.querySelector('[data-sp-limits]').textContent, /BETA/);
      assert.ok(!/(sp|td|w)_[a-z_]+|undefined|NaN/.test(d.textContent), lang);
    }
    const dm = frag(w, w.Results.specialSection(micro));
    assert.equal(dm.querySelector('[data-sp-y]').textContent, '4.00');
    assert.equal(dm.querySelector('[data-sp-u]').textContent.trim(), '0.24');             // 2·√(0,1² + 0,05² + 0,04343²) = 0,240
    assert.equal(dm.querySelectorAll('[data-sp-budget] tbody tr').length, 4);
    const dd = frag(w, w.Results.specialSection(med));
    assert.equal(dd.querySelector('[data-sp-urel]').textContent.trim(), '10 %');
    assert.equal(dd.querySelector('[data-sp-u]').textContent.trim(), '0.60 mmol/L');
  }
  const css = read('src/css/components.css');
  assert.match(css, /@media print \{[\s\S]*\.sp-report \.warn-box[^{]*\{[^}]*display: block !important/);
});

test('hisobot: xato — uch tilda matn', () => {
  const r = E.evaluate({ format: 'uc-sampling/1', targets: [[1, 2, 3]] });
  const seen = new Set();
  for (const lang of LANGS) {
    const w = loadReport(lang);
    const e = frag(w, w.Results.specialSection(r)).querySelector('[data-sp-error="sampling_unbalanced"]');
    assert.ok(e && !/err_/.test(e.textContent));
    seen.add(e.textContent);
  }
  assert.equal(seen.size, 3);
});

/* ── shablonlar ── */

test('shablonlar SP-01…SP-04: DRAFT, sxema va semantik tekshiruvdan o\'tadi, raqamsiz; BETA rejim APPROVED bo\'la olmaydi', () => {
  const modes = { 'SP-01': 'SAMPLING', 'SP-02': 'QUALITATIVE', 'SP-03': 'MICROBIOLOGY', 'SP-04': 'MEDICAL' };
  for (const [id, mode] of Object.entries(modes)) {
    const t = byId[id];
    assert.ok(t, id);
    assert.deepEqual([t.status, t.evaluationMode], ['DRAFT', mode]);
    const chk = T.checkTemplate(t, schema);
    assert.deepEqual(chk.errors, [], id);
    assert.ok(T.isSpecial(t));
    const nums = [];
    (function walk(o) { if (typeof o === 'number') nums.push(o); else if (o && typeof o === 'object') Object.values(o).forEach(walk); })(t.special);
    assert.deepEqual(nums, []);
    const b = T.buildSpecialState(t, { lang: 'uz', ui: true });
    assert.equal(b.state.mode, T.SPECIAL_MODES[mode]);
    assert.equal(b.meta.mode, mode); assert.ok(b.meta.hint);
    assert.equal(T.buildState(t).error, 'special_template');
    const beta = mode === 'MICROBIOLOGY' || mode === 'MEDICAL';
    assert.equal(chk.warnings.some(x => /BETA/.test(x)), beta, id);
    const approved = JSON.parse(JSON.stringify(t)); approved.status = 'APPROVED';
    assert.equal(T.checkTemplate(approved, schema).errors.some(x => /BETA/.test(x)), beta, id);
  }
  const no = JSON.parse(JSON.stringify(byId['SP-01'])); delete no.special;
  assert.equal(validate(schema, no).valid, false);
  assert.equal(T.buildSpecialState(byId['T-01']).error, 'not_special_template');
  assert.equal(T.buildSpecialState(byId['SP-04']).state.meUnit, 'mmol/L');
});

/* ── sahifa va kontroller ── */

test('index.html: "Maxsus rejimlar" yorlig\'i, ildiz element, skriptlar; UI modullarida inline handler yo\'q', () => {
  const html = read('index.html');
  assert.match(html, /data-tab="special" data-i18n="tab_special"/);
  assert.match(html, /id="tab-special"[\s\S]*id="special-root"/);
  assert.match(html, /<script src="src\/js\/i18n-special\.js"><\/script>/);
  assert.match(html, /<script type="module" src="src\/ui\/special\/app\.js"><\/script>/);
  for (const f of ['src/ui/special/app.js', 'src/ui/special/view.js', 'src/ui/special/build.js']) {
    assert.ok(!/\son[a-z]+\s*=\s*["'`]/i.test(read(f)), f);
    assert.ok(!/\beval\(|new Function\(/.test(read(f)), f);
  }
  for (const f of ['src/ui/special/view.js', 'src/ui/special/build.js']) assert.ok(!/\b(document|window|localStorage)\b/.test(read(f)), f);
});

let w, doc;
const $ = sel => doc.querySelector(sel);
const fire = (el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true }));
const setValue = (sel, value) => { const el = $(sel); el.value = value; fire(el, 'input'); fire(el, 'change'); };
const click = sel => fire($(sel), 'click');
before(async () => {
  w = loadReport('uz'); doc = w.document;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  global.window = w; global.document = doc;
  await import(pathToFileURL(path.join(ROOT, 'src/ui/special/app.js')).href);
});

test('kontroller (jsdom): namuna olish — jadvalni qo\'yish → hisoblash → natija; rejim almashtirish; sifatli test; shablon; til', () => {
  assert.ok(w.UCSpecial);
  assert.equal($('[data-sp-form]').dataset.spForm, 'sampling');
  assert.equal(doc.querySelectorAll('#special-root [onclick], #special-root [oninput]').length, 0);
  setValue('#sp-saTargets', A1_TEXT);
  assert.match($('[data-sp-count="saTargets"]').textContent, /8/);
  setValue('#sp-saMethod', 'robust');
  setValue('#sp-saUnit', 'mg/kg');
  click('[data-sp-act="calc"]');
  let r = w.UCSpecial.current();
  assert.equal(r.error, undefined);
  assert.ok(Math.abs(r.uc - 360.55) < 0.05);                         // UfS A1 (p. 41)
  assert.equal($('[data-sp-urel]').textContent.trim(), '16 %');
  // sifatli test
  click('[data-sp-mode="qualitative"]');
  assert.equal($('[data-sp-form]').dataset.spForm, 'qualitative');
  for (const [k, v] of [['qlTp', '100'], ['qlFn', '0'], ['qlFp', '3'], ['qlTn', '97']]) setValue('#sp-' + k, v);
  click('[data-sp-act="calc"]');
  r = w.UCSpecial.current();
  assert.equal(r.mode, 'QUALITATIVE');
  assert.equal($('[data-sp-rate="ss"] [data-sp-ci="wilson"]').textContent, '[96.3; 100.0]');
  assert.equal(r.ciMethod, 'wilson');                                // laboratoriya sozlamasi yo'q → standart
  // rejimga qaytilganda kiritilgan ma'lumot va natija saqlangan
  click('[data-sp-mode="sampling"]');
  assert.equal($('#sp-saMethod').value, 'robust');
  assert.ok($('[data-sp-report="SAMPLING"]'));
  // shablon (BETA)
  assert.equal(w.UCSpecial.loadTemplate(byId['SP-03'], { silent: true }), true);
  assert.equal($('[data-sp-form]').dataset.spForm, 'micro');
  assert.equal($('[data-sp-template]').dataset.spTemplate, 'SP-03');
  assert.ok($('[data-sp-template] [data-draft-warning]') && $('[data-sp-beta]'));
  assert.equal($('#sp-miValue').value, '');                          // raqam o'ylab topilmagan
  click('[data-sp-act="calc"]');
  assert.equal($('[data-sp-error]').dataset.spError, 'micro_need_result');
  // til
  const title = $('.panel-title').textContent;
  w.i18n.lang = 'ru'; doc.dispatchEvent(new w.Event('langchange'));
  assert.notEqual($('.panel-title').textContent, title);
  w.i18n.lang = 'uz'; doc.dispatchEvent(new w.Event('langchange'));
  // saqlangan holatda shaxsiy maydon yo'q
  const saved = JSON.parse(w.localStorage.getItem('uc_special_v1'));
  assert.ok(!Object.keys(saved).some(k => /name|phone|email|inn|stir|fio/i.test(k)));
});

/* ── Egasi qarori (2026-11-18, R-21): standart — Wilson; Clopper–Pearson — laboratoriya sozlamasi ── */

test('bosma hisobot: faqat tanlangan usul intervali, usul nomi va P; Clopper–Pearson tanlansa — faqat u', () => {
  for (const lang of LANGS) {
    const w = loadReport(lang);
    w.print = () => {};
    const d = w.document.getElementById('print-report');
    w.Results.printSpecial(E.evaluate(E6.modelSpec), {});
    assert.equal(d.querySelector('[data-sp-rate="sp"] [data-sp-ci="wilson"]').textContent, '[91.5; 99.0]');
    assert.equal(d.querySelectorAll('[data-sp-ci-compare]').length, 0, lang + ': bosmada ikkinchi interval bo\'lmasligi kerak');
    assert.equal(d.querySelectorAll('[data-sp-rates] thead th').length, 4);
    assert.match(d.querySelector('[data-sp-cimethod]').textContent, /(Wilson|Уилсон).*95 %/);
    assert.ok(!/Clopper|Клоппер/.test(d.querySelector('[data-sp-rates]').textContent + d.querySelector('[data-sp-cimethod]').textContent), lang);
    const cp = E.evaluate({ ...E6.modelSpec, settings: { ciMethod: 'clopper_pearson' } });
    w.Results.printSpecial(cp, {});
    assert.equal(d.querySelector('[data-sp-rate="sp"] [data-sp-ci="clopper_pearson"]').textContent, '[91.5; 99.4]');   // SciPy: [0,914824; 0,993770]
    assert.equal(d.querySelectorAll('[data-sp-ci-compare]').length, 0);
    assert.equal(d.querySelector('[data-sp-cimethod]').dataset.spCimethod, 'clopper_pearson');
    assert.ok(!/Wilson|Уилсон/.test(d.querySelector('[data-sp-rates]').textContent), lang);
    assert.ok(d.querySelector('[data-sp-warning="qualitative_cp_project_addition"]'));
    assert.ok(!/(sp|td|w)_[a-z_]+|\{[vP]\}/.test(d.textContent), lang);
    // ekranda Clopper–Pearson tanlanganda Wilson solishtirish uchun ko'rinadi
    assert.ok(frag(w, w.Results.specialSection(cp)).querySelector('[data-sp-ci-compare="wilson"]'));
  }
});

test('laboratoriya sozlamasi "Ishonch intervali usuli": standart Wilson; saqlash maydoni va modal tanlovi bor', async () => {
  const S = await import(pathToFileURL(path.join(ROOT, 'src/storage/index.js')).href);
  assert.equal(S.LAB_DEFAULTS.ciMethod, 'wilson');
  const app = read('src/ui/tpl/app.js');
  assert.match(app, /id="lab-ciMethod"/);
  assert.match(app, /ciMethod: \$\('lab-ciMethod'\)\.value/);
  assert.match(read('src/ui/special/app.js'), /ciMethod: labCiMethod\(\)/);
});

test('kontroller: laboratoriya sozlamasi Clopper–Pearson bo\'lsa hisob va hisobot shu usulda', () => {
  w.UCTemplates = { labSettings: () => ({ ciMethod: 'clopper_pearson' }), reportNoticeHTML: () => '' };
  click('[data-sp-mode="qualitative"]');
  for (const [k, v] of [['qlTp', '100'], ['qlFn', '0'], ['qlFp', '3'], ['qlTn', '97']]) setValue('#sp-' + k, v);
  click('[data-sp-act="calc"]');
  assert.equal(w.UCSpecial.current().ciMethod, 'clopper_pearson');
  assert.equal($('[data-sp-cimethod]').dataset.spCimethod, 'clopper_pearson');
  assert.equal($('[data-sp-rate="ss"] [data-sp-ci="clopper_pearson"]').textContent, '[96.4; 100.0]');
  delete w.UCTemplates;
});
