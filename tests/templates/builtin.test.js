/* P04: 11 ta eski shablon (templates/builtin/legacy-*.json).
   1) Snapshot: shablon → interpreter → evaluate natijasi P03 dagi preset natijasi bilan AYNAN bir xil
      (tests/templates/snapshots/legacy-p03.json va jonli P03 holati — to'liq natija JSON'i).
   2) Excel etalonlari: zichlik, gazoanalizator (3 nuqta) va termometr (5 nuqta) shablonlari
      Excel'dagi kirish qiymatlari bilan → tests/cases/excel/*.json dagi kutilgan qiymat (katak havolasi bilan). */
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { evaluate } = require('../../src/engine/index.js');
const T = require('../../src/templates/interpreter.js');
const { byId, templates, loadPresets, presetState, pick, readJSON, ROOT } = require('./lib.js');
const { compare } = require('../cases/lib.js');

const PRESETS = loadPresets();
const snapshot = readJSON(path.join(__dirname, 'snapshots/legacy-p03.json'));

test('11 ta eski shablon bor va har biri presetga mos', () => {
  const legacy = templates.filter(x => x.tpl.legacyPresetKey);
  assert.equal(legacy.length, 11);
  assert.deepEqual(legacy.map(x => x.tpl.legacyPresetKey).sort(), Object.keys(PRESETS).sort());
});

for (const [key, pd] of Object.entries(PRESETS)) {
  const tpl = byId[`legacy-${key}`];
  const pts = pd.points ? pd.points.map((_, i) => i) : [null];
  for (const i of pts) {
    const label = i === null ? key : `${key} nuqta ${i + 1}`;
    test(`snapshot: ${label} — shablon natijasi P03 bilan aynan bir xil`, () => {
      const run = T.evaluateTemplate(tpl, i === null ? { useSample: true } : { useSample: true, point: i });
      assert.ok(!run.error, run.error);
      assert.ok(!run.result.error, run.result.error);
      // (a) muzlatilgan snapshot (P03, ENGINE 2.0.0)
      assert.deepEqual(pick(run.result), snapshot.results[key][i === null ? 0 : i]);
      // (b) jonli P03 holati — natijaning barcha maydonlari
      assert.equal(JSON.stringify(run.result), JSON.stringify(evaluate(presetState(pd, i))));
    });
  }
}

/* ── Excel etalonlari ── */
function caseFile(id) { return readJSON(path.join(ROOT, 'tests/cases/excel', id + '.json')); }

/** Excel holatidagi qiymatlarni shablonga foydalanuvchi ma'lumoti sifatida berish (manbalar tartibi bir xil). */
function dataFromCase(tpl, st) {
  assert.equal(st.typeB.length, tpl.typeBSources.length, 'manbalar soni');
  const sources = {};
  tpl.typeBSources.forEach((s, i) => {
    const c = st.typeB[i];
    assert.equal(c.param, s.input, `${s.id}: kirish`);
    sources[s.id] = { halfWidth: c.halfWidth, distribution: c.distribution, sensitivity: c.sensitivity === undefined ? 1 : c.sensitivity, ...(c.k !== undefined ? { k: c.k } : {}) };
  });
  return { observations: st.measurements, sources, settings: st.settings, directions: st.directions };
}

const EXCEL = [
  ['legacy-density', ['excel-density']],
  ['legacy-gas_analyzer', ['excel-gas-p1', 'excel-gas-p2', 'excel-gas-p3']],
  ['legacy-thermometer', ['excel-term-p1', 'excel-term-p2', 'excel-term-p3', 'excel-term-p4', 'excel-term-p5']],
];
const PICK = { y: r => r.y, uc: r => r.uc, nu_eff: r => r.nuEff, k: r => r.k, U: r => r.U };

for (const [tplId, cases] of EXCEL) {
  for (const cid of cases) {
    const c = caseFile(cid);
    describe(`Excel: ${tplId} ← ${cid} (${c.source.file})`, () => {
      const tpl = byId[tplId];
      const st = c.modelSpec.state;
      const run = T.evaluateTemplate(tpl, dataFromCase(tpl, st));
      test('hisob xatosiz', () => { assert.ok(!run.error && !run.result.error, run.error || run.result.error); });
      test('shablon natijasi tests/cases dagi holat bilan aynan bir xil (manba nomlaridan tashqari)', () => {
        const strip = r => { const p = pick(r); p.budget.forEach(b => { delete b.name; }); return p; };
        assert.deepEqual(strip(run.result), strip(evaluate(c.modelSpec)));
      });
      for (const [q, e] of Object.entries(c.expected)) {
        const known = (c.knownDiscrepancies || {})[q];
        const tol = (c.tolerance || {})[q] || (c.tolerance || {}).default || { rel: 1e-9 };
        const name = `${q} = ${e.value} (${e.ref})`;
        const fn = () => { const cmp = compare(q, PICK[q](run.result), e.value, tol); assert.ok(cmp.ok, cmp.msg); };
        if (known) test(name, { todo: `${known} — DISCREPANCIES.md` }, fn); else test(name, fn);
      }
    });
  }
}
