/* P12: PT ballari (src/engine/pt/) — mustaqil qo'lda hisob (formulalar sodda; ISO 13528 / Eurachem PT Guide repoda yo'q —
   Eurachem PT Guide 2021 qo'shilgach undagi misollar majburiy test bo'ladi). Chegaralar — loyiha standarti (R-26 #1).
   PT tarixi → top-down: mavjud P09 dvigateli (Nordtest TR 537 §6.2) chaqiriladi, formula qayta yozilmagan. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/engine/index.js');
const near = (a, e, tol, msg) => assert.ok(Math.abs(a - e) <= tol, `${msg}: ${a} ≠ ${e} ± ${tol}`);

test('ballar — qo\'lda hisob: x = 10,6; x_pt = 10,0; σ_pt = 0,25; u(x) = 0,15; u(x_pt) = 0,05; U(x) = 0,30; U(x_pt) = 0,10', () => {
  const s = E.ptScores({ x: 10.6, xpt: 10.0, sigmaPt: 0.25, ux: 0.15, uxpt: 0.05, Ux: 0.30, Uxpt: 0.10 });
  near(s.scores.z, 0.6 / 0.25, 1e-12, 'z = 2,4');
  near(s.scores.zPrime, 0.6 / Math.sqrt(0.0625 + 0.0025), 1e-12, "z′ = 0,6/√0,065 = 2,3534");
  near(s.scores.zeta, 0.6 / Math.sqrt(0.0225 + 0.0025), 1e-12, 'ζ = 0,6/√0,025 = 3,7947');
  near(s.scores.En, 0.6 / Math.sqrt(0.09 + 0.01), 1e-12, 'E_n = 0,6/√0,1 = 1,8974');
  assert.deepEqual(s.verdicts, { z: 'questionable', zPrime: 'questionable', zeta: 'unsatisfactory', En: 'unsatisfactory' });
  assert.equal(s.uxptRatio, 0.2);
});

test('mavjud bo\'lmagan ball — null + sabab kodi; ball avtomatik almashtirilmaydi', () => {
  const s = E.ptScores({ x: 5, xpt: 4.8, Ux: 0.2 });
  assert.deepEqual(s.scores, { z: null, zPrime: null, zeta: null, En: null });
  assert.deepEqual(s.reasons, { z: 'pt_need_sigma', zPrime: 'pt_need_sigma', zeta: 'pt_need_ux', En: 'pt_need_Uxpt' });
  assert.equal(E.evaluate({ format: 'uc-pt/1', rounds: [{ x: 5, xpt: 4.8, Ux: 0.2 }] }).error, 'pt_no_score');
  const only = E.ptScores({ x: 5, xpt: 4.8, sigmaPt: 0.1 });
  assert.equal(only.reasons.zPrime, 'pt_need_uxpt');
  assert.equal(only.reasons.zeta, 'pt_need_ux');
});

test('chegaralar (R-26 #1): |z| = 2 va |E_n| = 1 — qoniqarli; 3 — qoniqarsiz; ikkilik xato chegarani o\'zgartirmaydi', () => {
  assert.deepEqual(E.PT_LIMITS, { warn: 2, action: 3, en: 1 });
  assert.equal(E.verdictOf(2, 'z'), 'satisfactory');
  assert.equal(E.verdictOf(-2, 'zeta'), 'satisfactory');
  assert.equal(E.verdictOf(2.01, 'z'), 'questionable');
  assert.equal(E.verdictOf(2.999, 'zPrime'), 'questionable');
  assert.equal(E.verdictOf(3, 'z'), 'unsatisfactory');
  assert.equal(E.verdictOf(1, 'En'), 'satisfactory');
  assert.equal(E.verdictOf(1.0001, 'En'), 'unsatisfactory');
  // (10,4 − 10)/0,2 = 2,0000000000000018 ikkilik arifmetikada — matematik jihatdan 2: qoniqarli
  const s = E.ptScores({ x: 10.4, xpt: 10, sigmaPt: 0.2 });
  assert.ok(s.scores.z > 2);
  assert.equal(s.verdicts.z, 'satisfactory');
});

test('xatolar: σ_pt ≤ 0, U ≤ 0, birliklar mos emas — jimgina tuzatilmaydi; birlik konvertatsiyasi', () => {
  assert.equal(E.evaluate({ format: 'uc-pt/1', rounds: [{ x: 1, xpt: 1, sigmaPt: 0 }] }).error, 'pt_sigma_nonpositive');
  assert.equal(E.evaluate({ format: 'uc-pt/1', rounds: [{ x: 1, xpt: 1, sigmaPt: -1 }] }).error, 'pt_sigma_nonpositive');
  assert.equal(E.evaluate({ format: 'uc-pt/1', rounds: [{ x: 1, xpt: 1, Ux: 0, Uxpt: 0.1 }] }).error, 'pt_u_nonpositive');
  assert.equal(E.evaluate({ format: 'uc-pt/1', rounds: [{ x: { value: 1, unit: 'kg' }, xpt: 1, sigmaPt: 0.1, unit: 'mg/L' }] }).error, 'pt_unit_mismatch');
  assert.equal(E.evaluate({ format: 'uc-pt/1', rounds: [{ x: 'abc', xpt: 1, sigmaPt: 0.1 }] }).error, 'pt_bad_data');
  assert.equal(E.evaluate({ format: 'uc-pt/1', rounds: [] }).error, 'pt_bad_spec');
  // µg/L → mg/L
  const r = E.evaluate({ format: 'uc-pt/1', rounds: [{ x: { value: 10200, unit: 'µg/L' }, xpt: 10, sigmaPt: { value: 400, unit: 'µg/L' }, unit: 'mg/L' }] });
  near(r.rounds[0].x, 10.2, 1e-12, 'x (mg/L)');
  near(r.rounds[0].score, 0.5, 1e-12, 'z');
  // °C: farq birligi (σ) offsetsiz
  const t = E.ptScores({ x: { value: 293.65, unit: 'K' }, xpt: 20, sigmaPt: { value: 0.25, unit: 'K' }, unit: '°C' });
  near(t.scores.z, 2, 1e-9, 'z (K → °C)');
});

test('u(x_pt) > 0,3·σ_pt — info pt_uxpt_large (z′ tavsiya), asosiy ball o\'zgarmaydi; tarix, hisoblagichlar, mehmon', () => {
  const r = E.evaluate({ format: 'uc-pt/1', savedBy: 'guest', quantity: 'Pb', rounds: [
    { id: 'PT-1', date: '2026-01-10', x: 10.5, xpt: 10, sigmaPt: 0.5, uxpt: 0.2 },
    { id: 'PT-2', date: '2026-04-10', x: 9.0, xpt: 10, sigmaPt: 0.4 },
    { id: 'PT-3', date: '2026-07-10', x: 10.1, xpt: 10, Ux: 0.3, Uxpt: 0.2 },
  ] });
  assert.equal(r.mode, 'PT');
  assert.deepEqual(r.rounds.map(x => x.primary), ['z', 'z', 'En']);
  assert.deepEqual(r.rounds.map(x => x.verdict), ['satisfactory', 'questionable', 'satisfactory']);
  assert.deepEqual(r.counts, { satisfactory: 2, questionable: 1, unsatisfactory: 0 });
  const codes = r.findings.map(f => f.code);
  for (const c of ['pt_uxpt_large', 'pt_questionable', 'pt_limits_unverified', 'pt_unauthenticated']) assert.ok(codes.includes(c), c);
  assert.ok(r.findings.every(f => ['error', 'warning', 'info'].includes(f.severity)));
  // primary: 'zPrime' tanlansa — ishlatiladi; mavjud bo'lmasa — xato
  const p = E.evaluate({ format: 'uc-pt/1', rounds: [{ x: 10.5, xpt: 10, sigmaPt: 0.5, uxpt: 0.2, primary: 'zPrime' }] });
  assert.equal(p.rounds[0].primary, 'zPrime');
  assert.ok(!p.findings.some(f => f.code === 'pt_uxpt_large'));
  assert.equal(E.evaluate({ format: 'uc-pt/1', rounds: [{ x: 10.5, xpt: 10, sigmaPt: 0.5, primary: 'zeta' }] }).error, 'pt_no_score');
});

test('PT tarixi → top-down u(bias): mavjud dvigatel (Nordtest TR 537 §6.2), MIN_PT_ROUNDS = 6', () => {
  const rounds = [[10.2, 10, 0.1], [9.8, 10, 0.12], [20.5, 20, 0.2], [19.6, 20, 0.15], [5.1, 5, 0.05], [4.95, 5, 0.06]]
    .map(([x, xpt, uxpt], i) => ({ id: `R${i + 1}`, x, xpt, uxpt, sigmaPt: 0.5, unit: 'mg/L' }));
  const pt = E.evaluate({ format: 'uc-pt/1', rounds });
  const { bias, missingUref } = E.ptToTopDownBias(pt);
  assert.deepEqual(missingUref, []);
  assert.equal(E.MIN_PT_ROUNDS, 6);
  const r = E.evaluateBias(bias, E.makeContext({ unit: 'mg/L' }));
  const rms = Math.sqrt(rounds.reduce((a, q) => a + (q.x - q.xpt) ** 2, 0) / 6);
  near(r.rms, rms, 1e-12, 'RMS_bias');
  near(r.uRef, rounds.reduce((a, q) => a + q.uxpt, 0) / 6, 1e-12, 'u(C_ref)');
  near(r.u, Math.hypot(r.rms, r.uRef), 1e-12, 'u(bias)');
  // u(x_pt) yo'q, faqat U(x_pt) → U/2
  const b2 = E.ptToTopDownBias(E.evaluate({ format: 'uc-pt/1', rounds: [{ id: 'A', x: 1.1, xpt: 1, Ux: 0.1, Uxpt: 0.2 }] }));
  assert.deepEqual(b2.bias.rounds[0], { id: 'A', assigned: 1, result: 1.1, U: 0.2, k: 2 });
});
