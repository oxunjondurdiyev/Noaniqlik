/* P13: regressiya nazorati (scripts/cases-snapshot.js) va solishtirishning sof qismi (tests/crossbrowser/core.js).
   To'liq nusxa (barcha misollar, ≈ 40 s) bu yerda olinmaydi — u PR dan oldin qo'lda / CI da ishlatiladi; bu test mexanizmni tekshiradi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../crossbrowser/core.js');
const S = require('../../scripts/cases-snapshot.js');
const E = require('../../src/engine/index.js');
const { roundResult } = require('../../src/report/rounding.js');

test('encode / leaves: sonlar yo\'qotishsiz (JSON orqali aynan tiklanadi), NaN / ±∞ / −0 saqlanadi', () => {
  const v = { a: 0.1 + 0.2, b: [1e-300, -0, NaN, Infinity, -Infinity], c: 'x', d: true, e: null, f: undefined, g: () => 1, t: new Float64Array([1.5, 2.5]) };
  const back = new Map(C.leaves(JSON.parse(JSON.stringify(C.encode(v)))));
  assert.ok(Object.is(back.get('a'), 0.30000000000000004));
  assert.ok(Object.is(back.get('b[1]'), -0) && Number.isNaN(back.get('b[2]')) && back.get('b[3]') === Infinity && back.get('b[4]') === -Infinity);
  assert.equal(back.get('c'), 'x');
  assert.equal(back.get('t[1]'), 2.5);
  assert.ok(!back.has('f') && !back.has('g'));
});

test('diffTrees: bit darajasidagi farq, nisbiy chegara, tuzilma farqi, e\'tiborsiz yo\'llar', () => {
  const a = C.encode({ y: 1, u: 0.5, engineVersion: '2.10.0', list: [1, 2], s: 'x' });
  assert.equal(C.diffTrees(a, C.encode({ y: 1, u: 0.5, engineVersion: '2.10.0', list: [1, 2], s: 'x' })).equal, true);
  const d = C.diffTrees(a, C.encode({ y: 1 + 2 * Number.EPSILON, u: 0.5, engineVersion: '2.10.0', list: [1, 2], s: 'x' }));
  assert.equal(d.equal, false);
  assert.equal(d.differing, 1);
  assert.ok(d.maxRel > 0 && d.maxRel < 1e-14 && d.maxRelPath === 'y');
  assert.equal(C.diffTrees(a, C.encode({ y: 1 + 2 * Number.EPSILON, u: 0.5, engineVersion: '2.10.0', list: [1, 2], s: 'x' }), { rel: 1e-14 }).equal, true);
  assert.equal(C.diffTrees(a, C.encode({ y: 1, u: 0.5, engineVersion: '9.9.9', list: [1, 2], s: 'x' }), { ignore: p => /engineVersion$/.test(p) }).equal, true);
  assert.equal(C.diffTrees(a, C.encode({ y: 1, u: 0.5, engineVersion: '2.10.0', list: [1, 2, 3], s: 'x' })).equal, false);
  assert.equal(C.diffTrees(a, C.encode({ y: 1, u: 0.5, engineVersion: '2.10.0', list: [1, 2], s: 'y' })).structural.length, 1);
  assert.equal(C.diffTrees(C.encode({ v: -0 }), C.encode({ v: 0 })).equal, false, '−0 va 0 — bit darajasida farq');
  assert.equal(C.diffTrees(C.encode({ v: NaN }), C.encode({ v: NaN })).equal, true);
});

const pick = id => require('../cases/lib.js').loadCases().find(c => c.id === id);

test('snapshotCase: natija takrorlanadi (bir xil kod → bit darajasida bir xil); hisobot ko\'rinishi report qatlami bilan mos', () => {
  for (const id of ['excel-gas-p2', 'jcgm100-h1', 'jcgm102-9-2-2-guf', 'nordtest-tr537-nh4n', 'jcgm100-h3']) {
    const c = pick(id);
    const a = C.snapshotCase(E, roundResult, c), b = C.snapshotCase(E, roundResult, c);
    assert.ok(!a.error, `${id}: ${a.error}`);
    assert.equal(JSON.stringify(a), JSON.stringify(b), id);
  }
  // 9 etalon nuqtaning biri: yaxlitlangan ko'rinish Excel katagidagi qiymat bilan
  const c = pick('excel-gas-p2'), s = C.snapshotCase(E, roundResult, c);
  assert.equal(Number(s.display['.U']), c.expectedDisplay.U.value);
  assert.equal(Number(s.display['.y']), c.expectedDisplay.y.value);
  assert.match(s.display['.k'], /^\d+\.\d{2}$/);
  // Monte-Karlo: interval uchlari va o'rtacha — GUM natijasidan bir xona ortiq
  const mc = C.displayOf({ mean: 0.0179, low: -0.0111, high: 0.0469, symLow: -0.0111, symHigh: 0.0469, gumU: 0.029 }, roundResult);
  assert.deepEqual(mc, { '.mean': '0.0179', '.low': '-0.0111', '.high': '0.0469', '.symLow': '-0.0111', '.symHigh': '0.0469' });
  // ishga tushmagan misol — xato matni bilan (tashlab ketilmaydi)
  assert.match(C.snapshotCase(E, roundResult, { id: 'x', run: { method: 'path' }, modelSpec: { format: 'uc-sampling/1' } }).error, /^x: /);
});

test('cases-snapshot compare: bir xil nusxalar — teng; bitta son o\'zgarsa — misol va yo\'l ko\'rsatiladi; engineVersion e\'tiborsiz', () => {
  const snap = v => ({ format: 'uc-cases-snapshot/1', engineVersion: v, cases: ['excel-gas-p2', 'jcgm100-h1'].map(id => ({ status: 'verified', ...C.snapshotCase(E, roundResult, pick(id)) })) });
  const a = snap('2.10.0'), b = JSON.parse(JSON.stringify(snap('2.11.0')));
  for (const c of b.cases) c.result.engineVersion = '2.11.0';
  const same = S.compare(a, b);
  assert.deepEqual([same.equal, same.total, same.identical], [true, 2, 2]);
  b.cases[0].result.uc = b.cases[0].result.uc * (1 + 4 * Number.EPSILON);
  const diff = S.compare(a, b);
  assert.equal(diff.equal, false);
  assert.deepEqual(diff.rows.filter(r => !r.equal).map(r => [r.id, r.maxRelPath]), [[b.cases[0].id, 'result.uc']]);
  b.cases.pop();
  assert.equal(S.compare(a, b).rows.find(r => r.note).note, 'faqat birinchisida');
  // yaxlitlangan ko'rinish o'zgarsa ham ushlanadi
  const c2 = JSON.parse(JSON.stringify(a));
  c2.cases[0].display['.U'] = '9.9';
  assert.equal(S.compare(a, c2).equal, false);
});
