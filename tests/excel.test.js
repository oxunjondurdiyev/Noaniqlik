/* 8 ta etalon Excel nuqtasi (gazoanalizator 3 + termometr 5) — tests/verify-excel.js orqali.
   Zichlik nuqtasi (9-chi) va MC intervali (10-test) — P01 da (docs/PLAN.md).
   P02 hisoblash dvigateliga (src/js/calc.js) tegmaydi — bu test shuni kafolatlaydi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('8 ta etalon Excel nuqtasi o\'zgarmagan (verify-excel.js)', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'verify-excel.js')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const okLines = r.stdout.split('\n').filter(l => /^(GAZ|TERM) \d+ OK /.test(l));
  assert.equal(okLines.length, 8, r.stdout);
  assert.match(r.stdout, /ALL MATCH/);
});
