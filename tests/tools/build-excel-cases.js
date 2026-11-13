#!/usr/bin/env node
/* tests/cases/excel/*.json ni etalon Excel fayllardan BIR MARTA yaratadi (P01).
   Kutilgan qiymatlar faqat Excel kataklaridan, havola (Varaq!Katak) bilan.
   Kirish ma'lumotlari tests/excel-cases.js dan (verify-excel.js bilan bir xil) va
   ular ham Excel kataklari bilan solishtiriladi (inputRefs).
   Qayta tekshirish har `npm test` da: tests/fixture-refs.test.js.

   Ishga tushirish:  node tests/tools/build-excel-cases.js
   (natija git'da; qayta yaratilsa — diff ko'rib chiqiladi) */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { readRef } = require('./excel-read.js');
const K = require('../excel-cases.js');

const OUT = path.join(__dirname, '..', 'cases', 'excel');
const GAS = 'Noaniqlik_hisobi_gazoanalizator_KEDR-07.xlsx';
const TERM = 'Noaniqlik_hisobi_termometr_MS-MK-3.xlsx';
const RHO = 'Zichlik_noaniqligi_hisobi.xlsx';

// Excel ν = 10⁹ ni B tur uchun "∞" o'rnida ishlatadi; dvigatel ∞ yoki 10⁶ (cap) beradi.
const REL = { rel: 1e-9, reason: 'PLAN P01/P03: y, u_c, ν_eff, k, U — 1e-9 nisbiy' };

// Tahlil natijasi (DISCREPANCIES.md): hozirgi dvigatelda 1e-9 da mos kelmaydigan kattaliklar.
// Tuzatilmaydi (PLAN P01) — P03 da egasi qaroridan keyin.
const KNOWN = {
  'excel-gas-p1': { k: 'D-01', U: 'D-01' },
  'excel-term-p1': { k: 'D-01', U: 'D-01' },
  'excel-term-p2': { k: 'D-02', U: 'D-02', nu_eff: 'D-03' },
  'excel-term-p3': { k: 'D-01', U: 'D-01', nu_eff: 'D-03' },
  'excel-term-p4': { k: 'D-01', U: 'D-01' },
  'excel-term-p5': { k: 'D-02', U: 'D-02', nu_eff: 'D-03' },
};

const densityState = {
  params: ['m', 'V'],
  measurements: { m: [99.8312, 99.8741, 99.8103, 99.8655, 99.8236], V: [100.02, 100.06, 99.98, 100.04, 100.00] },
  directions: [], model: { formula: 'ρ = m / V', unit: 'g/cm³' },
  settings: { paired: true, P: 0.9545 }, covB: {},
  typeB: [
    { name: 'Tarozi kalibrlovi (U, k=2)', param: 'm', halfWidth: 0.0006, distribution: 'normal', k: 2, unit: 'g' },
    { name: 'Tarozi diskretligi d', param: 'm', halfWidth: 0.0001, distribution: 'resol', unit: 'g' },
    { name: 'Nochiziqlilik / ekssentriklik', param: 'm', halfWidth: 0.0002, distribution: 'rect', unit: 'g' },
    { name: 'Idish toleransi', param: 'V', halfWidth: 0.1, distribution: 'rect', unit: 'cm³' },
    { name: "Shkaladan o'qish d", param: 'V', halfWidth: 0.02, distribution: 'resol', unit: 'cm³' },
    { name: "Harorat ta'siri V̄·γ·ΔT", param: 'V', halfWidth: '0.00021 * 2 * V', distribution: 'rect', unit: 'cm³' },
  ],
};

async function build(spec) {
  const expected = {};
  for (const [q, ref] of Object.entries(spec.cells)) {
    const value = await readRef(spec.file, ref);
    if (typeof value !== 'number') throw new Error(`${spec.id}: ${ref} raqam emas (${value})`);
    expected[q] = { value, ref };
  }
  const display = {};
  for (const [q, ref] of Object.entries(spec.displayCells)) {
    display[q] = { value: await readRef(spec.file, ref), ref };
  }
  const caseObj = {
    id: spec.id,
    title: spec.title,
    status: 'verified',
    domain: spec.domain,
    source: { doc: spec.doc, file: `tests/fixtures/${spec.file}`, sheet: spec.sheet, inputRefs: spec.inputRefs, note: spec.note },
    modelSpec: { format: 'calc-state/v2', state: spec.state },
    expected,
    expectedDisplay: display,
    tolerance: { default: REL },
    knownDiscrepancies: KNOWN[spec.id] || {},
  };
  fs.writeFileSync(path.join(OUT, spec.id + '.json'), JSON.stringify(caseObj, null, 2) + '\n');
  console.log('✓', spec.id);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await build({
    id: 'excel-density', title: 'Zichlik ρ = m/V (juftlangan o\'lchashlar, korrelyatsiya)', domain: 'massa/zichlik',
    doc: 'Zichlik_noaniqligi_hisobi.xlsx (laboratoriya Excel\'i)', file: RHO, sheet: '3_Hisob',
    cells: { y: '3_Hisob!D9', uc: '3_Hisob!D58', nu_eff: '3_Hisob!D65', k: '3_Hisob!D66', U: '3_Hisob!D67' },
    displayCells: { U: '3_Hisob!D73', y: '3_Hisob!D74' },
    inputRefs: { 'measurements.m': '2_Kirish!B6:B10', 'measurements.V': '2_Kirish!C6:C10',
                 'typeB.0.halfWidth': '2_Kirish!B16', 'typeB.0.k': '2_Kirish!B17', 'typeB.1.halfWidth': '2_Kirish!B18',
                 'typeB.2.halfWidth': '2_Kirish!B19', 'typeB.3.halfWidth': '2_Kirish!B23', 'typeB.4.halfWidth': '2_Kirish!B25',
                 'settings.P': '2_Kirish!B32' },
    note: "Harorat ta'siri Excel'da 3_Hisob!D31 = V̄·γ·ΔT/√3 (γ = 2_Kirish!B27, ΔT = 2_Kirish!B26) — modelda '0.00021 * 2 * V' to'g'ri burchakli. Yaxlitlash: ROUND (3_Hisob!D73).",
    state: densityState,
  });
  for (let i = 0; i < 3; i++) {
    const n = i + 1, row = 31 + i, sh = 'Nuqta_' + n;
    await build({
      id: `excel-gas-p${n}`, title: `Gazoanalizator KEDR-07, ${n}-nuqta`, domain: 'fizik-kimyo/gaz tahlili',
      doc: 'Noaniqlik_hisobi_gazoanalizator_KEDR-07.xlsx (C75.QM asosida)', file: GAS, sheet: sh,
      cells: { y: `${sh}!D35`, uc: `${sh}!D36`, nu_eff: `${sh}!D37`, k: `${sh}!D38`, U: `${sh}!D39` },
      displayCells: { U: `${sh}!D41`, y: `${sh}!D42` },
      inputRefs: { 'measurements.I': `Kirish!D${row}:M${row}`, 'measurements.Ce': `Kirish!B${row}`, 'settings.P': 'Kirish!B22' },
      note: 'Kalibrator xatosi: Kirish!B12 (%), Kirish!B13 (mA); ajratish qobiliyati Kirish!B14; PGS chegarasi Nuqta_i!G31. Yaxlitlash: ROUNDUP (Kirish!B27).',
      state: K.gasState(K.gas.points[i]),
    });
  }
  const teCols = ['D', 'F', 'H', 'J', 'L'], tvCols = ['E', 'G', 'I', 'K', 'M'];
  for (let i = 0; i < 5; i++) {
    const n = i + 1, sh = 'Nuqta_' + n, row = 31 + i;
    await build({
      id: `excel-term-p${n}`, title: `Termometr MS-MK-3, ${n}-nuqta (${K.term.points[i].nom} °C)`, domain: 'harorat',
      doc: 'Noaniqlik_hisobi_termometr_MS-MK-3.xlsx (o\'quv namunasi)', file: TERM, sheet: sh,
      cells: { y: `${sh}!D20`, uc: `${sh}!D37`, nu_eff: `${sh}!D38`, k: `${sh}!D39`, U: `${sh}!D40` },
      displayCells: { U: `${sh}!D42`, y: `${sh}!D43` },
      inputRefs: { 'measurements.Te': `Kuzatuvlar!${teCols[i]}4:${teCols[i]}15`, 'measurements.Tv': `Kuzatuvlar!${tvCols[i]}4:${tvCols[i]}15`,
                   'measurements.Ce': `Kirish!C${row}`, 'typeB.5.halfWidth': `Kirish!D${row}`, 'settings.P': 'Kirish!B24' },
      note: 'Kuzatuvlar — o\'quv namunasi (real laboratoriya ma\'lumoti emas). ↑/↓ rejimi, histerezis. Yaxlitlash: ROUNDUP (Kirish!B26).',
      state: K.termState(K.term.points[i]),
    });
  }
})().catch(e => { console.error(e); process.exit(1); });
