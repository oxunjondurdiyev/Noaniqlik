/* 2-tartibli hadlar (JCGM 100:2008 §5.1.2 Note) — PLAN P03 5-band: faqat diagnostika, standartda o'chiq. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/engine/index.js');
const H1 = require('../cases/jcgm100/jcgm100-h1.json');

const x2 = (u, extra = {}) => ({
  params: ['X'], measurements: { X: [0] }, directions: [], model: { formula: 'Y = X^2' },
  settings: { paired: false, ...extra },
  typeB: [{ name: 'u(X)', param: 'X', halfWidth: u, distribution: 'normal', k: 1 }],
});

test('Y = X², x̄ = 0 → u²(y) = 2u⁴(x) (analitik; GUM 5.1.2 Note)', () => {
  for (const u of [0.3, 1, 2.5e-3, 7]) {
    const r = E.evaluate(x2(u));
    const so = r.secondOrder;
    assert.ok(Math.abs(so.u2 - 2 * u ** 4) <= 1e-14 * 2 * u ** 4, `u = ${u}: ${so.u2}`);
    // standartda QO'SHILMAYDI: 1-tartibli u_c = 0
    assert.equal(so.included, false);
    assert.equal(r.uc, 0);
    assert.ok(r.warnings.some(w => w.code === 'nonlinear'));
    // yoqilganda: u_c = √2·u²
    const r2 = E.evaluate(x2(u, { secondOrder: true }));
    assert.ok(Math.abs(r2.uc - Math.SQRT2 * u * u) <= 1e-14 * r2.uc);
    assert.equal(r2.secondOrder.included, true);
  }
});

test('A tur kuzatuvlari bilan: Y = X², s(x̄) dan u — x̄ = 0', () => {
  const st = { params: ['X'], measurements: { X: [-0.2, 0.1, 0, 0.1, -0.1, 0.1] }, directions: [],
    model: { formula: 'Y = X^2' }, settings: { paired: false }, typeB: [] };
  const r = E.evaluate(st);
  const u = r.inputs[0].u;
  assert.ok(Math.abs(r.inputs[0].mean) < 1e-17);
  assert.ok(Math.abs(r.secondOrder.u2 - 2 * u ** 4) <= 1e-12 * 2 * u ** 4);
});

test('GUM H.1.7: l_S·u(δα)·u(θ) = 11,7 nm va l_S·u(α_S)·u(δθ) = 1,7 nm; u_c 32 → 34 nm', () => {
  // Ref: JCGM 100:2008 H.1.7 (p. 84)
  const r = E.evaluate(H1.modelSpec);
  const t = (a, b) => r.secondOrder.terms.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  assert.ok(Math.abs(Math.sqrt(t('theta', 'dalpha').value) - 11.7) <= 0.05, String(Math.sqrt(t('theta', 'dalpha').value)));
  assert.ok(Math.abs(Math.sqrt(t('alphaS', 'dtheta').value) - 1.7) <= 0.05);
  assert.ok(Math.abs(r.uc - 32) <= 0.5);
  assert.equal(r.secondOrder.included, false);
  const st = JSON.parse(JSON.stringify(H1.modelSpec));
  st.state.settings.secondOrder = true;
  const r2 = E.evaluate(st);
  assert.ok(Math.abs(r2.uc - 34) <= 0.5, String(r2.uc));
  assert.ok(r2.budget.some(b => b.kind === 'second'));
});

test('chiziqli modelda 2-tartibli had 0, ogohlantirish yo\'q; nochiziqlilik chegarasi sozlanadi', () => {
  const lin = { params: ['a', 'b'], measurements: { a: [1], b: [2] }, directions: [], model: { formula: 'y = 3*a - b' },
    settings: { paired: false }, typeB: [{ name: 'ua', param: 'a', halfWidth: 0.1, distribution: 'rect' }, { name: 'ub', param: 'b', halfWidth: 0.1, distribution: 'rect' }] };
  const r = E.evaluate(lin);
  assert.equal(r.secondOrder.u2, 0);
  assert.ok(!r.warnings.some(w => w.code === 'nonlinear'));
  // y = a·b: indeks = u_a²u_b² / (b²u_a² + a²u_b²)
  const prod = { ...lin, model: { formula: 'y = a*b' } };
  const p = E.evaluate(prod);
  assert.ok(p.secondOrder.index > 0 && p.secondOrder.index < 0.01);
  assert.ok(!p.warnings.some(w => w.code === 'nonlinear'));
  const p2 = E.evaluate({ ...prod, settings: { paired: false, nonlinThreshold: 1e-4 } });
  assert.ok(p2.warnings.some(w => w.code === 'nonlinear'));
});

test('9 ta Excel nuqtasida 2-tartibli hadlar ta\'sir qilmaydi (chiziqli modellar; standartda o\'chiq)', () => {
  const fs = require('node:fs'), path = require('node:path');
  const dir = path.join(__dirname, '..', 'cases', 'excel');
  for (const f of fs.readdirSync(dir).filter(f => /^excel-(density|gas-p\d|term-p\d)\.json$/.test(f))) {
    const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const r = E.evaluate(c.modelSpec);
    assert.equal(r.secondOrder.included, false, f);
    assert.ok(!r.warnings.some(w => w.code === 'nonlinear'), f);
  }
});
