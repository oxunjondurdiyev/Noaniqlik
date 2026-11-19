/* P12: usul validatsiyasi statistikasi (src/engine/validation/, src/engine/stats/).
   MAJBURIY (verified) misollar — NIST/SEMATECH e-Handbook of Statistical Methods, ko'chirma
   docs/references/nist-ehandbook-p12/ (AQSh davlat ishi). Kutilgan qiymatlar FAQAT shu sahifalardan.
   Tolerans — manbadagi oxirgi xonaning yarmi; agar manbada kirish ma'lumotining o'zi yaxlitlangan (yig'ma statistika) bo'lsa,
   shu yaxlitlashning ta'siri ham qo'shiladi (sabab har bir assert yonida).
   UNVERIFIED (majburiy emas): Cochran kritik qiymati (ISO 5725-2 repoda yo'q) — Monte-Karlo bilan mustaqil tekshiruv (todo);
   LOD/LOQ (Eurachem FfP 2014 — egasi qo'shadi) — todo. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/engine/index.js');

const near = (a, e, tol, msg) => assert.ok(Math.abs(a - e) <= tol, `${msg}: ${a} ≠ ${e} ± ${tol}`);

/* ── NIST §1.3.5.17.1 Grubbs (eda35h1.htm): 8 ta uran izotopi o'lchovi ── */
const URANIUM = [199.31, 199.53, 200.19, 200.82, 201.92, 201.95, 202.18, 245.57];

test('[verified] NIST 1.3.5.17.1 Grubbs: G = 2.4687, yuqori bir tomonlama kritik qiymat 2.032 (α = 0.05), maksimum — chetga chiquvchi', () => {
  const r = E.grubbsTest(URANIUM, { side: 'max', alpha: 0.05 });
  // D-22 (tests/cases/DISCREPANCIES.md): manba G ni 4 xonagacha KESGAN (2,468 765 → "2.4687"; yaxlitlansa 2,4688 bo'lardi).
  // Aniq ratsional hisob: 2,468 764 611 2… Shuning uchun tekshiruv: 2,4687 ≤ G < 2,4688.
  assert.ok(r.G >= 2.4687 && r.G < 2.4688, `G (eda35h1.htm: "Test statistic: G = 2.4687"): ${r.G}`);
  near(r.G, 2.4687646112, 1e-10, 'G (mustaqil aniq ratsional hisob)');
  near(r.critical, 2.032, 5e-4, 'G_crit ("Critical value for an upper one-tailed test: 2.032")');
  assert.equal(r.outlier, true);                     // "we reject the null hypothesis"
  assert.equal(r.value, 245.57);
  assert.equal(r.index, 7);
  // Ikki tomonlama variant: G o'zgarmaydi (maksimum eng chetdagi), kritik qiymat α/(2N) bilan — kattaroq
  const two = E.grubbsTest(URANIUM, { side: 'two' });
  assert.equal(two.G, r.G);
  assert.ok(two.critical > r.critical);
  // Linter A4 (ikki tomonlama) bilan bir xil formula
  near(two.critical, E.grubbsCritical(8, 0.05), 1e-12, 'linter A4 bilan mos');
});

test('Grubbs: dastur nuqtani O\'CHIRMAYDI; chiqarish faqat izoh (≥ 10 belgi) bilan, natijada izoh saqlanadi', () => {
  const v = E.evaluate({ format: 'uc-validation/1', tests: [{ id: 'g1', type: 'grubbs', values: URANIUM, side: 'max' }] });
  const t = v.tests[0];
  assert.equal(t.values.length, 8);                  // barcha qiymatlar joyida
  assert.equal(t.flaggedIndex, 7);
  assert.deepEqual(t.excluded, []);
  assert.ok(v.findings.some(f => f.code === 'grubbs_flagged' && f.severity === 'warning'));
  // izohsiz / qisqa izoh — xato
  const bad = E.evaluate({ format: 'uc-validation/1', tests: [{ id: 'g1', type: 'grubbs', values: URANIUM, excluded: [{ index: 7, comment: 'xato' }] }] });
  assert.equal(bad.tests[0].error, 'validation_bad_exclusion');
  // foydalanuvchi qarori bilan chiqarilgach — takror test FAQAT shu so'rov bilan; chiqarilgan qiymat natijada qoladi
  const ok = E.evaluate({ format: 'uc-validation/1', tests: [{ id: 'g1', type: 'grubbs', side: 'max', values: URANIUM, excluded: [{ index: 7, comment: 'Massa-spektrometr nosozligi qayd etilgan', role: 'admin' }] }] });
  const t2 = ok.tests[0];
  assert.equal(t2.n, 7);
  assert.equal(t2.values.length, 8);
  assert.deepEqual(t2.excluded.map(x => [x.index, x.value, x.role]), [[7, 245.57, 'admin']]);
  assert.ok(ok.findings.some(f => f.code === 'value_excluded' && /nosozligi/.test(f.value)));
  assert.ok(ok.findings.some(f => f.code === 'grubbs_multiple'));
});

test('Grubbs: salbiy holatlar — n < 3, s = 0, noto\'g\'ri tomon, α', () => {
  assert.throws(() => E.grubbsTest([1, 2]), /validation_too_few/);
  assert.throws(() => E.grubbsTest([5, 5, 5, 5]), /validation_zero_sd/);
  assert.throws(() => E.grubbsTest(URANIUM, { side: 'up' }), /validation_bad_test/);
  assert.throws(() => E.grubbsTest(URANIUM, { alpha: 0.7 }), /validation_bad_alpha/);
  assert.throws(() => E.grubbsTest([1, 'abc', 3]), /validation_bad_data/);
  // chetga chiquvchisiz qator — belgilanmaydi
  assert.equal(E.grubbsTest([10.1, 10.2, 10.0, 10.3, 10.15]).outlier, false);
  // α = 0,01 sozlamasi — kritik qiymat kattaroq
  assert.ok(E.grubbsTest(URANIUM, { side: 'max', alpha: 0.01 }).critical > 2.032);
});

/* ── NIST §7.4.3.3–7.4.3.4 bir omilli ANOVA (prc433.htm, prc434.htm): 3 daraja × 5 takror ── */
const RESISTORS = [[6.9, 5.4, 5.8, 4.6, 4.0], [8.3, 6.8, 7.8, 9.2, 6.5], [8.0, 10.5, 8.1, 6.9, 9.3]];

test('[verified] NIST 7.4.3 bir omilli ANOVA: SS, DF, MS, F = 9.59, F₀.₀₅;₂,₁₂ = 3.89, p = 0.00325', () => {
  const r = E.oneWayAnova(RESISTORS);
  // "Example ANOVA table" (prc433.htm)
  near(r.ss.between, 27.897, 5e-4, 'SST');
  near(r.ss.within, 17.452, 5e-4, 'SSE');
  near(r.ss.total, 45.349, 5e-4, 'SS(Total)');
  assert.deepEqual([r.df.between, r.df.within, r.df.total], [2, 12, 14]);
  near(r.ms.between, 13.949, 5e-4, 'MST');
  near(r.ms.within, 1.454, 5e-4, 'MSE');
  near(r.F, 9.59, 5e-3, 'F');
  near(r.critical, 3.89, 5e-3, 'F_0.05;2,12');
  near(r.p, 0.00325, 5e-6, 'p-value ("The p-value for 9.59 is 0.00325")');
  assert.equal(r.significant, true);
  // guruh o'rtachalari: "means 5.34 7.72 8.56"
  r.means.forEach((m, i) => near(m, [5.34, 7.72, 8.56][i], 5e-3, `mean ${i + 1}`));
  // CM = 108.1²/15 = 779.041 (prc434.htm Step 1)
  near(r.grandMean ** 2 * r.N, 779.041, 5e-4, 'CM');
  // yig'ma statistikadan (mean, sd, n) — natija bir xil
  const sum = E.oneWayAnova(RESISTORS.map(g => { const m = g.reduce((a, b) => a + b) / g.length; return { mean: m, sd: Math.sqrt(g.reduce((a, v) => a + (v - m) ** 2, 0) / (g.length - 1)), n: g.length }; }));
  near(sum.F, r.F, 1e-12, 'yig\'ma statistikadan');
});

test('ANOVA tasodifiy effektlar: s_r = √MSE, s_b² = (MST − MSE)/n₀, s_I = √(s_r² + s_b²); s_b² < 0 → s_b = 0 + topilma', () => {
  const r = E.oneWayAnova(RESISTORS);
  near(r.sr, Math.sqrt(r.ms.within), 1e-15, 's_r');
  near(r.sb2, (r.ms.between - r.ms.within) / 5, 1e-15, 's_b²');
  near(r.sI, Math.sqrt(r.ms.within + r.sb2), 1e-15, 's_I');
  assert.equal(r.balanced, true);
  assert.equal(r.n0, 5);
  const neg = E.evaluate({ format: 'uc-validation/1', tests: [{ id: 'a', type: 'anova', groups: [[1, 2, 3], [1.1, 2.1, 3.1], [1, 2, 3.2]] }] });
  const t = neg.tests[0];
  assert.ok(t.sb2 < 0);
  assert.equal(t.sb, 0);
  assert.equal(t.sI, t.sr);
  assert.ok(neg.findings.some(f => f.code === 'anova_negative_component'));
  // teng bo'lmagan guruhlar — n₀ (unverified) va topilma
  const ub = E.evaluate({ format: 'uc-validation/1', tests: [{ id: 'a', type: 'anova', groups: [[1, 2, 3, 4], [2, 3], [5, 6, 7]] }] });
  assert.equal(ub.tests[0].balanced, false);
  near(ub.tests[0].n0, (9 - (16 + 4 + 9) / 9) / 2, 1e-15, 'n₀');
  assert.ok(ub.findings.some(f => f.code === 'anova_unbalanced_n0' && f.unverified));
  // salbiy: bitta guruh; N − k = 0
  assert.throws(() => E.oneWayAnova([[1, 2, 3]]), /validation_too_few/);
  assert.throws(() => E.oneWayAnova([[1], [2]]), /validation_too_few/);
});

/* ── NIST §2.4.4.1–2.4.4.2 (mpc441.htm, mpc442.htm): pooled s₁, s₂ va kunlar komponenti ── */
test('[verified] NIST 2.4.4: pooled s₁ = 0.07871 (ν = 60), s₂ = 0.02742 (ν = 10), s_days² = −0.00028072 → 0', () => {
  const s1i = [0.1024, 0.0943, 0.0622, 0.0702, 0.0627, 0.0622, 0.0996, 0.0533, 0.0364, 0.0768, 0.1042, 0.0868];
  const p1 = E.pooledSd(s1i.map(s => ({ s, nu: 5 })));
  assert.equal(p1.nu, 60);
  near(p1.ss, 0.37176, 5e-5, 'SS (mpc441.htm: 0.37176)');
  near(p1.s, 0.07871, 5e-6, 's₁ (mpc441.htm: 0.07871)');
  const p2 = E.pooledSd([{ s: 0.027280, nu: 5 }, { s: 0.027560, nu: 5 }]);
  assert.equal(p2.nu, 10);
  near(p2.ss, 0.007519, 5e-7, 'SS (mpc442.htm: 0.007519)');
  near(p2.s, 0.02742, 5e-6, 's₂ (mpc442.htm: 0.02742)');
  // s_days² = s₂² − s₁²/J, J = 6 — umumiy yordamchi: (J·s₂² − s₁²)/J
  const vd = E.varianceComponent(6 * p2.s ** 2, p1.s ** 2, 6);
  // manba: "the variance component for between days is -0.00028072" — manbadagi s₁, s₂ yaxlitlanmagan; tolerans 5e-8 (oxirgi xona)
  // + kirish standart og'ishlarining 4–5 xonali yaxlitlanishi (∂/∂s ≈ 2s/J ≈ 0,03 × 5e-5) ≈ 2e-6
  near(vd, -0.00028072, 2e-6, 's_days²');
  assert.equal(E.nonNegative(vd), 0);                // "interpreted as meaning that the variance component for days is zero"
});

/* ── NIST §1.3.5.3 ikki tanlanma t-testi (eda353.htm, AUTO83B.DAT yig'ma statistikasi) ── */
const US = { mean: 20.14458, sd: 6.41470, n: 249 }, JP = { mean: 30.48101, sd: 6.10771, n: 79 };

test('[verified] NIST 1.3.5.3 t-test (teng dispersiya): T = −12.62059, s_p = 6.34260, ν = 326, t = 1.9673 / 1.6495', () => {
  const r = E.twoSampleT(US, JP, { equalVariance: true, alpha: 0.05 });
  // Tolerans: oxirgi xona yarmi (5e-6) + kirish o'rtachalari va s ning 5e-6 / 5e-5 yaxlitlanishi (∂T/∂ȳ ≈ 1/0,82 → ≈ 1e-5)
  near(r.T, -12.62059, 1.5e-5, 'T');
  near(r.sp, 6.34260, 5e-5, 's_p');
  assert.equal(r.df, 326);
  near(r.critical, 1.9673, 5e-5, 't_{1−α/2, ν}');
  assert.equal(r.reject, true);
  near(E.twoSampleT(US, JP, { tail: 'upper' }).critical, 1.6495, 5e-5, 't_{1−α, ν} (bir tomonlama)');
});

test('t-test: Welch (teng bo\'lmagan dispersiya) — ν Welch–Satterthwaite formulasi bilan; salbiy holatlar', () => {
  const r = E.twoSampleT(US, JP, { equalVariance: false });
  const v1 = US.sd ** 2 / US.n, v2 = JP.sd ** 2 / JP.n;
  near(r.df, (v1 + v2) ** 2 / (v1 * v1 / (US.n - 1) + v2 * v2 / (JP.n - 1)), 1e-9, 'ν (eda353.htm formulasi)');
  near(r.T, (US.mean - JP.mean) / Math.sqrt(v1 + v2), 1e-12, 'T');
  assert.throws(() => E.twoSampleT({ mean: 1, sd: 0, n: 3 }, { mean: 1, sd: 0, n: 3 }), /validation_zero_sd/);
  assert.throws(() => E.twoSampleT([1], [1, 2]), /validation_too_few/);
  assert.throws(() => E.twoSampleT(US, JP, { tail: 'left' }), /validation_bad_test/);
  // juft qiymatlar qatoridan ham
  const raw = E.twoSampleT([10, 11, 12, 13], [10, 10.5, 11]);
  assert.equal(raw.n1, 4);
});

/* ── NIST §1.3.5.9 F-test (eda359.htm, JAHANMI2.DAT) ── */
test('[verified] NIST 1.3.5.9 F-test: F = 1.123037, kritik 0.7756 / 1.2894 (α = 0.05, ikki tomonlama), H₀ rad etilmaydi', () => {
  const r = E.fTest({ sd: 65.54909, n: 240 }, { sd: 61.85425, n: 240 }, { tail: 'two', alpha: 0.05 });
  near(r.F, 1.123037, 5e-7, 'F');
  assert.deepEqual([r.df1, r.df2], [239, 239]);
  near(r.lower, 0.7756, 5e-5, 'F(1−α/2)');
  near(r.upper, 1.2894, 5e-5, 'F(α/2)');
  assert.equal(r.reject, false);
  assert.throws(() => E.fTest({ sd: 0, n: 3 }, { sd: 1, n: 3 }), /validation_zero_sd/);
  assert.ok(E.fTest({ sd: 3, n: 10 }, { sd: 1, n: 10 }, { tail: 'upper' }).reject);
  assert.ok(E.fTest({ sd: 1, n: 10 }, { sd: 3, n: 10 }, { tail: 'lower' }).reject);
});

test('F-taqsimot: CDF + yuqori dum = 1; kritik qiymat ↔ dum ehtimoli', () => {
  for (const [x, a, b] of [[0.5, 3, 7], [2.2, 10, 4], [9.59, 2, 12]]) near(E.fCdf(x, a, b) + E.fUpperTail(x, a, b), 1, 1e-14, `F(${a}, ${b})`);
  near(E.fUpperTail(E.fCritical(0.05, 2, 12), 2, 12), 0.05, 1e-12, 'F_α');
  assert.ok(Number.isNaN(E.fCritical(0, 2, 12)));
});

/* ── Cochran (UNVERIFIED) ── */
test('Cochran C: statistika, belgilash (o\'chirmaydi), natijada har doim unverified topilma; teng bo\'lmagan guruh — xato', () => {
  const v = E.evaluate({ format: 'uc-validation/1', tests: [{ id: 'c', type: 'cochran', groups: [[1, 2, 3], [1, 1.1, 1.2], [2, 2.5, 2.2], [3, 3.3, 3.1]] }] });
  const t = v.tests[0];
  near(t.C, 1 / (1 + 0.01 + 0.0633333333333333 + 0.0233333333333333), 1e-12, 'C = s²max/Σs²');
  assert.equal(t.flaggedIndex, 0);
  assert.ok(v.findings.some(f => f.code === 'cochran_unverified' && f.unverified));
  assert.ok(v.findings.some(f => f.code === 'cochran_flagged'));
  assert.equal(E.evaluate({ format: 'uc-validation/1', tests: [{ type: 'cochran', groups: [[1, 2, 3], [1, 2]] }] }).tests[0].error, 'validation_unbalanced');
});

test('[unverified] Cochran kritik qiymati — Monte-Karlo bilan mustaqil tekshiruv (p = 4, n = 3, α = 0,05)', { todo: 'ISO 5725-2 jadvali repoda yo\'q — majburiy emas' }, () => {
  // Normal guruhlar uchun P(C > C_crit) ≈ α bo'lishi kerak (formula — yuqori chegara, Bonferroni: α/p)
  let s = 20261119;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return (s + 0.5) / 2147483648; };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd());
  const crit = E.cochranCritical(4, 3, 0.05);
  let hit = 0; const M = 40000;
  for (let m = 0; m < M; m++) {
    const vars = [0, 1, 2, 3].map(() => { const x = [gauss(), gauss(), gauss()]; const mu = (x[0] + x[1] + x[2]) / 3; return x.reduce((a, v) => a + (v - mu) ** 2, 0) / 2; });
    if (Math.max(...vars) / vars.reduce((a, b) => a + b) > crit) hit++;
  }
  near(hit / M, 0.05, 0.006, 'P(C > C_crit)');
});

/* ── Recovery (P09 QUAM funksiyasi) va chiziqlilik (P08) — qayta yozilmagan ── */
test('recovery va linearity — mavjud dvigatel chaqiriladi (natija P09 / P08 bilan bir xil)', () => {
  const vals = [95, 98, 97, 96, 99, 96];
  const v = E.evaluate({ format: 'uc-validation/1', tests: [{ id: 'r', type: 'recovery', values: vals }, { id: 'l', type: 'linearity', points: [{ x: 1, y: 2.1 }, { x: 2, y: 3.9 }, { x: 3, y: 6.2 }, { x: 4, y: 7.8 }] }] });
  const ref = E.evaluateRecovery({ values: vals }, E.makeContext({ relative: true }, '%'));
  for (const k of ['Rm', 's', 'n', 'uRm', 't', 'tCrit', 'significant', 'u']) assert.equal(v.tests[0][k], ref[k], k);
  const rg = E.evaluate({ format: 'uc-regression/1', method: 'OLS', model: { degree: 1 }, points: [{ x: 1, y: 2.1 }, { x: 2, y: 3.9 }, { x: 3, y: 6.2 }, { x: 4, y: 7.8 }] });
  assert.deepEqual(v.tests[1].params, rg.params);
  assert.deepEqual(v.tests[1].residuals, rg.residuals);
});

/* ── LOD / LOQ (UNVERIFIED) ── */
test('LOD/LOQ (blank): LOD = 3·s′₀, LOQ = k_Q·s′₀ (k_Q = 10), blank tuzatmasi — formulalar (manba bilan solishtirilmagan)', () => {
  const vals = [0.10, 0.12, 0.09, 0.11, 0.10, 0.13, 0.08];
  const m = vals.reduce((a, b) => a + b) / vals.length, s = Math.sqrt(vals.reduce((a, v) => a + (v - m) ** 2, 0) / (vals.length - 1));
  const r = E.lodFromBlank({ values: vals });
  near(r.lod, 3 * s, 1e-15, 'LOD'); near(r.loq, 10 * s, 1e-15, 'LOQ');
  const c = E.lodFromBlank({ values: vals, replicates: 2, blankCorrection: true, blankReplicates: 4, kQ: 6 });
  near(c.s0Prime, s * Math.sqrt(1 / 2 + 1 / 4), 1e-15, "s′₀");
  near(c.loq, 6 * c.s0Prime, 1e-15, 'LOQ (k_Q = 6)');
  assert.throws(() => E.lodFromBlank({ values: vals, blankCorrection: true }), /validation_bad_data/);
  const cal = E.lodFromCalibration({ points: [{ x: 0, y: 0.01 }, { x: 1, y: 1.02 }, { x: 2, y: 1.97 }, { x: 3, y: 3.05 }] });
  near(cal.lod, 3.3 * cal.syx / cal.slope, 1e-15, 'LOD (kalibrlash)');
  const v = E.evaluate({ format: 'uc-validation/1', tests: [{ type: 'lod', values: vals }, { type: 'lod', method: 'calibration', points: [{ x: 0, y: 0 }, { x: 1, y: 1.1 }, { x: 2, y: 1.9 }] }] });
  assert.ok(v.findings.some(f => f.code === 'lod_unverified') && v.findings.some(f => f.code === 'lod_calibration_unverified'));
});

test('[unverified] LOD/LOQ — Eurachem Fitness for Purpose (2014) misoli', { todo: 'docs/references/Eurachem_Fitness_for_Purpose_2014.pdf — egasi qo\'shadi' }, () => {
  assert.fail('manba repoda yo\'q');
});

test('uc-validation/1: bitta test xatosi qolganlarini to\'xtatmaydi; noma\'lum test turi; mehmon yozuvi — info', () => {
  const v = E.evaluate({ format: 'uc-validation/1', savedBy: 'guest', tests: [{ id: 'x', type: 'nope' }, { id: 'g', type: 'grubbs', values: URANIUM }] });
  assert.equal(v.tests[0].error, 'validation_bad_test');
  assert.ok(v.tests[1].G > 0);
  assert.equal(v.errors, 1);
  assert.ok(v.findings.some(f => f.code === 'validation_unauthenticated'));
  assert.equal(E.evaluate({ format: 'uc-validation/1', tests: [] }).error, 'validation_bad_spec');
  assert.equal(v.engineVersion, E.ENGINE_VERSION);
});

/* ── ν(s_I) — Welch–Satterthwaite (JCGM 100:2008 G.4.1; egasi qarori 2026-11-19, R-26 #7 — loyiha qarori) ── */
test('ν(s_I): NIST 7.4.3 misolida ν ≈ 3,90 (Welch–Satterthwaite); s_b² < 0 da s_I = s_r, ν = N − k', () => {
  const r = E.oneWayAnova(RESISTORS);
  const a = r.ms.between / 5, b = (1 - 1 / 5) * r.ms.within;
  near(r.sI ** 2, a + b, 1e-12, 's_I² = MS_b/n₀ + (1 − 1/n₀)·MS_w');
  near(r.nu.sI, (a + b) ** 2 / (a * a / 2 + b * b / 12), 1e-12, 'ν formula');
  near(r.nu.sI, 3.90, 5e-3, 'ν(s_I) ≈ 3,90 (egasi bergan nazorat qiymati)');
  assert.equal(r.nuSIRule, 'welch_satterthwaite');
  const neg = E.oneWayAnova([[1, 2, 3], [1.1, 2.1, 3.1], [1, 2, 3.2]]);
  assert.ok(neg.sb2 < 0);
  assert.equal(neg.sI, neg.sr);
  assert.equal(neg.nu.sI, neg.df.within);
  assert.equal(neg.nuSIRule, 'negative_component');
});

test('top-down stated: ν berilsa — o\'sha ν (n o\'rniga); berilmasa — avvalgidek n − 1; ν ≤ 0 — xato', () => {
  const base = { format: 'uc-topdown/1', approach: 'NORDTEST', scale: { relative: true }, relativeUnit: '%', rw: { components: [{ type: 'stated', id: 's', s: 2, n: 10, relative: true }] } };
  const old = E.evaluate(base);
  assert.equal(old.rw.components[0].nu, 9);
  const withNu = E.evaluate({ ...base, rw: { components: [{ type: 'stated', id: 's', s: 2, n: 10, nu: 3.9029, relative: true }] } });
  assert.equal(withNu.rw.components[0].nu, 3.9029);
  assert.equal(withNu.uc, old.uc);
  assert.equal(E.evaluate({ ...base, rw: { components: [{ type: 'stated', id: 's', s: 2, nu: 0, relative: true }] } }).error, 'topdown_bad_data');
});
