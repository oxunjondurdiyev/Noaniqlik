/* P12: src/io/quality.js — PT raundlari importi (.csv panjarasi; formulalar bajarilmaydi), CSV / JSON eksport. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../../src/io/quality.js');
const I = require('../../src/io/import.js');
const E = require('../../src/engine/index.js');

const CSV = [
  'Raund;Sana;Sxema;Natija;x_pt;σ_pt;u(x_pt);U(x);U(x_pt);Ijrochi',
  'PT-01;10.01.2026;Suv-1;10,6;10,0;0,25;0,05;0,30;0,10;Ism Familiya',
  'PT-02;2026-04-12;Suv-2;=1+1;10,0;0,25;;;;',
  'PT-03;2026-07-01;Suv-3;9,7;10,0;0,25;;;;',
  ';;;;;;;;;',
].join('\n');

test('import: sarlavha (uz) → raundlar; o\'nlik vergul; sana; formula — yaroqsiz qator (bajarilmaydi); U va u farqlanadi; ijrochi olinmaydi', () => {
  const t = I.csvTable(CSV);
  assert.equal(t.ok, true);
  const r = Q.ptRoundsFromGrid(t.rows);
  assert.equal(r.ok, true);
  assert.deepEqual([r.rows, r.bad], [2, 1]);
  assert.deepEqual(r.rounds[0], { id: 'PT-01', date: '2026-01-10', scheme: 'Suv-1', x: 10.6, xpt: 10, sigmaPt: 0.25, ux: '', uxpt: 0.05, Ux: 0.3, Uxpt: 0.1 });
  assert.ok(!JSON.stringify(r.rounds).includes('Familiya'));
  const pt = E.evaluate({ format: 'uc-pt/1', rounds: r.rounds });
  assert.equal(pt.rounds[0].primary, 'En');
  assert.equal(Q.ptRoundsFromGrid([['a', 'b'], [1, 2]]).reason, 'no_header');
  assert.equal(Q.ptRoundsFromGrid([[1, 2]]).reason, 'no_header');
});

test('eksport CSV: ballar va baho, matn zararsizlantirilgan; JSON: xesh bilan, o\'zgartirilsa rad etiladi', async () => {
  const series = { id: 'pt:1', name: 'Pb', unit: 'mg/L', rounds: [{ id: '=CMD()', x: 10.6, xpt: 10, sigmaPt: 0.25 }] };
  const res = E.evaluate({ format: 'uc-pt/1', rounds: series.rounds });
  const rows = Q.ptSeriesToRows(series, res);
  assert.equal(rows[1][0][0], "'");
  assert.equal(rows[1][rows[0].indexOf('verdict')], 'questionable');
  const doc = await Q.buildQualityDoc({ pt: [series], validation: [{ id: 'val:1', tests: [{ id: 'g', type: 'grubbs', values: [1, 2, 3] }] }] });
  const text = Q.serializeQualityDoc(doc);
  const back = await Q.parseQualityDoc(text);
  assert.equal(back.ok, true);
  assert.equal(back.pt[0].rounds[0].x, 10.6);
  assert.equal((await Q.parseQualityDoc(text.replace('10.6', '10.7'))).reason, 'bad_hash');
  assert.equal((await Q.parseQualityDoc('{')).reason, 'bad_json');
});
