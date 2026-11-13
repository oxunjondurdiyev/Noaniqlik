/* Manbadan olingan test misollari (tests/cases/**.json) — PLAN P01.
   • status "verified"  — majburiy; har bir kattalik alohida subtest.
     knownDiscrepancies dagi kattaliklar "todo" (yiqilsa ham run'ni yiqitmaydi,
     sababi tests/cases/DISCREPANCIES.md da). Bunday kattalik o'tib qolsa — xabar beriladi.
   • "unverified" / "pending" — ishga tushirilmaydi yoki xato bermaydi; hisobotda ko'rinadi.
   Hozirgi dvigatelda yiqilgan verified testlar TUZATILMAYDI (PLAN P01) — egasiga ro'yxat. */
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadCases, checks, compare, Calc } = require('./cases/lib.js');

const cases = loadCases();

test('tests/cases: identifikatorlar yagona, majburiy maydonlar bor', () => {
  const ids = new Set();
  for (const c of cases) {
    assert.ok(c.id && !ids.has(c.id), `takror yoki bo'sh id: ${c.file}`);
    ids.add(c.id);
    assert.ok(['verified', 'unverified', 'pending'].includes(c.status), `${c.id}: status`);
    assert.ok(c.title && c.domain && c.source && c.source.doc, `${c.id}: title/domain/source.doc`);
    if (c.status === 'verified') {
      assert.ok(c.modelSpec && c.modelSpec.state, `${c.id}: modelSpec`);
      for (const [q, e] of Object.entries({ ...c.expected, ...c.expectedDisplay })) {
        assert.ok(e.ref, `${c.id}.${q}: manba havolasi (ref) yo'q`);
      }
    }
    if (c.status === 'pending') assert.ok(c.enabledIn, `${c.id}: pending uchun enabledIn kerak`);
    for (const [q, d] of Object.entries(c.knownDiscrepancies || {})) {
      assert.match(d, /^D-\d{2}$/, `${c.id}.${q}: DISCREPANCIES.md ID`);
    }
  }
});

for (const c of cases) {
  if (c.status !== 'verified') {
    test(`[${c.status}] ${c.id} — ${c.title}`, { skip: `${c.status}${c.enabledIn ? ' → ' + c.enabledIn : ''}: ${c.statusReason || ''}` }, () => {});
    continue;
  }
  describe(`[verified] ${c.id} — ${c.title}`, () => {
    let res;
    try { res = checks(c); } catch (e) { test('ishga tushirish', () => { throw e; }); return; }
    for (const ch of res.list) {
      const name = `${ch.q} (${ch.ref})`;
      const cmp = compare(ch.q, ch.actual, ch.expected, ch.tol);
      if (ch.known) {
        test(name, { todo: `${ch.known} — ma'lum farq (DISCREPANCIES.md)` }, (t) => {
          if (cmp.ok) t.diagnostic(`${ch.known} endi mos keladi — knownDiscrepancies dan olib tashlang`);
          assert.ok(cmp.ok, cmp.msg);
        });
      } else {
        test(name, () => assert.ok(cmp.ok, cmp.msg));
      }
    }
    for (const w of c.expectedWarnings || []) {
      test(`ogohlantirish: ${w}`, () => assert.ok(res.warnings.includes(w), `${w} yo'q: [${res.warnings}]`));
    }
  });
}

test('ENGINE_VERSION mavjud (semver)', () => {
  assert.match(String(Calc.ENGINE_VERSION), /^\d+\.\d+\.\d+$/);
});
