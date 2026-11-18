/* P06 — taqsimotlardan tanlash (src/engine/mc/distributions.js).
   Kutilgan qiymatlar manbadan: JCGM 101:2008 §6.4 dagi E(X) va V(X) formulalari (bo'lim raqami har bir testda) va
   taqsimot funksiyalari. Tekshiruv usuli: N ta tanlanmaning o'rtachasi va dispersiyasi formuladagi qiymatdan
   4,5 standart xatodan uzoq emas; Kolmogorov–Smirnov √N·D < 1,95 (α ≈ 0,001) — taqsimot shakli uchun.
   Log-normal JCGM 101 da yo'q — "mustaqil tekshiruv" (standart momentlar). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const D = require('../../src/engine/mc/distributions.js');
const R = require('../../src/engine/mc/rng.js');
const E = require('../../src/engine/index.js');

const N = 200000;
function draw(fn, seed) {
  const g = R.wichmannHill(seed || 20261110);
  const x = new Float64Array(N);
  const f = fn(g.next);
  for (let i = 0; i < N; i++) x[i] = f();
  return x;
}
function moments(x) {
  let m = 0;
  for (const v of x) m += v;
  m /= x.length;
  let v2 = 0, v4 = 0;
  for (const v of x) { const d = v - m; v2 += d * d; v4 += d * d * d * d; }
  return { mean: m, variance: v2 / (x.length - 1), m4: v4 / x.length };
}
/** o'rtacha va dispersiya formuladagi qiymatga mos (4,5 standart xato) */
function checkMoments(x, mean, variance, label) {
  const m = moments(x);
  const seMean = Math.sqrt(variance / x.length);
  const seVar = Math.sqrt(Math.max(m.m4 - variance * variance, 0) / x.length);
  assert.ok(Math.abs(m.mean - mean) < 4.5 * seMean, `${label}: o'rtacha ${m.mean} vs ${mean} (SE ${seMean})`);
  assert.ok(Math.abs(m.variance - variance) < 4.5 * seVar, `${label}: dispersiya ${m.variance} vs ${variance} (SE ${seVar})`);
}
function ks(x, cdf, label) {
  const s = Float64Array.from(x).sort();
  let dmax = 0;
  for (let i = 0; i < s.length; i++) { const F = cdf(s[i]); dmax = Math.max(dmax, (i + 1) / s.length - F, F - i / s.length); }
  assert.ok(Math.sqrt(s.length) * dmax < 1.95, `${label}: √N·D = ${(Math.sqrt(s.length) * dmax).toFixed(3)}`);
}
const tCdf = (t, nu) => t >= 0 ? 1 - E.tTail2(t, nu) / 2 : E.tTail2(-t, nu) / 2;

test('§6.4.2 to\'g\'ri burchakli R(a, b): E = (a + b)/2, V = (b − a)²/12; ξ = a + (b − a)r', () => {
  const x = draw(u => () => D.sampleRect(u, 9.5, 13.5));
  checkMoments(x, 11.5, 16 / 12, 'R(9.5, 13.5)');
  ks(x, v => (v - 9.5) / 4, 'R');
  assert.equal(D.sampleRect(() => 0.25, 2, 6), 3);
  assert.equal(D.VARIANCE.rect(2), 4 / 3);
});

test('§6.4.3 egri trapetsiya CTrap(a, b, d): V = (b − a)²/12 + d²/9 (Eq. 4); misol 10,0 V ± 0,1 V, d = 0,05 → u² = 0,003 6 (21-bet)', () => {
  // Ref: JCGM 101:2008 §6.4.3.4 EXAMPLE — u²(x) = (0,2)²/12 + (0,05)²/9 = 0,003 6; u(x) = 0,060 V
  const V = D.VARIANCE.ctrap(0.1, 0.05);
  assert.ok(Math.abs(V - 0.0036) < 5e-5, String(V));
  assert.equal(Math.sqrt(V).toFixed(3), '0.060');
  const x = draw(u => () => D.sampleCTrap(u, 9.9, 10.1, 0.05));
  checkMoments(x, 10.0, V, 'CTrap(9.9, 10.1, 0.05)');
  for (const v of x) assert.ok(v >= 9.85 && v <= 10.15);
  // taqsimot funksiyasi — Eq. (3) zichligini sonli integrallash (Note: g = max(ln[(w + d)/max(|ξ − x|, w − d)], 0)/(4d))
  const a = 9.9, b = 10.1, d = 0.05, xm = 10, w = 0.1, steps = 20000, lo = a - d, h = (b + d - lo) / steps;
  const pdf = t => Math.max(Math.log((w + d) / Math.max(Math.abs(t - xm), w - d)), 0) / (4 * d);
  const cum = [0];
  for (let i = 0; i < steps; i++) cum.push(cum[i] + pdf(lo + (i + 0.5) * h) * h);
  assert.ok(Math.abs(cum[steps] - 1) < 1e-4, String(cum[steps]));
  ks(x, v => { const p = (v - lo) / h, i = Math.min(Math.max(Math.floor(p), 0), steps - 1); return (cum[i] + (cum[i + 1] - cum[i]) * (p - i)) / cum[steps]; }, 'CTrap');
  // §9.5.2.9–10 (54-bet): δα ~ CTrap(−1, 1, 0,1)·10⁻⁶, δθ ~ CTrap(−0,050, 0,050, 0,025)
  checkMoments(draw(u => () => D.sampleCTrap(u, -0.05, 0.05, 0.025), 7), 0, 0.05 ** 2 / 3 + 0.025 ** 2 / 9, 'δθ');
});

test('§6.4.4 trapetsiya Trap(a, b, β): V = (b − a)²/24·(1 + β²); ikki to\'g\'ri burchakli yig\'indisi (Eq. 5–6)', () => {
  // X1 ~ R(0, 3), X2 ~ R(0, 1): a = 0, b = 4, λ1 = |3 − 1|/2 = 1, λ2 = 2, β = 1/2
  const x = draw(u => () => D.sampleTrap(u, 0, 4, 0.5));
  checkMoments(x, 2, 16 / 24 * 1.25, 'Trap(0, 4, 0.5)');
  assert.ok(Math.abs(D.VARIANCE.trap(2, 0.5) - (9 / 12 + 1 / 12)) < 1e-15);     // = V(X1) + V(X2)
  // Eq. (7) dan taqsimot funksiyasi: x = 2, λ1 = 1, λ2 = 2
  const cdf = v => v < 1 ? v * v / 6 : v <= 3 ? 1 / 6 + (v - 1) / 3 : 1 - (4 - v) ** 2 / 6;
  ks(x, cdf, 'Trap');
  // β = 1 → to'g'ri burchakli; β = 0 → uchburchak (§6.4.5.1)
  assert.equal(D.VARIANCE.trap(3, 1), D.VARIANCE.rect(3));
  assert.equal(D.VARIANCE.trap(3, 0), D.VARIANCE.triang(3));
});

test('§6.4.5 uchburchak T(a, b): V = (b − a)²/24; ξ = a + (b − a)/2·(r1 + r2)', () => {
  const x = draw(u => () => D.sampleTriang(u, -2, 2));
  checkMoments(x, 0, 16 / 24, 'T(−2, 2)');
  ks(x, v => v < 0 ? (v + 2) ** 2 / 8 : 1 - (2 - v) ** 2 / 8, 'T');
});

test('§6.4.6 arksinus U(a, b): V = (b − a)²/8; ξ = (a + b)/2 + (b − a)/2·sin 2πr', () => {
  const x = draw(u => () => D.sampleArcsine(u, -0.5, 0.5));       // §9.5.2.8: Δ ~ U(−0,5; 0,5) °C
  checkMoments(x, 0, 1 / 8, 'U(−0.5, 0.5)');
  ks(x, v => Math.asin(Math.max(-1, Math.min(1, 2 * v))) / Math.PI + 0.5, 'U');   // G_Z(z) = arcsin(2z − 1)/π + 1/2
});

test('§6.4.7, C.4 Gauss (Box–Muller, Table C.3): N(0, 1)', () => {
  const x = draw(u => D.makeGauss(u));
  checkMoments(x, 0, 1, 'N(0, 1)');
  ks(x, E.normalCdf, 'N');
  // Table C.3: z1 = √(−2 ln r1)·cos 2πr2, z2 = √(−2 ln r1)·sin 2πr2
  const seq = [0.3, 0.125];
  let i = 0;
  const g = D.makeGauss(() => seq[i++]);
  const m = Math.sqrt(-2 * Math.log(0.3));
  assert.equal(g(), m * Math.cos(2 * Math.PI * 0.125));
  assert.equal(g(), m * Math.sin(2 * Math.PI * 0.125));
  assert.equal(i, 2);
});

test('§6.4.9, C.6 t-taqsimot (Table C.5): t_ν, ν = 3, 5, 8, 18, 24 va kasr ν = 6,93', () => {
  for (const nu of [3, 5, 8, 18, 24, 6.93]) {
    const x = draw(u => () => D.sampleT(u, nu), 100 + Math.round(nu));
    ks(x, v => tCdf(v, nu), `t(${nu})`);
    // §6.4.9.4: V = ν/(ν − 2) (ν > 2); 4-moment faqat ν > 4 da chekli — dispersiya ν ≥ 5 da tekshiriladi
    if (nu >= 5) {
      const m = moments(x);
      assert.ok(Math.abs(m.variance - nu / (nu - 2)) < 0.05 * nu / (nu - 2), `t(${nu}): V = ${m.variance}`);
    }
  }
  // ν = 2 (dispersiya cheksiz — C.6 Note): taqsimot shakli baribir to'g'ri
  ks(draw(u => () => D.sampleT(u, 2), 5), v => tCdf(v, 2), 't(2)');
});

test('§6.4.10 eksponensial Ex(1/x): E = x, V = x²; ξ = −x·ln r', () => {
  const x = draw(u => () => D.sampleExp(u, 2.5));
  checkMoments(x, 2.5, 6.25, 'Ex(1/2.5)');
  ks(x, v => 1 - Math.exp(-v / 2.5), 'Ex');
  assert.equal(D.sampleExp(() => Math.exp(-1), 3), 3);
});

test('log-normal (JCGM 101 da yo\'q — mustaqil tekshiruv): E = x, V = s²', () => {
  const p = D.lognormalParams(10, 2);
  assert.ok(Math.abs(Math.exp(p.mu + p.sigma ** 2 / 2) - 10) < 1e-12);
  assert.ok(Math.abs((Math.exp(p.sigma ** 2) - 1) * 100 - 4) < 1e-12);
  const x = draw(u => { const g = D.makeGauss(u); return () => Math.exp(p.mu + p.sigma * g()); });
  checkMoments(x, 10, 4, 'LN');
  ks(x, v => E.normalCdf((Math.log(v) - p.mu) / p.sigma), 'LN');
  for (const bad of [[0, 1], [-1, 1], [1, -1], [NaN, 1]]) assert.equal(D.lognormalParams(...bad), null);
  assert.deepEqual(D.lognormalParams(5, 0), { mu: Math.log(5), sigma: 0 });
});

test('C.5 ko\'p o\'lchovli Gauss (Table C.4): V = RᵀR; C.5.3 misoli μ = (2, 3), V = [[2, 1,9], [1,9, 2]]', () => {
  const V = [[2.0, 1.9], [1.9, 2.0]];
  const Rm = D.cholesky(V);
  assert.equal(Rm[1][0], 0);                                         // yuqori uchburchak
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    let s = 0;
    for (let k = 0; k < 2; k++) s += Rm[k][i] * Rm[k][j];
    assert.ok(Math.abs(s - V[i][j]) < 1e-14, `RᵀR[${i}][${j}] = ${s}`);
  }
  const g = D.makeGauss(R.wichmannHill(1).next), z = [0, 0], out = [0, 0];
  let s1 = 0, s2 = 0, s11 = 0, s22 = 0, s12 = 0;
  for (let i = 0; i < N; i++) {
    D.sampleMvn(g, Rm, z, out);
    const a = 2 + out[0], b = 3 + out[1];
    s1 += a; s2 += b; s11 += a * a; s22 += b * b; s12 += a * b;
  }
  const m1 = s1 / N, m2 = s2 / N;
  assert.ok(Math.abs(m1 - 2) < 0.015 && Math.abs(m2 - 3) < 0.015);
  assert.ok(Math.abs(s11 / N - m1 * m1 - 2) < 0.03);
  assert.ok(Math.abs(s22 / N - m2 * m2 - 2) < 0.03);
  assert.ok(Math.abs(s12 / N - m1 * m2 - 1.9) < 0.03);
});

test('Cholesky: 3 × 3 va har xil masshtab; musbat aniqlanmagan matritsa → null (jimgina tuzatilmaydi)', () => {
  const V = [[4e-12, 2e-3 * 0.5 * 2e-6, 0], [2e-9, 4e6, 600], [0, 600, 1]];
  V[0][1] = V[1][0] = 0.5 * 2e-6 * 2e3;
  const Rm = D.cholesky(V);
  assert.ok(Rm);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    let s = 0;
    for (let k = 0; k < 3; k++) s += Rm[k][i] * Rm[k][j];
    assert.ok(Math.abs(s - V[i][j]) <= 1e-12 * Math.sqrt(V[i][i] * V[j][j]), `[${i}][${j}] ${s} vs ${V[i][j]}`);
  }
  assert.equal(D.cholesky([[1, 1.2], [1.2, 1]]), null);                // |r| > 1
  assert.equal(D.cholesky([[1, 0.9, -0.9], [0.9, 1, 0.9], [-0.9, 0.9, 1]]), null);   // juftliklar yaroqli, matritsa — yo'q
  assert.equal(D.cholesky([[1, 0.5], [0.4, 1]]), null);                // simmetrik emas
  assert.equal(D.cholesky([[-1, 0], [0, 1]]), null);
  assert.equal(D.cholesky([[1, NaN], [NaN, 1]]), null);
  assert.equal(D.cholesky([[0, 0.1], [0.1, 1]]), null);                // u = 0 bo'lgan kattalik bilan kovariatsiya
  // r = +1 (musbat YARIM aniqlangan, rang 1) — aniq ko'paytuvchi: x2 = 2·x1
  const S = D.cholesky([[1, 2], [2, 4]]);
  assert.deepEqual(S, [[1, 2], [0, 0]]);
  const out = D.sampleMvn(() => 0.7, S, [0, 0], [0, 0]);
  assert.deepEqual(out, [0.7, 1.4]);
  assert.deepEqual(D.cholesky([[0, 0], [0, 9]]), [[0, 0], [0, 3]]);
});

test('taqsimot nomlari ro\'yxati', () => {
  assert.deepEqual([...D.MC_DISTRIBUTIONS], ['rect', 'normal', 'triang', 'ushape', 'resol', 'trap', 'ctrap', 'exp', 'lognorm']);
});
