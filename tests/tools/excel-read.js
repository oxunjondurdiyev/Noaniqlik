/* Etalon .xlsx fayllardan katak qiymatini o'qish (exceljs — faqat devDependency).
   Formulali kataklar uchun Excel saqlagan hisoblangan natija (cached result) olinadi. */
'use strict';
const path = require('node:path');
const ExcelJS = require('exceljs');

const FIXTURES = path.join(__dirname, '..', 'fixtures');
const cache = new Map();

async function workbook(file) {
  if (!cache.has(file)) {
    const wb = new ExcelJS.Workbook();
    cache.set(file, wb.xlsx.readFile(path.join(FIXTURES, file)).then(() => wb));
  }
  return cache.get(file);
}

function cellValue(cell) {
  const m = cell.model || {};
  // Formulali katak: cell.value 0 natijani tushirib qoldiradi (exceljs), model.result esa saqlaydi
  if (m.formula !== undefined || m.sharedFormula !== undefined) return m.result === '' ? undefined : m.result;
  const v = cell.value;
  return v === null ? undefined : v;
}

// "Varaq!D35" → qiymat;  "Varaq!D32:F32" yoki "Varaq!D4:D15" → massiv
async function readRef(file, ref) {
  const m = /^(.+)!([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(ref);
  if (!m) throw new Error('Noto\'g\'ri havola: ' + ref);
  const ws = (await workbook(file)).getWorksheet(m[1]);
  if (!ws) throw new Error(`Varaq yo'q: ${m[1]} (${file})`);
  if (!m[4]) return cellValue(ws.getCell(m[2] + m[3]));
  const col = c => c.split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0);
  const out = [];
  for (let r = +m[3]; r <= +m[5]; r++) {
    for (let c = col(m[2]); c <= col(m[4]); c++) {
      const v = cellValue(ws.getRow(r).getCell(c));
      if (v !== undefined && v !== '') out.push(v);
    }
  }
  return out;
}

module.exports = { readRef, FIXTURES };
