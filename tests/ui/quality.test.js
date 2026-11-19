/* P12: "Malaka sinovlari" va "Validatsiya" bo'limlari — sof yordamchilar (quality-model), ko'rinish uch tilda (barcha kalitlar
   lug'atda), hisobot bo'limlari (src/report/pt.js, validation.js — SVG skriptsiz) va kontroller jsdom + fake-indexeddb da:
   PT seriya → raund → ball → top-down; validatsiya → Grubbs belgisi → chiqarish (faqat admin, izoh) → qoralama shablon. */
'use strict';
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { JSDOM } = require('jsdom');
const { IDBFactory } = require('fake-indexeddb');
const E = require('../../src/engine/index.js');
const QM = require('../../src/ui/lab/quality-model.js');
const QV = require('../../src/ui/lab/quality-view.js');
const { ptSectionHTML } = require('../../src/report/pt.js');
const { validationSectionHTML } = require('../../src/report/validation.js');
const { escHtml } = require('../../src/ui/escape.js');

const ROOT = path.join(__dirname, '..', '..');
const LANGS = ['uz', 'ru', 'en'];
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const I18N_FILES = ['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js', 'src/js/i18n-regression.js', 'src/js/i18n-topdown.js', 'src/js/i18n-special.js', 'src/js/i18n-linter.js', 'src/js/i18n-report.js', 'src/js/i18n-lab.js', 'src/js/i18n-pt.js'];
const DICT = (() => {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  return dom.window.eval(I18N_FILES.map(read).join('\n;\n') + '\n;TRANSLATIONS');
})();
const missing = new Set();
const ctxOf = lang => ({ t: k => { if (DICT[lang][k] === undefined) missing.add(`${lang}.${k}`); return DICT[lang][k] !== undefined ? DICT[lang][k] : k; }, esc: escHtml });
const frag = html => new JSDOM('<!doctype html><body><div id="r">' + html + '</div></body>').window.document.getElementById('r');
const URANIUM = [199.31, 199.53, 200.19, 200.82, 201.92, 201.95, 202.18, 245.57];

/* ── model ── */
test('scoreText: 2 o\'nlik xona, round half away from zero', () => {
  const { scoreText } = require('../../src/report/pt.js');
  assert.deepEqual([2.005, -2.005, 2.0000000000000018, -0.004, 3.14159, null].map(scoreText), ['2.01', '-2.01', '2.00', '0.00', '3.14', '—']);
});

test('model: raund shakli → yozuv (bo\'sh — bo\'sh, son emas — xato); test shakli ↔ spetsifikatsiya', () => {
  assert.deepEqual(QM.roundOf({ id: 'R1', x: '10,6', xpt: '10', sigmaPt: '0,25', Ux: 'abc' }).bad, ['Ux']);
  const r = QM.roundOf({ x: '10,6', xpt: '10', sigmaPt: '0,25' }).round;
  assert.deepEqual([r.x, r.xpt, r.sigmaPt, r.ux], [10.6, 10, 0.25, '']);
  assert.deepEqual(QM.roundOf({ x: '' }).bad.sort(), ['x', 'xpt']);
  const g = QM.testOf({ type: 'anova', groups: '6,9 5,4 5,8\n8,3; 6,8; 7,8\n\n8 10,5 8,1', alpha: '0.01' });
  assert.deepEqual(g.test, { id: '', type: 'anova', alpha: 0.01, groups: [[6.9, 5.4, 5.8], [8.3, 6.8, 7.8], [8, 10.5, 8.1]] });
  assert.deepEqual(QM.testOf(QM.formOf({ id: 'T1', type: 'grubbs', values: URANIUM, side: 'max' })).test, { id: 'T1', type: 'grubbs', values: URANIUM, side: 'max' });
  assert.deepEqual(QM.testOf({ type: 'linearity', points: '1; 2\n2; 4,1' }).bad, []);
  assert.deepEqual(QM.testOf({ type: 'linearity', points: '1; 2\nx' }).bad, ['points']);
  assert.deepEqual(QM.testOf({ type: 'grubbs', values: '1 2 q' }).bad, ['values']);
  assert.equal(QM.testOf({ type: 'nope' }).test, null);
  assert.equal(QM.nextTestId([{ id: 'T1' }, { id: 'T2' }]), 'T3');
  assert.equal(QM.ptRowsText({ rounds: [{ assigned: 10, result: 10.5, uRef: 0.1 }, { assigned: 1, result: 0.9, U: 0.2, k: 2 }] }), '0.5; 0.1\n-0.09999999999999998; 0.1');
});

/* ── ko'rinish va hisobot (uch tilda) ── */
test('ko\'rinish va hisobot uch tilda: barcha kalitlar lug\'atda; SVG skriptsiz; foydalanuvchi matni escape qilinadi', () => {
  const series = { id: 'pt:1', name: '<b>Pb</b>', unit: 'mg/L', quantity: 'Pb', rounds: [
    { id: 'R1', date: '2026-01-10', x: 10.6, xpt: 10, sigmaPt: 0.25, uxpt: 0.1 }, { id: 'R2', x: 10.1, xpt: 10, Ux: 0.3, Uxpt: 0.2 }, { id: '<img src=x>', x: 9, xpt: 10, sigmaPt: 0.3 }] };
  const pr = QM.analysePT(series);
  const set = { id: 'val:1', name: 'V', tests: [
    { id: 'T1', type: 'grubbs', values: URANIUM, side: 'max' }, { id: 'T2', type: 'anova', groups: [[1, 2, 3], [1.1, 2.1, 3.1], [1, 2, 3.2]] },
    { id: 'T3', type: 'cochran', groups: [[1, 2, 3], [1, 1.1, 1.2], [2, 2.5, 2.2]] }, { id: 'T4', type: 'ttest', a: [1, 2, 3], b: [2, 3, 4], equalVariance: false },
    { id: 'T5', type: 'ftest', a: [1, 2, 3], b: [2, 3, 5] }, { id: 'T6', type: 'recovery', values: [95, 98, 97] }, { id: 'T7', type: 'linearity', points: [{ x: 1, y: 2 }, { x: 2, y: 4.1 }, { x: 3, y: 5.9 }] },
    { id: 'T8', type: 'lod', values: [0.1, 0.12, 0.09] }, { id: 'T9', type: 'lod', method: 'calibration', points: [{ x: 0, y: 0 }, { x: 1, y: 1.1 }, { x: 2, y: 1.9 }] }, { id: 'T10', type: 'grubbs', values: [1, 1] }] };
  const vr = QM.analyseValidation(set);
  for (const lang of LANGS) {
    const c = ctxOf(lang);
    const pt = frag(QV.ptHTML({ list: [series], selected: 'pt:1', series, entry: { date: '' }, result: pr, history: [], canAdmin: true, bad: ['x'] }, c));
    assert.equal(pt.querySelectorAll('[data-pt-round]').length, 3);
    assert.ok(pt.querySelector('[data-pt-chart="z"]') && pt.querySelector('[data-pt-chart="En"]'));
    assert.equal(pt.querySelectorAll('script, img, b').length, 0);
    assert.ok(pt.querySelector('[data-findings]'));
    assert.ok(frag(QV.ptHTML({ list: [], selected: '', series: null, entry: {}, result: null, history: [], canAdmin: false }, c)).querySelector('.empty-state'));
    const vl = frag(QV.validationHTML({ list: [set], selected: 'val:1', set, form: QM.formOf({ type: 'lod' }), editing: null, result: vr, history: [], canAdmin: true, comments: {}, draft: { id: 'X', precision: 'T2', recovery: '', scale: 'relative' }, bad: [] }, c));
    assert.equal(vl.querySelectorAll('div.vl-test').length, 10);
    assert.ok(vl.querySelector('[data-vl-flag="T3"]'));                    // Cochran ham guruhni belgilaydi
    assert.ok(vl.querySelector('[data-vl-flag="T1"] [data-vl-act="exclude"]'));
    assert.ok(vl.querySelector('[data-vl-test="T10"][data-vl-error="validation_too_few"]'));
    assert.ok(vl.querySelector('[data-vl-unverified]'));
    assert.ok(vl.querySelector('[data-vl-draft="1"]'));
    for (const type of E.VALIDATION_TESTS) frag(QV.validationHTML({ list: [set], selected: 'val:1', set, form: QM.formOf({ type }), editing: 0, result: null, history: [], canAdmin: false, comments: {}, draft: {}, bad: [] }, c));
    for (const m of ['calibration']) frag(QV.validationHTML({ list: [], selected: '', set, form: { ...QM.formOf({ type: 'lod' }), method: m }, editing: null, result: null, history: [], canAdmin: false, comments: {}, draft: {}, bad: [] }, c));
    frag(QV.validationHTML({ list: [], selected: '', set: null }, c));
    // bosma hisobot bo'limlari
    const rp = frag(ptSectionHTML(c, pr, { print: true }));
    // R-26 #1: ball 2 o'nlik xonada, qoida va tolerans izohda
    assert.equal(rp.querySelector('[data-pt-round="R1"] [data-pt-primary]').textContent.trim(), '2.40');
    assert.ok(rp.querySelector('[data-pt-score-rule]').textContent.includes('10⁻¹²'));
    // R-26 #4, #5: Cochran va LOD — (unverified) belgisi bosma hisobotda ham
    const vp = frag(validationSectionHTML(c, vr, { print: true }));
    for (const id of ['T3', 'T8', 'T9']) assert.ok(vp.querySelector(`[data-vl-test="${id}"] [data-vl-unverified-title]`), id);
    assert.ok(!vp.querySelector('[data-vl-test="T1"] [data-vl-unverified-title]'));
    assert.ok(rp.querySelector('[data-pt-limits]').textContent.includes('R-26'));
    frag(validationSectionHTML(c, vr, { print: true }));
    frag(ptSectionHTML(c, E.evaluate({ format: 'uc-pt/1', rounds: [] })));
    // topilmalar matni (w_ / why_ / fix_) — barcha kodlar
    for (const code of [...Object.keys(E.PT_FINDINGS), ...Object.keys(E.VALIDATION_FINDINGS)]) for (const p of ['w_', 'why_', 'fix_']) c.t(p + code);
    for (const code of E.PT_ERRORS) c.t('pt_err_' + code);
    for (const code of E.VALIDATION_ERRORS) c.t('vl_err_' + code);
    for (const code of E.PT_NULL_REASONS) c.t('pt_reason_' + code);
  }
  assert.deepEqual([...missing], []);
});

/* ── kontroller ── */
let w, doc, toasts, sent, S;
const $ = sel => doc.querySelector(sel);
const fire = (el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true }));
const setValue = (sel, value) => { const el = typeof sel === 'string' ? $(sel) : sel; el.value = value; fire(el, 'input'); fire(el, 'change'); };
const click = sel => fire(typeof sel === 'string' ? $(sel) : sel, 'click');
const tick = () => new Promise(r => setTimeout(r, 80));

before(async () => {
  const dom = new JSDOM('<!doctype html><body><div id="lab-root"></div></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  w = dom.window; doc = w.document; toasts = []; sent = null;
  w.eval(read('src/ui/escape.js'));
  w.eval(I18N_FILES.map(read).join('\n;\n'));
  w.i18n.lang = 'ru';
  w.showToast = (m, type) => toasts.push({ m, type });
  w.confirm = () => true;
  w.__st = { settings: {} };
  w.appState = { get: k => (k ? w.__st[k] : { ...w.__st }), set: u => Object.assign(w.__st, u), addTypeBComponent() {}, subscribe() {} };
  w.AuthManager = { role: 'employee', getSession() { return { role: this.role }; } };
  w.UCTopDown = { getState: () => ({ step: 1, unit: '' }), setState: s => { sent = s; } };
  w.switchTab = name => { w.__tab = name; };
  global.window = w; global.document = doc;
  global.indexedDB = new IDBFactory();
  S = await import(pathToFileURL(path.join(ROOT, 'src/storage/index.js')).href);
  await import(pathToFileURL(path.join(ROOT, 'src/ui/lab/app.js')).href);
  await w.UCLab.ready;
  await tick();
});

test('kontroller PT: xodim seriya yaratadi, raund qo\'shadi (audit), ballar chiqadi; top-down ga uzatish; o\'chirish — xodimga yo\'q', async () => {
  w.UCLab.setTab('pt');
  assert.ok($('[data-lb-list="pt"] .empty-state'));
  click('[data-pt-act="new"]'); await tick();
  setValue('[data-pt="unit"]', 'mg/L');
  for (const [x, xpt, u] of [['10,2', '10', '0,05'], ['9,8', '10', '0,06']]) {
    setValue('[data-pt-new="x"]', x); setValue('[data-pt-new="xpt"]', xpt); setValue('[data-pt-new="sigmaPt"]', '0,25'); setValue('[data-pt-new="uxpt"]', u);
    click('[data-pt-act="add-round"]'); await tick();
  }
  assert.equal(doc.querySelectorAll('[data-pt-round]').length, 2);
  assert.equal($('[data-pt-round="R1"]').dataset.ptVerdict, 'satisfactory');
  const db = await new S.LocalAdapter().open();
  const [rec] = await S.listQuality(db, 'pt');
  assert.deepEqual([rec.version, rec.savedBy, rec.rounds.length], [3, 'employee', 2]);
  assert.ok((await S.qualityHistory(db, 'pt', rec.id)).every(e => e.actor === 'employee'));
  // noto'g'ri qiymat — saqlanmaydi, xato maydon ko'rsatiladi
  setValue('[data-pt-new="x"]', 'abc'); click('[data-pt-act="add-round"]'); await tick();
  assert.ok($('[data-pt-bad]'));
  click('[data-pt-act="to-topdown"]'); await tick();
  assert.deepEqual([sent.bias, sent.scale, sent.unit, w.__tab], ['pt', 'absolute', 'mg/L', 'topdown']);
  assert.equal(sent.ptLink.lastRound.id, 'R2');                       // L3 uchun seriya nusxasi
  // joriy GUM hisobiga bog'lash — settings.ptLink nusxasi
  click('[data-pt-act="link-calc"]'); await tick();
  assert.equal(w.__st.settings.ptLink.seriesId, rec.id);
  click('[data-pt-act="unlink-calc"]'); await tick();
  assert.ok(!('ptLink' in w.__st.settings));
  const spec = await import(pathToFileURL(path.join(ROOT, 'src/ui/topdown/build.js')).href);
  const b = spec.buildSpec({ ...spec.defaults(), ...sent, qcValues: '1 2 3' }).spec.bias;
  assert.deepEqual(b.rounds.map(r => r.uRef), [0.05, 0.06]);
  assert.ok($('[data-pt-act="delete"]').disabled);
});

test('kontroller validatsiya: Grubbs belgilaydi; xodim chiqara olmaydi; admin izoh bilan chiqaradi (audit); qoralama shablon', async () => {
  w.UCLab.setTab('validation');
  click('[data-vl-act="new"]'); await tick();
  setValue('[data-vl-form="values"]', URANIUM.join('; '));
  setValue('[data-vl-form="side"]', 'max');
  click('[data-vl-act="add-test"]'); await tick();
  assert.ok($('[data-vl-flag="T1"]'));
  assert.ok($('[data-vl-act="exclude"]').disabled);                     // xodim
  w.AuthManager.role = 'admin';
  w.UCLab.setTab('validation'); await tick();
  setValue('[data-vl-comment="T1"]', 'qisqa');
  click('[data-vl-act="exclude"]'); await tick();
  assert.ok(toasts.some(x => x.type === 'error'));
  setValue('[data-vl-comment="T1"]', 'Massa-spektrometr nosozligi jurnalda qayd etilgan');
  click('[data-vl-act="exclude"]'); await tick();
  assert.ok($('[data-vl-excluded]'));
  assert.ok($('[data-vl-excluded]').textContent.includes('nosozligi'));
  const db = await new S.LocalAdapter().open();
  const [set] = await S.listQuality(db, 'validation');
  assert.equal(set.tests[0].values.length, 8);
  const h = await S.qualityHistory(db, 'validation', set.id);
  assert.ok(h.some(e => e.action === 'outlier_exclude' && e.actor === 'admin' && /nosozligi/.test(e.reason)));
  // ANOVA qo'shish → qoralama
  setValue('[data-vl-form="type"]', 'anova'); await tick();
  setValue('[data-vl-form="groups"]', '6,9 5,4 5,8 4,6 4,0\n8,3 6,8 7,8 9,2 6,5\n8,0 10,5 8,1 6,9 9,3');
  click('[data-vl-act="add-test"]'); await tick();
  assert.ok($('[data-vl-test="T2"][data-vl-type="anova"]'));
  w.UCLab.openValidation(set.id); await tick();
  setValue('[data-vl-draft="id"]', 'LAB-TD-TEST');
  click('[data-vl-act="draft"]'); await tick(); await tick();
  const tpls = await db.list('templates');
  const d = tpls.find(x => x.id === 'LAB-TD-TEST');
  assert.ok(d, JSON.stringify(toasts.slice(-2)));
  assert.equal(d.status, 'DRAFT');
  assert.match(d.validationBasis.sourceHash, /^[0-9a-f]{64}$/);
  assert.equal(d.validationBasis.precision.test, 'T2');
  assert.equal(doc.querySelectorAll('#lab-root [onclick], #lab-root [oninput]').length, 0);
});
