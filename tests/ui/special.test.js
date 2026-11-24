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
const I18N_FILES = ['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js', 'src/js/i18n-regression.js', 'src/js/i18n-topdown.js', 'src/js/i18n-special.js', 'src/js/i18n-linter.js', 'src/js/i18n-report.js', 'src/js/i18n-p20.js'];
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

test('oyna: 4 rejim, BETA belgisi faqat mikrobiologiyada (P18: tibbiy laboratoriya BETA emas); har bir rejim shakli uch tilda', () => {
  for (const lang of LANGS) {
    const w = loadReport(lang), ctx = ctxOf(w);
    const modes = frag(w, V.modesHTML(st({ mode: 'micro' }), ctx));
    assert.deepEqual([...modes.querySelectorAll('[data-sp-mode]')].map(b => b.dataset.spMode), B.MODES);
    assert.equal(modes.querySelectorAll('.badge').length, 1);
    assert.equal(modes.querySelector('.active').dataset.spMode, 'micro');
    for (const mode of B.MODES) {
      const f = frag(w, V.formHTML(st({ mode }), ctx));
      assert.equal(f.querySelector('[data-sp-form]').dataset.spForm, mode);
      assert.equal(!!f.querySelector('[data-sp-beta]'), mode === 'micro', `${lang} ${mode}`);
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

test('hisobot — mikrobiologiya: BETA belgisi va "tekshirilmagan" ogohlantirishi bosma hisobotda ham; tibbiy laboratoriya (P18) — BETA emas', () => {
  const micro = E.evaluate({ format: 'uc-micro/1', unit: 'CFU/g', result: { value: 1e4, sumCounts: 100 }, technical: { s: 0.1 }, matrix: { u: 0.05 } });
  const med = E.evaluate({ format: 'uc-medical/1', unit: 'mmol/L', levels: [{ id: 'L1', mean: 5, cv: 3, n: 60 }], uCal: { value: 4, relative: true }, measurement: { value: 6 } });
  for (const lang of LANGS) {
    const w = loadReport(lang);
    w.print = () => {};
    for (const [r, code] of [[micro, 'micro_unverified']]) {
      w.Results.printSpecial(r, {});
      const d = w.document.getElementById('print-report');
      assert.ok(d.querySelector(`.warn-box [data-sp-warning="${code}"]`), `${lang} ${code}`);
      assert.ok(d.querySelector('[data-sp-beta]'));
      assert.match(d.querySelector('[data-sp-limits]').textContent, /BETA/);
      assert.ok(!/(sp|td|w)_[a-z_]+|undefined|NaN/.test(d.textContent), lang);
    }
    w.Results.printSpecial(med, {});
    const pm = w.document.getElementById('print-report');
    assert.equal(pm.querySelector('[data-sp-beta]'), null);
    assert.equal(pm.querySelector('[data-sp-warning="medical_unverified"]'), null);
    assert.doesNotMatch(pm.querySelector('[data-sp-limits]').textContent, /BETA/);
    assert.match(pm.querySelector('[data-sp-approach]').textContent, /ISO\/TS 20914:2019/);
    assert.ok(!/(sp|td|w)_[a-z_]+|undefined|NaN/.test(pm.textContent), lang);
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
    const beta = mode === 'MICROBIOLOGY';   // P18: MEDICAL — ISO/TS 20914:2019 misollari bilan tekshirilgan, BETA emas
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

/* ── P18: M9 — ISO/TS 20914:2019 (shakl → spetsifikatsiya → hisobot) ── */

const G = id => require(`../fixtures/iso20914/${id}.json`);
const pickPath = (o, p) => p.split('.').reduce((a, k) => (a === null || a === undefined ? undefined : a[k]), o);
/** Fixture kutilgan qiymatlari shakl orqali kiritilgan ma'lumotda ham bajariladi (ma'lum farqlar — D-23 — bundan mustasno) */
function meets(r, f) {
  for (const x of f.expected.filter(x => !x.discrepancy && !x.run)) {
    const got = pickPath(r, x.path) * (x.factor || 1);
    assert.ok(Math.abs(got - x.value) <= x.tol, `${f.id} ${x.path}: ${got} ≠ ${x.value} ± ${x.tol}`);
  }
}

test('P18 shakl: IQC darajalari — CV yoki SD, n, qo\'llanish oralig\'i ("-" — yo\'q katak); G2 (A.2.3) shakl orqali', () => {
  assert.deepEqual(B.levelRows('5\t3\t60').levels, [{ id: 'L1', mean: 5, cv: 3, n: 60 }]);
  const lv = B.levelRows('o\'rtacha\tSD\tn\tquyi\tyuqori\n2,1\t0,044\t20\t-\t10\n21,4\t0,40\t20\t10\t50\n122,0\t3,15\t20\t50\t-', { spread: 'sd' });
  assert.equal(lv.skipped, 1);
  assert.deepEqual(lv.levels[0], { id: 'L1', mean: 2.1, sd: 0.044, n: 20, interval: { high: 10 } });
  assert.deepEqual(lv.levels[2].interval, { low: 50 });
  const { spec, bad } = B.buildSpec(st({ mode: 'medical', meUnit: 'pmol/l', mePrecision: 'repeatability', meSpread: 'sd', meY: '60',
    meLevels: '2,1\t0,044\t20\t-\t10\n21,4\t0,40\t20\t10\t50\n122,0\t3,15\t20\t50\t-' }));
  assert.deepEqual(bad, []);
  assert.deepEqual(spec, G('G2').input);
  const r = E.evaluate(spec);
  meets(r, G('G2')); assert.equal(r.appliedLevel, 'L3');
});

test('P18 shakl: lotlar (G4), tizimlar (G6), davrlar (G7) — "daraja  o\'rtacha  SD  n" qatorlari; noto\'g\'ri qator → bad', () => {
  const g4 = G('G4');
  const rows = g4.input.levels.flatMap((L, i) => L.lots.map(x => [`L${i + 1}`, x.mean, x.sd].join('\t'))).join('\n');
  const a = B.buildSpec(st({ mode: 'medical', meUnit: 'pmol/l', meLevels: '-\t-\n-\t-\n-\t-', meGroupKind: 'lots', meGroups: rows, meCal: '1,05' }));
  assert.deepEqual(a.bad, []); assert.equal(a.spec.levels[2].lots.length, 3);
  meets(E.evaluate(a.spec), g4);
  const g6 = G('G6');
  const b = B.buildSpec(st({ mode: 'medical', meUnit: 'mmol/l', mePrecision: 'repeatability', meLevels: '-\t-', meGroupKind: 'systems',
    meGroups: g6.input.levels[0].systems.map(x => ['1', x.mean, x.sd, x.n].join(';')).join('\n') }));
  assert.deepEqual(b.bad, []); meets(E.evaluate(b.spec), g6);
  const g7 = G('G7');
  const c = B.buildSpec(st({ mode: 'medical', meUnit: 'mmol/l', meUKind: 'abs', meCal: '0,038', meSpread: 'sd', meLevels: g7.input.levels.map(L => `${L.mean}\t-`).join('\n'), meGroupKind: 'periods',
    meGroups: g7.input.levels.flatMap((L, i) => L.periods.map(x => `${i + 1}\t${x.uRw}`)).join('\n') }));
  assert.deepEqual(c.bad, []); meets(E.evaluate(c.spec), g7);
  // mavjud bo'lmagan daraja, o'qib bo'lmaydigan qator, guruhsiz darajada o'rtacha / SD yo'q
  assert.deepEqual(B.buildSpec(st({ mode: 'medical', meUnit: 'x', meLevels: '5\t3', meGroupKind: 'lots', meGroups: '2\t5\t0,1' })).bad, ['groups']);
  assert.deepEqual(B.buildSpec(st({ mode: 'medical', meUnit: 'x', meLevels: '5\t3', meGroupKind: 'lots', meGroups: 'abc\t5\t0,1' })).bad, ['groups']);
  assert.deepEqual(B.buildSpec(st({ mode: 'medical', meUnit: 'x', meLevels: '-\t-', meGroupKind: 'none', meGroups: '1\t5\t0,1' })).bad, ['levels']);
  assert.equal(B.groupRows('1\t5\t0,1\nL1\t6\t0,2\t30', 'lots').byLevel[0][1].n, 30);
});

test('P18 shakl: bias (CRM) — G9 (C.6.1) va G10 (C.6.2); log₁₀ va ruxsat etilgan U — G11 (A.10); yaxlitlash va vazn sozlamalari', () => {
  const g9 = B.buildSpec(st({ mode: 'medical', meUnit: 'mmol/l', meSpread: 'sd', meUKind: 'abs', meCal: '0,63', meLevels: '141,8\t0,85',
    meBRef: '141,8', meBURef: '0,90', meBKRef: '2', meBLab: '143,4', meBSd: '0,65', meBN: '10', meBApply: true }));
  assert.deepEqual(g9.bad, []);
  assert.deepEqual(g9.spec.bias, { ...G('G9').input.bias, mode: 'absolute' });
  meets(E.evaluate(g9.spec), G('G9'));
  const g10 = B.buildSpec(st({ mode: 'medical', meUnit: 'µmol/l', meSpread: 'sd', meUKind: 'abs', meCal: '1,62', meLevels: '70,2\t1,44\t-\t-\t250\n517,1\t5,87\t-\t250\t-', meY: '300',
    meBRef: '72,9', meBURef: '1,61', meBLab: '80,1', meBSd: '1,10', meBN: '10', meBApply: true }));
  assert.deepEqual(g10.bad, []); assert.equal(g10.spec.bias.kRef, undefined);          // bo'sh k — dvigatel standarti (2); 0 deb olinmaydi
  const r10 = E.evaluate(g10.spec), f10 = G('G10');
  for (const x of f10.expected.filter(x => x.run === 'lot1')) assert.ok(Math.abs(pickPath(r10, x.path) - x.value) <= x.tol, x.path);
  assert.equal(r10.appliedLevel, 'L2');
  const g11 = B.buildSpec(st({ mode: 'medical', meUnit: 'log10 copies/ml', meScale: 'log10', mePrecision: 'repeatability', meSpread: 'sd', meAllowKind: 'U_abs', meAllow: '0,5', meY: '2,66',
    meLevels: '2,66\t0,120\t-\t-\t3\n3,18\t0,160\t-\t3\t3,7\n4,21\t0,230\t-\t3,7\t-' }));
  assert.deepEqual(g11.spec, G('G11').input);
  meets(E.evaluate(g11.spec), G('G11'));
  // log₁₀ shkalada u_cal har doim mutlaq (nisbiy tanlangan bo'lsa ham)
  assert.deepEqual(B.buildSpec(st({ mode: 'medical', meUnit: 'log10', meScale: 'log10', meSpread: 'sd', meLevels: '3\t0,1', meCal: '0,05' })).spec.uCal, { value: 0.05, unit: 'log10' });
  assert.deepEqual(B.buildSpec(st({ mode: 'medical', meUnit: 'g/L', meLevels: '5\t3', meRound: 'up', mePool: 'df', meK: '3' })).spec.settings, { k: 3, rounding: 'up', poolWeighting: 'df' });
  assert.equal(B.buildSpec(st({ mode: 'medical', meUnit: 'g/L', meLevels: '5\t3' })).spec.settings, undefined);
  assert.deepEqual(B.buildSpec(st({ mode: 'medical', meUnit: 'g/L', meLevels: '5\t3', meBRef: 'x', meBLab: '1', meBSd: '1', meBN: '3' })).bad, ['xRef']);
});

test('P18 shakl: yangi maydonlar uch tilda — aniqlik turi, shkala, oraliq, lotlar / tizimlar / davrlar, bias, ruxsat etilgan noaniqlik', () => {
  for (const lang of LANGS) {
    const w = loadReport(lang), ctx = ctxOf(w);
    const f = frag(w, V.formHTML(st({ mode: 'medical', meGroupKind: 'lots', meBRef: '4,15' }), ctx));
    for (const id of ['mePrecision', 'meScale', 'meSpread', 'meGroupKind', 'mePool', 'meUKind', 'meRound', 'meBMode', 'meAllowKind'])
      assert.ok(f.querySelector(`select#sp-${id}[data-sp-field="${id}"]`).options.length >= 2, `${lang} ${id}`);
    for (const id of ['meLevels', 'meGroups', 'meCal', 'meBias', 'meY', 'meK', 'meBRef', 'meBURef', 'meBKRef', 'meBLab', 'meBSd', 'meBN', 'meAllow'])
      assert.ok(f.querySelector(`#sp-${id}[data-sp-field="${id}"]`), `${lang} ${id}`);
    assert.ok(f.querySelector('input[type="checkbox"][data-sp-flag="meBApply"]'));
    assert.equal(f.querySelectorAll('details[open]').length, 2);          // to'ldirilgan bo'limlar ochiq
    assert.equal(frag(w, V.formHTML(st({ mode: 'medical' }), ctx)).querySelectorAll('details[open]').length, 0);
    assert.equal(f.querySelectorAll('[style]').length, 0);
    for (const o of f.querySelectorAll('option, summary, label > span')) assert.ok(o.textContent.trim() && !/(sp|td)_[a-z_]+/.test(o.textContent), `${lang}: ${o.textContent}`);
    assert.ok(frag(w, V.countHTML(st({ meGroupKind: 'lots', meGroups: '1\t5\t0,1\nx' }), 'meGroups', ctx)).textContent.includes('1'));
    // dvigatelning har bir yangi ogohlantirishi va xatosi uchun matn
    for (const c of Object.keys(E.MEDICAL_WARNINGS)) for (const p of c === 'zero_u' ? ['w_'] : ['w_', 'fix_']) assert.notEqual(w.i18n.t(p + c), p + c, `${lang} ${p}${c}`);
    for (const c of E.MEDICAL_ERRORS) assert.notEqual(w.i18n.t('err_' + c), 'err_' + c, lang);
  }
});

test('P18 hisobot: A.1 shaklidagi jadval, §5.6 bo\'limi, yaxlitlash bayonoti (§5.4 Option B / ILAC P14), oraliq, yaroqlilik — uch tilda', () => {
  const g1 = E.evaluate(G('G1').input);
  const up = E.evaluate({ ...G('G1').input, settings: { rounding: 'up' } });
  const g2 = E.evaluate({ ...G('G2').input, allowable: { U_rel: 5 } });
  for (const lang of LANGS) {
    const w = loadReport(lang);
    const d = frag(w, w.Results.specialSection(g1));
    // Table A.1 (standart yaxlitlagan qiymatlar): %U_rel 1,6 / 1,5 / 2,8
    assert.deepEqual([...d.querySelectorAll('[data-sp-me-urel]')].map(x => x.textContent.trim()), ['1.6', '1.5', '2.8']);
    assert.deepEqual([...d.querySelectorAll('[data-sp-me-patient]')].map(x => x.textContent.trim()), ['± 1.6 %', '± 1.5 %', '± 2.8 %']);
    assert.deepEqual([...d.querySelectorAll('[data-sp-levels] tbody tr')].map(x => x.children[1].textContent), ['342', '338', '122']);
    assert.ok(d.querySelector('[data-sp-me-userinfo]').textContent.includes('§5.6'));
    assert.equal(d.querySelector('[data-sp-me-rounding]').dataset.spMeRounding, 'half_up');
    assert.match(d.querySelector('[data-sp-me-rounding]').textContent, /ISO\/TS 20914 §5\.4 \(Option B\)/);
    assert.equal(d.querySelector('[data-sp-beta]'), null);
    const du = frag(w, w.Results.specialSection(up));
    assert.equal(du.querySelector('[data-sp-me-rounding]').dataset.spMeRounding, 'up');
    assert.match(du.querySelector('[data-sp-me-rounding]').textContent, /ILAC P14/);
    assert.deepEqual([...du.querySelectorAll('[data-sp-me-urel]')].map(x => x.textContent.trim()), ['1.7', '1.5', '2.9']);   // yuqoriga: 1,643 → 1,7; 1,499 → 1,5; 2,820 → 2,9
    // takrorlanuvchanlik: §6.3 ogohlantirishi bosma hisobotda ham; oraliq bo'yicha tanlash; yaroqlilik nishoni
    w.print = () => {};
    w.Results.printSpecial(g2, {});
    const p = w.document.getElementById('print-report');
    assert.ok(p.querySelector('[data-sp-warning="medical_repeatability_only"]'), lang);
    assert.equal(p.querySelector('[data-sp-me-rule]').dataset.spMeRule, 'interval');
    assert.deepEqual([...p.querySelectorAll('[data-sp-me-fit]')].map(x => x.dataset.spMeFit), ['yes', 'yes', 'no']);     // 4,19; 3,74; 5,16 ≤ 5 ?
    assert.ok(p.querySelector('[data-sp-me-allowable]'));
    assert.match(p.querySelectorAll('[data-sp-levels] thead th')[3].textContent, /u\s*r/);
    assert.ok(!/(sp|td|w)_[a-z_]+|undefined|NaN|\{[a-z]+\}/.test(p.textContent), lang);
  }
});

test('P18 hisobot: bias bloki (bias ± U_bias, tuzatish turi), lotlar / tizimlar / davrlar qatorlari, log₁₀ intervali; matn escape qilinadi', () => {
  const g9 = E.evaluate(G('G9').input), g8 = E.evaluate(G('G8').input), g11 = E.evaluate(G('G11').input);
  const evil = '<img src=x onerror=alert(1)>';
  const sys = E.evaluate({ format: 'uc-medical/1', unit: evil, precisionType: 'repeatability', levels: [{ id: evil, systems: [{ id: evil, mean: 5, sd: 0.2 }, { id: 'B', mean: 5.4, sd: 0.2 }] }] });
  for (const lang of LANGS) {
    const w = loadReport(lang);
    const d9 = frag(w, w.Results.specialSection(g9));
    assert.equal(d9.querySelector('[data-sp-me-bias]').dataset.spMeBias, 'applied');
    assert.match(d9.querySelector('[data-sp-me-bias]').textContent, /-1\.6/);              // bias = 141,8 − 143,4
    assert.match(d9.querySelector('[data-sp-me-bias]').textContent, /± 0\.99/);            // U_bias = 0,989 → 0,99
    const d8 = frag(w, w.Results.specialSection(g8));
    assert.equal(d8.querySelector('[data-sp-me-bias]').dataset.spMeBias, 'not_applied');
    assert.ok(d8.querySelector('[data-sp-warning="medical_bias_significant_not_applied"]'));
    const d11 = frag(w, w.Results.specialSection(g11));
    assert.match(d11.querySelector('[data-sp-me-coverage]').textContent, /2\.42.*2\.9.*263.*794/);
    assert.equal(d11.querySelector('[data-sp-urel]'), null);                               // log shkalada nisbiy % yo'q
    assert.equal(d11.querySelector('[data-sp-u]').textContent.trim(), '0.24 log10 copies/ml');
    assert.deepEqual([...d11.querySelectorAll('[data-sp-me-fit]')].map(x => x.dataset.spMeFit), ['yes', 'yes', 'yes']);
    for (const id of ['G4', 'G6', 'G7']) {
      const dg = frag(w, w.Results.specialSection(E.evaluate(G(id).input)));
      assert.ok(dg.querySelector('[data-sp-me-group]'), id);
      assert.ok(!/(sp|td|w)_[a-z_]+|undefined|NaN|\{[a-z]+\}/.test(dg.textContent), `${lang} ${id}`);
    }
    const ds = frag(w, w.Results.specialSection(sys));
    assert.equal(ds.querySelector('img'), null);
    for (const x of [d9, d8, d11]) assert.ok(!/(sp|td|w)_[a-z_]+|undefined|NaN|\{[a-z]+\}/.test(x.textContent), lang);
  }
});

test('P18 shablon SP-04: BETA emas, APPROVED ga o\'tkazish mumkin; "manba bilan mos" yozuvi — G1 (ISO/TS 20914:2019 A.2.2)', () => {
  const t = byId['SP-04'];
  assert.doesNotMatch(JSON.stringify(t), /BETA/);
  const approved = JSON.parse(JSON.stringify(t)); approved.status = 'APPROVED';
  assert.equal(T.checkTemplate(approved, schema).errors.some(x => /BETA/.test(x)), false);
  const file = JSON.parse(read('templates/validation/builtin.json'));
  const rec = file.records.filter(r => r.templateId === 'SP-04');
  assert.deepEqual(rec.map(r => [r.testId, r.source, r.status]), [['G1', 'ISO/TS 20914:2019', 'verified']]);
});
