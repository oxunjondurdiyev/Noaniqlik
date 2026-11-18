#!/usr/bin/env node
/* P06 — Monte-Karlo natijalarining urug'dan-urug'ga tarqoqligini o'lchash (toleranslarni asoslash uchun).
   tests/cases/jcgm101/jcgm101-9-4-mcm-*.json va jcgm101-9-5-mcm.json dagi `tolerance.*.reason` shu skript chiqishiga tayanadi.
   Ishga tushirish: node tests/tools/mc-scatter.js   (≈ 1–2 daqiqa). npm test tarkibiga kirmaydi. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const E = require('../../src/engine/index.js');
const load = id => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'cases', id + '.json'), 'utf8'));
const stat = a => { const m = a.reduce((x, y) => x + y, 0) / a.length; return [m, Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1))]; };
const line = (label, rs, keys, scale, digits) => console.log(label.padEnd(12), keys.map(q => `${q} ${stat(rs.map(r => r[q] * scale)).map(v => v.toFixed(digits)).join(' ± ')}`).join(' | '));

const c95 = load('jcgm101/jcgm101-9-5-mcm');
const rows = [];
for (let s = 1; s <= 12; s++) rows.push(E.monteCarlo(c95.modelSpec, { mode: 'adaptive', nDig: 2, seed: s }));
console.log('9.5 adaptiv (n_dig = 2), 12 ta urug\': M /10⁶ =', rows.map(r => (r.M / 1e6).toFixed(2)).join(' '));
line('9.5', rows, ['mean', 'u', 'low', 'high', 'symLow', 'symHigh'], 1, 3);
for (const id of ['x0-r0', 'x001-r0', 'x005-r0', 'x0-r09', 'x001-r09', 'x005-r09']) {
  const k = load('jcgm101/jcgm101-9-4-mcm-' + id), rs = [];
  for (let s = 1; s <= 16; s++) rs.push(E.monteCarlo(k.modelSpec, { mode: 'fixed', M: 1e6, seed: s }));
  line('9.4 ' + id, rs, ['mean', 'u', 'low', 'high'], 1e6, 2);
}
