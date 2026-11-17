/* P08: REGRESSION rejimidagi shablonlar — sxema (evaluationMode + regression bo'limi), semantik tekshiruv,
   shablon → uc-regression/1 → evaluate(), R-01 DRAFT shabloni (fotometriya / AAS, teskari bashorat). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/engine/index.js');
const T = require('../../src/templates/interpreter.js');
const { validate } = require('../../src/templates/validator.js');
const { byId, schema, templates } = require('./lib.js');
const A5 = require('../cases/quam/quam-a5-calibration.json');

const R01 = byId['R-01'];
const clone = o => JSON.parse(JSON.stringify(o));

test('R-01: DRAFT, REGRESSION, sxema va semantik tekshiruvdan o\'tadi; katalogda bor', () => {
  assert.ok(R01);
  assert.deepEqual([R01.status, R01.evaluationMode, R01.regression.method, R01.regression.degree], ['DRAFT', 'REGRESSION', 'OLS', 1]);
  assert.deepEqual(T.checkTemplate(R01, schema).errors, []);
  assert.equal(R01.regression.inverse.enabled, true);
  assert.equal(templates.filter(x => T.isRegression(x.tpl)).length, 1);
});

test('R-01: raqamli maydonlar bo\'sh — namunaviy nuqtalar faqat demo: true bilan (manbasi ko\'rsatilgan), A₀ va u yo\'q', () => {
  const rg = R01.regression;
  assert.equal(rg.demo, true);
  assert.match(rg.demoSource, /QUAM:2012.*Table A5\.2/);
  assert.deepEqual(rg.calibrationPoints, A5.modelSpec.points); // aynan QUAM Table A5.2
  assert.equal(rg.inverse.y0, undefined);
  assert.equal(rg.inverse.uy0, null);
  assert.equal(rg.inverse.replicates, null);
  assert.equal(rg.xRef, null);
  assert.ok(rg.calibrationPoints.every(p => p.ux === undefined && p.uy === undefined));
  assert.deepEqual(R01.typeBSources, []);
});

test('sxema: REGRESSION rejimida `regression` majburiy; nuqtalar bor-u demo yo\'q → xato; boshqa rejimlarga ta\'sir yo\'q', () => {
  const noReg = clone(R01); delete noReg.regression;
  assert.ok(validate(schema, noReg).errors.some(e => /regression/.test(e.message)));
  const noDemo = clone(R01); noDemo.regression.demo = false;
  assert.equal(validate(schema, noDemo).valid, false);
  const noDemo2 = clone(R01); delete noDemo2.regression.demo;
  assert.equal(validate(schema, noDemo2).valid, false);
  const empty = clone(R01); empty.regression.calibrationPoints = []; delete empty.regression.demo;
  assert.deepEqual(T.checkTemplate(empty, schema).errors, []);
  const badMethod = clone(R01); badMethod.regression.method = 'RANSAC';
  assert.equal(validate(schema, badMethod).valid, false);
  const badDeg = clone(R01); badDeg.regression.degree = 5;
  assert.equal(validate(schema, badDeg).valid, false);
  assert.equal(validate(schema, byId['T-01']).valid, true); // GUM_BOTTOM_UP shablonlari regression bo'limisiz
});

test('semantika: noma\'lum x/y, WTLS + polinom, demo\'siz son, allowedMethods, uch tilli matn', () => {
  const errs = f => { const t = clone(R01); f(t); return T.checkTemplate(t, schema).errors.join(' | '); };
  assert.match(errs(t => { t.regression.x = 'zz'; }), /regression\.x: unknown input zz/);
  assert.match(errs(t => { t.regression.y = 'c'; }), /x and y must be different/);
  assert.match(errs(t => { t.regression.method = 'WTLS'; t.regression.degree = 2; }), /WTLS supports degree 1/);
  assert.match(errs(t => { t.regression.method = 'GLS'; }), /not in allowedMethods/);
  assert.match(errs(t => { t.regression.calibrationPoints = []; t.regression.demo = false; t.regression.inverse.y0 = [0.07]; }), /only as sample data/);
  assert.match(errs(t => { t.regression.hint.ru = ' '; }), /missing ru text/);
});

test('shablon → uc-regression/1 → evaluate(): namunaviy ma\'lumot bilan QUAM A5 natijasi (B1, B0, S, u(c₀))', () => {
  const b = T.buildRegressionSpec(R01, { useSample: true });
  assert.equal(b.spec.format, 'uc-regression/1');
  assert.deepEqual(b.spec.units, { x: 'mg/L', y: '1' });
  assert.equal(b.meta.demo, true);
  assert.deepEqual(b.missing, []);
  const fit = E.evaluate(b.spec);
  const y0 = fit.params[0].value + fit.params[1].value * 0.26;
  const run = T.evaluateTemplate(R01, { useSample: true, inverse: [{ y0, p: 2 }] });
  const r = run.result;
  assert.equal(r.mode, 'REGRESSION');
  assert.ok(Math.abs(r.params[1].value - 0.2410) <= 0.00005);
  assert.ok(Math.abs(r.params[0].value - 0.0087) <= 0.00005);
  assert.ok(Math.abs(r.s - 0.005486) <= 0.0000005);
  assert.ok(Math.abs(r.inverse[0].u - 0.018) <= 0.0005);
  // shablon orqali = to'g'ridan-to'g'ri dvigatel (bit darajasida)
  assert.equal(JSON.stringify(r), JSON.stringify(E.evaluate({ ...A5.modelSpec, units: { x: 'mg/L', y: '1' }, settings: {}, predict: [], inverse: [{ y0, p: 2 }] })));
});

test('bo\'sh maydon bilan hisob qilinmaydi: nuqtalar kiritilmagan → template_incomplete (regression_points)', () => {
  const run = T.evaluateTemplate(R01, {});
  assert.equal(run.error, 'template_incomplete');
  assert.deepEqual(run.missing.map(m => m.kind), ['regression_points']);
  // foydalanuvchi nuqtalari: demo belgisi yo'q; bo'sh qatorlar tashlab yuboriladi
  const mine = T.evaluateTemplate(R01, { points: [{ x: 1, y: 0.1 }, { x: 2, y: 0.21 }, { x: '', y: '' }, { x: 3, y: 0.29 }, { x: 4, y: 0.41 }] });
  assert.equal(mine.meta.demo, false);
  assert.equal(mine.result.m, 4);
  assert.equal(T.buildState(R01).error, 'regression_template');
  assert.equal(T.buildRegressionSpec(byId['T-01']).error, 'not_regression_template');
});

test('usul va sozlamalar: foydalanuvchi tanlovi (WLS, daraja), laboratoriya P va ν qoidasi uzatiladi', () => {
  const pts = [[1, 0.1], [2, 0.2], [3, 0.31], [4, 0.39], [5, 0.5]].map(([x, y]) => ({ x, y, uy: 0.01 }));
  const b = T.buildRegressionSpec(R01, { points: pts, method: 'WLS', degree: 2, predict: [{ x: 2.5 }] }, { labSettings: { P: 0.95, nuRule: 'interpolate' } });
  assert.deepEqual([b.spec.method, b.spec.model.degree, b.spec.settings.P, b.spec.settings.nuRule], ['WLS', 2, 0.95, 'interpolate']);
  const r = E.evaluate(b.spec);
  assert.equal(r.nParam, 3);
  assert.equal(r.chi2.applicable, true);
});
