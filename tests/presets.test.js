/* 11 ta shablon (src/data/presets.js): tuzilma to'g'ri va dvigatelda xatosiz hisoblanadi.
   Gazoanalizator va termometr shablonlari etalon misollar (tests/excel-cases.js) bilan bir xil
   ma'lumotga ega (RISKS R-11: ma'lumot ikki joyda — farq bo'lsa test yiqiladi). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Calc = require('../src/engine/index.js'); // P03: dvigatel (src/engine/)
const K = require('./excel-cases.js');

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src/data/presets.js'), 'utf8'), ctx);
const PRESETS = JSON.parse(JSON.stringify(ctx.window.PRESETS)); // vm realm → oddiy obyekt

test('11 ta shablon', () => {
  assert.equal(Object.keys(PRESETS).length, 11);
});

function stateFor(pd, data) {
  return {
    params: pd.params, measurements: data, directions: pd.directions || [],
    model: { formula: pd.formula || '', unit: pd.unit || '' },
    settings: { paired: false, P: 0.9545, ...(pd.settings || {}) }, covB: {},
    typeB: (pd.typeBComponents || []).map(c => ({ ...c })),
  };
}

for (const [key, pd] of Object.entries(PRESETS)) {
  test(`shablon ${key}: tuzilma`, () => {
    assert.ok(pd.name && Array.isArray(pd.params) && pd.params.length > 0);
    assert.equal(new Set(pd.params).size, pd.params.length, 'takroriy parametr');
    for (const c of pd.typeBComponents || []) {
      assert.ok(pd.params.includes(c.param), `${c.name}: param ${c.param}`);
      assert.ok(c.distribution === 'normal' || Calc.DIVISORS[c.distribution], `${c.name}: taqsimot ${c.distribution}`);
    }
    assert.ok(pd.sampleData, 'sampleData');
    for (const p of pd.params) assert.ok(Array.isArray(pd.sampleData[p]) && pd.sampleData[p].length > 0, `sampleData.${p}`);
  });
  test(`shablon ${key}: namunaviy ma'lumot bilan xatosiz hisoblanadi`, () => {
    const pts = pd.points ? pd.points.map(p => p.data) : [pd.sampleData];
    for (const data of pts) {
      const r = Calc.evaluate(stateFor(pd, data));
      assert.ok(!r.error, `xato: ${r.error}`);
      for (const q of ['y', 'uc', 'k', 'U']) assert.ok(Number.isFinite(r[q]), `${q} = ${r[q]}`);
      assert.ok(r.uc >= 0 && r.U >= 0);
    }
  });
}

test('gas_analyzer shabloni etalon misol (excel-cases.js) bilan bir xil', () => {
  const pd = PRESETS.gas_analyzer;
  assert.deepEqual(pd.params, K.gas.params);
  assert.equal(pd.formula, K.gas.formula.replace(/^E = /, 'E = '));
  pd.points.forEach((pt, i) => {
    assert.deepEqual(pt.data.I, K.gas.points[i].I);
    assert.deepEqual(pt.data.Ce, K.gas.points[i].Ce);
    assert.equal(pt.patch['Reference gas mixture (PGS) value'].halfWidth, K.gas.points[i].pgs);
  });
});

test('thermometer shabloni etalon misol (excel-cases.js) bilan bir xil', () => {
  const pd = PRESETS.thermometer;
  assert.deepEqual(pd.params, K.term.params);
  assert.equal(pd.formula, K.term.formula);
  assert.deepEqual(pd.directions, K.Tdirs);
  pd.points.forEach((pt, i) => {
    assert.deepEqual(pt.data.Te, K.term.points[i].Te);
    assert.deepEqual(pt.data.Tv, K.term.points[i].Tv);
    assert.deepEqual(pt.data.Ce, [K.term.points[i].Ce]);
    assert.equal(pt.patch['Immersion / heat conduction'].halfWidth, K.term.points[i].imm);
  });
});

// P20 (audit 21.11.2026, MET-04): namunaviy ma'lumot MATN sifatida — hisobotda aynan kiritilgandek ('100.00') chiqadi
test('sampleData qiymatlari matn (son ko\'rinishidagi satr); son sifatidagi qiymati o\'zgarmagan', () => {
  for (const [key, pd] of Object.entries(PRESETS)) {
    // ko'p nuqtali presetlar (gazoanalizator, termometr): ma'lumot `points[].data` da — etalon Excel kataklaridagi SONLAR
    // (tests/excel-cases.js bilan deepEqual); ularda sampleData = points[0].data, o'zgartirilmagan
    if (pd.points) continue;
    for (const p of pd.params) {
      for (const v of pd.sampleData[p]) {
        assert.equal(typeof v, 'string', `${key}.${p}: ${v}`);
        assert.match(v, /^-?\d+(\.\d+)?$/, `${key}.${p}: ${v}`);
      }
    }
  }
  assert.deepEqual(PRESETS.density.sampleData.V, ['100.02', '100.06', '99.98', '100.04', '100.00']);
  // dvigatel matnni songa aylantiradi: natija son kiritilgandagi bilan bit darajasida bir xil
  const pd = PRESETS.density;
  const asNumbers = Object.fromEntries(pd.params.map(p => [p, pd.sampleData[p].map(Number)]));
  const a = Calc.evaluate(stateFor(pd, pd.sampleData)), b = Calc.evaluate(stateFor(pd, asNumbers));
  for (const q of ['y', 'uc', 'nuEff', 'k', 'U']) assert.ok(Object.is(a[q], b[q]), q);
});

test('density hisobotida kuzatuv "100.00" ko\'rinishida chiqadi (oxirgi nollar yo\'qolmaydi)', () => {
  const { createSections } = require('../src/report/sections.js');
  const { escHtml } = require('../src/ui/escape.js');
  const pd = PRESETS.density;
  const st = { ...stateFor(pd, pd.sampleData), n: 5 };
  const S = createSections({ t: k => k, esc: escHtml });
  const html = S.dataTable(st);
  assert.match(html, /<td class="num">100\.00<\/td>/);
  assert.match(S.pointDetail(Calc.evaluate(st), st, '', null, undefined, {}), /<td class="num">100\.00<\/td>/);
});
