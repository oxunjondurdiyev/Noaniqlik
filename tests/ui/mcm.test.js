/* P20 (audit 21.11.2026, MET-01) — natijalar ekrani: LPU → MCM qaror qoidasi MCM ni talab qilsa, hisobdan keyin
   Monte-Karlo AVTOMATIK boshlanadi (window.UCMonteCarlo — Web Worker; bu yerda soxta bajaruvchi), holat satri
   "bajarilmoqda → tasdiqlandi / rad etildi / yaqinlashmadi"; autoMcm = false — boshlanmaydi, ogohlantirish va QORALAMA qoladi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const E = require('../../src/engine/index.js');
const { roundResult, roundHalfAway, roundUpAway } = require('../../src/report/rounding.js');
const { fmt, fmtSci } = require('../../src/report/format.js');
const { reportBridge } = require('./lib.js');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const pctx = { window: {} };
vm.runInNewContext(read('src/data/presets.js'), pctx);
const DENSITY = JSON.parse(JSON.stringify(pctx.window.PRESETS.density));
const I18N_FILES = ['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js', 'src/js/i18n-regression.js', 'src/js/i18n-topdown.js', 'src/js/i18n-special.js', 'src/js/i18n-linter.js', 'src/js/i18n-report.js', 'src/js/i18n-shell.js', 'src/js/i18n-p20.js'];

/** "density" namunasi — ilovaning standart holati bilan (paired = true, P = 0,9545) */
const densityState = () => ({ params: DENSITY.params, n: 5, measurements: DENSITY.sampleData, directions: [], model: { formula: DENSITY.formula, unit: DENSITY.unit },
  settings: { paired: true, P: 0.9545, modelKind: 'unknown' }, covB: {}, typeB: DENSITY.typeBComponents.map(c => ({ ...c })) });
const NORMAL = () => ({ params: ['X1', 'X2'], n: 1, measurements: { X1: [10], X2: [5] }, directions: [], model: { formula: 'Y = X1 + X2', unit: 'g' }, settings: { paired: false, P: 0.9545 }, covB: {},
  typeB: [{ name: 'c1', param: 'X1', halfWidth: 0.02, distribution: 'normal', k: 2 }, { name: 'c2', param: 'X2', halfWidth: 0.02, distribution: 'normal', k: 2 }] });

function page(state, extra) {
  const dom = new JSDOM('<!doctype html><body><button id="btn-print"></button><div id="results-content"></div><div id="print-report"></div></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  const w = dom.window;
  w.eval(read('src/ui/escape.js'));
  w.eval(I18N_FILES.map(read).join('\n;\n'));
  w.i18n.lang = 'uz';
  w.Calc = { roundResult, roundHalfAway, roundUpAway, fmt, fmtSci, monteCarlo: E.monteCarlo, evaluate: E.evaluate, ...reportBridge };
  const st = { points: [], summary: {}, settings: {}, acceptances: {}, currentPoint: null, ...state };
  const subs = [];
  w.appState = { get: k => (k ? st[k] : st), set: p => { Object.assign(st, p); subs.forEach(fn => fn(p, st)); }, subscribe: fn => { subs.push(fn); } };
  w.Points = { summary: (pts, uk) => reportBridge.summaryRows(pts, uk), snapshot: s => s };
  w.toasts = [];
  w.showToast = (m, type) => w.toasts.push({ m, type });
  w.print = () => {};
  w.switchTab = () => {};
  Object.assign(w, extra || {});
  w.eval(read('src/js/report.js'));
  w.Results.init();
  w.Results.render();
  return w;
}
/** Soxta UCMonteCarlo: chaqiruvlar yoziladi; natija testdan beriladi */
function fakeMc() {
  const calls = [];
  const api = { run: (spec, opts, onProgress) => { const c = { spec, opts: JSON.parse(JSON.stringify(opts)), onProgress, cancelled: false }; c.promise = new Promise(r => { c.resolve = r; });
    calls.push(c); return { promise: c.promise, cancel: () => { c.cancelled = true; c.resolve({ error: 'mc_cancelled', mode: 'MC' }); } }; } };
  return { api, calls };
}
const tick = () => new Promise(r => setTimeout(r, 0));
const MC = (over) => ({ mode: 'MC', M: 200000, seed: E.MC_SEED, validated: true, adaptive: { enabled: true, converged: true, reachedMax: false }, validation: { requested: true, met: true, required: 1e-4, achieved: 5e-5, tolDivisor: 5 },
  delta: 0.0005, dLow: 0.0001, dHigh: 0.0001, mean: 0.9982, u: 0.0006, low: 0.997, high: 0.9994, symLow: 0.997, symHigh: 0.9994, gumLow: 0.997, gumHigh: 0.9994, gumU: 0.0012, P: 0.9545,
  blocks: 20, blockSize: 10000, nDig: 2, nDigAchieved: 2, interval: 'shortest', rng: { name: 'wichmann-hill-2006', seed: E.MC_SEED }, findings: [], ...over });

test('density hisobidan keyin MCM avtomatik boshlanadi: adaptiv, n_dig = 2, §8 tekshiruvi; holat "bajarilmoqda" → "tasdiqlandi"', async () => {
  const mc = fakeMc();
  const w = page(densityState(), { UCMonteCarlo: mc.api });
  assert.equal(mc.calls.length, 0);                                           // hisob yo'q — MCM yo'q
  const r = E.evaluate(w.appState.get());
  assert.equal(r.mcm.required, true);
  w.appState.set({ combined: r });                                            // "Hisoblash" tugmasi shuni qiladi
  assert.equal(mc.calls.length, 1, 'MCM avtomatik boshlandi');
  assert.deepEqual([mc.calls[0].opts.mode, mc.calls[0].opts.nDig, mc.calls[0].opts.validation], ['adaptive', 2, true]);
  const doc = w.document;
  let st = doc.querySelector('#results-content [data-mcm-status]');
  assert.equal(st.dataset.mcmStatus, 'running');
  assert.equal(st.getAttribute('aria-live'), 'polite');
  assert.match(st.textContent, /MCM tekshiruvi talab qilinadi:/);
  assert.match(st.querySelector('.mcm-reasons li').textContent, /^\(b\) V — «Glassware tolerance».*\|c\|·u \/ u_c = 0\.92 > 0\.50$/);
  assert.equal(st.querySelector('[data-mcm-verdict]').textContent, 'bajarilmoqda…');
  assert.ok(doc.querySelector('[data-mc-cancel]'), 'bekor qilish tugmasi');
  mc.calls[0].onProgress({ done: false, M: 30000, expected: 120000, progress: 0.25 });
  assert.match(doc.querySelector('[data-mcm-progress]').textContent, /^M = 30.000/);
  // qayta chizish (til almashishi va h.k.) ikkinchi ishni boshlamaydi
  w.Results.render();
  assert.equal(mc.calls.length, 1);
  mc.calls[0].resolve(MC());
  await tick();
  st = doc.querySelector('#results-content [data-mcm-status]');
  assert.equal(st.dataset.mcmStatus, 'validated');
  assert.equal(st.querySelector('[data-mcm-verdict]').textContent, 'tasdiqlandi');
  assert.ok(st.querySelector('[data-mcm-s8]'));
  assert.equal(doc.querySelector('[data-finding="mcm_required"]'), null);
  assert.equal(doc.querySelector('[data-mcm-run]'), null);
});

test('holatlar: rad etildi / yaqinlashmadi; xato bilan tugasa — "bajarib bo\'lmadi" + M5 + qayta ishga tushirish tugmasi', async () => {
  const run = async (result) => {
    const mc = fakeMc();
    const w = page(densityState(), { UCMonteCarlo: mc.api });
    w.appState.set({ combined: E.evaluate(w.appState.get()) });
    mc.calls[0].resolve(result);
    await tick();
    return w.document;
  };
  let doc = await run(MC({ validated: false }));
  assert.equal(doc.querySelector('[data-mcm-status]').dataset.mcmStatus, 'rejected');
  assert.equal(doc.querySelector('[data-mcm-verdict]').textContent, 'rad etildi');
  doc = await run(MC({ adaptive: { enabled: true, converged: false, reachedMax: true }, M: 10000000 }));
  assert.equal(doc.querySelector('[data-mcm-status]').dataset.mcmStatus, 'not_converged');
  assert.equal(doc.querySelector('[data-mcm-verdict]').textContent, 'yaqinlashmadi');
  assert.equal(doc.querySelector('[data-finding="mcm_required"]'), null);          // bajarilgan — M5 yo'q
  doc = await run({ error: 'mc_nonnormal_correlation', mode: 'MC', findings: [] });
  assert.equal(doc.querySelector('[data-mcm-status]').dataset.mcmStatus, 'failed');
  assert.ok(doc.querySelector('[data-finding="mcm_required"]'));
  assert.ok(doc.querySelector('[data-mcm-run]'));
});

test('bekor qilinsa: holat "bajarilmagan", M5 ogohlantirishi; o\'sha natija uchun o\'zi qayta boshlanmaydi; tugma bilan — boshlanadi', async () => {
  const mc = fakeMc();
  const w = page(densityState(), { UCMonteCarlo: mc.api });
  w.appState.set({ combined: E.evaluate(w.appState.get()) });
  w.document.querySelector('[data-mc-cancel]').click();
  await tick();
  assert.equal(mc.calls[0].cancelled, true);
  const doc = w.document;
  assert.equal(doc.querySelector('[data-mcm-status]').dataset.mcmStatus, 'pending');
  assert.ok(doc.querySelector('[data-mcm-draft]'));
  assert.ok(doc.querySelector('#results-content [data-finding="mcm_required"]'));
  w.appState.set({ summary: { uniformK: false } });                           // boshqa o'zgarish — qayta boshlanmaydi
  assert.equal(mc.calls.length, 1);
  doc.querySelector('[data-mcm-run]').click();
  assert.equal(mc.calls.length, 2);
  assert.equal(doc.querySelector('[data-mcm-status]').dataset.mcmStatus, 'running');
});

test('kirish o\'zgarib qayta hisoblansa: eski ish to\'xtatiladi va natijasi qabul qilinmaydi; yangi natija uchun yangi ish', async () => {
  const mc = fakeMc();
  const w = page(densityState(), { UCMonteCarlo: mc.api });
  w.appState.set({ combined: E.evaluate(w.appState.get()) });
  const st2 = densityState();
  st2.measurements = { ...st2.measurements, V: [100.03, 100.06, 99.98, 100.04, 100.00] };
  w.appState.set({ measurements: st2.measurements, combined: E.evaluate(st2) });
  assert.equal(mc.calls[0].cancelled, true);
  assert.equal(mc.calls.length, 2);
  mc.calls[0].resolve(MC());                                                  // eski ish kech tugasa ham
  await tick();
  assert.equal(w.document.querySelector('[data-mcm-status]').dataset.mcmStatus, 'running');
  assert.equal(w.toasts.length, 0);
});

test('MCM talab qilinmasa: avtomatik boshlanmaydi, holat bloki yo\'q', () => {
  const mc = fakeMc();
  const w = page(NORMAL(), { UCMonteCarlo: mc.api });
  w.appState.set({ combined: E.evaluate(w.appState.get()) });
  assert.equal(mc.calls.length, 0);
  assert.equal(w.document.querySelector('[data-mcm-status]'), null);
});

test('autoMcm = false (laboratoriya yoki hisob sozlamasi): avtomatik boshlanmaydi, lekin ogohlantirish (M5) va QORALAMA qoladi', async () => {
  for (const variant of ['lab', 'calc']) {
    const mc = fakeMc();
    const st = densityState();
    if (variant === 'calc') st.settings.autoMcm = false;
    const extra = { UCMonteCarlo: mc.api };
    if (variant === 'lab') extra.UCTemplates = { labSettings: () => ({ autoMcm: false }), reportNoticeHTML: () => '', evaluateState: s => ({ state: s, result: E.evaluate(s) }) };
    const w = page(st, extra);
    w.appState.set({ combined: E.evaluate(w.appState.get()) });
    assert.equal(mc.calls.length, 0, variant);
    const doc = w.document;
    assert.equal(doc.querySelector('[data-mcm-status]').dataset.mcmStatus, 'pending');
    assert.ok(doc.querySelector('[data-mcm-auto-off]'));
    assert.ok(doc.querySelector('#results-content [data-finding="mcm_required"]'));
    await w.Results.printReport();
    const p = doc.getElementById('print-report');
    assert.ok(p.querySelector('[data-report-draft]'), 'QORALAMA');
    assert.match(p.querySelector('[data-report-draft-reasons]').dataset.reportDraftReasons, /mcm/);
    assert.ok(p.querySelector('[data-finding="mcm_required"]'));
  }
});

test('worker moduli yuklanmagan (juda eski brauzer): avtomatik boshlanmaydi (asosiy oqim qotmasligi uchun); laboratoriya sozlamasi standarti — yoqilgan', () => {
  const w = page(densityState());
  w.appState.set({ combined: E.evaluate(w.appState.get()) });
  assert.equal(w.document.querySelector('[data-mcm-status]').dataset.mcmStatus, 'pending');
  assert.match(read('src/storage/index.js'), /autoMcm: true,/);
  assert.match(read('src/ui/tpl/app.js'), /id="lab-autoMcm"/);
});
