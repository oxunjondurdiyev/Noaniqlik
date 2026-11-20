#!/usr/bin/env node
/* SCRIPTS/TEMPLATE-VALIDATION.JS — shablon kartasidagi "Manba bilan mos" belgisi uchun dalil (P16; egasi qarori 2026-11-20, R-29 #8).
   Belgi qo'lda yoziladigan bayroq EMAS: har bir builtin shablon uchun hisob ishga tushiriladi va natija etalon misol
   (tests/cases/excel/*.json — kutilgan qiymatlar tests/fixtures/ dagi Excel kataklaridan, havolasi bilan) bilan solishtiriladi.
   Natija: templates/validation/builtin.json (format uc-template-validation/2, `_generated` belgisi bilan) — har bir (shablon, test) uchun yozuv:
     templateId, templateHash (RFC 8785 → SHA-256), ENGINE_VERSION, testId, source, clause, relDiff, date (+ status, checked, known).
     status 'verified'   — misolning y, u_c, ν_eff, k, U qiymatlari misolning O'Z toleransi ichida (toleranslar bu yerda o'zgartirilmaydi;
                           ma'lum farqlar — knownDiscrepancies — alohida ko'rsatiladi); aks holda 'unverified'.
     relDiff — y, u_c, U bo'yicha eng katta nisbiy farq |olingan − kutilgan| / |kutilgan| (kutilgan = 0 bo'lsa hisobga kirmaydi).
     date    — yozuv mazmuni (xesh, versiya, natija) OXIRGI MARTA o'zgargan kun; mazmun o'zgarmasa sana saqlanadi (fayl deterministik).
   Runtime (src/templates/validation-status.js): templateHash yoki ENGINE_VERSION mos kelmasa, shablon builtin bo'lmasa — "unverified".
   Fayl qo'lda tahrirlanmaydi: `npm test` (tests/templates/validation-badge.test.js) va CI (`--check`) qayta yaratib solishtiradi.
   ISO/IEC 17025 §7.11.2 (unverified — standart repoda yo'q): dasturiy ta'minot funksiyalari qo'llashdan oldin tekshirilgani dalili.
     node scripts/template-validation.js [--write] [--check] */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
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

const today = () => new Date().toISOString().slice(0, 10);
const same = (a, b) => JSON.stringify({ ...a, date: 0 }) === JSON.stringify({ ...b, date: 0 });

/** @param {object|null} prev  mavjud fayl: yozuv o'zgarmagan bo'lsa sanasi saqlanadi (fayl deterministik qoladi) */
function build(prev) {
  const T = require('../src/templates/interpreter.js');
  const { canonicalizeJcs } = require('../src/storage/canonical.js');
  const { VALIDATION_FORMAT } = require('../src/templates/validation-status.js');
  const { compare } = require('../tests/cases/lib.js');
  const { ENGINE_VERSION } = require('../src/engine/version.js');
  const index = readJSON('templates/builtin/index.json');
  const tpls = index.templates.map(f => readJSON('templates/builtin/' + f));
  const map = new Map(EXCEL);
  const old = new Map(((prev && prev.records) || []).map(r => [r.templateId + '|' + r.testId, r]));
  const records = [];
  for (const tpl of tpls) {
    const ids = map.get(tpl.id);
    if (!ids) continue;                                          // yozuv yo'q → runtime'da "unverified" (no_record)
    // Ref: RFC 8785 (JCS) — brauzerdagi src/storage/canonical.js::jcsHash bilan AYNAN bir xil kanonik matn
    const templateHash = crypto.createHash('sha256').update(canonicalizeJcs(tpl), 'utf8').digest('hex');
    for (const id of ids) {
      const c = readJSON(`tests/cases/excel/${id}.json`);
      let ok = c.status === 'verified', relDiff = 0, checked = 0;
      const known = new Set();
      const run = T.evaluateTemplate(tpl, dataFromCase(tpl, c.modelSpec.state));
      if (run.error || run.result.error) ok = false;
      else for (const [q, e] of Object.entries(c.expected)) {
        const kd = (c.knownDiscrepancies || {})[q];
        if (kd) { known.add(kd); continue; }                    // ma'lum farq (DISCREPANCIES.md) — alohida ko'rsatiladi
        const tol = (c.tolerance || {})[q] || (c.tolerance || {}).default || { rel: 1e-9 };
        const got = PICK[q](run.result);
        if (!compare(q, got, e.value, tol).ok) ok = false;
        checked++;
        if (REL.includes(q) && e.value !== 0) relDiff = Math.max(relDiff, Math.abs(got - e.value) / Math.abs(e.value));
      }
      const rec = {
        templateId: tpl.id, templateVersion: tpl.version, templateHash, ENGINE_VERSION, testId: id,
        source: path.basename(c.source.file), clause: c.source.sheet, relDiff: Number(relDiff.toPrecision(2)),
        status: ok && checked > 0 ? 'verified' : 'unverified', checked, known: [...known].sort(), date: null,
      };
      const was = old.get(tpl.id + '|' + id);
      rec.date = was && same(was, rec) && /^\d{4}-\d{2}-\d{2}$/.test(was.date || '') ? was.date : today();
      records.push(rec);
    }
  }
  return {
    _generated: 'AVTOMATIK YARATILGAN — qo\'lda tahrirlanmaydi. Yaratish: npm run validate:templates (node scripts/template-validation.js --write). ' +
      'Qo\'lda o\'zgartirilgan yoki eskirgan fayl `npm test` va CI da xato beradi.',
    format: VALIDATION_FORMAT, ENGINE_VERSION, records,
  };
}
const previous = () => { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { return null; } };
const text = () => JSON.stringify(build(previous()), null, 1) + '\n';

if (require.main === module) {
  const t = text();
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (process.argv.includes('--write')) { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, t); console.log('yozildi: ' + path.relative(ROOT, OUT)); }
  const recs = JSON.parse(t).records;
  for (const x of recs) console.log(`  ${x.templateId} ← ${x.testId}: ${x.status} — ${x.source}, ${x.clause}; Δ = ${x.relDiff}${x.known.length ? '; ma\'lum farq: ' + x.known.join(', ') : ''}; ${x.date}`);
  console.log(`yozuvlar: ${recs.length}; verified: ${recs.filter(x => x.status === 'verified').length}`);
  // --check (CI): fayl qayta yaratilgani bilan AYNAN bir xil bo'lishi shart — qo'lda tahrir yoki eskirgan fayl xato
  if (process.argv.includes('--check') && cur !== t) { console.error('XATO: templates/validation/builtin.json eskirgan yoki qo\'lda o\'zgartirilgan — npm run validate:templates'); process.exit(1); }
}
module.exports = { build, text, OUT };
