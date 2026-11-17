/* P08: regressiya moduli (src/engine/regression/) — chekka holatlar, o'zaro tekshiruvlar, χ², bashorat,
   U — diapazon. Manba misollari (GUM H.3, QUAM A5) — tests/cases/ (run-cases.test.js). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/engine/index.js');
const H3 = require('../cases/jcgm100/jcgm100-h3.json');
const A5 = require('../cases/quam/quam-a5-calibration.json');

const F = 'uc-regression/1';
const close = (a, b, rel = 1e-10, msg) => assert.ok(Math.abs(a - b) <= rel * Math.max(Math.abs(a), Math.abs(b), 1e-300), `${msg || ''} ${a} ≠ ${b}`);
const fit = (o) => E.evaluate({ format: F, ...o });
const LINE = [[1, 2.1], [2, 3.9], [3, 6.2], [4, 7.8], [5, 10.1], [6, 12.2]];
const pts = (arr, extra = {}) => arr.map(([x, y]) => ({ x, y, ...extra }));

/* ── Chekka holatlar: aniq xato kodi (jimgina NaN emas) ── */
test('m < n_param + 1 → regression_too_few_points (to\'g\'ri chiziq: m = 2; 2-daraja: m = 3; 3-daraja: m = 4)', () => {
  assert.equal(fit({ method: 'OLS', points: pts(LINE.slice(0, 2)) }).error, 'regression_too_few_points');
  assert.equal(fit({ method: 'OLS', model: { degree: 2 }, points: pts(LINE.slice(0, 3)) }).error, 'regression_too_few_points');
  assert.equal(fit({ method: 'OLS', model: { degree: 3 }, points: pts(LINE.slice(0, 4)) }).error, 'regression_too_few_points');
  assert.equal(fit({ method: 'OLS', points: [] }).error, 'regression_too_few_points');
  assert.ok(!fit({ method: 'OLS', points: pts(LINE.slice(0, 3)) }).error);
});

test('barcha x bir xil (vertikal chiziq) → regression_x_degenerate — barcha usullarda', () => {
  const v = [[2, 1], [2, 2], [2, 3], [2, 4]];
  assert.equal(fit({ method: 'OLS', points: pts(v) }).error, 'regression_x_degenerate');
  assert.equal(fit({ method: 'WLS', points: pts(v, { uy: 0.1 }) }).error, 'regression_x_degenerate');
  assert.equal(fit({ method: 'WTLS', points: pts(v, { ux: 0.1, uy: 0.1 }) }).error, 'regression_x_degenerate');
  assert.equal(fit({ method: 'GLS', points: pts(v), covY: [0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => (i === j ? 1 : 0))) }).error, 'regression_x_degenerate');
  // 2-daraja uchun kamida 3 ta har xil x kerak
  assert.equal(fit({ method: 'OLS', model: { degree: 2 }, points: pts([[1, 1], [1, 2], [2, 3], [2, 4], [2, 5]]) }).error, 'regression_x_degenerate');
});

test('u = 0 (yoki bo\'sh) bo\'lgan WLS → regression_zero_u, qator raqami bilan', () => {
  const p = pts(LINE, { uy: 0.1 });
  p[3] = { ...p[3], uy: 0 };
  const r = fit({ method: 'WLS', points: p });
  assert.equal(r.error, 'regression_zero_u');
  assert.equal(r.detail, '4');
  const q = pts(LINE, { uy: 0.1 }); delete q[1].uy;
  assert.equal(fit({ method: 'WLS', points: q }).detail, '2');
  // WTLS: u(x) va u(y) ikkalasi ham 0 bo'lgan nuqta
  const w = pts(LINE, { ux: 0.1, uy: 0.1 }); w[0] = { x: 1, y: 2.1, ux: 0, uy: 0 };
  assert.equal(fit({ method: 'WTLS', points: w }).error, 'regression_zero_u');
  // manfiy noaniqlik — noto'g'ri ma'lumot
  const n = pts(LINE, { uy: 0.1 }); n[2].uy = -0.1;
  assert.equal(fit({ method: 'WLS', points: n }).error, 'regression_bad_data');
});

test('b ≈ 0 bo\'lganda teskari bashorat → regression_slope_zero (natija elementi va ogohlantirish)', () => {
  const flat = [[1, 5.01], [2, 4.99], [3, 5.02], [4, 4.98], [5, 5.0], [6, 5.01]];
  const r = fit({ method: 'OLS', points: pts(flat), inverse: [{ y0: 5.0 }] });
  assert.ok(!r.error);
  assert.equal(r.inverse[0].error, 'regression_slope_zero');
  assert.equal(r.inverse[0].x0, undefined);
  assert.ok(r.warnings.some(w => w.code === 'regression_inverse_failed'));
  assert.ok(r.warnings.some(w => w.code === 'regression_slope_weak'));
  // aynan gorizontal chiziq
  const z = fit({ method: 'OLS', settings: { uy: 0.1 }, points: pts([[1, 5], [2, 5], [3, 5], [4, 5]]), inverse: [{ y0: 5 }] });
  assert.equal(z.inverse[0].error, 'regression_slope_zero');
});

test('boshqa xatolar: noma\'lum usul, daraja, bo\'sh/yaroqsiz qiymat, WTLS + polinom, GLS kovariatsiyasi, u(y₀) yo\'q', () => {
  assert.equal(fit({ method: 'XYZ', points: pts(LINE) }).error, 'regression_bad_method');
  assert.equal(fit({ method: 'OLS', model: { degree: 4 }, points: pts(LINE) }).error, 'regression_bad_degree');
  assert.equal(fit({ method: 'WTLS', model: { degree: 2 }, points: pts(LINE, { ux: 0.1, uy: 0.1 }) }).error, 'regression_bad_method');
  const bad = pts(LINE); bad[4] = { x: 5, y: 'abc' };
  assert.deepEqual([fit({ method: 'OLS', points: bad }).error, fit({ method: 'OLS', points: bad }).detail], ['regression_bad_data', '5']);
  assert.equal(fit({ method: 'GLS', points: pts(LINE), covY: [[1]] }).error, 'regression_bad_covariance');
  const notPd = LINE.map((_, i) => LINE.map((__, j) => (i === j ? 1 : 2)));
  assert.equal(fit({ method: 'GLS', points: pts(LINE), covY: notPd }).error, 'regression_bad_covariance');
  assert.equal(fit({ method: 'OLS', settings: { sigma: 'prior' }, points: pts(LINE) }).error, 'regression_need_uy');
  // WLS (aprior): u(y₀) berilmasa teskari bashorat hisoblanmaydi — 0 deb olinmaydi
  const r = fit({ method: 'WLS', points: pts(LINE, { uy: 0.1 }), inverse: [{ y0: 5 }] });
  assert.equal(r.inverse[0].error, 'regression_need_uy0');
});

test('o\'nlik vergul: "1,5" qabul qilinadi (dvigatel toNum)', () => {
  const a = fit({ method: 'WLS', points: LINE.map(([x, y]) => ({ x: String(x), y: String(y).replace('.', ','), uy: '0,1' })) });
  const b = fit({ method: 'WLS', points: pts(LINE, { uy: 0.1 }) });
  assert.deepEqual(a.params, b.params);
});

/* ── O'zaro tekshiruvlar ── */
test('OLS ≡ WLS, u(y_i) teng bo\'lganda: parametrlar, kovariatsiya, χ² (ikki xil kod yo\'li)', () => {
  for (const degree of [1, 2, 3]) {
    const data = [[0.5, 1.2], [1, 2.1], [2, 3.9], [3, 6.2], [4, 7.8], [5, 10.1], [6, 12.2], [7, 13.8]];
    const ols = fit({ method: 'OLS', model: { degree }, settings: { uy: 0.15 }, points: pts(data) });
    const wls = fit({ method: 'WLS', model: { degree }, points: pts(data, { uy: 0.15 }) });
    assert.equal(ols.covarianceBasis, 'prior');
    ols.params.forEach((p, j) => { close(p.value, wls.params[j].value, 1e-9, `deg ${degree} p${j}`); close(p.u, wls.params[j].u, 1e-9, `deg ${degree} u${j}`); });
    for (let i = 0; i <= degree; i++) for (let j = 0; j <= degree; j++) close(ols.covariance[i][j], wls.covariance[i][j], 1e-8);
    close(ols.chi2.obs, wls.chi2.obs, 1e-9);
    // OLS (u(y) noma'lum, aposterior) — parametrlar o'sha, kovariatsiya s² bilan masshtablangan
    const post = fit({ method: 'OLS', model: { degree }, points: pts(data) });
    post.params.forEach((p, j) => close(p.value, wls.params[j].value, 1e-9));
    close(post.covariance[1][1] / wls.covariance[1][1], post.s ** 2 / 0.15 ** 2, 1e-8);
    // OLS da barcha u(y_i) nuqtalarda bir xil berilsa — xuddi settings.uy kabi
    const same = fit({ method: 'OLS', model: { degree }, points: pts(data, { uy: 0.15 }) });
    assert.deepEqual(same.covariance, ols.covariance);
  }
});

test('WLS aposterior (nisbiy vaznlar, QUAM Eq. E3.4): teng vaznlarda OLS bilan bir xil', () => {
  const w = fit({ method: 'WLS', settings: { sigma: 'posterior' }, points: pts(LINE, { uy: 7 }) }); // vazn masshtabi ahamiyatsiz
  const o = fit({ method: 'OLS', points: pts(LINE) });
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) close(w.covariance[i][j], o.covariance[i][j], 1e-9);
  assert.ok(w.warnings.some(x => x.code === 'regression_posterior_scale'));
});

test('GLS diagonal kovariatsiya bilan ≡ WLS; korrelyatsiyali holat — (AᵀV⁻¹A)⁻¹AᵀV⁻¹y bilan mos', () => {
  const uy = [0.1, 0.12, 0.15, 0.1, 0.2, 0.18];
  const p = LINE.map(([x, y], i) => ({ x, y, uy: uy[i] }));
  const diag = uy.map((u, i) => uy.map((_, j) => (i === j ? u * u : 0)));
  const g = fit({ method: 'GLS', points: p, covY: diag }), w = fit({ method: 'WLS', points: p });
  g.params.forEach((q, j) => { close(q.value, w.params[j].value, 1e-10); close(q.u, w.params[j].u, 1e-10); });
  close(g.chi2.obs, w.chi2.obs, 1e-9);
  // Umumiy (to'liq korrelyatsiyalangan) siljish u_c = 0,3: V = diag + u_c²·11ᵀ → qiyalik o'zgarmaydi, u²(a) ga u_c² qo'shiladi
  const uc = 0.3;
  const V = diag.map(r => r.map(v => v + uc * uc));
  const c = fit({ method: 'GLS', points: p, covY: V });
  close(c.params[1].value, w.params[1].value, 1e-9);
  close(c.params[1].u, w.params[1].u, 1e-9);
  close(c.params[0].value, w.params[0].value, 1e-9);
  close(c.covariance[0][0], w.covariance[0][0] + uc * uc, 1e-9);
});

test('polinom: aniq 2- va 3-darajali ma\'lumot qayta tiklanadi; x_ref siljishi bashoratni o\'zgartirmaydi', () => {
  const xs = [0, 1, 2, 3, 4, 5, 6, 7];
  const f3 = x => 1.5 - 0.7 * x + 0.25 * x * x - 0.01 * x ** 3;
  const r = fit({ method: 'OLS', model: { degree: 3 }, settings: { uy: 0.01 }, points: xs.map(x => ({ x, y: f3(x) })), predict: [{ x: 2.5 }] });
  [1.5, -0.7, 0.25, -0.01].forEach((v, j) => close(r.params[j].value, v, 1e-9, 'p' + j));
  assert.ok(r.chi2.obs < 1e-15 && r.chi2.pass);
  const s = fit({ method: 'OLS', model: { degree: 3, xRef: 3.5 }, settings: { uy: 0.01 }, points: xs.map(x => ({ x, y: f3(x) })), predict: [{ x: 2.5 }] });
  close(s.predictions[0].y, r.predictions[0].y, 1e-11);
  close(s.predictions[0].u, r.predictions[0].u, 1e-8);
  close(r.predictions[0].y, f3(2.5), 1e-11);
});

/* ── χ² ── */
test('χ² kvantili: ν = 2 da aniq −2·ln(1 − P); ν = 1 da z²; CDF(kvantil) = P; ma\'lum jadval qiymatlari', () => {
  for (const P of [0.5, 0.9, 0.95, 0.99, 0.999]) close(E.chi2Quantile(P, 2), -2 * Math.log(1 - P), 1e-12, 'ν=2');
  for (const P of [0.9, 0.95, 0.99]) close(E.chi2Quantile(P, 1), E.normalQuantile((1 + P) / 2) ** 2, 1e-11, 'ν=1');
  for (const nu of [1, 2, 3, 5, 9, 13, 30, 100, 500]) for (const P of [0.05, 0.5, 0.95, 0.99]) close(E.chi2Cdf(E.chi2Quantile(P, nu), nu), P, 1e-11);
  // Abramowitz & Stegun Table 26.8 (5 qiymatli raqam): χ²_0.95(9) = 16.919, (13) = 22.362, (30) = 43.773
  assert.equal(E.chi2Quantile(0.95, 9).toFixed(3), '16.919');
  assert.equal(E.chi2Quantile(0.95, 13).toFixed(3), '22.362');
  assert.equal(E.chi2Quantile(0.95, 30).toFixed(3), '43.773');
});

test('χ² testi yiqilganda warnings[] da regression_chi2_fail; o\'tganda yo\'q', () => {
  const tooSmallU = fit({ method: 'WLS', points: pts(LINE, { uy: 0.01 }) });
  assert.equal(tooSmallU.chi2.pass, false);
  assert.ok(tooSmallU.chi2.obs > tooSmallU.chi2.crit);
  const w = tooSmallU.warnings.find(x => x.code === 'regression_chi2_fail');
  assert.ok(w && w.severity === 'warning' && w.ref && w.value);
  const ok = fit({ method: 'WLS', points: pts(LINE, { uy: 0.2 }) });
  assert.equal(ok.chi2.pass, true);
  assert.ok(!ok.warnings.some(x => x.code === 'regression_chi2_fail'));
  close(ok.chi2.crit, E.chi2Quantile(0.95, 4), 1e-12);
  assert.equal(ok.nu, 4);
  // OLS, u(y) noma'lum: test qo'llanmaydi (χ²/ν ≡ 1) — ochiq aytiladi
  const o = fit({ method: 'OLS', points: pts(LINE) });
  assert.deepEqual([o.chi2.applicable, o.chi2.pass], [false, null]);
  assert.ok(o.warnings.some(x => x.code === 'regression_chi2_na'));
});

test('har bir ogohlantirishda {code, severity, ref} bor (P05 da linterga ko\'chiriladi)', () => {
  const all = [
    fit({ method: 'WLS', points: pts(LINE, { uy: 0.01, ux: 0.1 }), predict: [{ x: 100 }], inverse: [{ y0: 5 }] }),
    fit({ method: 'WTLS', points: pts(LINE, { uy: 0.1, ux: 0.1 }) }),
    fit({ method: 'OLS', points: pts(LINE).map((p, i) => ({ ...p, uy: 0.1 + i / 100 })), uRange: { points: [{ x: 1, U: 0.1 }, { x: 2, U: 0.3 }, { x: 3, U: 0.2 }] } }),
    fit({ method: 'WLS', settings: { sigma: 'posterior' }, points: pts(LINE, { uy: 0.1 }) }),
  ].flatMap(r => r.warnings);
  const codes = new Set(all.map(w => w.code));
  for (const c of ['regression_chi2_fail', 'regression_ux_ignored', 'regression_extrapolation', 'regression_inverse_failed', 'regression_method_unverified',
    'regression_uy_unequal', 'regression_chi2_na', 'urange_unverified', 'urange_shifted', 'regression_posterior_scale']) assert.ok(codes.has(c), c);
  for (const w of all) {
    assert.ok(['info', 'warning', 'error'].includes(w.severity), w.code);
    assert.ok(typeof w.ref === 'string' && w.ref.length > 5, w.code);
  }
});

/* ── Bashorat ── */
test('teskari bashorat: QUAM Eq. (E3.3) (kovariatsiyadan) ≡ Eq. (E3.5) (S, Sxx dan) — A5 ma\'lumotlari', () => {
  const base = E.evaluate(A5.modelSpec);
  const [a, b] = base.params.map(p => p.value);
  const xs = A5.modelSpec.points.map(p => p.x), n = xs.length, xm = xs.reduce((s, v) => s + v, 0) / n;
  const Sxx = xs.reduce((s, v) => s + (v - xm) ** 2, 0);
  close(Sxx, 1.2, 1e-12, 'Sxx (QUAM p. 78)');
  for (const [c0, p] of [[0.26, 2], [0.5, 1], [0.85, 3], [0.1, 5]]) {
    const r = E.evaluate({ ...A5.modelSpec, inverse: [{ y0: a + b * c0, p }] }).inverse[0];
    const e35 = base.s / b * Math.sqrt(1 / p + 1 / n + (c0 - xm) ** 2 / Sxx);
    close(r.u, e35, 1e-9, `c0 = ${c0}`);
    close(r.x0, c0, 1e-12);
    assert.equal(r.nu, 13);
    assert.equal(r.uy0Source, 'residual');
    close(Math.hypot(r.components.y0, r.components.calibration), r.u, 1e-12);
  }
});

test('teskari bashorat: y₀ takror o\'lchashlar massivi → o\'rtacha va p; aniq u(y₀) va ν — Welch–Satterthwaite', () => {
  const r = E.evaluate({ ...A5.modelSpec, inverse: [{ y0: [0.071, 0.072] }, { y0: 0.0715, p: 2 }, { y0: 0.0715, uy0: 0.004, nuY0: 1 }, { y0: 0.0715, uy0: 0 }] });
  close(r.inverse[0].u, r.inverse[1].u, 1e-12);
  assert.equal(r.inverse[0].p, 2);
  const g = r.inverse[2];
  const nu = g.u ** 4 / (g.components.calibration ** 4 / 13 + g.components.y0 ** 4 / 1);
  close(g.nu, nu, 1e-10);
  assert.ok(g.nu > 1 && g.nu < 13);
  close(g.k, E.coverage(0.9545, g.nu).k, 1e-12);
  close(g.U, g.k * g.u, 1e-12);
  // u(y₀) = 0 aniq berilsa — faqat kalibrlash hissasi
  close(r.inverse[3].u, r.inverse[3].components.calibration, 1e-12);
});

test('teskari ≡ to\'g\'ri bashorat aylanishi; polinomda diapazonda ildiz yo\'q / noaniq → xato kodi', () => {
  const xs = [0, 1, 2, 3, 4, 5, 6];
  const q = x => 0.2 + 1.1 * x + 0.05 * x * x;
  const p = xs.map(x => ({ x, y: q(x), uy: 0.02 }));
  const r = fit({ method: 'WLS', model: { degree: 2 }, points: p, inverse: [{ y0: q(3.3), uy0: 0.02 }, { y0: 100, uy0: 0.02 }] });
  close(r.inverse[0].x0, 3.3, 1e-10);
  // u(x̂₀) = √(u²(y₀) + gᵀVg)/|f′(x̂₀)|
  const fw = fit({ method: 'WLS', model: { degree: 2 }, points: p, predict: [{ x: 3.3 }] }).predictions[0];
  close(r.inverse[0].u, Math.hypot(0.02, fw.u) / (1.1 + 0.1 * 3.3), 1e-8);
  assert.equal(r.inverse[1].error, 'regression_inverse_no_root');
  // parabola cho'qqisi diapazon ichida: bitta y₀ ga ikki x mos keladi
  const par = [0, 1, 2, 3, 4, 5, 6].map(x => ({ x, y: (x - 3) ** 2, uy: 0.05 }));
  const amb = fit({ method: 'WLS', model: { degree: 2 }, points: par, inverse: [{ y0: 4, uy0: 0.05 }] });
  assert.equal(amb.inverse[0].error, 'regression_inverse_ambiguous');
});

test('GUM H.3.5: t0 ni o\'zgartirish (H.16a–H.17b) bashoratni o\'zgartirmaydi; t0 = t̄ da r(y1′, y2) = 0, s(y1′) = 0,0011', () => {
  const tbar = 24.0085;
  const r = E.evaluate({ ...H3.modelSpec, model: { degree: 1, xRef: H3.modelSpec.points.reduce((s, p) => s + p.x, 0) / 11 } });
  assert.ok(Math.abs(r.correlation[0][1]) < 1e-9);
  assert.ok(Math.abs(r.params[0].value - (-0.1625)) <= 0.00005, 'H.17a: y1′ = −0,162 5');
  assert.ok(Math.abs(r.params[0].u - 0.0011) <= 0.00005, 'H.17a: s(y1′) = 0,001 1');
  assert.ok(Math.abs(r.xRef - tbar) <= 0.00005);
  const p0 = E.evaluate(H3.modelSpec).predictions[0];
  close(r.predictions[0].y, p0.y, 1e-10);
  close(r.predictions[0].u, p0.u, 1e-9);
  assert.equal(p0.extrapolated, true); // 30 °C — 21…27 °C diapazondan tashqarida (H.3.4)
});

test('bashorat: U = k·u, k = t_P(ν) (aposterior: ν = m − n; aprior: normal kvantil); natija yaxlitlanmagan', () => {
  const post = E.evaluate(H3.modelSpec).predictions[0];
  close(post.k, E.tQuantile(0.9545, 9), 1e-12);
  const prior = fit({ method: 'WLS', points: pts(LINE, { uy: 0.2 }), predict: [{ x: 3 }] }).predictions[0];
  assert.equal(prior.nu, Infinity);
  close(prior.k, E.tQuantile(0.9545, Infinity), 1e-12);
  assert.ok(String(post.u).length > 10);
});

/* ── U — diapazon (unverified) ── */
test('U — diapazon: U(X) = a + b·|X| barcha nuqtalarda U(X_j) ≥ U_j; "max" — o\'zgarmas yuqori chegara; unverified belgisi', () => {
  const p = [{ x: -10, U: 0.021 }, { x: 0, U: 0.010 }, { x: 10, U: 0.019 }, { x: 20, U: 0.034 }, { x: 30, U: 0.038 }];
  const lin = E.uRangeFunction(p, 'linear');
  assert.equal(lin.unverified, true);
  for (const q of lin.points) assert.ok(q.margin >= -1e-15, `U(${q.x}) < U_j`);
  assert.ok(lin.points.some(q => Math.abs(q.margin) < 1e-12), 'kamida bitta nuqtada tegib turadi');
  assert.ok(lin.shift > 0 && lin.b > 0);
  close(E.uRangeAt(lin, -15), lin.a + lin.b * 15, 1e-12);
  assert.equal(E.uRangeAt(lin, 45), null); // diapazondan tashqarida ekstrapolyatsiya yo'q
  const mx = E.uRangeFunction(p, 'max');
  assert.deepEqual([mx.a, mx.b], [0.038, 0]);
  // aniq chiziqli ma'lumot: surish 0
  const ex = E.uRangeFunction([{ x: 1, U: 0.11 }, { x: 2, U: 0.12 }, { x: 5, U: 0.15 }]);
  assert.ok(ex.shift < 1e-15); close(ex.a, 0.1, 1e-10); close(ex.b, 0.01, 1e-10);
  // xatolar: U = 0 jimgina o'tmaydi
  assert.equal(E.uRangeFunction([{ x: 1, U: 0.1 }, { x: 2, U: 0 }]).error, 'urange_bad_data');
  assert.equal(E.uRangeFunction([{ x: 1, U: 0.1 }]).error, 'urange_too_few_points');
  assert.equal(E.uRangeFunction([{ x: 1, U: 0.1 }, { x: -1, U: 0.2 }]).error, 'urange_x_degenerate');
  assert.equal(E.uRangeFunction(p, 'spline').error, 'urange_bad_mode');
});

/* ── API ── */
test('evaluate(): uc-regression/1 → mode REGRESSION; uc-model/1 va calc-state/v2 natijalarida regressiya maydonlari yo\'q', () => {
  const r = E.evaluate(H3.modelSpec);
  assert.deepEqual([r.mode, r.format, r.engineVersion, r.method, r.m, r.nParam], ['REGRESSION', 'uc-regression/1', E.ENGINE_VERSION, 'OLS', 11, 2]);
  assert.deepEqual(E.evaluateRegression(H3.modelSpec), r);
  const g = E.evaluate(require('../cases/excel/excel-density.json').modelSpec);
  assert.equal(g.mode, undefined);
  assert.equal(g.params, undefined);
  assert.ok(E.FORMATS.includes('uc-regression/1'));
});
