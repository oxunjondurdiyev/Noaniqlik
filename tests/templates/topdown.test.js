/* P09: TOP_DOWN rejimidagi shablonlar — sxema (evaluationMode + topDown bo'limi), semantik tekshiruv (X11, X12),
   shablon → usta holati (buildTopDownState) → uc-topdown/1 → evaluate(); TD-01…TD-04 DRAFT shablonlari. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { templates, byId, schema } = require('./lib.js');
const T = require('../../src/templates/interpreter.js');
const { validate } = require('../../src/templates/validator.js');
const E = require('../../src/engine/index.js');
const B = require('../../src/ui/topdown/build.js');
const NH4 = require('../cases/nordtest/nordtest-tr537-nh4n.json');

const clone = o => JSON.parse(JSON.stringify(o));
const TD = ['TD-01', 'TD-02', 'TD-03', 'TD-04'].map(id => byId[id]);
const errs = (id, mut) => { const t = clone(byId[id]); mut(t); return T.checkTemplate(t, schema).errors.join(' | '); };

test('TD-01…TD-04: DRAFT, TOP_DOWN, sxema va semantik tekshiruvdan o\'tadi; katalogda bor', () => {
  for (const t of TD) {
    assert.ok(t, 'shablon yo\'q');
    assert.deepEqual([t.status, t.evaluationMode, t.domain], ['DRAFT', 'TOP_DOWN', 'TESTING'], t.id);
    assert.deepEqual(T.checkTemplate(t, schema).errors, [], t.id);
    assert.ok(T.isTopDown(t) && !T.isRegression(t));
    assert.ok(templates.some(x => x.file === t.id + '.json'));
    assert.ok(t.openQuestions.length >= 1, t.id);
  }
});

test('raqamli maydonlar bo\'sh: qo\'shimcha hissalarning u qiymati null; shablonda hech qanday o\'lchash soni yo\'q', () => {
  for (const t of TD) {
    for (const a of t.topDown.additional || []) assert.equal(a.u, null, `${t.id}.${a.id}`);
    assert.deepEqual(t.typeBSources, []);
    assert.equal(t.sampleData, undefined); assert.equal(t.points, undefined);
    // topDown bo'limida son umuman yo'q
    const nums = [];
    (function walk(o) { if (typeof o === 'number') nums.push(o); else if (o && typeof o === 'object') Object.values(o).forEach(walk); })(t.topDown);
    assert.deepEqual(nums, [], t.id);
  }
  // sxema: u ga son yozib bo'lmaydi
  const bad = clone(byId['TD-02']); bad.topDown.additional[0].u = 0.115;
  assert.equal(validate(schema, bad).valid, false);
});

test('to\'rt shablon mazmuni: ammoniy (Nordtest), namlik (empirik), beton (empirik, T-03 bilan bog\'langan), AAS (R-01 bilan)', () => {
  const [nh4, moist, concrete, aas] = TD;
  assert.deepEqual([nh4.topDown.basis, nh4.topDown.biasSource, nh4.topDown.scale], ['within', 'pt', 'relative']);
  assert.match(nh4.sourceNote.en, /Nordtest TR 537 ed\. 4 \(2017\) §3\.2/);
  assert.equal(moist.isEmpiricalMeasurand, true); assert.equal(moist.topDown.basis, 'sR');
  assert.deepEqual(moist.topDown.additional.map(a => a.category), ['temperature', 'time']);
  assert.equal(concrete.isEmpiricalMeasurand, true);
  assert.equal(concrete.topDown.linkedTemplate, 'T-03');
  assert.ok(byId[concrete.topDown.linkedTemplate], 'bog\'langan shablon mavjud');
  assert.equal(byId['T-03'].evaluationMode, 'GUM_BOTTOM_UP');
  assert.deepEqual(concrete.topDown.additional.map(a => a.category), ['instrument', 'speed', 'temperature', 'time']);
  // takrorlanmaydi: T-03 ning modeli, kirishlari va B tur manbalari ko'chirilmagan; standart shifri bo'yicha qidiruv faqat T-03 ni topadi
  assert.notEqual(concrete.model.formula, byId['T-03'].model.formula);
  assert.equal(concrete.inputs.length, 1);
  assert.deepEqual(templates.map(x => x.tpl).filter(t => T.matchTemplate(t, '10180')).map(t => t.id), ['T-03']);
  assert.equal(aas.topDown.regressionTemplate, 'R-01');
  assert.equal(byId['R-01'].evaluationMode, 'REGRESSION');
  assert.ok(aas.topDown.covers.includes('calibration'));
  for (const t of [nh4, aas]) assert.notEqual(t.isEmpiricalMeasurand, true);
});

test('sxema: TOP_DOWN rejimida `topDown` majburiy; noto\'g\'ri qiymatlar rad etiladi; boshqa rejimlarga ta\'sir yo\'q', () => {
  const no = clone(byId['TD-01']); delete no.topDown;
  assert.ok(validate(schema, no).errors.some(e => /topDown/.test(e.message)));
  const badBasis = clone(byId['TD-01']); badBasis.topDown.basis = 'bottom';
  assert.equal(validate(schema, badBasis).valid, false);
  const badCat = clone(byId['TD-03']); badCat.topDown.additional[0].category = 'magic';
  assert.equal(validate(schema, badCat).valid, false);
  const extra = clone(byId['TD-01']); extra.topDown.k = 2;
  assert.equal(validate(schema, extra).valid, false);
  assert.equal(validate(schema, byId['T-01']).valid, true);
  assert.equal(validate(schema, byId['R-01']).valid, true);
});

test('semantik tekshiruv: X11 (qamralgan toifa qo\'shimcha hissada), X12 (empirik + bias), shkala va asos mosligi', () => {
  assert.match(errs('TD-04', t => { t.topDown.additional.push({ id: 'u_cal', category: 'calibration', u: null, name: t.topDown.additional[0].name }); }), /X11 — category "calibration"/);
  assert.match(errs('TD-01', t => { t.topDown.additional = [{ id: 'rep', category: 'repeatability', u: null, name: t.title }]; }), /X11/);
  assert.match(errs('TD-03', t => { t.topDown.biasSource = 'crm'; }), /X12/);
  assert.match(errs('TD-02', t => { t.topDown.biasSource = 'pt'; }), /not used with basis "sR"/);
  assert.match(errs('TD-01', t => { t.topDown.rwSources = []; }), /at least one source/);
  assert.match(errs('TD-01', t => { t.topDown.scale = 'absolute'; t.topDown.biasSource = 'recovery'; }), /recovery requires scale "relative"/);
  assert.match(errs('TD-01', t => { t.topDown.basis = 'level'; t.topDown.rwSources = []; t.topDown.biasSource = 'none'; }), /requires scale "absolute"/);
  assert.match(errs('TD-01', t => { t.typeBSources = clone(byId['T-03'].typeBSources.slice(0, 1)); }), /typeBSources are not used/);
  assert.match(errs('TD-03', t => { t.topDown.linkedTemplate = 'TD-03'; }), /self reference/);
  assert.match(errs('TD-01', t => { t.topDown.hint.ru = ''; }), /hint/);
});

test('shablon → usta holati: sonli maydonlar bo\'sh, birlik va empiriklik shablondan; uch tilda', () => {
  for (const lang of ['uz', 'ru', 'en']) {
    const b = T.buildTopDownState(byId['TD-03'], { lang, ui: true });
    assert.equal(b.error, undefined);
    assert.deepEqual([b.state.basis, b.state.scale, b.state.unit, b.state.empirical, b.state.bias], ['within', 'relative', 'MPa', true, 'none']);
    assert.deepEqual(b.state.rwSources, ['duplicates']);
    assert.equal(b.state.additional.length, 4);
    assert.ok(b.state.additional.every(a => a.u === '' && a.name));
    assert.equal(b.state.additional[0].name, byId['TD-03'].topDown.additional[0].name[lang]);
    assert.deepEqual([b.meta.mode, b.meta.status, b.meta.linkedTemplate, b.meta.isEmpiricalMeasurand], ['TOP_DOWN', 'DRAFT', 'T-03', true]);
    assert.equal(b.meta.hint, byId['TD-03'].topDown.hint[lang]);
    assert.equal(b.meta.openQuestionList.length, 2);
  }
  assert.equal(T.buildTopDownState(byId['TD-04']).meta.regressionTemplate, 'R-01');
  assert.equal(T.buildTopDownState(byId['T-01']).error, 'not_topdown_template');
  assert.equal(T.buildState(byId['TD-01']).error, 'topdown_template');
});

test('bo\'sh shablon bilan hisob qilinmaydi (bo\'sh maydon 0 emas); TD-01 ga Nordtest ma\'lumoti kiritilsa — manba natijasi', () => {
  const b = T.buildTopDownState(byId['TD-01'], { lang: 'uz' });
  const empty = B.buildSpec({ ...B.defaults(), ...b.state });
  assert.equal(E.evaluate(empty.spec).error, 'topdown_too_few');         // nazorat namunasi qatori bo'sh
  // laboratoriya o'z ma'lumotini kiritadi (bu yerda — TR 537 Appendix 4, p. 40 va §3.2, p. 10)
  const pt = NH4.modelSpec.bias.rounds.map(r => `${r.bias}\t${r.sR}\t${r.nLab}`).join('\n');
  const filled = B.buildSpec({ ...B.defaults(), ...b.state, rwSources: ['control_limits'], limit: '3.34', ptRows: pt, y: '148' });
  const r = E.evaluate(filled.spec);
  assert.equal(r.error, undefined);
  assert.ok(Math.abs(r.uc - 3.20) <= 0.005);
  assert.equal(r.yUnit, 'µg/L');
  assert.deepEqual(r.warnings, []);
});

test('TD-02 (empirik, s_R): qo\'shimcha hissa bo\'sh qoldirilsa — xato; to\'ldirilsa — bias qo\'shilmaydi, X11/X12 yo\'q', () => {
  const b = T.buildTopDownState(byId['TD-02'], { lang: 'en' });
  const st = { ...B.defaults(), ...b.state, sR: '0.29' };
  assert.equal(E.evaluate(B.buildSpec(st).spec).error, 'topdown_bad_data');   // u_T, u_t kiritilmagan
  st.additional = st.additional.map((a, i) => ({ ...a, u: i === 0 ? '0.05' : '0.115' }));
  const r = E.evaluate(B.buildSpec(st).spec);
  assert.equal(r.error, undefined);
  assert.equal(r.isEmpiricalMeasurand, true);
  assert.equal(r.bias, null);
  assert.deepEqual(r.warnings, []);
  assert.ok(Math.abs(r.uc - Math.sqrt(0.29 ** 2 + 0.05 ** 2 + 0.115 ** 2)) < 1e-12);
});

test('TD-04 (AAS): kalibrlash R_w ichida — R-01 dagi u(c₀) qo\'shilsa X11', () => {
  const b = T.buildTopDownState(byId['TD-04'], { lang: 'en' });
  const st = { ...B.defaults(), ...b.state, qcValues: '9.8 10.1 10.3 9.9 10.0', crmRows: '2\t3\t10\t1.5',
    additional: [{ name: 'u(c0) from R-01', category: 'calibration', u: '1.2' }] };
  const r = E.evaluate(B.buildSpec(st).spec);
  assert.equal(r.error, undefined);
  assert.ok(r.warnings.some(w => w.rule === 'X11' && /u\(c0\)/.test(w.value)));
});
