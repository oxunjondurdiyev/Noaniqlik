/* P18: tibbiy laboratoriya (src/engine/medical/) — ISO/TS 20914:2019 (E) etalon misollari G1…G11.
   Kutilgan qiymatlar: tests/fixtures/iso20914/G*.json (band havolasi bilan; standart PDF'i repoda YO'Q — pullik).
   Tolerans — oxirgi ko'rsatilgan xonaning ½ birligi (har bir qatorda `tol`). Qiymat yoki toleransni "o'tsin" deb
   o'zgartirish TAQIQLANADI: mos kelmasa — farq (kutilgan / olingan / nisbiy farq) yoziladi va egasidan so'raladi.
   `knownDiscrepancies` — manbaning oraliq yaxlitlashi tufayli ½ birlikdan oshgan qatorlar (tests/cases/DISCREPANCIES.md D-23):
   ular majburiy tenglik sifatida tekshirilmaydi, lekin farq oxirgi xonaning 1 birligidan oshmasligi qayd etiladi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../../src/engine/index.js');

const DIR = path.join(__dirname, '../fixtures/iso20914');
const IDS = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11'];
const load = id => JSON.parse(fs.readFileSync(path.join(DIR, id + '.json'), 'utf8'));
const at = (o, p) => p.split('.').reduce((a, key) => (a === null || a === undefined ? undefined : a[key]), o);
const codes = r => r.warnings.map(w => w.code);

function check(id, r, rows, label) {
  for (const row of rows || []) {
    const got = at(r, row.path) * (row.factor || 1);
    const d = Math.abs(got - row.value);
    assert.ok(Number.isFinite(got) && d <= row.tol,
      `${id} ${label} ${row.factor ? row.factor + '·' : ''}${row.path}: kutilgan ${row.value} ± ${row.tol}, olingan ${got}, nisbiy farq ${(d / Math.abs(row.value)).toExponential(2)}`);
  }
}
function run(id, c) {
  const r = E.evaluate(c.input);
  assert.equal(r.error, undefined, `${id}: ${r.error} ${r.detail || ''}`);
  assert.equal(r.mode, 'MEDICAL');
  check(id, r, c.expected, 'yaxlitlanmagan');
  check(id, r, c.expectedStd, 'standartdagi');
  for (const [p, v] of Object.entries(c.equals || {})) assert.equal(at(r, p), v, `${id} ${p}`);
  for (const w of (c.warnings || {}).include || []) assert.ok(codes(r).includes(w), `${id}: ${w} kutilgan`);
  for (const w of (c.warnings || {}).exclude || []) assert.ok(!codes(r).includes(w), `${id}: ${w} chiqmasligi kerak`);
  return r;
}

test('etalon fayllar: G1…G11 to\'liq, manba va band ko\'rsatilgan, har bir qatorda tolerans', () => {
  assert.deepEqual(fs.readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort(), [...IDS].sort());
  for (const id of IDS) {
    const c = load(id);
    assert.equal(c.id, id); assert.equal(c.source, 'ISO/TS 20914:2019'); assert.equal(c.source, E.MEDICAL_SOURCE);
    assert.ok(c.clause && c.input && c.expected.length && c.tolerance, id);
    for (const row of [...c.expected, ...(c.expectedStd || []), ...(c.knownDiscrepancies || [])]) assert.ok(row.path && Number.isFinite(row.value) && row.tol > 0, `${id} ${row.path}`);
  }
});

for (const id of IDS) {
  const c = load(id);
  test(`${id} — ISO/TS 20914:2019 ${c.clause}: ${c.title}`, () => {
    const r = run(id, c);
    assert.ok(!codes(r).includes('medical_unverified') && r.unverified === undefined && r.approachRef === 'ISO/TS 20914:2019');
    for (const x of c.extra || []) run(`${id} (${x.name})`, x);
    for (const row of c.knownDiscrepancies || []) {
      const got = at(r, row.path), d = Math.abs(got - row.value);
      assert.ok(d > row.tol, `${id} ${row.path}: farq yo'qolgan (${got}) — knownDiscrepancies dan olib, expected ga ko'chiring`);
      assert.ok(d <= 2 * row.tol, `${id} ${row.path}: ${row.id} farqi kattalashgan — kutilgan ${row.value}, olingan ${got}`);
    }
  });
}

test('G1: natijalar yaxlitlanmagan; u_Rw, u_cal ulushlari 100 % ni beradi', () => {
  const r = E.evaluate(load('G1').input);
  assert.equal(r.levels[0].u.abs, Math.sqrt(0.85 ** 2 + 0.71 ** 2));
  for (const L of r.levels) assert.ok(Math.abs(L.budget.reduce((a, b) => a + b.share, 0) - 100) < 1e-9);
  assert.deepEqual(codes(r), []);
});

test('daraja tanlash: oraliq bo\'yicha (A.2.3) — eng yaqin o\'rtacha EMAS; chegaralar [low; high)', () => {
  const c = load('G2');
  const ev = y => E.evaluate({ ...c.input, measurement: { value: y } });
  assert.equal(ev(60).appliedLevel, 'L3');                    // eng yaqin o'rtacha L2 (21,4) bo'lardi
  assert.equal(ev(9.999).appliedLevel, 'L1');
  assert.equal(ev(10).appliedLevel, 'L2');                    // quyi chegara kiradi
  assert.equal(ev(50).appliedLevel, 'L3');                    // yuqori chegara kirmaydi
  assert.equal(ev(60).relU, ev(60).levels[2].U.rel);
  assert.equal(ev(60).absU, 60 * ev(60).levels[2].U.rel / 100);
  // oraliq berilmagan: eng yaqin o'rtacha + ogohlantirish (loyiha qoidasi)
  const noIv = E.evaluate({ ...c.input, levels: c.input.levels.map(({ interval, ...L }) => L) });
  assert.equal(noIv.appliedLevel, 'L2'); assert.equal(noIv.levelSelection, 'nearest');
  assert.ok(codes(noIv).includes('medical_level_by_nearest'));
});

test('oraliq xatolari: bo\'shliq → medical_interval_gap; kesishish → medical_interval_overlap', () => {
  const lv = (a, b) => ({ format: 'uc-medical/1', unit: 'u', precisionType: 'repeatability', levels: [{ id: 'A', mean: 5, sd: 0.1, interval: a }, { id: 'B', mean: 50, sd: 1, interval: b }] });
  assert.equal(E.evaluate({ ...lv({ high: 10 }, { low: 20 }), measurement: { value: 15 } }).error, 'medical_interval_gap');
  assert.equal(E.evaluate(lv({ high: 10 }, { low: 20 })).error, undefined);                         // o'lchash bo'lmasa bo'shliq xato emas
  assert.equal(E.evaluate(lv({ high: 20 }, { low: 10 })).error, 'medical_interval_overlap');
  assert.equal(E.evaluate(lv({ high: 10, highInclusive: true }, { low: 10 })).error, 'medical_interval_overlap');
  assert.equal(E.evaluate(lv({ high: 10 }, { low: 10 })).error, undefined);                         // [.., 10) va [10, ..) — tutash
  assert.equal(E.evaluate(lv({ low: 10, high: 5 }, { low: 20 })).error, 'medical_bad_data');
});

test('aniqlik turi: uzoq muddatli — u_cal yo\'q bo\'lsa medical_no_calibrator; takrorlanuvchanlik — medical_repeatability_only (info)', () => {
  const s = { format: 'uc-medical/1', unit: 'u', levels: [{ mean: 5, sd: 0.1, n: 30 }] };
  assert.deepEqual(codes(E.evaluate(s)), ['medical_no_calibrator']);
  const r = E.evaluate({ ...s, precisionType: 'repeatability' });
  assert.deepEqual(codes(r), ['medical_repeatability_only']);
  assert.equal(r.warnings[0].severity, 'info');
  assert.equal(E.evaluate({ ...s, precisionType: 'x' }).error, 'medical_bad_data');
});

test('pooled u_Rw: vaznsiz (A.8) va df bo\'yicha vaznli (A.3.1 muqobil); n nisbati > 2 → medical_unbalanced_lots', () => {
  const lots = [{ n: 10, mean: 5, sd: 0.2 }, { n: 40, mean: 5.2, sd: 0.4 }];
  const s = w => ({ format: 'uc-medical/1', unit: 'u', precisionType: 'repeatability', levels: [{ lots }], settings: { poolWeighting: w } });
  const a = E.evaluate(s('none')), b = E.evaluate(s('df'));
  assert.equal(a.levels[0].uRw.abs, Math.sqrt((0.2 * 0.2 + 0.4 * 0.4) / 2));
  assert.equal(b.levels[0].uRw.abs, Math.sqrt((9 * 0.2 * 0.2 + 39 * 0.4 * 0.4) / 48));
  assert.equal(a.levels[0].mean, 5.1); assert.equal(a.levels[0].n, 50);
  assert.ok(codes(a).includes('medical_unbalanced_lots') && !codes(b).includes('medical_unbalanced_lots'));
  assert.equal(b.poolWeighting, 'df'); assert.equal(b.levels[0].pooled.weighting, 'df');
  assert.equal(E.evaluate({ ...s('df'), levels: [{ lots: [{ mean: 5, sd: 0.2 }, { mean: 5, sd: 0.3 }] }] }).error, 'medical_bad_data');   // df uchun n kerak
  assert.equal(E.evaluate({ ...s('none'), levels: [{ lots: [{ mean: 5, sd: 0.2 }] }] }).error, 'medical_too_few');
  // lot ichida xom qiymatlar
  const v = E.evaluate({ ...s('none'), levels: [{ lots: [{ values: [9, 10, 11] }, { values: [10, 12, 14] }] }] });
  assert.equal(v.levels[0].uRw.abs, Math.sqrt((1 + 4) / 2)); assert.equal(v.levels[0].mean, 11);
});

test('davrlar (A.7): u = √(Σ(u_cal² + u_Rw,i²)/m) = √(u_cal² + Σu_Rw,i²/m)', () => {
  const r = E.evaluate(load('G7').input);
  const L = r.levels[0];
  assert.ok(Math.abs(L.u.abs - Math.hypot(0.038, L.uRw.abs)) < 1e-15);
  assert.equal(L.pooled.items.length, 3);
  assert.equal(L.pooled.items[0].u, Math.sqrt(0.038 ** 2 + 0.105 ** 2));
});

test('bias (C.5): apply — u_bias qo\'shiladi; apply emas + ahamiyatli — ogohlantirish; u_ref yo\'q — medical_bias_incomplete; proporsional — nisbiy', () => {
  const c = load('G9');
  const off = E.evaluate({ ...c.input, bias: { ...c.input.bias, apply: false } });
  assert.equal(off.levels[0].uBias, null);
  assert.equal(off.levels[0].u.abs, Math.sqrt(0.85 ** 2 + 0.63 ** 2));
  assert.ok(codes(off).includes('medical_bias_significant_not_applied'));
  assert.ok(!codes(E.evaluate(c.input)).includes('medical_bias_significant_not_applied'));
  const { URef, kRef, ...noRef } = c.input.bias;
  const inc = E.evaluate({ ...c.input, bias: noRef });
  assert.ok(codes(inc).includes('medical_bias_incomplete'));
  assert.equal(inc.bias.uBias, 0.65 / Math.sqrt(10)); assert.equal(inc.bias.uRef, null);
  // ahamiyatsiz bias: ogohlantirish yo'q
  const ns = E.evaluate({ ...c.input, bias: { ...c.input.bias, xLab: 141.9, apply: false } });
  assert.equal(ns.bias.significant, false); assert.ok(!codes(ns).includes('medical_bias_significant_not_applied'));
  // proporsional: u_bias nisbiy birlikda (x_ref ga nisbatan), har bir daraja o'rtachasiga qo'llanadi
  const p = E.evaluate({ ...c.input, bias: { ...c.input.bias, mode: 'proportional' }, levels: [{ mean: 100, sd: 0.85 }] });
  assert.equal(p.levels[0].uBias.rel, 100 * p.bias.uBias / 141.8);
  assert.equal(p.levels[0].uBias.abs, 100 * p.levels[0].uBias.rel / 100);
  // tayyor u_bias bilan birga berib bo'lmaydi
  assert.equal(E.evaluate({ ...c.input, uBias: { value: 0.1, unit: 'mmol/l' } }).error, 'medical_bad_data');
  assert.equal(E.biasFromCrm(c.input.bias).UBias, 2 * E.biasFromCrm(c.input.bias).uBias);
});

test('log₁₀ (A.10): nisbiy % chiqarilmaydi; o\'lchangan natija — mutlaq U va asimmetrik interval; nisbiy kirish — xato', () => {
  const c = load('G11');
  const r = E.evaluate({ ...c.input, levels: c.input.levels.map((L, i) => ({ ...L, interval: [{ high: 3 }, { low: 3, high: 4 }, { low: 4 }][i] })), measurement: { value: 3.5 } });
  assert.equal(r.scale, 'log10'); assert.equal(r.appliedLevel, 'L2');
  assert.equal(r.relU, null); assert.equal(r.absU, 0.32);
  assert.deepEqual(r.coverage, { low: 3.5 - 0.32, high: 3.5 + 0.32, backLow: 10 ** (3.5 - 0.32), backHigh: 10 ** (3.5 + 0.32) });
  assert.equal(r.levels[0].u.rel, null); assert.equal(r.levels[0].logRel, 100 * 0.12 / 2.66);
  assert.equal(E.evaluate({ ...c.input, uCal: { value: 1, relative: true } }).error, 'medical_mixed_scale');
  assert.equal(E.evaluate({ ...c.input, allowable: { U_rel: 5 } }).error, 'medical_mixed_scale');
});

test('ruxsat etilgan noaniqlik (§5.2): fitForPurpose va zaxira; bittadan ortiq mezon — xato', () => {
  const c = load('G1');
  const r = E.evaluate({ ...c.input, allowable: { U_rel: 2 } });
  assert.deepEqual(r.levels.map(L => L.fitForPurpose), [true, true, false]);
  assert.equal(r.levels[2].allowableMargin, 2 - r.levels[2].U.rel);
  assert.deepEqual(r.allowable, { kind: 'U_rel', value: 2 });
  assert.equal(r.decision, undefined);                                         // muvofiqlik bayonoti EMAS
  assert.equal(E.evaluate({ ...c.input, allowable: { U_rel: 2, u_abs: 1 } }).error, 'medical_bad_data');
  assert.equal(E.evaluate({ ...c.input, allowable: {} }).error, 'medical_bad_data');
});

test('sanoq (§6.10): u = √count; byudjetga faqat apply: true bo\'lsa kiradi', () => {
  const s = { format: 'uc-medical/1', unit: 'u', precisionType: 'repeatability', levels: [{ mean: 200, sd: 4 }] };
  const a = E.evaluate({ ...s, counting: { count: 400 } });
  assert.deepEqual(a.counting, { count: 400, u: 20, rel: 5, apply: false });
  assert.equal(a.levels[0].uCount, null); assert.equal(a.levels[0].u.abs, 4);
  const b = E.evaluate({ ...s, counting: { count: 400, apply: true } });
  assert.equal(b.levels[0].uCount.abs, 10); assert.equal(b.levels[0].u.abs, Math.sqrt(16 + 100));
  assert.equal(E.evaluate({ ...s, counting: { count: 0 } }).error, 'medical_bad_data');
});
