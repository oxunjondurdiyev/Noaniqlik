/* Shablondan ajratish (detachState; src/js/table.js dagi "Shablondan ajratib tahrirlash" tugmasi).
   Talab: ajratilgan (shablonsiz) holatning evaluate() natijasi ajratishdan oldingi shablon natijasi
   (evaluateState) bilan son jihatidan AYNAN bir xil — "bitta asbob" korrelyatsiyasi (known / unknown),
   aux o'zgarmasli B tur ifodalari va namunaviy shablon bilan. Kirish holati o'zgarmaydi.
   Sintetik sonlar — correlation.test.js va view.test.js dagi misollardan (manba qiymati emas, tenglik testi). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const T = require('../../src/templates/interpreter.js');
const { evaluate } = require('../../src/engine/index.js');
const { byId } = require('./lib.js');

const t3 = s => ({ uz: s, ru: s, en: s });
const KEYS = ['y', 'uc', 'U', 'k', 'nuEff', 'mode'];
const nums = r => Object.fromEntries(KEYS.map(k => [k, r[k]]));
const budget = r => (r.budget || []).map(b => [b.kind, b.name, b.param, b.dist, b.u, b.c, b.ui, b.contrib, b.nu]);

function handTemplate(split) {
  const src = x => [
    { id: x + '_cal_common', input: x, name: t3('cal common ' + x), kind: 'certificate', distribution: 'normal', halfWidth: null, k: null,
      unit: 'g', instrument: 'balance', correlated: true, share: 'common', certificateU: null, certificateK: null, hint: t3('h') },
    { id: x + '_cal_point', input: x, name: t3('cal point ' + x), kind: 'specification', distribution: 'rect', halfWidth: null,
      unit: 'g', instrument: 'balance', correlated: false, share: 'point', hint: t3('h') },
    { id: x + '_res', input: x, name: t3('res ' + x), kind: 'resolution', distribution: 'resol', halfWidth: null,
      unit: 'g', instrument: 'balance', correlated: false, hint: t3('h') },
  ];
  return {
    schemaVersion: 'uc-template/1', id: 'HAND-W', version: '0.1.0', status: 'DRAFT', domain: 'TESTING', section: 'general',
    evaluationMode: 'GUM_BOTTOM_UP', title: t3('w'), standards: [], ref: 'tests/templates/detach.test.js',
    measurand: { symbol: 'w', name: t3('w'), unit: '1' }, model: { formula: 'w = (m - m1) / m1' },
    inputs: [{ symbol: 'm', name: t3('m'), unit: 'g', kind: 'observation' }, { symbol: 'm1', name: t3('m1'), unit: 'g', kind: 'observation' }],
    typeBSources: [...src('m'), ...src('m1')],
    correlations: [{ id: 'm_m1', inputs: ['m', 'm1'], r: 1, sharedInstrument: 'balance', ask: true, defaultEnabled: true, split, question: t3('q') }],
  };
}
function handData() {
  const sources = {};
  for (const x of ['m', 'm1']) {
    sources[x + '_cal_common'] = { halfWidth: 0.004, k: 2 };
    sources[x + '_cal_point'] = { halfWidth: 0.003 };
    sources[x + '_res'] = { halfWidth: 0.001 };
  }
  return { observations: { m: [105.2, 105.3, 105.4], m1: [100.0, 100.1, 100.2] }, sources, settings: { paired: false } };
}

function assertSame(st, label) {
  const before = JSON.stringify(st);
  const ref = T.evaluateState(st).result;
  assert.ok(!ref.error, label + ': shablon natijasi xatosiz');
  const d = T.detachState(st);
  assert.equal(JSON.stringify(st), before, label + ': kirish holati o\'zgarmagan');
  assert.equal(d.template, null, label + ': shablon olib tashlangan');
  const got = evaluate(d);
  assert.ok(!got.error, label + ': ajratilgan holat xatosiz');
  assert.deepEqual(nums(got), nums(ref), label + ': y, u_c, U, k, ν_eff aynan bir xil');
  assert.deepEqual(budget(got), budget(ref), label + ': byudjet aynan bir xil');
  assert.deepEqual(d.params, st.params, label + ': parametrlar saqlangan');
  assert.deepEqual(d.measurements, st.measurements, label + ': kuzatuvlar saqlangan');
  return d;
}

test('known split: "bitta asbob" kovariatsiyasi covB ga o\'tadi, natija aynan bir xil', () => {
  const st = T.buildState(handTemplate('known'), handData()).state;
  const d = assertSame(st, 'known');
  assert.ok(Object.values(d.covB || {}).some(v => v !== 0), 'covB da kovariatsiya bor');
});

test('unknown split: tanlangan chegara (r = 0 / r = 1, katta u_c) saqlanadi, natija aynan bir xil', () => {
  const st = T.buildState(handTemplate('unknown'), handData()).state;
  assertSame(st, 'unknown');
});

test('aux o\'zgarmasli B tur ifodasi (T-14: alpha_t, dt) — son qoladi, ifoda olib tashlanadi', () => {
  const s = T.buildState(byId['T-14'], {}, { allowMissing: true, ui: true }).state;
  s.measurements = { x: [1.01, 1.02, 1.03], x_loyiha: [1.0] };
  s.typeB = s.typeB.map(c => ({ ...c, halfWidth: c.sourceId === 'x_temp' ? c.halfWidth : 0.01, k: 2 }));
  s.template.aux = { alpha_t: 1e-5, dt: 2 };
  const temp = s.typeB.find(c => c.sourceId === 'x_temp');
  assert.equal(typeof temp.halfWidth, 'string', 'shablonda x_temp yarim kengligi — aux ifoda');
  const d = assertSame(s, 'T-14');
  const dt = d.typeB.find(c => c.sourceId === 'x_temp');
  assert.equal(typeof dt.halfWidth, 'number');
  assert.equal(dt.halfWidthExpr, undefined);
});

test('namunaviy shablon (legacy-gas_analyzer, 2-nuqta) — natija aynan bir xil', () => {
  const g = T.buildState(byId['legacy-gas_analyzer'], { useSample: true, point: 1 }).state;
  assertSame(g, 'legacy-gas');
});

test('shablonsiz holat o\'zgarmasdan qaytadi', () => {
  const st = { params: ['x'], measurements: { x: ['1'] }, template: null };
  assert.equal(T.detachState(st), st);
});
