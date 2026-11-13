/* Umumiy yordamchi funksiyalar (sof, DOM'siz). */

export function isBlank(v) {
  return v === '' || v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

/** "1,5" → 1.5; bo'sh → NaN */
export function toNum(v) {
  if (isBlank(v)) return NaN;
  return Number(String(v).replace(',', '.'));
}

export function pairKey(a, b) { return a + '|' + b; }

/** IEEE 754 double mashina epsiloni */
export const EPS = Number.EPSILON;
