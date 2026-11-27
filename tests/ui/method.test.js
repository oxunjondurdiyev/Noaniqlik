/* P22-2 (audit UX-03): Model qadamidagi "Usul" qatori — sof model (src/ui/method/model.js) va DOM ulanishi
   (src/ui/method/app.js, jsdom). Tavsiya — dvigateldan (suggestMethod); bu yerda hisob yo'q.
   Asosiy qoidalar: standart — Avtomatik; Avtomatik rejim O'ZI yorliq almashtirmaydi; shablonda usul qulflangan;
   tanlov mavjud interfeysni window.switchTab orqali ochadi; settings.method / dataKind — faqat interfeys maydonlari. */
'use strict';
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { JSDOM } = require('jsdom');
const E = require('../../src/engine/index.js');
const { MODES } = require('../../src/engine/linter/util.js');
const M = require('../../src/ui/method/model.js');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const LANGS = ['uz', 'ru', 'en'];
const I18N = ['i18n.js', 'i18n-ext.js', 'i18n-engine.js', 'i18n-templates.js', 'i18n-shell.js', 'i18n-p20.js', 'i18n-flow.js', 'i18n-advisor.js'];
const J = v => JSON.parse(JSON.stringify(v));

/* ─── sof model ─── */
test('METHODS: faqat mavjud usullar (Kragten yo\'q); har biri mavjud yorliq / ichki rejimni ochadi; matnlar uch tilda', async () => {
  assert.deepEqual(M.METHODS.map(m => m.key), ['AUTO', 'GUM', 'GUM_MC', 'MULTIVARIATE', 'REGRESSION', 'TOP_DOWN', 'INTERLAB', 'SAMPLING', 'QUALITATIVE', 'MICRO', 'MEDICAL']);
  assert.ok(!JSON.stringify(M.METHODS).toLowerCase().includes('kragten'), 'Kragten — P21');
  const doc = new JSDOM(read('index.html')).window.document;
  const Special = await import('../../src/ui/special/build.js');
  const TdView = read('src/ui/topdown/view.js'), TdBuild = read('src/ui/topdown/build.js');
  for (const m of M.METHODS.filter(x => x.key !== 'AUTO')) {
    assert.ok(MODES.includes(m.mode), m.key + ': dvigatel usul kaliti');
    const o = m.open || {};
    if (o.tab) assert.ok(doc.getElementById('tab-' + o.tab), m.key + ' → tab-' + o.tab);
    if (o.special) assert.ok(Special.MODES.includes(o.special), o.special);
    if (o.topdown) { assert.ok(TdView.includes(`'${o.topdown}'`) && TdBuild.includes(`st.basis === '${o.topdown}'`), 'Top-down ustasida "' + o.topdown + '" rejimi bor'); }
  }
  // Laboratoriyalararo (ISO 21748) — Top-down ustasining mavjud "s_R asosida" rejimi → dvigatelda REPRODUCIBILITY
  assert.deepEqual(M.methodOf('INTERLAB').open, { tab: 'topdown', topdown: 'sR' });
  assert.match(TdBuild, /if \(st\.basis === 'sR'\) \{\s*spec\.approach = 'REPRODUCIBILITY';/);
  assert.deepEqual(M.METHODS.filter(m => m.beta).map(m => m.key), ['MICRO'], 'faqat mikrobiologiya BETA (P19)');
  // "Ma'lumot turi" tugmalari — dvigatel DATA_KINDS bilan bir xil
  assert.deepEqual(M.DATA_KIND_OPTIONS.map(o => o.key), [...E.DATA_KINDS]);
  // matn kalitlari — uch tilda (usul nomi, izoh, ma'lumot turi, sabablar)
  const win = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' }).window;
  const TR = win.eval(I18N.map(f => read('src/js/' + f)).join('\n;\n') + '\n;TRANSLATIONS');
  const keys = [...M.METHODS.flatMap(m => [m.labelKey, m.hintKey]), ...M.DATA_KIND_OPTIONS.map(o => o.labelKey),
    ...E.ADVISOR_REASONS.map(c => 'adv_r_' + c), 'adv_r_mcm', 'mt_label', 'mt_by_template', 'mt_change', 'mt_go', 'mt_pick', 'mt_beta', 'mt_locked', 'mt_kind_q'].filter(Boolean);
  for (const lang of LANGS) for (const k of keys) assert.ok(typeof TR[lang][k] === 'string' && TR[lang][k].trim(), `${lang}: ${k}`);
  for (const lang of LANGS) assert.ok(TR[lang].adv_r_mcm.includes('{c}'));
});

test('model: eski hisob (settings.method yo\'q) — Avtomatik; tavsiya → ro\'yxatdagi usul; "Ma\'lumot turi" savoli sharti', () => {
  assert.equal(M.selectedKey({}), 'AUTO');
  assert.equal(M.selectedKey({ settings: { paired: true } }), 'AUTO');
  assert.equal(M.selectedKey({ settings: { method: 'NOPE' } }), 'AUTO');
  assert.equal(M.selectedKey({ settings: { method: 'REGRESSION' } }), 'REGRESSION');
  const sug = (st, r) => M.methodForSuggestion(E.suggestMethod(M.advisorState(st), r)).key;
  assert.equal(sug({ params: ['x'] }), 'GUM');
  assert.equal(sug({}, { mcm: { required: true, reasons: [{ code: 'd', value: 3, threshold: 6, ref: 'r' }] } }), 'GUM_MC');
  assert.equal(sug({ outputs: [{ formula: 'a' }, { formula: 'b' }] }), 'MULTIVARIATE');
  assert.equal(sug({ settings: { dataKind: 'qc_crm_pt' } }), 'TOP_DOWN');
  assert.equal(sug({ settings: { dataKind: 'interlab_sr_sR' } }), 'INTERLAB');
  assert.equal(sug({ settings: { dataKind: 'calibration_curve' } }), 'REGRESSION');
  assert.equal(sug({ settings: { dataKind: 'micro_count' } }), 'MICRO');
  // GUM shabloni (meta da `mode` yo'q) — GUM; ko'p chiqishli shablon — MULTIVARIATE
  assert.equal(sug({ template: { id: 'T-01' } }), 'GUM');
  assert.equal(sug({ template: { id: 'MV-01' }, outputs: [{ formula: 'a' }, { formula: 'b' }] }), 'MULTIVARIATE');
  // savol: Avtomatik + shablonsiz + formula bo'sh
  assert.equal(M.showDataKind({ params: ['x'], model: { formula: '' } }), true);
  assert.equal(M.showDataKind({ model: { formula: 'y = a + b' } }), false);
  assert.equal(M.showDataKind({ model: { formula: '' }, settings: { method: 'GUM' } }), false);
  assert.equal(M.showDataKind({ model: { formula: '' }, template: { id: 'T-01' } }), false);
  // qator: shablonda saqlangan tanlov e'tiborsiz (usul shablondan)
  const row = M.methodRow({ template: { id: 'T-01' }, settings: { method: 'REGRESSION' } }, E.suggestMethod(M.advisorState({ template: { id: 'T-01' } })));
  assert.equal(row.mode, 'template'); assert.equal(row.method.key, 'GUM'); assert.equal(row.locked, true);
  // MC sabablari bitta bo'lakka yig'iladi (batafsil — Natija qadamidagi MCM bo'limida)
  assert.deepEqual(M.reasonParts([{ code: 'b', ref: 'r1' }, { code: 'd', ref: 'r2' }, { code: 'b', ref: 'r1' }]), [{ key: 'adv_r_mcm', codes: ['b', 'd'], ref: 'r1; r2', verified: true }]);
  assert.deepEqual(M.reasonParts([{ code: 'interlab_precision', ref: 'ISO 21748:2017 §10 (unverified)', verified: false }]), [{ key: 'adv_r_interlab_precision', ref: 'ISO 21748:2017 §10 (unverified)', verified: false }]);
});

/* ─── DOM (jsdom) ─── */
let w, doc, calls, special, topdown;
const $ = sel => doc.querySelector(sel);
const click = sel => { const el = $(sel); assert.ok(el, sel); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
const pick = key => { const s = $('#method-select'); s.value = key; s.dispatchEvent(new w.Event('change', { bubbles: true })); };
const reset = patch => { w.appState.set({ params: ['x'], model: { formula: '', unit: '' }, outputs: undefined, implicit: undefined, template: null, combined: null, settings: { paired: true, P: 0.9545, modelKind: 'unknown' }, ...patch }); calls.length = 0; };

before(async () => {
  const dom = new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g, ''), { url: 'https://example.test/', runScripts: 'outside-only' });
  w = dom.window; doc = w.document;
  w.eval(read('src/ui/escape.js'));
  w.eval(I18N.map(f => read('src/js/' + f)).join('\n;\n'));
  w.i18n.lang = 'uz';
  w.eval(read('src/js/state.js'));
  calls = [];
  w.switchTab = tab => calls.push(tab);
  w.showToast = () => {};
  special = { mode: 'sampling' }; topdown = { basis: 'within', step: 2 };
  w.UCSpecial = { getState: () => ({ ...special }), setState: s => { special = { ...s }; } };
  w.UCTopDown = { getState: () => ({ ...topdown }), setState: s => { topdown = { ...s }; } };
  global.window = w; global.document = doc;
  await import(pathToFileURL(path.join(ROOT, 'src/ui/method/app.js')).href);
  reset();
});

test('standart holat — "Usul: Avtomatik → GUM (LPU)" + sabab va manba; "O\'zgartirish" tugmasi; "Ma\'lumot turi" savoli', () => {
  const row = $('#method-row');
  assert.equal(row.dataset.methodMode, 'auto');
  assert.equal($('[data-method-name]').dataset.methodName, 'AUTO');
  assert.equal($('[data-method-name]').textContent, 'Avtomatik');
  assert.equal($('[data-method-suggested]').dataset.methodSuggested, 'GUM');
  assert.match(row.textContent, /Usul: Avtomatik → GUM \(LPU\) — o'lchash modeli bo'yicha noaniqlik byudjeti JCGM 100:2008 §5\.1/);
  assert.equal($('[data-method-change]').tagName, 'BUTTON');
  assert.equal($('[data-method-go]'), null, 'GUM — shu oqimning o\'zi: "O\'tish" yo\'q');
  assert.ok($('#method-pick').hidden);
  assert.deepEqual([...doc.querySelectorAll('#method-select option')].map(o => o.value), M.METHODS.map(m => m.key));
  assert.equal(doc.querySelectorAll('[data-method-kind]').length, 8);
  // qatorda asosiy tugma yo'q (har qadamda AYNAN bitta [data-primary] — panel pastida); inline uslub / hodisa yo'q
  assert.equal(row.querySelectorAll('.btn-primary, [data-primary]').length, 0);
  assert.equal(doc.querySelectorAll('#tab-model .panel-footer [data-primary]').length, 1);
  assert.equal(doc.querySelectorAll('#tab-model [data-primary]').length, 1);
  assert.ok(!/ style=| on[a-z]+=/.test(row.innerHTML));
  assert.deepEqual(calls, []);
});

test('"O\'zgartirish" → ro\'yxat; "Regressiya" tanlansa switchTab(\'regression\'); tanlov saqlanadi, natija (combined) o\'zgarmaydi', () => {
  const combined = { y: 1, uc: 0.1, mcm: { required: false, reasons: [] } };
  reset({ combined });
  click('[data-method-change]');
  assert.equal($('#method-pick').hidden, false);
  assert.equal($('[data-method-change]').getAttribute('aria-expanded'), 'true');
  pick('REGRESSION');
  assert.deepEqual(calls, ['regression']);
  assert.equal(w.appState.get('settings').method, 'REGRESSION');
  assert.deepEqual(J(w.appState.get('combined')), combined, 'usul tanlovi natijani bekor qilmaydi');
  assert.equal($('#method-row').dataset.methodMode, 'manual');
  assert.equal($('[data-method-name]').dataset.methodName, 'REGRESSION');
  assert.ok($('[data-method-go="REGRESSION"]'));
  assert.equal($('[data-method-kinds]'), null, 'qo\'lda tanlanganda "Ma\'lumot turi" savoli yo\'q');
  // Avtomatikka qaytish — maydon o'chiriladi (eski hisoblar bilan bir xil holat), yorliq almashmaydi
  calls.length = 0;
  click('[data-method-change]'); pick('AUTO');
  assert.equal('method' in w.appState.get('settings'), false);
  assert.deepEqual(calls, []);
});

test('AVTOMATIK REJIM O\'ZI YORLIQ ALMASHTIRMAYDI: ma\'lumot turi → faqat tavsiya; o\'tish — foydalanuvchi "O\'tish" ni bosganda', () => {
  reset();
  for (const [kind, method, tab] of [['calibration_curve', 'REGRESSION', 'regression'], ['qc_crm_pt', 'TOP_DOWN', 'topdown'], ['sampling_duplicates', 'SAMPLING', 'special'],
    ['binary', 'QUALITATIVE', 'special'], ['iqc_medical', 'MEDICAL', 'special'], ['interlab_sr_sR', 'INTERLAB', 'topdown'], ['micro_count', 'MICRO', 'special']]) {
    reset();
    click(`[data-method-kind="${kind}"]`);
    assert.equal(w.appState.get('settings').dataKind, kind);
    assert.equal($('[data-method-name]').dataset.methodName, 'AUTO', 'rejim Avtomatik bo\'lib qoladi');
    assert.equal($('[data-method-suggested]').dataset.methodSuggested, method, kind);
    assert.equal($(`[data-method-kind="${kind}"]`).getAttribute('aria-pressed'), 'true');
    assert.deepEqual(calls, [], kind + ': yorliq o\'zi almashmadi');
    assert.equal('method' in w.appState.get('settings'), false);
    click('[data-method-go]');
    assert.deepEqual(calls, [tab], kind);
    assert.equal('method' in w.appState.get('settings'), false, '"O\'tish" tanlovni o\'zgartirmaydi');
  }
  // manbasi repoda yo'q usullarda "(unverified)" havolasi ko'rinadi; mikrobiologiya — BETA belgisi bilan
  assert.match($('#method-row').textContent, /ISO 19036 \(unverified\)/);
  assert.ok($('[data-method-beta]'));
  // ichki rejimlar oldindan tanlandi (mavjud API orqali)
  assert.equal(special.mode, 'micro');
  assert.equal(topdown.basis, 'sR');
  assert.equal(topdown.step, 1);
  // qayta bosish — javobni olib tashlaydi
  click('[data-method-kind="micro_count"]');
  assert.equal('dataKind' in w.appState.get('settings'), false);
  // natija MCM ni talab qilsa — tavsiya "GUM + Monte-Karlo", lekin yorliq almashmaydi (P20 avtomatik MCM alohida)
  reset({ model: { formula: 'y = a * b', unit: '' }, params: ['a', 'b'], combined: { y: 1, uc: 1, mcm: { required: true, reasons: [{ code: 'd', value: 3.2, threshold: 6, ref: 'JCGM 100:2008 G.6.6' }] } } });
  assert.equal($('[data-method-suggested]').dataset.methodSuggested, 'GUM_MC');
  assert.match($('#method-row').textContent, /\(d\)/);
  assert.equal($('[data-method-kinds]'), null, 'formula kiritilgan — savol ko\'rinmaydi');
  assert.deepEqual(calls, []);
});

test('shablondan boshlangan hisob: usul shablondan va QULFLANGAN — "Shablon bo\'yicha: …"; ro\'yxat va savol yo\'q', () => {
  reset({ template: { id: 'T-01', version: '1.0.0', status: 'DRAFT' }, model: { formula: 'rho = m / V', unit: '' }, params: ['m', 'V'], settings: { paired: true, method: 'REGRESSION', dataKind: 'binary' } });
  const row = $('#method-row');
  assert.equal(row.dataset.methodMode, 'template');
  assert.match(row.textContent, /^\s*Shablon bo'yicha: GUM \(LPU\)\s*T-01/);
  assert.equal($('[data-method-name]').dataset.methodName, 'GUM');
  assert.equal($('[data-method-change]'), null);
  assert.equal($('#method-select'), null);
  assert.equal($('[data-method-kinds]'), null);
  assert.equal($('[data-method-go]'), null);
  const before = J(w.appState.get('settings'));
  assert.equal(w.UCMethod.choose('TOP_DOWN'), false, 'Ctrl+K orqali ham o\'zgarmaydi');
  w.UCMethod.setKind('qc_crm_pt');
  assert.deepEqual(J(w.appState.get('settings')), before);
  assert.deepEqual(calls, []);
  // ko'p chiqishli shablon (MV-01)
  reset({ template: { id: 'MV-01' }, outputs: [{ formula: 'a' }, { formula: 'b' }] });
  assert.match($('#method-row').textContent, /Shablon bo'yicha: Ko'p chiqishli \(JCGM 102\)/);
});

test('ichki rejimlar: Laboratoriyalararo → Top-down "s_R asosida"; Mikrobiologiya → Maxsus rejimlar; shablonli Top-down ustasiga tegilmaydi', () => {
  reset(); special = { mode: 'sampling', saTargets: 'keep' }; topdown = { basis: 'within', step: 2, qcValues: 'keep' };
  assert.equal(w.UCMethod.choose('INTERLAB'), true);
  assert.deepEqual(calls, ['topdown']);
  assert.deepEqual(topdown, { basis: 'sR', step: 1, qcValues: 'keep' }, 'kiritilgan ma\'lumot saqlanadi');
  calls.length = 0;
  w.UCMethod.choose('MEDICAL');
  assert.deepEqual(calls, ['special']);
  assert.deepEqual(special, { mode: 'medical', saTargets: 'keep' });
  // Top-down: joriy asos (masalan "level") o'zgartirilmaydi
  topdown = { basis: 'level', step: 2 }; calls.length = 0;
  w.UCMethod.choose('TOP_DOWN');
  assert.deepEqual(topdown, { basis: 'level', step: 2 });
  assert.deepEqual(calls, ['topdown']);
  // ustada shablon yuklangan — asos almashtirilmaydi (shablon tekshirilgan metodika)
  topdown = { basis: 'within', step: 2, template: { id: 'TD-01' } };
  w.UCMethod.choose('INTERLAB');
  assert.equal(topdown.basis, 'within');
  // GUM / Monte-Karlo / Ko'p chiqishli — GUM oqimida qoladi (Model qadami)
  for (const k of ['GUM', 'GUM_MC', 'MULTIVARIATE']) { calls.length = 0; w.UCMethod.choose(k); assert.deepEqual(calls, ['model'], k); }
  assert.equal(w.UCMethod.choose('KRAGTEN'), false);
});

test('til almashganda qator qayta chiziladi (uch tilda); ko\'rinadigan matnda "null" / "undefined" yo\'q', () => {
  reset({ settings: { paired: true, dataKind: 'interlab_sr_sR' } });
  const want = { uz: /Usul: Avtomatik → Laboratoriyalararo ma'lumot/, ru: /Метод: Автоматически → Межлабораторные данные/, en: /Method: Automatic → Interlaboratory data/ };
  for (const lang of LANGS) {
    w.i18n.lang = lang;
    doc.dispatchEvent(new w.Event('langchange'));
    const text = $('#method-row').textContent;
    assert.match(text, want[lang]);
    assert.ok(!/\b(null|undefined|NaN)\b/.test(text) && !/\b(mt|adv_r)_[a-z_]+/i.test(text), lang + ': ' + text);
  }
  w.i18n.lang = 'uz';
});
