/* Dvigatel API va tozaligi (PLAN P03 qabul mezonlari; docs/ENGINE_API.md). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../../src/engine/index.js');
const H1 = require('../cases/jcgm100/jcgm100-h1.json');
const DENS = require('../cases/excel/excel-density.json');

const ROOT = path.join(__dirname, '..', '..');

test('src/engine sof: document / window / localStorage yo\'q (grep -r "document\\|window\\|localStorage" src/engine — bo\'sh)', () => {
  const hits = [];
  (function walk(dir) {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) walk(p);
      else fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => {
        if (/document|window|localStorage/.test(l)) hits.push(`${path.relative(ROOT, p)}:${i + 1}`);
      });
    }
  })(path.join(ROOT, 'src/engine'));
  assert.deepEqual(hits, []);
});

test('src/report/rounding.js sof (hisobot qatlami Node\'da test qilinadi)', () => {
  for (const f of ['src/report/rounding.js', 'src/report/format.js']) {
    assert.ok(!/document|window|localStorage/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), f);
  }
});

test('Node\'da ES modul sifatida: import { evaluate } from "./src/engine/index.js"', async () => {
  const m = await import(path.join(ROOT, 'src/engine/index.js'));
  assert.equal(typeof m.evaluate, 'function');
  const r = m.evaluate(DENS.modelSpec);
  assert.ok(!r.error);
  assert.equal(r.engineVersion, '2.0.0');
});

test('ENGINE_VERSION = 2.0.0 (semver)', () => {
  assert.equal(E.ENGINE_VERSION, '2.0.0');
});

test('natija: outputs[] (bitta element) va yuqori darajadagi maydonlar bir xil', () => {
  const r = E.evaluate(H1.modelSpec);
  assert.equal(r.outputs.length, 1);
  const o = r.outputs[0];
  for (const q of ['y', 'uc', 'uc2', 'nuEff', 'k', 'U']) assert.equal(o[q], r[q], q);
  assert.equal(o.symbol, 'l');
  assert.deepEqual(o.coverage, r.coverage);
  assert.equal(r.coverage.nuRule, 'floor');
  assert.equal(r.coverage.nuUsed, 16);
  // yaxlitlash maydonlari dvigatelda YO'Q (CLAUDE.md: yaxlitlash faqat hisobot qatlamida)
  for (const q of ['Uround', 'yround', 'resultText', 'digits']) assert.equal(r[q], undefined, q);
});

test('modelSpec formatlari: uc-model/1 ↔ calc-state/v2 ↔ eski state — bir xil natija', () => {
  const st = DENS.modelSpec.state;
  const a = E.evaluate(DENS.modelSpec);
  const b = E.evaluate(st);
  const c = E.evaluate(E.toModel(st));
  for (const q of ['y', 'uc', 'nuEff', 'k', 'U']) {
    assert.equal(b[q], a[q], q);
    assert.equal(c[q], a[q], q);
  }
  const m = E.toModel(st);
  assert.equal(m.format, 'uc-model/1');
  assert.equal(m.outputs.length, 1);
  assert.deepEqual(m.inputs.map(i => i.name), ['m', 'V']);
});

test('uc-model/1: bir nechta chiqish hozircha xato (P07), noma\'lum format — xato', () => {
  const m = E.toModel(DENS.modelSpec.state);
  m.outputs.push({ formula: 'z = m * V' });
  assert.equal(E.evaluate(m).error, 'multi_output');
  assert.equal(E.evaluate({ format: 'xyz/9' }).error, 'bad_spec');
});

test('|r| ≤ 1 bo\'lsa musbat dispersiya — xato yo\'q', () => {
  // y = a + b, r = −1 bo'lsa u² = (u_a − u_b)² ≥ 0; |cov| u_a·u_b dan katta → manfiy
  const st = {
    params: ['a', 'b'], measurements: { a: [1], b: [2] }, directions: [], model: { formula: 'y = a + b' },
    settings: { paired: false },
    typeB: [{ name: 'ua', param: 'a', halfWidth: 1, distribution: 'normal', k: 1 }, { name: 'ub', param: 'b', halfWidth: 2, distribution: 'normal', k: 1 }],
    covB: { 'a|b': -1.9 },
  };
  // |r| = 0,95 — ruxsat; u² = 1 + 4 − 3,8 = 1,2 > 0 — xato yo'q
  assert.ok(!E.evaluate(st).error);
  st.model.formula = 'y = a - b';
  st.covB['a|b'] = 1.99; // u² = 1 + 4 − 2·1,99 = 1,02
  assert.ok(!E.evaluate(st).error);
});

test('|r| > 1 → xato bad_correlation (PLAN P03 6-band)', () => {
  const st = {
    params: ['a', 'b'], measurements: { a: [1], b: [2] }, directions: [], model: { formula: 'y = a + b' },
    settings: { paired: false },
    typeB: [{ name: 'ua', param: 'a', halfWidth: 1, distribution: 'normal', k: 1 }, { name: 'ub', param: 'b', halfWidth: 2, distribution: 'normal', k: 1 }],
    covB: { 'a|b': 2.5 }, // r = 2,5 / (1·2) = 1,25
  };
  const r = E.evaluate(st);
  assert.equal(r.error, 'bad_correlation');
  assert.equal(r.detail, 'a|b');
  // u(b) = 0, lekin cov ≠ 0 — ham xato
  st.typeB = [st.typeB[0]]; st.covB['a|b'] = 0.1;
  assert.equal(E.evaluate(st).error, 'bad_correlation');
});

test('negative_variance: kovariatsiya matritsasi musbat yarim aniqlanmagan (3 ta kirish)', () => {
  // har bir juftlik |r| ≤ 1, lekin r_ab = r_bc = r_ac = −0,9 bo'lgan matritsa musbat emas: u² < 0
  const st = {
    params: ['a', 'b', 'c'], measurements: { a: [1], b: [1], c: [1] }, directions: [], model: { formula: 'y = a + b + c' },
    settings: { paired: false },
    typeB: ['a', 'b', 'c'].map(p => ({ name: 'u' + p, param: p, halfWidth: 1, distribution: 'normal', k: 1 })),
    covB: { 'a|b': -0.9, 'a|c': -0.9, 'b|c': -0.9 },
  };
  const r = E.evaluate(st);
  assert.equal(r.error, 'negative_variance'); // u² = 3 − 2·3·0,9 = −2,4
});

test('ogohlantirishlar: U = 0 va U < CMC (CLAUDE.md) saqlanadi', () => {
  const st = { params: ['x'], measurements: { x: [1, 1, 1] }, directions: [], model: { formula: '' }, settings: { cmc: '0.5' }, typeB: [] };
  const r = E.evaluate(st);
  assert.ok(r.warnings.some(w => w.code === 'zero_u'));
  assert.ok(r.warnings.some(w => w.code === 'below_cmc'));
});

test('Monte-Karlo: seed natijada, bir xil kirish → aynan bir xil natija', () => {
  const a = E.monteCarlo(DENS.modelSpec, 20000), b = E.monteCarlo(DENS.modelSpec, 20000);
  assert.equal(a.seed, E.MC_SEED);
  assert.equal(a.low, b.low); assert.equal(a.high, b.high); assert.equal(a.u, b.u);
});

test('ko\'p nuqtali bir xil k (COOMET §5.7.3) dvigatelda: multiPointCoverage', () => {
  const rs = [{ k: 2.1, uc: 1, y: 0.5, conf: { mpe: 3 } }, { k: 2.5, uc: 2, y: 1, conf: null }];
  const u = E.multiPointCoverage(rs, true);
  assert.deepEqual(u.map(x => x.k), [2.5, 2.5]);
  assert.equal(u[0].U, 2.5);
  assert.equal(u[0].conf.guarded, 'ok');
  assert.deepEqual(E.multiPointCoverage(rs, false).map(x => x.k), [2.1, 2.5]);
});
