/* Etalon Excel nuqtalari (hozircha 8 ta assert: gazoanalizator 3 + termometr 5;
   zichlik nuqtasi P01 da qo'shiladi). tests/verify-excel.js ni o'zgartirmasdan
   npm test orqali ishga tushiradi. P02 dvigatelga tegmaydi — bu test o'zgarmasligi shart. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('etalon Excel nuqtalari o\'zgarmagan (tests/verify-excel.js)', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'verify-excel.js')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /ALL MATCH/);
  assert.equal((r.stdout.match(/^(GAZ|TERM) \d+ OK /gm) || []).length, 8);
});
