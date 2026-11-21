/* P09: Top-down ustasi kontrolleri (src/ui/topdown/app.js) — jsdom'da boshidan oxirigacha:
   1-qadam (ma'lumot turi) → 2-qadam (jadval / qo'yilgan matn) → 3-qadam (byudjet va natija);
   shablon yuklash (TD-03), gibrid qator qo'shish, X11, til almashtirish, saqlash (shaxsiy ma'lumot yo'q). */
'use strict';
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { JSDOM } = require('jsdom');
const { roundResult, roundHalfAway, roundUpAway } = require('../../src/report/rounding.js');
const { fmt, fmtSci } = require('../../src/report/format.js');
const { reportBridge } = require('./lib.js');
const TD03 = require('../../templates/builtin/TD-03.json');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const I18N_FILES = ['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js', 'src/js/i18n-regression.js', 'src/js/i18n-topdown.js', 'src/js/i18n-linter.js', 'src/js/i18n-report.js', 'src/js/i18n-p20.js'];

let w, doc, toasts;
const $ = sel => doc.querySelector(sel);
const fire = (el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true }));
function setValue(sel, value) { const el = typeof sel === 'string' ? $(sel) : sel; el.value = value; fire(el, 'input'); fire(el, 'change'); }
function setChecked(sel, on) { const el = $(sel); el.checked = on; fire(el, 'change'); }
const click = sel => fire(typeof sel === 'string' ? $(sel) : sel, 'click');

before(async () => {
  const dom = new JSDOM('<!doctype html><body><div id="topdown-root"></div><button id="btn-print"></button><div id="print-report"></div></body>',
    { url: 'https://example.test/', runScripts: 'outside-only' });
  w = dom.window; doc = w.document; toasts = [];
  w.eval(read('src/ui/escape.js'));
  w.eval(I18N_FILES.map(read).join('\n;\n'));
  w.i18n.lang = 'uz';
  w.Calc = { roundResult, roundHalfAway, roundUpAway, fmt, fmtSci, ...reportBridge };   // P05a: linter / topilmalar bloki
  w.appState = { get: () => ({}), subscribe() {} };
  w.showToast = (m, type) => toasts.push({ m, type });
  w.eval(read('src/js/report.js'));
  w.HTMLElement.prototype.scrollIntoView = () => {};
  global.window = w; global.document = doc;
  await import(pathToFileURL(path.join(ROOT, 'src/ui/topdown/app.js')).href);
});

test('usta chiziladi: 1-qadam faol, 3 qadam, hodisalar addEventListener orqali (inline handler yo\'q)', () => {
  assert.ok(w.UCTopDown);
  assert.equal(doc.querySelectorAll('[data-td-step]').length, 3);
  assert.equal($('[aria-current="step"]').dataset.tdStep, '1');
  assert.equal(doc.querySelectorAll('#topdown-root [onclick], #topdown-root [oninput], #topdown-root [onchange]').length, 0);
});

test('Nordtest NH₄-N boshidan oxirigacha: chegaralar + qo\'yilgan PT jadvali → y, U, nisbiy U %, k, yondashuv nomi', () => {
  setChecked('[data-td-rw="control_series"]', false);
  setChecked('[data-td-rw="control_limits"]', true);
  const pt = $('input[name="td-bias"][value="pt"]'); pt.checked = true; fire(pt, 'change');
  setValue('#td-unit', 'µg/L');
  click('[data-td-act="next"]');
  assert.equal($('[aria-current="step"]').dataset.tdStep, '2');
  assert.deepEqual([...doc.querySelectorAll('[data-td-input]')].map(e => e.dataset.tdInput), ['control_limits', 'pt', 'additional', 'measurement']);
  setValue('#td-limit', '3,34');
  setValue('#td-ptRows', 'Bias\tsR\tn\n2,5\t10\t31\n2,7\t7\t36\n1,9\t8\t32\n1,4\t10\t35\n1,8\t7\t36\n2,9\t11\t34');
  assert.match($('[data-td-count="ptRows"]').textContent, /6/);       // sarlavha qatori tashlangan
  setValue('#td-y', '148');
  click('[data-td-act="next"]');                                        // Hisoblash
  assert.equal($('[aria-current="step"]').dataset.tdStep, '3');
  const r = w.UCTopDown.current().result;
  assert.equal(r.error, undefined);
  assert.ok(Math.abs(r.uc - 3.20) <= 0.005);                           // TR 537 §3.2 (p. 10)
  assert.equal($('[data-td-y]').textContent.trim(), '148.0 µg/L');
  assert.equal($('[data-td-u]').textContent.trim(), '9.5 µg/L');
  assert.equal($('[data-td-urel]').textContent.trim(), '6.4 %');
  assert.equal($('[data-td-k]').textContent.trim(), '2');
  assert.match($('[data-td-approach]').textContent, /Nordtest TR 537/);
  assert.ok($('[data-td-act="print"]'));
});

test('orqaga qaytganda kiritilgan ma\'lumot saqlangan; saqlangan holatda shaxsiy maydon yo\'q', () => {
  click('[data-td-act="back"]');
  assert.equal($('#td-limit').value, '3,34');
  const saved = JSON.parse(w.localStorage.getItem('uc_topdown_v1'));
  assert.equal(saved.limit, '3,34');
  assert.ok(!Object.keys(saved).some(k => /name|phone|email|inn|stir|fio/i.test(k) && k !== 'template'));
});

test('yaroqsiz son: hisob bajarilmaydi, xato matni ko\'rsatiladi (0 deb olinmaydi)', () => {
  setValue('#td-limit', 'abc');
  click('[data-td-act="next"]');
  const e = $('[data-td-error]');
  assert.equal(e.dataset.tdError, 'topdown_bad_data');
  assert.ok(toasts.some(t => t.type === 'error'));
  click('[data-td-act="back"]');
  setValue('#td-limit', '3,34');
});

test('shablon TD-03 (DRAFT, empirik, T-03 bilan bog\'langan): banner, bo\'sh sonli maydonlar; gibrid qator + X11', () => {
  assert.equal(w.UCTopDown.loadTemplate(TD03, { silent: true }), true);
  const banner = $('[data-td-template]');
  assert.equal(banner.dataset.tdTemplate, 'TD-03');
  assert.ok(banner.querySelector('[data-draft-warning]'));
  assert.equal(banner.querySelector('[data-td-linked]').dataset.tdLinked, 'T-03');
  assert.equal($('[data-td-flag="empirical"]').checked, true);
  click('[data-td-act="next"]');
  const us = () => [...doc.querySelectorAll('[data-td-add-key="u"]')];
  assert.equal(us().length, 4);
  assert.ok(us().every(i => i.value === ''));                           // raqam o'ylab topilmagan
  setValue('#td-dupPairs', '30,1\t31,0\n25,2\t24,6\n41,0\t42,3\n33,3\t32,9');
  ['1,0', '0,8', '0,5', '0,4'].forEach((v, i) => setValue(us()[i], v));
  click('[data-td-act="add-row"]');
  assert.equal(us().length, 5);
  setValue(doc.querySelectorAll('[data-td-add-key="name"]')[4], 'Takror <b>x</b>');
  setValue(doc.querySelectorAll('[data-td-add-key="category"]')[4], 'repeatability');
  setValue(us()[4], '1,5');
  click('[data-td-act="next"]');
  const r = w.UCTopDown.current().result;
  assert.equal(r.error, undefined);
  assert.equal(r.isEmpiricalMeasurand, true);
  assert.equal(r.bias, null);
  const x11 = $('[data-td-warning="x11_double_counting"]');
  assert.ok(x11 && /X11/.test(x11.textContent));
  assert.match(x11.textContent, /Takror <b>x<\/b>/);                     // matn sifatida, HTML emas
  assert.equal(doc.querySelectorAll('#topdown-root b').length, 0);
  assert.ok($('[data-td-empirical]'));
  assert.ok(toasts.some(t => /X11/.test(t.m)));
});

test('til almashtirish: usta va natija qayta chiziladi (ru, en)', () => {
  const before = $('.panel-title').textContent;
  w.i18n.lang = 'ru'; doc.dispatchEvent(new w.Event('langchange'));
  const ru = $('.panel-title').textContent;
  assert.notEqual(ru, before);
  assert.match($('[data-td-warning="x11_double_counting"]').textContent, /Двойной учёт/);
  w.i18n.lang = 'en'; doc.dispatchEvent(new w.Event('langchange'));
  assert.match($('[data-td-warning="x11_double_counting"]').textContent, /Double counting/);
  w.i18n.lang = 'uz'; doc.dispatchEvent(new w.Event('langchange'));
});

test('X12 savoli (egasi qarori 2026-11-17): empirik + bias → majburiy savol; javobsiz — eslatma, hissa qo\'shiladi + X12; "boshqa usul" — chiqariladi', () => {
  click('[data-td-act="reset"]');
  setChecked('[data-td-rw="control_series"]', false);
  setChecked('[data-td-rw="stated"]', true);
  const crm = $('input[name="td-bias"][value="crm"]'); crm.checked = true; fire(crm, 'change');
  assert.equal($('[data-td-refmethod]'), null);                         // empirik emas — savol yo'q
  setChecked('[data-td-flag="empirical"]', true);
  assert.equal($('[data-td-refmethod]').dataset.tdRefmethod, 'unanswered');
  toasts.length = 0;
  click('[data-td-act="next"]');
  assert.ok(toasts.some(t => t.type === 'error'), 'javobsiz o\'tishda eslatma');
  setValue('#td-statedS', '2');
  setValue('#td-crmRows', '3\t2\t10\t1');
  click('[data-td-act="next"]');
  let r = w.UCTopDown.current().result;
  assert.ok(r.uc > 2);                                                   // konservativ: bias qo'shilgan
  assert.ok($('.warn-box [data-td-warning="x12_empirical_bias"]'));
  click('[data-td-step="1"]');
  setValue('#td-refMethod', 'other');
  assert.equal($('[data-td-refmethod]').dataset.tdRefmethod, 'answered');
  click('[data-td-step="3"]');
  r = w.UCTopDown.current().result;
  assert.equal(r.uc, 2);
  assert.equal($('[data-td-warning="x12_empirical_bias"]'), null);
  assert.ok($('[data-td-row="bias"]').classList.contains('td-excluded'));
  click('[data-td-step="1"]');
  setValue('#td-refMethod', 'same');
  click('[data-td-step="3"]');
  r = w.UCTopDown.current().result;
  assert.ok(r.uc > 2);
  assert.equal(doc.querySelectorAll('[data-td-warning^="x12"]').length, 0);
});

test('tozalash: holat boshlang\'ich, shablon uziladi', () => {
  click('[data-td-act="reset"]');
  assert.equal($('[data-td-template]'), null);
  assert.equal($('[aria-current="step"]').dataset.tdStep, '1');
  assert.equal(w.UCTopDown.current(), null);
  assert.deepEqual(w.UCTopDown.getState().additional, []);
});
