/* P08: WTLS (x va y da noaniqlik). Manba maqolalari repoda yo'q (usul "unverified") — shuning uchun
   mustaqil tekshiruvlar: (1) u(x) = 0 → WLS; (2) noaniqlikning tarqalish qonuni (JCGM 100:2008 §5.2.2 Eq. 13)
   bilan sonli taqqoslash; (3) simmetriya: x ↔ y almashtirish; (4) Pearson–York ma'lumotlari (unverified). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/engine/index.js');
const YORK = require('../cases/regression/york-pearson-wtls.json');

const F = 'uc-regression/1';
const close = (a, b, rel, msg) => assert.ok(Math.abs(a - b) <= rel * Math.max(Math.abs(a), Math.abs(b), 1e-300), `${msg || ''} ${a} ≠ ${b}`);
const DATA = [[1, 2.1, 0.05, 0.10], [2, 3.9, 0.04, 0.12], [3, 6.2, 0.06, 0.15], [4, 7.8, 0.05, 0.10], [5, 10.1, 0.08, 0.20], [6, 12.2, 0.07, 0.18], [7.5, 14.9, 0.05, 0.15]];
const P = DATA.map(([x, y, ux, uy]) => ({ x, y, ux, uy }));

test('WTLS, u(x_i) = 0 → WLS bilan teng (parametrlar, kovariatsiya, χ²)', () => {
  const p0 = P.map(p => ({ ...p, ux: 0 }));
  const t = E.evaluate({ format: F, method: 'WTLS', points: p0 });
  const w = E.evaluate({ format: F, method: 'WLS', points: p0 });
  t.params.forEach((q, j) => { close(q.value, w.params[j].value, 1e-12, 'p' + j); close(q.u, w.params[j].u, 1e-12, 'u' + j); });
  close(t.covariance[0][1], w.covariance[0][1], 1e-11);
  close(t.chi2.obs, w.chi2.obs, 1e-10);
  assert.equal(t.chi2.nu, 5);
  // u(x) bo'sh qoldirilsa ham xuddi shunday
  const blank = E.evaluate({ format: F, method: 'WTLS', points: P.map(({ x, y, uy }) => ({ x, y, uy })) });
  assert.deepEqual(blank.params, t.params);
});

test('WTLS kovariatsiyasi ≈ noaniqlikning tarqalish qonuni: J·diag(u²)·Jᵀ, J — sonli hosila (GUM 5.2.2)', () => {
  const run = pts => E.evaluate({ format: F, method: 'WTLS', points: pts });
  const base = run(P);
  const V = [[0, 0], [0, 0]];
  P.forEach((p, i) => {
    for (const [key, u] of [['x', p.ux], ['y', p.uy]]) {
      const h = 1e-6;
      const up = run(P.map((q, j) => (j === i ? { ...q, [key]: q[key] + h } : q)));
      const dn = run(P.map((q, j) => (j === i ? { ...q, [key]: q[key] - h } : q)));
      const d = [0, 1].map(k => (up.params[k].value - dn.params[k].value) / (2 * h));
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) V[a][b] += d[a] * d[b] * u * u;
    }
  });
  // Birinchi tartibda teng; farq — 2-tartibli (kuzatilgan va tuzatilgan nuqtalar orasidagi) hadlar
  close(Math.sqrt(V[0][0]), base.params[0].u, 0.02, 'u(a)');
  close(Math.sqrt(V[1][1]), base.params[1].u, 0.02, 'u(b)');
  close(V[0][1], base.covariance[0][1], 0.04, 'cov(a,b)');
});

test('WTLS simmetriyasi: x ↔ y almashtirilganda chiziq o\'sha (b′ = 1/b, a′ = −a/b) — OLS/WLS da bunday emas', () => {
  const f = E.evaluate({ format: F, method: 'WTLS', points: P });
  const s = E.evaluate({ format: F, method: 'WTLS', points: P.map(p => ({ x: p.y, y: p.x, ux: p.uy, uy: p.ux })) });
  close(s.params[1].value, 1 / f.params[1].value, 1e-10, 'b');
  close(s.params[0].value, -f.params[0].value / f.params[1].value, 1e-9, 'a');
  close(s.chi2.obs, f.chi2.obs, 1e-9, 'χ²');
  assert.ok(f.wtls.iterations >= 2 && f.wtls.adjustedX.length === P.length);
});

test('WTLS: χ² testi va unverified belgisi; u(x) hisobga olinishi u(b) ni oshiradi', () => {
  const t = E.evaluate({ format: F, method: 'WTLS', points: P });
  const w = E.evaluate({ format: F, method: 'WLS', points: P });
  assert.ok(t.params[1].u > w.params[1].u);
  assert.ok(t.chi2.obs < w.chi2.obs);
  assert.ok(t.warnings.some(x => x.code === 'regression_method_unverified'));
  assert.ok(w.warnings.some(x => x.code === 'regression_ux_ignored'));
});

test('[unverified] Pearson–York: a = 5,47991022, b = −0,48053341 (adabiyot, xotira bo\'yicha — manba repoda yo\'q)', (t) => {
  const r = E.evaluate(YORK.modelSpec);
  t.diagnostic(`a = ${r.params[0].value}, b = ${r.params[1].value}, u(a) = ${r.params[0].u}, u(b) = ${r.params[1].u}, S = ${r.chi2.obs}`);
  assert.ok(Math.abs(r.params[0].value - YORK.expected.a.value) <= 5e-9);
  assert.ok(Math.abs(r.params[1].value - YORK.expected.b.value) <= 5e-9);
  assert.equal(YORK.status, 'unverified');
});
