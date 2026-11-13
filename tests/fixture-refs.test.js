/* Test misollaridagi kutilgan qiymatlar va kirish ma'lumotlari asl manba fayllariga
   mosligini qayta tekshirish (PLAN P01: "ko'chirilgan bo'lsa, qayta tekshirish skripti qoldiriladi").
   • .xlsx: expected / expectedDisplay dagi har bir "Varaq!Katak" Excel saqlagan qiymat bilan AYNAN teng;
     source.inputRefs dagi kirish ma'lumotlari modelSpec dagi qiymatlar bilan teng.
   • .docx: source.quotes dagi har bir iqtibos hujjat matnida bor. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadCases } = require('./cases/lib.js');
const { readRef } = require('./tools/excel-read.js');
const { docxParagraphs } = require('./tools/docx-text.js');

const ROOT = path.join(__dirname, '..');
const get = (obj, p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

for (const c of loadCases()) {
  const file = c.source && c.source.file;
  if (!file) continue;
  if (file.endsWith('.xlsx')) {
    const xlsx = path.basename(file);
    test(`${c.id}: kutilgan qiymatlar ${xlsx} kataklariga teng`, async () => {
      for (const [q, e] of Object.entries({ ...c.expected, ...prefix(c.expectedDisplay) })) {
        assert.equal(await readRef(xlsx, e.ref), e.value, `${q}: ${e.ref}`);
      }
    });
    test(`${c.id}: kirish ma'lumotlari ${xlsx} bilan bir xil`, async () => {
      for (const [p, ref] of Object.entries(c.source.inputRefs || {})) {
        const want = await readRef(xlsx, ref);
        let have = get(c.modelSpec.state, p);
        if (Array.isArray(want) && !Array.isArray(have)) have = [have];
        if (!Array.isArray(want) && Array.isArray(have) && have.length === 1) have = have[0];
        assert.deepEqual(have, want, `${p} ↔ ${ref}`);
      }
    });
  } else if (file.endsWith('.docx')) {
    test(`${c.id}: iqtiboslar ${path.basename(file)} matnida bor`, async () => {
      const paras = await docxParagraphs(path.join(ROOT, file));
      for (const q of c.source.quotes || []) assert.ok(paras.some(p => p.includes(q)), `topilmadi: ${q}`);
    });
  }
}

function prefix(obj) {
  return Object.fromEntries(Object.entries(obj || {}).map(([k, v]) => ['display.' + k, v]));
}
