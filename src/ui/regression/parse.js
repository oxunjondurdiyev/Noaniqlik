/* ═══════════════════════════════════════════════════════════════
   REGRESSION/PARSE.JS — P08: jadvalga qo'yiladigan (paste) matnni tahlil qilish.
   Sof modul (DOM yo'q) — Node'da test qilinadi (tests/ui/regression.test.js).
   Vergul HECH QACHON ustun ajratuvchi emas: u o'nlik belgi ("0,028").
═══════════════════════════════════════════════════════════════ */

export const COLUMNS = ['x', 'ux', 'y', 'uy'];

/** "0,028" → 0.028; "1 234,5" → 1234.5; "−0,5" (U+2212) → −0.5; bo'sh → null; yaroqsiz → NaN */
export function parseNumber(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[\s   ]/g, '').replace(/[−–]/g, '-').replace(',', '.');
  if (s === '') return null;
  return /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s) ? Number(s) : NaN;
}

/** Matn → kataklar panjarasi. Excel — tab; aks holda nuqta-vergul; aks holda bo'sh joylar. */
export function parseGrid(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim() !== '');
  const sep = lines.some(l => l.includes('\t')) ? /\t/ : lines.some(l => l.includes(';')) ? /;/ : /[  ]+/;
  return lines.map(l => (sep.source === '\\t' ? l : l.trim()).split(sep).map(c => c.trim()));
}

/**
 * Qo'yilgan panjara → jadval qatorlari ({x, ux, y, uy} — satr ko'rinishida, o'nlik nuqta bilan).
 * Birinchi ustunga (x) qo'yilganda: 2 ustun — x, y; 3 ustun — x, y, u(y); 4 ustun — x, u(x), y, u(y).
 * Boshqa ustunga qo'yilganda — o'sha ustundan boshlab ketma-ket (elektron jadvaldagi kabi).
 * Sarlavha qatori (son bo'lmagan birinchi qator) tashlab yuboriladi.
 * @returns {{rows:object[], skipped:number}}
 */
export function gridToRows(grid, startCol = 0) {
  const width = Math.max(0, ...grid.map(r => r.length));
  const map = startCol === 0
    ? (width <= 2 ? ['x', 'y'] : width === 3 ? ['x', 'y', 'uy'] : COLUMNS)
    : COLUMNS.slice(startCol);
  const rows = [];
  let skipped = 0;
  grid.forEach((cells) => {
    const row = {};
    let bad = false, any = false;
    map.forEach((key, j) => {
      const n = parseNumber(cells[j]);
      if (Number.isNaN(n)) bad = true;
      else if (n !== null) { row[key] = String(n); any = true; }
    });
    if (bad) { skipped++; return; } // sarlavha yoki son bo'lmagan qator
    if (!any) return;
    rows.push(row);
  });
  return { rows, skipped };
}

/** "0,071 0,072; 0.070" → [0.071, 0.072, 0.07]; yaroqsiz bo'lak → NaN (chaqiruvchi xato beradi) */
export function parseList(text) {
  return String(text || '').replace(/[   ]/g, ' ').split(/[\s;]+/).filter(s => s !== '').map(parseNumber);
}

/** Matritsa (GLS kovariatsiyasi): qatorlar yangi satrda */
export function parseMatrix(text) {
  return parseGrid(text).map(r => r.map(parseNumber));
}

/** "X  U" qatorlari → [{x, U}] */
export function parsePairs(text) {
  return parseGrid(text).map(r => ({ x: parseNumber(r[0]), U: parseNumber(r[1]) })).filter(p => p.x !== null || p.U !== null);
}

/** Jadval qatorlari → dvigatel nuqtalari (to'liq bo'sh qatorlar tashlanadi; qiymatlar son yoki NaN) */
export function rowsToPoints(rows) {
  const out = [];
  for (const r of rows || []) {
    const p = {};
    let any = false;
    for (const k of COLUMNS) {
      const n = parseNumber(r[k]);
      if (n !== null) { p[k] = n; any = true; }
    }
    if (any) out.push(p);
  }
  return out;
}
