/* P07b (egasi qarori 2026-11-19, 4-band): shablonda oshkor bo'lmagan model h(Y, X) = 0 — `implicit` bo'limi;
   boshlang'ich yaqinlashuv y⁽⁰⁾ majburiy, shablon STANDART qiymat bera oladi, foydalanuvchi o'zgartirishi mumkin;
   hech biri bo'lmasa — xato (dastur o'ylab topmaydi). Model — JCGM 102:2011 §9.5.2 (p. 55–56); kirish qiymatlari va
   kutilgan natija — tests/cases/jcgm102/jcgm102-9-5-2-single.json dagi holat bilan bir xil dvigatel chaqiruvidan
   (bu yerda kirishlar orasidagi korrelyatsiyasiz — shablon interpreteri va dvigatel natijasi tengligi tekshiriladi). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const T = require('../../src/templates/interpreter.js');
const E = require('../../src/engine/index.js');
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../../schemas/methodology.schema.json'), 'utf8'));
const src = require('../cases/jcgm102/jcgm102-9-5-2-single.json').modelSpec.state;

const txt = s => ({ uz: s, ru: s, en: s });
const clone = o => JSON.parse(JSON.stringify(o));
const SYMS = ['R0', 'A', 'B', 'RS', 'r'];
function template(start) {
  return {
    schemaVersion: 'uc-template/1', id: 'TEST-IMPLICIT', version: '0.1.0', status: 'DRAFT', domain: 'CALIBRATION', section: 'calibration',
    evaluationMode: 'GUM_BOTTOM_UP', title: txt('Resistance thermometer (implicit model)'), standards: [{ code: 'JCGM 102:2011', edition: '2011', labCount: null }],
    ref: 'docs/TEMPLATE_GUIDE.md', measurand: { symbol: 'θ', name: txt('Celsius temperature'), unit: '°C' }, model: { formula: '' },
    implicit: { unknowns: [{ symbol: 'θ', unit: '°C', ...(start === undefined ? {} : { start }) }], equations: ['(1 + A*θ + B*θ^2)*R0 - r*RS'] },
    inputs: SYMS.map(s => ({ symbol: s, name: txt(s), unit: '', kind: 'observation', typeA: { method: 1, pooledAllowed: false } })),
    typeBSources: SYMS.map(s => ({ id: s + '_u', input: s, name: txt('u(' + s + ')'), kind: 'certificate', distribution: 'normal', halfWidth: null, k: null, unit: '', correlated: false })),
  };
}
const data = extra => ({
  observations: Object.fromEntries(SYMS.map(s => [s, src.measurements[s]])),
  sources: Object.fromEntries(src.typeB.map(b => [b.param + '_u', { halfWidth: b.halfWidth, k: 1 }])),
  settings: { paired: false }, ...extra,
});
const direct = E.evaluate({ ...clone(src), covB: {} });

test('shablon `implicit`: sxema va semantik tekshiruv o\'tadi; standart y⁽⁰⁾ (20 °C) bilan natija dvigatelning to\'g\'ridan-to\'g\'ri chaqiruvi bilan aynan bir xil', () => {
  const tpl = template(20);
  const chk = T.checkTemplate(tpl, schema);
  assert.deepEqual(chk.errors, []);
  const st = T.buildState(tpl, data());
  assert.equal(st.error, undefined);
  const state = st.state || st;
  assert.deepEqual(state.implicit, { unknowns: [{ name: 'θ', start: 20, unit: '°C' }], equations: ['(1 + A*θ + B*θ^2)*R0 - r*RS'] });
  const run = T.evaluateTemplate(tpl, data());
  assert.equal(run.result.error, undefined);
  assert.deepEqual([run.result.y, run.result.uc, run.result.nuEff], [direct.y, direct.uc, direct.nuEff]);   // k — shablon sozlamasidan (bu yerda solishtirilmaydi)
  assert.equal(run.result.implicit.covarianceMethod, 'annex-b');
  assert.ok(Math.abs(run.result.y - 20.0232) < 0.00005);                        // JCGM 102:2011 §9.5.2.6 (p. 56): θ̂ = 20.023 2 °C
});

test('y⁽⁰⁾: foydalanuvchi qiymati shablondagi standartdan ustun; shablonda ham, foydalanuvchida ham yo\'q → implicit_bad_start (o\'ylab topilmaydi)', () => {
  const own = T.evaluateTemplate(template(20), data({ implicitStart: { θ: '35,5' } }));
  assert.deepEqual(own.result.implicit.start, [35.5]);
  assert.ok(Math.abs(own.result.y - direct.y) <= 1e-12 * direct.y);
  const none = T.evaluateTemplate(template(), data());
  assert.deepEqual([none.result.error, none.result.detail], ['implicit_bad_start', 'θ']);
  assert.equal(T.evaluateTemplate(template(null), data()).result.error, 'implicit_bad_start');
  assert.equal(T.evaluateTemplate(template(), data({ implicitStart: { θ: 10 } })).result.error, undefined);
});

test('shablon `implicit` semantikasi: tenglamalar soni, belgi to\'qnashuvi, ishlatilmagan kirish, bo\'sh bo\'lmagan formula, variantlar, sintaksis; APPROVED da qulflangan', () => {
  const errs = mut => { const t = template(20); mut(t); return T.checkTemplate(t, schema).errors.join(' | '); };
  assert.match(errs(t => { t.implicit.equations.push('θ - 1'); }), /2 equations for 1 unknowns/);
  assert.match(errs(t => { t.implicit.unknowns[0].symbol = 'T'; }), /first unknown "T" differs from the measurand symbol/);
  assert.match(errs(t => { t.measurand.symbol = 'A'; t.implicit.unknowns[0].symbol = 'A'; }), /unknown A is already an input or constant/);
  assert.match(errs(t => { t.implicit.equations = ['(1 + A*θ)*R0 - r*RS']; }), /input B is not used in the equations/);
  assert.match(errs(t => { t.implicit.equations = ['(1 + A*θ + B*θ^2)*R0 - r*RS +']; }), /equation 1 does not parse/);
  assert.match(errs(t => { t.implicit.equations = ['(1 + A*θ + B*θ^2)*R0 - r*RS + Q']; }), /equation 1 does not parse/);
  assert.match(errs(t => { t.model.formula = 'θ = r*RS'; }), /model\.formula must be empty/);
  assert.match(errs(t => { t.outputs = [{ symbol: 'Z', formula: 'Z = r' }]; }), /outputs are given by implicit\.unknowns/);
  assert.match(errs(t => { t.implicit.unknowns[0].start = 'x'; }), /start/);
  assert.equal(errs(t => { t.implicit.equations = ['r*RS = (1 + A*θ + B*θ^2)*R0']; }), '');      // "chap = o'ng" ko'rinishi
  assert.ok(T.DEFAULT_LOCKED.includes('implicit'));
  // mavjud (oshkor) shablonlar o'zgarmagan: `implicit` bo'lmasa formula tekshiruvi avvalgidek
  const ex = template(20); delete ex.implicit;
  assert.match(T.checkTemplate(ex, schema).errors.join(' | '), /formula required for 5 inputs/);
});
