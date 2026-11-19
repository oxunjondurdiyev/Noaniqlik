/* P07 — vektor chiqish (src/engine/multivariate/). Manba: JCGM 102:2011 (bo'lim, jadval va sahifa har bir testda).
   §9 misollari — tests/cases/jcgm102/*.json va jcgm100-h2-vector (tests/run-cases.test.js); bu yerda — yordamchilar,
   jadval qiymatlari (Table 1, 2), §6.5.2.3 va §7.7.2 misollari, format va orqaga moslik. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../../src/engine/index.js');

const load = id => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'cases', id + '.json'), 'utf8')).modelSpec;
const N1 = (p, u) => ({ name: 'u(' + p + ')', param: p, halfWidth: u === undefined ? 1 : u, distribution: 'normal', k: 1 });
function multi(outputs, inputs, extra) {
  const params = Object.keys(inputs);
  return { format: 'calc-state/v2', state: {
    params, directions: [], measurements: Object.fromEntries(params.map(p => [p, inputs[p].obs || [inputs[p].x || 0]])),
    model: outputs[0], outputs, settings: { paired: false, P: 0.95, ...((extra || {}).settings || {}) }, covB: (extra || {}).covB || {},
    typeB: params.flatMap(p => inputs[p].b || []),
  } };
}
const ADD = () => multi([{ formula: 'Y1 = X1 + X3', unit: '1' }, { formula: 'Y2 = X2 + X3', unit: '1' }], { X1: { b: [N1('X1')] }, X2: { b: [N1('X2')] }, X3: { b: [N1('X3')] } });

test('Table 1 (23-bet): gipper-ellipsoid uchun k_p, p = 0,95 — barcha 20 ta qiymat (k_p² = χ²_{m; p}, §6.5.3 a)', () => {
  const T = { 1: 1.96, 2: 2.45, 3: 2.80, 4: 3.08, 5: 3.33, 6: 3.55, 7: 3.75, 8: 3.94, 9: 4.11, 10: 4.28, 11: 4.44, 12: 4.59, 13: 4.73, 14: 4.87, 15: 5.00, 20: 5.60, 25: 6.14, 30: 6.62, 40: 7.47, 50: 8.22 };
  for (const [m, kp] of Object.entries(T)) assert.ok(Math.abs(E.ellipsoidFactor(0.95, Number(m)) - kp) <= 0.005 + 1e-9, `m = ${m}: ${E.ellipsoidFactor(0.95, Number(m))} vs ${kp}`);
});

test('Table 2 (23-bet): gipper-to\'rtburchak uchun k_q, p = 0,95 — barcha 20 ta qiymat (q = 1 − (1 − p)/m, §6.5.3 b)', () => {
  const T = { 1: 1.96, 2: 2.24, 3: 2.39, 4: 2.50, 5: 2.58, 6: 2.64, 7: 2.69, 8: 2.73, 9: 2.77, 10: 2.81, 11: 2.84, 12: 2.87, 13: 2.89, 14: 2.91, 15: 2.94, 20: 3.02, 25: 3.09, 30: 3.14, 40: 3.23, 50: 3.29 };
  for (const [m, kq] of Object.entries(T)) {
    const f = E.rectangleFactor(0.95, Number(m));
    assert.ok(Math.abs(f.kq - kq) <= 0.005 + 1e-9, `m = ${m}: ${f.kq} vs ${kq}`);
    assert.ok(Math.abs(f.q - (1 - 0.05 / Number(m))) < 1e-15);
  }
  assert.equal(E.rectangleFactor(0.95, 2).q, 0.975);                  // §6.5.2.3 b): q = 0,975, k_q = 2,24
});

test('§6.5.2.3 EXAMPLE 1, 2 (21-bet): 95 % ellips va to\'rtburchak yuzalari — 26,6 / 28,4 va 11,8 / 40,1', () => {
  for (const [Uy, ell, rect] of [[[[2.0, 0.0], [0.0, 1.0]], 26.6, 28.4], [[[2.0, 1.9], [1.9, 2.0]], 11.8, 40.1]]) {
    const g = E.gaussianRegion([0, 0], Uy, 0.95);
    assert.ok(Math.abs(g.ellipse.area - ell) <= 0.05, `ellips: ${g.ellipse.area} vs ${ell}`);
    const [a, b] = g.rectangle.intervals;
    // Manba to'rtburchak yuzasini yaxlitlangan k_q = 2,24 bilan hisoblagan (2-misol: 8·2,24² = 40,14 → 40,1; aniq k_q = 2,2414
    // bilan 40,19) — D-19 (manba nuansi): yaxlitlangan k_q bilan ±0,05, aniq qiymat bilan ±0,1
    const area = (a[1] - a[0]) * (b[1] - b[0]), rounded = area * (2.24 / g.rectangle.kq) ** 2;
    assert.ok(Math.abs(rounded - rect) <= 0.05, `to'rtburchak (k_q = 2,24): ${rounded} vs ${rect}`);
    assert.ok(Math.abs(area - rect) <= 0.1, `to'rtburchak: ${area} vs ${rect}`);
    assert.equal(g.ellipsoid.kp.toFixed(2), '2.45');
    assert.equal(g.rectangle.kq.toFixed(2), '2.24');
    assert.equal(g.singular, false);
  }
  // ellips: yuza = π·k_p²·√det U_y; o'qlar U_y ning xos vektorlari bo'ylab
  const e = E.ellipseOf([[2.0, 1.9], [1.9, 2.0]], 2);
  assert.ok(Math.abs(e.area - Math.PI * 4 * Math.sqrt(4 - 3.61)) < 1e-12);
  assert.ok(Math.abs(e.angle - Math.PI / 4) < 1e-12);
});

test('§7.7.2 EXAMPLE (29-bet): U_y = [[2,0; 1,9], [1,9; 2,0]] ning Cholesky ko\'paytuvchisi — 1,414; 1,344; 0,442; L⁻¹ — 0,707; −2,151; 2,265', () => {
  const L = E.choleskyLower([[2.0, 1.9], [1.9, 2.0]]);
  assert.deepEqual([L[0][0], L[1][0], L[1][1]].map(v => v.toFixed(3)), ['1.414', '1.344', '0.442']);   // manbada transponirlangan ko'rinishda bosilgan
  assert.equal(L[0][1], 0);
  // L⁻¹ ning elementlari: ustunlar bo'yicha birlik vektorlarni yechish
  const c1 = E.solveLower(L, [1, 0], [0, 0]).slice(), c2 = E.solveLower(L, [0, 1], [0, 0]).slice();
  assert.deepEqual([c1[0], c1[1], c2[1]].map(v => v.toFixed(3)), ['0.707', '-2.151', '2.265']);
  assert.equal(E.choleskyLower([[1, 2], [2, 1]]), null);                                              // musbat aniqlanmagan
  assert.equal(E.choleskyLower([[1, 1], [1, 1]]), null);                                              // singular
});

test('linalg: Jacobi xos qiymatlari, C·U·Cᵀ, korrelyatsiya matritsasi', () => {
  const e = E.symEigen([[2, 1], [1, 2]]);
  assert.ok(Math.abs(e.values[0] - 3) < 1e-12 && Math.abs(e.values[1] - 1) < 1e-12);
  const e3 = E.symEigen([[4, 1, 0.5], [1, 3, 0.2], [0.5, 0.2, 1]]);
  assert.ok(Math.abs(e3.values.reduce((a, b) => a + b, 0) - 8) < 1e-12);                             // iz saqlanadi
  for (let k = 0; k < 3; k++) {                                                                       // A·v = λ·v
    const v = e3.vectors[k], Av = [[4, 1, 0.5], [1, 3, 0.2], [0.5, 0.2, 1]].map(r => r.reduce((s, x, i) => s + x * v[i], 0));
    for (let i = 0; i < 3; i++) assert.ok(Math.abs(Av[i] - e3.values[k] * v[i]) < 1e-10);
  }
  // §9.2.2.2 (36–37-betlar): C_x = [[1,0,1],[0,1,1]], U_x = I → U_y = [[2,1],[1,2]]; §9.2.4.2: U_x = diag(1,1,9) → [[10,9],[9,10]]
  assert.deepEqual(E.sandwich([[1, 0, 1], [0, 1, 1]], [[1, 0, 0], [0, 1, 0], [0, 0, 1]]), [[2, 1], [1, 2]]);
  assert.deepEqual(E.sandwich([[1, 0, 1], [0, 1, 1]], [[1, 0, 0], [0, 1, 0], [0, 0, 9]]), [[10, 9], [9, 10]]);
  assert.deepEqual(E.correlationMatrix([[10, 9], [9, 10]]), [[1, 0.9], [0.9, 1]]);
});

test('§6.2.1.3 vektor LPU: natija tuzilmasi — outputs[i], covariance, correlation, coverageRegion; sezgirlik matritsasi C_x (m × N)', () => {
  const r = E.evaluate(ADD());
  assert.equal(r.mode, 'MULTIVARIATE');
  assert.deepEqual([r.m, r.N, r.symbols], [2, 3, ['Y1', 'Y2']]);
  assert.deepEqual(r.sensitivity, [[1, 0, 1], [0, 1, 1]]);
  assert.deepEqual(r.inputCovariance, [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  assert.deepEqual(r.covariance, [[2, 1], [1, 2]]);
  assert.deepEqual(r.y, [0, 0]);
  assert.ok(Math.abs(r.correlation[0][1] - 0.5) < 1e-15);
  assert.equal(r.outputs.length, 2);
  for (const k of ['symbol', 'formula', 'unit', 'y', 'uc', 'nuEff', 'k', 'U', 'coverage', 'inputsUsed']) assert.ok(r.outputs[0][k] !== undefined, k);
  assert.deepEqual(r.outputs.map(o => o.inputsUsed), [['X1', 'X3'], ['X2', 'X3']]);
  assert.equal(r.coverageRegion.distribution, 'gaussian');
  assert.equal(r.engineVersion, E.ENGINE_VERSION);
  // har bir chiqish — aynan bitta formulali hisob natijasi (bir o'lchamli yo'l o'zgarmagan)
  const single = E.evaluate({ format: 'calc-state/v2', state: { ...ADD().state, outputs: undefined, model: { formula: 'Y1 = X1 + X3', unit: '1' } } });
  assert.equal(r.results[0].uc, single.uc);
  assert.equal(r.results[0].U, single.U);
  assert.deepEqual(r.results[0].budget, single.budget);
  assert.ok(Math.abs(r.outputs[0].varianceFromUy - single.uc2) < 1e-15);
  // formulada qatnashmagan kirish uchun "c = 0" topilmasi chiqmaydi
  assert.ok(!r.findings.some(f => f.code === 'c_zero'));
  assert.ok(single.findings.some(f => f.code === 'c_zero' && f.param === 'X2'));
});

test('§6.2.2 EXAMPLE 1 (15-bet): R = (V/I)cos φ, X = (V/I)sin φ — C_x manbadagi analitik matritsaga teng (2 × 3)', () => {
  const V = 5, I = 0.02, phi = 1.04;
  const r = E.evaluate(multi([{ formula: 'R = V / I * cos(phi)', unit: 'Ω' }, { formula: 'X = V / I * sin(phi)', unit: 'Ω' }],
    { V: { x: V, b: [N1('V', 0.003)] }, I: { x: I, b: [N1('I', 0.00001)] }, phi: { x: phi, b: [N1('phi', 0.0006)] } }));
  const C = [[Math.cos(phi) / I, -V * Math.cos(phi) / (I * I), -V * Math.sin(phi) / I], [Math.sin(phi) / I, -V * Math.sin(phi) / (I * I), V * Math.cos(phi) / I]];
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) assert.ok(Math.abs(r.sensitivity[j][i] - C[j][i]) <= 1e-12 * Math.abs(C[j][i]), `C[${j}][${i}]`);
  // kompleks kattalik (§6.4): haqiqiy va mavhum qism — ikki chiqish; ular korrelyatsiyalangan
  assert.deepEqual(r.symbols, ['R', 'X']);
  assert.ok(Math.abs(r.correlation[0][1]) > 0.1);
});

test('kirishlar korrelyatsiyasi U_x ga kiradi (covB); U_x musbat yarim aniqlanmagan → invalid_covariance (jimgina tuzatilmaydi)', () => {
  // Table 7 (45-bet), x1 = 0,100, r = 0,9: GUF r(y1, y2) = 0,900
  const r = E.evaluate(load('jcgm102/jcgm102-9-3-x100-r09-guf'));
  assert.ok(Math.abs(r.inputCovariance[0][1] - 0.9e-4) < 1e-18);
  assert.ok(Math.abs(r.correlation[0][1] - 0.9) < 1e-9);
  const bad = multi([{ formula: 'A = X1 + X2', unit: '1' }, { formula: 'B = X2 + X3', unit: '1' }], { X1: { b: [N1('X1')] }, X2: { b: [N1('X2')] }, X3: { b: [N1('X3')] } },
    { covB: { 'X1|X2': 0.9, 'X2|X3': 0.9, 'X1|X3': -0.9 } });
  const e = E.evaluate(bad);
  assert.equal(e.error, 'invalid_covariance');
  assert.equal(e.detail, 'X1, X2, X3');
  assert.equal(e.covariance, undefined);
  assert.equal(E.monteCarlo(bad, 20000).error, 'invalid_covariance');
});

test('xatolar: formulada xato → chiqish raqami bilan; takroriy belgi → duplicate_output', () => {
  const e = E.evaluate(multi([{ formula: 'A = X1', unit: '1' }, { formula: 'B = X1 + Q', unit: '1' }], { X1: { b: [N1('X1')] } }));
  assert.equal(e.error, 'bad_formula');
  assert.equal(e.output, 1);
  const d = E.evaluate(multi([{ formula: 'A = X1', unit: '1' }, { formula: 'A = 2 * X1', unit: '1' }], { X1: { b: [N1('X1')] } }));
  assert.equal(d.error, 'duplicate_output');
});

test('format: uc-model/1 da outputs[] bir nechta element; toModel ↔ normalize aylanmasi; bitta element — eski yo\'l (bit darajasida)', () => {
  const st = ADD().state;
  const model = E.toModel(st);
  assert.equal(model.format, 'uc-model/1');
  assert.equal(model.outputs.length, 2);
  const a = E.evaluate(model), b = E.evaluate(ADD());
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  assert.equal(E.evaluate({ ...model, outputs: [] }).error, 'multi_output');
  // bitta chiqish: outputs[] bir elementli bo'lsa ham bir o'lchamli natija, eski maydonlar bilan
  const one = E.toModel({ ...st, outputs: [st.outputs[0]] });
  assert.equal(one.outputs.length, 1);
  const r1 = E.evaluate(one);
  assert.equal(r1.mode, undefined);
  assert.equal(r1.outputs.length, 1);
  assert.equal(typeof r1.uc, 'number');
  const legacy = E.evaluate({ ...st, outputs: undefined });
  assert.deepEqual(JSON.parse(JSON.stringify(r1)), JSON.parse(JSON.stringify(legacy)));
  assert.equal(E.isMultiOutput(st), true);
  assert.equal(E.isMultiOutput({ ...st, outputs: [st.outputs[0]] }), false);
});

test('chiqishga xos sozlamalar (MPE, model turi, qaror qoidasi) faqat outputs[j].settings orqali; umumiylari qo\'llanilmaydi', () => {
  const s = ADD();
  s.state.settings = { ...s.state.settings, mpe: 5, modelKind: 'error', decisionRule: 'simple' };
  s.state.outputs[1].settings = { mpe: 4, modelKind: 'error', decisionRule: 'simple' };
  const r = E.evaluate(s);
  assert.equal(r.outputs[0].conf, null);
  assert.equal(r.outputs[0].decision, null);
  assert.equal(r.outputs[1].conf.mpe, 4);
  assert.equal(r.outputs[1].decision.pending, null);
  assert.ok(E.OUTPUT_SETTINGS.includes('mpe') && E.OUTPUT_SETTINGS.includes('decisionRule'));
});

test('MV1: |r| > 0,5 → outputs_correlated (info, chiqishlar belgisi va r bilan); singular U_y → outputs_singular; korrelyatsiyasiz — yo\'q', () => {
  const r = E.evaluate(load('jcgm102/jcgm102-9-2-4-guf'));                 // r = 0,9
  const f = r.findings.find(x => x.code === 'outputs_correlated');
  assert.deepEqual({ rule: f.rule, severity: f.severity, param: f.param, value: f.value, mode: f.mode }, { rule: 'MV1', severity: 'info', param: 'Y1, Y2', value: '0.900', mode: 'MULTIVARIATE' });
  assert.match(f.ref, /JCGM 102:2011 §6\.5\.2\.3/);
  assert.ok(!E.evaluate(ADD()).findings.some(x => x.rule === 'MV1'));       // r = 0,5 — chegaradan katta emas (salbiy holat)
  assert.equal(E.LINTER_THRESHOLDS.outputCorrelationAbs, 0.5);
  const h = E.evaluate(load('jcgm102/jcgm102-9-4-guf'));                     // Z² = R² + X² (9.4.2.3 Note 2)
  assert.equal(h.coverageRegion.singular, true);
  assert.ok(h.findings.some(x => x.code === 'outputs_singular'));
  assert.ok(!r.findings.some(x => x.code === 'outputs_singular'));
  // chiqishlarning o'z topilmalari chiqish belgisi bilan
  assert.ok(h.findings.filter(x => x.output).every(x => x.id.startsWith(x.output + ':')));
});

test('§7 vektor MCM: natija tuzilmasi; bir xil urug\' → bir xil natija; bo\'laklab bajarish natijani o\'zgartirmaydi; generator — Wichmann–Hill', () => {
  const s = ADD();
  const a = E.monteCarlo(s, { mode: 'fixed', M: 40000 }), b = E.monteCarlo(s, { mode: 'fixed', M: 40000 });
  assert.deepEqual(a, b);
  assert.equal(a.mode, 'MC');
  assert.equal(a.multivariate, true);
  assert.deepEqual(a.rng, { name: 'wichmann-hill-2006', seed: E.MC_SEED });
  for (const k of ['y', 'u', 'covariance', 'correlation', 'coverageRegion', 'intervals', 'gum', 'comparison', 'validation', 'M', 'blocks', 'nDig', 'findings']) assert.ok(a[k] !== undefined && a[k] !== null, k);
  assert.equal(a.coverageRegion.distribution, 'mcm');
  assert.ok(a.coverageRegion.ellipsoid.kp > 2 && a.coverageRegion.rectangle.kq > 2);
  const run = E.createMonteCarlo(s, { mode: 'fixed', M: 40000 });
  let steps = 0;
  while (!run.step(1).done) steps++;
  assert.equal(steps, 3);
  assert.deepEqual(run.result(), a);
  assert.notDeepEqual(E.monteCarlo(s, { mode: 'fixed', M: 40000, seed: 3 }).y, a.y);
  assert.equal(E.monteCarlo(s, { rng: 'xorshift32-legacy', M: 20000 }).error, 'mc_bad_option');        // eski generator — faqat bitta chiqishli eski hisoblar
});

test('§7.8.3 adaptiv protsedura: h ≤ 10 da to\'xtamaydi; y_j, u(y_j), λ_max, k_p, k_q — 2s ≤ tolerans; chegaraga yetilsa mc_not_converged', () => {
  const s = ADD();
  const r = E.monteCarlo(s, { validation: false, nDig: 1 });
  assert.equal(r.adaptive.converged, true);
  assert.ok(r.blocks > E.MC_MIN_BLOCKS, String(r.blocks));                 // §7.8.3 f)
  assert.equal(E.MC_MIN_BLOCKS, 10);
  assert.deepEqual(r.validation.items.map(i => i.q), ['y', 'u', 'y', 'u', 'lambdaMax', 'kp', 'kq']);
  assert.ok(r.validation.items.every(i => i.ok && i.achieved <= i.required));
  assert.equal(r.validated, null);                                         // oddiy MCM — §8 xulosasi berilmaydi
  const lim = E.monteCarlo(s, { nDig: 3, maxM: 120000 });
  assert.equal(lim.adaptive.reachedMax, true);
  assert.ok(lim.findings.some(f => f.code === 'mc_not_converged'));
  assert.ok(E.maxTrialsFor(2) < E.MC_LIMITS.maxM && E.maxTrialsFor(2) > 5e6);
});

test('vektor MCM: ν ≤ 2 (GUM H.2: n = 5, N = 3) — u, U_y aniqlanmagan; faqat har bir chiqishning intervallari (Q-5); mc_variance_undefined', () => {
  const r = E.monteCarlo(load('jcgm100/jcgm100-h2-vector'), { mode: 'fixed', M: 40000 });
  assert.equal(r.error, undefined);
  assert.equal(r.uDefined, false);
  assert.equal(r.u, null);
  assert.equal(r.covariance, null);
  assert.equal(r.coverageRegion.ellipsoid, null);
  assert.equal(r.coverageRegion.rectangle, null);
  assert.equal(r.coverageRegion.marginal.intervals.length, 3);
  assert.ok(r.intervals.every(([lo, hi]) => lo < hi));
  assert.deepEqual(r.inputCorrelation.groups[0], { inputs: ['V', 'I', 'phi'], method: 'multivariate-t', nu: 2, n: 5, nonNormal: [] });
  assert.ok(r.findings.some(f => f.code === 'mc_variance_undefined'));
  assert.equal(r.validated, null);
  assert.equal(E.monteCarlo(load('jcgm100/jcgm100-h2-vector')).adaptive.enabled, false);              // adaptiv qo'llanilmaydi
});

test('m = 1 moslik: barcha mavjud bitta chiqishli misollarda natija tuzilmasi o\'zgarmagan (mode yo\'q, outputs — bitta element)', () => {
  const dir = path.join(__dirname, '..', 'cases');
  let n = 0;
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!e.name.endsWith('.json')) continue;
      const c = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (!c.modelSpec || !c.modelSpec.state || c.modelSpec.state.outputs) continue;
      // P07b: bir nechta noma'lumli oshkormas model (state.implicit) — vektor natija; bitta noma'lumlisi shu yerda tekshiriladi
      if (c.modelSpec.state.implicit && c.modelSpec.state.implicit.unknowns.length > 1) continue;
      const r = E.evaluate(c.modelSpec);
      assert.equal(r.mode, undefined, c.id);
      assert.equal(r.outputs.length, 1, c.id);
      assert.equal(r.outputs[0].y, r.y, c.id);
      assert.equal(r.covariance, undefined, c.id);
      n++;
    }
  })(dir);
  assert.ok(n >= 40, String(n));
});

/* ── P07b: eng kichik qamrov sohasi (JCGM 102:2011 §7.7.4) ── */
test('§7.7.4 EXAMPLE (31-bet): model (22), 100 × 100 to\'r, M = 10⁶ — eng kichik 95 % soha yuzi 9,4 birlik², ≈ 950 074 nuqta; ellipsdan (10,1 … 11,8) kichik', () => {
  // §7.7.2 EXAMPLE (29-bet): X1, X2 ~ N(0; 0,1), X3 ~ R(−√(3·1,9), √(3·1,9)); Y1 = X1 + X3, Y2 = X2 + X3
  const st = { params: ['X1', 'X2', 'X3'], measurements: { X1: [0], X2: [0], X3: [0] }, model: { formula: 'Y1 = X1 + X3' },
    outputs: [{ formula: 'Y1 = X1 + X3' }, { formula: 'Y2 = X2 + X3' }], settings: { paired: false, P: 0.95 },
    typeB: [{ name: 'X1', param: 'X1', halfWidth: 'sqrt(0.1)', distribution: 'normal', k: 1 }, { name: 'X2', param: 'X2', halfWidth: 'sqrt(0.1)', distribution: 'normal', k: 1 },
      { name: 'X3', param: 'X3', halfWidth: 'sqrt(3 * 1.9)', distribution: 'rect' }] };
  const r = E.monteCarlo(st, { mode: 'fixed', M: 1e6, validation: false });
  const g = r.coverageRegion.smallest;
  assert.deepEqual([g.mesh, g.M, g.rows.length], [100, 1000000, 100]);
  // Manba: 9,4 (ikki qiymatli raqam). Tolerans: ½ oxirgi xona (0,05) + 2·√2·s, s = 0,0035 — 8 ta urug' bo'yicha o'lchangan
  // (9,348 … 9,358); "o'tkazish uchun" kengaytirilmagan. Bizda 9,35.
  assert.ok(Math.abs(g.area - 9.4) <= 0.05 + 2 * Math.SQRT2 * 0.0035, String(g.area));
  // Manba: 950 074 nuqta (tasodifiy — to'xtash qoidasi f) bo'yicha p·M dan kichik emas va bitta katakdan ortiq oshmaydi)
  assert.ok(g.count >= 950000 && g.count < 950000 + 400, String(g.count));
  assert.ok(Math.abs(g.fraction - 0.95) < 0.0005);
  assert.equal(g.cells, g.rows.reduce((s, runs) => s + runs.reduce((a, [i0, i1]) => a + i1 - i0 + 1, 0), 0));
  assert.ok(Math.abs(g.area - g.cells * g.cellArea) < 1e-12);
  // §7.7.2 misoli: MCM ellipsi yuzi (bu yerda M = 10⁶ da π·k_p²·√det U_y ≈ 10,1; manbada 1000 nuqtada 10,6) — eng kichik soha undan kichik
  const U = r.covariance, ell = Math.PI * r.coverageRegion.ellipsoid.kp ** 2 * Math.sqrt(U[0][0] * U[1][1] - U[0][1] ** 2);
  assert.ok(g.area < ell && ell < 11.8);
});

test('§7.7.4: to\'r o\'lchami sozlanadi (10 × 10 da yuz kattaroq — Figure 7 chap: 11,3); o\'chirish; noto\'g\'ri qiymat; m ≠ 2 da hisoblanmaydi; LPU natijasida yo\'q', () => {
  const tbn = p => ({ name: p, param: p, halfWidth: 1, distribution: 'normal', k: 1 });
  const st2 = { params: ['X1', 'X2', 'X3'], measurements: { X1: [0], X2: [0], X3: [0] }, model: { formula: 'Y1 = X1 + X3' },
    outputs: [{ formula: 'Y1 = X1 + X3' }, { formula: 'Y2 = X2 + X3' }], settings: { paired: false, P: 0.95 }, typeB: ['X1', 'X2', 'X3'].map(tbn) };
  const a = E.monteCarlo(st2, { mode: 'fixed', M: 20000, validation: false, smallestMesh: 10 }).coverageRegion.smallest;
  const b = E.monteCarlo(st2, { mode: 'fixed', M: 20000, validation: false, smallestMesh: 40 }).coverageRegion.smallest;
  assert.deepEqual([a.mesh, b.mesh], [10, 40]);
  assert.ok(a.area > b.area);                                                     // Note 3: to'r maydaligi natijaga ta'sir qiladi
  assert.ok(a.count >= 19000 && b.count >= 19000);
  assert.equal('smallest' in E.monteCarlo(st2, { mode: 'fixed', M: 20000, validation: false, smallestMesh: 0 }).coverageRegion, false);
  assert.equal(E.monteCarlo({ ...st2, settings: { ...st2.settings, mc: { smallestMesh: 20 } } }, { mode: 'fixed', M: 20000, validation: false }).coverageRegion.smallest.mesh, 20);
  for (const bad of [5, 1000, 12.5, 'abc']) assert.deepEqual([E.monteCarlo(st2, { mode: 'fixed', M: 20000, smallestMesh: bad }).error, E.monteCarlo(st2, { mode: 'fixed', M: 20000, smallestMesh: bad }).detail], ['mc_bad_option', 'smallestMesh'], String(bad));
  const st3 = { ...st2, outputs: [...st2.outputs, { formula: 'Y3 = X1 - X2' }] };
  assert.equal('smallest' in E.monteCarlo(st3, { mode: 'fixed', M: 20000, validation: false }).coverageRegion, false);   // m = 3 — qilinmagan (R-24)
  assert.equal('smallest' in E.evaluate(st2).coverageRegion, false);
  // Gauss holati: eng kichik soha — ellipsning o'zi (yuzi π·k_p²·√det U_y = π·5,99·√3 ≈ 32,6); yaqinlashuv shu atrofida
  const g = E.monteCarlo(st2, { mode: 'fixed', M: 1e6, validation: false }).coverageRegion.smallest;
  assert.ok(Math.abs(g.area - Math.PI * 5.9915 * Math.sqrt(3)) / 32.6 < 0.05, String(g.area));
  // sof funksiya: nuqtalar bir chiziqda yoki bo'sh — null
  assert.equal(E.smallestRegion([1, 1, 1], [1, 2, 3], 3, 0.95, 10), null);
  assert.equal(E.smallestRegion([], [], 0, 0.95, 10), null);
  const tiny = E.smallestRegion([0, 0, 0, 1], [0, 0, 0, 1], 4, 0.75, 10);
  assert.deepEqual([tiny.cells, tiny.count, tiny.rows[0]], [1, 3, [[0, 0]]]);
});
