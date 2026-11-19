/* P07b: atan2(y; x) — to'rt kvadrantli arktangens formula tahlilchisida (JCGM 102:2011 §9.3.1.1, Eq. 25 izohi).
   Simvolik hosila (c_i), o'lchamlik tahlili, sintaksis. §9.3 MCM qatorlari (Table 6–7) — tests/cases/jcgm102/jcgm102-9-3-*-mcm. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/engine/index.js');

const P = ['X1', 'X2'];
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test('atan2: to\'rt kvadrant, ikkala ajratuvchi (; va ,), o\'nlik vergul bilan aralashmaydi', () => {
  const f = E.compile('atan2(X2; X1)', P);
  near(f({ X1: 1, X2: 1 }), Math.PI / 4, 1e-15);
  near(f({ X1: -1, X2: 1 }), 3 * Math.PI / 4, 1e-15);
  near(f({ X1: -1, X2: -1 }), -3 * Math.PI / 4, 1e-15);
  near(f({ X1: 1, X2: -1 }), -Math.PI / 4, 1e-15);
  assert.equal(f({ X1: 0, X2: 2 }), Math.PI / 2);                  // x1 = 0 da ham aniqlangan (arctan(x2/x1) — yo'q)
  assert.equal(f({ X1: -1, X2: 0 }), Math.PI);
  assert.equal(E.compile('atan2(X2, X1)', P)({ X1: -1, X2: 1 }), f({ X1: -1, X2: 1 }));
  assert.equal(E.compile('ATAN2(X2 ; X1) * 2', P)({ X1: 1, X2: 1 }), Math.PI / 2);
  near(E.compile('1,5 + atan2(1; 1)', [])({}), 1.5 + Math.PI / 4, 1e-15);   // "1,5" — o'nlik vergul
  near(E.compile('atan2(X2 + 1; 2 * X1)', P)({ X1: 1, X2: 1 }), Math.PI / 4, 1e-15);
});

test('atan2: sintaksis xatolari — bitta argument, qavssiz, ortiqcha argument; bir argumentli funksiyada ajratuvchi', () => {
  for (const bad of ['atan2(X2)', 'atan2 X2', 'atan2(X2; X1; X1)', 'X1; X2', 'sin(X1; X2)', 'atan2(; X1)']) assert.throws(() => E.parse(bad, P), /syntax/, bad);
});

test('atan2: simvolik hosila ∂/∂u = v/(u² + v²), ∂/∂v = −u/(u² + v²); sonli hosila bilan mos; zanjir qoidasi', () => {
  const ast = E.parse('atan2(X2; X1)', P);
  for (const env of [{ X1: 0.3, X2: 0.4 }, { X1: -2, X2: 0.5 }, { X1: 0, X2: -3 }]) {
    const r2 = env.X1 ** 2 + env.X2 ** 2;
    near(E.compileAst(E.derivative(ast, 'X1'))(env), -env.X2 / r2, 1e-15);
    near(E.compileAst(E.derivative(ast, 'X2'))(env), env.X1 / r2, 1e-15);
  }
  const g = E.parse('atan2(X2 ^ 2; 3 * X1)', P), env = { X1: 0.7, X2: 1.3 }, f = E.compileAst(g);
  for (const x of P) {
    const h = 1e-6, num = (f({ ...env, [x]: env[x] + h }) - f({ ...env, [x]: env[x] - h })) / (2 * h);
    near(E.compileAst(E.derivative(g, x))(env), num, 1e-9);
  }
  assert.equal(E.toText(ast), 'atan2(X2; X1)');
});

test('atan2 hisobda: JCGM 102 §9.3 GUF natijasi arctan(X2/X1) dagidek (x1 > 0); x1 < 0 da ham ishlaydi', () => {
  const st = (formula, x1) => ({ params: P, measurements: { X1: [x1], X2: [0] }, model: { formula: 'Y1 = sqrt(X1^2 + X2^2)' },
    outputs: [{ formula: 'Y1 = sqrt(X1^2 + X2^2)' }, { formula }], settings: { paired: false, P: 0.95 },
    typeB: P.map(p => ({ name: 'u', param: p, halfWidth: 0.01, distribution: 'normal', k: 1 })) });
  const a = E.evaluate(st('Y2 = atan2(X2; X1)', 0.01)), b = E.evaluate(st('Y2 = atan(X2 / X1)', 0.01));
  assert.equal(a.error, undefined);
  assert.deepEqual(a.y, b.y);
  near(a.covariance[1][1], b.covariance[1][1], 1e-18);
  near(Math.sqrt(a.covariance[1][1]), 1.000, 0.0005);                 // Table 6 (p. 44), x1 = 0.010, GUF: u(y2) = 1.000
  const neg = E.evaluate(st('Y2 = atan2(X2; X1)', -0.1));
  assert.equal(neg.y[1], Math.PI);                                     // atan(X2/X1) bu yerda 0 berardi
  near(Math.sqrt(neg.covariance[1][1]), 0.1, 1e-12);
});

test('atan2: o\'lchamlik — argumentlar bir xil birlikda, natija o\'lchamsiz; har xil birlik — xato', () => {
  const st = units => ({ params: P, measurements: { X1: [1, 1.1], X2: [2, 2.1] }, model: { formula: 'phi = atan2(X2; X1)' }, units, typeB: [] });
  assert.equal(E.evaluate(st({ X1: 'V', X2: 'V' })).error, undefined);
  assert.equal(E.evaluate(st({ X1: 'V', X2: 'A' })).error, 'unit_mismatch');
});
