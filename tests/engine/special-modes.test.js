/* P10: maxsus rejimlar — namuna olish (src/engine/sampling/), sifatli testlar (qualitative/),
   mikrobiologiya (micro/, BETA) va tibbiy laboratoriya (medical/, BETA) — birlik va analitik testlar.
   Manba misollari (UfS A1, A2; AQA E3, 7.6) — tests/cases/ufs/, tests/cases/aqa/ (tests/run-cases.test.js). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../../src/engine/index.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} natija ${a}, kutilgan ${b} ± ${tol}`);
const codes = r => r.warnings.map(w => w.code);
const A1 = require('../cases/ufs/ufs-a1-nitrate-classical.json').modelSpec.targets;

/* ── Namuna olish ── */

test('klassik ichma-ich ANOVA: qo\'lda hisoblangan kichik misol (2 ob\'ekt)', () => {
  // ob'ekt 1: [10, 12 | 14, 16]; ob'ekt 2: [20, 20 | 26, 22]
  // SS_anal = 2 + 2 + 0 + 8 = 12 (4 d.f.) → MS = 3; namuna o'rtachalari 11, 15 | 20, 24 → SS_samp = 2·(4 + 4) + 2·(4 + 4) = 32 (2 d.f.) → MS = 16
  // ob'ekt o'rtachalari 13, 22; umumiy 17,5 → SS_target = 4·(20,25 + 20,25) = 162 (1 d.f.)
  const a = E.classicalAnova([[10, 12, 14, 16], [20, 20, 26, 22]]);
  assert.deepEqual(a.ss, { between: 162, sampling: 32, analysis: 12 });
  assert.deepEqual(a.variance, { between: (162 - 16) / 4, sampling: (16 - 3) / 2, analysis: 3 });
  assert.equal(a.mean, 17.5);
});

test('s_meas² = s_samp² + s_anal² (UfS Eq. 1–2); U\' = 2·100·s_meas/x̄ (Eq. 4); natija yaxlitlanmagan', () => {
  const r = E.evaluate({ format: 'uc-sampling/1', targets: A1 });
  assert.equal(r.mode, 'SAMPLING'); assert.equal(r.method, 'classical'); assert.equal(r.k, 2);
  near(r.uc ** 2, r.sSamp ** 2 + r.sAnal ** 2, 1e-6);
  near(r.relU, 2 * 100 * r.uc / r.mean, 1e-12);
  assert.equal(r.U, 2 * r.uc);
  assert.equal(r.nTargets, 8);
  assert.ok(r.classical && r.robust);                       // ikkalasi ham taqqoslash uchun beriladi
});

test('robust ANOVA: chetga chiqqan qiymat ta\'siri kamayadi; chetga chiqishsiz ma\'lumotda klassikka yaqin', () => {
  const r = E.evaluate({ format: 'uc-sampling/1', targets: A1, method: 'robust' });
  assert.ok(r.sSamp < r.classical.s.sampling);              // C ob'ektidagi chetga chiqish (UfS A1 §6)
  assert.ok(r.robust.converged);
  near(E.HUBER_BETA, 0.7785, 0.00005);
  const clean = A1.map(t => t.values).filter((_, i) => i !== 2);
  const c = E.evaluate({ format: 'uc-sampling/1', targets: clean, method: 'robust' });
  near(c.sAnal / c.classical.s.analysis, 1, 0.2);
});

test('manfiy dispersiya bahosi → 0 ga tenglanadi va ogohlantirish chiqadi', () => {
  // namunalar orasidagi farq tahlil tarqoqligidan kichik: MS_samp < MS_anal
  const d = [[10, 14, 12, 12], [20, 16, 18, 18], [30, 34, 32, 32], [40, 36, 38, 38], [50, 54, 52, 52], [60, 56, 58, 58], [70, 74, 72, 72], [80, 76, 78, 78]];
  const r = E.evaluate({ format: 'uc-sampling/1', targets: d });
  assert.ok(r.classical.negative.includes('sampling'));
  assert.equal(r.sSamp, 0);
  const w = r.warnings.find(x => x.code === 'sampling_negative_variance');
  assert.ok(w && w.severity === 'warning' && /UfS:2019/.test(w.ref) && /sampling/.test(w.value));
  assert.equal(r.uc, r.sAnal);
});

test('ogohlantirishlar: 8 tadan kam ob\'ekt; o\'lchash dispersiyasi > 20 %; bias kirmaydi (har birida code, severity, ref)', () => {
  const r = E.evaluate({ format: 'uc-sampling/1', targets: A1.slice(0, 5) });
  assert.ok(codes(r).includes('sampling_few_targets'));
  assert.ok(codes(r).includes('sampling_bias_not_included'));
  assert.ok(codes(E.evaluate({ format: 'uc-sampling/1', targets: A1 })).includes('sampling_fitness'));
  for (const w of Object.values(E.SAMPLING_WARNINGS)) assert.ok(['info', 'warning'].includes(w.severity) && w.ref.length > 10);
});

test('xatolar: muvozanatsiz dizayn, son emas, kam ob\'ekt, usul, log uchun musbat bo\'lmagan qiymat', () => {
  const ev = s => E.evaluate({ format: 'uc-sampling/1', ...s });
  assert.equal(ev({ targets: [[1, 2, 3], [1, 2, 3, 4]] }).error, 'sampling_unbalanced');
  assert.equal(ev({ targets: [[1, 2, 3, ''], [1, 2, 3, 4]] }).error, 'sampling_unbalanced');
  assert.equal(ev({ targets: [[1, 2, 3, 'x'], [1, 2, 3, 4]] }).error, 'sampling_bad_data');
  assert.equal(ev({ targets: [[1, 2, 3, 4]] }).error, 'sampling_too_few');
  assert.equal(ev({ targets: A1, method: 'bootstrap' }).error, 'sampling_bad_method');
  assert.equal(ev({ targets: [[0, 2, 3, 4], [1, 2, 3, 4]], logTransform: true }).error, 'sampling_log_nonpositive');
  assert.ok(E.SAMPLING_ERRORS.includes('sampling_unbalanced'));
});

test('o\'lchangan natija: nisbiy U\' har bir natijaga qo\'llanadi (UfS Table A1.2: 16,4 %)', () => {
  const r = E.evaluate({ format: 'uc-sampling/1', targets: A1, method: 'robust', measurement: { value: 4408 } });
  near(r.absU, 4408 * r.relU / 100, 1e-9);
  near(r.absU, 721, 1);                                      // 2·360,55 ≈ 721 mg/kg
});

/* ── Sifatli testlar ── */

test('2×2 jadval: SS, SP, FP, FN ulushlari, LR(+), LR(−), tadqiqotdagi PPV / NPV', () => {
  const r = E.evaluate({ format: 'uc-qualitative/1', table: { tp: 90, fn: 10, fp: 5, tn: 95 } });
  assert.equal(r.mode, 'QUALITATIVE');
  assert.equal(r.sensitivity.value, 0.9); assert.equal(r.specificity.value, 0.95);
  near(r.falsePositiveRate.value, 0.05, 1e-15); near(r.falseNegativeRate.value, 0.1, 1e-15);
  near(r.lrPositive, 18, 1e-12); near(r.lrNegative, 0.1 / 0.95, 1e-12);
  near(r.ppvStudy.value, 90 / 95, 1e-15); near(r.npvStudy.value, 95 / 105, 1e-15);
  assert.equal(r.studyPrevalence, 0.5);
  assert.ok(codes(r).includes('qualitative_prevalence_study'));
});

test('Wilson intervali (AQA §4.4, p. 18): 400/400 → 99 %; 5/5 → 57 %; 100/100 → 96,3 %', () => {
  near(100 * E.wilsonInterval(400, 400).low, 99, 0.5);
  near(100 * E.wilsonInterval(5, 5).low, 57, 0.5);
  near(100 * E.wilsonInterval(100, 100).low, 96.3, 0.05);
  assert.equal(E.wilsonInterval(100, 100).high, 1);
  assert.equal(E.wilsonInterval(0, 50).low, 0);
});

test('Clopper–Pearson (aniq): x = n → quyi (α/2)^(1/n); x = 0 → yuqori 1 − (α/2)^(1/n); simmetriya; Wilsondan kengroq', () => {
  for (const n of [5, 20, 100]) {
    near(E.clopperPearsonInterval(n, n).low, Math.pow(0.025, 1 / n), 1e-10);
    near(E.clopperPearsonInterval(0, n).high, 1 - Math.pow(0.025, 1 / n), 1e-10);
  }
  const a = E.clopperPearsonInterval(7, 20), b = E.clopperPearsonInterval(13, 20);
  near(a.low, 1 - b.high, 1e-10); near(a.high, 1 - b.low, 1e-10);
  // n = 1, x = 1: [0,025; 1]
  near(E.clopperPearsonInterval(1, 1).low, 0.025, 1e-10);
  const w = E.wilsonInterval(7, 20);
  assert.ok(a.high - a.low > w.high - w.low);
  // qamrov: binomial yig'indi bilan tekshiruv — P(X ≥ 7 | p_low) = 0,025
  const binTail = (x, n, p) => { let s = 0, c = 1; for (let i = 0; i <= n; i++) { if (i >= x) s += c * p ** i * (1 - p) ** (n - i); c = c * (n - i) / (i + 1); } return s; };
  near(binTail(7, 20, a.low), 0.025, 1e-9);
});

test('Clopper–Pearson: mustaqil ochiq dastur qiymatlari — SciPy 1.18.1, scipy.stats.binomtest(x, n).proportion_ci(confidence_level=P, method="exact")', () => {
  // Qiymatlar P10 sessiyasida SciPy 1.18.1 da hisoblab olingan (mustaqil amalga oshirish; ochiq manba dasturi).
  const SCIPY = [
    [7, 20, 0.95, 0.15390920478454118, 0.592188534532828],
    [97, 100, 0.95, 0.91482394702572, 0.9937700284616936],
    [100, 100, 0.95, 0.9637833073548235, 1.0],
    [0, 50, 0.95, 0.0, 0.07112173646419766],
    [3, 100, 0.95, 0.006229971538306397, 0.08517605297428],
    [45, 60, 0.95, 0.6214036445204557, 0.8528139262009964],
    [7, 20, 0.99, 0.11387976326673219, 0.6565685842319213],
  ];
  for (const [x, n, P, low, high] of SCIPY) {
    const c = E.clopperPearsonInterval(x, n, P);
    near(c.low, low, 1e-10, `${x}/${n} quyi`); near(c.high, high, 1e-10, `${x}/${n} yuqori`);
  }
});

test('ishonch intervali usuli (egasi qarori 2026-11-18): standart Wilson; Clopper–Pearson — sozlama; noto\'g\'ri qiymat → xato', () => {
  const table = { tp: 100, fn: 0, fp: 3, tn: 97 };
  const d = E.evaluate({ format: 'uc-qualitative/1', table });
  assert.equal(d.ciMethod, 'wilson'); assert.equal(E.DEFAULT_CI_METHOD, 'wilson');
  assert.deepEqual(d.specificity.ci, d.specificity.wilson);
  assert.ok(!codes(d).some(c => /cp_/.test(c)));               // standart holatda Clopper–Pearson haqida xabar yo'q
  const cp = E.evaluate({ format: 'uc-qualitative/1', table, settings: { ciMethod: 'clopper_pearson' } });
  assert.equal(cp.ciMethod, 'clopper_pearson');
  assert.deepEqual(cp.specificity.ci, cp.specificity.clopperPearson);
  assert.deepEqual(cp.specificity.wilson, d.specificity.wilson);   // ikkalasi ham natijada saqlanadi (batafsil ko'rinish uchun)
  const w = cp.warnings.find(x => x.code === 'qualitative_cp_project_addition');
  assert.ok(w && w.severity === 'info' && /AQA:2021/.test(w.ref));
  assert.equal(E.evaluate({ format: 'uc-qualitative/1', table, settings: { ciMethod: 'wald' } }).error, 'qualitative_bad_data');
  assert.deepEqual(E.CI_METHODS, ['wilson', 'clopper_pearson']);
});

test('posterior ehtimol (Bayes): tarqalganlik bilan PP va PN; teng ehtimolda PP = LR/(LR + 1)', () => {
  near(E.posterior(0.5, 1000), 1000 / 1001, 1e-15);
  const r = E.evaluate({ format: 'uc-qualitative/1', table: { tp: 90, fn: 10, fp: 5, tn: 95 }, prevalence: 0.01 });
  near(r.posteriorPositive, 0.01 * 0.9 / (0.01 * 0.9 + 0.99 * 0.05), 1e-12);      // kam tarqalganlikda PP past
  near(r.posteriorNegative, 0.99 * 0.95 / (0.99 * 0.95 + 0.01 * 0.1), 1e-12);
  assert.ok(!codes(r).includes('qualitative_prevalence_study'));
});

test('nol noto\'g\'ri natija: LR(+) = ∞ va ogohlantirish (AQA E3); kichik tanlanma; xatolar', () => {
  const r = E.evaluate({ format: 'uc-qualitative/1', table: { tp: 20, fn: 0, fp: 0, tn: 20 } });
  assert.equal(r.lrPositive, Infinity);
  assert.ok(codes(r).includes('qualitative_zero_false') && codes(r).includes('qualitative_small_n'));
  const ev = s => E.evaluate({ format: 'uc-qualitative/1', ...s });
  assert.equal(ev({}).error, 'qualitative_bad_spec');
  assert.equal(ev({ table: { tp: 1.5, fn: 0, fp: 0, tn: 1 } }).error, 'qualitative_bad_data');
  assert.equal(ev({ table: { tp: -1, fn: 0, fp: 0, tn: 1 } }).error, 'qualitative_bad_data');
  assert.equal(ev({ table: { tp: 0, fn: 0, fp: 1, tn: 1 } }).error, 'qualitative_no_positive_cases');
  assert.equal(ev({ table: { tp: 1, fn: 1, fp: 0, tn: 0 } }).error, 'qualitative_no_negative_cases');
  assert.equal(ev({ table: { tp: 1, fn: 1, fp: 1, tn: 1 }, prevalence: 1.2 }).error, 'qualitative_bad_data');
});

/* ── Mikrobiologiya (BETA, tekshirilmagan) ── */

test('mikrobiologiya: u_Poisson = 0,4343/√ΣC; u_tech dublikatlarning log₁₀ farqlaridan; asimmetrik interval', () => {
  const r = E.evaluate({ format: 'uc-micro/1', result: { value: 1e4, sumCounts: 100 }, technical: { pairs: [[100, 1000], [1000, 100]] }, matrix: { u: 0.1 } });
  assert.equal(r.mode, 'MICROBIOLOGY');
  near(E.LOG10_E, 0.4343, 0.00005);
  near(r.uPoisson, 0.04343, 0.000005);
  near(r.uTech, Math.sqrt((1 + 1) / 4), 1e-12);             // d = ∓1 → s = √(2/(2·2))
  near(r.uc, Math.sqrt(0.5 + 0.01 + r.uPoisson ** 2), 1e-12);
  assert.equal(r.y, 4); assert.equal(r.U, 2 * r.uc);
  near(r.interval.low, 10 ** (4 - r.U), 1e-9); near(r.interval.high, 10 ** (4 + r.U), 1e-6);
  assert.ok(r.value - r.interval.low < r.interval.high - r.value);   // oddiy shkalada asimmetrik
  near(r.budget.reduce((s, b) => s + b.share, 0), 100, 1e-9);
});

test('mikrobiologiya: har doim "tekshirilmagan" belgisi; past sanoq; texnik hissa yo\'q; nol sanoq → xato', () => {
  const r = E.evaluate({ format: 'uc-micro/1', result: { value: 40, sumCounts: 4 } });
  assert.equal(r.unverified, true);
  assert.deepEqual(codes(r), ['micro_unverified', 'micro_no_technical', 'micro_low_count']);
  assert.ok(r.warnings.every(w => w.ref && w.severity));
  assert.ok(!codes(E.evaluate({ format: 'uc-micro/1', result: { value: 40, sumCounts: 4 }, technical: { s: 0.1 }, settings: { lowCountThreshold: 3 } })).includes('micro_low_count'));
  assert.equal(E.evaluate({ format: 'uc-micro/1', result: { value: 0, sumCounts: 0 } }).error, 'micro_zero_count');
  assert.equal(E.evaluate({ format: 'uc-micro/1', result: {} }).error, 'micro_need_result');
  assert.equal(E.evaluate({ format: 'uc-micro/1', result: { value: 10, sumCounts: 5 }, technical: { pairs: [[0, 5]] } }).error, 'micro_bad_data');
});

/* ── Tibbiy laboratoriya (BETA, tekshirilmagan) ── */

test('tibbiy laboratoriya: u = √(u_cal² + u_Rw²) [+ u_bias²] har bir IQC darajasi uchun; nisbiy va mutlaq', () => {
  const r = E.evaluate({ format: 'uc-medical/1', unit: 'mmol/L', levels: [{ id: 'L1', mean: 5, cv: 3, n: 60 }, { id: 'L2', mean: 20, sd: 0.4, n: 60 }],
    uCal: { value: 4, relative: true }, measurement: { value: 6 } });
  assert.equal(r.mode, 'MEDICAL'); assert.equal(r.unverified, true);
  const [l1, l2] = r.levels;
  near(l1.u.rel, 5, 1e-12); near(l1.u.abs, 0.25, 1e-12);     // √(3² + 4²) = 5 %
  near(l2.uRw.rel, 2, 1e-12); near(l2.u.rel, Math.sqrt(4 + 16), 1e-12);
  near(l1.U.rel, 10, 1e-12);
  assert.equal(r.appliedLevel, 'L1'); near(r.relU, 10, 1e-12); near(r.absU, 0.6, 1e-12);
  assert.deepEqual(codes(r), ['medical_unverified']);
  const b = E.evaluate({ format: 'uc-medical/1', unit: 'mmol/L', levels: [{ mean: 5, cv: 3, uCal: { value: 0.2, unit: 'mmol/L' }, uBias: { value: 0.15, unit: 'mmol/L' } }] });
  near(b.levels[0].u.abs, Math.sqrt(0.15 ** 2 + 0.2 ** 2 + 0.15 ** 2), 1e-12);
});

test('tibbiy laboratoriya: IQC qatoridan o\'rtacha va SD; kalibrator yo\'q / kam IQC ogohlantirishi; shkala xatolari', () => {
  const r = E.evaluate({ format: 'uc-medical/1', unit: 'g/L', levels: [{ id: 'L1', values: [9, 10, 11] }] });
  assert.equal(r.levels[0].mean, 10); assert.equal(r.levels[0].sd, 1); assert.equal(r.levels[0].cv, 10);
  assert.ok(codes(r).includes('medical_no_calibrator') && codes(r).includes('medical_few_iqc'));
  const ev = s => E.evaluate({ format: 'uc-medical/1', unit: 'g/L', ...s });
  assert.equal(ev({ levels: [] }).error, 'medical_need_levels');
  assert.equal(ev({ levels: [{ mean: 5, cv: 2 }], uCal: { value: 1 } }).error, 'medical_need_scale');
  assert.equal(ev({ levels: [{ mean: 5, cv: 2 }], uCal: { value: 1, relative: true, unit: 'g/L' } }).error, 'medical_mixed_scale');
  assert.equal(ev({ levels: [{ mean: 5, cv: 2 }], uCal: { value: 1, unit: 'mg/L' } }).error, 'medical_mixed_scale');
  assert.equal(ev({ levels: [{ mean: 0, cv: 2 }] }).error, 'medical_zero_mean');
  assert.equal(ev({ levels: [{ values: [5] }] }).error, 'medical_too_few');
  assert.equal(E.evaluate({ format: 'uc-medical/1', levels: [{ mean: 5, cv: 2 }] }).error, 'medical_need_scale');
});

/* ── Umumiy ── */

test('evaluate() to\'rt yangi formatni uzatadi; FORMATS da bor; har bir ogohlantirishda {severity, ref}', () => {
  for (const f of ['uc-sampling/1', 'uc-qualitative/1', 'uc-micro/1', 'uc-medical/1']) assert.ok(E.FORMATS.includes(f));
  for (const tbl of [E.SAMPLING_WARNINGS, E.QUALITATIVE_WARNINGS, E.MICRO_WARNINGS, E.MEDICAL_WARNINGS]) {
    for (const [c, w] of Object.entries(tbl)) assert.ok(['info', 'warning'].includes(w.severity) && w.ref.length > 10, c);
  }
});

test('yangi modullar: brauzer obyektlari yo\'q; har bir faylda manba havolasi (Ref:)', () => {
  for (const m of ['sampling', 'qualitative', 'micro', 'medical']) {
    const src = fs.readFileSync(path.join(__dirname, '../../src/engine', m, 'index.js'), 'utf8');
    assert.ok(!/\b(document|window|localStorage|navigator)\b/.test(src), m);
    assert.match(src, /Ref: /, m);
  }
});
