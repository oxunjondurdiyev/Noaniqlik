/* Hisobot qatlamida yaxlitlash (src/report/rounding.js) — egasi qarorlari (CLAUDE.md, PLAN 7-javob).
   Ref: ILAC P14:09/2020 §5.4 (PDF hali yo'q — tekshirilmagan); JCGM 100:2008 §7.2.6. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { roundResult, roundHalfAway, roundUpAway } = require('../../src/report/rounding.js');

test('egasi qarori: U yuqoriga yaxlitlanganda ham 2 qiymatli raqam — 0,0999 → 0,10 (0,100 emas)', () => {
  const r = roundResult(0.5, 0.0999, 'up');
  assert.equal(r.Uround, 0.1);
  assert.equal(r.digits, 2);
  assert.equal(r.resultText, '0.50 ± 0.10');
  // odatiy rejimda ham
  assert.equal(roundResult(0.5, 0.0999, false).resultText, '0.50 ± 0.10');
  assert.equal(roundResult(0.5, 0.0995, false).resultText, '0.50 ± 0.10');
  assert.equal(roundResult(12.3, 9.96, 'up').resultText, '12 ± 10');
  assert.equal(roundResult(0.123, 0.0991, 'up').resultText, '0.12 ± 0.10');
});

test('egasi qarori: y — round half away from zero (Excel ROUND): −0,125 → −0,13', () => {
  // U = 0,12 → 2 xona; y = −0,125 → −0,13 (P00 da Math.round → −0,12)
  assert.equal(roundResult(-0.125, 0.12, false).yround, -0.13);
  assert.equal(roundResult(-0.125, 0.12, false).resultText, '-0.13 ± 0.12');
  assert.equal(roundResult(0.125, 0.12, 'up').resultText, '0.13 ± 0.12');
  // U = 0,034 → 3 xona: y o'zgarmaydi
  assert.equal(roundResult(-0.125, 0.034, false).resultText, '-0.125 ± 0.034');
  assert.equal(roundHalfAway(-0.125, 2), -0.13);
  assert.equal(roundHalfAway(1.005, 2), 1.01);      // ikkilik ko'rinish xatosi tuzatiladi (Excel kabi)
  assert.equal(roundHalfAway(-2.5, 0), -3);
  assert.equal(roundHalfAway(2.5, 0), 3);
  assert.equal(roundHalfAway(1234.5, -1), 1230);
});

test('ROUNDUP: |U| bo\'yicha yuqoriga, aniq qiymat o\'zgarmaydi', () => {
  assert.equal(roundUpAway(0.4653, 2), 0.47);
  assert.equal(roundUpAway(0.47, 2), 0.47);
  assert.equal(roundUpAway(0.0061796, 4), 0.0062);
  assert.equal(roundUpAway(0.1 + 0.2, 1), 0.3);   // 0.30000000000000004 → 0,3 (0,4 emas)
});

test('9 ta Excel nuqtasining ko\'rinishi (expectedDisplay) — Excel kataklaridagi kabi', () => {
  const fs = require('node:fs'), path = require('node:path');
  const E = require('../../src/engine/index.js');
  const dir = path.join(__dirname, '..', 'cases', 'excel');
  const files = fs.readdirSync(dir).filter(f => /^excel-(density|gas-p\d|term-p\d)\.json$/.test(f));
  assert.equal(files.length, 9);
  for (const f of files) {
    const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const r = E.evaluate(c.modelSpec);
    const rr = roundResult(r.y, r.U, r.roundUp);
    assert.equal(rr.Uround, c.expectedDisplay.U.value, `${c.id}: U (${c.expectedDisplay.U.ref})`);
    assert.equal(rr.yround, c.expectedDisplay.y.value, `${c.id}: y (${c.expectedDisplay.y.ref})`);
  }
});

test('katta U: o\'nliklar xonasigacha (decimals manfiy), digits ≥ 0', () => {
  const r = roundResult(50000838, 93, false);
  assert.equal(r.resultText, '50000838 ± 93');
  const b = roundResult(1234.4, 1234, false);
  assert.equal(b.decimals, -2);
  assert.equal(b.Uround, 1200);
  assert.equal(b.yround, 1200);
  assert.equal(b.digits, 0);
});

test('U = 0: yaxlitlanmaydi, 6 xona (dvigatel zero_u ogohlantiradi)', () => {
  const r = roundResult(0.25, 0, false);
  assert.equal(r.Uround, 0);
  assert.equal(r.digits, 6);
});
