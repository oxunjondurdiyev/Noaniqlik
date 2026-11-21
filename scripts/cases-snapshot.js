#!/usr/bin/env node
/* SCRIPTS/CASES-SNAPSHOT.JS — regressiya nazorati (P13, docs/validation/CHANGE_CONTROL.md).
   tests/cases/ dagi barcha misollarning TO'LIQ natijasini (yaxlitlanmagan + hisobot qatlamidagi ko'rinish) bitta JSON ga
   yozadi va ikki holatni bit darajasida solishtiradi (`engineVersion` maydonidan tashqari).
     node scripts/cases-snapshot.js --out before.json          # joriy kod holati
     node scripts/cases-snapshot.js --compare before.json after.json
     node scripts/cases-snapshot.js --compare before.json after.json --ignore '^result\.mcm(\.|$)'
   --ignore <regex> — yangi QO'SHILGAN maydon yo'lini solishtiruvdan chiqarish (masalan P20: result.mcm); PR tavsifida
   qaysi yo'l chiqarilgani yoziladi. Mavjud maydonlar uchun ishlatilmaydi.
   Solishtiruv: har bir son Object.is bilan (−0 va NaN ham), satrlar va tuzilma — aniq. Farq bo'lsa chiqish kodi 1.
   Ishlatilishi: hisobga ta'sir qilmasligi kerak bo'lgan o'zgarishdan OLDIN va KEYIN (natija PR tavsifida ko'rsatiladi). */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const IGNORE = p => /(^|\.)engineVersion$/.test(p);

function snapshot() {
  const { loadCases, engine } = require('../tests/cases/lib.js');
  const { roundResult } = require('../src/report/rounding.js');
  const { snapshotCase } = require('../tests/crossbrowser/core.js');
  const cases = loadCases().filter(c => c.modelSpec);
  return {
    format: 'uc-cases-snapshot/1',
    engineVersion: engine.ENGINE_VERSION,
    node: process.version,
    cases: cases.map(c => ({ status: c.status, ...snapshotCase(engine, roundResult, c) })),
  };
}

function compare(a, b, extraIgnore) {
  const ignore = extraIgnore ? (p => IGNORE(p) || extraIgnore.test(p)) : IGNORE;
  const { diffTrees } = require('../tests/crossbrowser/core.js');
  const byId = s => new Map(s.cases.map(c => [c.id, c]));
  const A = byId(a), B = byId(b);
  const rows = [];
  for (const id of new Set([...A.keys(), ...B.keys()])) {
    const x = A.get(id), y = B.get(id);
    if (!x || !y) { rows.push({ id, equal: false, note: x ? 'faqat birinchisida' : 'faqat ikkinchisida' }); continue; }
    const d = diffTrees({ result: x.result || null, display: x.display || null, error: x.error || null },
      { result: y.result || null, display: y.display || null, error: y.error || null }, { rel: 0, ignore });
    rows.push({ id, equal: d.equal, numeric: d.numeric, differing: d.differing, maxRel: d.maxRel, maxRelPath: d.maxRelPath, structural: d.structural });
  }
  return { equal: rows.every(r => r.equal), total: rows.length, identical: rows.filter(r => r.equal).length, rows };
}

module.exports = { snapshot, compare };

if (require.main === module) {
  const arg = process.argv.slice(2);
  if (arg[0] === '--out' && arg[1]) {
    const s = snapshot();
    fs.mkdirSync(path.dirname(path.resolve(arg[1])), { recursive: true });
    fs.writeFileSync(arg[1], JSON.stringify(s) + '\n');
    const err = s.cases.filter(c => c.error);
    console.log(`${s.cases.length} ta misol (ENGINE_VERSION ${s.engineVersion}, Node ${s.node}) → ${arg[1]}; ishga tushmagan: ${err.length}`);
    for (const c of err) console.log(`  ${c.id}: ${c.error}`);
  } else if (arg[0] === '--compare' && arg[1] && arg[2]) {
    const [a, b] = [arg[1], arg[2]].map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
    const ig = arg.indexOf('--ignore');
    const r = compare(a, b, ig > 0 && arg[ig + 1] ? new RegExp(arg[ig + 1]) : null);
    console.log(`ENGINE_VERSION ${a.engineVersion} → ${b.engineVersion}; misollar: ${r.total}; bit darajasida bir xil: ${r.identical}; farq qiladi: ${r.total - r.identical}`);
    for (const row of r.rows.filter(x => !x.equal)) {
      console.log(`  ✗ ${row.id}: ${row.note || `${row.differing} ta son farq qiladi (maks. nisbiy ${row.maxRel.toExponential(2)} — ${row.maxRelPath})`}`);
      for (const s of (row.structural || []).slice(0, 5)) console.log(`      ${s}`);
    }
    process.exit(r.equal ? 0 : 1);
  } else {
    console.error('Foydalanish: node scripts/cases-snapshot.js --out <fayl.json> | --compare <oldin.json> <keyin.json>');
    process.exit(2);
  }
}
