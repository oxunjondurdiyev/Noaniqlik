/* P12: validatsiya natijasidan TOP_DOWN shablon qoralamasi (src/engine/validation/draft.js) — sxema, semantik tekshiruv,
   usta holati; builtin shablonlarga raqam qo'shilmaydi (validationBasis taqiqlangan). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/engine/index.js');
const T = require('../../src/templates/interpreter.js');
const { schema, templates } = require('./lib.js');

const spec = { format: 'uc-validation/1', method: 'Pb-AAS', tests: [
  { id: 'prec', type: 'anova', groups: [[6.9, 5.4, 5.8, 4.6, 4.0], [8.3, 6.8, 7.8, 9.2, 6.5], [8.0, 10.5, 8.1, 6.9, 9.3]] },
  { id: 'rec', type: 'recovery', values: [95, 98, 97, 96, 99, 96] },
] };
const HASH = 'a'.repeat(64);

test('qoralama: DRAFT, sxemaga mos, checkTemplate o\'tadi; raqamlar validationBasis da; manba xeshi va sana', () => {
  const res = E.evaluate(spec);
  const { template } = E.topDownDraft(res, { id: 'LAB-TD-Pb', date: '2026-11-19', sourceHash: HASH, precisionTest: 'prec', recoveryTest: 'rec' });
  assert.equal(template.status, 'DRAFT');
  assert.deepEqual(T.checkTemplate(template, schema).errors, []);
  assert.equal(template.validationBasis.sourceHash, HASH);
  assert.equal(template.validationBasis.precision.sI, res.tests[0].sI);
  assert.ok(template.sourceNote.en.includes(HASH));
  assert.ok(template.topDown.additional.every(a => a.u === null));
  // usta holati: s_I → stated, n bo'sh (R-26 #7); recovery → R_m, s, n
  const st = T.buildTopDownState(template, { lang: 'uz' }).state;
  assert.equal(st.statedS, String(res.tests[0].sI));
  assert.equal(st.statedN, '');
  assert.equal(st.quamN, '6');
  // builtin sifatida — taqiqlangan
  assert.ok(T.checkTemplate(template, schema, { builtin: true }).errors.some(e => /builtin/.test(e)));
});

test('qoralama: xato kirishlar', () => {
  const res = E.evaluate(spec);
  assert.equal(E.topDownDraft(res, { id: 'X', date: '2026-11-19', sourceHash: 'abc', precisionTest: 'prec' }).error, 'draft_bad_hash');
  assert.equal(E.topDownDraft(res, { id: 'X', date: '19.11.2026', sourceHash: HASH, precisionTest: 'prec' }).error, 'draft_bad_date');
  assert.equal(E.topDownDraft(res, { id: 'X', date: '2026-11-19', sourceHash: HASH, precisionTest: 'rec' }).error, 'draft_need_precision');
  assert.equal(E.topDownDraft(res, { id: 'X', date: '2026-11-19', sourceHash: HASH, precisionTest: 'prec', recoveryTest: 'rec', scale: 'absolute', measurand: { unit: 'mg/L' } }).error, 'draft_recovery_relative');
  assert.equal(E.topDownDraft({ mode: 'GUM' }, {}).error, 'draft_bad_result');
});

test('builtin shablonlarda validationBasis yo\'q (raqam qo\'shilmaydi)', () => {
  for (const { file, tpl } of templates) assert.ok(!('validationBasis' in tpl), file);
});
