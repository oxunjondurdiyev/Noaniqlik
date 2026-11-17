/* P08: REGRESSION rejimi UI qatlami — jadvalga qo'yish (paste) va o'nlik vergul, SVG grafiklar,
   hisobot bo'limi (src/js/report.js) uch tilda, χ² ogohlantirishi, escape (XSS), CSP qoidalari. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const E = require('../../src/engine/index.js');
const P = require('../../src/ui/regression/parse.js');
const V = require('../../src/ui/regression/view.js');
const { roundResult, roundHalfAway, roundUpAway } = require('../../src/report/rounding.js');
const { fmt, fmtSci } = require('../../src/report/format.js');
const { escHtml } = require('../../src/ui/escape.js');
const H3 = require('../cases/jcgm100/jcgm100-h3.json');
const A5 = require('../cases/quam/quam-a5-calibration.json');

const ROOT = path.join(__dirname, '..', '..');
const LANGS = ['uz', 'ru', 'en'];
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const I18N_FILES = ['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js', 'src/js/i18n-regression.js', 'src/js/i18n-topdown.js']; // report.js top-down bo'limi (P09) kalitlari ham shu yerda tekshiriladi

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
const LINE = [[1, 2.1], [2, 3.9], [3, 6.2], [4, 7.8], [5, 10.1], [6, 12.2]];

/* ── qo'yish (paste) ── */
test('o\'nlik vergul va bo\'shliqlar: "0,028" → 0.028; "1 234,5" → 1234.5; "−0,5" → −0.5; bo\'sh → null; matn → NaN', () => {
  assert.equal(P.parseNumber('0,028'), 0.028);
  assert.equal(P.parseNumber(' 1 234,5 '), 1234.5);
  assert.equal(P.parseNumber('−0,5'), -0.5);
  assert.equal(P.parseNumber('1.5e-3'), 0.0015);
  assert.equal(P.parseNumber(''), null);
  assert.ok(Number.isNaN(P.parseNumber('abc')));
  assert.ok(Number.isNaN(P.parseNumber('1,2,3')));
});

test('Excel\'dan qo\'yish: tab bilan ajratilgan 2 / 3 / 4 ustun, o\'nlik vergul, sarlavha qatori tashlanadi', () => {
  const two = P.gridToRows(P.parseGrid('c\tA\r\n0,1\t0,028\r\n0,3\t0,084\r\n'), 0);
  assert.deepEqual(two.rows, [{ x: '0.1', y: '0.028' }, { x: '0.3', y: '0.084' }]);
  assert.equal(two.skipped, 1);
  assert.deepEqual(P.gridToRows(P.parseGrid('1\t2,1\t0,1\n2\t3,9\t0,1'), 0).rows[0], { x: '1', y: '2.1', uy: '0.1' });
  assert.deepEqual(P.gridToRows(P.parseGrid('1\t0,01\t2,1\t0,1'), 0).rows[0], { x: '1', ux: '0.01', y: '2.1', uy: '0.1' });
  // bo'sh katak saqlanadi (Excel'da u(x) ustuni bo'sh)
  assert.deepEqual(P.gridToRows(P.parseGrid('1\t\t2,1\t0,1'), 0).rows[0], { x: '1', y: '2.1', uy: '0.1' });
  // y ustuniga qo'yish: shu ustundan boshlab ketma-ket (y, u(y))
  assert.deepEqual(P.gridToRows(P.parseGrid('2,1\t0,1\n3,9\t0,2'), 2).rows, [{ y: '2.1', uy: '0.1' }, { y: '3.9', uy: '0.2' }]);
  // nuqta-vergul va bo'sh joy bilan ajratilgan matn; vergul — ustun ajratuvchi EMAS
  assert.deepEqual(P.gridToRows(P.parseGrid('1;2,5\n2;3,5'), 0).rows, [{ x: '1', y: '2.5' }, { x: '2', y: '3.5' }]);
  assert.deepEqual(P.gridToRows(P.parseGrid('1  2,5\n2  3,5'), 0).rows, [{ x: '1', y: '2.5' }, { x: '2', y: '3.5' }]);
  assert.deepEqual(P.parseList('0,071 0,072; 0.070'), [0.071, 0.072, 0.07]);
  assert.deepEqual(P.parsePairs('-10\t0,021\n0\t0,010'), [{ x: -10, U: 0.021 }, { x: 0, U: 0.01 }]);
});

test('qo\'yilgan QUAM A5.2 jadvali (o\'nlik vergul bilan) → dvigatel: nuqta bilan kiritilgan ma\'lumot bilan aynan bir xil natija', () => {
  const text = A5.modelSpec.points.map(p => `${String(p.x).replace('.', ',')}\t${String(p.y).replace('.', ',')}`).join('\r\n');
  const rows = P.gridToRows(P.parseGrid(text), 0).rows;
  const pts = P.rowsToPoints([...rows, { x: '', ux: '', y: '', uy: '' }]);
  assert.equal(pts.length, 15);
  const r = E.evaluate({ format: 'uc-regression/1', method: 'OLS', points: pts });
  const ref = E.evaluate({ format: 'uc-regression/1', method: 'OLS', points: A5.modelSpec.points });
  assert.deepEqual(r.params, ref.params);
});

/* ── SVG ── */
test('SVG grafik: nuqtalar, xatolik chiziqlari, egri chiziq; qoldiqlar grafigi; skript yo\'q', () => {
  const w = loadReport('en');
  const r = E.evaluate({ format: 'uc-regression/1', method: 'WTLS', points: LINE.map(([x, y]) => ({ x, y, ux: 0.05, uy: 0.2 })), inverse: [{ y0: 5, uy0: 0.2 }], predict: [{ x: 2.5 }] });
  const f = frag(w, V.plotsHTML(r, ctxOf(w)));
  const fit = f.querySelector('svg.rg-plot-fit'), res = f.querySelector('svg.rg-plot-res');
  assert.ok(fit && res);
  assert.equal(fit.querySelectorAll('circle.rg-pt').length, 6);
  assert.equal(fit.querySelectorAll('line.rg-err').length, 12); // har bir nuqtada u(x) va u(y)
  assert.equal(fit.querySelectorAll('polyline.rg-curve').length, 1);
  assert.equal(fit.querySelectorAll('circle.rg-inv-pt').length, 1);
  assert.equal(fit.querySelectorAll('rect.rg-prd-pt').length, 1);
  assert.equal(res.querySelectorAll('circle.rg-pt').length, 6);
  assert.equal(res.querySelectorAll('line.rg-zero').length, 1);
  assert.equal(f.querySelectorAll('script').length, 0);
  assert.ok(!/NaN|Infinity|undefined/.test(f.innerHTML));
  // u(y) berilmagan (OLS) — xatolik chiziqlari chizilmaydi
  const o = frag(w, V.fitPlotSVG(E.evaluate(H3.modelSpec), ctxOf(w)));
  assert.equal(o.querySelectorAll('line.rg-err').length, 0);
  assert.equal(o.querySelectorAll('circle.rg-pt').length, 11);
});

test('jadval HTML: 4 ustun (x, u(x), y, u(y)), qiymatlar escape qilingan, inline hodisa yo\'q', () => {
  const w = loadReport('uz');
  const html = V.tableHTML([{ x: '1', ux: '', y: '"><img src=x onerror=alert(1)>', uy: '0,1' }], ctxOf(w));
  const f = frag(w, html);
  assert.equal(f.querySelectorAll('input.rg-cell').length, 4);
  assert.equal(f.querySelector('img'), null);
  assert.equal(f.querySelector('[data-rg-col="y"]').value, '"><img src=x onerror=alert(1)>');
  assert.ok(!/\son[a-z]+=/i.test(html.replace(/value="[^"]*"/g, '')));
});

/* ── hisobot bo'limi ── */
test('hisobotda regressiya bo\'limi: usul, parametrlar, kovariatsiya, χ², teskari bashorat — uch tilda', () => {
  const spec = { format: 'uc-regression/1', method: 'WLS', units: { x: 'mg/L', y: '1' }, points: LINE.map(([x, y]) => ({ x, y, uy: 0.2 })), inverse: [{ y0: [5.0, 5.2], uy0: 0.15 }], predict: [{ x: 3.5 }] };
  const r = E.evaluate(spec);
  for (const l of LANGS) {
    const w = loadReport(l);
    const T = k => w.i18n.t(k);
    const f = frag(w, w.Results.regressionSection(r, { print: true, residualTable: true }));
    assert.ok(f.querySelector('[data-rg-report]'), l);
    assert.equal(f.querySelector('[data-rg-method]').dataset.rgMethod, 'WLS');
    assert.equal(f.querySelector('[data-rg-method]').textContent, T('rg_m_WLS'));
    assert.equal(f.querySelectorAll('[data-rg-params] tbody tr').length, 2);
    assert.equal(f.querySelectorAll('.rg-matrix').length, 2); // kovariatsiya va korrelyatsiya
    assert.equal(f.querySelectorAll('.rg-matrix')[0].querySelectorAll('td.num').length, 4);
    assert.equal(f.querySelector('[data-rg-chi2]').dataset.rgChi2, 'pass');
    assert.ok(f.querySelector('[data-rg-chi2]').textContent.includes(T('rg_chi2_pass')), l);
    assert.equal(f.querySelector('[data-rg-basis]').textContent, T('rg_basis_prior'));
    assert.equal(f.querySelectorAll('[data-rg-inverse] tbody tr').length, 1);
    assert.equal(f.querySelectorAll('[data-rg-predict] tbody tr').length, 1);
    assert.ok(f.textContent.includes(T('rg_report_section')) && f.textContent.includes(T('rg_inverse_res')) && f.textContent.includes(T('rg_cov')), l);
    assert.ok(f.textContent.includes('mg/L'));
    assert.ok(!/undefined|NaN|\{v\}|\{P\}|\{rule\}|rg_[a-z_]+|w_[a-z_]+/.test(f.textContent), `${l}: tarjima qilinmagan kalit yoki bo'sh o'rin`);
  }
});

test('χ² testi yiqilganda ogohlantirish hisobot bo\'limida uch tilda chiqadi (regression_chi2_fail)', () => {
  const r = E.evaluate({ format: 'uc-regression/1', method: 'WLS', points: LINE.map(([x, y]) => ({ x, y, uy: 0.01 })) });
  assert.equal(r.chi2.pass, false);
  const seen = new Set();
  for (const l of LANGS) {
    const w = loadReport(l);
    const f = frag(w, w.Results.regressionSection(r, {}));
    const box = f.querySelector('[data-rg-warnings] [data-rg-warning="regression_chi2_fail"]');
    assert.ok(box, `${l}: ogohlantirish yo'q`);
    const want = w.i18n.t('w_regression_chi2_fail').replace('{v}', r.warnings.find(x => x.code === 'regression_chi2_fail').value);
    assert.equal(box.textContent, '⚠ ' + want, l);
    assert.equal(f.querySelector('[data-rg-chi2]').dataset.rgChi2, 'fail');
    assert.ok(f.querySelector('[data-rg-chi2] .badge-red').textContent === w.i18n.t('rg_chi2_fail'));
    seen.add(box.textContent);
  }
  assert.equal(seen.size, 3, 'uch tilda uch xil matn');
});

test('hisobot: GUM H.3 — tenglama H.14 ko\'rinishida (2 qiymatli raqam noaniqlik), b(30 °C) = (−0,1494 ± U), χ² qo\'llanmaydi', () => {
  const w = loadReport('en');
  const r = E.evaluate(H3.modelSpec);
  const f = frag(w, w.Results.regressionSection(r, { print: true }));
  const rows = [...f.querySelectorAll('[data-rg-params] tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent));
  assert.deepEqual(rows[0].slice(0, 3), ['a', '-0.1712', '0.0029']);   // H.14: −0,171 2(29)
  assert.deepEqual(rows[1].slice(0, 3), ['b', '0.00218', '0.00067']);  // H.14: 0,002 18(67)
  assert.equal(f.querySelector('[data-rg-equation]').textContent, 'y = -0.1712 + 0.00218·(x − 20)');
  assert.equal(f.querySelector('[data-rg-chi2]').dataset.rgChi2, 'na');
  assert.equal(f.querySelector('[data-rg-basis]').dataset.rgBasis, 'posterior');
  const pr = f.querySelector('[data-rg-predict] tbody tr');
  assert.ok(pr.textContent.includes('(-0.1494 ± 0.0096) °C'), pr.textContent); // U = t_0,9545(9)·0,00414, 2 qiymatli raqam
  assert.ok(pr.querySelector('.badge-orange')); // diapazondan tashqarida
  assert.ok(f.querySelector('[data-rg-warning="regression_extrapolation"]'));
});

test('hisobot: xato kodi va birlik matni escape qilinadi; teskari bashorat xatosi qatorda ko\'rsatiladi; U — diapazon unverified', () => {
  const w = loadReport('ru');
  const err = frag(w, w.Results.regressionSection({ error: 'regression_zero_u', detail: '<b>4</b>' }, {}));
  assert.equal(err.querySelector('b'), null);
  assert.ok(err.textContent.includes(w.i18n.t('err_regression_zero_u')) && err.textContent.includes('<b>4</b>'));
  const r = E.evaluate({ format: 'uc-regression/1', method: 'WLS', units: { x: '<i>mg</i>', y: '' }, points: LINE.map(([x, y]) => ({ x, y, uy: 0.2 })),
    inverse: [{ y0: 5 }], uRange: { points: [{ x: 1, U: 0.1 }, { x: 2, U: 0.3 }, { x: 3, U: 0.2 }], mode: 'linear' } });
  const f = frag(w, w.Results.regressionSection(r, {}));
  assert.equal(f.querySelector('i'), null);
  assert.ok(f.querySelector('[data-rg-inverse]').textContent.includes(w.i18n.t('err_regression_need_uy0')));
  assert.equal(f.querySelector('[data-rg-urange]').dataset.rgUrange, 'linear');
  assert.ok(f.textContent.includes(w.i18n.t('rg_urange_unverified')) && f.textContent.includes(w.i18n.t('rg_urange_applied')));
  assert.ok(f.querySelector('[data-rg-warning="urange_unverified"]'));
});

/* ── i18n va CSP ── */
test('dvigatelning har bir regressiya ogohlantirishi (w_*) va xato kodi (err_*) uch tilda bor', () => {
  const w = loadReport('uz');
  const TR = w.__TR;
  const dir = path.join(ROOT, 'src/engine/regression');
  const src = fs.readdirSync(dir).map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const warn = new Set([...src.matchAll(/^\s{2}((?:regression|urange)_[a-z0-9_]+): \{ severity:/gm)].map(m => m[1]));
  const errs = new Set([...src.matchAll(/error: '((?:regression|urange)_[a-z0-9_]+)'/g)].map(m => m[1]));
  assert.ok(warn.size >= 11 && errs.size >= 15, `${warn.size} / ${errs.size}`);
  const missing = [];
  for (const l of LANGS) {
    for (const c of warn) if (!TR[l]['w_' + c]) missing.push(`${l}.w_${c}`);
    for (const c of errs) if (!TR[l]['err_' + c]) missing.push(`${l}.err_${c}`);
  }
  assert.deepEqual(missing, []);
});

test('src/ui/regression va report.js dagi t(\'…\') / i18n.t(\'…\') kalitlari va dinamik kalit oilalari lug\'atda bor', () => {
  const w = loadReport('uz');
  const TR = w.__TR;
  const keys = new Set();
  for (const f of ['src/ui/regression/app.js', 'src/ui/regression/view.js', 'src/js/report.js']) {
    for (const m of read(f).matchAll(/\bt\('([a-z0-9_]+)'\)/g)) keys.add(m[1]);
  }
  for (const k of ['OLS', 'WLS', 'WTLS', 'GLS']) keys.add('rg_m_' + k);
  for (const k of [1, 2, 3]) keys.add('rg_deg_' + k);
  for (const k of ['auto', 'prior', 'posterior']) keys.add('rg_sigma_' + k);
  for (const k of ['prior', 'posterior']) keys.add('rg_basis_' + k);
  for (const k of ['linear', 'max']) keys.add('rg_urange_' + k);
  for (const k of ['x', 'ux', 'y', 'uy']) keys.add('rg_col_' + k);
  for (const k of ['given', 'residual', 'common']) keys.add('rg_uy0_' + k);
  keys.add('tpl_missing_regression_points');
  const missing = [];
  for (const k of keys) for (const l of LANGS) if (!TR[l][k]) missing.push(`${l}.${k}`);
  assert.deepEqual(missing, []);
});

test('CSP: regressiya UI\'da inline hodisa/skript yo\'q; index.html da yorliq, konteyner va modul skripti ulangan', () => {
  for (const f of ['src/ui/regression/app.js', 'src/ui/regression/view.js', 'src/ui/regression/parse.js']) {
    const src = read(f);
    assert.ok(!/\bon(click|input|change|paste|load|error)\s*=/.test(src), f);
    assert.ok(!/<script|javascript:|eval\(|new Function/.test(src), f);
  }
  const html = read('index.html');
  assert.match(html, /data-tab="regression" data-i18n="tab_regression"/);
  assert.match(html, /id="tab-regression"[\s\S]*id="regression-root"/);
  assert.match(html, /<script type="module" src="src\/ui\/regression\/app\.js"><\/script>/);
  assert.match(html, /<script src="src\/js\/i18n-regression\.js"><\/script>/);
  // sof modullar: DOM'ga tegmaydi (Node'da test qilinadi)
  for (const f of ['src/ui/regression/view.js', 'src/ui/regression/parse.js']) assert.ok(!/document\.|window\.|localStorage/.test(read(f)), f);
});
