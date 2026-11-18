/* P06 — Monte-Karlo 2.0 (src/engine/montecarlo.js). Manba: JCGM 101:2008 (bo'lim va sahifa har bir testda).
   JCGM 101 §9.2–9.5 misollari — tests/cases/jcgm101/*-mcm*.json (tests/run-cases.test.js); bu yerda — protsedura
   qismlari (§7.7.2, §7.9.2, §7.9.4, §8.1.3), takrorlanuvchanlik, korrelyatsiya, linter topilmalari (M2–M4). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../../src/engine/index.js');

const load = id => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'cases', id + '.json'), 'utf8')).modelSpec;
const codes = r => (r.findings || []).map(f => f.code);
/** Bitta kirishli / ko'p kirishli oddiy holat */
function spec(formula, inputs, extra) {
  const params = Object.keys(inputs);
  return {
    format: 'calc-state/v2',
    state: {
      params, directions: [],
      measurements: Object.fromEntries(params.map(p => [p, inputs[p].obs || [inputs[p].x || 0]])),
      model: { formula, unit: '1' },
      settings: { paired: false, P: 0.95, ...((extra || {}).settings || {}) },
      covB: (extra || {}).covB || {},
      typeB: params.flatMap(p => (inputs[p].b || []).map(c => ({ name: 'u(' + p + ')', param: p, ...c }))),
    },
  };
}
const N1 = { halfWidth: 1, distribution: 'normal', k: 1 };

test('§7.9.2 sonli tolerans δ = ½·10^l: manbadagi misollar (31-bet) va §9 dagi qiymatlar', () => {
  assert.equal(E.numericalTolerance(0.00035, 2), 0.000005);       // Example 1
  assert.equal(E.numericalTolerance(0.00035, 1), 0.00005);        // Example 2: 0,000 4 = 4×10⁻⁴
  assert.equal(E.numericalTolerance(2, 1), 0.5);                  // Example 3
  assert.equal(E.numericalTolerance(2.0, 2), 0.05);               // §9.2.2.6 (36-bet): u(y) = 2,0 = 20×10⁻¹ → δ = 0,05
  assert.equal(E.numericalTolerance(10.1, 2), 0.5);               // §9.2.4 (38-bet): u(y) = 10 = 10×10⁰ → δ = 0,5
  assert.equal(E.numericalTolerance(0.0754, 1), 0.005);           // §9.3.2.6 (41-bet): 0,08 = 8×10⁻² → δ = 0,005
  assert.equal(E.numericalTolerance(36, 2), 0.5);                 // §9.5.3.2 (55-bet): δ = 0,5
  assert.equal(E.numericalTolerance(0.0996, 2), 0.005);           // yaxlitlash: 0,0996 → 0,10 = 10×10⁻²
  assert.equal(E.numericalTolerance(0.00825784249143934, 2), 0.00005);   // 10-test: u_c = 0,0083 → δ = ½·10⁻⁴
  assert.equal(E.numericalTolerance(0.00825784249143934, 1), 0.0005);
  assert.equal(E.numericalTolerance(0, 2), 0);
  assert.equal(E.numericalTolerance(NaN, 2), 0);
});

test('§7.7.2 qamrov intervallari: q, simmetrik r va eng qisqa interval — qo\'lda hisoblangan misollar', () => {
  const lin = Float64Array.from({ length: 20 }, (_, i) => i + 1);
  // M = 20, p = 0,9: q = 18; (M − q)/2 = 1 → [y(1), y(19)]
  let ci = E.coverageIntervals(lin, 20, 0.9);
  assert.deepEqual([ci.q, ci.rSym, ci.symLow, ci.symHigh, ci.low, ci.high], [18, 1, 1, 19, 1, 19]);
  // qiyshiq tanlanma, M = 10, p = 0,5: q = 5; M − q = 5 toq → r = ⌊6/2⌋ = 3 → [y(3), y(8)]; eng qisqa — [y(1), y(6)]
  const skew = Float64Array.from([0, 1, 2, 3, 4, 10, 20, 40, 80, 160]);
  ci = E.coverageIntervals(skew, 10, 0.5);
  assert.deepEqual([ci.q, ci.rSym, ci.symLow, ci.symHigh, ci.rShort, ci.low, ci.high], [5, 3, 2, 40, 1, 0, 10]);
  // pM butun emas: M = 1000, p = 0,9545 → q = ⌊954,5 + ½⌋ = 955
  assert.equal(E.coverageIntervals(Float64Array.from({ length: 1000 }, (_, i) => i), 1000, 0.9545).q, 955);
  // §7.9.4 blok: M = 10⁴, p = 0,95 → q = 9500, r = 250 → [y(250), y(9750)]
  ci = E.coverageIntervals(Float64Array.from({ length: 10000 }, (_, i) => i + 1), 10000, 0.95);
  assert.deepEqual([ci.q, ci.rSym, ci.symLow, ci.symHigh], [9500, 250, 250, 9750]);
});

test('bir xil urug\' + bir xil kirish → aynan bir xil natija; boshqa urug\' → boshqa; bo\'laklab bajarish natijani o\'zgartirmaydi', () => {
  const s = load('jcgm101/jcgm101-9-3-mcm');
  const a = E.monteCarlo(s, { mode: 'adaptive', nDig: 1 }), b = E.monteCarlo(s, { mode: 'adaptive', nDig: 1 });
  assert.deepEqual(a, b);
  assert.deepEqual(a.rng, { name: 'wichmann-hill-2006', seed: E.MC_SEED });
  assert.equal(a.seed, 20261110);
  const c = E.monteCarlo(s, { mode: 'adaptive', nDig: 1, seed: 7 });
  assert.notEqual(c.mean, a.mean);
  assert.deepEqual(c.rng, { name: 'wichmann-hill-2006', seed: 7 });
  // Web Worker / asosiy oqimdagi kabi: bittadan blok
  const run = E.createMonteCarlo(s, { mode: 'adaptive', nDig: 1 });
  let info, steps = 0;
  do { info = run.step(1); steps++; } while (!info.done);
  assert.equal(steps, a.blocks);
  assert.deepEqual(run.result(), a);
  // qat'iy M: bloklarga bo'linish (10⁴) natijaga ta'sir qilmaydi, oxirgi to'liqmas blok ham
  const f1 = E.monteCarlo(s, { mode: 'fixed', M: 25000 });
  const r2 = E.createMonteCarlo(s, 25000);
  while (!r2.step(1).done);
  assert.deepEqual(r2.result(), f1);
  assert.equal(f1.M, 25000);
  assert.equal(f1.blocks, 3);
  assert.equal(f1.adaptive.enabled, false);
  assert.equal(f1.adaptive.converged, null);
});

test('§7.9.4 adaptiv protsedura: blok M = max(J, 10⁴); to\'xtash sharti 2s ≤ δ; natijada M, bloklar soni, yetilgan n_dig', () => {
  const s = load('jcgm101/jcgm101-9-2-2-mcm');
  const r = E.monteCarlo(s);                                   // standart: adaptiv, n_dig = 2
  assert.equal(r.adaptive.enabled, true);
  assert.equal(r.nDig, 2);
  assert.equal(r.blockSize, 10000);
  assert.equal(r.M, r.blocks * r.blockSize);
  assert.ok(r.blocks >= 2);                                    // §7.9.4 f): h = 1 da to'xtamaydi
  assert.equal(r.adaptive.converged, true);
  assert.equal(r.adaptive.reachedMax, false);
  const sv = r.adaptive.s;
  for (const k of ['y', 'u', 'low', 'high']) assert.ok(2 * sv[k] <= r.adaptive.delta, `${k}: 2s = ${2 * sv[k]}, δ = ${r.adaptive.delta}`);
  assert.equal(r.adaptive.delta, 0.05);                        // §9.2.2.6: u(y) = 2,0 → δ = 0,05
  assert.ok(r.nDigAchieved >= 2);
  // δ/5 (§8.2): taxminan 25 marta ko'p sinov
  const r5 = E.monteCarlo(s, { tolDivisor: 5 });
  assert.equal(r5.adaptive.delta, 0.01);
  assert.ok(r5.M > 10 * r.M && r5.M < 80 * r.M, `${r5.M} / ${r.M}`);
  // J = ⌈100/(1 − p)⌉: p = 0,999 → blok 10⁵
  const hi = E.createMonteCarlo({ ...s, state: { ...s.state, settings: { ...s.state.settings, P: 0.999 } } }, { maxM: 400000 });
  assert.equal(hi.blockSize, 100000);
  assert.equal(E.createMonteCarlo({ ...s, state: { ...s.state, settings: { ...s.state.settings, P: 0.99 } } }).blockSize, 10000);
});

test('adaptiv: M chegarasiga yetilsa natija ogohlantirish bilan chiqadi (M4 mc_not_converged); barqarorlashganda — yo\'q', () => {
  const s = load('jcgm101/jcgm101-9-2-2-mcm');
  const r = E.monteCarlo(s, { nDig: 3, maxM: 30000 });
  assert.equal(r.M, 30000);
  assert.equal(r.adaptive.converged, false);
  assert.equal(r.adaptive.reachedMax, true);
  assert.ok(codes(r).includes('mc_not_converged'));
  assert.ok(r.nDigAchieved < 3);
  const f = r.findings.find(x => x.code === 'mc_not_converged');
  assert.equal(f.severity, 'warning');
  assert.match(f.ref, /JCGM 101:2008 §7\.9\.4/);
  assert.ok(!codes(E.monteCarlo(s)).includes('mc_not_converged'));                 // salbiy holat
  assert.ok(!codes(E.monteCarlo(s, { mode: 'fixed', M: 20000 })).includes('mc_not_converged'));
});

test('§8.1.3 GUM bilan solishtirish: d_low, d_high, δ (GUM u_c dan); chiziqli normal model — tasdiqlanadi (M3 yo\'q)', () => {
  const r = E.monteCarlo(load('jcgm101/jcgm101-9-2-2-mcm'), { interval: 'symmetric', tolDivisor: 5 });
  assert.equal(r.interval, 'symmetric');
  assert.equal(r.intervalLow, r.symLow);
  assert.equal(r.intervalHigh, r.symHigh);
  assert.equal(r.delta, 0.05);
  assert.equal(r.dLow, Math.abs(r.gumLow - r.symLow));
  assert.equal(r.dHigh, Math.abs(r.gumHigh - r.symHigh));
  assert.ok(Math.abs(r.gumLow + 3.92) < 0.005 && Math.abs(r.gumHigh - 3.92) < 0.005);   // Table 2, GUF: [–3.92, 3.92]
  assert.equal(r.validated, true);
  assert.ok(!codes(r).includes('mc_lpu_not_validated'));
  assert.deepEqual(r.findings, []);
});

test('nochiziqli model Y = X², x̄ = 0: LPU rad etiladi — M3 mc_lpu_not_validated; MCM intervali [0; …]', () => {
  // GUM 1-tartib: c = 2x = 0 → u_c = 0, U = 0 (JCGM 101 §9.4.2.2.1 dagi holatning bir o'lchovli ko'rinishi).
  // Analitik: X ~ N(0, u²) → Y = u²·χ²₁: E(Y) = u², V(Y) = 2u⁴; 95 % kvantil = u²·3,841 (χ²₁ jadvali) — mustaqil hisob.
  const u = 0.005;
  const s = spec('Y = X ^ 2', { X: { x: 0, b: [{ halfWidth: u, distribution: 'normal', k: 1 }] } });
  const g = E.evaluate(s);
  assert.equal(g.uc, 0);
  assert.ok(g.findings.some(f => f.code === 'zero_u'));
  const r = E.monteCarlo(s, { tolDivisor: 1, maxM: 2000000 });
  assert.equal(r.validated, false);
  assert.equal(r.delta, 0);
  const f = r.findings.find(x => x.code === 'mc_lpu_not_validated');
  assert.ok(f, codes(r).join());
  assert.equal(f.rule, 'M3');
  assert.match(f.ref, /JCGM 101:2008 §8\.1/);
  assert.ok(Math.abs(r.mean - u * u) < 0.02 * u * u, String(r.mean));
  assert.ok(Math.abs(r.u - Math.SQRT2 * u * u) < 0.03 * Math.SQRT2 * u * u, String(r.u));
  assert.ok(r.low >= 0 && r.low < 1e-9);
  assert.ok(Math.abs(r.high - 3.841 * u * u) < 0.03 * 3.841 * u * u, String(r.high));
});

test('korrelyatsiyalangan normal kirishlar — ko\'p o\'lchovli Gauss (§6.4.8, C.5): Y = X1 + X2, u²(y) = u1² + u2² + 2r·u1·u2', () => {
  for (const [r, expected] of [[0.5, Math.sqrt(3)], [-0.5, 1], [0.9, Math.sqrt(3.8)]]) {
    const s = spec('Y = X1 + X2', { X1: { b: [N1] }, X2: { b: [N1] } }, { covB: { 'X1|X2': r } });
    const mc = E.monteCarlo(s, { mode: 'fixed', M: 200000 });
    assert.equal(mc.correlated, true);
    assert.deepEqual(mc.correlation, { handled: true, groups: [{ inputs: ['X1', 'X2'], method: 'mvn', nonNormal: [] }] });
    assert.ok(Math.abs(mc.u - expected) < 0.01 * expected, `r = ${r}: u = ${mc.u}, kutilgan ${expected}`);
    assert.ok(Math.abs(mc.gumUc - expected) < 1e-12);
    assert.ok(!codes(mc).some(c => /correlation/.test(c)));             // M2 chiqmaydi (salbiy holat)
    assert.deepEqual(mc.sampling.map(x => x.joint), [true, true]);
  }
  // r = −1: musbat YARIM aniqlangan matritsa (rang 1) — Y = X1 + X2 = const
  const s1 = spec('Y = X1 + X2', { X1: { x: 3, b: [N1] }, X2: { x: 4, b: [N1] } }, { covB: { 'X1|X2': -1 } });
  const m1 = E.monteCarlo(s1, { mode: 'fixed', M: 20000 });
  assert.ok(Math.abs(m1.mean - 7) < 1e-12 && m1.u < 1e-12, `${m1.mean} ${m1.u}`);
  // korrelyatsiya natijaga haqiqatan ta'sir qiladi: JCGM 101 Table 9 (48-bet), x1 = 0: u(δy) = 67·10⁻⁶ (r = 0 da 50·10⁻⁶)
  const t9 = E.monteCarlo(load('jcgm101/jcgm101-9-4-mcm-x0-r09'), { mode: 'fixed', M: 200000 });
  assert.ok(Math.abs(t9.u - 67e-6) < 1.5e-6, String(t9.u));
});

test('kovariatsiya matritsasi musbat aniqlanmagan → invalid_covariance (jimgina tuzatilmaydi)', () => {
  // har bir juftlik |r| ≤ 1 va Y = X1 + X2 + X3 uchun dispersiya musbat (GUM hisobidan o'tadi), lekin matritsa yaroqsiz
  const s = spec('Y = X1 + X2 + X3', { X1: { b: [N1] }, X2: { b: [N1] }, X3: { b: [N1] } }, { covB: { 'X1|X2': 0.9, 'X2|X3': 0.9, 'X1|X3': -0.9 } });
  assert.equal(E.evaluate(s).error, undefined);
  const r = E.monteCarlo(s, 20000);
  assert.equal(r.error, 'invalid_covariance');
  assert.equal(r.detail, 'X1, X2, X3');
  assert.equal(r.mean, undefined);
  // yaroqli matritsa bilan — ishlaydi
  const ok = spec('Y = X1 + X2 + X3', { X1: { b: [N1] }, X2: { b: [N1] }, X3: { b: [N1] } }, { covB: { 'X1|X2': 0.9, 'X2|X3': 0.9, 'X1|X3': 0.7 } });
  assert.equal(E.monteCarlo(ok, 20000).error, undefined);
});

test('normal bo\'lmagan kirish korrelyatsiyada → natija berilmaydi + M2 (error); sozlama bilan — belgilangan Gauss yaqinlashuvi + M2 (warning)', () => {
  const s = spec('Y = X1 + X2', { X1: { b: [{ halfWidth: 1, distribution: 'rect' }] }, X2: { b: [N1] } }, { covB: { 'X1|X2': 0.3 } });
  const r = E.monteCarlo(s, 20000);
  assert.equal(r.error, 'mc_nonnormal_correlation');
  assert.equal(r.detail, 'X1');
  assert.equal(r.mean, undefined);
  assert.equal(r.low, undefined);
  assert.equal(r.findings.length, 1);
  assert.deepEqual({ rule: r.findings[0].rule, code: r.findings[0].code, severity: r.findings[0].severity, value: r.findings[0].value },
    { rule: 'M2', code: 'mc_nonnormal_correlation', severity: 'error', value: 'X1' });
  assert.match(r.findings[0].ref, /JCGM 101:2008 §6\.4\.8/);
  // A tur (juftlangan kuzatuvlar, t-taqsimot) korrelyatsiyasi ham normal emas
  const paired = spec('Y = A - B', { A: { obs: [10.1, 10.3, 10.2, 10.4] }, B: { obs: [5.0, 5.2, 5.05, 5.3] } }, { settings: { paired: true } });
  assert.ok(E.evaluate(paired).pairs[0].cov !== 0);
  assert.equal(E.monteCarlo(paired, 20000).error, 'mc_nonnormal_correlation');
  // laboratoriya sozlamasi: Gauss yaqinlashuvi — natija bor, lekin aniq belgilangan
  const g = E.monteCarlo(s, { mode: 'fixed', M: 100000, nonNormalCorrelation: 'gaussian' });
  assert.equal(g.error, undefined);
  assert.deepEqual(g.correlation.groups, [{ inputs: ['X1', 'X2'], method: 'gaussian-approx', nonNormal: ['X1'] }]);
  const f = g.findings.find(x => x.code === 'mc_correlation_gaussian_approx');
  assert.equal(f.severity, 'warning');
  assert.equal(f.rule, 'M2');
  const exp = Math.sqrt(1 / 3 + 1 + 2 * 0.3);
  assert.ok(Math.abs(g.u - exp) < 0.01 * exp);
  // sozlama modelSpec da (settings.mc) ham berilishi mumkin
  const viaSettings = { ...s, state: { ...s.state, settings: { ...s.state.settings, mc: { nonNormalCorrelation: 'gaussian', mode: 'fixed', M: 20000 } } } };
  assert.equal(E.monteCarlo(viaSettings).M, 20000);
  // korrelyatsiyasiz normal bo'lmagan kirish — hech qanday M2 (salbiy holat)
  const ind = spec('Y = X1 + X2', { X1: { b: [{ halfWidth: 1, distribution: 'rect' }] }, X2: { b: [N1] } });
  assert.ok(!codes(E.monteCarlo(ind, 20000)).some(c => /correlation/.test(c)));
});

test('dispersiyasi mavjud bo\'lmagan kirish (t, ν ≤ 2): M4 mc_variance_undefined (§7.6 Note 2); ν > 2 da — yo\'q', () => {
  const gas = E.monteCarlo(load('excel/excel-gas-p2-mc'), { mode: 'fixed', M: 20000 });
  const f = gas.findings.find(x => x.code === 'mc_variance_undefined');
  assert.ok(f, codes(gas).join());
  assert.equal(f.param, 'I');
  assert.equal(f.value, '2');
  assert.match(f.ref, /§7\.6 Note 2/);
  assert.deepEqual(gas.varianceUndefined, [{ input: 'I', source: '', nu: 2 }]);
  const dens = E.monteCarlo(load('jcgm101/jcgm101-9-5-mcm'), { mode: 'fixed', M: 20000 });
  assert.ok(!codes(dens).includes('mc_variance_undefined'));
});

test('A tur: usul 1 — t_{n−1}(x̄, s²/n) (§6.4.9.2); usul 3 — o\'sha t-taqsimot (u_A = uning standart og\'ishi, Eq. 13)', () => {
  const obs = [9.8, 10.1, 10.0, 10.3, 9.9, 10.2, 10.05, 9.95];
  const s1 = spec('Y = X', { X: { obs } });
  const g1 = E.evaluate(s1), m1 = E.monteCarlo(s1, { mode: 'fixed', M: 400000 });
  assert.deepEqual(m1.sampling[0].parts, [{ kind: 'A', name: '', dist: 't', nu: 7 }]);
  // t₇ ning standart og'ishi √(7/5): u(MCM) = u_A·√(ν/(ν − 2)) (§6.4.9.4)
  assert.ok(Math.abs(m1.u - g1.uc * Math.sqrt(7 / 5)) < 0.01 * g1.uc * Math.sqrt(7 / 5), `${m1.u} vs ${g1.uc * Math.sqrt(7 / 5)}`);
  const s3 = spec('Y = X', { X: { obs } }, { settings: { typeA: { X: { method: 3 } } } });
  const g3 = E.evaluate(s3), m3 = E.monteCarlo(s3, { mode: 'fixed', M: 400000 });
  assert.ok(Math.abs(g3.uc - g1.uc * Math.sqrt(7 / 5)) < 1e-12);       // GUF: u_A·√((n−1)/(n−3))
  assert.deepEqual(m3.sampling[0].parts, [{ kind: 'A', name: '', dist: 't', nu: 7 }]);
  assert.ok(Math.abs(m3.u - g3.uc) < 0.01 * g3.uc, `${m3.u} vs ${g3.uc}`);
});

test('yangi B tur taqsimotlari (trap, ctrap, exp, lognorm): GUF u(x) = §6.4 formulasi; MCM u ≈ GUF u; parametr xatolari', () => {
  const one = (c, x) => spec('Y = X', { X: { x: x || 0, b: [c] } });
  const cases = [
    [{ halfWidth: 2, distribution: 'trap', beta: 0.5 }, 0, Math.sqrt(4 / 6 * 1.25)],              // §6.4.4.3
    [{ halfWidth: 0.1, distribution: 'ctrap', d: 0.05 }, 10, Math.sqrt(0.0036111111111111114)],     // §6.4.3.3; misol: u = 0,060 V
    [{ halfWidth: 2.5, distribution: 'exp' }, 2.5, 2.5],                                            // §6.4.10.3
    [{ halfWidth: 2, distribution: 'lognorm', k: 1 }, 10, 2],
    [{ halfWidth: 4, distribution: 'lognorm', k: 2 }, 10, 2],
  ];
  for (const [c, x, u] of cases) {
    const s = one(c, x);
    const g = E.evaluate(s);
    assert.ok(Math.abs(g.uc - u) < 1e-12, `${c.distribution}: GUF u = ${g.uc}, kutilgan ${u}`);
    const m = E.monteCarlo(s, { mode: 'fixed', M: 300000 });
    assert.ok(Math.abs(m.u - u) < 0.012 * u, `${c.distribution}: MCM u = ${m.u}, kutilgan ${u}`);
    assert.ok(Math.abs(m.mean - x) < 0.01 * Math.max(u, 1e-9) + 4 * u / Math.sqrt(300000), `${c.distribution}: o'rtacha ${m.mean}`);
    assert.equal(m.sampling[0].parts[0].dist, c.distribution);
  }
  // eksponensial va log-normal: qiymatlar manfiy emas
  assert.ok(E.monteCarlo(one({ halfWidth: 2.5, distribution: 'exp' }, 2.5), 20000).symLow >= 0);
  assert.ok(E.monteCarlo(one({ halfWidth: 5, distribution: 'lognorm', k: 1 }, 10), 20000).symLow > 0);
  // parametr xatolari: β ∉ [0, 1]; d ≤ 0 yoki d ≥ a; log-normal — baho musbat emas
  for (const bad of [{ halfWidth: 1, distribution: 'trap' }, { halfWidth: 1, distribution: 'trap', beta: 1.2 }, { halfWidth: 1, distribution: 'ctrap', d: 0 }, { halfWidth: 1, distribution: 'ctrap', d: 1 }]) {
    assert.equal(E.evaluate(one(bad)).error, 'bad_dist_param');
    assert.equal(E.monteCarlo(one(bad), 20000).error, 'bad_dist_param');
  }
  assert.equal(E.evaluate(one({ halfWidth: 1, distribution: 'lognorm', k: 1 }, 0)).error, undefined);
  assert.equal(E.monteCarlo(one({ halfWidth: 1, distribution: 'lognorm', k: 1 }, 0), 20000).error, 'mc_lognormal_nonpositive');
  // B tur normal + ν → t_ν (§6.4.9.7); ν siz → Gauss (§6.4.9.8)
  assert.deepEqual(E.monteCarlo(one({ ...N1, nu: 18 }), 20000).sampling[0].parts[0], { kind: 'B', name: 'u(X)', dist: 't', nu: 18 });
  assert.deepEqual(E.monteCarlo(one(N1), 20000).sampling[0].parts[0], { kind: 'B', name: 'u(X)', dist: 'normal' });
});

test('sozlamalar: son — qat\'iy M (eski imzo); noto\'g\'ri qiymat → mc_bad_option; chegaralar', () => {
  const s = load('jcgm101/jcgm101-9-2-2-mcm');
  const r = E.monteCarlo(s, 20000);
  assert.equal(r.M, 20000);
  assert.equal(r.adaptive.enabled, false);
  assert.equal(r.rng.name, 'wichmann-hill-2006');               // yangi hisob eski generatorni ishlatmaydi
  assert.equal(r.legacy, undefined);
  assert.equal(E.monteCarlo(s, 5).M, E.MC_LIMITS.minM);
  for (const [k, v] of [['mode', 'auto'], ['interval', 'both'], ['rng', 'mt19937'], ['nDig', 0], ['nDig', 2.5], ['tolDivisor', 0.5], ['criteria', 'x'], ['nonNormalCorrelation', 'copula'], ['seed', -1], ['seed', 1.5]]) {
    const e = E.monteCarlo(s, { [k]: v });
    assert.equal(e.error, 'mc_bad_option', `${k} = ${v}`);
    assert.equal(e.detail, k);
  }
  assert.equal(E.MC_DEFAULTS.mode, 'adaptive');
  assert.equal(E.MC_DEFAULTS.nDig, 2);
  assert.equal(E.monteCarlo(s, { seed: '42', mode: 'fixed', M: 20000 }).seed, 42);
  assert.equal(E.monteCarlo({ format: 'nope' }).error, 'bad_spec');
});

test('progress va bekor qilish: onProgress har blokda; shouldCancel → mc_cancelled', () => {
  const s = load('jcgm101/jcgm101-9-2-2-mcm');
  const seen = [];
  const r = E.monteCarlo(s, { mode: 'fixed', M: 50000, onProgress: i => seen.push(i) });
  assert.equal(r.M, 50000);
  assert.deepEqual(seen.map(i => i.M), [10000, 20000, 30000, 40000, 50000]);
  assert.ok(seen.every((i, n) => i.done === (n === 4) && i.progress > 0 && i.progress <= 1));
  let calls = 0;
  const c = E.monteCarlo(s, { mode: 'fixed', M: 1000000, shouldCancel: () => ++calls > 3 });
  assert.equal(c.error, 'mc_cancelled');
  assert.equal(c.M, 30000);
});

test('model qiymati aniqlanmagan (NaN) → mc_nonfinite, natija berilmaydi', () => {
  const s = spec('Y = sqrt(X)', { X: { x: 0.5, b: [N1] } });
  const r = E.monteCarlo(s, 20000);
  assert.equal(r.error, 'mc_nonfinite');
  assert.ok(Number(r.detail) > 0);
  assert.equal(r.mean, undefined);
});

test('MCM natijasi: interval turi, P, M, generator, urug\', n_dig — hammasi natijada (hisobot uchun)', () => {
  const r = E.monteCarlo(load('jcgm101/jcgm101-9-3-mcm'), { mode: 'adaptive', nDig: 1 });
  for (const k of ['engineVersion', 'mode', 'rng', 'seed', 'M', 'blocks', 'blockSize', 'P', 'mean', 'u', 'interval', 'low', 'high', 'symLow', 'symHigh',
    'intervalLow', 'intervalHigh', 'mcHalf', 'adaptive', 'nDig', 'nDigAchieved', 'gumLow', 'gumHigh', 'gumU', 'delta', 'dLow', 'dHigh', 'validated', 'correlated', 'correlation', 'findings']) {
    assert.ok(r[k] !== undefined, k);
  }
  assert.equal(r.mode, 'MC');
  assert.equal(r.engineVersion, E.ENGINE_VERSION);
  assert.equal(r.P, 0.95);
  assert.equal(r.interval, 'shortest');
  assert.ok(r.high - r.low <= r.symHigh - r.symLow);            // eng qisqa interval simmetrikdan uzun emas
});
