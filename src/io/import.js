/* ═══════════════════════════════════════════════════════════════
   IMPORT.JS — .xlsx va .csv fayllardan jadval o'qish (P05b). Sof modul: DOM yo'q, TARMOQ YO'Q
   (tests/io/import.test.js bu papkada tarmoq chaqiruvlari yo'qligini statik tekshiradi).
   Fayl faqat brauzer xotirasida o'qiladi (chaqiruvchi File.arrayBuffer() natijasini beradi).

   Xavfsizlik qatlamlari (har biri testlangan):
     1. Hajm chegarasi — tahlildan OLDIN (LIMITS.maxBytes); kengaytma + sehrli baytlar (xlsx = ZIP "PK\x03\x04").
     2. ZIP katalogi oldindan o'qiladi: yozuvlar soni va e'lon qilingan ochilgan hajm yig'indisi chegaralangan
        (zip-bomba); ZIP64 rad etiladi. SheetJS ochishda e'lon qilingan hajmdan ortiq xotira ajratmaydi.
     3. Varaqlar soni chegarasi; faqat TANLANGAN varaq tahlil qilinadi (`sheets: indeks`), `sheetRows` bilan —
        ulkan varaq to'liq xotiraga yoyilmaydi; qator / ustun chegarasidan oshsa — to'liq rad etiladi (qisman import yo'q).
     4. Formulalar HECH QACHON hisoblanmaydi: SheetJS formulani bajarmaydi; `cellFormula: false` formula matnini ham
        tashlaydi — faqat faylda SAQLANGAN qiymat (Excel oxirgi marta hisoblagan natija) olinadi. Saqlangan qiymati
        yo'q formula katagi — bo'sh. Matn katagi ("=1+1" kabi) — matn; songa faqat qat'iy son ko'rinishida aylanadi
        (table-text.js::parseNumber). HTML / uslub / makros o'qilmaydi (cellHTML, cellStyles, bookVBA = false).
     5. CSV SheetJS ga berilmaydi — o'zimizning tahlilchi (csv.js): kataklar faqat matn.
     6. Fayldan kelgan satrlar obyekt kaliti bo'lmaydi (varaq indeks bilan tanlanadi; natija — massivlar).
   Natijadagi har bir katak: son | satr | null. DOM ga faqat textContent / escHtml orqali (src/ui/io/app.js).
═══════════════════════════════════════════════════════════════ */
import { parseCsv } from './csv.js';

/** Import chegaralari (yagona joy). */
export const LIMITS = Object.freeze({
  maxBytes: 5 * 1024 * 1024,        // fayl hajmi (5 MB)
  maxRows: 10000,                   // bitta varaq / CSV dagi qatorlar
  maxCols: 200,                     // ustunlar
  maxSheets: 50,                    // .xlsx dagi varaqlar
  maxZipEntries: 2000,              // .xlsx (ZIP) ichidagi fayllar
  maxUnzippedBytes: 64 * 1024 * 1024, // ZIP katalogida e'lon qilingan ochilgan hajm yig'indisi (64 MB)
  maxCellChars: 32767,              // bitta katak matni (Excel chegarasi)
  maxTableRows: 1000,               // GUM o'lchashlar jadvaliga qo'yiladigan / import qilinadigan qatorlar
  previewRows: 8,                   // oldindan ko'rish qatorlari
});

export const IMPORT_ERRORS = Object.freeze(['too_large', 'empty', 'unsupported_type', 'not_xlsx', 'bad_xlsx', 'zip_too_big',
  'too_many_sheets', 'too_many_rows', 'too_many_cols', 'cell_too_long', 'bad_csv', 'no_sheet', 'read_failed']);

const fail = (reason, detail) => ({ ok: false, reason, ...(detail !== undefined ? { detail } : {}) });
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/** Fayl turi kengaytma bo'yicha: 'xlsx' | 'csv' | null */
export function kindOfName(name) {
  const m = /\.([a-z0-9]+)$/i.exec(String(name || ''));
  const ext = m ? m[1].toLowerCase() : '';
  if (ext === 'xlsx') return 'xlsx';
  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') return 'csv';
  return null;
}

/** Tahlildan OLDINGI tekshiruv: tur va hajm. @param {{name:string, size:number}} file */
export function precheck(file, limits = LIMITS) {
  const kind = kindOfName(file && file.name);
  if (!kind) return fail('unsupported_type');
  const size = Number(file.size);
  if (!(size > 0)) return fail('empty');
  if (size > limits.maxBytes) return fail('too_large');
  return { ok: true, kind };
}

function toBytes(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (data && data.buffer instanceof ArrayBuffer) return new Uint8Array(data.buffer, data.byteOffset || 0, data.byteLength);
  return null;
}

const isZip = b => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;

/**
 * ZIP markaziy katalogini o'qish (hech narsa ochilmaydi): yozuvlar soni va e'lon qilingan ochilgan hajm.
 * @returns {{ok:true, entries:number, unzipped:number, names:string[]} | {ok:false, reason}}
 */
export function zipInfo(bytes, limits = LIMITS) {
  const b = toBytes(bytes);
  if (!b || !isZip(b)) return fail('not_xlsx');
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return fail('bad_xlsx');
  const count = dv.getUint16(eocd + 10, true);
  const cdSize = dv.getUint32(eocd + 12, true);
  const cdOff = dv.getUint32(eocd + 16, true);
  if (count === 0xffff || cdOff === 0xffffffff || cdSize === 0xffffffff) return fail('bad_xlsx');   // ZIP64 — kerak emas
  if (count > limits.maxZipEntries) return fail('zip_too_big');
  if (cdOff + cdSize > eocd) return fail('bad_xlsx');
  let p = cdOff, unzipped = 0;
  const names = [];
  const dec = new TextDecoder('utf-8');
  for (let n = 0; n < count; n++) {
    if (p + 46 > b.length || dv.getUint32(p, true) !== 0x02014b50) return fail('bad_xlsx');
    const usz = dv.getUint32(p + 24, true);
    const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
    if (usz === 0xffffffff) return fail('bad_xlsx');
    unzipped += usz;
    if (unzipped > limits.maxUnzippedBytes) return fail('zip_too_big');
    if (p + 46 + nl > b.length) return fail('bad_xlsx');
    names.push(dec.decode(b.subarray(p + 46, p + 46 + nl)));
    p += 46 + nl + el + cl;
  }
  if (!names.includes('[Content_Types].xml')) return fail('not_xlsx');
  return { ok: true, entries: count, unzipped, names };
}

/** SheetJS o'qish parametrlari: formulalar / HTML / uslublar / makroslar o'qilmaydi */
export function xlsxReadOptions(extra) {
  return { type: 'array', cellFormula: false, cellHTML: false, cellStyles: false, cellText: false, cellDates: false, bookVBA: false, bookFiles: false, dense: true, ...extra };
}

/**
 * .xlsx: varaq nomlari (kataklar tahlil qilinmaydi).
 * @param {object} XLSX  loadXlsx() natijasi
 * @returns {{ok:true, sheets:string[]} | {ok:false, reason}}
 */
export function xlsxSheetNames(XLSX, data, limits = LIMITS) {
  const b = toBytes(data);
  if (!b) return fail('read_failed');
  if (b.length > limits.maxBytes) return fail('too_large');
  const z = zipInfo(b, limits);
  if (!z.ok) return z;
  let wb;
  try { wb = XLSX.read(b, xlsxReadOptions({ bookSheets: true })); } catch (_) { return fail('bad_xlsx'); }
  const names = wb && Array.isArray(wb.SheetNames) ? wb.SheetNames.map(String) : [];
  if (!names.length) return fail('bad_xlsx');
  if (names.length > limits.maxSheets) return fail('too_many_sheets');
  return { ok: true, sheets: names };
}

function cellValue(c, limits) {
  if (!c || typeof c !== 'object') return null;
  if (c.t === 'n') return typeof c.v === 'number' && Number.isFinite(c.v) ? c.v : null;
  if (c.t === 's' || c.t === 'str') { const s = String(c.v === undefined || c.v === null ? '' : c.v); return s === '' ? null : s.slice(0, limits.maxCellChars); }
  if (c.t === 'b') return c.v ? 'TRUE' : 'FALSE';
  return null;                                   // 'e' (xato), 'z' (bo'sh), 'd' (sana — cellDates o'chirilgan) va boshqalar
}

/**
 * .xlsx: bitta varaq kataklari (saqlangan qiymatlar). Chegaradan oshsa — rad etiladi (qisman natija yo'q).
 * @param {number} index  varaq indeksi (0 dan) — nom emas: fayldan kelgan satr kalit sifatida ishlatilmaydi
 * @returns {{ok:true, rows:any[][], nRows:number, nCols:number} | {ok:false, reason}}
 */
export function xlsxSheet(XLSX, data, index, limits = LIMITS) {
  const b = toBytes(data);
  if (!b) return fail('read_failed');
  if (b.length > limits.maxBytes) return fail('too_large');
  const z = zipInfo(b, limits);
  if (!z.ok) return z;
  let wb;
  try { wb = XLSX.read(b, xlsxReadOptions({ sheets: index, sheetRows: limits.maxRows + 1 })); } catch (_) { return fail('bad_xlsx'); }
  try {
    const names = wb && Array.isArray(wb.SheetNames) ? wb.SheetNames : [];
    if (names.length > limits.maxSheets) return fail('too_many_sheets');
    const name = names[index];
    if (typeof name !== 'string' || !wb.Sheets || !own(wb.Sheets, name)) return fail('no_sheet');
    const ws = wb.Sheets[name];
    if (!ws || typeof ws !== 'object') return fail('no_sheet');
    // E'lon qilingan o'lcham (<dimension>) emas, HAQIQATDA o'qilgan kataklar hisobga olinadi: `sheetRows` tufayli
    // maxRows + 1 dan ortiq qator xotiraga olinmaydi; (maxRows + 1)-qatorda ma'lumot bo'lsa — rad etiladi.
    const dense = Array.isArray(ws['!data']) ? ws['!data'] : [];
    const rows = [];
    let nCols = 0;
    const top = Math.min(dense.length, limits.maxRows + 1);
    for (let r = 0; r < top; r++) {
      const src = Array.isArray(dense[r]) ? dense[r] : [];
      if (src.length > limits.maxCols) return fail('too_many_cols');
      const row = [];
      let last = -1;
      for (let c = 0; c < src.length; c++) { const v = cellValue(src[c], limits); row.push(v); if (v !== null) last = c; }
      row.length = last + 1;
      if (last >= 0 && r >= limits.maxRows) return fail('too_many_rows');
      if (last + 1 > nCols) nCols = last + 1;
      rows.push(row);
    }
    while (rows.length && rows[rows.length - 1].length === 0) rows.pop();
    return { ok: true, rows, nRows: rows.length, nCols };
  } catch (_) { return fail('bad_xlsx'); }
}

/** Baytlar → matn: UTF-8 (BOM bilan yoki BOM siz); yaroqsiz UTF-8 bo'lsa — windows-1251 (eski Excel CSV) */
export function decodeText(data) {
  const b = toBytes(data);
  if (!b) return null;
  if (b.length >= 2 && ((b[0] === 0xff && b[1] === 0xfe) || (b[0] === 0xfe && b[1] === 0xff))) {
    try { return new TextDecoder(b[0] === 0xff ? 'utf-16le' : 'utf-16be').decode(b); } catch (_) { return null; }
  }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (_) { /* UTF-8 emas */ }
  try { return new TextDecoder('windows-1251').decode(b); } catch (_) { return new TextDecoder('utf-8').decode(b); }
}

/**
 * .csv / .tsv / .txt: kataklar (satrlar; bo'sh — null).
 * @returns {{ok:true, rows:any[][], nRows:number, nCols:number, delimiter:string} | {ok:false, reason}}
 */
export function csvTable(data, limits = LIMITS, delimiter) {
  let text = data;
  if (typeof data !== 'string') {
    const b = toBytes(data);
    if (!b) return fail('read_failed');
    if (b.length > limits.maxBytes) return fail('too_large');
    if (isZip(b)) return fail('bad_csv');
    text = decodeText(b);
    if (text === null) return fail('bad_csv');
  } else if (text.length > limits.maxBytes) return fail('too_large');
  const p = parseCsv(text, { maxRows: limits.maxRows, maxCols: limits.maxCols, maxCell: limits.maxCellChars, ...([';', ',', '\t'].includes(delimiter) ? { delimiter } : {}) });
  if (!p.ok) return fail(p.reason);
  const nCols = Math.max(0, ...p.rows.map(r => r.length));
  const rows = p.rows.map(r => r.map(c => { const s = c.trim(); return s === '' ? null : s; }));
  return { ok: true, rows, nRows: rows.length, nCols, delimiter: p.delimiter };
}

/**
 * Faylni ochish (tur va hajm tekshirilgan baytlardan).
 * @param {{name:string, size?:number}} file
 * @param {ArrayBuffer|Uint8Array} data
 * @param {() => Promise<object>} loadXlsx   src/io/vendor.js::loadXlsx (faqat .xlsx uchun chaqiriladi)
 * @returns {Promise<{ok:true, kind:'xlsx'|'csv', sheets:string[], delimiter?:string, sheet:(i:number, o?:{delimiter?:string})=>object} | {ok:false, reason}>}
 *   sheet(i) → xlsxSheet() / csvTable() natijasi; CSV da sheet(0, { delimiter }) — boshqa ajratuvchi bilan qayta tahlil
 */
export async function openTableFile(file, data, loadXlsx, limits = LIMITS) {
  try {
    const b = toBytes(data);
    if (!b) return fail('read_failed');
    const pre = precheck({ name: file && file.name, size: b.length }, limits);
    if (!pre.ok) return pre;
    if (pre.kind === 'csv') {
      if (isZip(b)) return fail('bad_csv');
      const text = decodeText(b);
      if (text === null) return fail('bad_csv');
      const t = csvTable(text, limits);
      if (!t.ok) return t;
      // sheet(0, { delimiter }) — ajratuvchini qo'lda tanlash (bitta ustunli o'nlik vergulli fayl noaniq)
      return { ok: true, kind: 'csv', sheets: [''], delimiter: t.delimiter, sheet: (i, o) => (o && o.delimiter ? csvTable(text, limits, o.delimiter) : t) };
    }
    const z = zipInfo(b, limits);
    if (!z.ok) return z;
    let XLSX;
    try { XLSX = await loadXlsx(); } catch (_) { return fail('read_failed'); }
    const n = xlsxSheetNames(XLSX, b, limits);
    if (!n.ok) return n;
    return { ok: true, kind: 'xlsx', sheets: n.sheets, sheet: i => xlsxSheet(XLSX, b, i, limits) };
  } catch (_) { return fail('read_failed'); }
}
