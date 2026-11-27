/* P22-2 (audit UX-03): usul maslahatchisi — src/engine/method-advisor.js::suggestMethod.
   FAQAT TAVSIYA: hisobni o'zgartirmaydi, yangi son chegara yo'q (MC — result.mcm dan). Kutilgan qiymatlar — qoida
   jadvali (loyiha yo'riqnomasi P22-2 §3); 9 ta etalon nuqta — tests/cases/excel/ (Excel kataklari bilan). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../../src/engine/index.js');
const { MODES } = require('../../src/engine/linter/util.js');

const load = id => require(`../cases/excel/${id}.json`);
const NINE = ['excel-density', 'excel-gas-p1', 'excel-gas-p2', 'excel-gas-p3', 'excel-term-p1', 'excel-term-p2', 'excel-term-p3', 'excel-term-p4', 'excel-term-p5'];
const clone = v => JSON.parse(JSON.stringify(v));
const codes = s => s.reasons.map(r => r.code);
function wellFormed(s) {
  assert.ok(MODES.includes(s.method), s.method);
  assert.ok(s.reasons.length > 0);
  for (const r of s.reasons) assert.ok(typeof r.code === 'string' && typeof r.ref === 'string' && r.ref.length > 0, JSON.stringify(r));
  for (const a of s.alternatives) { assert.ok(MODES.includes(a)); assert.notEqual(a, s.method); }
}

test('ommaviy API: suggestMethod, DATA_KINDS, ADVISOR_REASONS — src/engine/index.js dan', () => {
  assert.equal(typeof E.suggestMethod, 'function');
  assert.deepEqual([...E.DATA_KINDS], ['model', 'calibration_curve', 'qc_crm_pt', 'interlab_sr_sR', 'sampling_duplicates', 'binary', 'micro_count', 'iqc_medical']);
  assert.ok(E.ADVISOR_REASONS.includes('interlab_precision'));
});

test('1-qoida: shablon evaluationMode → usul (GUM_BOTTOM_UP → GUM); noma\'lum rejim — qoida ishlamaydi', () => {
  const map = { GUM_BOTTOM_UP: 'GUM', REGRESSION: 'REGRESSION', TOP_DOWN: 'TOP_DOWN', SAMPLING: 'SAMPLING', QUALITATIVE: 'QUALITATIVE', MICROBIOLOGY: 'MICRO', MEDICAL: 'MEDICAL' };
  for (const [mode, method] of Object.entries(map)) {
    const s = E.suggestMethod({ template: { id: 'T-01', evaluationMode: mode }, settings: { dataKind: 'binary' } });
    wellFormed(s);
    assert.equal(s.method, method, mode);
    assert.deepEqual(codes(s), ['template_mode']);
    assert.deepEqual(s.alternatives, [], 'shablonda usul qulflangan — muqobil yo\'q');
  }
  // sxemadagi enum bilan mos (yangi rejim qo'shilsa — shu test eslatadi)
  const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'schemas/methodology.schema.json'), 'utf8'));
  assert.deepEqual([...schema.properties.evaluationMode.enum].sort(), Object.keys(map).sort());
  // salbiy: evaluationMode yo'q / noma'lum — shablon qoidasi ishlamaydi, keyingi qoidalar
  assert.deepEqual(codes(E.suggestMethod({ template: { id: 'x' } })), ['measurement_model']);
  assert.equal(E.suggestMethod({ template: { evaluationMode: 'NOPE' }, settings: { dataKind: 'binary' } }).method, 'QUALITATIVE');
  // GUM shabloni bir nechta chiqishli (MV-01) — MULTIVARIATE, ikkala sabab bilan
  const mv = E.suggestMethod({ template: { evaluationMode: 'GUM_BOTTOM_UP' }, outputs: [{ formula: 'a' }, { formula: 'b' }] });
  assert.equal(mv.method, 'MULTIVARIATE');
  assert.deepEqual(codes(mv), ['template_mode', 'multi_output']);
});

test('2-qoida: oshkormas model yoki ≥ 2 chiqish → MULTIVARIATE (JCGM 102:2011 §6.2, §6.3); bitta chiqish — yo\'q', () => {
  const two = E.suggestMethod({ outputs: [{ formula: 'R = V / I' }, { formula: 'X = V * I' }], settings: { dataKind: 'qc_crm_pt' } });
  wellFormed(two);
  assert.equal(two.method, 'MULTIVARIATE');
  assert.deepEqual(two.reasons, [{ code: 'multi_output', ref: 'JCGM 102:2011 §6.2', verified: true }]);
  const imp = E.suggestMethod({ implicit: { unknowns: [{ name: 'y', start: 1 }], equations: ['y - x'] } });
  assert.equal(imp.method, 'MULTIVARIATE');
  assert.deepEqual(imp.reasons, [{ code: 'implicit_model', ref: 'JCGM 102:2011 §6.3', verified: true }]);
  // salbiy
  assert.equal(E.suggestMethod({ outputs: [{ formula: 'y = x' }] }).method, 'GUM');
  assert.equal(E.suggestMethod({ outputs: [] }).method, 'GUM');
  assert.equal(E.suggestMethod({ implicit: null }).method, 'GUM');
});

test('3-qoida: settings.dataKind → usul; manbasi repoda yo\'q havolalar "(unverified)" va verified: false', () => {
  const expect = {
    calibration_curve: ['REGRESSION', ['calibration_curve', 'calibration_curve_iso']],
    qc_crm_pt: ['TOP_DOWN', ['qc_crm_pt', 'qc_crm_pt_iso']],
    interlab_sr_sR: ['TOP_DOWN', ['interlab_precision']],
    sampling_duplicates: ['SAMPLING', ['sampling_duplicates']],
    binary: ['QUALITATIVE', ['binary']],
    micro_count: ['MICRO', ['micro_count']],
    iqc_medical: ['MEDICAL', ['iqc_medical']],
  };
  for (const [kind, [method, cs]] of Object.entries(expect)) {
    const s = E.suggestMethod({ params: ['x'], model: { formula: '' }, settings: { dataKind: kind } });
    wellFormed(s);
    assert.equal(s.method, method, kind);
    assert.deepEqual(codes(s), cs, kind);
    assert.deepEqual(s.alternatives, ['GUM']);
    for (const r of s.reasons) assert.equal(/\(unverified\)/.test(r.ref), r.verified === false, r.ref);
  }
  // repoda yo'q standartlar: ISO 28037, ISO 11352, ISO 21748, ISO 19036 — hammasi unverified
  const unv = Object.keys(expect).flatMap(k => E.suggestMethod({ settings: { dataKind: k } }).reasons).filter(r => !r.verified).map(r => r.ref);
  assert.deepEqual(unv, ['ISO 28037:2026 (unverified)', 'ISO 11352:2025 (unverified)', 'ISO 21748:2017 §10 (unverified)', 'ISO 19036 (unverified)']);
  // salbiy: 'model', noma'lum qiymat, prototip kaliti, son — 4-qoida
  for (const kind of ['model', 'whatever', 'constructor', '__proto__', 7, null, undefined]) {
    assert.deepEqual(codes(E.suggestMethod({ settings: { dataKind: kind } })), ['measurement_model'], String(kind));
  }
});

test('4-qoida: aks holda GUM (JCGM 100:2008 §5.1); result.mcm.required → MC, sabablar AYNAN nusxa', () => {
  const g = E.suggestMethod({ params: ['m', 'V'], model: { formula: 'rho = m / V' } });
  wellFormed(g);
  assert.deepEqual(g, { method: 'GUM', reasons: [{ code: 'measurement_model', ref: 'JCGM 100:2008 §5.1', verified: true }], alternatives: ['MC'] });
  assert.equal(E.suggestMethod().method, 'GUM');
  assert.equal(E.suggestMethod(null, null).method, 'GUM');
  assert.equal(E.suggestMethod({}, { mcm: { required: false, reasons: [] } }).method, 'GUM');
  assert.equal(E.suggestMethod({}, { mcm: { required: 'yes', reasons: [] } }).method, 'GUM', 'faqat aynan true');
  const reasons = [{ code: 'd', value: 4.2, threshold: 6, ref: 'x' }];
  const m = E.suggestMethod({}, { mcm: { required: true, reasons } });
  assert.equal(m.method, 'MC');
  assert.deepEqual(m.reasons, reasons);
  assert.notEqual(m.reasons[0], reasons[0], 'nusxa — natija obyektiga havola emas');
  assert.deepEqual(m.alternatives, ['GUM']);
  // dataKind MCM dan ustun (3-qoida 4-dan oldin); shablon hammasidan ustun
  assert.equal(E.suggestMethod({ settings: { dataKind: 'binary' } }, { mcm: { required: true, reasons } }).method, 'QUALITATIVE');
});

test('9 ta etalon nuqta: GUM yoki MC; MC da sabablar result.mcm.reasons bilan deepEqual', () => {
  for (const id of NINE) {
    const spec = load(id).modelSpec;
    const r = E.evaluate(spec);
    assert.ok(!r.error, id);
    const before = E.suggestMethod(spec);
    assert.equal(before.method, 'GUM', id + ' (natijasiz)');
    const s = E.suggestMethod(spec, r);
    wellFormed(s);
    assert.ok(['GUM', 'MC'].includes(s.method), id);
    assert.equal(s.method, r.mcm.required ? 'MC' : 'GUM', id);
    if (s.method === 'MC') assert.deepEqual(s.reasons, r.mcm.reasons, id);
  }
});

test('settings.dataKind (va interfeysdagi settings.method) evaluate() natijasiga ta\'sir qilmaydi — 9 nuqtada bit darajasida', () => {
  for (const id of NINE) {
    const spec = load(id).modelSpec;
    const base = JSON.stringify(E.evaluate(clone(spec)));
    for (const kind of E.DATA_KINDS) {
      const s2 = clone(spec);
      s2.settings = { ...(s2.settings || {}), dataKind: kind, method: 'REGRESSION' };
      assert.equal(JSON.stringify(E.evaluate(s2)), base, `${id} / ${kind}`);
    }
  }
});

test('sof funksiya: kirish holati va natija o\'zgarmaydi; evaluate() chaqirilmaydi; DOM / xotira ishlatilmaydi', () => {
  const spec = clone(load('excel-gas-p2').modelSpec);
  spec.settings = { ...(spec.settings || {}), dataKind: 'qc_crm_pt' };
  const r = E.evaluate(spec);
  const s0 = JSON.stringify(spec), r0 = JSON.stringify(r);
  const frozen = (function deep(o) { if (o && typeof o === 'object') { Object.values(o).forEach(deep); Object.freeze(o); } return o; })(clone(spec));
  E.suggestMethod(frozen, r);                    // muzlatilgan holatda xato bermaydi — yozmaydi
  E.suggestMethod(spec, r);
  assert.equal(JSON.stringify(spec), s0);
  assert.equal(JSON.stringify(r), r0);
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src/engine/method-advisor.js'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.ok(!/\b(window|document|localStorage|sessionStorage|navigator)\b/.test(src));
  assert.ok(!/evaluate\s*\(/.test(src), 'evaluate() chaqirilmaydi');
  assert.deepEqual(src.match(/^import .*$/gm), ["import { MODES } from './linter/util.js';"], 'yagona import — usul kalitlari');
  assert.ok(!/MCM_THRESHOLDS/.test(src));
  // yangi son chegara yo'q: kodda (izoh va satrlardan tashqari) taqqoslanadigan son literali yo'q
  const noStr = src.replace(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g, "''");
  assert.deepEqual(noStr.match(/[<>]=?\s*\d|\d\s*[<>]/g) || [], ['>= 2'], 'yagona taqqoslash — chiqishlar soni ≥ 2 (JCGM 102 ta\'rifi)');
});
