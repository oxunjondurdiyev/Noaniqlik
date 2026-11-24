/* P22-1 (audit 21.11.2026: UX-01, UX-02, UX-04) — yagona "Yangi hisob" oqimi:
   sof model (src/ui/flow/model.js), index.html tuzilmasi, jadval moduli (src/js/table.js) va ESKI SAQLANGAN HISOBLAR
   (migratsiya: ochilishi buzilmaydi, kiritilgan qiymat yo'qolmaydi, hisob natijasi bit darajasida o'zgarmaydi). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const E = require('../../src/engine/index.js');
const Flow = require('../../src/ui/flow/model.js');
const { loadPresets, presetState, templates } = require('../templates/lib.js');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const I18N = ['i18n.js', 'i18n-ext.js', 'i18n-engine.js', 'i18n-templates.js', 'i18n-shell.js', 'i18n-p20.js', 'i18n-flow.js'];
const sync = st => Flow.syncParams(st, E.tokenize);
const J = v => JSON.parse(JSON.stringify(v));          // jsdom obyektlari → oddiy obyekt (boshqa realm)

/* ─── P — formuladan ─── */
test('formulaParams: o\'zgaruvchilar birinchi uchrash tartibida; funksiya va doimiylar parametr emas', () => {
  const f = (formulas, known = []) => Flow.formulaParams(formulas, known, E.tokenize);
  assert.deepEqual(f(['ρ = m / V']).used, ['m', 'V']);
  assert.deepEqual(f(['σ = F / (pi * d0^2 / 4)']).used, ['F', 'd0']);
  assert.deepEqual(f(['y = sqrt(a^2 + b^2) + ln(c) - exp(1) + e']).used, ['a', 'b', 'c']);
  assert.deepEqual(f(['E = (I − 4)·1.25 − Ce']).used, ['I', 'Ce']);
  // mavjud nom parserga beriladi: "mV" avvalgidek m·V; nomsiz boshlaganda — bitta yangi nom
  assert.deepEqual(f(['mV'], ['m']).used, ['m', 'V']);
  assert.deepEqual(f(['mV']).used, ['mV']);
  // bir nechta chiqish (JCGM 102) — birlashma
  assert.deepEqual(f(['R = U / I', 'P = U * I * k']).used, ['U', 'I', 'k']);
  // xato belgi — nom emas
  assert.equal(f(['a + #']).error, '#');
  assert.deepEqual(f(['']).used, []);
});

test('syncParams: yangi nom qo\'shiladi, ma\'lumotsiz ortiqcha olib tashlanadi, ma\'lumotli ortiqcha SAQLANADI (unused)', () => {
  // yangi hisob: ['x'] → formuladan
  let r = sync({ params: ['x'], measurements: { x: [''] }, model: { formula: 'ρ = m / V' }, typeB: [] });
  assert.deepEqual(r.params, ['m', 'V']);
  assert.deepEqual(r.added, ['m', 'V']);
  assert.deepEqual(r.removed, ['x']);
  assert.equal(r.changed, true);
  // kuzatuvi bor parametr formulada qolmadi — o'chirilmaydi
  r = sync({ params: ['m', 'V'], measurements: { m: ['1.0', '1.1'], V: ['', ''] }, model: { formula: 'ρ = M / V' }, typeB: [] });
  assert.deepEqual(r.params, ['M', 'V', 'm']);
  assert.deepEqual(r.unused, ['m']);
  assert.deepEqual(r.removed, []);
  // faqat B tur manbasi bor parametr ham "ma'lumotli"
  r = sync({ params: ['a', 'b'], measurements: {}, model: { formula: 'y = a' }, typeB: [{ param: 'b', halfWidth: 1 }] });
  assert.deepEqual(r.unused, ['b']);
  // formula bo'sh — ro'yxat o'zgarmaydi (eski hisoblar: bir nechta parametr, formulasiz)
  r = sync({ params: ['m', 'V'], measurements: {}, model: { formula: '' } });
  assert.deepEqual(r.params, ['m', 'V']);
  assert.equal(r.changed, false);
  // bo'sh ro'yxat → bitta parametr x (to'g'ridan-to'g'ri o'lchash)
  assert.deepEqual(sync({ params: [], model: { formula: '' } }).params, [Flow.DEFAULT_PARAM]);
  // xato formula — ro'yxatga tegilmaydi
  r = sync({ params: ['m'], measurements: { m: ['1'] }, model: { formula: 'm + #' } });
  assert.equal(r.changed, false);
  assert.ok(r.error);
  // o'zgarmagan formula — changed: false (ortiqcha holat yozuvi yo'q)
  assert.equal(sync({ params: ['m', 'V'], measurements: {}, model: { formula: 'm / V' } }).changed, false);
});

/* ─── N — jadvaldan ─── */
test('usedRows / fitRows: oxirgi to\'ldirilgan qator + bitta bo\'sh qator; oraliqdagi bo\'sh kataklar va 100 dan ortiq qatorlar saqlanadi', () => {
  assert.equal(Flow.fitRows({ params: ['x'], measurements: {} }), 1);
  assert.equal(Flow.fitRows({ params: ['x'], measurements: { x: ['', '', ''] } }), 1);
  assert.equal(Flow.fitRows({ params: ['x'], measurements: { x: ['1', '', '3', '', ''] } }), 4);
  assert.equal(Flow.fitRows({ params: ['a', 'b'], measurements: { a: ['1'], b: ['', '', 0] } }), 4, '0 — qiymat');
  assert.equal(Flow.usedRows({ params: ['a'], measurements: { a: [' ', null, undefined] } }), 0);
  const big = Array.from({ length: 150 }, (_, i) => String(i));
  assert.equal(Flow.fitRows({ params: ['x'], measurements: { x: big } }), 150, 'import qilingan qatorlar kesilmaydi');
  assert.equal(Flow.fitRows({ params: ['x'], measurements: { x: big.slice(0, 100) } }), 100);
  assert.equal(Flow.fitRows({ params: ['x'], measurements: { x: big.slice(0, 99) } }), 100);
  assert.equal(Flow.MAX_ROWS, 100);
});

test('blankCalc / hasSession / stepBlocker', () => {
  const b = Flow.blankCalc();
  assert.deepEqual(b.params, ['x']);
  assert.equal(b.model.formula, '');
  assert.equal(b.settings.modelKind, 'unknown', 'R-07: model turi o\'ylab topilmaydi');
  assert.equal(Flow.hasSession(b), false);
  assert.equal(Flow.hasSession({ ...b, model: { formula: 'a + b' } }), true);
  assert.equal(Flow.hasSession({ ...b, measurements: { x: ['1'] } }), true);
  assert.equal(Flow.hasSession({ ...b, template: { id: 'T-01' } }), true);
  assert.equal(Flow.hasSession({ params: [] }), false);
  const two = { params: ['m', 'V'] };
  assert.equal(Flow.stepBlocker('model', two, { hasFormula: false, formulaOk: true }), 'need_formula');
  assert.equal(Flow.stepBlocker('model', two, { hasFormula: true, formulaOk: false }), 'bad_formula');
  assert.equal(Flow.stepBlocker('model', two, { hasFormula: true, formulaOk: true }), null);
  assert.equal(Flow.stepBlocker('model', { params: ['x'] }, { hasFormula: false, formulaOk: true }), null, 'to\'g\'ridan-to\'g\'ri o\'lchash');
  assert.equal(Flow.stepBlocker('data', two, { hasFormula: true, formulaOk: true, typeA: { m: {} } }), 'need_data');
  assert.equal(Flow.stepBlocker('data', two, { hasFormula: true, formulaOk: true, typeA: { m: {}, V: {} } }), null);
});

/* ─── index.html tuzilmasi ─── */
test('index.html: "Hisoblashni sozlash" oynasi, N / P maydonlari va preset ro\'yxatlari yo\'q; 5 qadam — har birida bitta asosiy tugma', () => {
  const html = read('index.html');
  const doc = new JSDOM(html).window.document;
  for (const id of ['welcome-screen', 'inp-n', 'inp-p', 'inp-preset', 'btn-start', 'sidebar', 'sidebar-n', 'sidebar-preset', 'btn-apply-n', 'btn-add-param', 'btn-calc-typea', 'btn-fill-sample'])
    assert.equal(doc.getElementById(id), null, id);
  assert.ok(!/src\/data\/presets\.js/.test(html), 'presets.js saytga yuklanmaydi (namunalar — katalogda)');
  const steps = [...doc.querySelectorAll('#stepper [data-step]')];
  assert.deepEqual(steps.map(b => b.dataset.step), ['model', 'data', 'typeb', 'results', 'report']);
  assert.deepEqual(steps.map(b => b.querySelector('[data-i18n]').dataset.i18n), ['sh_st_model', 'sh_st_data', 'sh_st_typeb', 'sh_st_results', 'sh_st_report']);
  for (const key of ['model', 'data', 'typeb', 'results', 'report']) {
    const panel = doc.getElementById('tab-' + key);
    assert.ok(panel, 'tab-' + key);
    const primary = panel.querySelectorAll('.panel-footer [data-primary]');
    assert.equal(primary.length, 1, key + ': bitta asosiy tugma');
    assert.equal(primary[0].tagName, 'BUTTON');
    assert.equal(panel.querySelectorAll('.btn-primary').length, 1, key + ': boshqa asosiy (to\'ldirilgan) tugma yo\'q');
  }
  assert.ok(doc.getElementById('tab-model').classList.contains('active'), 'birinchi qadam — Model');
  assert.ok(doc.querySelector('#tab-model #model-box') && doc.querySelector('#tab-data #measurement-table') && doc.querySelector('#tab-data #typea-options'));
  assert.deepEqual(['model', 'data', 'report'].map(k => doc.querySelector(`#tab-${k} [data-primary]`).dataset.flowNext), ['model', 'data', 'print']);
  assert.equal(doc.querySelector('#tab-results [data-primary]').dataset.flowNext, 'report');
  assert.equal(doc.querySelector('#tab-typeb [data-primary]').id, 'btn-calc-combined');
  // sinov hisoblagichi bildirishnomasi Bosh sahifaga ko'chdi (inline uslubsiz)
  const banner = doc.getElementById('trial-banner');
  assert.ok(banner.closest('#dash-screen') && banner.hasAttribute('hidden') && !banner.hasAttribute('style'));
  // Bosh sahifadagi "Yangi hisob" — to'g'ridan-to'g'ri Model qadami
  assert.match(read('src/ui/home/app.js'), /\[data-home-new\]'\)\) \{ window\.App\.newCalculation\(\)/);
  const app = read('src/js/app.js');
  assert.match(app, /function newCalculation\(\)[\s\S]{0,400}blankCalc\(\)[\s\S]{0,300}goStep\('model'\)/);
  assert.ok(!/showScreen\('welcome'\)|PRESETS/.test(app + read('src/ui/home/app.js') + read('src/js/table.js')));
  // yangi matnlar uch tilda
  const w = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' }).window;
  const T = w.eval(I18N.map(f => read('src/js/' + f)).join('\n;\n') + '\n;TRANSLATIONS');
  const keys = Object.keys(T.uz).filter(k => /^flow_|^tpl_example_|^sh_st_data$/.test(k));
  assert.ok(keys.length >= 12);
  for (const k of keys) for (const l of ['uz', 'ru', 'en']) assert.ok(T[l][k], `${l}.${k}`);
  assert.deepEqual(['uz', 'ru', 'en'].map(l => T[l].flow_next_data), ['Keyingi: Ma\'lumotlar →', 'Далее: Данные →', 'Next: Data →']);
});

test('namunalar: avvalgi 11 sozlama katalogda `origin: \'example\'` bilan; kartada "Namuna" belgisi; "namuna" so\'rovi ularni topadi', async () => {
  const ex = templates.filter(x => x.tpl.origin === 'example').map(x => x.tpl);
  assert.equal(ex.length, 11);
  assert.deepEqual(ex.map(t => t.legacyPresetKey).sort(), Object.keys(loadPresets()).sort());
  assert.ok(templates.filter(x => !x.tpl.legacyPresetKey).every(x => x.tpl.origin === undefined), 'boshqa shablonlar namuna emas');
  assert.deepEqual(JSON.parse(read('schemas/methodology.schema.json')).properties.origin.enum, ['example']);
  const View = await import('../../src/ui/tpl/view.js');
  const words = ['Namuna', 'Пример', 'Example'];
  const ctx = { t: k => ({ tpl_example_badge: 'Namuna', tpl_example_hint: 'izoh' }[k] || k), esc: s => String(s), lang: 'uz', validationOf: () => null, exampleWords: words };
  const density = ex.find(t => t.id === 'legacy-density'), other = templates.find(x => x.tpl.id === 'T-01').tpl;
  assert.match(View.cardHTML({ tpl: density, local: false }, ctx), /data-tpl-example="1"[^>]*>Namuna</);
  assert.ok(!/data-tpl-example/.test(View.cardHTML({ tpl: other, local: false }, ctx)));
  assert.equal(View.isExampleQuery('namuna', words), true);
  assert.equal(View.isExampleQuery('Прим', words), true);
  assert.equal(View.isExampleQuery('examples', words), true);
  assert.equal(View.isExampleQuery('na', words), false);
  assert.equal(View.isExampleQuery('10180', words), false);
  const html = View.catalogHTML([{ tpl: density, local: false }, { tpl: other, local: false }], 'namuna', ctx);
  assert.ok(html.includes('legacy-density') && !html.includes('data-tpl-card="T-01'));
});

/* ─── jadval moduli (jsdom) ─── */
function mount(stored) {
  const dom = new JSDOM(`<!doctype html><body>
    <div id="model-box"></div><button id="btn-clear-data"></button>
    <table><thead id="table-head"></thead><tbody id="table-body"></tbody><tfoot id="table-foot"></tfoot></table>
    <div id="typea-options"></div><div id="type-a-summary"></div>
    <button data-flow-next="model"></button><button data-flow-next="data"></button></body>`, { url: 'https://example.test/', runScripts: 'outside-only' });
  const w = dom.window;
  if (stored) w.localStorage.setItem('uc_state_v2', JSON.stringify(stored));
  w.eval(read('src/ui/escape.js'));
  w.eval(I18N.map(f => read('src/js/' + f)).join('\n;\n'));
  w.eval(read('src/js/state.js'));
  w.Calc = { ...E, fmt: v => String(v), fmtSci: v => String(v) };
  w.UCFlow = { ...Flow, tokenize: E.tokenize };
  w.CSS = { escape: x => x };
  w.toasts = []; w.went = [];
  w.showToast = (m, type) => w.toasts.push(type);
  w.switchTab = t => w.went.push(t);
  w.confirm = () => true;
  w.eval(read('src/js/table.js'));
  w.Table.init();
  return w;
}
const fire = (w, el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true }));
const cell = (w, p, i) => w.document.querySelector(`.meas-input[data-param="${p}"][data-idx="${i}"]`);
function typeFormula(w, text) { const f = w.document.getElementById('model-formula'); f.value = text; fire(w, f, 'change'); }
function enter(w, p, i, v) { const c = cell(w, p, i); c.value = v; fire(w, c, 'change'); }

test('yangi hisob: formula → parametrlar; qiymat kiritilsa qator qo\'shiladi; A tur tugmasiz hisoblanadi; "Keyingi" tugmalari', () => {
  const w = mount(null);
  w.appState.set(Flow.blankCalc());
  assert.deepEqual(J(w.appState.get('params')), ['x']);
  assert.equal(w.document.querySelectorAll('#table-body tr').length, 1, 'bitta bo\'sh qator');
  // bir nechta parametr, formula yo'q bo'lmaydi: formula yozilguncha — bitta x; "Keyingi" ruxsat beradi (y = x)
  typeFormula(w, 'ρ = m / V');
  assert.deepEqual(J(w.appState.get('params')), ['m', 'V']);
  assert.deepEqual([...w.document.querySelectorAll('.model-chip')].map(b => b.dataset.ins), ['m', 'V']);
  assert.deepEqual(J(Object.keys(w.appState.get('measurements'))), ['m', 'V']);
  // ma'lumotsiz "Keyingi: B tur" — to'xtatadi
  w.document.querySelector('[data-flow-next="data"]').click();
  assert.deepEqual(J(w.toasts), ['error']);
  assert.deepEqual(J(w.went), []);
  // qiymatlar: har kiritishda oxirida bitta bo'sh qator qoladi
  ['100.02', '100.06', '99.98'].forEach((v, i) => { enter(w, 'm', i, v); assert.equal(w.appState.get('n'), i + 2); });
  ['10.01', '10.02', '10.00'].forEach((v, i) => enter(w, 'V', i, v));
  assert.equal(w.document.querySelectorAll('#table-body tr').length, 4);
  assert.deepEqual(J(w.appState.get('measurements').V), ['10.01', '10.02', '10.00', ''], 'matn sifatida, oxirgi nollar bilan');
  // A tur avtomatik: dvigatel natijasi bilan AYNAN bir xil
  const st = w.appState.get();
  assert.deepEqual(J(Object.keys(st.typeA)), ['m', 'V']);
  assert.deepEqual(JSON.parse(JSON.stringify(st.typeA.m)), JSON.parse(JSON.stringify(E.typeAx(st.measurements.m, { dirs: [] }))));
  // oxirgi qiymat o'chirilsa — jadval qisqaradi
  enter(w, 'm', 2, ''); enter(w, 'V', 2, '');
  assert.equal(w.appState.get('n'), 3);
  // "Keyingi" tugmalari
  w.document.querySelector('[data-flow-next="model"]').click();
  w.document.querySelector('[data-flow-next="data"]').click();
  assert.deepEqual(J(w.went), ['data', 'typeb']);
  // "Hammasini tozalash" — bitta bo'sh qator
  w.document.getElementById('btn-clear-data').click();
  assert.equal(w.appState.get('n'), 1);
  assert.deepEqual(J(w.appState.get('typeA')), {});
});

test('formulada nom almashtirilsa ma\'lumot jimgina o\'chmaydi: ogohlantirish + "ko\'chirish" / "olib tashlash" (foydalanuvchi qarori)', () => {
  const w = mount(null);
  w.appState.set({ ...Flow.blankCalc(), params: ['m', 'V'], model: { formula: 'ρ = m / V', unit: '' }, measurements: { m: ['1.0', '1.2'], V: ['2.0', '2.1'] },
    typeB: [{ id: 'b1', param: 'm', name: 'Tarozi', halfWidth: 0.01, distribution: 'rect' }], units: { m: 'g' } });
  typeFormula(w, 'ρ = M / V');
  assert.deepEqual(J(w.appState.get('params')), ['M', 'V', 'm']);
  const warn = w.document.getElementById('model-unused');
  assert.match(warn.textContent, /«m»/);
  // ko'chirish: kuzatuvlar va B tur manbasi yangi nomga o'tadi
  warn.querySelector('[data-move-param="m"][data-move-to="M"]').click();
  const st = w.appState.get();
  assert.deepEqual(J(st.params), ['M', 'V']);
  assert.deepEqual(J(st.measurements.M.slice(0, 2)), ['1.0', '1.2']);
  assert.equal(st.typeB[0].param, 'M');
  assert.equal(w.document.getElementById('model-unused').textContent.trim(), '');
  // olib tashlash: tasdiq bilan, B tur manbalari bilan birga
  typeFormula(w, 'y = V');
  assert.deepEqual(J(w.appState.get('params')), ['V', 'M']);
  w.confirm = () => false;
  w.document.querySelector('[data-drop-param="M"]').click();
  assert.deepEqual(J(w.appState.get('params')), ['V', 'M'], 'tasdiqlanmasa — o\'chmaydi');
  w.confirm = () => true;
  w.document.querySelector('[data-drop-param="M"]').click();
  assert.deepEqual(J(w.appState.get('params')), ['V']);
  assert.deepEqual(J(w.appState.get('typeB')), []);
  // shablon ostida parametrlar ro'yxatiga tegilmaydi (kirishlar shablonda belgilangan)
  w.appState.set({ template: { id: 'T-01', version: '0.1.0' } });
  typeFormula(w, 'y = V + q');
  assert.deepEqual(J(w.appState.get('params')), ['V']);
});

/* ─── Shablon rejimi: formula qulfi va "Shablondan ajratib tahrirlash" (2026-11-24) ─── */
test('shablonda formula qulflangan (readonly, izoh); ajratish — natija o\'zgarmaydi, keyin formula erkin va parametrlar formuladan', () => {
  const T = require('../../src/templates/interpreter.js');
  const { byId } = require('../templates/lib.js');
  const w = mount(null);
  w.UCTemplates = { detachState: st => T.detachState(J(st)) };
  const tplState = T.buildState(byId['legacy-gas_analyzer'], { useSample: true, point: 1 }).state;
  w.appState.set(J(tplState));
  const doc = w.document;
  const f = doc.getElementById('model-formula');
  const formula0 = w.appState.get('model').formula;
  assert.ok(f.hasAttribute('readonly'), 'formula readonly');
  assert.ok(doc.getElementById('model-unit').hasAttribute('readonly'), 'natija birligi readonly');
  assert.ok(doc.querySelector('[data-model-locked] [data-tpl-detach]'), 'izoh va ajratish tugmasi');
  assert.equal(doc.querySelector('[data-out-add]'), null, 'shablonda chiqish qo\'shilmaydi');
  assert.ok([...doc.querySelectorAll('.model-chip')].every(b => b.disabled));
  // qulf: o'zgarish qabul qilinmaydi
  typeFormula(w, 'y = q + 1');
  assert.equal(w.appState.get('model').formula, formula0);
  const ref = T.evaluateState(tplState).result;
  // tasdiqlanmasa — ajratilmaydi
  w.confirm = () => false;
  doc.querySelector('[data-tpl-detach]').click();
  assert.ok(w.appState.get('template'));
  w.confirm = () => true;
  doc.querySelector('[data-tpl-detach]').click();
  const st = w.appState.get();
  assert.equal(st.template, null);
  assert.deepEqual(J(st.params), J(tplState.params));
  const got = E.evaluate(J(st));
  for (const k of ['y', 'uc', 'U', 'k', 'nuEff']) assert.equal(got[k], ref[k], k + ' — ajratishdan keyin aynan bir xil');
  assert.ok(w.toasts.includes('success'));
  const f2 = doc.getElementById('model-formula');
  assert.ok(!f2.hasAttribute('readonly'));
  assert.equal(doc.querySelector('[data-model-locked]'), null);
  typeFormula(w, formula0 + ' + q');
  assert.ok(J(w.appState.get('params')).includes('q'), 'yangi kattalik — yangi ustun');
});

test('oxirgi bo\'sh qatorda ko\'rsatma (faqat birinchi ustunda): "Keyingi o\'lchash yoki Ctrl+V"', () => {
  const w = mount(null);
  w.appState.set({ ...Flow.blankCalc() });
  typeFormula(w, 'ρ = m / V');
  const ph = (p, i) => cell(w, p, i).getAttribute('placeholder');
  assert.equal(ph('m', 0), w.i18n.t('flow_row_ph'));
  assert.equal(ph('V', 0), null);
  enter(w, 'm', 0, '1.0');
  assert.equal(ph('m', 0), null, 'to\'ldirilgan qatorda yo\'q');
  assert.equal(ph('m', 1), w.i18n.t('flow_row_ph'));
});

/* ─── MIGRATSIYA: eski saqlangan hisoblar ─── */
test('eski saqlangan hisoblar (uc_state_v2): ochiladi, parametrlar va kiritilgan qiymatlar o\'zgarmaydi, natija bit darajasida bir xil', () => {
  const PRESETS = loadPresets();
  const cases = [];
  for (const [key, pd] of Object.entries(PRESETS)) {
    const idx = pd.points ? pd.points.map((_, i) => i) : [null];
    for (const i of idx) {
      const st = presetState(pd, i);
      // eski UI holati: n = preset.n, qatorlar n gacha bo'sh satr bilan to'ldirilgan
      const measurements = Object.fromEntries(st.params.map(p => [p, Array.from({ length: pd.n }, (_, r) => (st.measurements[p][r] === undefined ? '' : st.measurements[p][r]))]));
      cases.push([key + (i === null ? '' : '#' + i), { ...st, n: pd.n, measurements, typeA: {}, combined: null, points: [], currentPoint: null, theme: 'dark', lang: 'uz' }]);
    }
  }
  // formulasiz bir nechta parametr (eski "p = 2" bilan boshlangan hisob), modelKind yo'q, oraliqda bo'sh katak
  cases.push(['formulasiz', { n: 6, params: ['x', 'y'], measurements: { x: ['1', '', '3', '', '', ''], y: ['', '2', '', '', '', ''] }, model: { formula: '', unit: '' },
    settings: { paired: true, P: 0.9545 }, typeB: [], typeA: {}, combined: null, points: [], directions: ['↑', '↓', '', '', '', ''] }]);
  assert.ok(cases.length >= 18);
  for (const [name, old] of cases) {
    const before = E.evaluate(JSON.parse(JSON.stringify(old)));
    const w = mount(old);
    const st = w.appState.get();
    assert.deepEqual(J(st.params), old.params, name + ': parametrlar');
    assert.deepEqual(J(st.model), old.model, name + ': model');
    for (const p of old.params) {
      const a = old.measurements[p], used = Flow.usedRows(old);
      assert.deepEqual(J(st.measurements[p].slice(0, used)), a.slice(0, used), `${name}: ${p} qiymatlari (joyi bilan)`);
      assert.ok(st.measurements[p].slice(used).every(v => v === ''), `${name}: ${p} — faqat bo'sh qatorlar qisqargan`);
    }
    assert.equal(st.n, Flow.fitRows(old), name + ': qatorlar');
    assert.equal(w.document.querySelectorAll('#table-body tr').length, st.n);
    assert.deepEqual(J(st.typeB), J(old.typeB), name + ': B tur');
    assert.equal(Flow.hasSession(st), true, name + ': hisob davom ettiriladi');
    const after = E.evaluate(JSON.parse(JSON.stringify(st)));
    assert.deepEqual(JSON.parse(JSON.stringify(after)), JSON.parse(JSON.stringify(before)), name + ': natija bit darajasida bir xil');
  }
  // yo'nalishlar (gisterezis) to'ldirilgan qatorlarda saqlanadi
  const w = mount(cases[cases.length - 1][1]);
  assert.deepEqual(J(w.appState.get('directions').slice(0, 2)), ['↑', '↓']);
});

test('eski saqlangan yozuvlar (IndexedDB `calculations`): Bosh sahifadan ochish yamog\'i yangi oqimda ham ishlaydi', async () => {
  const Home = await import('../../src/ui/home/model.js');
  const pd = loadPresets().density, state = { ...presetState(pd, null), n: pd.n };
  const result = E.evaluate(JSON.parse(JSON.stringify(state)));
  const p = Home.sessionPatch({ id: 'calc-1', state, result, engineVersion: E.ENGINE_VERSION, createdAt: '2026-11-01T10:00:00Z' }, E.ENGINE_VERSION);
  const w = mount(null);
  w.appState.set(p.patch);
  const st = w.appState.get();
  assert.deepEqual(J(st.params), pd.params);
  assert.equal(st.n, Flow.fitRows(state));
  assert.ok(st.combined && st.combined.y === result.y, 'saqlangan natija joyida');
  assert.deepEqual(J(Object.keys(st.typeA)), pd.params, 'A tur avtomatik tiklanadi');
});
