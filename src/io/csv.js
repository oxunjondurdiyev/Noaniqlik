/* ═══════════════════════════════════════════════════════════════
   CSV.JS — CSV o'qish va yozish (P05b). Sof modul (DOM yo'q, tarmoq yo'q).
   O'qish: kichik RFC 4180 tahlilchi (qo'shtirnoq, "" → ", katak ichida yangi satr); ajratuvchi avtomatik:
     tab | ';' | ',' . Vergul o'nlik belgi bo'lishi mumkin, shuning uchun ',' faqat tab ham, ';' ham bo'lmaganda
     ajratuvchi hisoblanadi. CSV ataylab SheetJS ga BERILMAYDI: kataklar faqat matn, hech narsa hisoblanmaydi;
     "=1+1", "@SUM(…)", "=cmd|' /C calc'!A0" — matn bo'lib qoladi (songa aylanishi table-text.js::parseNumber da).
   Yozish: UTF-8 + BOM; formula-inyeksiyadan himoya — '=', '+', '-', '@', tab yoki CR bilan boshlanadigan MATN
     katagi oldiga apostrof (') qo'yiladi (OWASP "CSV Injection"); SON kataklariga tegilmaydi (−0,125 son bo'lib qoladi).
   Format qarori (hujjat: docs uchun — hisobotda): ajratuvchi ';' va o'nlik vergul — uz / ru interfeysida
     (Excel'ning shu tillardagi mintaqaviy sozlamasi); ',' va o'nlik nuqta — en da. Sonlar yaxlitlanmaydi
     (String(number) — eng qisqa aniq ko'rinish), shuning uchun eksport → import aylanishi aniq.
═══════════════════════════════════════════════════════════════ */

export const CSV_BOM = '﻿';

/**
 * Ajratuvchini aniqlash (qo'shtirnoq ichidagi belgilar hisobga olinmaydi; birinchi 50 satr):
 * tab bor → tab; ';' yo'q → ','; aks holda ';' soni ikki raqam ORASIDA BO'LMAGAN vergullar sonidan ko'p bo'lsa → ';'
 * (raqamlar orasidagi vergul — o'nlik belgi: "1,5;2,5"), aks holda ','.
 * Evristika: bitta ustunli o'nlik vergulli fayl ("1,5" satrlari) noaniq — import oynasida ajratuvchi qo'lda tanlanadi.
 */
export function detectDelimiter(text) {
  let inQ = false, tabs = 0, semi = 0, comma = 0, lines = 0;
  const digit = ch => ch >= '0' && ch <= '9';
  for (let i = 0; i < text.length && lines < 50; i++) {
    const ch = text[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (inQ) continue;
    if (ch === '\n') lines++;
    else if (ch === '\t') tabs++;
    else if (ch === ';') semi++;
    else if (ch === ',' && !(digit(text[i - 1] || '') && digit(text[i + 1] || ''))) comma++;
  }
  if (tabs) return '\t';
  return semi > comma ? ';' : ',';
}

/**
 * CSV matni → qatorlar (kataklar — satr). Chegaralar tahlil DAVOMIDA tekshiriladi: oshsa darhol to'xtaydi.
 * @param {string} text
 * @param {{delimiter?:string, maxRows?:number, maxCols?:number, maxCell?:number}} [opts]
 * @returns {{ok:true, rows:string[][], delimiter:string} | {ok:false, reason:'too_many_rows'|'too_many_cols'|'cell_too_long'|'bad_csv'}}
 */
export function parseCsv(text, opts = {}) {
  if (typeof text !== 'string') return { ok: false, reason: 'bad_csv' };
  let s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (s.includes('\u0000')) return { ok: false, reason: 'bad_csv' };          // ikkilik fayl
  const d = opts.delimiter || detectDelimiter(s);
  const maxRows = opts.maxRows || Infinity, maxCols = opts.maxCols || Infinity, maxCell = opts.maxCell || 32767;
  const rows = [];
  let row = [], cell = '', inQ = false, quoted = false;
  const endCell = () => { row.push(cell); cell = ''; quoted = false; return row.length <= maxCols; };
  const endRow = () => {
    if (!(row.length === 1 && row[0] === '')) rows.push(row);                  // bo'sh satr tashlanadi
    row = [];
    return rows.length <= maxRows;
  };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQ) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else cell += ch;
      if (cell.length > maxCell) return { ok: false, reason: 'cell_too_long' };
      continue;
    }
    if (ch === '"' && cell === '' && !quoted) { inQ = true; quoted = true; continue; }
    if (ch === d) { if (!endCell()) return { ok: false, reason: 'too_many_cols' }; continue; }
    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      if (!endCell()) return { ok: false, reason: 'too_many_cols' };
      if (!endRow()) return { ok: false, reason: 'too_many_rows' };
      continue;
    }
    cell += ch;
    if (cell.length > maxCell) return { ok: false, reason: 'cell_too_long' };
  }
  if (inQ) return { ok: false, reason: 'bad_csv' };                             // yopilmagan qo'shtirnoq
  if (cell !== '' || row.length) {
    if (!endCell()) return { ok: false, reason: 'too_many_cols' };
    if (!endRow()) return { ok: false, reason: 'too_many_rows' };
  }
  return { ok: true, rows, delimiter: d };
}

/** Matn katagi formula sifatida talqin qilinishi mumkinmi ('=', '+', '-', '@', tab, CR bilan boshlanadi) */
export function isFormulaLike(text) {
  return /^[=+\-@\t\r]/.test(String(text));
}

/** Formula-inyeksiyani zararsizlantirish: xavfli boshlanishli MATN oldiga apostrof */
export function neutralize(text) {
  const s = String(text);
  return isFormulaLike(s) ? "'" + s : s;
}

/** Bitta katak → CSV matni. Son — yaxlitlanmagan (o'nlik belgi `decimal`); matn — zararsizlantirilgan va RFC 4180 bo'yicha qo'shtirnoqda. */
export function csvCell(value, opts = {}) {
  const d = opts.delimiter || ';', dec = opts.decimal || '.';
  if (value === null || value === undefined) return '';
  let s;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) s = Number.isNaN(value) ? '' : (value > 0 ? '∞' : "'-∞");
    else s = dec === '.' ? String(value) : String(value).replace('.', dec);
  } else {
    s = neutralize(typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : value);
  }
  return /["\r\n]/.test(s) || s.includes(d) || /^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/**
 * Qatorlar → CSV matni (BOM bilan, CRLF).
 * @param {any[][]} rows
 * @param {{delimiter?:';'|','|'\t', decimal?:'.'|',', bom?:boolean}} [opts]  standart: ';' va o'nlik nuqta
 */
export function toCsv(rows, opts = {}) {
  const d = opts.delimiter || ';';
  const dec = opts.decimal || '.';
  if (d === dec) throw new Error('csv_delimiter_equals_decimal');
  const body = (rows || []).map(r => (r || []).map(c => csvCell(c, { delimiter: d, decimal: dec })).join(d)).join('\r\n');
  return (opts.bom === false ? '' : CSV_BOM) + body + '\r\n';
}

/** Interfeys tili bo'yicha CSV ko'rinishi: uz / ru — ';' va o'nlik vergul; boshqalar — ',' va o'nlik nuqta */
export function csvDialect(lang) {
  return lang === 'uz' || lang === 'ru' ? { delimiter: ';', decimal: ',' } : { delimiter: ',', decimal: '.' };
}
