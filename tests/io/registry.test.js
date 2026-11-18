/* P11: src/io/registry.js — reestr importi (.xlsx / .csv panjarasi) va 'uc-registry/1' JSON eksport / import. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../../src/io/registry.js');
const I = require('../../src/io/import.js');
const E = require('../../src/engine/index.js');

const CSV = [
  'Nomi;Zavod raqami;Birlik;Sertifikat;Kalibrlovchi tashkilot;Akkreditatsiya;Kalibrlash sanasi;Amal qilish muddati;Nuqta;Tuzatma;U;k',
  'Etalon termometr;N-1;°C;C-2024;Metrologiya instituti;UZ.CAL.001;01.11.2024;01.11.2025;0;0,02;0,02;2',
  'Etalon termometr;N-1;°C;C-2024;Metrologiya instituti;UZ.CAL.001;01.11.2024;01.11.2025;100;0,05;0,03;2',
  'Etalon termometr;N-1;°C;C-2025;Metrologiya instituti;UZ.CAL.001;2025-11-01;2026-11-01;0;0,03;0,02;2',
  'Etalon tarozi toshi;M-7;g;C-9;=HYPERLINK("x");;2025-01-10;2026-01-10;;;0,0005;',
  ';;;;;;;;;;0,1;2',
  'U siz qator;Z;;;;;;;;;;',
].join('\n');

test('jadval importi: qatorlar kartochka va kalibrlashlarga guruhlanadi; o\'nlik vergul; sana DD.MM.YYYY; yaroqsiz qator tashlanadi', () => {
  const t = I.csvTable(CSV);
  assert.equal(t.ok, true);
  const r = R.standardsFromGrid(t.rows);
  assert.equal(r.ok, true);
  assert.deepEqual([r.standards.length, r.rows, r.bad], [2, 4, 2]);
  const a = r.standards[0];
  assert.deepEqual([a.name, a.serial, a.unit, a.calibrations.length], ['Etalon termometr', 'N-1', '°C', 2]);
  assert.deepEqual(a.calibrations[0], { certificate: 'C-2024', calibrator: 'Metrologiya instituti', accreditation: 'UZ.CAL.001', route: '', traceability: '', date: '2024-11-01', validUntil: '2025-11-01',
    points: [{ x: 0, correction: 0.02, U: 0.02, k: 2, nu: null }, { x: 100, correction: 0.05, U: 0.03, k: 2, nu: null }] });
  assert.equal(E.currentCalibration(a).certificate, 'C-2025');
  const b = r.standards[1];
  assert.equal(b.calibrations[0].calibrator, '=HYPERLINK("x")');         // formula BAJARILMAYDI — matn bo'lib qoladi
  assert.deepEqual(b.calibrations[0].points[0], { x: null, correction: null, U: 0.0005, k: null, nu: null });   // k yo'q — 2 deb faraz qilinmaydi
  assert.equal(E.sourceFromStandard(b, {}).component.kRequired, true);
});

test('jadval importi: sarlavhasiz yoki majburiy ustunsiz — rad etiladi; chegaralar src/io/import.js LIMITS bo\'yicha', () => {
  assert.equal(R.standardsFromGrid([[1, 2, 3]]).reason, 'no_header');
  const noU = R.standardsFromGrid([['Nomi', 'Sertifikat'], ['A', 'C']]);
  assert.deepEqual([noU.ok, noU.reason, noU.detail], [false, 'no_header', 'U']);
  assert.equal(R.standardsFromGrid([['Nomi', 'U'], ['', '']]).reason, 'no_rows');     // bo'sh qatorlar tashlanadi
  assert.equal(R.standardsFromGrid([['Nomi', 'U'], ['A', 'abc']]).reason, 'no_rows');
  const big = ['Nomi;U'].concat(Array.from({ length: I.LIMITS.maxRows + 1 }, (_, i) => `E${i};0,1`)).join('\n');
  assert.equal(I.csvTable(big).reason, 'too_many_rows');
  assert.equal(I.precheck({ name: 'reestr.xlsx', size: I.LIMITS.maxBytes + 1 }).reason, 'too_large');
  assert.equal(I.precheck({ name: 'reestr.pdf', size: 10 }).reason, 'unsupported_type');
});

test('uc-registry/1: eksport → import bir xil; xesh buzilsa rad etiladi; noma\'lum (shaxsiy) maydonlar tashlanadi', async () => {
  const standards = R.standardsFromGrid(I.csvTable(CSV).rows).standards.map((s, i) => ({ ...s, id: 'std:' + i, version: 2, operatorName: 'Ism Familiya' }));
  const cmc = { id: 'cmc:table', version: 3, rows: [{ id: 'r1', quantity: 'Harorat', min: 0, max: 100, unit: '°C', type: 'linear', a: 0.05, b: 0.0005, method: 'T-01', note: '' }] };
  const qc = [{ id: 'qc:1', name: 'NH4-N', unit: 'µg/L', type: 'imr', target: { mean: 200, s: 3 }, points: [{ date: '2026-11-18', run: 'a', values: [201.2] }, { date: 'x', values: ['abc'] }] }];
  const doc = await R.buildRegistryDoc({ standards, cmc, qc });
  assert.equal(doc.format, 'uc-registry/1');
  const text = R.serializeRegistryDoc(doc);
  assert.ok(!text.includes('Ism Familiya'));
  const back = await R.parseRegistryDoc(text);
  assert.equal(back.ok, true);
  assert.deepEqual(back.standards.map(s => s.id), ['std:0', 'std:1']);
  assert.deepEqual(back.cmc.rows, cmc.rows);
  assert.equal(back.qc[0].points.length, 1);
  // qayta eksport — bit darajasida bir xil
  assert.equal(R.serializeRegistryDoc(await R.buildRegistryDoc({ standards: back.standards.map(s => ({ ...s, version: 2 })), cmc: { ...back.cmc, version: 3 }, qc: back.qc })), text);
  assert.equal((await R.parseRegistryDoc(text.replace('C-2024', 'C-2099'))).reason, 'bad_hash');
  assert.equal((await R.parseRegistryDoc('{')).reason, 'bad_json');
  assert.equal((await R.parseRegistryDoc('{"format":"uc-calc/1"}')).reason, 'bad_format');
  assert.equal((await R.parseRegistryDoc('x'.repeat(R.MAX_REGISTRY_BYTES + 1))).reason, 'too_large');
});

test('jadval eksporti: matn zararsizlantiriladi (formula inyeksiyasi), sonlar yaxlitlanmaydi; eksport → import → bir xil kartochka', () => {
  const s = R.standardsFromGrid(I.csvTable(CSV).rows).standards;
  const rows = R.standardsToRows(s);
  assert.deepEqual(rows[0], R.STANDARD_COLUMNS.map(c => c.key));
  assert.equal(rows[4][7], "'=HYPERLINK(\"x\")");
  assert.equal(rows[1][15], 0.02);
  const again = R.standardsFromGrid(rows.slice(0, 4));
  assert.deepEqual(again.standards[0], s[0]);
});

test('parseDateCell', () => {
  assert.deepEqual(['2026-11-18', '18.11.2026', '1/2/2026', 'ertaga', ''].map(R.parseDateCell), ['2026-11-18', '2026-11-18', '2026-02-01', '', '']);
});
