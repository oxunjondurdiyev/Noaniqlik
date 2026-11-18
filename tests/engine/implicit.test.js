/* P07b: oshkor bo'lmagan model h(Y, X) = 0 (src/engine/multivariate/implicit.js). Manba: JCGM 102:2011 §6.3 (p. 17–19),
   §9.5 (p. 55–57; to'liq jadvallar — tests/cases/jcgm102/jcgm102-9-5-*.json). §6.3.2 misollarida manba RAQAM BERMAYDI —
   ular oshkor (§6.2) va oshkormas (§6.3) yondashuvlar natijasining tengligi bilan tekshiriladi (kirish qiymatlari — o'quv
   namunasi, manbadan emas). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/engine/index.js');
const single = require('../cases/jcgm102/jcgm102-9-5-2-single.json');
const several = require('../cases/jcgm102/jcgm102-9-5-3-several.json');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} ${a} ≠ ${b} (±${tol})`);
const rel = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b), 1e-300), `${msg || ''} ${a} ≠ ${b}`);
const clone = o => JSON.parse(JSON.stringify(o));
const tb = (p, u) => ({ name: 'u(' + p + ')', param: p, halfWidth: u, distribution: 'normal', k: 1 });

test('§9.5.2 (p. 56): θ̂ = 20.023 2 °C, u(θ̂) = 0.004 5 °C; c_y = 0.389 Ω/°C; C_x = (1.08, 2.00·10³, 4.01·10⁴, −1.08, −1.00·10²)', () => {
  const r = E.evaluate(single.modelSpec);
  assert.equal(r.error, undefined);
  near(r.y, 20.0232, 0.00005); near(r.uc, 0.0045, 0.00005);
  near(r.implicit.Cy[0][0], 0.389, 0.0005);                                   // §9.5.2.6: c_y = 0.389 Ω °C⁻¹
  const cx = r.implicit.Cx[0];
  near(cx[0], 1.08, 0.005); near(cx[1] / 1e3, 2.00, 0.005); near(cx[3], -1.08, 0.005); near(cx[4] / 1e2, -1.00, 0.005);
  // D-21: manbada C_x ning uchinchi elementi "4.01 Ω°C²" deb bosilgan (ko'paytuvchisiz); formula bo'yicha R0·θ² = 99,996·20,0232² = 4,01·10⁴
  near(cx[2] / 1e4, 4.01, 0.005);
  assert.equal(cx[2], r.implicit.y[0] ** 2 * 99.9961);
  assert.deepEqual([r.symbol, r.unit, r.formulaText, r.mode], ['θ', '°C', '(1 + A*θ + B*θ^2)*R0 - r*RS = 0', undefined]);
  assert.deepEqual([r.implicit.criterion, r.implicit.unknowns, r.secondOrder, r.notes], ['step', ['θ'], null, [{ code: 'implicit_model' }]]);
  assert.ok(r.implicit.iterations <= 5 && r.implicit.residual < 1e-12);
  // byudjet: Σ (c_i u_i)² + korrelyatsiya hadlari = u_c²; sezgirlik c_i = −C_x,i / c_y (§6.3.1.3 Note 2)
  near(r.budget.reduce((s, b) => s + b.contrib, 0), r.uc2, 1e-18);
  r.inputs.forEach((inp, i) => rel(inp.c, -cx[i] / r.implicit.Cy[0][0], 1e-12, inp.name));
  // boshlang'ich yaqinlashuvga bog'liq emas (yaqinlashish sohasida)
  for (const start of [0, 10, 30, 100]) {
    const s = clone(single.modelSpec); s.state.implicit.unknowns[0].start = start;
    rel(E.evaluate(s).y, r.y, 1e-12, 'start ' + start);
  }
  // "chap = o'ng" ko'rinishi ham xuddi shu natija
  const eq = clone(single.modelSpec); eq.state.implicit.equations = ['r*RS = (1 + A*θ + B*θ^2)*R0'];
  const re = E.evaluate(eq);
  rel(re.y, r.y, 1e-13); rel(re.uc, r.uc, 1e-12);
  assert.equal(re.formulaText, 'r*RS = (1 + A*θ + B*θ^2)*R0');
});

test('§9.5.2 Note (p. 56): oshkor ko\'rinish (kvadrat tenglama ildizi) bilan bir xil natija', () => {
  const s = clone(single.modelSpec); delete s.state.implicit;
  s.state.model = { formula: 'θ = (-A + sqrt(A^2 - 4*B*(1 - r*RS/R0))) / (2*B)', unit: '°C' };
  const ex = E.evaluate(s), im = E.evaluate(single.modelSpec);
  rel(im.y, ex.y, 1e-10); rel(im.uc, ex.uc, 1e-8);
  im.inputs.forEach((inp, i) => rel(inp.c, ex.inputs[i].c, 1e-7, inp.name));
});

test('§9.5.3 (p. 56–57): o\'nta harorat — vektor natija, U_y musbat aniqlangan, θ6 va θ10 (bir xil r) to\'liq bo\'lmagan korrelyatsiyada (0,918)', () => {
  const r = E.evaluate(several.modelSpec);
  assert.deepEqual([r.mode, r.m, r.N, r.symbols.length], ['MULTIVARIATE', 10, 14, 10]);
  near(r.y[5], 20.0232, 0.00005); assert.equal(r.y[5], r.y[9]);
  near(r.correlation[5][9], 0.918, 0.0005);                                    // Table 16: r(θ6, θ10) = 0.918 (r6 va r10 mustaqil o'lchangan)
  assert.ok(E.choleskyLower(r.covariance));
  assert.deepEqual([r.implicit.Cy.length, r.implicit.Cx[0].length, r.implicit.criterion], [10, 14, 'stagnation']);
  assert.ok(r.implicit.lastStep < 1e-10 && r.implicit.residual < 1e-12);       // yaxlitlash darajasida to'xtagan (θ1 ≈ 0,01 °C)
  // har bir chiqish — o'sha bitta haroratli model (9.5.2) bilan bir xil y va u
  rel(r.y[5], E.evaluate(single.modelSpec).y, 1e-13); rel(Math.sqrt(r.covariance[5][5]), E.evaluate(single.modelSpec).uc, 1e-10);
  assert.equal(r.results[0].formulaText, '(1 + A*θ1 + B*θ1^2)*R0 - r1*RS = 0');
  assert.deepEqual(r.outputs[2].inputsUsed, ['R0', 'A', 'B', 'RS', 'r3']);     // j-tenglamada faqat o'z r_j si (§6.3.2 Example 1 Note 4 kabi)
  assert.ok(!r.findings.some(f => f.severity === 'error'));
});

test('§6.3.2 Example 1 (p. 17–18): bosim tarozisi, q = 2 — oshkormas model (12) va kvadrat tenglamaning oshkor yechimi bir xil y va U_y beradi', () => {
  // o'quv qiymatlari (manbada raqam yo'q): A0 [m²], λ [1/Pa], α [1/°C], δθ [°C], m [kg], ρa, ρw [kg/m³], g [m/s²]
  const x = { A0: 1.6e-5, lam: 4e-12, al: 9e-6, d1: 0.3, m1: 16, d2: -0.2, m2: 80, ra: 1.2, rw: 7900, g: 9.80665 };
  const u = { A0: 4e-10, lam: 4e-13, al: 5e-7, d1: 0.1, m1: 2e-5, d2: 0.1, m2: 8e-5, ra: 0.01, rw: 10, g: 2e-6 };
  const P = Object.keys(x);
  const base = { params: P, measurements: Object.fromEntries(P.map(p => [p, [x[p]]])), typeB: P.map(p => tb(p, u[p])), settings: { paired: false, P: 0.95 } };
  const im = E.evaluate({ ...base, implicit: { unknowns: [{ name: 'p1', start: 1e7, unit: 'Pa' }, { name: 'p2', start: 5e7, unit: 'Pa' }],
    equations: ['A0*p1*(1 + lam*p1)*(1 + al*d1) - m1*(1 - ra/rw)*g', 'A0*p2*(1 + lam*p2)*(1 + al*d2) - m2*(1 - ra/rw)*g'] } });
  const K = j => `(m${j}*(1 - ra/rw)*g/(A0*(1 + al*d${j})))`;
  const ex = E.evaluate({ ...base, model: { formula: `p1 = (-1 + sqrt(1 + 4*lam*${K(1)}))/(2*lam)` }, outputs: [1, 2].map(j => ({ formula: `p${j} = (-1 + sqrt(1 + 4*lam*${K(j)}))/(2*lam)` })) });
  assert.equal(im.error, undefined); assert.equal(ex.error, undefined);
  for (let i = 0; i < 2; i++) {
    rel(im.y[i], ex.y[i], 1e-9, 'y' + i);
    for (let k = 0; k < 2; k++) rel(im.covariance[i][k], ex.covariance[i][k], 1e-6, `U${i}${k}`);
  }
  assert.ok(im.correlation[0][1] > 0.5);                                       // umumiy A0, λ, ρ, g orqali kovariatsiya (p. 18)
  assert.deepEqual(im.outputs[0].inputsUsed, ['A0', 'lam', 'al', 'd1', 'm1', 'ra', 'rw', 'g']);   // Note 4: j-tenglamada faqat o'z δθ_j, m_w,j
});

test('§6.3.2 Example 2 (p. 18): reflektometr — (cW + 1)Γ − (aW + b) = 0 ning haqiqiy va mavhum qismlari; §6.2.2 Example 2 (oshkor) bilan bir xil', () => {
  const x = { aR: 0.9, aI: 0.05, bR: 0.02, bI: -0.01, cR: 0.1, cI: 0.03, WR: 0.3, WI: -0.2 };
  const P = Object.keys(x);
  const base = { params: P, measurements: Object.fromEntries(P.map(p => [p, [x[p]]])), typeB: P.map(p => tb(p, 0.002)), covB: { 'WR|WI': 0.5 * 0.002 * 0.002 }, settings: { paired: false, P: 0.95 } };
  // cW + 1 = (cR·WR − cI·WI + 1) + i(cR·WI + cI·WR);  aW + b = (aR·WR − aI·WI + bR) + i(aR·WI + aI·WR + bI)
  const dR = '(cR*WR - cI*WI + 1)', dI = '(cR*WI + cI*WR)', nR = '(aR*WR - aI*WI + bR)', nI = '(aR*WI + aI*WR + bI)';
  const im = E.evaluate({ ...base, implicit: { unknowns: [{ name: 'GR', start: 0 }, { name: 'GI', start: 0 }],
    equations: [`${dR}*GR - ${dI}*GI - ${nR}`, `${dR}*GI + ${dI}*GR - ${nI}`] } });
  const den = `(${dR}^2 + ${dI}^2)`;
  const ex = E.evaluate({ ...base, model: { formula: `GR = (${nR}*${dR} + ${nI}*${dI})/${den}` }, outputs: [{ formula: `GR = (${nR}*${dR} + ${nI}*${dI})/${den}` }, { formula: `GI = (${nI}*${dR} - ${nR}*${dI})/${den}` }] });
  assert.equal(im.error, undefined);
  assert.equal(im.implicit.iterations <= 3, true);                             // Γ bo'yicha chiziqli — bitta Nyuton qadami + tekshiruv
  for (let i = 0; i < 2; i++) { rel(im.y[i], ex.y[i], 1e-12); for (let k = 0; k < 2; k++) rel(im.covariance[i][k], ex.covariance[i][k], 1e-9); }
  rel(im.coverageRegion.ellipsoid.kp, 2.45, 0.002);                            // Table 1 (p. 23): m = 2, p = 0.95
});

test('C_y singular → aniq xato implicit_singular (§6.3.1.3 Note 1); yaqinlashmasa → implicit_no_convergence', () => {
  const base = { params: ['a', 'b'], measurements: { a: [1], b: [2] }, typeB: [tb('a', 0.1), tb('b', 0.1)], settings: { paired: false } };
  const run = implicit => E.evaluate({ ...base, implicit });
  // ikki tenglama chiziqli bog'liq: C_y = [[1, 1], [2, 2]]
  assert.equal(run({ unknowns: [{ name: 'y1', start: 0 }, { name: 'y2', start: 0 }], equations: ['y1 + y2 - a', '2*y1 + 2*y2 - 2*a'] }).error, 'implicit_singular');
  // yechimda ∂h/∂y = 0 (karrali ildiz): (y − a)² = 0 — Nyuton yaqinlashadi, lekin C_y → 0: sekin (chiziqli) yaqinlashish, chegaraga yetadi yoki singular
  assert.ok(['implicit_no_convergence', 'implicit_singular'].includes(run({ unknowns: [{ name: 'y', start: 5 }], equations: ['(y - a)^2'], maxIter: 20 }).error));
  // haqiqiy ildiz yo'q: y² + a = 0
  const nc = run({ unknowns: [{ name: 'y', start: 0.7 }], equations: ['y^2 + a'] });
  assert.deepEqual([nc.error, nc.detail], ['implicit_no_convergence', '50']);
  assert.equal(run({ unknowns: [{ name: 'y', start: 0.7 }], equations: ['y^2 + a'], maxIter: 7 }).detail, '7');
  // hosila nol bo'lgan boshlang'ich nuqta: y² − a, y⁽⁰⁾ = 0 → C_y = 0
  assert.equal(run({ unknowns: [{ name: 'y', start: 0 }], equations: ['y^2 - a'] }).error, 'implicit_singular');
  // oddiy holat: y² = a·b → y = √2, u(y) = y/2·√((u_a/a)² + (u_b/b)²)
  const ok = run({ unknowns: [{ name: 'y', start: 1 }], equations: ['y^2 = a*b'] });
  rel(ok.y, Math.SQRT2, 1e-14); rel(ok.uc, Math.SQRT2 / 2 * Math.hypot(0.1 / 1, 0.1 / 2), 1e-12);
  // boshqa ildiz — boshlang'ich yaqinlashuvga qarab
  rel(run({ unknowns: [{ name: 'y', start: -1 }], equations: ['y^2 = a*b'] }).y, -Math.SQRT2, 1e-14);
});

test('noto\'g\'ri kirish: tenglamalar soni, nom to\'qnashuvi, boshlang\'ich qiymat yo\'q (o\'ylab topilmaydi), sintaksis; kirish xatosi uzatiladi', () => {
  const base = { params: ['a'], measurements: { a: [1] }, typeB: [tb('a', 0.1)] };
  const run = implicit => E.evaluate({ ...base, implicit });
  assert.equal(run({ unknowns: [{ name: 'y', start: 1 }], equations: ['y - a', 'y + a'] }).error, 'implicit_bad_spec');
  assert.equal(run({ unknowns: [], equations: ['a'] }).error, 'implicit_bad_spec');
  assert.equal(run({ unknowns: [{ name: 'a', start: 1 }], equations: ['a - 1'] }).error, 'implicit_name_clash');
  assert.equal(run({ unknowns: [{ name: 'y', start: 1 }, { name: 'y', start: 1 }], equations: ['y - a', 'y - a'] }).error, 'implicit_name_clash');
  assert.deepEqual([run({ unknowns: [{ name: 'y', start: '' }], equations: ['y - a'] }).error, run({ unknowns: [{ name: 'y' }], equations: ['y - a'] }).detail], ['implicit_bad_start', 'y']);
  assert.deepEqual([run({ unknowns: [{ name: 'y', start: 1 }], equations: ['y - zzz'] }).error, run({ unknowns: [{ name: 'y', start: 1 }], equations: ['y - zzz'] }).detail], ['implicit_bad_equation', 'zzz']);
  assert.equal(run({ unknowns: [{ name: 'y', start: 1 }], equations: ['y - a = 1 = 2'] }).error, 'implicit_bad_equation');
  assert.equal(E.evaluate({ params: ['a'], measurements: { a: [] }, typeB: [], implicit: { unknowns: [{ name: 'y', start: 1 }], equations: ['y - a'] } }).error, 'need_data');
  assert.equal(E.isImplicit({ implicit: { equations: [] } }), false);
});

test('Monte-Karlo: oshkor bo\'lmagan model uchun natija berilmaydi (implicit_mc_unsupported) — jimgina chiziqlashtirilmaydi', () => {
  assert.equal(E.monteCarlo(single.modelSpec, { mode: 'fixed', M: 1000 }).error, 'implicit_mc_unsupported');
});

test('uc-model/1: implicit maydoni uzatiladi; toModel → normalize qaytadi; A tur kuzatuvlari va ν_eff', () => {
  const st = single.modelSpec.state;
  const model = E.toModel(st);
  assert.deepEqual(model.implicit, st.implicit);
  const r = E.evaluate(model);
  assert.equal(r.y, E.evaluate(single.modelSpec).y);
  // r kuzatuvlari bilan (A tur, n = 4): ν_eff chekli, k = t(ν_eff); y — o'rtachadan
  const obs = clone(single.modelSpec);
  obs.state.measurements.r = [1.078000, 1.078040, 1.077980, 1.078020];
  obs.state.typeB = obs.state.typeB.filter(c => c.param !== 'r');
  const ro = E.evaluate(obs);
  assert.equal(ro.error, undefined);
  const rowA = ro.budget.find(b => b.kind === 'A' && b.param === 'r');
  assert.deepEqual([rowA.n, rowA.nu], [4, 3]);
  // Welch–Satterthwaite chiziqli ekvivalent modelda: ν_eff = u_c⁴ / ((c_r·u_A)⁴ / 3) — chekli, k = t_0,95(⌊ν_eff⌋) > 1,96
  const cr = ro.inputs.find(i => i.name === 'r');
  rel(ro.nuEff, ro.uc ** 4 / ((cr.c * cr.uA) ** 4 / 3), 1e-9);
  assert.ok(ro.nuEff > 3 && ro.nuEff < 100 && ro.k > 1.96 && ro.k === E.coverageFactor(0.95, ro.nuEff, 'floor'), `${ro.nuEff} ${ro.k}`);
  near(ro.y, 20.03, 0.02);
});

test('LU yechuvchi: A·X = B; singular matritsa — null', () => {
  const X = E.luSolve([[0, 2], [1, 1]], [[2, 4], [3, 3]]);                       // tanlov (pivot) kerak
  assert.deepEqual(X.map(r => r.map(v => Math.round(v * 1e12) / 1e12)), [[2, 1], [1, 2]]);
  assert.equal(E.luSolve([[1, 2], [2, 4]], [[1], [2]]), null);
  assert.equal(E.luSolve([[0]], [[1]]), null);
});
