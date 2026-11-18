/* ═══════════════════════════════════════════════════════════════
   TABLE-TEXT.JS — jadvalga qo'yiladigan (paste) va import qilinadigan matnni tahlil qilish (P05b).
   Sof modul (DOM yo'q) — Node'da test qilinadi (tests/io/table-text.test.js).
   Qoidalar:
     • vergul HECH QACHON ustun ajratuvchi emas — u o'nlik belgi ("0,028");
     • son faqat qat'iy ko'rinishda qabul qilinadi: [+-]raqamlar[.raqamlar][e±raqamlar]. Boshqa har qanday matn
       ("=1+1", "=HYPERLINK(…)", "@SUM(A1)", "-2+3", "<script>", "0x10", "Infinity") — son EMAS (NaN);
     • fayldan / clipboard'dan kelgan satr hech qachon oddiy obyekt kaliti bo'lmaydi (faqat indekslar va Map).
═══════════════════════════════════════════════════════════════ */

const NUM_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const DIR_UP = ['↑', 'up', '+'];
const DIR_DOWN = ['↓', 'down', 'dn'];

/** "0,028" → 0.028; "1 234,5" → 1234.5; "−0,5" (U+2212) → −0.5; bo'sh → null; yaroqsiz → NaN */
export function parseNumber(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[\s   ]/g, '').replace(/[−–]/g, '-').replace(',', '.');
  if (s === '') return null;
  if (s.length > 40 || !NUM_RE.test(s)) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/** Matn → kataklar panjarasi. Excel — tab; aks holda nuqta-vergul; aks holda bo'sh joylar. */
export function parseGrid(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim() !== '');
  const sep = lines.some(l => l.includes('\t')) ? /\t/ : lines.some(l => l.includes(';')) ? /;/ : /[  ]+/;
  return lines.map(l => (sep.source === '\\t' ? l : l.trim()).split(sep).map(c => c.trim()));
}

/** Katak yo'nalish belgisimi? '↑' | '↓' | null */
export function parseDirection(v) {
  const s = String(v === null || v === undefined ? '' : v).trim().toLowerCase();
  if (DIR_UP.includes(s)) return '↑';
  if (DIR_DOWN.includes(s)) return '↓';
  return null;
}

const blank = v => v === null || v === undefined || String(v).trim() === '';

/** Qator sarlavhami: kamida bitta bo'sh bo'lmagan katak bor va hech biri son emas */
export function isHeaderRow(row) {
  const cells = (row || []).filter(c => !blank(c));
  return cells.length > 0 && cells.every(c => typeof c !== 'number' && Number.isNaN(parseNumber(c)));
}

/** Sarlavha matnini solishtirish uchun soddalashtirish: kichik harf, bo'sh joysiz */
export function normalizeHeader(v) {
  return String(v === null || v === undefined ? '' : v).normalize('NFKC').toLowerCase().replace(/[\s ]+/g, '');
}

/**
 * Fayl / clipboard sarlavhalarini maqsad ustunlariga moslash (taklif).
 * @param {any[]} headers                      fayl ustunlari sarlavhalari
 * @param {{key:string, label?:string, aliases?:string[]}[]} targets
 * @returns {number[]} har bir maqsad ustuni uchun fayl ustuni indeksi yoki −1
 * Moslik: (1) aynan teng; (2) sarlavha maqsad nomi bilan boshlanib, keyin harf / raqam bo'lmagan belgi keladi
 * ("m, g", "V (cm³)"). Bitta fayl ustuni faqat bitta maqsadga beriladi.
 */
export function matchColumns(headers, targets) {
  const H = (headers || []).map(normalizeHeader);
  const used = new Set();
  const out = targets.map(() => -1);
  const names = t => [t.key, t.label, ...(t.aliases || [])].filter(x => x !== undefined && x !== null && x !== '').map(normalizeHeader);
  targets.forEach((t, ti) => {
    const ns = names(t);
    const i = H.findIndex((h, hi) => !used.has(hi) && h !== '' && ns.includes(h));
    if (i >= 0) { out[ti] = i; used.add(i); }
  });
  targets.forEach((t, ti) => {
    if (out[ti] >= 0) return;
    const ns = names(t);
    const i = H.findIndex((h, hi) => !used.has(hi) && ns.some(n => n !== '' && h.startsWith(n) && /^[^\p{L}\p{N}]/u.test(h.slice(n.length))));
    if (i >= 0) { out[ti] = i; used.add(i); }
  });
  return out;
}

/**
 * Tanlangan moslik bo'yicha panjaradan ustunlarni olish (import oynasi).
 * @param {any[][]} grid       kataklar (son | satr | null)
 * @param {number[]} mapping   maqsad ustuni → fayl ustuni indeksi (−1 — o'tkazib yuborish)
 * @param {{header?:boolean, kinds?:('number'|'direction')[]}} [opts]
 * @returns {{columns:any[][], rows:number, bad:number}}  columns[t][r] — son, '' (bo'sh yoki yaroqsiz) yoki '↑'/'↓'/''
 *   To'liq bo'sh qatorlar (tanlangan ustunlar bo'yicha) tashlanadi; son bo'lmagan katak — bo'sh ('') va `bad` ga sanaladi.
 */
export function applyMapping(grid, mapping, opts = {}) {
  const kinds = opts.kinds || [];
  const body = opts.header ? (grid || []).slice(1) : (grid || []);
  const columns = mapping.map(() => []);
  let bad = 0, rows = 0;
  for (const row of body) {
    const vals = mapping.map((src, t) => {
      const cell = src >= 0 && Array.isArray(row) ? row[src] : null;
      if (kinds[t] === 'direction') return { v: parseDirection(cell) || '', bad: !blank(cell) && !parseDirection(cell), any: false };
      const n = parseNumber(cell);
      if (n === null) return { v: '', bad: false, any: false };
      if (Number.isNaN(n)) return { v: '', bad: true, any: false };
      return { v: n, bad: false, any: true };
    });
    if (!vals.some(x => x.any) && !vals.some(x => x.bad)) continue;   // bo'sh qator
    vals.forEach((x, t) => { columns[t].push(x.v); if (x.bad) bad++; });
    rows++;
  }
  return { columns, rows, bad };
}

/**
 * Jadvalga qo'yish rejasi (GUM o'lchashlar jadvali va shunga o'xshash "qatorlar × ustunlar" jadvallari).
 * @param {string[][]} grid      parseGrid() natijasi
 * @param {string[]} columns     jadval ustunlari nomlari (parametrlar)
 * @param {{startCol?:number, startRow?:number, maxRows?:number}} [opts]
 * @returns {{cells:{row:number,col:number,value:number|''}[], dirs:{row:number,value:string}[], rows:number, lastRow:number,
 *            bad:number, header:boolean, truncated:boolean}}
 * Sarlavha qatori (son bo'lmagan birinchi qator): nomlar ustun nomlariga mos kelsa — shu moslik bo'yicha, aks holda
 * tashlab yuboriladi va ustunlar ketma-ket (startCol dan) joylanadi. Faqat ↑ / ↓ dan iborat ustun — yo'nalish ustuni.
 */
export function planTablePaste(grid, columns, opts = {}) {
  const startCol = opts.startCol || 0, startRow = opts.startRow || 0;
  const maxRows = opts.maxRows || Infinity;
  let body = grid || [];
  let header = false;
  let map = null;                                   // panjara ustuni → jadval ustuni (−1: o'tkazish, −2: yo'nalish)
  const width = Math.max(0, ...body.map(r => r.length));
  if (body.length > 1 && isHeaderRow(body[0])) {
    header = true;
    const m = matchColumns(body[0], columns.map(c => ({ key: c })));
    if (m.some(i => i >= 0)) {
      map = Array.from({ length: width }, () => -1);
      m.forEach((src, t) => { if (src >= 0) map[src] = t; });
      body[0].forEach((h, j) => { if (map[j] === -1 && (parseDirection(h) || normalizeHeader(h) === '↑/↓')) map[j] = -2; });
    }
    body = body.slice(1);
  }
  if (!map) {
    map = [];
    let next = startCol;
    for (let j = 0; j < width; j++) {
      const col = body.map(r => r[j]).filter(c => !blank(c));
      if (col.length && col.every(c => parseDirection(c) && Number.isNaN(parseNumber(c)))) map.push(-2);
      else map.push(next < columns.length ? next++ : -1);
    }
  } else {
    // sarlavha bo'yicha moslikda ham yo'nalish ustunini mazmunidan aniqlash
    for (let j = 0; j < width; j++) {
      if (map[j] !== -1) continue;
      const col = body.map(r => r[j]).filter(c => !blank(c));
      if (col.length && col.every(c => parseDirection(c) && Number.isNaN(parseNumber(c)))) map[j] = -2;
    }
  }
  const truncated = body.length > maxRows;
  if (truncated) body = body.slice(0, maxRows);
  const cells = [], dirs = [];
  let bad = 0;
  body.forEach((r, i) => {
    r.forEach((c, j) => {
      const t = map[j];
      if (t === -1 || t === undefined) return;
      if (t === -2) { dirs.push({ row: startRow + i, value: parseDirection(c) || '' }); return; }
      const n = parseNumber(c);
      if (Number.isNaN(n)) { bad++; cells.push({ row: startRow + i, col: t, value: '' }); return; }
      cells.push({ row: startRow + i, col: t, value: n === null ? '' : n });
    });
  });
  return { cells, dirs, rows: body.length, lastRow: startRow + body.length - 1, bad, header, truncated };
}
