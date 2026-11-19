/* P06 — Monte-Karlo UI: Web Worker / asosiy oqim bajaruvchisi (src/ui/mc/), natijalar paneli va hisobot satrlari.
   RISKS R-16: hisob UI ni qotirmasligi kerak — worker'da; worker bo'lmasa asosiy oqimda kichik bo'laklar bilan.
   Node testlarida haqiqiy worker yo'q: (1) worker moduli to'g'ridan-to'g'ri chaqiriladi (handleRun);
   (2) bajaruvchi soxta Worker bilan (xabar protokoli) va Worker'siz (bo'laklab) tekshiriladi.
   Haqiqiy brauzerdagi tekshiruv (Chromium, M = 10⁶) — docs/VALIDATION_MATRIX.md §12. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const E = require('../../src/engine/index.js');
const { createRunner, WORKER_URL, SLICE_MS } = require('../../src/ui/mc/runner.js');
const { handleRun } = require('../../src/ui/mc/worker.js');
const { roundResult, roundHalfAway, roundUpAway } = require('../../src/report/rounding.js');
const { fmt, fmtSci } = require('../../src/report/format.js');
const { reportBridge } = require('./lib.js');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const load = id => JSON.parse(read('tests/cases/' + id + '.json')).modelSpec;
const SPEC = load('jcgm101/jcgm101-9-3-mcm');
const OPTS = { mode: 'fixed', M: 60000, seed: 11 };
// Rad etiladigan hisob: korrelyatsiyalangan kirishlardan biri to'g'ri burchakli (ko'p o'lchovli t ham, Gauss ham qo'llanilmaydi)
const REFUSED = { format: 'calc-state/v2', state: { params: ['X1', 'X2'], measurements: { X1: [0], X2: [0] }, directions: [], model: { formula: 'Y = X1 + X2', unit: '1' },
  settings: { paired: false, P: 0.95 }, covB: { 'X1|X2': 0.3 },
  typeB: [{ name: 'a', param: 'X1', halfWidth: 1, distribution: 'rect' }, { name: 'b', param: 'X2', halfWidth: 1, distribution: 'normal', k: 1 }] } };

test('worker moduli: progress xabarlari va natija; natija dvigatelni to\'g\'ridan-to\'g\'ri chaqirish bilan bir xil', () => {
  const msgs = [];
  handleRun({ spec: SPEC, opts: OPTS }, m => msgs.push(m));
  const last = msgs[msgs.length - 1];
  assert.equal(last.type, 'result');
  assert.deepEqual(last.result, E.monteCarlo(SPEC, OPTS));
  const prog = msgs.filter(m => m.type === 'progress');
  assert.ok(prog.length >= 1);
  assert.equal(prog[prog.length - 1].info.done, true);
  assert.equal(prog[prog.length - 1].info.M, 60000);
  // xabarlar tuzilmali klonlanadigan oddiy ma'lumot (funksiya yo'q)
  assert.doesNotThrow(() => structuredClone(msgs));
  // xato natija ham xabar sifatida qaytadi
  const bad = [];
  handleRun({ spec: { format: 'nope' }, opts: {} }, m => bad.push(m));
  assert.deepEqual(bad, [{ type: 'result', result: { error: 'bad_spec', detail: 'nope' } }]);
});

test('worker fayli: `type: module`, dvigatelning o\'sha modulini import qiladi; DOM / tarmoq / eval yo\'q', () => {
  const src = read('src/ui/mc/worker.js');
  assert.match(src, /import \{ createMonteCarlo \} from '\.\.\/\.\.\/engine\/index\.js';/);
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.ok(!/\b(window|localStorage|fetch|XMLHttpRequest|importScripts|eval|Function\()/.test(code), 'taqiqlangan API');
  // P13: worker manzili modulga nisbatan (new URL('./worker.js', import.meta.url)) — deploy'da `?v=<sha>` qo'shiladi
  assert.equal(WORKER_URL, require('node:url').pathToFileURL(path.join(ROOT, 'src/ui/mc/worker.js')).href);
  assert.match(read('src/ui/mc/runner.js'), /export const WORKER_URL = new URL\('\.\/worker\.js', import\.meta\.url\)\.href;/);
  assert.match(read('src/ui/mc/runner.js'), /new env\.Worker\(env\.workerUrl \|\| WORKER_URL, \{ type: 'module' \}\)/);
  assert.match(read('index.html'), /<script type="module" src="src\/ui\/mc\/app\.js"><\/script>/);
});

test('CSP o\'zgarmagan: script-src \'self\' (worker shu qoida ostida yuklanadi); worker-src qo\'shilgan bo\'lsa — faqat \'self\'', () => {
  const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(read('index.html'))[1];
  const dir = Object.fromEntries(csp.split(';').map(x => x.trim().split(/\s+/)).map(a => [a[0], a.slice(1)]));
  assert.deepEqual(dir['script-src'], ["'self'"]);
  assert.deepEqual(dir['default-src'], ["'self'"]);
  if (dir['worker-src']) assert.deepEqual(dir['worker-src'], ["'self'"]);
  assert.ok(!/blob:|unsafe-eval/.test(csp));
});

/** Soxta Worker: xabar protokolini worker moduli (handleRun) orqali bajaradi, xabarlar asinxron yetkaziladi */
function fakeWorkerClass(log, mode) {
  return class FakeWorker {
    constructor(url, opt) { log.push(['new', url, opt]); this.dead = false; }
    postMessage(data) {
      log.push(['post', data.type]);
      setTimeout(() => {
        if (this.dead) return;
        if (mode === 'load-error') { this.onerror({ message: 'module workers unsupported', preventDefault() {} }); return; }
        handleRun(structuredClone(data), m => { const c = structuredClone(m); setTimeout(() => { if (!this.dead) this.onmessage({ data: c }); }, 0); });
      }, 0);
    }
    terminate() { log.push(['terminate']); this.dead = true; }
  };
}

test('bajaruvchi: Web Worker yo\'li — progress, natija, yakunda terminate; natija sinxron hisob bilan bir xil', async () => {
  const log = [], seen = [];
  const r = createRunner({ createMonteCarlo: E.createMonteCarlo, Worker: fakeWorkerClass(log) });
  const job = r.run(SPEC, { ...OPTS, onProgress() {}, shouldCancel() {} }, i => seen.push(i));
  const res = await job.promise;
  assert.equal(job.via(), 'worker');
  assert.deepEqual(log[0], ['new', WORKER_URL, { type: 'module' }]);
  assert.deepEqual(log[1], ['post', 'run']);
  assert.deepEqual(log[log.length - 1], ['terminate']);
  assert.deepEqual(res, E.monteCarlo(SPEC, OPTS));
  assert.ok(seen.length >= 1 && seen[seen.length - 1].done);
});

test('bajaruvchi: bekor qilish — worker to\'xtatiladi (terminate), natija mc_cancelled', async () => {
  const log = [];
  const r = createRunner({ createMonteCarlo: E.createMonteCarlo, Worker: fakeWorkerClass(log) });
  const job = r.run(SPEC, { mode: 'fixed', M: 1000000 });
  job.cancel();
  assert.deepEqual(await job.promise, { error: 'mc_cancelled', mode: 'MC' });
  assert.ok(log.some(l => l[0] === 'terminate'));
  job.cancel();                                                 // takroriy chaqiruv xavfsiz
});

test('bajaruvchi: worker yuklanmasa (modulli worker yo\'q) — asosiy oqimda bo\'laklab; natija bir xil', async () => {
  const log = [], seen = [];
  const r = createRunner({ createMonteCarlo: E.createMonteCarlo, Worker: fakeWorkerClass(log, 'load-error') });
  const job = r.run(SPEC, OPTS, i => seen.push(i));
  const res = await job.promise;
  assert.equal(job.via(), 'main');
  assert.deepEqual(res, E.monteCarlo(SPEC, OPTS));
  assert.ok(seen.length >= 1);
});

test('bajaruvchi: Worker\'siz muhit — asosiy oqimda kichik bo\'laklar (har bo\'lakdan keyin boshqaruv qaytariladi), UI qotmaydi', async () => {
  // soxta soat: har bir blok 10 ms "davom etadi" → bitta bo'lakda ko'pi bilan ⌈SLICE_MS/10⌉ blok
  let clock = 0, defers = 0;
  const env = {
    createMonteCarlo: (spec, opts) => {
      const job = E.createMonteCarlo(spec, opts);
      return { ...job, step: n => { clock += 10; return job.step(n); } };
    },
    Worker: null,
    now: () => clock,
    defer: fn => { defers++; setImmediate(fn); },
  };
  const seen = [];
  const job = createRunner(env).run(SPEC, { mode: 'fixed', M: 200000, seed: 11 }, i => seen.push(i));
  let ticksWhileRunning = 0;
  const timer = setInterval(() => { ticksWhileRunning++; }, 0);
  const res = await job.promise;
  clearInterval(timer);
  assert.equal(job.via(), 'main');
  assert.deepEqual(res, E.monteCarlo(SPEC, { mode: 'fixed', M: 200000, seed: 11 }));
  const perSlice = Math.ceil(SLICE_MS / 10);
  assert.ok(seen.length >= Math.ceil(20 / perSlice), `bo'laklar soni ${seen.length}`);
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i].M - seen[i - 1].M <= perSlice * 10000, 'bitta bo\'lak juda katta');
  assert.ok(defers >= seen.length);
  assert.ok(ticksWhileRunning >= 2, `hisob davomida boshqa vazifalar bajarildi: ${ticksWhileRunning}`);
  assert.deepEqual(seen.map(s => s.progress).slice(-1), [1]);
});

test('bajaruvchi: asosiy oqimda bekor qilish — keyingi bo\'lakda to\'xtaydi; dvigatel xatosi natija sifatida qaytadi', async () => {
  const r = createRunner({ createMonteCarlo: E.createMonteCarlo, Worker: null });
  const job = r.run(SPEC, { mode: 'fixed', M: 5000000 }, () => job.cancel());
  assert.deepEqual(await job.promise, { error: 'mc_cancelled', mode: 'MC' });
  const bad = await r.run({ format: 'nope' }, {}).promise;
  assert.equal(bad.error, 'bad_spec');
  const refused = await r.run(REFUSED, OPTS).promise;
  assert.equal(refused.error, 'mc_nonnormal_correlation');
  assert.equal(refused.findings[0].rule, 'M2');
});

/* ── Natijalar paneli (jsdom) ── */
const I18N_FILES = ['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js', 'src/js/i18n-regression.js', 'src/js/i18n-topdown.js', 'src/js/i18n-special.js', 'src/js/i18n-linter.js', 'src/js/i18n-report.js'];
function page(lang, state, extra) {
  const dom = new JSDOM('<!doctype html><body><button id="btn-print"></button><div id="results-content"></div><div id="print-report"></div></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  const w = dom.window;
  w.eval(read('src/ui/escape.js'));
  w.eval(I18N_FILES.map(read).join('\n;\n'));
  w.i18n.lang = lang;
  w.Calc = { roundResult, roundHalfAway, roundUpAway, fmt, fmtSci, monteCarlo: E.monteCarlo, ...reportBridge };
  const st = { points: [], summary: {}, settings: {}, acceptances: {}, ...state };
  w.appState = { get: k => (k ? st[k] : st), set: p => Object.assign(st, p), subscribe() {} };
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
const stateOf = spec => ({ ...spec.state, combined: E.evaluate(spec) });
const tick = () => new Promise(r => setTimeout(r, 0));

test('panel: rejim (adaptiv — standart), n_dig = 2, interval turi, urug\'; ishga tushirish → progress va bekor qilish tugmasi → natija', async () => {
  let resolveJob, cancelled = 0, progressCb = null, called = null;
  const UCMonteCarlo = { run: (spec, opts, onProgress) => { called = { spec, opts }; progressCb = onProgress; return { promise: new Promise(r => { resolveJob = r; }), cancel: () => { cancelled++; resolveJob({ error: 'mc_cancelled', mode: 'MC' }); } }; } };
  const w = page('uz', stateOf(SPEC), { UCMonteCarlo });
  const doc = w.document;
  const panel = doc.querySelector('[data-mc-panel]');
  assert.equal(panel.querySelector('[data-mc-opt="mode"]').value, 'adaptive');
  assert.equal(panel.querySelector('[data-mc-opt="nDig"]').value, '2');
  assert.equal(panel.querySelector('[data-mc-opt="interval"]').value, 'shortest');
  assert.equal(panel.querySelector('[data-mc-opt="seed"]').value, String(E.MC_SEED));
  assert.equal(panel.querySelector('[data-mc-opt="M"]').disabled, true);          // qat'iy M — faqat "fixed" rejimida
  assert.equal(doc.querySelector('[data-mc-cancel]'), null);
  // sozlamani o'zgartirish
  const set = (k, v) => { const el = doc.querySelector(`[data-mc-opt="${k}"]`); el.value = v; el.dispatchEvent(new w.Event('change')); };
  set('interval', 'symmetric'); set('nDig', '1'); set('seed', '77');
  doc.querySelector('#btn-mc').click();
  assert.deepEqual(JSON.parse(JSON.stringify(called.opts)), { mode: 'adaptive', M: 1000000, nDig: 1, interval: 'symmetric', seed: 77, nonNormalCorrelation: 'refuse', validation: true });
  assert.equal(panel.querySelector('[data-mc-opt="validation"]').value, 'validation');     // standart — GUM tekshiruvi (δ/5)
  // bajarilayotganda: progress va bekor qilish tugmasi
  assert.ok(doc.querySelector('[data-mc-cancel]'));
  assert.equal(doc.querySelector('#btn-mc').disabled, true);
  progressCb({ done: false, M: 30000, expected: 120000, progress: 0.25 });
  assert.equal(doc.querySelector('[data-mc-progress]').value, 25);
  assert.match(doc.querySelector('[data-mc-progress-text]').textContent, /^M = 30.000 \/ ≈ 120.000$/);
  // natija
  resolveJob(E.monteCarlo(SPEC, called.opts));
  await tick();
  assert.equal(doc.querySelector('[data-mc-cancel]'), null);
  const text = doc.querySelector('#results-content').textContent;
  assert.match(text, /Generator: wichmann-hill-2006/);
  assert.match(text, /Urug' \(seed\) = 77/);
  assert.match(text, /n_dig = 1/);
  assert.match(text, /Adaptiv M \(JCGM 101 §7\.9\.4\): bloklar \d+ × 10.000 — barqarorlashdi/);
  assert.equal(doc.querySelector('[data-mc-interval]').dataset.mcInterval, 'symmetric');
  assert.match(doc.querySelector('[data-mc-interval]').textContent, /Ehtimollik bo'yicha simmetrik interval \(95 %\)/);
  // LPU rad etilgan (JCGM 101 Table 6: GUF1 — No): MCM intervali natija sifatida + M3 topilmasi
  assert.match(doc.querySelector('[data-mc-result]').textContent, /GUM natijasi tasdiqlanmadi — natija sifatida Monte-Karlo intervali ko'rsatiladi/);
  assert.ok(doc.querySelector('[data-finding="mc_lpu_not_validated"]'));
  // belgi: M, generator, seed, n_dig, interval turi
  assert.match(doc.querySelector('[data-report-mark="mc"]').textContent, /generator — wichmann-hill-2006; seed = 77; n_dig = 1; interval — ehtimollik bo'yicha simmetrik/);
  // bekor qilish
  doc.querySelector('#btn-mc').click();
  doc.querySelector('[data-mc-cancel]').click();
  await tick();
  assert.equal(cancelled, 1);
  assert.equal(w.toasts[w.toasts.length - 1].m, w.i18n.t('mc_cancelled'));
  assert.equal(doc.querySelector('[data-mc-interval]'), null);                     // bekor qilingan hisobdan natija ko'rsatilmaydi
});

test('panel: rad etilgan hisob (normal bo\'lmagan korrelyatsiya) — xato matni va M2 topilmasi uch tilda; natija satrlari yo\'q', async () => {
  const spec = REFUSED;
  for (const lang of ['uz', 'ru', 'en']) {
    const UCMonteCarlo = { run: (s, o) => ({ promise: Promise.resolve(E.monteCarlo(s, o)), cancel() {} }) };
    const w = page(lang, stateOf(spec), { UCMonteCarlo });
    w.document.querySelector('#btn-mc').click();
    await tick();
    const err = w.document.querySelector('[data-mc-error]');
    assert.equal(err.dataset.mcError, 'mc_nonnormal_correlation');
    assert.ok(err.textContent.startsWith(w.i18n.t('mc_err_mc_nonnormal_correlation')), lang);
    const f = w.document.querySelector('[data-finding="mc_nonnormal_correlation"]');
    assert.ok(f && f.classList.contains('finding-error'), lang);
    assert.equal(w.document.querySelector('[data-mc-interval]'), null);
    assert.equal(w.document.querySelector('[data-report-mark="mc"]'), null);
  }
});

test('bosma hisobot: MCM bo\'limida interval turi, P, M, generator, urug\', n_dig va MC topilmalari (yashirilmaydi)', () => {
  const r = E.evaluate(SPEC);
  const mc = E.monteCarlo(SPEC, { mode: 'adaptive', nDig: 1 });
  for (const lang of ['uz', 'ru', 'en']) {
    const w = page(lang, stateOf(SPEC));
    const S = w.Calc.createSections({ t: k => w.i18n.t(k), esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), acceptances: () => ({}), canAccept: () => false, lab: () => ({}) });
    const d = w.document.createElement('div');
    d.innerHTML = S.mcLines(r, mc).map(l => `<p>${l}</p>`).join('') + S.mcFindingsHtml(mc, { print: true });
    const t = d.textContent;
    assert.ok(t.includes(`M = ${mc.M.toLocaleString()}`), lang);
    assert.ok(t.includes(w.i18n.t('mc_interval') + ' (95 %)'), lang);
    assert.ok(t.includes(w.i18n.t('mc_interval_sym') + ' (95 %)'), lang);
    assert.ok(t.includes(`${w.i18n.t('mc_generator')}: wichmann-hill-2006`), lang);
    assert.ok(t.includes(`${w.i18n.t('mc_seed')} = ${E.MC_SEED}`), lang);
    assert.ok(t.includes('n_dig = 1'), lang);
    assert.ok(t.includes(w.i18n.t('mc_result_instead')), lang);
    assert.ok(d.querySelector('[data-finding="mc_lpu_not_validated"]'), lang);
    assert.equal(d.querySelector('[data-finding-accept]'), null);                  // bosmada qabul tugmasi yo'q
  }
});

test('B tur manbalari ro\'yxatida yangi taqsimotlar (trap, ctrap, exp, lognorm) — nomi uch tilda', () => {
  const src = read('src/js/typeB.js');
  const w = page('uz', {});
  for (const d of E.MC_DISTRIBUTIONS) {
    assert.match(src, new RegExp(`value: '${d}',\\s+labelKey: 'dist_${d}'`), d);
    for (const lang of ['uz', 'ru', 'en']) { w.i18n.lang = lang; assert.notEqual(w.i18n.t('dist_' + d), 'dist_' + d, `${lang}.dist_${d}`); }
  }
});

test('egasi qarorlari (2026-11-18): Q-8 — GUM tekshiruvi δ/5, oddiy MCM δ; δ ga tushirish — laboratoriya sozlamasi, hisobotda belgi; erishilgan tolerans satri', async () => {
  const run = extra => {
    let called = null;
    const UCMonteCarlo = { run: (s, o) => { called = o; return { promise: Promise.resolve(E.monteCarlo(s, o)), cancel() {} }; } };
    const w = page('uz', stateOf(SPEC), { UCMonteCarlo, ...extra });
    return { w, opts: () => JSON.parse(JSON.stringify(called)) };
  };
  // (1) standart: tekshiruv, tolDivisor berilmaydi → dvigatel δ/5 ni qo'llaydi
  let x = run();
  let set = (k, v) => { const el = x.w.document.querySelector(`[data-mc-opt="${k}"]`); el.value = v; el.dispatchEvent(new x.w.Event('change')); };
  set('nDig', '1');
  x.w.document.querySelector('#btn-mc').click();
  await tick();
  assert.equal(x.opts().validation, true);
  assert.equal(x.opts().tolDivisor, undefined);
  let tol = x.w.document.querySelector('[data-mc-tolerance]');
  assert.equal(tol.dataset.mcTolerance, 'met');
  assert.match(tol.textContent, /talab δ\/5 = .*erishilgan 2s = /);
  assert.equal(x.w.document.querySelector('[data-mc-tol-lowered]'), null);
  assert.equal(x.w.document.querySelector('[data-report-mark="mc_tol"]'), null);
  // (2) oddiy MCM: δ, §8 xulosasi (tasdiqlandi / tasdiqlanmadi) yo'q, M3 yo'q
  x = run();
  set = (k, v) => { const el = x.w.document.querySelector(`[data-mc-opt="${k}"]`); el.value = v; el.dispatchEvent(new x.w.Event('change')); };
  set('validation', 'mcm'); set('nDig', '1');
  x.w.document.querySelector('#btn-mc').click();
  await tick();
  assert.equal(x.opts().validation, false);
  const text = x.w.document.querySelector('#results-content').textContent;
  assert.ok(!text.includes(x.w.i18n.t('mc_valid')) && !text.includes(x.w.i18n.t('mc_not_valid')));
  assert.equal(x.w.document.querySelector('[data-finding="mc_lpu_not_validated"]'), null);
  assert.match(x.w.document.querySelector('[data-mc-tolerance]').textContent, /talab δ = /);
  // (3) laboratoriya sozlamasi mcTolerance: 'delta' → tolDivisor = 1; hisobotda belgi (satr va belgi)
  const lab = { ...require('../../src/storage/index.js').LAB_DEFAULTS, mcTolerance: 'delta', mcNDig: 1, mcMode: 'adaptive' };
  x = run({ UCTemplates: { labSettings: () => lab, reportNoticeHTML: () => '', evaluateState: s => ({ state: s, result: E.evaluate(s) }) } });
  assert.equal(x.w.document.querySelector('[data-mc-opt="nDig"]').value, '1');                  // laboratoriya sozlamasidan
  x.w.document.querySelector('#btn-mc').click();
  await tick();
  assert.equal(x.opts().tolDivisor, 1);
  assert.equal(x.w.document.querySelector('[data-mc-tol-lowered]').textContent, x.w.i18n.t('mc_tol_lowered'));
  assert.equal(x.w.document.querySelector('[data-report-mark="mc_tol"]').textContent, x.w.i18n.t('mark_mc_tol_delta'));
  const D = require('../../src/storage/index.js').LAB_DEFAULTS;
  assert.deepEqual([D.mcMode, D.mcNDig, D.mcTolerance], ['adaptive', 2, 'delta5']);
});

test('egasi qarori Q-5: ν ≤ 2 da hisobotda "u(y) aniqlanmagan (ν ≤ 2), faqat qamrov intervali" — uch tilda; u soni ko\'rsatilmaydi', () => {
  const gas = load('excel/excel-gas-p2-mc');
  const r = E.evaluate(gas);
  const mc = E.monteCarlo(gas, { mode: 'fixed', M: 20000 });
  const expected = { uz: "u(y) aniqlanmagan (ν ≤ 2), faqat qamrov intervali", ru: 'u(y) не определена (ν ≤ 2), только интервал охвата', en: 'u(y) undefined (ν ≤ 2), coverage interval only' };
  for (const lang of ['uz', 'ru', 'en']) {
    const w = page(lang, stateOf(gas));
    const S = w.Calc.createSections({ t: k => w.i18n.t(k), esc: s => String(s), acceptances: () => ({}), canAccept: () => false, lab: () => ({}) });
    const d = w.document.createElement('div');
    d.innerHTML = S.mcLines(r, mc).map(l => `<p>${l}</p>`).join('');
    assert.equal(d.querySelector('[data-mc-u-undefined]').textContent, expected[lang]);
    assert.ok(!/u = /.test(d.querySelector('p').textContent), lang);
    const marks = w.Calc.reportMarks(r, { t: k => w.i18n.t(k), mc });
    assert.ok(marks.find(m => m.key === 'mc_u').text.includes(expected[lang].slice(0, 12)), lang);
    assert.equal(d.querySelector('[data-mc-tolerance]').dataset.mcTolerance, 'not-met');            // M = 2·10⁴: δ/5 ga erishilmagan — erishilgani ko'rsatiladi
  }
});

test('egasi qarori Q-6: rad etilgan hisobda topilma "LPU (GUM) natijasi amal qiladi" deydi — uch tilda', () => {
  const w = page('uz', {});
  for (const [lang, re] of [['uz', /LPU \(GUM\) natijasi amal qiladi/], ['ru', /Действует результат LPU \(GUM\)/], ['en', /The LPU \(GUM\) result stands/]]) {
    w.i18n.lang = lang;
    assert.match(w.i18n.t('w_mc_nonnormal_correlation'), re);
    assert.match(w.i18n.t('fix_mc_nonnormal_correlation'), /JCGM 102:2011 §5\.3\.2/);
  }
});

test('laboratoriya sozlamalari oynasida Monte-Karlo bo\'limi: rejim, n_dig, tekshiruv toleransi (saqlanadi)', () => {
  const src = read('src/ui/tpl/app.js');
  for (const id of ['lab-mcMode', 'lab-mcNDig', 'lab-mcTolerance']) assert.ok(src.includes(`id="${id}"`) && src.includes(`$('${id}')`), id);
  const w = page('uz', {});
  for (const k of ['lab_mc_mode', 'lab_mc_ndig', 'lab_mc_tolerance', 'lab_mc_tol_delta5', 'lab_mc_tol_delta']) {
    for (const lang of ['uz', 'ru', 'en']) { w.i18n.lang = lang; assert.notEqual(w.i18n.t(k), k, `${lang}.${k}`); }
  }
});
