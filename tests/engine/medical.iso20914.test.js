/* P18: M9 — ISO/TS 20914:2019 (E) Annex A va Annex C ishlangan misollari (G1–G11).
   Kutilgan qiymatlar FAQAT tests/fixtures/iso20914/*.json dan (egasi bergan, standart jadvallaridan ko'chirilgan va mustaqil qayta
   hisoblangan — 20.11.2026). Standart matni repoda yo'q (pullik). Tolerans — manbada oxirgi ko'rsatilgan xonaning 1/2 birligi;
   qiymat yoki tolerans "o'tsin" deb o'zgartirilmaydi — mos kelmasa farq egasiga yoziladi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../../src/engine/index.js');

const DIR = path.join(__dirname, '../fixtures/iso20914');
const IDS = Array.from({ length: 11 }, (_, i) => 'G' + (i + 1));
const load = id => JSON.parse(fs.readFileSync(path.join(DIR, id + '.json'), 'utf8'));
const pick = (o, p) => p.split('.').reduce((a, k) => (a === null || a === undefined ? undefined : a[k]), o);

test('fixture\'lar: G1–G11 to\'liq, manba va band ko\'rsatilgan', () => {
  assert.deepEqual(fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort(), IDS.map(i => i + '.json').sort());
  for (const id of IDS) {
    const f = load(id);
    assert.equal(f.id, id); assert.equal(f.source, 'ISO/TS 20914:2019'); assert.ok(f.clause && f.expected.length && f.tolerance, id);
    assert.ok(f.input || f.runs, id);
  }
});

/** @returns {{ok:boolean, text:string}}  kutilgan / olingan / nisbiy farq */
function check(r, x) {
  const got = pick(r, x.path) * (x.factor || 1);
  return { ok: Number.isFinite(got) && Math.abs(got - x.value) <= x.tol,
    text: `${x.path}${x.factor ? ' × ' + x.factor : ''}: kutilgan ${x.value} ± ${x.tol}, olingan ${got}, nisbiy farq ${((got - x.value) / x.value).toExponential(2)}` };
}

for (const id of IDS) {
  const f = load(id);
  // Ma'lum farqlar (DISCREPANCIES.md): fixture qiymati va toleransi o'zgartirilmaydi — qator todo-test sifatida ko'rinib turadi
  for (const x of f.expected.filter(x => x.discrepancy)) {
    test(`${id} ${x.path} — ${x.discrepancy} (ma'lum farq, tests/cases/DISCREPANCIES.md)`, { todo: `${x.discrepancy} — egasi javobini kutadi` }, t => {
      const c = check(E.evaluate((f.runs || { main: f.input })[x.run || Object.keys(f.runs || { main: 1 })[0]]), x);
      if (c.ok) t.diagnostic(`${x.discrepancy} endi mos keladi — fixture'dagi discrepancy belgisini olib tashlang`);
      assert.ok(c.ok, c.text);
    });
  }
  test(`${id} — ISO/TS 20914:2019 ${f.clause}: ${f.title}`, () => {
    const runs = f.runs || { main: f.input };
    const res = {};
    for (const [name, spec] of Object.entries(runs)) {
      res[name] = E.evaluate(spec);
      assert.equal(res[name].error, undefined, `${id}/${name}: ${res[name].error} ${res[name].detail || ''}`);
      assert.equal(res[name].approachRef, 'ISO/TS 20914:2019');
      assert.equal(res[name].unverified, undefined);
      assert.ok(!res[name].warnings.some(w => w.code === 'medical_unverified' || w.code === 'medical_no_source_example'), `${id}/${name}: manbasiz funksiya ishlatilgan`);
    }
    const of = x => res[x.run || Object.keys(runs)[0]];
    for (const x of f.expected.filter(x => !x.discrepancy)) {
      const c = check(of(x), x);
      assert.ok(c.ok, `${id} ${x.run || ''} ${c.text}`);
    }
    for (const x of f.equals || []) assert.deepEqual(pick(of(x), x.path), x.value, `${id} ${x.path}`);
    const codes = of({}).warnings.map(w => w.code);
    for (const c of (f.warnings || {}).absent || []) assert.ok(!codes.includes(c), `${id}: ${c} chiqmasligi kerak`);
    for (const c of (f.warnings || {}).present || []) assert.ok(codes.includes(c), `${id}: ${c} chiqishi kerak`);
  });
}
