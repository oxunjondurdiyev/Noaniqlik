/* P05b: jadvalga qo'yiladigan / import qilinadigan matn tahlili (src/io/table-text.js) va CSV (src/io/csv.js).
   Xavfsizlik: formula ko'rinishidagi matn hech qachon songa aylanmaydi; CSV eksportda formula-inyeksiya zararsizlantiriladi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const T = require('../../src/io/table-text.js');
const C = require('../../src/io/csv.js');
const P = require('../../src/ui/regression/parse.js');

const FORMULAS = ['=1+1', '=HYPERLINK("http://example.test","x")', "=cmd|' /C calc'!A0", '=DDE("cmd";"/C calc";"!A0")', '@SUM(A1:A2)', '+1+1', '-2+3', '-A1', '+cmd|x!A0',
  '<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '0x10', 'Infinity', 'NaN', '1e999', '1,2,3', '__proto__', '１２'];

test('parseNumber: o\'nlik vergul, ishora, eksponenta; formula / HTML / boshqa matn — son emas (NaN)', () => {
  assert.equal(T.parseNumber('0,028'), 0.028);
  assert.equal(T.parseNumber(' 1 234,5 '), 1234.5);
  assert.equal(T.parseNumber('-0,125'), -0.125);
  assert.equal(T.parseNumber('+1.5'), 1.5);
  assert.equal(T.parseNumber('−0,5'), -0.5);          // U+2212
  assert.equal(T.parseNumber('1.5e-3'), 0.0015);
  assert.equal(T.parseNumber('.5'), 0.5);
  assert.equal(T.parseNumber(3.25), 3.25);
  assert.equal(T.parseNumber(''), null);
  assert.equal(T.parseNumber(null), null);
  for (const f of FORMULAS) assert.ok(Number.isNaN(T.parseNumber(f)), f);
  assert.ok(Number.isNaN(T.parseNumber('9'.repeat(50))));   // haddan tashqari uzun
});

test('regressiya parseri umumiy modulga ulangan (bitta amalga oshirish)', () => {
  assert.equal(P.parseNumber, T.parseNumber);
  assert.equal(P.parseGrid, T.parseGrid);
});

test('parseGrid: tab / nuqta-vergul / bo\'sh joy; vergul hech qachon ustun ajratuvchi emas', () => {
  assert.deepEqual(T.parseGrid('1,5\t2,5\r\n3\t4\r\n'), [['1,5', '2,5'], ['3', '4']]);
  assert.deepEqual(T.parseGrid('1,5;2,5\n3;4'), [['1,5', '2,5'], ['3', '4']]);
  assert.deepEqual(T.parseGrid('1,5  2,5\n3 4'), [['1,5', '2,5'], ['3', '4']]);
  assert.deepEqual(T.parseGrid('a\t\tb'), [['a', '', 'b']]);
  assert.deepEqual(T.parseGrid(''), []);
});

test('matchColumns: sarlavha nomi bo\'yicha taklif (aynan, yoki "m, g" / "V (cm³)" ko\'rinishida); __proto__ sarlavhasi xavfsiz', () => {
  const tg = [{ key: 'm' }, { key: 'V' }, { key: 'T', aliases: ['temp'] }];
  assert.deepEqual(T.matchColumns(['V (cm³)', 'm, g', 'Temp'], tg), [1, 0, 2]);
  assert.deepEqual(T.matchColumns(['x', 'y'], tg), [-1, -1, -1]);
  assert.deepEqual(T.matchColumns(['mass', 'V'], tg), [-1, 1, -1]);           // "mass" ≠ "m"
  assert.deepEqual(T.matchColumns(['__proto__', 'constructor', 'm'], tg), [2, -1, -1]);
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(({}).m, undefined);
});

test('applyMapping: tanlangan ustunlar; sarlavha tashlanadi; son bo\'lmagan katak bo\'sh va sanaladi; bo\'sh qator tashlanadi', () => {
  const grid = [['m', 'x', 'V'], [1.5, 'a', '2,5'], ['=1+1', null, 3], [null, null, null], ['0,25', '<script>', '-0,125']];
  const r = T.applyMapping(grid, [0, 2], { header: true });
  assert.deepEqual(r.columns, [[1.5, '', 0.25], [2.5, 3, -0.125]]);
  assert.equal(r.rows, 3);
  assert.equal(r.bad, 1);                                   // "=1+1" — son emas
  const d = T.applyMapping([[1, 'up'], [2, '↓'], [3, 'x']], [0, 1], { kinds: ['number', 'direction'] });
  assert.deepEqual(d.columns, [[1, 2, 3], ['↑', '↓', '']]);
  assert.equal(d.bad, 1);
  assert.deepEqual(T.applyMapping(grid, [-1, -1], { header: true }).rows, 0);
});

test('planTablePaste: Excel bloki → kataklar; boshlang\'ich katakdan; sarlavha nomlari bo\'yicha; ↑/↓ ustuni', () => {
  const cols = ['m', 'V', 'T'];
  let p = T.planTablePaste(T.parseGrid('1,5\t2,5\n3\t4'), cols, { startCol: 1, startRow: 2 });
  assert.deepEqual(p.cells, [{ row: 2, col: 1, value: 1.5 }, { row: 2, col: 2, value: 2.5 }, { row: 3, col: 1, value: 3 }, { row: 3, col: 2, value: 4 }]);
  assert.equal(p.lastRow, 3); assert.equal(p.bad, 0); assert.equal(p.header, false);
  // sarlavha qatori parametr nomlariga mos — tartibi boshqa bo'lsa ham to'g'ri ustunga
  p = T.planTablePaste(T.parseGrid('V\tzzz\tm\n100,02\t7\t99,83\n100,06\t8\t99,87'), cols, { startCol: 2, startRow: 0 });
  assert.equal(p.header, true);
  assert.deepEqual(p.cells, [{ row: 0, col: 1, value: 100.02 }, { row: 0, col: 0, value: 99.83 }, { row: 1, col: 1, value: 100.06 }, { row: 1, col: 0, value: 99.87 }]);
  // mos kelmaydigan sarlavha — tashlanadi, ustunlar ketma-ket
  p = T.planTablePaste(T.parseGrid('a\tb\n1\t2'), cols, {});
  assert.deepEqual(p.cells, [{ row: 0, col: 0, value: 1 }, { row: 0, col: 1, value: 2 }]);
  // yo'nalish ustuni
  p = T.planTablePaste(T.parseGrid('↑\t1,1\n↓\t1,2\n↑\t1,3'), cols, {});
  assert.deepEqual(p.dirs, [{ row: 0, value: '↑' }, { row: 1, value: '↓' }, { row: 2, value: '↑' }]);
  assert.deepEqual(p.cells.map(c => [c.col, c.value]), [[0, 1.1], [0, 1.2], [0, 1.3]]);
  // ortiqcha ustunlar tashlanadi; formula — bo'sh va sanaladi; qator chegarasi
  p = T.planTablePaste(T.parseGrid('1\t2\t3\t4\n=1+1\t5\t6\t7\n8\t9\t10\t11'), cols, { maxRows: 2 });
  assert.equal(p.cells.length, 6); assert.equal(p.bad, 1); assert.equal(p.truncated, true);
  assert.deepEqual(p.cells[3], { row: 1, col: 0, value: '' });
});

/* ── CSV ── */
test('parseCsv: RFC 4180 — qo\'shtirnoq, ichki qo\'shtirnoq, katak ichida ajratuvchi va yangi satr; ajratuvchi avtomatik; BOM', () => {
  const r = C.parseCsv('﻿name;value\r\n"a;b";"1,5"\r\n"say ""hi""";"line1\nline2"\r\n');
  assert.equal(r.ok, true); assert.equal(r.delimiter, ';');
  assert.deepEqual(r.rows, [['name', 'value'], ['a;b', '1,5'], ['say "hi"', 'line1\nline2']]);
  assert.equal(C.parseCsv('a,b\n1.5,2').delimiter, ',');
  assert.equal(C.parseCsv('a\tb\n1,5\t2').delimiter, '\t');
  assert.deepEqual(C.parseCsv('a;b\n1,5;2,5').rows, [['a', 'b'], ['1,5', '2,5']]);   // ';' bor — vergul o'nlik belgi
  assert.deepEqual(C.parseCsv('"1,5","2,5"').rows, [['1,5', '2,5']]);
  assert.deepEqual(C.parseCsv('a;b\n\n\n1;2\n').rows, [['a', 'b'], ['1', '2']]);       // bo'sh satrlar
  assert.deepEqual(C.parseCsv('"unclosed;1'), { ok: false, reason: 'bad_csv' });
  assert.deepEqual(C.parseCsv('a\u0000b'), { ok: false, reason: 'bad_csv' });
});

test('parseCsv: chegaralar tahlil davomida — oshsa darhol rad (qisman natija yo\'q)', () => {
  assert.deepEqual(C.parseCsv('1\n2\n3\n4', { maxRows: 3 }), { ok: false, reason: 'too_many_rows' });
  assert.equal(C.parseCsv('1\n2\n3', { maxRows: 3 }).ok, true);
  assert.deepEqual(C.parseCsv('1;2;3;4', { maxCols: 3 }), { ok: false, reason: 'too_many_cols' });
  assert.deepEqual(C.parseCsv('x'.repeat(50), { maxCell: 10 }), { ok: false, reason: 'cell_too_long' });
});

test('CSV import: formula bilan boshlangan kataklar MATN (hisoblanmaydi, son emas); −0,125 va +1.5 — son', () => {
  const r = C.parseCsv(FORMULAS.filter(f => !f.includes(';')).map(f => '"' + f.replace(/"/g, '""') + '";x').join('\n') + '\n-0,125;x\n+1.5;x\n');
  assert.equal(r.ok, true);
  const vals = r.rows.map(x => T.parseNumber(x[0]));
  assert.deepEqual(vals.slice(-2), [-0.125, 1.5]);
  assert.ok(vals.slice(0, -2).every(Number.isNaN));
  assert.equal(r.rows[0][0], '=1+1');                       // matn o'zgarmagan — "2" emas
});

test('CSV eksport: formula-inyeksiya zararsizlantiriladi (matn oldiga apostrof), son kataklariga tegilmaydi; BOM, CRLF', () => {
  const csv = C.toCsv([['=1+1', '+x', '-x', '@SUM(A1)', '\tTab', '\rCR'], [-0.125, 1.5, 'oddiy', "=cmd|' /C calc'!A0", null, true], ['a;b', 'q"q', ' bo\'sh ', '-0,5']]);
  assert.ok(csv.startsWith('﻿'));
  const lines = csv.slice(1).split('\r\n');
  assert.equal(lines[0], "'=1+1;'+x;'-x;'@SUM(A1);'\tTab;\"'\rCR\"");
  assert.equal(lines[1], "-0.125;1.5;oddiy;'=cmd|' /C calc'!A0;;TRUE");
  assert.equal(lines[2], '"a;b";"q""q";" bo\'sh ";\'-0,5');     // MATN "-0,5" ham zararsizlantiriladi; SON −0.125 — yo'q
  assert.equal(C.neutralize('safe'), 'safe');
  for (const s of ['=a', '+a', '-a', '@a', '\ta', '\ra']) assert.equal(C.neutralize(s), "'" + s);
  // qayta o'qilganda formula bo'lib qolmaydi
  const back = C.parseCsv(csv);
  assert.ok(back.rows.flat().every(c => !/^[=+@]/.test(c)));
  assert.throws(() => C.toCsv([[1]], { delimiter: ',', decimal: ',' }), /csv_delimiter_equals_decimal/);
});

test('CSV: sonlar aylanishi (eksport → import) aniq — yaxlitlanmaydi; uz/ru: ";" va o\'nlik vergul, en: "," va nuqta', () => {
  const nums = [0.1 + 0.2, -0.125, 1 / 3, 6.02214076e23, 1e-7, 123456789.12345679, 0, -0, 0.0016165807537309523, 2.0000024438996];
  for (const lang of ['uz', 'ru', 'en']) {
    const d = C.csvDialect(lang);
    assert.deepEqual(d, lang === 'en' ? { delimiter: ',', decimal: '.' } : { delimiter: ';', decimal: ',' });
    const back = C.parseCsv(C.toCsv([nums, ['matn, vergul bilan', 'a;b'], nums], d));
    assert.equal(back.ok, true);
    assert.equal(back.delimiter, d.delimiter);
    back.rows[0].forEach((c, i) => assert.ok(Object.is(T.parseNumber(c), nums[i] === 0 ? 0 : nums[i]) || T.parseNumber(c) === nums[i], `${lang}: ${c} ≠ ${nums[i]}`));
    assert.deepEqual(back.rows[1], ['matn, vergul bilan', 'a;b']);
  }
  assert.equal(C.csvCell(Infinity), '∞');
  assert.equal(C.csvCell(NaN), '');
});
