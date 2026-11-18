/* ═══════════════════════════════════════════════════════════════
   LAB/CMC.JS — akkreditatsiya sohasi va CMC jadvali (P11). Sof modul.

   Ref: ILAC P14:09/2020 §4.1 (p. 6): soha CMC ni a) o'lchanadigan kattalik, b) usul / asbob turi, c) o'lchash diapazoni,
        d) o'lchash noaniqligi bilan ifodalaydi;
        §4.2 (p. 6): noaniqlikni ifodalash usullari — a) butun diapazonda amal qiladigan bitta qiymat; b) diapazon
        ("linear interpolation is appropriate in order to find the uncertainty at intermediate values"); c) o'lchanadigan
        kattalikning oshkor funksiyasi; d) matritsa; e) grafik. Ochiq intervallar ("0 < U < x") noto'g'ri;
        §4.3 (p. 6): CMC — kengaytirilgan noaniqlik, P ≈ 95 %; birligi o'lchanadigan kattalik birligida yoki nisbiy (%, µV/V);
        §5.5 (p. 8): akkreditatsiyalangan laboratoriya CMC dan KICHIK noaniqlikni hisobotda ko'rsatmaydi.

   Qator turlari (type):
     'abs'    — bitta qiymat (§4.2 a):                 CMC = value
     'rel'    — nisbiy, foizda (§4.3):                 CMC = value/100 · |X|
     'linear' — oshkor funksiya a + b·|X| (§4.2 c):    CMC = a + b·|X|
     'range'  — diapazon (§4.2 b): CMC min da cmcMin, max da cmcMax; oraliqda chiziqli interpolyatsiya
   Matritsa (d) va grafik (e) ko'rinishlari qo'llab-quvvatlanmaydi.
   Dastur U ni CMC ga AVTOMATIK ALMASHTIRMAYDI (CLAUDE.md; egasi qarori) — faqat solishtiradi.
═══════════════════════════════════════════════════════════════ */

export const CMC_TYPES = Object.freeze(['abs', 'rel', 'linear', 'range']);
export const CMC_ERRORS = Object.freeze(['cmc_bad_row', 'cmc_bad_x']);

const num = v => (typeof v === 'number' ? v : (v === null || v === undefined || String(v).trim() === '' ? NaN : Number(String(v).replace(',', '.'))));
const str = v => (v === null || v === undefined ? '' : String(v).trim());

/** Qatorni tozalash (noma'lum maydonlar tashlanadi). */
export function cleanCmcRow(r) {
  const o = r || {};
  const type = CMC_TYPES.includes(o.type) ? o.type : 'abs';
  const f = k => (Number.isFinite(num(o[k])) ? num(o[k]) : null);
  return {
    id: str(o.id), quantity: str(o.quantity), min: f('min'), max: f('max'), unit: str(o.unit), type,
    ...(type === 'abs' || type === 'rel' ? { value: f('value') } : {}),
    ...(type === 'linear' ? { a: f('a'), b: f('b') } : {}),
    ...(type === 'range' ? { cmcMin: f('cmcMin'), cmcMax: f('cmcMax') } : {}),
    method: str(o.method), note: str(o.note),
  };
}

/** Qator to'g'riligi: diapazon (min ≤ max), parametrlar musbat / manfiy emas. @returns {string|null} xato kodi */
export function cmcRowError(row) {
  const r = row || {};
  if (!(Number.isFinite(r.min) && Number.isFinite(r.max) && r.min <= r.max)) return 'cmc_bad_row';
  if (r.type === 'abs' || r.type === 'rel') return r.value > 0 ? null : 'cmc_bad_row';
  if (r.type === 'linear') return Number.isFinite(r.a) && Number.isFinite(r.b) && r.a >= 0 && r.b >= 0 && (r.a > 0 || r.b > 0) ? null : 'cmc_bad_row';
  if (r.type === 'range') return r.cmcMin > 0 && r.cmcMax > 0 ? null : 'cmc_bad_row';
  return 'cmc_bad_row';
}

/** X qator diapazonida (chegaralar KIRADI: min ≤ X ≤ max). */
export function inRange(row, x) {
  return Number.isFinite(x) && Number.isFinite(row.min) && Number.isFinite(row.max) && x >= row.min && x <= row.max;
}

/**
 * CMC(X) — bitta qator bo'yicha.
 * @returns {{cmc:number|null, inRange:boolean, x:number, type:string}|{error:string}}  diapazondan tashqarida cmc = null
 */
export function cmcAt(row, xIn) {
  const r = cleanCmcRow(row);
  if (cmcRowError(r)) return { error: 'cmc_bad_row' };
  const x = num(xIn);
  if (!Number.isFinite(x)) return { error: 'cmc_bad_x' };
  if (!inRange(r, x)) return { cmc: null, inRange: false, x, type: r.type };
  let cmc;
  if (r.type === 'abs') cmc = r.value;
  else if (r.type === 'rel') cmc = r.value / 100 * Math.abs(x);
  else if (r.type === 'linear') cmc = r.a + r.b * Math.abs(x);
  else cmc = r.max === r.min ? Math.max(r.cmcMin, r.cmcMax) : r.cmcMin + (x - r.min) / (r.max - r.min) * (r.cmcMax - r.cmcMin);
  return { cmc, inRange: true, x, type: r.type };
}

/**
 * Jadvaldan X ga mos qatorni topish. `quantity` va `method` berilsa — shular bo'yicha suziladi.
 * Bir nechta qator mos kelsa (chegarada ikki diapazon tutashgan) — CMC si KATTA bo'lgani olinadi
 * (konservativ; loyiha qarori — docs/RISKS.md R-25).
 * @returns {{row:object, cmc:number, x:number, candidates:number}|{row:null, outside:true, candidates:number}|{error}}
 */
export function findCmc(rows, xIn, filter = {}) {
  const x = num(xIn);
  if (!Number.isFinite(x)) return { error: 'cmc_bad_x' };
  const q = str(filter.quantity).toLowerCase(), m = str(filter.method).toLowerCase();
  const list = (rows || []).map(cleanCmcRow).filter(r => !cmcRowError(r))
    .filter(r => (!q || r.quantity.toLowerCase() === q) && (!m || r.method.toLowerCase() === m));
  let best = null;
  for (const r of list) {
    const c = cmcAt(r, x);
    if (c.error || !c.inRange) continue;
    if (!best || c.cmc > best.cmc) best = { row: r, cmc: c.cmc, x, candidates: list.length };
  }
  return best || { row: null, outside: true, x, candidates: list.length };
}

/**
 * Hisobdagi tekshiruv: U va CMC(X). Hisob holatida qatorning NUSXASI saqlanadi (settings.cmcRow) — jadval keyin
 * o'zgarsa ham eski hisob o'zgarmaydi.
 * @returns {{rowId, tableVersion, quantity, method, type, min, max, unit, x, cmc, inRange, below:boolean|null}|{error}}
 */
export function cmcCheck(row, x, U) {
  const c = cmcAt(row, x);
  const r = cleanCmcRow(row);
  const base = { rowId: r.id, tableVersion: Number((row || {}).tableVersion) || 0, quantity: r.quantity, method: r.method, type: r.type, min: r.min, max: r.max, unit: r.unit };
  if (c.error) return { ...base, error: c.error };
  return { ...base, x: c.x, cmc: c.cmc, inRange: c.inRange, below: c.inRange ? U < c.cmc : null };
}

/**
 * Hisobdagi tekshiruv — bir kattalikning BIR NECHTA qatori (turli diapazonlar) bo'yicha: X ga mos qator avtomatik topiladi.
 * Hech bir qator diapazoniga tushmasa — soha chegaralari (eng kichik min … eng katta max) bilan `inRange: false`.
 */
export function cmcCheckRows(rows, x, U) {
  const list = (rows || []).filter(r => r && typeof r === 'object');
  if (!list.length) return { error: 'cmc_bad_row' };
  const f = findCmc(list, x);
  if (f.error) return { error: f.error };
  if (f.row) {
    const src = list.find(r => String(r.id || '') === f.row.id) || {};
    return { ...cmcCheck({ ...f.row, tableVersion: src.tableVersion }, x, U), rows: f.candidates };
  }
  const ok = list.map(cleanCmcRow).filter(r => !cmcRowError(r));
  if (!ok.length) return { error: 'cmc_bad_row' };
  return {
    rowId: '', tableVersion: Number(list[0].tableVersion) || 0, quantity: ok[0].quantity, method: ok[0].method, type: '', unit: ok[0].unit,
    min: Math.min(...ok.map(r => r.min)), max: Math.max(...ok.map(r => r.max)), x: f.x, cmc: null, inRange: false, below: null, rows: ok.length,
  };
}
