/* P09: TOP_DOWN rejimi UI qatlami — usta (wizard) holati → modelSpec, Excel'dan qo'yish (o'nlik vergul),
   qadamlar HTML'i, hisobot bo'limi (src/js/report.js) uch tilda: y, U, nisbiy U %, k, yondashuv nomi
   (ISO/IEC 17025 §7.8.3.1 c)), X11 / X12 ogohlantirishlari, escape (XSS), CSP qoidalari. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const E = require('../../src/engine/index.js');
const B = require('../../src/ui/topdown/build.js');
const V = require('../../src/ui/topdown/view.js');
const { roundResult, roundHalfAway, roundUpAway } = require('../../src/report/rounding.js');
const { fmt, fmtSci } = require('../../src/report/format.js');
const { escHtml } = require('../../src/ui/escape.js');
const NH4 = require('../cases/nordtest/nordtest-tr537-nh4n.json');
const DUP = require('../cases/nordtest/nordtest-tr537-nh4n-dup-high.json');
const A4 = require('../cases/quam/quam-a4-recovery.json');
const A6 = require('../cases/quam/quam-a6-empirical.json');

const ROOT = path.join(__dirname, '..', '..');
const LANGS = ['uz', 'ru', 'en'];
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const I18N_FILES = ['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js', 'src/js/i18n-regression.js', 'src/js/i18n-topdown.js'];

/** report.js ni jsdom'da yuklash (brauzerdagi tartib: escape → i18n → report) */
function loadReport(lang) {
  const dom = new JSDOM('<!doctype html><body><button id="btn-print"></button><div id="print-report"></div></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  const w = dom.window;
  w.eval(read('src/ui/escape.js'));
  w.__TR = w.eval(I18N_FILES.map(read).join('\n;\n') + '\n;TRANSLATIONS');
  w.i18n.lang = lang;
  w.Calc = { roundResult, roundHalfAway, roundUpAway, fmt, fmtSci };
  w.appState = { get: () => ({}), subscribe() {} };
  w.showToast = () => {};
  w.eval(read('src/js/report.js'));
  return w;
}
const frag = (w, html) => { const d = w.document.createElement('div'); d.innerHTML = html; return d; };
const ctxOf = w => ({ t: k => w.i18n.t(k), esc: escHtml });
const st = extra => ({ ...B.defaults(), ...extra });
const comma = v => String(v).replace('.', ',');

/* ── usta holati → modelSpec ── */

test('Nordtest NH₄-N: nazorat chegaralari + Excel\'dan qo\'yilgan PT jadvali (o\'nlik vergul, sarlavha) → manba natijasi', () => {
  const rounds = NH4.modelSpec.bias.rounds;
  const pt = 'Bias %\tsR %\tLabs\r\n' + rounds.map(r => `${comma(r.bias)}\t${r.sR}\t${r.nLab}`).join('\r\n');
  const { spec, bad } = B.buildSpec(st({ rwSources: ['control_limits'], limit: '3,34', sigmas: '2', bias: 'pt', ptRows: pt }));
  assert.deepEqual(bad, []);
  assert.equal(spec.approach, 'NORDTEST');
  assert.equal(spec.bias.rounds.length, 6);
  const r = E.evaluate(spec), ref = E.evaluate(NH4.modelSpec);
  assert.equal(r.uc, ref.uc); assert.equal(r.U, ref.U);
  assert.ok(Math.abs(r.U - 6.40) <= 0.01);                       // TR 537 §3.2, 6-qadam (p. 10)
});

test('dublikatlar: Excel\'dan qo\'yilgan 2 ustun (tab, o\'nlik vergul) → Appendix 5 natijasi bilan aynan bir xil', () => {
  const pairs = DUP.modelSpec.rw.components[1].pairs;
  const text = 'x1\tx2\n' + pairs.map(p => p.map(comma).join('\t')).join('\n');
  assert.equal(B.numericRows(text).rows.length, 26);
  assert.equal(B.numericRows(text).skipped, 1);
  const { spec, bad } = B.buildSpec(st({ rwSources: ['duplicates', 'stated'], dupPairs: text, statedS: '1,5', unit: 'µg/L' }));
  assert.deepEqual(bad, []);
  const r = E.evaluate(spec), ref = E.evaluate(DUP.modelSpec);
  assert.equal(r.rw.u, ref.rw.u);
});

test('QC qatori: bir ustunli matn (yangi satr / nuqta-vergul / bo\'sh joy) → s va CV', () => {
  assert.deepEqual(B.numericList('19,51\n20,01\r\n20,51').values, [19.51, 20.01, 20.51]);
  assert.deepEqual(B.numericList('1;2 3\t4').values, [1, 2, 3, 4]);
  assert.equal(B.numericList('1 abc 3').bad, 1);
  const { spec } = B.buildSpec(st({ qcValues: '19,51\n20,01\n20,51', unit: 'µg/L', bias: 'none' }));
  const r = E.evaluate(spec);
  assert.ok(Math.abs(r.rw.u - 2.5) < 0.005);                      // TR 537 §5.2 (p. 16): 0,5 / 20,01 → 2,5 %
});

test('QUAM A4: recovery (R_m, s, n foizda), tuzatish qo\'llanadi, gibrid qo\'shimcha hissa → u_c/P = 0,34', () => {
  const { spec, bad } = B.buildSpec(st({ rwSources: ['stated'], statedS: '27', bias: 'recovery_quam', quamMean: '90', quamS: '28', quamN: '42',
    quamCorrection: 'applied', additional: [{ name: 'Bir jinslilik', category: 'homogeneity', u: '20' }], y: '1', unit: 'mg/kg' }));
  assert.deepEqual(bad, []);
  assert.equal(spec.approach, 'QUAM_RECOVERY');
  const r = E.evaluate(spec), ref = E.evaluate(A4.modelSpec);
  assert.ok(Math.abs(r.uc / 100 - ref.uc) < 1e-12);               // foiz ↔ ulush
  assert.ok(Math.abs(r.recovery.t - ref.recovery.t) < 1e-12);
  assert.equal(r.hybrid, true);
});

test('QUAM A6 (empirik): s_R + quritish hissasi, mutlaq shkala', () => {
  const { spec } = B.buildSpec(st({ basis: 'sR', scale: 'absolute', unit: '% m/m', empirical: true, sR: '0,29', covers: ['matrix', 'sample_preparation'],
    additional: [{ name: 'Quritish', category: 'time', u: '0,115' }], y: '2,5' }));
  assert.equal(spec.approach, 'REPRODUCIBILITY');
  const r = E.evaluate(spec), ref = E.evaluate(A6.modelSpec);
  assert.equal(r.uc, ref.uc); assert.equal(r.relU, ref.relU);
  assert.deepEqual(r.warnings, []);
});

test('darajaga bog\'liq model: natija har doim mutlaq; CRM 4 va 5 ustun; PT 2 / 3 / 4 ustun', () => {
  const lv = B.buildSpec(st({ basis: 'level', scale: 'relative', unit: 'µg/L', s0: '3', s1: '40', y: '10' })).spec;
  assert.deepEqual(lv.scale, { unit: 'µg/L' });
  assert.equal(E.evaluate(lv).uc, 5);
  const crm4 = B.buildSpec(st({ bias: 'crm', crmRows: '3,48\t2,2\t12\t2,16' })).spec.bias.items[0];
  assert.deepEqual(crm4, { bias: 3.48, sBias: 2.2, n: 12, uRef: 2.16 });
  const crm5 = B.buildSpec(st({ bias: 'crm', crmRows: '11,5\t0,5\t11,9\t2,2\t12' })).spec.bias.items[0];
  assert.deepEqual(crm5, { certified: 11.5, U: 0.5, mean: 11.9, sBias: 2.2, n: 12 });
  const pt = t => B.buildSpec(st({ bias: 'pt', ptRows: t })).spec.bias.rounds[0];
  assert.deepEqual(pt('2\t1,8'), { bias: 2, uRef: 1.8 });
  assert.deepEqual(pt('2\t8,7\t23'), { bias: 2, sR: 8.7, nLab: 23 });
  assert.deepEqual(pt('81\t83\t10\t31'), { assigned: 81, result: 83, sR: 10, nLab: 31 });
});

test('bo\'sh maydon 0 deb olinmaydi: bo\'sh s → dvigatel xatosi; yaroqsiz son → bad ro\'yxati', () => {
  const empty = B.buildSpec(st({ rwSources: ['stated'], statedS: '' }));
  assert.deepEqual(empty.bad, []);
  assert.equal(E.evaluate(empty.spec).error, 'topdown_bad_data');
  assert.deepEqual(B.buildSpec(st({ rwSources: ['stated'], statedS: 'abc', y: '1,2,3' })).bad.sort(), ['statedS', 'y']);
  assert.equal(E.evaluate(B.buildSpec(st({ rwSources: [] })).spec).error, 'topdown_need_rw');
  // mutlaq shkala birliksiz — aniq xato
  assert.equal(E.evaluate(B.buildSpec(st({ scale: 'absolute', unit: '', rwSources: ['stated'], statedS: '1' })).spec).error, 'topdown_need_scale');
});

test('X11 / X12 usta orqali: qamralgan omil yana qo\'shilgan; empirik kattalikda bias', () => {
  const x11 = E.evaluate(B.buildSpec(st({ rwSources: ['stated'], statedS: '2', covers: ['balance'], additional: [{ name: 'Tarozi', category: 'balance', u: '0,5' }] })).spec);
  assert.ok(x11.warnings.some(w => w.rule === 'X11'));
  const ok = E.evaluate(B.buildSpec(st({ rwSources: ['stated'], statedS: '2', covers: [], empirical: true, additional: [{ name: 'Tarozi', category: 'balance', u: '0,5' }] })).spec);
  assert.deepEqual(ok.warnings, []);
  const base = { rwSources: ['stated'], statedS: '2', bias: 'crm', crmRows: '3\t2\t10\t1', empirical: true };
  const x12 = E.evaluate(B.buildSpec(st(base)).spec);
  assert.ok(x12.warnings.some(w => w.rule === 'X12'));
  assert.equal(x12.uc, 2);
  const lab = E.evaluate(B.buildSpec(st({ ...base, refByMethod: true })).spec);
  assert.ok(!lab.warnings.some(w => w.rule === 'X12'));
  assert.ok(lab.uc > 2);
});

/* ── usta ko'rinishi ── */

test('usta: 3 qadam, 1-qadamda ma\'lumot turlari (QC / dublikatlar / chegaralar / validatsiya; CRM / PT / recovery), uch tilda', () => {
  for (const lang of LANGS) {
    const w = loadReport(lang), ctx = ctxOf(w);
    const steps = frag(w, V.stepsHTML(st({ step: 2 }), ctx));
    assert.equal(steps.querySelectorAll('[data-td-step]').length, 3);
    assert.equal(steps.querySelector('[aria-current="step"]').dataset.tdStep, '2');
    const s1 = frag(w, V.step1HTML(st(), ctx));
    assert.deepEqual([...s1.querySelectorAll('[data-td-rw]')].map(e => e.dataset.tdRw), B.RW_SOURCES);
    assert.deepEqual([...s1.querySelectorAll('input[name="td-bias"]')].map(e => e.value), B.BIAS_SOURCES);
    assert.deepEqual([...s1.querySelectorAll('input[name="td-basis"]')].map(e => e.value), B.BASES);
    assert.ok(s1.querySelector('[data-td-flag="empirical"]'));
    assert.ok(!/td_[a-z_]+/.test(s1.textContent), lang + ': tarjima qilinmagan kalit');
  }
});

test('2-qadam: tanlangan ma\'lumot turiga mos maydonlar; qator sanog\'i; gibrid jadval', () => {
  const w = loadReport('uz'), ctx = ctxOf(w);
  const d = frag(w, V.step2HTML(st({ rwSources: ['control_series', 'duplicates'], bias: 'pt', dupPairs: '1\t2\nx\ty\n3\t4',
    additional: [{ name: 'Namuna olish', category: 'sampling', u: '1,5' }] }), ctx));
  assert.deepEqual([...d.querySelectorAll('[data-td-input]')].map(e => e.dataset.tdInput), ['control_series', 'duplicates', 'pt', 'additional', 'measurement']);
  assert.match(d.querySelector('[data-td-count="dupPairs"]').textContent, /2/);
  assert.equal(d.querySelectorAll('[data-td-additional] tbody tr').length, 1);
  assert.equal(d.querySelector('[data-td-add-key="category"]').value, 'sampling');
  const sr = frag(w, V.step2HTML(st({ basis: 'sR', scale: 'absolute', unit: 'MPa' }), ctx));
  assert.deepEqual([...sr.querySelectorAll('[data-td-input]')].map(e => e.dataset.tdInput), ['sR', 'additional', 'measurement']);
  assert.match(sr.textContent, /MPa/);
  assert.ok(!/\{u\}|td_[a-z_]+/.test(d.textContent + sr.textContent));
});

test('escape: foydalanuvchi matni (omil nomi, birlik, jadval matni) HTML sifatida talqin qilinmaydi', () => {
  const w = loadReport('en'), ctx = ctxOf(w);
  const evil = '<img src=x onerror=alert(1)>';
  const state = st({ unit: evil, qcValues: `1\n${evil}`, additional: [{ name: evil, category: 'sampling', u: '1' }], scale: 'absolute' });
  for (const html of [V.step1HTML(state, ctx), V.step2HTML(state, ctx)]) {
    const d = frag(w, html);
    assert.equal(d.querySelector('img'), null);
    assert.equal(d.querySelectorAll('script').length, 0);
  }
  // hisobot: omil nomi va birlik dvigatel natijasidan
  const r = E.evaluate({ format: 'uc-topdown/1', approach: 'NORDTEST', scale: { unit: evil }, isEmpiricalMeasurand: true,
    rw: { components: [{ type: 'stated', s: 1, unit: evil }], covers: ['sampling'] },
    additional: [{ id: 'a', name: evil, category: 'sampling', u: 1, unit: evil }], measurement: { value: 10, unit: evil } });
  assert.ok(!r.error, r.error);
  const d = frag(w, w.Results.topdownSection(r));
  assert.equal(d.querySelector('img'), null);
  assert.match(d.textContent, /<img src=x onerror=alert\(1\)>/); // matn sifatida ko'rinadi
});

/* ── hisobot bo'limi ── */

test('hisobot: y, U, nisbiy U %, k va yondashuv nomi (ISO/IEC 17025 §7.8.3.1 c)) — uch tilda', () => {
  const spec = { ...NH4.modelSpec, measurement: { value: 148, unit: 'µg/L' } };   // TR 537 §2 (p. 7): 148 ± 10 µg/L
  const r = E.evaluate(spec);
  for (const lang of LANGS) {
    const w = loadReport(lang);
    const d = frag(w, w.Results.topdownSection(r));
    const res = d.querySelector('[data-td-result]');
    assert.ok(res, lang);
    assert.equal(res.querySelector('[data-td-y]').textContent.trim(), '148.0 µg/L');   // y — U ning oxirgi xonasigacha
    assert.equal(res.querySelector('[data-td-u]').textContent.trim(), '9.5 µg/L');     // 148 · 6,40 % = 9,47 → 2 qiymatli raqam
    assert.equal(res.querySelector('[data-td-urel]').textContent.trim(), '6.4 %');
    assert.equal(res.querySelector('[data-td-k]').textContent.trim(), '2');
    const ap = res.querySelector('[data-td-approach]');
    assert.equal(ap.dataset.tdApproach, 'NORDTEST');
    assert.match(ap.textContent, /Nordtest TR 537/);
    assert.match(d.querySelector('[data-td-statement]').textContent, /148\.0 ± 9\.5/);
    assert.equal(d.querySelector('[data-td-scale]').dataset.tdScale, 'relative');
    assert.equal(d.querySelectorAll('[data-td-budget] tbody tr').length, 3);          // u(R_w), u(bias), u_c
    assert.ok(d.querySelector('[data-td-rw]') && d.querySelector('[data-td-bias]'));
    assert.ok(!/td_[a-z_]+|w_[a-z_]+|undefined|NaN/.test(d.textContent), lang);
    assert.match(d.textContent, new RegExp(E.ENGINE_VERSION.replace(/\./g, '\\.')));
  }
});

test('hisobot: y kiritilmagan — U faqat nisbiy; mutlaq shkala — U birlikda, nisbiy U y bo\'lsa', () => {
  const w = loadReport('en');
  const rel = frag(w, w.Results.topdownSection(E.evaluate(NH4.modelSpec)));
  assert.equal(rel.querySelector('[data-td-y]').textContent.trim(), '—');
  assert.equal(rel.querySelector('[data-td-u]').textContent.trim(), '—');
  assert.equal(rel.querySelector('[data-td-urel]').textContent.trim(), '6.4 %');
  const abs = frag(w, w.Results.topdownSection(E.evaluate(A6.modelSpec)));
  assert.equal(abs.querySelector('[data-td-y]').textContent.trim(), '2.50 % m/m');
  assert.equal(abs.querySelector('[data-td-u]').textContent.trim(), '0.62 % m/m');   // QUAM Table A6.5 (p. 86)
  assert.equal(abs.querySelector('[data-td-urel]').textContent.trim(), '25 %');     // QUAM Table A6.5 (p. 86)
  assert.ok(abs.querySelector('[data-td-empirical]'));
  assert.equal(abs.querySelector('[data-td-approach]').dataset.tdApproach, 'REPRODUCIBILITY');
});

test('hisobot: QUAM recovery — R_m, t-test, tuzatilgan natija', () => {
  const w = loadReport('uz');
  const d = frag(w, w.Results.topdownSection(E.evaluate(A4.modelSpec)));
  const rec = d.querySelector('[data-td-recovery]');
  assert.equal(rec.dataset.tdRecovery, 'significant');
  assert.match(rec.textContent, /2\.31/);
  assert.equal(d.querySelector('[data-td-correction]').dataset.tdCorrection, 'applied');
  assert.match(d.querySelector('[data-td-statement]').textContent, /1\.11 ± 0\.75/);   // y/R_m = 1,1111; U = 2 · 0,377
});

test('hisobot: X11 va X12 ogohlantirishlari (belgi, matn, manba havolasi) uch tilda; chiqarilgan qator byudjetda belgilangan', () => {
  const r = E.evaluate({ format: 'uc-topdown/1', approach: 'NORDTEST', scale: { relative: true }, isEmpiricalMeasurand: true,
    rw: { components: [{ type: 'stated', s: 2, relative: true }] },
    bias: { type: 'crm', relative: true, items: [{ bias: 3, sBias: 2, n: 10, uRef: 1 }] },
    additional: [{ id: 'rep', name: 'Repeat', category: 'repeatability', u: 1, relative: true }] });
  for (const lang of LANGS) {
    const w = loadReport(lang);
    const d = frag(w, w.Results.topdownSection(r));
    const x11 = d.querySelector('[data-td-warning="x11_double_counting"]'), x12 = d.querySelector('[data-td-warning="x12_empirical_bias"]');
    assert.ok(x11 && x12, lang);
    assert.match(x11.textContent, /X11/); assert.match(x11.textContent, /Repeat/); assert.match(x11.textContent, /Nordtest TR 537/);
    assert.match(x12.textContent, /X12/); assert.match(x12.textContent, /QUAM:2012 §7\.9\.2/);
    assert.ok(!/\{v\}/.test(d.textContent), lang);
    assert.equal(d.querySelector('[data-td-row="bias"] [data-td-flag]').dataset.tdFlag, 'X12');
    assert.ok(d.querySelector('[data-td-row="bias"]').classList.contains('td-excluded'));
    assert.equal(d.querySelector('[data-td-row="rep"] [data-td-flag]').dataset.tdFlag, 'X11');
  }
});

test('hisobot: xato — uch tilda matn (nisbiy/mutlaq aralashmasi)', () => {
  const r = E.evaluate({ format: 'uc-topdown/1', approach: 'NORDTEST', scale: { relative: true },
    rw: { components: [{ type: 'stated', s: 0.5, unit: 'µg/L' }] } });
  assert.equal(r.error, 'topdown_mixed_scale');
  const seen = new Set();
  for (const lang of LANGS) {
    const w = loadReport(lang);
    const d = frag(w, w.Results.topdownSection(r));
    const e = d.querySelector('[data-td-error="topdown_mixed_scale"]');
    assert.ok(e && !/err_/.test(e.textContent), lang);
    seen.add(e.textContent);
  }
  assert.equal(seen.size, 3);
});

test('U = 0 hisobotga ogohlantirishsiz chiqmaydi', () => {
  const w = loadReport('uz');
  const r = E.evaluate({ format: 'uc-topdown/1', approach: 'NORDTEST', scale: { relative: true }, isEmpiricalMeasurand: true,
    rw: { components: [{ type: 'stated', s: 0, relative: true }] } });
  assert.equal(r.U, 0);
  assert.ok(frag(w, w.Results.topdownSection(r)).querySelector('[data-td-warning="zero_u"]'));
});

/* ── sahifa va CSP ── */

test('index.html: "Top-down" yorlig\'i, ildiz element, skriptlar; UI modullarida inline handler va eval yo\'q', () => {
  const html = read('index.html');
  assert.match(html, /data-tab="topdown" data-i18n="tab_topdown"/);
  assert.match(html, /id="tab-topdown"[\s\S]*id="topdown-root"/);
  assert.match(html, /<script src="src\/js\/i18n-topdown\.js"><\/script>/);
  assert.match(html, /<script type="module" src="src\/ui\/topdown\/app\.js"><\/script>/);
  for (const f of ['src/ui/topdown/app.js', 'src/ui/topdown/view.js', 'src/ui/topdown/build.js']) {
    const src = read(f);
    assert.ok(!/\son[a-z]+\s*=\s*["'`]/i.test(src), f);
    assert.ok(!/\beval\(|new Function\(/.test(src), f);
  }
  // sof modullar DOM'ga tegmaydi
  for (const f of ['src/ui/topdown/view.js', 'src/ui/topdown/build.js']) assert.ok(!/\b(document|window|localStorage)\b/.test(read(f)), f);
});
