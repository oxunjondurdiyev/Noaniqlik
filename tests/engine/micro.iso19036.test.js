/* P17: ISO 19036:2019 etalon misollari — tests/fixtures/iso19036/F*.json (qiymatlar standartdan, egasi bergan; standart matni repoda yo'q).
   Tolerans — har bir kutilgan qiymatdagi `tol` (manbadagi oxirgi xona birligining yarmi); "o'tkazish uchun" O'ZGARTIRILMAYDI.
   Ma'lum farqlar (knownDiscrepancies → tests/cases/DISCREPANCIES.md D-23…D-25) va kutilayotgan F2 — `todo` (egasi qarorigacha).
   Yaxlitlash (egasi qarori 2026-11-20): M8 da U — half_up (ISO 19036 §9.1), 'up' — sozlama; boshqa rejimlar o'zgarmagan. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../../src/engine/index.js');
const { roundResult } = require('../../src/report/rounding.js');

const DIR = path.join(__dirname, '../fixtures/iso19036');
const FX = Object.fromEntries(fs.readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => { const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); return [j.id, j]; }));
const IDS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F5b', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11'];

/** Table 1 qatori [d1, C1, d2, C2] → portsiya { x, sumCounts } */
const portionOf = ([d, c1, , c2]) => ({ x: Math.pow(10, d) * (c1 + c2) / 1.1, sumCounts: c1 + c2 });
function specOf(f) {
  const s = JSON.parse(JSON.stringify(f.input));
  if (s.technical && s.technical.pairs === '@table1') s.technical.pairs = f.table1.map(pair => pair.map(portionOf));
  if (s.result && s.result.loq === '@10/1.1') s.result.loq = 10 / 1.1;
  return s;
}
const GET = {
  sumSq: r => 2 * r.technical.ss,                 // Σ(y_A − y_B)² = 2·Σ_i Σ_j (y_ij − ȳ_i)² (juftliklar)
  sIR: r => r.technical.sRaw, msWithin: r => r.technical.sRaw ** 2, df: r => r.dfTech,
  sUnwanted: r => r.technical.corrected.S, nPortions: r => r.technical.corrected.N, u2Unwanted: r => r.technical.corrected.u2Unwanted,
  s2Corr: r => r.technical.corrected.s2Corr, sIRcorr: r => r.uTech,
  uPoisson: r => r.uPoisson, uConf: r => r.uConf, uMPN: r => r.uMPN, uc: r => r.uc, U: r => r.U, y: r => r.y, x: r => r.value,
  poissonRatio: r => r.uPoisson / r.uTech,
  xLOQ: r => r.loq.x, yLOQ: r => r.loq.y, yUpper: r => r.loq.yUpper, xUpper: r => r.loq.xUpper,
};
const check = (id, key, got, e) => assert.ok(Math.abs(got - e.value) <= e.tol * (1 + 1e-9), `${id}.${key}: olingan ${got}, kutilgan ${e.value} ± ${e.tol} (nisbiy farq ${e.value ? Math.abs(got - e.value) / Math.abs(e.value) : '—'})`);

test('fixture fayllari: F1–F11 (+ F5b) bor; har birida id, source, clause, expected / tolerans', () => {
  assert.deepEqual(Object.keys(FX).sort(), [...IDS].sort());
  for (const id of IDS) {
    const f = FX[id];
    assert.match(f.source, id === 'F5b' ? /hisob/ : /^ISO 19036:2019$/, id);
    assert.ok(f.clause && f.title, id);
    for (const e of Object.values(f.expected || {})) assert.ok(typeof e.value === 'number' && e.tol >= 0, id);
  }
  // standart matni / PDF repoda yo'q (mualliflik huquqi) — faqat raqamli qiymatlar
  assert.deepEqual(fs.readdirSync(DIR).filter(f => !f.endsWith('.json')), []);
});

for (const id of ['F1', 'F3', 'F4', 'F5', 'F5b', 'F6', 'F8', 'F10', 'F11']) {
  const f = FX[id];
  test(`${id} — ${f.clause}: ${f.title}`, async t => {
    const r = E.evaluate(specOf(f));
    assert.equal(r.error, undefined, JSON.stringify(r));
    assert.equal(r.approachRef, 'ISO 19036:2019');
    for (const [key, e] of Object.entries(f.expected)) {
      const kd = (f.knownDiscrepancies || {})[key];
      if (kd) await t.test(`${key} — ma'lum farq ${kd} (DISCREPANCIES.md)`, { todo: `${kd}: egasi qarori kutilmoqda` }, () => check(id, key, GET[key](r), e));
      else check(id, key, GET[key](r), e);
    }
    if (f.ignored) assert.deepEqual(r.ignored, f.ignored);
    if (f.statement) assert.equal(r.approach, f.statement);
    for (const [mode, exp] of Object.entries((f.report && { half_up: f.report.half_up, up: f.report.up }) || {})) {
      if (!exp) continue;
      const rr = roundResult(r.y, r.U, mode === 'up');
      assert.equal(rr.Uround.toFixed(rr.digits), exp.U, `${id}: U (${mode})`);
    }
  });
}

test('F2 — Annex A, Table A.2: xom ma\'lumot kutilmoqda (kirish o\'ylab topilmaydi)', { todo: 'egasi Table A.2 ning 26 ta qiymatini beradi' }, () => {
  const f = FX.F2;
  assert.equal(f.status, undefined, f.pendingReason);
  const r = E.evaluate(specOf(f));
  for (const [key, e] of Object.entries(f.expected)) check('F2', key, GET[key](r), e);
});

test('Annex A, Formula (A.1): juftliklarda Formula (1) bilan aynan teng; df = Σ(p_i − 1); n = 1 da oddiy s', () => {
  const pairs = FX.F1.table1.map(p => p.map(q => portionOf(q).x));
  const a = E.logPooledSd(pairs);
  assert.ok(Math.abs(a.s - E.logDuplicateSd(pairs)) < 1e-15);
  assert.deepEqual([a.df, a.n, a.N], [10, 10, 20]);
  const viaGroups = E.evaluate({ format: 'uc-micro/1', result: { value: 1e5, sumCounts: 110 }, technical: { groups: pairs } });
  assert.equal(viaGroups.uTech, a.s); assert.equal(viaGroups.technical.kind, 'groups');
  // F2 tuzilmasi (portsiyalar 3,2,4,2,2,2,3,2,4,2): df = 16, N = 26 — qiymatlar ixtiyoriy (faqat erkinlik darajalari tekshiriladi)
  const shape = FX.F2.portions.map((p, i) => Array.from({ length: p }, (_, j) => 100 * (i + 1) + j));
  const s = E.logPooledSd(shape);
  assert.deepEqual([s.df, s.N, s.n], [16, 26, 10]);
  // bitta guruh: oddiy standart og'ish (n − 1)
  const y = [100, 200, 400].map(Math.log10), m = y.reduce((p, c) => p + c) / 3;
  assert.ok(Math.abs(E.logPooledSd([[100, 200, 400]]).s - Math.sqrt(y.reduce((p, c) => p + (c - m) ** 2, 0) / 2)) < 1e-15);
});

test('F7 — §7.3, Table 3: u_conf (CONF_LN10 = 2,303 — standartdagi yozuv)', async t => {
  assert.equal(E.CONF_LN10, 2.303);
  for (const row of FX.F7.table3) {
    const run = () => check('F7', `(${row.np}, ${row.nc})`, E.uConfOf(row.np, row.nc), { value: row.uConf, tol: FX.F7.tol });
    if (row.knownDiscrepancy) await t.test(`(${row.np}, ${row.nc}) — ma'lum farq ${row.knownDiscrepancy}`, { todo: `${row.knownDiscrepancy}: egasi qarori kutilmoqda` }, run);
    else run();
  }
  assert.equal(E.uConfOf(5, 0), E.uConfOf(5, 1));           // n_c = 0 → n_c = 1
});

test('F9 — Annex C, Formula (C.1), Table C.1: u_MPN; Σx = 0 → eng katta aliquotda bitta musbat', () => {
  const f = FX.F9, r = E.uMpnOf(f.input.mu, f.input.aliquots);
  check('F9', 'sum', r.sum, f.expected.sum); check('F9', 'uMPN', r.u, f.expected.uMPN);
  const viaSpec = E.evaluate({ format: 'uc-micro/1', method: 'mpn', result: { value: 170, mpn: f.input }, technical: { s: 0.2 } });
  assert.equal(viaSpec.uMPN, r.u); assert.equal(viaSpec.uPoisson, null);
  const zero = E.uMpnOf(1.7, [{ m: 1, x: 0 }, { m: 0.1, x: 0 }]);
  assert.equal(zero.assumed, true);
  assert.equal(zero.u, E.uMpnOf(1.7, [{ m: 1, x: 1 }, { m: 0.1, x: 0 }]).u);
});

test('F10 — §9.2: ΣC = 0 xato emas; belowLOQ, pastki chegara 0; x_LOQ kiritilmasa — micro_need_loq', () => {
  const r = E.evaluate(specOf(FX.F10));
  assert.equal(r.belowLOQ, true); assert.equal(r.interval.low, 0); assert.equal(r.loq.xLower, 0);
  assert.equal(r.uPoisson, E.LOG10_E);
  assert.ok(r.warnings.some(w => w.code === 'micro_below_loq'));
  assert.equal(E.evaluate({ format: 'uc-micro/1', result: { value: 0, sumCounts: 0 }, technical: { s: 0.15 } }).error, 'micro_need_loq');
  // n_c = 0 (tasdiqlash) ham LOQ dan past
  const c = E.evaluate({ format: 'uc-micro/1', method: 'count_confirm', result: { value: 1e5, sumCounts: 110, loq: 2e4, confirm: { np: 5, nc: 0 } }, technical: { s: 0.15 } });
  assert.equal(c.belowLOQ, true); assert.equal(c.uConf, E.uConfOf(5, 1)); assert.equal(c.y, Math.log10(2e4));
});

test('§8.1.2: rejimga mos hadlar; 1/5 qoidasi standart holatda o\'chiq; tashlangan had byudjetda `ignored` bilan qoladi', () => {
  const base = { format: 'uc-micro/1', result: { value: 1e5, sumCounts: 110, confirm: { np: 5, nc: 4 }, mpn: { u: 0.19 } }, technical: { s: 0.25 }, matrix: { u: 0.1 } };
  const ids = m => E.evaluate({ ...base, method: m }).budget.map(b => b.id);
  assert.deepEqual(ids('count'), ['technical', 'matrix', 'poisson']);
  assert.deepEqual(ids('count_confirm'), ['technical', 'matrix', 'poisson', 'confirm']);
  assert.deepEqual(ids('mpn'), ['technical', 'matrix', 'mpn']);
  assert.deepEqual(ids('instrumental'), ['technical', 'matrix']);
  const off = E.evaluate(base), on = E.evaluate({ ...base, settings: { ignoreNegligible: true } });
  assert.equal(off.ignoreNegligible, false); assert.deepEqual(off.ignored, []);
  const p = on.budget.find(b => b.id === 'poisson');
  assert.deepEqual([p.ignored, p.share], [true, 0]); assert.ok(p.u > 0);
  assert.ok(on.uc < off.uc);
  assert.ok(on.warnings.some(w => w.code === 'micro_negligible_ignored'));
  // texnik had hech qachon tashlanmaydi
  const t = E.evaluate({ ...base, technical: { s: 0.01 }, matrix: { u: 0.5 }, settings: { ignoreNegligible: true } });
  assert.equal(t.budget.find(b => b.id === 'technical').ignored, false);
});

test('§6: u_matrix — tayyor | bir jinsli suyuqlik 0,1 (§6.2) | guruhlardan s_r (§6.3, sxema sharti ogohlantirishi)', () => {
  const base = { format: 'uc-micro/1', result: { value: 1e5, sumCounts: 110 }, technical: { s: 0.15 } };
  assert.equal(E.evaluate({ ...base, matrix: { preset: 'homogeneous_liquid' } }).uMatrix, 0.1);
  assert.equal(E.evaluate({ ...base, matrix: { preset: 'x' } }).error, 'micro_bad_data');
  const g = [[100, 120], [1000, 900], [50, 70]];
  const r = E.evaluate({ ...base, matrix: { groups: g } });
  assert.equal(r.uMatrix, E.logPooledSd(g).s);
  assert.ok(r.warnings.some(w => w.code === 'micro_matrix_design'));      // 6 portsiya < 3 + 10
  const ok = Array.from({ length: 10 }, (_, i) => [100 + i, 130 + i]);     // 20 portsiya ≥ 10 + 10
  assert.ok(!E.evaluate({ ...base, matrix: { groups: ok } }).warnings.some(w => w.code === 'micro_matrix_design'));
});

test('Annex D: manfiy tuzatilgan dispersiya → 0 + micro_corr_negative (jimgina emas); ΣC siz — xato; u_matrix guruhlarida u²_matrix ayirilmaydi', () => {
  const pair = (a, b) => [{ x: a, sumCounts: 40 }, { x: b, sumCounts: 40 }];
  const pairs = Array.from({ length: 10 }, () => pair(1000, 1001));
  const r = E.evaluate({ format: 'uc-micro/1', result: { value: 1e5, sumCounts: 110 }, technical: { pairs, correct: true }, matrix: { u: 0.1 } });
  assert.equal(r.uTech, 0); assert.ok(r.technical.corrected.s2Raw < 0);
  assert.ok(r.warnings.some(w => w.code === 'micro_corr_negative'));
  assert.equal(E.evaluate({ format: 'uc-micro/1', result: { value: 1e5, sumCounts: 110 }, technical: { pairs: [[100, 120]], correct: true } }).error, 'micro_corr_need_counts');
  const groups = Array.from({ length: 10 }, (_, i) => [{ x: 100 + 9 * i, sumCounts: 100 }, { x: 300 - 7 * i, sumCounts: 100 }]);
  const m = E.evaluate({ format: 'uc-micro/1', result: { value: 1e5, sumCounts: 110 }, technical: { s: 0.15 }, matrix: { groups, correct: true } });
  assert.ok(Math.abs(m.matrix.corrected.u2Unwanted - E.LOG10_E ** 2 / 100) < 1e-15);
});

test('§5.2.2.3: n < 10 → micro_few_pairs; qabul qilish filtrlari faqat ogohlantiradi (hech narsa o\'chirilmaydi)', () => {
  const pairs = [[{ x: 100, sumCounts: 12, maxPlate: 320 }, { x: 120, sumCounts: 50, confirm: { np: 5, nc: 2 } }], [{ x: 10, mpnPositives: 3 }, 12]];
  const r = E.evaluate({ format: 'uc-micro/1', result: { value: 1e5, sumCounts: 110 }, technical: { pairs } });
  const f = r.warnings.find(w => w.code === 'micro_data_filter');
  assert.match(f.value, /ΣC < 30: 1; > 300: 1; n_c < n_p\/2: 1; Σx < 5: 1/);
  assert.equal(r.nPairs, 2); assert.equal(r.uTech, E.logDuplicateSd([[100, 120], [10, 12]]));
  assert.ok(r.warnings.some(w => w.code === 'micro_few_pairs'));
});

test('§8.2: k = 2 standart; boshqa k — faqat sozlama orqali va micro_k_custom; §8.1.3: REPRO_ONLY da s_R majburiy, boshqa had yo\'q', () => {
  const base = { format: 'uc-micro/1', result: { value: 1e5, sumCounts: 110 }, technical: { s: 0.15 } };
  assert.equal(E.evaluate(base).k, 2);
  assert.ok(!E.evaluate(base).warnings.some(w => w.code === 'micro_k_custom'));
  assert.ok(E.evaluate({ ...base, settings: { k: 3 } }).warnings.some(w => w.code === 'micro_k_custom'));
  const ro = E.evaluate({ ...specOf(FX.F11), matrix: { u: 0.3 } });
  assert.deepEqual(ro.budget.map(b => b.id), ['technical']); assert.equal(ro.uc, 0.25);
  assert.equal(E.evaluate({ format: 'uc-micro/1', approach: 'REPRO_ONLY', result: { value: 1e5 } }).error, 'micro_bad_data');
});

test('yaxlitlash (egasi qarori 2026-11-20): M8 — half_up standart, `up` sozlama; 10 darajasidan o\'tganda 2 qiymatli raqam; dvigatel yaxlitlamaydi', () => {
  const r = E.evaluate(specOf(FX.F6));
  assert.deepEqual([r.rounding, r.roundUp], ['half_up', false]);
  const up = E.evaluate({ ...specOf(FX.F6), settings: { rounding: 'up' } });
  assert.deepEqual([up.rounding, up.roundUp], ['up', true]);
  assert.equal(up.U, r.U); assert.notEqual(r.U, 0.41);                    // xom qiymat yaxlitlanmagan
  const h = roundResult(0, 0.0999, false); assert.equal(h.Uround.toFixed(h.digits), '0.10');
  const y = roundResult(-0.125, 0.014, false); assert.equal(y.yround.toFixed(y.digits), '-0.125');
  assert.equal(roundResult(-0.125, 0.14, false).yround, -0.13);          // y — round half away from zero (loyiha qoidasi)
  // modul holati: barcha fixture'lar o'tmaguncha BETA (F2, D-23…D-25 ochiq)
  assert.equal(E.MICRO_UNVERIFIED, true); assert.equal(r.unverified, true);
});
