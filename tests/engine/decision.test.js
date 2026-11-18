/* P05b: qaror qoidasi va muvofiqlik (src/engine/decision.js).
   Kutilgan qiymatlar FAQAT manbadan: JCGM 106:2012 (docs/references/JCGM_106_2012_conformity.pdf) va
   ILAC G8:09/2019 (docs/references/ILAC_G8_09_2019.pdf) — bet raqami bilan. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/engine/index.js');

const near = (a, b, tol) => Math.abs(a - b) <= tol;

test('JCGM 106:2012 §7.3.3 Example 1 (p. 15): Zener diod, yuqori chegara −5,40 V → z = 1,40; p_c = 0,92', () => {
  const pc = E.conformanceProbability(-5.47, 0.05, null, -5.40);
  assert.ok(near((-5.40 - (-5.47)) / 0.05, 1.40, 1e-12));
  assert.equal(pc.toFixed(2), '0.92');
  const d = E.decide({ value: -5.47, u: 0.05, U: 0.10, upper: -5.40, lower: null, rule: 'simple' });
  assert.deepEqual([d.type, d.verdict, d.w, d.acceptUpper, d.tur], ['upper', 'pass', 0, -5.40, null]);
  assert.equal(d.pc, pc);
  assert.equal(d.specificRisk.toFixed(2), '0.08');             // qabul qilingan buyum: 1 − p_c (§9.3.2)
  assert.equal(d.riskKind, 'consumer');
});

test('JCGM 106:2012 §7.3.3 Example 2 (p. 15): idish mustahkamligi, pastki chegara 490 kPa → z = 2,3; p_c = 0,99', () => {
  assert.ok(near((509.7 - 490) / 8.6, 2.3, 0.01));
  assert.equal(E.conformanceProbability(509.7, 8.6, 490, null).toFixed(2), '0.99');
  const d = E.decide({ value: 509.7, u: 8.6, U: 17.2, lower: 490, upper: null, rule: 'guard_band', r: 1 });
  assert.deepEqual([d.type, d.acceptLower, d.verdict], ['lower', 490 + 17.2, 'pass']);
});

test('JCGM 106:2012 §7.4 Example (p. 16): motor moyi, [12,5; 16,3] mm²/s, y = 13,6, u = 1,8 → p_c = 0,66', () => {
  const d = E.decide({ value: 13.6, u: 1.8, U: 3.6, lower: 12.5, upper: 16.3, rule: 'simple' });
  assert.equal(d.pc.toFixed(2), '0.66');
  assert.equal(E.normalCdf(1.5).toFixed(2), '0.93');           // manbadagi oraliq qiymatlar
  assert.equal(E.normalCdf(-0.6).toFixed(2), '0.27');
  assert.deepEqual([d.type, d.verdict, d.tolerance], ['two_sided', 'pass', 16.3 - 12.5]);
  assert.equal(d.pNonConf.toFixed(2), '0.34');
  // C_m = T/(4u) (Eq. 12, p. 17)
  assert.ok(near(d.cm, 3.8 / (4 * 1.8), 1e-12));
});

test('JCGM 106:2012 Table 1 (p. 15): bir tomonlama chegara — p_c va z', () => {
  for (const [pc, z] of [[0.80, 0.84], [0.90, 1.28], [0.95, 1.64], [0.99, 2.33], [0.999, 3.09]]) {
    // y = 0, u = 1, yuqori chegara z → p_c = Φ(z); jadvaldagi z ikki xonagacha yaxlitlangan
    assert.ok(near(E.conformanceProbability(0, 1, null, z), pc, pc >= 0.99 ? 6e-4 : 2e-3), `${pc} / ${z}`);
    assert.ok(near(E.conformanceProbability(0, 1, -z, null), pc, pc >= 0.99 ? 6e-4 : 2e-3));   // pastki chegara: z = (y − T_L)/u
  }
});

test('JCGM 106:2012 §8.3.2.3 Example (p. 22): w = U = 2u → qabul chegarasida noto\'g\'ri qabul ehtimoli ko\'pi bilan 2,3 %', () => {
  const d = E.decide({ value: 0, u: 1, U: 2, lower: -10, upper: 10, rule: 'guard_band', r: 1 });
  assert.deepEqual([d.w, d.acceptLower, d.acceptUpper], [2, -8, 8]);
  assert.equal((d.maxFalseAccept * 100).toFixed(1), '2.3');
  // chegaradan uzoqda xavf kichikroq
  assert.ok(d.specificRisk < d.maxFalseAccept);
});

test('ILAC G8:09/2019 Table 1 (p. 12): w = r·U uchun bitta o\'lchov xavfi — 3U < 1 ppm; 1,5U < 0,16 %; 1U < 2,5 %; 0,83U < 5 %; 0 < 50 %', () => {
  const pfa = r => E.decide({ value: 0, u: 1, U: 2, upper: 100, lower: null, rule: r === 0 ? 'simple' : 'guard_band', r }).maxFalseAccept;
  assert.ok(pfa(3) < 1e-6);
  assert.ok(pfa(1.5) < 0.0016 && pfa(1.5) > 0.001);
  assert.ok(pfa(1) < 0.025 && pfa(1) > 0.02);
  assert.ok(pfa(0.83) < 0.05 && pfa(0.83) > 0.04);
  assert.ok(Math.abs(pfa(0) - 0.5) < 1e-12);                   // "< 50 % PFA": chegaraning o'zida aynan 50 %
  assert.deepEqual(E.GUARD_PRESETS.map(p => p.r), [0, 0.83, 1, 1.5, 3]);
  // "Uncritical: −U" — himoyalangan rad etish: chegaradan U gacha oshgan natija ham qabul qilinadi; PFR < 2,5 %
  const g = E.decide({ value: 101.5, u: 1, U: 2, upper: 100, lower: null, rule: 'guard_band', r: -1 });
  assert.deepEqual([g.w, g.acceptUpper, g.verdict], [-2, 102, 'pass']);
  const atLimit = E.decide({ value: 102.0001, u: 1, U: 2, upper: 100, lower: null, rule: 'guard_band', r: -1 });
  assert.equal(atLimit.verdict, 'fail');
  assert.ok(atLimit.specificRisk < 0.025);                      // rad etilgan buyum muvofiq bo'lishi ehtimoli (PFR)
});

test('ILAC G8:09/2019 §4.2.1–4.2.3 (pp. 9–10): binar va binar bo\'lmagan bayonot (w = U)', () => {
  const at = (value, statement) => E.decide({ value, u: 0.5, U: 1, upper: 10, lower: null, rule: 'guard_band', r: 1, statement }).verdict;
  // binar: AL = TL − w = 9
  assert.deepEqual([8.9, 9.0, 9.1, 10.5, 11.5].map(v => at(v, 'binary')), ['pass', 'pass', 'fail', 'fail', 'fail']);
  // binar bo'lmagan: pass | [TL − w, TL] conditional pass | [TL, TL + w] conditional fail | fail
  assert.deepEqual([8.9, 9.5, 10.0, 10.5, 11.0, 11.1].map(v => at(v, 'non_binary')), ['pass', 'conditional_pass', 'conditional_pass', 'conditional_fail', 'conditional_fail', 'fail']);
  // oddiy qabul (w = 0): AL = TL
  const s = v => E.decide({ value: v, u: 0.5, U: 1, upper: 10, lower: null, rule: 'simple' }).verdict;
  assert.deepEqual([9.99, 10, 10.01].map(s), ['pass', 'pass', 'fail']);
  // ikki tomonlama, simmetrik
  const two = v => E.decide({ value: v, u: 0.5, U: 1, lower: -10, upper: 10, rule: 'guard_band', r: 1, statement: 'non_binary' }).verdict;
  assert.deepEqual([-11.5, -10.5, -9.5, 0, 9.5, 10.5, 11.5].map(two), ['fail', 'conditional_fail', 'conditional_pass', 'pass', 'conditional_pass', 'conditional_fail', 'fail']);
});

test('TUR = MPE/U (ILAC G8 §1.13; JCGM 106 §7.6.5: C_m = E_max/U, k = 2)', () => {
  const d = E.decide({ value: 0.1, u: 0.05, U: 0.1, lower: -0.4, upper: 0.4, rule: 'simple' });
  assert.ok(near(d.tur, 4, 1e-12));                             // MPE = 0,4; U = 0,1 → 4:1
  assert.ok(near(d.cm, 4, 1e-12));                              // k = 2 da C_m = TUR
  const k252 = E.decide({ value: 0.1, u: 0.05, U: 0.126, lower: -0.4, upper: 0.4, rule: 'simple' });
  assert.ok(near(k252.tur, 0.4 / 0.126, 1e-12) && near(k252.cm, 4, 1e-12));
});

test('xatolar: chegara yo\'q, qoida yo\'q, noto\'g\'ri chegaralar, himoya zonasi tolerantlikdan keng', () => {
  const base = { value: 0, u: 1, U: 2 };
  assert.equal(E.decide({ ...base, rule: 'simple' }).error, 'decision_need_limit');
  assert.equal(E.decide({ ...base, upper: 5 }).error, 'decision_need_rule');
  assert.equal(E.decide({ ...base, upper: 5, rule: 'accept_all' }).error, 'decision_need_rule');
  assert.equal(E.decide({ ...base, lower: 5, upper: 5, rule: 'simple' }).error, 'decision_bad_limits');
  assert.equal(E.decide({ ...base, lower: 5, upper: -5, rule: 'simple' }).error, 'decision_bad_limits');
  assert.equal(E.decide({ ...base, lower: -1, upper: 1, rule: 'guard_band', r: 1 }).error, 'decision_guard_exceeds');   // 2w = 4 > T = 2
  assert.equal(E.decide({ value: NaN, u: 1, U: 2, upper: 1, rule: 'simple' }).error, 'decision_bad_data');
  assert.equal(E.decide({ ...base, upper: 5, rule: 'simple', statement: 'maybe' }).error, 'decision_bad_data');
  assert.ok(Number.isNaN(E.conformanceProbability(0, 1, null, null)));
  // u = 0: ehtimol 0 yoki 1 (nolga bo'lish yo'q)
  assert.deepEqual([E.conformanceProbability(1, 0, 0, 2), E.conformanceProbability(3, 0, 0, 2)], [1, 0]);
});

/* ── evaluate() bilan ── */
const GAS2 = require('../cases/excel/excel-gas-p2.json').modelSpec;
const withSettings = (spec, patch) => { const s = JSON.parse(JSON.stringify(spec)); Object.assign(s.state.settings, patch); return s; };

test('evaluate(): qaror qoidasi berilmagan → bayonot yo\'q (decision.pending = "rule") + topilma; berilgan → natija; y, u_c, U, conf o\'zgarmaydi', () => {
  const plain = E.evaluate(GAS2);
  assert.deepEqual([plain.decision.pending, plain.decision.verdict], ['rule', undefined]);
  assert.ok(plain.findings.some(f => f.code === 'decision_rule_missing' && f.severity === 'warning' && f.rule === 'D1'));
  const r = E.evaluate(withSettings(GAS2, { decisionRule: 'guard_band', guardR: 1, agreement: 'Shartnoma № 15' }));
  const d = r.decision;
  assert.deepEqual([d.pending, d.rule, d.r, d.verdict, d.type, d.agreement], [null, 'guard_band', 1, 'pass', 'two_sided', 'Shartnoma № 15']);
  assert.equal(d.upper, r.conf.mpe); assert.equal(d.lower, -r.conf.mpe);       // model turi 'error': ±MPE
  assert.equal(d.value, r.y); assert.equal(d.u, r.uc); assert.equal(d.U, r.U);
  assert.equal(d.w, r.U);
  assert.equal(d.tur, r.conf.mpe / r.U);
  assert.equal(1 / r.conf.ratio, d.tur);
  assert.ok(!r.findings.some(f => /^decision_(rule_missing|no_agreement)/.test(f.code)));
  // hisob natijasi qaror qoidasiga bog'liq emas
  for (const k of ['y', 'uc', 'nuEff', 'k', 'U']) assert.equal(r[k], plain[k], k);
  assert.deepEqual(r.conf, plain.conf);
  // w = U himoyalangan qabul — P00 dagi conf.guarded bilan bir xil hukm
  assert.equal(d.verdict === 'pass', r.conf.guarded === 'ok');
  // kelishuv raqami yo'q → info; ν_eff kichik → normal faraz eslatmasi
  const noAgr = E.evaluate(withSettings(GAS2, { decisionRule: 'simple' }));
  assert.equal(noAgr.findings.find(f => f.code === 'decision_no_agreement').severity, 'info');
  assert.ok(noAgr.nuEff < 30 && noAgr.findings.some(f => f.code === 'decision_normal_assumed'));
  // r sozlanadi: 0,83
  assert.ok(near(E.evaluate(withSettings(GAS2, { decisionRule: 'guard_band', guardR: '0,83' })).decision.w, 0.83 * r.U, 1e-15));
});

test('evaluate(): model turi ko\'rsatilmagan → pending "model_kind"; "value" + nominal → [nominal ± MPE]; aniq chegaralar; bir tomonlama', () => {
  assert.equal(E.evaluate(withSettings(GAS2, { modelKind: 'unknown', decisionRule: 'simple' })).decision.pending, 'model_kind');
  const val = p => E.evaluate({ params: ['Y'], measurements: { Y: [100.4, 100.4, 100.5, 100.3, 100.4, 100.4] }, model: { formula: '' },
    settings: { modelKind: 'value', decisionRule: 'simple', ...p }, typeB: [{ name: 'Rezolyutsiya', param: 'Y', halfWidth: 0.1, distribution: 'resol' }] });
  const a = val({ mpe: 0.5, nominal: 100 }).decision;
  assert.deepEqual([a.lower, a.upper, a.verdict], [99.5, 100.5, 'pass']);
  assert.equal(val({ mpe: 0.5 }).decision.pending, 'nominal');
  const b = val({ tolLower: 99, tolUpper: '100,2' }).decision;                 // aniq chegaralar (o'nlik vergul)
  assert.deepEqual([b.lower, b.upper, b.verdict, b.type], [99, 100.2, 'fail', 'two_sided']);
  const c = val({ tolUpper: 101 }).decision;
  assert.deepEqual([c.type, c.lower, c.upper, c.verdict, c.tur], ['upper', null, 101, 'pass', null]);
  assert.equal(val({ tolLower: 101 }).decision.verdict, 'fail');
  assert.equal(val({}).decision.pending, 'limit');                              // qoida bor, chegara yo'q
  assert.equal(E.evaluate({ params: ['Y'], measurements: { Y: [1, 1.1, 0.9] }, model: { formula: '' }, settings: { modelKind: 'value' }, typeB: [] }).decision, null);
  // himoya zonasi tolerantlikdan keng → error topilma
  const bad = val({ tolLower: 100.39, tolUpper: 100.41, decisionRule: 'guard_band', guardR: 3 });
  assert.equal(bad.decision.error, 'decision_guard_exceeds');
  assert.ok(bad.findings.some(f => f.code === 'decision_invalid' && f.severity === 'error'));
  // TUR < 1
  const low = val({ mpe: 0.01, nominal: 100.4 });
  assert.ok(low.decision.tur < 1 && low.findings.some(f => f.code === 'decision_low_tur' && f.severity === 'warning'));
  // Egasi qarori (2026-11-18): 1 ≤ TUR < 4 → info (4:1 — amaliyot, unverified); TUR ≥ 4 — topilma yo'q
  const U = low.U;
  const mid = val({ mpe: 2 * U, nominal: 100.4 });
  assert.ok(mid.decision.tur >= 1 && mid.decision.tur < 4);
  const fm = mid.findings.find(f => f.code === 'decision_tur_below_4');
  assert.ok(fm && fm.severity === 'info' && fm.unverified === true && /unverified/.test(fm.ref));
  assert.ok(!mid.findings.some(f => f.code === 'decision_low_tur'));
  const high = val({ mpe: 5 * U, nominal: 100.4 });
  assert.ok(high.decision.tur >= 4 && !high.findings.some(f => /tur/.test(f.code)));
});

test('decisionPreset: shablon / laboratoriya qoidasi faqat TAKLIF — sozlamaga yozilmaguncha bayonot yo\'q (egasi qarori 2026-11-18)', () => {
  assert.deepEqual(E.decisionPreset({ lab: 'simple' }), { rule: 'simple', r: 0, source: 'lab' });
  assert.deepEqual(E.decisionPreset({ lab: 'guarded' }), { rule: 'guard_band', r: 1, source: 'lab' });
  assert.deepEqual(E.decisionPreset({ lab: 'simple', template: { type: 'guarded', required: true } }), { rule: 'guard_band', r: 1, source: 'template' });
  assert.deepEqual(E.decisionPreset({ lab: 'guarded', template: { type: 'one_sided_lower', limit: '99,5' } }), { rule: 'guard_band', r: 1, source: 'template', tolLower: 99.5 });
  assert.deepEqual(E.decisionPreset({ lab: 'simple', template: { type: 'one_sided_upper', limit: null } }), { rule: 'simple', r: 0, source: 'template' });
  assert.deepEqual(E.decisionPreset({ lab: 'simple', template: { type: 'none' } }), { rule: 'simple', r: 0, source: 'lab' });
  assert.equal(E.decisionPreset({}), null); assert.equal(E.decisionPreset(null), null);
  assert.equal(E.decisionPreset({ lab: '__proto__', template: { type: 'constructor' } }), null);
  // taklif dvigatelga ta'sir qilmaydi: decisionRule bo'sh → pending 'rule'
  const r = E.evaluate({ params: ['E'], measurements: { E: [0.1, 0.12, 0.11] }, model: { formula: '' }, typeB: [], settings: { modelKind: 'error', mpe: 0.5 } });
  assert.equal(r.decision.pending, 'rule');
});

test('9 ta etalon nuqta: qaror qoidasi tanlanmagan — bayonot berilmaydi; y, u_c, ν_eff, k, U Excel bilan (run-cases testi) o\'zgarmagan', () => {
  for (const id of ['excel-density', 'excel-gas-p1', 'excel-gas-p2', 'excel-gas-p3', 'excel-term-p1', 'excel-term-p2', 'excel-term-p3', 'excel-term-p4', 'excel-term-p5']) {
    const r = E.evaluate(require(`../cases/excel/${id}.json`).modelSpec);
    assert.ok(r.decision === null || r.decision.pending === 'rule', id);
    assert.ok(!r.findings.some(f => f.severity === 'error'), id);
  }
});
