/* P13 §5: NIST Uncertainty Machine bilan mustaqil o'zaro tekshiruv — tests/crosscheck/num/.
   Natijalar kelguncha (status "pending") solishtiruv — todo; kirish fayllarining misollar bilan mosligi — majburiy. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const N = require('../crosscheck/num/lib.js');

const DIR = path.join(__dirname, '..', 'crosscheck', 'num');
const read = id => JSON.parse(fs.readFileSync(path.join(DIR, id + '.json'), 'utf8'));

test('NUM kirish fayllari: 5 ta vakil misol, har biri verified case dan avtomatik yaratilgan (raqamlar qo\'lda yozilmagan)', () => {
  assert.equal(N.SELECTION.length, 5);
  assert.deepEqual(fs.readdirSync(DIR).filter(f => /^num-.*\.json$/.test(f)).sort(), N.SELECTION.map(s => s.id + '.json').sort());
  for (const s of N.SELECTION) {
    const c = N.loadCase(s.case), f = read(s.id);
    assert.equal(c.status, 'verified', s.case);
    assert.equal(f.case, c.id);
    assert.ok(['pending', 'owner-run'].includes(f.status), f.status);
    assert.deepEqual(f.num, { ...JSON.parse(JSON.stringify(N.inputsFor(c))), nrep: 1000000 }, `${s.id}: fayl misoldan farq qiladi — node tests/tools/gen-num-inputs.js`);
    if (f.status === 'pending') assert.equal(f.results, null, `${s.id}: pending holatda natija bo'lmaydi`);
    else assert.ok(f.results && f.results.numVersion && f.results.date, `${s.id}: owner-run uchun numVersion va date kerak`);
  }
});

test('NUM kirishlari mazmunan to\'g\'ri: taqsimot parametrlaridan tiklangan u(x_i) dvigatel byudjetiga teng', () => {
  const E = require('../../src/engine/index.js');
  for (const s of N.SELECTION) {
    const c = N.loadCase(s.case), r = E.evaluate(c.modelSpec), inp = N.inputsFor(c);
    const byParam = {};
    for (const v of inp.inputs) {
      const p = v.name.replace(/_b\d+$/, '');
      // standart noaniqlik: Gauss — sd; to'g'ri burchakli — yarim kenglik / √3; t — masshtab (byudjetdagi u; dispersiya emas)
      const u = v.distribution === 'gaussian' ? v.sd : v.distribution === 'rectangular' ? (v.upper - v.lower) / 2 / Math.sqrt(3) : v.scale;
      byParam[p] = (byParam[p] || 0) + u * u;
    }
    for (const x of r.inputs) assert.ok(Math.abs(Math.sqrt(byParam[x.name]) - x.u) <= 1e-12 * Math.max(1, x.u), `${s.id}.${x.name}`);
    for (const k of inp.correlations) assert.ok(Math.abs(k.r) <= 1, `${s.id}: |r| ≤ 1`);
  }
  assert.ok(Math.abs(N.inputsFor(N.loadCase('jcgm101/jcgm101-9-4-mcm-x001-r09')).correlations[0].r - 0.9) < 1e-12);
});

test('solishtiruv qoidasi (compare): ko\'rsatilgan raqamlar soni + MCM tarqoqligi; noto\'g\'ri natija o\'tmaydi', () => {
  assert.equal(N.parseShown('0.0754').value, 0.0754);
  assert.ok(Math.abs(N.parseShown('0.0754').half - 0.00005) < 1e-18);
  assert.ok(Math.abs(N.parseShown('1.2e-4').half - 0.05e-4) < 1e-18);
  assert.equal(N.parseShown('12').half, 0.5);
  assert.equal(N.parseShown('abc'), null);
  const c = N.loadCase('jcgm101/jcgm101-9-3-mcm');
  const p = N.platformValues(c, 200000);
  // platformaning o'z natijasi 4 qiymatli raqamgacha yozilsa — o'tadi
  const fake = { nrep: 200000, intervalType: 'shortest', 'gum.y': p['gum.y'].toPrecision(6), 'gum.u': p['gum.u'].toPrecision(4), 'mc.mean': p['mc.mean'].toPrecision(6), 'mc.sd': p['mc.sd'].toPrecision(4), 'mc.low': p['mc.low'].toPrecision(5), 'mc.high': p['mc.high'].toPrecision(5) };
  const rows = N.compare(fake, p, fake.nrep);
  assert.equal(rows.length, 6);
  assert.ok(rows.every(r => r.ok), JSON.stringify(rows.filter(r => !r.ok)));
  // 5 % ga siljitilgan standart og'ish — o'tmaydi
  const bad = N.compare({ ...fake, 'mc.sd': (p['mc.sd'] * 1.05).toPrecision(4) }, p, fake.nrep);
  assert.equal(bad.find(r => r.q === 'mc.sd').ok, false);
  assert.equal(N.compare({ 'gum.u': 'x' }, p, 1e6)[0].ok, false);
});

for (const s of N.SELECTION) {
  const f = read(s.id);
  if (f.status !== 'owner-run') {
    test(`[pending] ${s.id} — ${f.case}: NUM natijalari bilan solishtirish`, { todo: 'NUM natijalarini egasi kiritadi (tests/crosscheck/num/README.md)' }, () => {
      assert.fail('natija kutilmoqda');
    });
    continue;
  }
  test(`[owner-run] ${s.id} — ${f.case}: NUM natijalari bilan solishtirish`, () => {
    const rows = N.compare(f.results, N.platformValues(N.loadCase(s.case), Number(f.results.nrep) || 1e6), f.results.nrep);
    assert.ok(rows.length > 0, 'solishtiriladigan kattalik yo\'q');
    for (const r of rows) assert.ok(r.ok, `${r.q}: NUM ${r.num}, platforma ${r.platform}, |Δ| = ${Math.abs(r.num - r.platform)}, tolerans ${r.tol}`);
  });
}
