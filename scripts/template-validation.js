#!/usr/bin/env node
/* SCRIPTS/TEMPLATE-VALIDATION.JS — shablon kartasidagi "Manba bilan mos" belgisi uchun dalil (P16; egasi qarori 2026-11-20, R-29 #8).
   Belgi qo'lda yoziladigan bayroq EMAS: har bir builtin shablon uchun hisob ishga tushiriladi va natija etalon misol
   (tests/cases/excel/*.json — kutilgan qiymatlar tests/fixtures/ dagi Excel kataklaridan, havolasi bilan) bilan solishtiriladi.
   Natija: templates/validation/builtin.json  →  { templates: { <id>: { source, clause, status, relDiff, … } } }
     status 'verified'   — bog'langan barcha misollarda y, u_c, ν_eff, k, U misolning O'Z toleransi ichida (toleranslar bu yerda
                           o'zgartirilmaydi; ma'lum farqlar — knownDiscrepancies — alohida ko'rsatiladi);
     status 'unverified' — etalon misol bog'lanmagan yoki birortasi o'tmagan.
     relDiff — y, u_c, U bo'yicha eng katta nisbiy farq |olingan − kutilgan| / |kutilgan| (kutilgan = 0 bo'lsa hisobga kirmaydi).
   Fayl deterministik (sana yo'q). Eskirgan bo'lsa `npm test` xato beradi (tests/templates/validation-badge.test.js).
   ISO/IEC 17025 §7.11.2 (unverified — standart repoda yo'q): dasturiy ta'minot funksiyalari qo'llashdan oldin tekshirilgani dalili.
     node scripts/template-validation.js [--write] */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { EXCEL } = require('./lib/template-cases.js');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'templates/validation/builtin.json');
const readJSON = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const PICK = { y: r => r.y, uc: r => r.uc, nu_eff: r => r.nuEff, k: r => r.k, U: r => r.U };
const REL = ['y', 'uc', 'U'];

/** Excel holatidagi qiymatlarni shablonga foydalanuvchi ma'lumoti sifatida berish (tests/templates/builtin.test.js bilan bir xil) */
function dataFromCase(tpl, st) {
  if (st.typeB.length !== tpl.typeBSources.length) throw new Error(`${tpl.id}: manbalar soni mos emas`);
  const sources = {};
  tpl.typeBSources.forEach((s, i) => {
    const c = st.typeB[i];
    if (c.param !== s.input) throw new Error(`${tpl.id}: ${s.id} kirishi mos emas`);
    sources[s.id] = { halfWidth: c.halfWidth, distribution: c.distribution, sensitivity: c.sensitivity === undefined ? 1 : c.sensitivity, ...(c.k !== undefined ? { k: c.k } : {}) };
  });
  return { observations: st.measurements, sources, settings: st.settings, directions: st.directions };
}

function build() {
  const T = require('../src/templates/interpreter.js');
  const { compare } = require('../tests/cases/lib.js');
  const { ENGINE_VERSION } = require('../src/engine/version.js');
  const index = readJSON('templates/builtin/index.json');
  const tpls = index.templates.map(f => readJSON('templates/builtin/' + f));
  const map = new Map(EXCEL);
  const out = {};
  for (const tpl of tpls) {
    const ids = map.get(tpl.id);
    if (!ids) { out[tpl.id] = { source: null, clause: null, status: 'unverified', relDiff: null }; continue; }
    let ok = true, relDiff = 0, checked = 0;
    const known = new Set(), sheets = [];
    let doc = '';
    for (const id of ids) {
      const c = readJSON(`tests/cases/excel/${id}.json`);
      if (c.status !== 'verified') ok = false;
      doc = path.basename(c.source.file);
      sheets.push(c.source.sheet);
      const run = T.evaluateTemplate(tpl, dataFromCase(tpl, c.modelSpec.state));
      if (run.error || run.result.error) { ok = false; continue; }
      for (const [q, e] of Object.entries(c.expected)) {
        const kd = (c.knownDiscrepancies || {})[q];
        if (kd) { known.add(kd); continue; }                    // ma'lum farq (DISCREPANCIES.md) — alohida ko'rsatiladi
        const tol = (c.tolerance || {})[q] || (c.tolerance || {}).default || { rel: 1e-9 };
        const got = PICK[q](run.result);
        if (!compare(q, got, e.value, tol).ok) ok = false;
        checked++;
        if (REL.includes(q) && e.value !== 0) relDiff = Math.max(relDiff, Math.abs(got - e.value) / Math.abs(e.value));
      }
    }
    out[tpl.id] = {
      source: doc, clause: [...new Set(sheets)].join(', '), status: ok && checked > 0 ? 'verified' : 'unverified',
      relDiff: Number(relDiff.toPrecision(2)), cases: ids, checked, known: [...known].sort(),
    };
  }
  return { format: 'uc-template-validation/1', engineVersion: ENGINE_VERSION, note: 'AVTOMATIK — qo\'lda tahrirlanmaydi: node scripts/template-validation.js --write', templates: out };
}
const text = () => JSON.stringify(build(), null, 1) + '\n';

if (require.main === module) {
  const t = text();
  if (process.argv.includes('--write')) { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, t); console.log('yozildi: ' + path.relative(ROOT, OUT)); }
  const v = JSON.parse(t).templates;
  for (const [id, x] of Object.entries(v)) if (x.status === 'verified') console.log(`  ${id}: verified — ${x.source}, ${x.clause}; Δ = ${x.relDiff}${x.known.length ? '; ma\'lum farq: ' + x.known.join(', ') : ''}`);
  console.log(`shablonlar: ${Object.keys(v).length}; verified: ${Object.values(v).filter(x => x.status === 'verified').length}`);
}
module.exports = { build, text, OUT };
