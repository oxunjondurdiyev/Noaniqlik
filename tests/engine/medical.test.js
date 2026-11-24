/* P18: M9 (tibbiy laboratoriya) — analitik testlar: qo'llanish oralig'i, aniqlik turi, birlashtirish variantlari, bias, log₁₀, §5.2.
   Manba misollari (ISO/TS 20914:2019 Annex A, C) — tests/engine/medical.iso20914.test.js. Bu yerdagi qiymatlar qo'lda hisoblangan. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/engine/index.js');

const near = (a, b, tol = 1e-12) => assert.ok(Math.abs(a - b) <= tol, `natija ${a}, kutilgan ${b} ± ${tol}`);
const codes = r => r.warnings.map(w => w.code);
const ev = s => E.evaluate({ format: 'uc-medical/1', unit: 'mmol/l', ...s });
const L3 = [{ id: 'L1', mean: 2, sd: 0.1, interval: { high: 10 } }, { id: 'L2', mean: 20, sd: 0.5, interval: { low: 10, high: 50 } }, { id: 'L3', mean: 120, sd: 3, interval: { low: 50 } }];
const cal = { uCal: { value: 1, relative: true } };

test('qo\'llanish oralig\'i: [quyi; yuqori) — quyi chegara kiradi, yuqori kirmaydi; lowInclusive / highInclusive bilan boshqariladi', () => {
  const at = y => ev({ ...cal, levels: L3, measurement: { value: y } });
  assert.equal(at(9.999).appliedLevel, 'L1'); assert.equal(at(10).appliedLevel, 'L2'); assert.equal(at(50).appliedLevel, 'L3');
  assert.equal(at(60).appliedLevel, 'L3');                       // eng yaqin o'rtacha bo'yicha L2 bo'lar edi (|60 − 20| < |60 − 120|)
  assert.equal(at(60).levelRule, 'interval'); assert.ok(!codes(at(60)).includes('medical_level_by_nearest'));
  near(at(60).relU, at(60).levels[2].U.rel); near(at(60).absU, 60 * at(60).levels[2].U.rel / 100);
  assert.deepEqual(at(60).levels[0].interval, { low: null, high: 10, lowInclusive: true, highInclusive: false });
  const inc = ev({ ...cal, measurement: { value: 10 }, levels: [{ ...L3[0], interval: { high: 10, highInclusive: true } }, { ...L3[1], interval: { low: 10, high: 50, lowInclusive: false } }] });
  assert.equal(inc.appliedLevel, 'L1');
});

test('oraliq: kesishish va bo\'shliq — aniq xato; oraliq yo\'q — eng yaqin o\'rtacha + ogohlantirish (loyiha qoidasi)', () => {
  const two = (a, b, y) => ev({ ...cal, levels: [{ ...L3[0], interval: a }, { ...L3[1], interval: b }], ...(y === undefined ? {} : { measurement: { value: y } }) });
  assert.equal(two({ high: 12 }, { low: 10 }).error, 'medical_interval_overlap');
  assert.equal(two({ high: 10, highInclusive: true }, { low: 10 }).error, 'medical_interval_overlap');   // 10 ikkalasida
  assert.equal(two({ high: 10 }, { low: 10 }).error, undefined);
  assert.equal(two({ high: 8 }, { low: 10 }, 9).error, 'medical_interval_gap');
  assert.equal(two({ high: 8 }, { low: 10 }).error, undefined);          // natijasiz — bo'shliq xato emas
  assert.equal(two({ low: 5, high: 5 }, { low: 10 }).error, 'medical_bad_data');
  const near2 = ev({ ...cal, levels: L3.map(({ interval, ...x }) => x), measurement: { value: 60 } });
  assert.equal(near2.appliedLevel, 'L2'); assert.equal(near2.levelRule, 'nearest');
  assert.deepEqual(codes(near2), ['medical_level_by_nearest']);
  // bitta daraja — tanlov yo'q, ogohlantirish ham yo'q
  assert.deepEqual(codes(ev({ ...cal, levels: [{ mean: 5, sd: 0.1 }], measurement: { value: 6 } })), []);
});

test('aniqlik turi: repeatability — medical_no_calibrator o\'rniga medical_repeatability_only (info); noto\'g\'ri qiymat — xato', () => {
  const lt = ev({ levels: [{ mean: 5, sd: 0.1, n: 30 }] }), rp = ev({ precisionType: 'repeatability', levels: [{ mean: 5, sd: 0.1, n: 30 }] });
  assert.deepEqual(codes(lt), ['medical_no_calibrator']); assert.deepEqual(codes(rp), ['medical_repeatability_only']);
  assert.equal(rp.warnings[0].severity, 'info'); assert.equal(rp.precisionType, 'repeatability'); assert.equal(lt.precisionType, 'long_term');
  assert.equal(ev({ precisionType: 'daily', levels: [{ mean: 5, sd: 0.1 }] }).error, 'medical_bad_spec');
});

test('lotlar: vaznsiz √(Σu²/m) (standart); df — √(Σ(n−1)u²/Σ(n−1)) belgi bilan; n nisbati > 2 — medical_unbalanced_lots', () => {
  const lots = [{ mean: 10, sd: 0.3, n: 11 }, { mean: 12, sd: 0.4, n: 41 }];
  const a = ev({ ...cal, levels: [{ lots }] });
  near(a.levels[0].uRw.abs, Math.sqrt((0.09 + 0.16) / 2)); near(a.levels[0].mean, 11); assert.equal(a.levels[0].n, 52);
  assert.deepEqual(codes(a), ['medical_unbalanced_lots']);
  const b = ev({ ...cal, levels: [{ lots }], settings: { poolWeighting: 'df' } });
  near(b.levels[0].uRw.abs, Math.sqrt((10 * 0.09 + 40 * 0.16) / 50));
  assert.deepEqual(codes(b), ['medical_pool_df', 'medical_no_source_example']);
  assert.equal(ev({ ...cal, levels: [{ lots: [{ mean: 10, sd: 0.3 }, { mean: 12, sd: 0.4 }] }], settings: { poolWeighting: 'df' } }).error, 'medical_bad_data');
  assert.equal(ev({ ...cal, levels: [{ lots }], settings: { poolWeighting: 'x' } }).error, 'medical_bad_spec');
  assert.deepEqual(codes(ev({ ...cal, levels: [{ lots: [{ mean: 10, sd: 0.3, n: 20 }, { mean: 12, sd: 0.4, n: 40 }] }] })), []);   // nisbat = 2: chegara kirmaydi
  // lot kuzatuvlari qator sifatida ham berilishi mumkin
  near(ev({ ...cal, levels: [{ lots: [{ values: [9, 10, 11] }, { values: [11, 12, 13] }] }] }).levels[0].uRw.abs, 1);
  assert.equal(ev({ ...cal, levels: [{ lots, systems: lots }] }).error, 'medical_bad_spec');
});

test('tizimlar va davrlar: budjet ulushlari 100 %; davrlarda u_cal har bir davr ichida', () => {
  const s = ev({ ...cal, levels: [{ systems: [{ id: 'A', mean: 5, sd: 0.2 }, { id: 'B', mean: 5.4, sd: 0.2 }] }] });
  near(s.levels[0].uSystems.abs, Math.sqrt(0.08)); near(s.levels[0].uRwPooled.abs, 0.2); near(s.levels[0].uRw.abs, Math.sqrt(0.08 + 0.04));
  near(s.levels[0].budget.reduce((a, b) => a + b.share, 0), 100, 1e-9);
  assert.equal(ev({ ...cal, levels: [{ systems: [{ mean: 5, sd: 0.2 }] }] }).error, 'medical_too_few');
  const p = ev({ uCal: { value: 0.3, unit: 'mmol/l' }, levels: [{ mean: 10, periods: [{ uRw: 0.4 }, { sd: 0.4 }] }] });
  near(p.levels[0].u.abs, 0.5); near(p.levels[0].periods[0].u, 0.5);
  assert.equal(ev({ levels: [{ periods: [{ uRw: 0.4 }] }] }).error, 'medical_bad_data');     // davrlarda daraja o'rtachasi kerak
});

test('bias (C.5): apply — u_bias qo\'shiladi; apply yo\'q va ahamiyatli — ogohlantirish; u_ref yo\'q — medical_bias_incomplete', () => {
  const b = { xRef: 100, uRef: 0.3, xLab: 98, sd: 1.2, n: 9 };          // SD_mean = 0,4; u_bias = 0,5; |bias| = 2 > 1
  const off = ev({ ...cal, bias: b, levels: [{ mean: 100, sd: 1 }] });
  near(off.bias.uBias, 0.5); near(off.bias.bias, 2); near(off.bias.biasRel, 2); assert.equal(off.bias.significant, true);
  assert.equal(off.levels[0].uBias, null); near(off.levels[0].u.abs, Math.sqrt(2));
  assert.deepEqual(codes(off), ['medical_bias_significant_not_applied']);
  const on = ev({ ...cal, bias: { ...b, apply: true }, levels: [{ mean: 100, sd: 1 }, { mean: 200, sd: 1 }] });
  near(on.levels[0].u.abs, Math.sqrt(1 + 1 + 0.25)); near(on.levels[1].uBias.abs, 0.5); assert.deepEqual(codes(on), []);
  const insig = ev({ ...cal, bias: { ...b, xLab: 99.5 }, levels: [{ mean: 100, sd: 1 }] });
  assert.equal(insig.bias.significant, false); assert.deepEqual(codes(insig), []);
  const inc = ev({ ...cal, bias: { xRef: 100, xLab: 98, sd: 1.2, n: 9, apply: true }, levels: [{ mean: 100, sd: 1 }] });
  near(inc.bias.uBias, 0.4); assert.equal(inc.bias.uRef, null); assert.ok(codes(inc).includes('medical_bias_incomplete'));
  near(ev({ ...cal, bias: { ...b, uRef: undefined, URef: 0.9, kRef: 3 }, levels: [{ mean: 100, sd: 1 }] }).bias.uRef, 0.3);
  near(ev({ ...cal, bias: { ...b, uRef: undefined, URef: 0.6 }, levels: [{ mean: 100, sd: 1 }] }).bias.uRef, 0.3);             // k_ref = 2 (standart)
  assert.equal(ev({ ...cal, uBias: { value: 1, relative: true }, bias: b, levels: [{ mean: 100, sd: 1 }] }).error, 'medical_bad_spec');
  assert.equal(ev({ ...cal, bias: { ...b, n: 0 }, levels: [{ mean: 100, sd: 1 }] }).error, 'medical_bad_data');
});

test('bias: proporsional rejim — nisbiy birliklarda; manba misoli yo\'q → medical_no_source_example (tekshirilmagan)', () => {
  const r = ev({ ...cal, bias: { xRef: 100, uRef: 0.3, xLab: 98, sd: 1.2, n: 9, apply: true, mode: 'proportional' }, levels: [{ mean: 100, sd: 1 }, { mean: 400, sd: 1 }] });
  near(r.levels[0].uBias.rel, 0.5); near(r.levels[1].uBias.abs, 2);          // 0,5 % × 400
  assert.ok(codes(r).includes('medical_no_source_example'));
  assert.equal(ev({ ...cal, bias: { xRef: 100, xLab: 98, sd: 1, n: 9, mode: 'x' }, levels: [{ mean: 100, sd: 1 }] }).error, 'medical_bad_spec');
});

test('log₁₀ shkala (A.10): U mutlaq, nisbiy % yo\'q, interval asimmetrik; nisbiy kirish — medical_log_relative', () => {
  const lg = s => E.evaluate({ format: 'uc-medical/1', unit: 'log10 IU/ml', scale: 'log10', precisionType: 'repeatability', ...s });
  const r = lg({ levels: [{ mean: 3, sd: 0.1 }], measurement: { value: 3 } });
  near(r.absU, 0.2); assert.equal(r.relU, null); assert.equal(r.levels[0].U.rel, null); assert.equal(r.levels[0].cv, null);
  near(r.coverage.backLow, Math.pow(10, 2.8)); near(r.coverage.backHigh, Math.pow(10, 3.2));
  assert.ok(r.y - Math.log10(r.coverage.backLow) > 0 && r.coverage.backHigh - 1000 > 1000 - r.coverage.backLow);   // asimmetrik
  near(r.levels[0].logRel, 100 * 0.1 / 3);
  assert.equal(lg({ levels: [{ mean: 3, cv: 2 }] }).error, 'medical_log_relative');
  assert.equal(lg({ levels: [{ mean: 3, sd: 0.1 }], uCal: { value: 1, relative: true } }).error, 'medical_log_relative');
  assert.equal(lg({ levels: [{ mean: 3, sd: 0.1 }], allowable: { U_rel: 5 } }).error, 'medical_log_relative');
  assert.equal(lg({ levels: [{ mean: 0, sd: 0.1 }] }).error, undefined);     // log shkalada o'rtacha 0 bo'lishi mumkin
  assert.equal(E.evaluate({ format: 'uc-medical/1', unit: 'x', scale: 'ln', levels: [{ mean: 3, sd: 0.1 }] }).error, 'medical_bad_spec');
});

test('§5.2: ruxsat etilgan noaniqlik — fitForPurpose va farq; yaroqsiz — medical_not_fit; bitta kattalik beriladi', () => {
  const r = ev({ ...cal, allowable: { U_rel: 5 }, levels: [{ id: 'A', mean: 100, sd: 1 }, { id: 'B', mean: 100, sd: 3 }] });
  assert.equal(r.levels[0].fitForPurpose, true); near(r.levels[0].fit.margin, 5 - 2 * Math.sqrt(2));
  assert.equal(r.levels[1].fitForPurpose, false); assert.ok(codes(r).includes('medical_not_fit'));
  assert.equal(r.decision, undefined);                           // muvofiqlik bayonoti EMAS
  near(ev({ ...cal, allowable: { u_abs: 2 }, levels: [{ mean: 100, sd: 1 }] }).levels[0].fit.value, Math.sqrt(2));
  assert.equal(ev({ ...cal, allowable: { U_rel: 5, U_abs: 1 }, levels: [{ mean: 100, sd: 1 }] }).error, 'medical_bad_spec');
  assert.equal(ev({ ...cal, allowable: {}, levels: [{ mean: 100, sd: 1 }] }).error, 'medical_bad_spec');
});

test('sanoq (§6.10): u = √count — ixtiyoriy manba, manba misolisiz; kattalikdagi k — U ni u ga o\'tkazadi', () => {
  const r = ev({ ...cal, counting: { count: 400 }, levels: [{ mean: 1000, sd: 10 }] });
  near(r.counting.u, 20); near(r.levels[0].uCount.abs, 20); near(r.levels[0].u.abs, Math.sqrt(100 + 100 + 400));
  assert.ok(codes(r).includes('medical_no_source_example'));
  near(ev({ uCal: { value: 3, k: 2, relative: true }, levels: [{ mean: 100, sd: 2 }] }).levels[0].uCal.rel, 1.5);
});

test('yaxlitlash: standart half_up (ISO/TS 20914 §5.4 Option B, egasi qarori 23.11.2026); `up` — sozlama; hisobot qatlamida', () => {
  const { roundResult } = require('../../src/report/rounding.js');
  const a = ev({ ...cal, levels: [{ mean: 100, sd: 1 }], measurement: { value: 100 } });
  const b = ev({ ...cal, levels: [{ mean: 100, sd: 1 }], measurement: { value: 100 }, settings: { rounding: 'up' } });
  assert.deepEqual([a.rounding, a.roundUp, b.rounding, b.roundUp], ['half_up', false, 'up', true]);
  near(a.absU, 2 * Math.sqrt(2));                                // dvigatel yaxlitlamaydi: 2,828 427…
  assert.equal(roundResult(a.y, a.absU, a.roundUp).resultText, '100.0 ± 2.8');
  assert.equal(roundResult(b.y, b.absU, b.roundUp).resultText, '100.0 ± 2.9');
  // G1 (Table A.1): %U_rel 1,643 → 1,6; 1,499 → 1,5; 2,820 → 2,8
  assert.deepEqual([1.6432, 1.4992, 2.8202].map(u => roundResult(0, u, false).Uround), [1.6, 1.5, 2.8]);
});

test('har bir ogohlantirish va xato kodi jadvalda; W2 linter qoidasi orqali findings ga chiqadi', () => {
  const r = E.evaluate({ format: 'uc-medical/1', unit: 'mmol/l', precisionType: 'repeatability', levels: [{ mean: 5, sd: 0.1 }] });
  assert.ok(r.findings.some(f => f.code === 'medical_repeatability_only' && f.rule === 'W2' && f.severity === 'info'));
  for (const c of ['medical_interval_gap', 'medical_interval_overlap', 'medical_log_relative']) assert.ok(E.MEDICAL_ERRORS.includes(c));
  assert.equal(E.MEDICAL_WARNINGS.medical_unverified, undefined);
  for (const w of Object.values(E.MEDICAL_WARNINGS)) assert.ok(w.ref && w.severity);
});
