#!/usr/bin/env node
/* NIST Uncertainty Machine uchun kirish fayllarini (tests/crosscheck/num/num-*.json) verified misollardan yaratish (P13 §5).
   Mavjud fayldagi egasi kiritgan qismlar (status, results) SAQLANADI — faqat `inputs` qismi qayta yaratiladi.
   Ishga tushirish: node tests/tools/gen-num-inputs.js */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { SELECTION, loadCase, inputsFor } = require('../crosscheck/num/lib.js');

const DIR = path.join(__dirname, '..', 'crosscheck', 'num');
for (const s of SELECTION) {
  const c = loadCase(s.case);
  const file = path.join(DIR, s.id + '.json');
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const doc = {
    id: s.id, case: c.id, caseFile: `tests/cases/${s.case}.json`, kind: s.kind, tool: 'NIST Uncertainty Machine',
    source: `${c.source.doc}${c.source.section ? ', ' + c.source.section : ''}`,
    status: prev.status || 'pending',
    num: { ...inputsFor(c), nrep: 1000000 },
    results: prev.results || null,
  };
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
  console.log('yozildi:', path.relative(process.cwd(), file), `(${doc.status})`);
}
