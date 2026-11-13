/* c_i — simvolik hosila (asosiy) va sonli hosila (zaxira, o'zaro tekshiruv). D-07, PLAN P03 2-band. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/engine/index.js');
const H1 = require('../cases/jcgm100/jcgm100-h1.json');
const S3 = require('../cases/ea4-02/ea4-02-s3.json');

const byName = (r, n) => r.inputs.find(i => i.name === n);

test('D-07: jcgm100-h1 da c_d = 1 (1e-12) — simvolik hosila', () => {
  // Ref: JCGM 100:2008 H.1.3: c_d = ∂f/∂d = 1
  const r = E.evaluate(H1.modelSpec);
  const d = byName(r, 'd');
  assert.equal(d.cMethod, 'symbolic');
  assert.ok(Math.abs(d.c - 1) < 1e-12, `c_d = ${d.c}`);
  // c_lS = 1 − (δα·θ + α_S·δθ) = 1 (x̄ da) ; c_δθ = −l_S·α_S
  assert.ok(Math.abs(byName(r, 'lS').c - 1) < 1e-12);
  assert.ok(Math.abs(byName(r, 'dtheta').c - (-50000623 * 0.0000115)) < 1e-12 * 575);
  // sonli hosila ham mos (o'zaro tekshiruv ogohlantirishi yo'q)
  assert.ok(!r.warnings.some(w => w.code === 'c_mismatch'), JSON.stringify(r.warnings));
});

test('D-07: ea4-02-s3 da c(δR_D) = r_C·r (simvolik)', () => {
  const r = E.evaluate(S3.modelSpec);
  assert.ok(r.inputs.every(i => i.cMethod === 'symbolic'));
  assert.ok(!r.warnings.some(w => w.code === 'c_mismatch'));
});

const F = (formula, params, means) => ({
  params, measurements: Object.fromEntries(params.map(p => [p, [means[p]]])), directions: [],
  model: { formula }, settings: { paired: false },
  typeB: params.map(p => ({ name: 'u_' + p, param: p, halfWidth: 0.01 * (Math.abs(means[p]) || 1), distribution: 'normal', k: 1 })),
});

test('simvolik va sonli hosila barcha funksiyalarda mos (1e-7 nisbiy)', () => {
  const cases = [
    ['y = a*b/c', { a: 3, b: 5, c: 7 }],
    ['y = a^2 + b^3 - a*b', { a: 1.3, b: -0.7 }],
    ['y = sqrt(a) * exp(b)', { a: 2.5, b: 0.3 }],
    ['y = ln(a) + log(b) + lg(a*b)', { a: 2.5, b: 7 }],
    ['y = sin(a) * cos(b) + tan(a/3)', { a: 0.4, b: 1.1 }],
    ['y = asin(a) + acos(b) + atan(a*b)', { a: 0.3, b: 0.6 }],
    ['y = a^b', { a: 1.7, b: 2.3 }],
    ['y = 2^a', { a: 1.5 }],
    ['y = abs(a - b) / (a + b)', { a: 4, b: 9 }],
    ['y = -a / (1 + b)^2', { a: 2e7, b: 0.3 }],
    ['ρ = m / V', { m: 99.84, V: 100.02 }],
  ];
  for (const [formula, means] of cases) {
    const st = F(formula, Object.keys(means), means);
    const r = E.evaluate(st);
    assert.ok(!r.error, formula + ': ' + r.error);
    for (const inp of r.inputs) {
      assert.equal(inp.cMethod, 'symbolic', formula);
      const tol = 1e-7 * Math.max(Math.abs(inp.c), 1e-300) + 1e-9;
      assert.ok(Math.abs(inp.c - inp.cNumeric) <= tol, `${formula}: ∂/∂${inp.name} = ${inp.c} vs ${inp.cNumeric}`);
    }
    assert.ok(!r.warnings.some(w => w.code === 'c_mismatch'), formula);
  }
});

test('simvolik hosila: aniq qiymatlar', () => {
  const r = E.evaluate(F('y = a*b/c', ['a', 'b', 'c'], { a: 3, b: 5, c: 7 }));
  assert.equal(byName(r, 'a').c, 5 / 7);
  assert.ok(Math.abs(byName(r, 'c').c - (-15 / 49)) < 1e-16);
  const ast = E.parse('x^3', ['x']);
  assert.equal(E.compileAst(E.derivative(ast, 'x'))({ x: 2 }), 12);
  assert.equal(E.compileAst(E.derivative(E.derivative(ast, 'x'), 'x'))({ x: 2 }), 12);
});

test('c = 0 → ogohlantirish c_zero; simvolik cheksiz bo\'lsa — sonli zaxira; ikkalasi ham bo\'lmasa — c_nan', () => {
  let r = E.evaluate(F('Y = X^2', ['X'], { X: 0 }));
  assert.equal(r.inputs[0].c, 0);
  assert.ok(r.warnings.some(w => w.code === 'c_zero' && w.param === 'X'));
  // √x, x = 0: simvolik ∂ = 1/(2√0) = ∞, sonli: √(−h) = NaN → c = 0, c_nan
  r = E.evaluate(F('y = sqrt(x)', ['x'], { x: 0 }));
  assert.ok(r.warnings.some(w => w.code === 'c_nan'));
  assert.equal(r.inputs[0].c, 0);
  // |x|, x = 0: sign(0) = 0 → c = 0 (simvolik); sonli (|h| − |−h|)/2h = 0
  r = E.evaluate(F('y = abs(x)', ['x'], { x: 0 }));
  assert.equal(r.inputs[0].c, 0);
});

test('sonli hosila qadami kirish masshtabiga moslashadi (katta |x| va kichik u)', () => {
  // P00 da h = |x|·1e-6 → l_S = 5·10⁷ nm da xato ~1e-6 (D-07). Endi: h = ε^⅓·max(|x|, u)
  const means = { lS: 50000623, d: 215 };
  const f = e => e.lS + e.d - e.lS * 1e-12;
  const n = E.numericDerivative(f, means, 'd', 13);
  assert.ok(n.h > 0 && n.h < 1e-2 * 215);
  assert.ok(Math.abs(n.c - 1) < 1e-4, `c = ${n.c}`);
});

test('sonli hosila yetarli bo\'lmagan holat: y = −a/(1+b)², b ≈ 3·10⁻⁶ — simvolik aniq', () => {
  // (1 + b ± h) da yaxlitlash h ni buzadi: sonli hosila ~10⁻⁷ nisbiy xato beradi; simvolik — aniq
  const a = 2e7, b = 3e-6;
  const r = E.evaluate(F('y = -a / (1 + b)^2', ['a', 'b'], { a, b }));
  const cb = byName(r, 'b').c, exact = 2 * a / (1 + b) ** 3;
  assert.ok(Math.abs(cb - exact) <= 1e-15 * exact, `${cb} vs ${exact}`);
});
