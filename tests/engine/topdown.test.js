/* P09: TOP_DOWN rejimi (src/engine/topdown/) — birlik testlari.
   Manba misollari (kutilgan qiymatlar sahifa havolasi bilan) — tests/cases/nordtest/*.json, tests/cases/quam/quam-a4-recovery.json,
   quam-a6-empirical.json (tests/run-cases.test.js). Bu yerda: manbadagi kichik misollar, X11 / X12 (ijobiy va salbiy),
   nisbiy/mutlaq aralashmasi → xato, formulalar va tozalik. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../../src/engine/index.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} natija ${a}, kutilgan ${b} ± ${tol}`);
const codes = r => r.warnings.map(w => w.code);
const REL = { relative: true };
const base = (extra = {}) => ({
  format: 'uc-topdown/1', approach: 'NORDTEST', scale: REL,
  rw: { components: [{ type: 'stated', s: 2.6, relative: true }] },
  bias: { type: 'crm', relative: true, items: [{ bias: 4.3, sBias: 2.6, n: 19, uRef: 1.2 }] },
  ...extra,
});

test('evaluate() uc-topdown/1 formatini evaluateTopDown ga uzatadi; natija yaxlitlanmagan', () => {
  const r = E.evaluate(base());
  assert.equal(r.mode, 'TOP_DOWN');
  assert.equal(r.format, 'uc-topdown/1');
  assert.equal(r.engineVersion, E.ENGINE_VERSION);
  assert.equal(r.approach, 'NORDTEST');
  assert.match(r.approachRef, /Nordtest TR 537/);
  assert.equal(r.k, 2);
  assert.equal(r.U, 2 * r.uc);
  assert.equal(r.uc, Math.sqrt(2.6 ** 2 + 4.3 ** 2 + 2.6 ** 2 / 19 + 1.2 ** 2)); // yaxlitlash yo'q
  assert.ok(E.FORMATS.includes('uc-topdown/1'));
  // P05a: evaluate() natijaga faqat `findings` ni qo'shadi (linter); qolgan maydonlar evaluateTopDown() bilan aynan bir xil
  const { findings, ...rest } = r;
  assert.deepEqual(E.evaluateTopDown(base()), rest);
  assert.ok(Array.isArray(findings));
});

test('byudjet: ulushlar yig\'indisi 100 %, har bir qatorda u va dispersiya', () => {
  const r = E.evaluate(base({ additional: [{ id: 'sampling', category: 'sampling', u: 1.0, relative: true }] }));
  near(r.budget.reduce((s, b) => s + b.share, 0), 100, 1e-9);
  assert.deepEqual(r.budget.map(b => b.kind), ['rw', 'bias', 'additional']);
  assert.equal(r.hybrid, true);
  near(r.uc2, r.budget.reduce((s, b) => s + b.variance, 0), 1e-12);
});

/* ── Nordtest TR 537 ed. 4: manbadagi kichik misollar ── */

test('Nordtest §6.1 (p. 20): bitta CRM — u(bias) = √(3,48² + (2,2/√12)² + 2,16²) = 4,1 %', () => {
  const ctx = E.makeContext(REL);
  const b = E.evaluateBias({ type: 'crm', relative: true, items: [{ bias: 3.48, sBias: 2.2, n: 12, uRef: 2.16 }] }, ctx);
  near(b.u, 4.1, 0.05);
  assert.equal(b.formula, 'single_crm');
});

test('Nordtest §6.1 (p. 20): xom qiymatlardan — sertifikat 11,5 ± 0,5 (95 %), o\'rtacha 11,9 → bias 3,48 %', () => {
  const ctx = E.makeContext(REL);
  const b = E.evaluateBias({ type: 'crm', relative: true, items: [{ certified: 11.5, U: 0.5, k: 2, mean: 11.9, sBias: 2.2, n: 12 }] }, ctx);
  near(b.items[0].bias, 3.48, 0.005, 'bias');
  // Manba u(Cref) = 2,16 % deb yozgan; 0,25/11,5·100 = 2,174 % (DISCREPANCIES D-14) — shu sababli tolerans kengroq
  near(b.items[0].uRef, 2.16, 0.02, 'u(Cref)');
  near(b.u, 4.1, 0.06, 'u(bias)');
});

test('Nordtest §6.1 (p. 20): bir nechta CRM — RMS_bias = 2,53 %, o\'rtacha u(Cref) = 1,92 %, u(bias) = 3,2 %', () => {
  const b = E.evaluateBias({ type: 'crm', relative: true, items: [
    { bias: 3.48, sBias: 2.2, n: 12, uRef: 2.16 }, { bias: -0.9, sBias: 2.0, n: 7, uRef: 1.8 }, { bias: 2.5, sBias: 2.8, n: 10, uRef: 1.8 },
  ] }, E.makeContext(REL));
  near(b.rms, 2.53, 0.005); near(b.uRef, 1.92, 0.005); near(b.u, 3.2, 0.05);
  assert.equal(b.formula, 'rms');
});

test('Nordtest §6.2 (pp. 21–22): PT — u(Cref,1) = 8,7/√23 = 1,8 %; RMS = 4,6 %; u(bias) = 5,3 %', () => {
  const ctx = E.makeContext(REL);
  const one = E.evaluateBias({ type: 'pt', relative: true, rounds: [{ bias: 2, sR: 8.7, nLab: 23 }] }, ctx);
  near(one.items[0].uRef, 1.8, 0.05);
  const b = E.evaluateBias({ type: 'pt', relative: true, rounds: [
    { bias: 2, uRef: 1.8 }, { bias: 7, uRef: 2.9 }, { bias: -2, uRef: 1.7 }, { bias: 3, uRef: 4.1 }, { bias: 6, uRef: 3.0 }, { bias: 5, uRef: 2.1 },
  ] }, ctx);
  near(b.rms, 4.6, 0.05); near(b.uRef, 2.6, 0.05); near(b.u, 5.3, 0.05);
});

test('Nordtest §6.2 (p. 21) NOTE: robust standart og\'ish × 1,25; (p. 22): U berilsa u(Cref,i) = U/2', () => {
  const ctx = E.makeContext(REL);
  const a = E.evaluateBias({ type: 'pt', relative: true, rounds: [{ bias: 1, sR: 8, nLab: 16 }] }, ctx);
  const b = E.evaluateBias({ type: 'pt', relative: true, robust: true, rounds: [{ bias: 1, sR: 8, nLab: 16 }] }, ctx);
  assert.equal(a.items[0].uRef, 2); assert.equal(b.items[0].uRef, 2.5);
  const c = E.evaluateBias({ type: 'pt', relative: true, rounds: [{ bias: 1, U: 3 }] }, ctx);
  assert.equal(c.items[0].uRef, 1.5);
});

test('Nordtest §5.2 (p. 16): nazorat namunasi — s_Rw 0,5 µg/L, X = 20,01 → 2,5 %; §5.1: chegaralar ±5 % (2s) → 2,5 %', () => {
  // qator: s va o'rtacha aynan berilgan qiymatlarni beradigan sintetik 3 nuqta emas — formulaning o'zi: CV = 100·s/x̄
  const v = [19.51, 20.01, 20.51]; // s = 0,5; x̄ = 20,01
  const r = E.evaluateRw({ components: [{ type: 'control_series', values: v, unit: 'µg/L' }] }, E.makeContext(REL));
  near(r.components[0].s, 0.5, 1e-9); near(r.components[0].mean, 20.01, 1e-9); near(r.u, 2.5, 0.005);
  const abs = E.evaluateRw({ components: [{ type: 'control_series', values: v, unit: 'µg/L' }] }, E.makeContext({ unit: 'µg/L' }));
  near(abs.u, 0.5, 1e-9);
  const lim = E.evaluateRw({ components: [{ type: 'control_limits', limit: 5, relative: true }] }, E.makeContext(REL));
  assert.equal(lim.u, 2.5);
});

test('dublikatlar: s = √(Σd²/(2n)) (TR 537 Appendix 5–6); juftlik s_i = |d|/√2 ning pooled qiymati bilan bir xil', () => {
  const pairs = [[7.46, 7.25], [9.01, 9.17], [3.60, 3.10]]; // Appendix 5 (p. 41), birinchi 3 qator: s = 0,15; 0,11; 0,35
  const d = E.duplicateSd(pairs, false);
  const si = pairs.map(([a, b]) => Math.abs(a - b) / Math.SQRT2);
  near(si[0], 0.15, 0.005); near(si[1], 0.11, 0.005); near(si[2], 0.35, 0.005);
  near(d.s, Math.sqrt(si.reduce((s, v) => s + v * v, 0) / 3), 1e-15);
  // Table 1 (p. 13): nisbiy s — 2,019; 1,245; 10,554 %
  const rel = pairs.map(p => 100 * E.duplicateSd([p], true).s);
  near(rel[0], 2.019, 0.0005); near(rel[1], 1.245, 0.0005); near(rel[2], 10.554, 0.0005);
});

test('Nordtest §7 (pp. 24–25): u_c = s_R; s_R = R/2,8', () => {
  const cd = E.evaluate({ format: 'uc-topdown/1', approach: 'REPRODUCIBILITY', scale: REL, reproducibility: { sR: 27.5, relative: true } });
  assert.equal(cd.uc, 27.5); assert.equal(cd.U, 55);             // Table 2 (p. 24): Cd, waste water — u_c = 27,5 %, U = 55 %
  const nh4 = E.evaluate({ format: 'uc-topdown/1', approach: 'REPRODUCIBILITY', scale: REL, reproducibility: { sR: 8.8, relative: true } });
  near(nh4.U, 17.6, 1e-9);                                        // §7.2 (p. 25): U = 2·8,8 = 17,6
  const lim = E.evaluate({ format: 'uc-topdown/1', approach: 'REPRODUCIBILITY', scale: { unit: 'mg/L' }, reproducibility: { R: 2.8, r: 1.4, unit: 'mg/L' } });
  near(lim.reproducibility.sR, 1, 1e-12); near(lim.reproducibility.sr, 0.5, 1e-12);
  assert.deepEqual(codes(cd), []);                                 // tekshirilgan qism — unverified belgisi yo'q
});

/* ── QUAM:2012 ── */

test('QUAM A4 (p. 66): tuzatilgan va tuzatilmagan bias variantlari', () => {
  const spec = corr => ({ format: 'uc-topdown/1', approach: 'QUAM_RECOVERY', scale: REL, relativeUnit: '1',
    rw: { components: [{ type: 'stated', s: 0.27, relative: true }] },
    recovery: { mean: 0.9, s: 0.28, n: 42, correction: corr }, measurement: { value: 1, unit: 'mg/kg' } });
  const a = E.evaluate(spec('applied')), b = E.evaluate(spec('not_applied'));
  near(a.recovery.u, 0.048, 0.0005);                 // u(Rec)/Rec (Table A4.4, p. 68)
  near(a.yCorrected, 1.1111, 0.00005);
  assert.ok(!codes(a).includes('topdown_bias_significant'));
  near(b.recovery.u, 0.0432, 0.00005);               // tuzatilmasa — u(Rec) (R = 1 deb olinadi)
  assert.equal(b.yCorrected, null);
  assert.equal(b.recovery.significant, true);
  assert.ok(codes(b).includes('topdown_bias_significant')); // QUAM §7.7.9, §7.16.2 iv)
  const w = b.warnings.find(x => x.code === 'topdown_bias_significant');
  assert.equal(w.severity, 'warning'); assert.match(w.ref, /7\.7\.9/);
});

test('QUAM recovery: qiymatlar qatoridan R_m, s, n; foizda ham ishlaydi; ahamiyatsiz farqda ogohlantirish yo\'q', () => {
  const r = E.evaluate({ format: 'uc-topdown/1', approach: 'QUAM_RECOVERY', scale: REL,
    rw: { components: [{ type: 'stated', s: 3, relative: true }] }, recovery: { values: [99, 101, 100, 98, 102] } });
  near(r.recovery.Rm, 100, 1e-12); assert.equal(r.recovery.n, 5); assert.equal(r.recovery.significant, false);
  near(r.recovery.tCrit, 2.776, 0.0005);             // t₀.₉₅(4) — JCGM 100:2008 Table G.2: 2,78
  assert.deepEqual(codes(r), []);
});

test('QUAM Table A6.3 (p. 85), Note 4: natijadagi noaniqlik (RSD) = sezgirlik × parametr noaniqligi', () => {
  const rows = [[0.23, 0.0013, 0.00030], [0.21, 0.0023, 0.00048], [0.0031, 2.89, 0.0090], [0.0025, 2.89, 0.0072]];
  const r = E.evaluate({ format: 'uc-topdown/1', approach: 'REPRODUCIBILITY', isEmpiricalMeasurand: true, scale: REL, relativeUnit: '1',
    reproducibility: { sR: 0.293 / 2.3, relative: true },
    additional: rows.map(([c, u], i) => ({ id: 'p' + i, category: i < 2 ? 'other' : 'time', sensitivity: c, uParam: u, relative: true })) });
  rows.forEach(([, , want], i) => near(r.additional[i].u, want, want < 0.001 ? 0.000005 : 0.00005, 'qator ' + i));
  // (p. 84): "2.3 × 0.009 = 0.021 % m/m"
  near(2.3 * r.additional[2].u, 0.021, 0.0005);
});

test('QUAM E.5.2.1 Eq. [1] (p. 117): u(x) = √(s₀² + (x·s₁)²); E.5.4: s₁ = 0 → s₀, s₀ = 0 → x·s₁', () => {
  assert.equal(E.levelUncertainty(10, 3, 0.4), 5);
  assert.equal(E.levelUncertainty(10, 3, 0), 3);
  assert.equal(E.levelUncertainty(10, 0, 0.05), 0.5);
  const r = E.evaluate({ format: 'uc-topdown/1', approach: 'LEVEL_DEPENDENT', scale: { unit: 'µg/L' },
    levelModel: { s0: { value: 3, unit: 'µg/L' }, s1: { value: 40, relative: true } }, measurement: { value: 10, unit: 'µg/L' } });
  assert.equal(r.uc, 5); assert.equal(r.U, 10); assert.equal(r.relU, 100); assert.equal(r.unit, 'µg/L');
  assert.deepEqual(r.budget.map(b => [b.kind, b.u]), [['level_constant', 3], ['level_proportional', 4]]);
});

test('QUAM E.5.5.2 (p. 119): s₀ = √c, s₁ = √m — u² ni x² bo\'yicha chiziqli regressiya', () => {
  const pts = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].map(x => ({ x, u: Math.sqrt(0.5 ** 2 + (x * 0.03) ** 2) }));
  const f = E.fitLevelModel(pts);
  near(f.s0, 0.5, 1e-6); near(f.s1, 0.03, 1e-12); assert.equal(f.fewLevels, false);
  assert.equal(E.fitLevelModel(pts.slice(0, 4)).fewLevels, true);
  // manfiy kesishma jimgina 0 ga kesilmaydi
  assert.equal(E.fitLevelModel([{ x: 1, u: 1 }, { x: 2, u: 0.5 }]).error, 'topdown_level_fit_negative');
  const r = E.evaluate({ format: 'uc-topdown/1', approach: 'LEVEL_DEPENDENT', scale: { unit: 'mg/L' },
    levelModel: { unit: 'mg/L', points: pts.slice(0, 5) }, measurement: { value: 10, unit: 'mg/L' } });
  near(r.uc, Math.sqrt(0.25 + 0.09), 1e-9);
  assert.ok(codes(r).includes('topdown_level_few'));
});

/* ── X11: ikki marta hisoblash ── */

test('X11 (ijobiy): R_w qamragan omil (takrorlanuvchanlik) gibrid qismda yana qo\'shilgan', () => {
  const r = E.evaluate(base({ additional: [{ id: 'rep', name: 'Takrorlanuvchanlik', category: 'repeatability', u: 1.5, relative: true }] }));
  const w = r.warnings.filter(x => x.code === 'x11_double_counting');
  assert.equal(w.length, 1);
  assert.equal(w[0].rule, 'X11'); assert.equal(w[0].severity, 'warning'); assert.ok(w[0].ref.length > 10);
  assert.match(w[0].value, /Takrorlanuvchanlik/);
  assert.equal(r.additional[0].doubleCounted, true);
  assert.equal(r.budget.find(b => b.id === 'rep').flag, 'X11');
});

test('X11 (ijobiy): tarozi — nazorat namunasi qamraydi deb ko\'rsatilgan (rw.covers) va yana qo\'shilgan', () => {
  const spec = base({ additional: [{ id: 'bal', category: 'balance', u: 0.3, relative: true }] });
  spec.rw.covers = ['balance', 'volumetric'];
  assert.ok(codes(E.evaluate(spec)).includes('x11_double_counting'));
});

test('X11 (ijobiy): tayanch qiymat noaniqligi u(C_ref) bias ichida bor — reference_material yana qo\'shilgan', () => {
  const r = E.evaluate(base({ additional: [{ id: 'crm', category: 'reference_material', u: 1.2, relative: true }] }));
  assert.ok(codes(r).includes('x11_double_counting'));
});

test('X11 (salbiy): R_w qamramagan omil (namuna olish, bir jinslilik) — ogohlantirish yo\'q', () => {
  const r = E.evaluate(base({ additional: [
    { id: 'sampling', category: 'sampling', u: 2, relative: true }, { id: 'hom', category: 'homogeneity', u: 1, relative: true },
    { id: 'bal', category: 'balance', u: 0.3, relative: true }, // covers da ko'rsatilmagan
  ] }));
  assert.ok(!codes(r).includes('x11_double_counting'));
  assert.ok(r.additional.every(a => a.doubleCounted === false));
  assert.equal(E.evaluate(base()).warnings.length, 0);
});

test('X11: s_R yondashuvida takrorlanuvchanlik/takroriylik qamralgan; quritish vaqti (QUAM A6) — yo\'q', () => {
  const mk = cat => E.evaluate({ format: 'uc-topdown/1', approach: 'REPRODUCIBILITY', scale: { unit: '% m/m' },
    reproducibility: { sR: 0.29, unit: '% m/m', covers: ['matrix'] }, additional: [{ id: 'a', category: cat, u: 0.1, unit: '% m/m' }] });
  for (const c of ['repeatability', 'intermediate_precision', 'reproducibility', 'matrix']) assert.ok(codes(mk(c)).includes('x11_double_counting'), c);
  assert.ok(!codes(mk('time')).includes('x11_double_counting'));
});

/* ── X12: empirik kattalikda bias ── */

/* Egasi qarori (2026-11-17, R-20): empirik kattalikka bias / recovery kiritilganda "tayanch qiymat qaysi usul bilan olingan"
   savoli majburiy. Javob yo'q → hissa QO'SHILADI + X12 (konservativ); 'other' → hissa chiqariladi (QUAM §7.9.2);
   'same' → qo'shiladi, ogohlantirishsiz (QUAM §7.9.3). */
const RW_ONLY = 2.6, WITH_BIAS = Math.sqrt(2.6 ** 2 + 4.3 ** 2 + 2.6 ** 2 / 19 + 1.2 ** 2);

test('X12 (ijobiy, javob berilmagan): empirik kattalikda bias → hissa u_c ga QO\'SHILADI va X12 ogohlantirishi chiqadi', () => {
  const r = E.evaluate(base({ isEmpiricalMeasurand: true }));
  const w = r.warnings.filter(x => x.code === 'x12_empirical_bias');
  assert.equal(w.length, 1);
  assert.equal(w[0].rule, 'X12'); assert.equal(w[0].severity, 'warning'); assert.match(w[0].ref, /QUAM:2012 §7\.9\.2/);
  assert.equal(r.bias.included, true);
  assert.equal(r.bias.referenceMethod, null);
  assert.equal(r.uc, WITH_BIAS);                                    // konservativ: bias qo'shilgan
  const row = r.budget.find(b => b.kind === 'bias');
  assert.equal(row.included, true); assert.equal(row.flag, 'X12'); assert.ok(row.share > 0);
});

test('X12 (aniq tanlov "boshqa usul / ta\'rif"): hissa chiqarib tashlanadi (QUAM §7.9.2), ogohlantirish emas — eslatma', () => {
  const spec = base({ isEmpiricalMeasurand: true }); spec.bias.referenceMethod = 'other';
  const r = E.evaluate(spec);
  assert.ok(!codes(r).includes('x12_empirical_bias'));
  const note = r.warnings.find(x => x.code === 'x12_bias_excluded');
  assert.ok(note && note.severity === 'info' && note.rule === 'X12' && /7\.9\.2/.test(note.ref));
  assert.equal(r.bias.included, false); assert.equal(r.bias.referenceMethod, 'other');
  assert.equal(r.uc, RW_ONLY);                                      // faqat u(R_w)
  const row = r.budget.find(b => b.kind === 'bias');
  assert.equal(row.included, false); assert.equal(row.flag, 'X12'); assert.equal(row.share, 0);
  assert.ok(row.u > 0);                                             // qiymat ko'rsatiladi, lekin qo'shilmaydi
});

test('X12 (salbiy, "shu usul"): bias laboratoriya ishiga tegishli — qo\'shiladi, X12 yo\'q (QUAM §7.9.3); eski referenceByMethod ham', () => {
  for (const mut of [b => { b.referenceMethod = 'same'; }, b => { b.referenceByMethod = true; }]) {
    const spec = base({ isEmpiricalMeasurand: true }); mut(spec.bias);
    const r = E.evaluate(spec);
    assert.ok(!r.warnings.some(w => w.rule === 'X12'));
    assert.equal(r.bias.included, true); assert.equal(r.bias.referenceMethod, 'same');
    assert.equal(r.uc, WITH_BIAS);
    assert.equal(r.budget.find(b => b.kind === 'bias').flag, undefined);
  }
});

test('X12: recovery va u(δ̂) uchun ham uch holat (javob yo\'q / boshqa usul / shu usul)', () => {
  const rec = ref => E.evaluate({ format: 'uc-topdown/1', approach: 'QUAM_RECOVERY', isEmpiricalMeasurand: true, scale: REL, relativeUnit: '1',
    rw: { components: [{ type: 'stated', s: 0.1, relative: true }] },
    recovery: { mean: 0.9, s: 0.28, n: 42, correction: 'applied', ...(ref ? { referenceMethod: ref } : {}) }, measurement: { value: 1, unit: 'mg/kg' } });
  const none = rec(null), other = rec('other'), same = rec('same');
  assert.ok(codes(none).includes('x12_empirical_bias')); assert.ok(none.uc > 0.1); near(none.yCorrected, 1.1111, 0.00005);
  assert.ok(codes(other).includes('x12_bias_excluded')); assert.equal(other.uc, 0.1); assert.equal(other.yCorrected, null);
  assert.ok(!same.warnings.some(w => w.rule === 'X12')); assert.equal(same.uc, none.uc);
  const rep = ref => E.evaluate({ format: 'uc-topdown/1', approach: 'REPRODUCIBILITY', isEmpiricalMeasurand: true, scale: REL,
    reproducibility: { sR: 5, sr: 2, relative: true }, methodBias: { uDelta: 1, relative: true, ...(ref ? { referenceMethod: ref } : {}) } });
  assert.ok(codes(rep(null)).includes('x12_empirical_bias')); near(rep(null).uc, Math.sqrt(26), 1e-12);
  assert.equal(rep('other').uc, 5);
  assert.ok(!rep('same').warnings.some(w => w.rule === 'X12'));
});

test('X12 (salbiy): empirik kattalik biassiz; empirik bo\'lmagan kattalik; noto\'g\'ri referenceMethod → xato', () => {
  const noBias = base({ isEmpiricalMeasurand: true }); delete noBias.bias;
  assert.deepEqual(codes(E.evaluate(noBias)), []);                  // topdown_no_bias ham yo'q: empirikda bias talab qilinmaydi
  assert.ok(!E.evaluate(base()).warnings.some(w => w.rule === 'X12'));
  const other = base(); other.bias.referenceMethod = 'other';       // empirik emas — javob ta'sir qilmaydi
  assert.equal(E.evaluate(other).uc, WITH_BIAS);
  const bad = base({ isEmpiricalMeasurand: true }); bad.bias.referenceMethod = 'maybe';
  assert.equal(E.evaluate(bad).error, 'topdown_bad_spec');
  assert.deepEqual(E.REFERENCE_METHODS, ['same', 'other']);
});

/* ── ν_eff (egasi qarori 2026-11-17): hisoblanadi va ko'rsatiladi; ν_eff < 30 → ogohlantirish + t_P(⌊ν_eff⌋) taklifi; k o'zgarmaydi ── */

test('ν_eff: Welch–Satterthwaite (JCGM 100:2008 G.4.1 Eq. G.2b) — ν(R_w) = n − 1, ν(bias) CRM / PT soni bo\'yicha', () => {
  // nazorat qatori n = 5 → ν = 4; PT 6 raund → ν = 5
  const r = E.evaluate({ format: 'uc-topdown/1', approach: 'NORDTEST', scale: REL,
    rw: { components: [{ type: 'control_series', values: [98, 101, 100, 102, 99], relative: true }] },
    bias: { type: 'pt', relative: true, rounds: [2, 7, -2, 3, 6, 5].map(b => ({ bias: b, uRef: 2.6 })) } });
  assert.equal(r.rw.components[0].nu, 4); assert.equal(r.rw.nu, 4); assert.equal(r.bias.nu, 5);
  near(r.nuEff, r.uc ** 4 / (r.rw.u ** 4 / 4 + r.bias.u ** 4 / 5), 1e-9);
  assert.deepEqual(r.budget.map(b => b.nu), [4, 5]);
  assert.equal(r.k, 2); assert.equal(r.U, 2 * r.uc);                // k avtomatik o'zgarmaydi
  const w = r.warnings.find(x => x.code === 'topdown_nu_low');
  assert.ok(w && w.severity === 'warning' && /G\.4\.1/.test(w.ref) && /Nordtest TR 537/.test(w.ref));
  near(r.kSuggested, E.tQuantile(0.9545, Math.floor(r.nuEff)), 1e-12);   // t_P(⌊ν_eff⌋), floor qoidasi
  assert.ok(r.kSuggested > 2);
});

test('ν_eff: dublikatlar ν = juftliklar soni; bitta CRM ν = n − 1; ν berilmagan hissalar ∞; bir nechta u(R_w) manbasi', () => {
  const r = E.evaluate({ format: 'uc-topdown/1', approach: 'NORDTEST', scale: REL,
    rw: { components: [{ type: 'duplicates', unit: 'mg/L', pairs: [[10, 11], [20, 19], [30, 31], [40, 41]] }, { type: 'stated', s: 1.5, relative: true, n: 50 },
      { type: 'control_limits', limit: 2, relative: true }] },
    bias: { type: 'crm', relative: true, items: [{ bias: 4.3, sBias: 2.6, n: 19, uRef: 1.2 }] },
    additional: [{ id: 'x', category: 'sampling', u: 1, relative: true }] });
  assert.deepEqual(r.rw.components.map(c => c.nu), [4, 49, Infinity]);
  const c = r.rw.components;
  near(r.rw.nu, r.rw.u ** 4 / (c[0].u ** 4 / 4 + c[1].u ** 4 / 49), 1e-9);
  assert.equal(r.bias.nu, 18);
  assert.equal(r.budget.find(b => b.id === 'x').nu, Infinity);
});

test('ν_eff ≥ 30 yoki ∞ — ogohlantirish yo\'q, kSuggested = null; chiqarilgan hissa ν_eff ga kirmaydi', () => {
  const inf = E.evaluate({ format: 'uc-topdown/1', approach: 'REPRODUCIBILITY', scale: REL, reproducibility: { sR: 8.8, relative: true } });
  assert.equal(inf.nuEff, Infinity); assert.equal(inf.kSuggested, null); assert.deepEqual(codes(inf), []);
  const big = E.evaluate(base());                                    // u(R_w) ν = ∞, bitta CRM n = 19 → ν_eff ≈ 32
  assert.ok(big.nuEff >= 30 && isFinite(big.nuEff)); assert.ok(!codes(big).includes('topdown_nu_low'));
  const ex = base({ isEmpiricalMeasurand: true }); ex.bias.referenceMethod = 'other';
  assert.equal(E.evaluate(ex).nuEff, Infinity);
  assert.equal(E.NU_EFF_WARN_BELOW, 30);
});

test('ν_eff: Nordtest NH₄-N misolida 6 ta PT raundi → ν_eff < 30, taklif chiqadi, natija (u_c, U) o\'zgarmaydi', () => {
  const r = E.evaluate(require('../cases/nordtest/nordtest-tr537-nh4n.json').modelSpec);
  assert.ok(r.nuEff < 30); assert.ok(codes(r).includes('topdown_nu_low'));
  near(r.uc, 3.20, 0.005); near(r.U, 6.40, 0.01); assert.equal(r.k, 2);
});

test('empirik kattalik: noaniqlik s_R va rejim parametrlari (harorat, vaqt, tezlik) hissalaridan', () => {
  const r = E.evaluate({ format: 'uc-topdown/1', approach: 'REPRODUCIBILITY', isEmpiricalMeasurand: true, scale: { unit: 'MPa' },
    reproducibility: { sR: 1.2, sr: 0.8, unit: 'MPa' },
    additional: [
      { id: 'T', category: 'temperature', sensitivity: 0.2, uParam: 1.5, unit: 'MPa' },
      { id: 't', category: 'time', u: 0.1, unit: 'MPa' }, { id: 'v', category: 'speed', u: 0.4, unit: 'MPa' },
    ], measurement: { value: 30, unit: 'MPa' } });
  near(r.uc, Math.sqrt(1.2 ** 2 + 0.3 ** 2 + 0.1 ** 2 + 0.4 ** 2), 1e-12);
  assert.deepEqual(codes(r), []);
  near(r.relU, 100 * r.U / 30, 1e-12);
});

/* ── Nisbiy va mutlaq aralashmasi ── */

test('nisbiy baholashga mutlaq hissa qo\'shish — topdown_mixed_scale', () => {
  const r = E.evaluate(base({ additional: [{ id: 'x', category: 'sampling', u: 0.5, unit: 'µg/L' }] }));
  assert.equal(r.error, 'topdown_mixed_scale');
  assert.match(r.detail, /additional\[0\]/);
});

test('mutlaq baholashga nisbiy hissa qo\'shish — topdown_mixed_scale (u(R_w), bias, qo\'shimcha)', () => {
  const abs = { unit: 'µg/L' };
  const rw = E.evaluate({ format: 'uc-topdown/1', approach: 'NORDTEST', scale: abs, rw: { components: [{ type: 'stated', s: 2.5, relative: true }] } });
  assert.equal(rw.error, 'topdown_mixed_scale');
  const bias = E.evaluate({ format: 'uc-topdown/1', approach: 'NORDTEST', scale: abs,
    rw: { components: [{ type: 'stated', s: 0.5, unit: 'µg/L' }] }, bias: { type: 'pt', relative: true, rounds: [{ bias: 2, uRef: 1 }] } });
  assert.equal(bias.error, 'topdown_mixed_scale');
  const add = E.evaluate({ format: 'uc-topdown/1', approach: 'NORDTEST', scale: abs,
    rw: { components: [{ type: 'stated', s: 0.5, unit: 'µg/L' }] }, additional: [{ id: 'x', u: 3, relative: true }] });
  assert.equal(add.error, 'topdown_mixed_scale');
  const lim = E.evaluate({ format: 'uc-topdown/1', approach: 'NORDTEST', scale: abs, rw: { components: [{ type: 'control_limits', limit: 3.34, relative: true }] } });
  assert.equal(lim.error, 'topdown_mixed_scale');
});

test('kattalikda birlik ham, relative ham yo\'q — topdown_need_scale; ikkalasi birga — topdown_mixed_scale', () => {
  assert.equal(E.evaluate({ format: 'uc-topdown/1', approach: 'NORDTEST', rw: { components: [] } }).error, 'topdown_need_scale');
  assert.equal(E.evaluate(base({ additional: [{ id: 'x', u: 1 }] })).error, 'topdown_need_scale');
  assert.equal(E.evaluate({ ...base(), rw: { components: [{ type: 'stated', s: 1 }] } }).error, 'topdown_need_scale');
  assert.equal(E.evaluate(base({ additional: [{ id: 'x', u: 1, relative: true, unit: '%' }] })).error, 'topdown_mixed_scale');
  assert.equal(E.evaluate(base({ scale: { relative: true, unit: 'mg/L' } })).error, 'topdown_mixed_scale');
  assert.equal(E.evaluate(base({ measurement: { value: 5 } })).error, 'topdown_need_scale');
});

test('mutlaq birliklar: mos o\'lchamlik o\'tkaziladi (mg/L → µg/L), mos kelmasa — topdown_unit_mismatch', () => {
  const mk = unit => E.evaluate({ format: 'uc-topdown/1', approach: 'NORDTEST', scale: { unit: 'µg/L' }, isEmpiricalMeasurand: true,
    rw: { components: [{ type: 'stated', s: 0.001, unit }] } });
  near(mk('mg/L').uc, 1, 1e-12);
  assert.equal(mk('kg').error, 'topdown_unit_mismatch');
  assert.equal(mk('noma\'lum').error, 'topdown_unit_mismatch');
});

test('level-dependent: s₀ mutlaq, s₁ nisbiy bo\'lishi shart — aks holda topdown_mixed_scale', () => {
  const mk = (s0, s1, scale = { unit: 'µg/L' }) => E.evaluate({ format: 'uc-topdown/1', approach: 'LEVEL_DEPENDENT', scale,
    levelModel: { s0, s1 }, measurement: { value: 10, unit: 'µg/L' } });
  assert.equal(mk({ value: 3, relative: true }, { value: 4, relative: true }).error, 'topdown_mixed_scale');
  assert.equal(mk({ value: 3, unit: 'µg/L' }, { value: 4, unit: 'µg/L' }).error, 'topdown_mixed_scale');
  assert.equal(mk({ value: 3, unit: 'µg/L' }, { value: 4, relative: true }, REL).error, 'topdown_mixed_scale');
  assert.equal(E.evaluate({ format: 'uc-topdown/1', approach: 'LEVEL_DEPENDENT', scale: { unit: 'µg/L' }, levelModel: { s0: { value: 1, unit: 'µg/L' }, s1: { value: 1, relative: true } } }).error, 'topdown_need_level');
});

test('nisbiy ↔ mutlaq ko\'rinish faqat o\'lchangan qiymat y orqali', () => {
  const rel = E.evaluate(base());
  assert.equal(rel.absU, null); near(rel.relU, rel.U, 1e-12);
  const withY = E.evaluate(base({ measurement: { value: 148, unit: 'µg/L' } }));
  near(withY.absU, 148 * withY.U / 100, 1e-12); assert.equal(withY.absUnit, 'µg/L');
  const abs = E.evaluate({ format: 'uc-topdown/1', approach: 'NORDTEST', scale: { unit: 'µg/L' }, isEmpiricalMeasurand: true,
    rw: { components: [{ type: 'stated', s: 0.7, unit: 'µg/L' }] } });
  assert.equal(abs.relU, null); assert.equal(abs.absU, 1.4);
});

/* ── Xatolar va ogohlantirishlar ── */

test('xato kodlari: yondashuv, bo\'sh ma\'lumot, kam nuqta, nol o\'rtacha', () => {
  const ev = s => E.evaluate({ format: 'uc-topdown/1', scale: REL, ...s });
  assert.equal(ev({ approach: 'XYZ' }).error, 'topdown_bad_approach');
  assert.equal(ev({ approach: 'NORDTEST' }).error, 'topdown_need_rw');
  assert.equal(ev({ approach: 'NORDTEST', rw: { components: [{ type: 'control_series', values: [5], unit: 'mg/L' }] } }).error, 'topdown_too_few');
  assert.equal(ev({ approach: 'NORDTEST', rw: { components: [{ type: 'control_series', values: [-1, 1], unit: 'mg/L' }] } }).error, 'topdown_zero_mean');
  assert.equal(ev({ approach: 'NORDTEST', rw: { components: [{ type: 'duplicates', pairs: [[1, 'x'], [2, 3]], unit: 'mg/L' }] } }).error, 'topdown_bad_data');
  assert.equal(ev({ approach: 'NORDTEST', rw: { components: [{ type: 'stated', s: 1, relative: true }] }, bias: { type: 'pt', relative: true, rounds: [{ bias: 1 }] } }).error, 'topdown_need_uref');
  assert.equal(ev({ approach: 'QUAM_RECOVERY', rw: { components: [{ type: 'stated', s: 1, relative: true }] } }).error, 'topdown_need_recovery');
  assert.equal(ev({ approach: 'REPRODUCIBILITY' }).error, 'topdown_need_reproducibility');
  assert.equal(ev({ approach: 'REPRODUCIBILITY', reproducibility: { sR: 1, sr: 2, relative: true } }).error, 'topdown_bad_data');
  assert.equal(E.evaluate({ format: 'uc-topdown/1' }).error, 'topdown_bad_approach');
  for (const s of [ev({ approach: 'XYZ' }), ev({ approach: 'NORDTEST' })]) assert.ok(E.TOPDOWN_ERRORS.includes(s.error));
});

test('ogohlantirishlar: bias berilmagan (Nordtest §6); PT raundlari 6 tadan kam (§6.2)', () => {
  const s = base(); delete s.bias;
  const r = E.evaluate(s);
  assert.deepEqual(codes(r), ['topdown_no_bias']);
  const few = E.evaluate(base({ bias: { type: 'pt', relative: true, rounds: [{ bias: 2, uRef: 1 }, { bias: -1, uRef: 1 }] } }));
  assert.ok(codes(few).includes('topdown_few_pt_rounds'));
  for (const w of [...r.warnings, ...few.warnings]) {
    assert.ok(w.code && w.severity && w.ref, JSON.stringify(w));
    assert.ok(['info', 'warning'].includes(w.severity));
  }
});

test('har bir ogohlantirish kodida {severity, ref}; X11/X12 da rule', () => {
  for (const [code, w] of Object.entries(E.TOPDOWN_WARNINGS)) {
    assert.ok(['info', 'warning'].includes(w.severity), code);
    assert.ok(typeof w.ref === 'string' && w.ref.length > 10, code);
  }
  assert.equal(E.TOPDOWN_WARNINGS.x11_double_counting.rule, 'X11');
  assert.equal(E.TOPDOWN_WARNINGS.x12_empirical_bias.rule, 'X12');
});

/* ── ISO 21748 qismi: unverified ── */

test('ISO 21748 (unverified): laboratoriya s_r tekshiruvi, s_R ni moslash, u(δ̂) — natijada topdown_unverified', () => {
  const spec = { format: 'uc-topdown/1', approach: 'REPRODUCIBILITY', scale: { unit: '% m/m' },
    reproducibility: { sR: 0.293, sr: 0.198, unit: '% m/m', pLabs: 10, nRep: 2 },
    labRepeatability: { s: 0.193, n: 5, unit: '% m/m' } };   // QUAM Table A6.2 (p. 84), namuna A: s_R, s_r va laboratoriya s_r (5 takror)
  const r = E.evaluate(spec);
  assert.equal(r.reproducibility.lab.pass, true);             // manba: "comparable" (ko'z bilan solishtirish; test manbada yo'q)
  near(r.reproducibility.lab.ratio, 0.193 / 0.198, 1e-12);
  assert.equal(r.uc, 0.293);
  const w = r.warnings.find(x => x.code === 'topdown_unverified');
  assert.ok(w && w.severity === 'info' && /lab_sr_check/.test(w.value));
  const bad = E.evaluate({ ...spec, labRepeatability: { s: 0.6, n: 5, unit: '% m/m' } });
  assert.ok(codes(bad).includes('topdown_sr_check_failed'));
  assert.equal(bad.uc, 0.293);                                 // avtomatik almashtirilmaydi
  const adj = E.evaluate({ ...spec, labRepeatability: { s: 0.6, n: 5, unit: '% m/m', adjust: true } });
  near(adj.uc, Math.sqrt(0.293 ** 2 - 0.198 ** 2 + 0.6 ** 2), 1e-12);
  const del = E.evaluate({ ...spec, labRepeatability: undefined, methodBias: { include: true } });
  near(del.reproducibility.uDelta, Math.sqrt((0.293 ** 2 - 0.5 * 0.198 ** 2) / 10), 1e-12);
  near(del.uc, Math.sqrt(0.293 ** 2 + del.reproducibility.uDelta ** 2), 1e-12);
  assert.match(del.warnings.find(x => x.code === 'topdown_unverified').value, /u_delta/);
});

/* ── Tozalik ── */

test('src/engine/topdown: brauzer obyektlari yo\'q; har bir faylda manba havolasi (Ref:)', () => {
  const dir = path.join(__dirname, '../../src/engine/topdown');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  assert.ok(files.length >= 6);
  for (const f of files) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.ok(!/\b(document|window|localStorage|navigator)\b/.test(src), f);
    assert.match(src, /Ref: /, f);
  }
});

test('GUM yo\'li o\'zgarmagan: uc-topdown/1 bo\'lmagan spetsifikatsiya eski yo\'ldan ketadi', () => {
  const r = E.evaluate({ params: ['x'], measurements: { x: ['1', '2', '3'] }, typeB: [], settings: {} });
  assert.equal(r.mode, undefined);
  assert.equal(r.y, 2);
});
