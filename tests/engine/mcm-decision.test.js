/* P20 (audit 21.11.2026, MET-01) — LPU → MCM avtomatik qaror qoidasi (src/engine/mcm-decision.js) va linter M5.
   Chegaralar (|c_i|u(x_i)/u_c > 0,50; ν_eff < 6) — LOYIHA QARORI (egasi, 2026-11-21), me'yoriy son emas: bu testlar
   qoidaning o'zini tekshiradi (manba — egasi qarori matni); sonli natijalar (y, u_c, U …) bu modulda hisoblanmaydi.
   Zichlik namunasi uchun kutilgan qiymatlar egasi topshirig'idan: sabab (b), V manbasi, nisbat ≈ 0,917
   (dispersiya ulushi 84,0 %) — √0,840 = 0,917. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const E = require('../../src/engine/index.js');
const DENS = require('../cases/excel/excel-density.json');

const ROOT = path.join(__dirname, '..', '..');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src/data/presets.js'), 'utf8'), ctx);
const PRESETS = JSON.parse(JSON.stringify(ctx.window.PRESETS));

const state = (o) => ({ format: 'calc-state/v2', state: {
  params: o.params, measurements: o.measurements, directions: [], model: { formula: o.formula, unit: o.unit || '' },
  settings: { paired: false, P: 0.9545, ...(o.settings || {}) }, covB: {}, typeB: o.typeB || [] } });
const linear = (typeB, settings) => state({ params: ['X1', 'X2'], measurements: { X1: [10], X2: [5] }, formula: 'Y = X1 + X2', typeB, settings });
const NORMAL = [
  { name: 'cert 1', param: 'X1', halfWidth: 0.02, distribution: 'normal', k: 2 },
  { name: 'cert 2', param: 'X2', halfWidth: 0.02, distribution: 'normal', k: 2 },
];

test('zichlik namunasi (preset density): required = true, sabab (b), V manbasi, nisbat ≈ 0,917 (ulush 84,0 %)', () => {
  const pd = PRESETS.density;
  const r = E.evaluate(state({ params: pd.params, measurements: pd.sampleData, formula: pd.formula, unit: pd.unit, typeB: pd.typeBComponents,
    settings: { paired: true } }));   // ilovaning standart holati (src/js/state.js): paired = true, P = 0,9545
  assert.ok(!r.error, r.error);
  assert.equal(r.mcm.required, true);
  const b = r.mcm.reasons.filter(x => x.code === 'b');
  assert.equal(b.length, 1);
  assert.equal(b[0].param, 'V');
  assert.equal(b[0].source, 'Glassware tolerance');
  assert.equal(b[0].threshold, 0.5);
  assert.ok(Math.abs(b[0].value - 0.917) < 5e-4, String(b[0].value));
  const row = r.budget.find(x => x.name === 'Glassware tolerance');
  assert.ok(Math.abs(row.share - 84.0) < 0.05, String(row.share));               // dispersiya ulushi — nisbat emas
  assert.ok(Math.abs(b[0].value - Math.sqrt(row.share / 100)) < 1e-12);
  assert.match(b[0].ref, /JCGM 101:2008 §5\.7/);
  // A1 (dispersiya ulushi > 90 %) o'zgarmagan: 84 % da chiqmaydi
  assert.ok(!r.findings.some(f => f.code === 'dominant_source'));
});

test('etalon Excel zichlik nuqtasi: (b), V; sonli natija mcm qo\'shilishi bilan o\'zgarmagan', () => {
  const r = E.evaluate(DENS.modelSpec);
  assert.equal(r.mcm.required, true);
  assert.deepEqual(r.mcm.reasons.map(x => [x.code, x.param]), [['b', 'V']]);
  assert.ok(Math.abs(r.mcm.reasons[0].value - 0.917) < 5e-4);
});

test('faqat normal manbali chiziqli model: required = false, sabablar bo\'sh', () => {
  const r = E.evaluate(linear(NORMAL));
  assert.ok(!r.error, r.error);
  assert.deepEqual(r.mcm, { required: false, reasons: [] });
});

test('(b): chegara — nisbat 0,50 (dispersiya ulushi 25 %): undan pastda yo\'q, yuqorida bor; normal manba hech qachon (b) emas', () => {
  // u_rect = a/√3; u_norm = 0,01·√2 (ikki manba). nisbat = u_rect / √(u_rect² + 2·0,01²)
  const withRect = a => E.evaluate(linear([...NORMAL, { name: 'rect', param: 'X1', halfWidth: a, distribution: 'rect' }])).mcm;
  const below = withRect(0.012);    // u = 0,00693 → nisbat 0,44
  const above = withRect(0.016);    // u = 0,00924 → nisbat 0,547
  assert.equal(below.required, false);
  assert.equal(above.required, true);
  assert.equal(above.reasons[0].code, 'b');
  assert.ok(above.reasons[0].value > 0.5 && above.reasons[0].value < 0.6);
  // ustun, lekin NORMAL manba — (b) emas
  const dom = E.evaluate(linear([{ name: 'big', param: 'X1', halfWidth: 1, distribution: 'normal', k: 2 }, NORMAL[1]])).mcm;
  assert.equal(dom.required, false);
  for (const d of ['rect', 'ushape', 'triang', 'resol']) {
    const m = E.evaluate(linear([{ name: 's', param: 'X1', halfWidth: 1, distribution: d }, NORMAL[1]])).mcm;
    assert.deepEqual(m.reasons.map(x => x.code), ['b'], d);
  }
});

test('(d): ν_eff = 4 → talab qilinadi; ν_eff ≥ 6 → (d) yo\'q', () => {
  const one = nu => E.evaluate(linear([{ ...NORMAL[0], nu }, { ...NORMAL[1], halfWidth: 0 }]));
  const r4 = one(4);
  assert.equal(r4.nuEff, 4);
  assert.deepEqual(r4.mcm.reasons.map(x => [x.code, x.value, x.threshold]), [['d', 4, 6]]);
  assert.equal(r4.mcm.required, true);
  assert.equal(one(6).mcm.required, false);
  assert.equal(one(5.9).mcm.required, true);
});

test('(c): fizik chegara — y = 99,95 %, upper = 100 %, U = 0,1 % → talab qilinadi; chegara uzoqda — yo\'q', () => {
  const spec = b => state({ params: ['w'], measurements: { w: [99.95] }, formula: 'Y = w', unit: '%',
    typeB: [{ name: 'cert', param: 'w', halfWidth: 0.1, distribution: 'normal', k: 2 }], settings: { kMethod: 'k2', physicalBounds: b } });
  const r = E.evaluate(spec({ upper: 100 }));
  assert.equal(r.y, 99.95);
  assert.ok(Math.abs(r.U - 0.1) < 1e-12);
  assert.equal(r.mcm.required, true);
  assert.equal(r.mcm.reasons.length, 1);
  assert.equal(r.mcm.reasons[0].code, 'c');
  assert.equal(r.mcm.reasons[0].source, 'upper');
  assert.ok(Math.abs(r.mcm.reasons[0].value - 0.05) < 1e-9);
  assert.equal(E.evaluate(spec({ upper: 101, lower: 0 })).mcm.required, false);
  assert.equal(E.evaluate(spec(undefined)).mcm.required, false);
  // sonli natija chegara berilishi bilan o'zgarmaydi
  const plain = E.evaluate(spec(undefined));
  for (const q of ['y', 'uc', 'U', 'k', 'nuEff']) assert.ok(Object.is(plain[q], r[q]), q);
});

test('(c): asimmetrik kirish taqsimoti (exp, lognorm)', () => {
  for (const d of ['exp', 'lognorm']) {
    const m = E.evaluate(linear([...NORMAL, { name: 'asym', param: 'X1', halfWidth: 0.001, distribution: d, k: 2 }])).mcm;
    assert.deepEqual(m.reasons.map(x => [x.code, x.value]), [['c', d]], d);
  }
});

test('(a): nochiziqli model (2-tartibli hadlar indeksi > 0,01) va c_i = 0', () => {
  // Y = X1² , X1 = 0 atrofida: c = 0, faqat 2-tartibli had
  const zero = E.evaluate(state({ params: ['X1'], measurements: { X1: [0] }, formula: 'Y = X1^2',
    typeB: [{ name: 'n', param: 'X1', halfWidth: 0.2, distribution: 'normal', k: 2 }] }));
  assert.ok(zero.mcm.required);
  assert.ok(zero.mcm.reasons.some(x => x.code === 'a' && x.param === 'X1'));
  const curved = E.evaluate(state({ params: ['X1'], measurements: { X1: [1] }, formula: 'Y = X1^2',
    typeB: [{ name: 'n', param: 'X1', halfWidth: 1, distribution: 'normal', k: 2 }] }));
  const a = curved.mcm.reasons.find(x => x.code === 'a');
  assert.ok(a && a.value > 0.01 && a.threshold === 0.01, JSON.stringify(curved.mcm));
  assert.equal(a.value, curved.secondOrder.index);
});

test('mcmDecision sof funksiya: xato / bo\'sh natijada required = false; natijani o\'zgartirmaydi', () => {
  assert.deepEqual(E.mcmDecision({ error: 'x' }), { required: false, reasons: [] });
  assert.deepEqual(E.mcmDecision(null), { required: false, reasons: [] });
  const r = E.evaluate(DENS.modelSpec);
  const copy = JSON.stringify(r);
  assert.deepEqual(E.mcmDecision(r, {}), r.mcm);
  assert.equal(JSON.stringify(r), copy);
  assert.deepEqual(E.MCM_THRESHOLDS, { ratio: 0.5, nuEff: 6 });
});

test('mcmState: pending / failed / not_converged / validated / rejected / performed; mcmMissing', () => {
  const req = { mcm: { required: true, reasons: [{ code: 'd' }] } };
  assert.equal(E.mcmState({ mcm: { required: false, reasons: [] } }, null), 'not_required');
  assert.equal(E.mcmState({}, null), 'not_required');
  assert.equal(E.mcmState(req, null), 'pending');
  assert.equal(E.mcmState(req, { error: 'mc_nonnormal_correlation' }), 'failed');
  assert.equal(E.mcmState(req, { validated: true, adaptive: { enabled: true, reachedMax: true, converged: false } }), 'not_converged');
  assert.equal(E.mcmState(req, { validated: true, adaptive: { enabled: true, converged: true } }), 'validated');
  assert.equal(E.mcmState(req, { validated: false, adaptive: { enabled: true, converged: true } }), 'rejected');
  assert.equal(E.mcmState(req, { validated: null, adaptive: { enabled: false }, validation: { requested: false } }), 'performed');
  assert.equal(E.mcmMissing(req, null), true);
  assert.equal(E.mcmMissing(req, { error: 'x' }), true);
  assert.equal(E.mcmMissing(req, { validated: false }), false);
});

test('linter M5 mcm_required: evaluate() chiqarmaydi; lintMcm — natija yo\'q bo\'lsa warning, bor bo\'lsa yo\'q', () => {
  const r = E.evaluate(DENS.modelSpec);
  assert.ok(!r.findings.some(f => f.code === 'mcm_required'));              // dvigatel natijasidagi topilmalar o'zgarmagan
  const miss = E.lintMcm(r, null);
  assert.equal(miss.length, 1);
  assert.deepEqual([miss[0].rule, miss[0].code, miss[0].severity, miss[0].mode, miss[0].value], ['M5', 'mcm_required', 'warning', 'GUM', 'b']);
  assert.match(miss[0].ref, /JCGM 101:2008 §5\.7/);
  assert.equal(E.lintMcm(r, { error: 'mc_cancelled' }).length, 1);
  assert.deepEqual(E.lintMcm(r, { validated: true, adaptive: { enabled: true, converged: true } }), []);   // salbiy: MCM bajarilgan
  assert.deepEqual(E.lintMcm(E.evaluate(linear(NORMAL)), null), []);                                        // salbiy: talab qilinmaydi
  assert.equal(E.FINDING_CODES.mcm_required.rule, 'M5');
});
