/* ═══════════════════════════════════════════════════════════════
   VALIDATION/UTIL.JS — usul validatsiyasi statistikasi uchun umumiy yordamchilar (P12). Sof modul.
═══════════════════════════════════════════════════════════════ */
import { isBlank, toNum } from '../util.js';

/** Ichki xato: evaluateValidation uni testning { error, detail } maydoniga aylantiradi. */
export class ValidationError extends Error {
  constructor(code, detail) { super(code); this.code = code; this.detail = detail === undefined ? '' : String(detail); }
}
export const fail = (code, detail) => { throw new ValidationError(code, detail); };

export const has = v => !isBlank(v);
export function num(v, where) {
  const n = typeof v === 'number' ? v : toNum(v);
  if (!Number.isFinite(n)) fail('validation_bad_data', where);
  return n;
}
/** Sonlar qatori: bo'sh kataklar tashlanadi, son bo'lmagan qiymat — xato (jimgina tashlanmaydi). */
export function nums(values, where) {
  if (!Array.isArray(values)) fail('validation_bad_data', where);
  return values.filter(has).map((v, i) => num(v, `${where}[${i}]`));
}

export const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
/** Tanlanma dispersiyasi (n − 1). Ref: JCGM 100:2008 4.2.2 Eq. (4); NIST/SEMATECH e-Handbook §7.4.3.1 */
export function variance(a) {
  const m = mean(a);
  return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1);
}

/** Ahamiyatlilik darajasi α: standart 0,05; (0; 0,5) dan tashqarida — xato. */
export const DEFAULT_ALPHA = 0.05;
export function alphaOf(v) {
  const a = has(v) ? num(v, 'alpha') : DEFAULT_ALPHA;
  if (!(a > 0 && a < 0.5)) fail('validation_bad_alpha', String(v));
  return a;
}

/**
 * Tanlanma: kuzatuvlar qatori yoki yig'ma statistika { mean, sd, n } (NIST misollari yig'ma ko'rinishda berilgan).
 * @returns {{n:number, mean:number, sd:number, variance:number, values:number[]|null}}
 */
export function sampleOf(input, where, minN = 2) {
  if (Array.isArray(input) || (input && Array.isArray(input.values))) {
    const v = nums(Array.isArray(input) ? input : input.values, where);
    if (v.length < minN) fail('validation_too_few', where);
    const va = v.length > 1 ? variance(v) : 0;
    return { n: v.length, mean: mean(v), sd: Math.sqrt(va), variance: va, values: v };
  }
  if (!input || typeof input !== 'object') fail('validation_bad_data', where);
  const n = num(input.n, `${where}.n`), sd = num(input.sd, `${where}.sd`);
  const m = has(input.mean) ? num(input.mean, `${where}.mean`) : NaN;
  if (!Number.isInteger(n) || n < minN) fail('validation_too_few', where);
  if (!(sd >= 0)) fail('validation_bad_data', `${where}.sd`);
  return { n, mean: m, sd, variance: sd * sd, values: null };
}

/** Topilma (linter topilmasi bilan bir xil tuzilma: hisobot va UI bir xil chizadi). */
export function makeFinding(table, rule, mode, code, extra) {
  const meta = table[code];
  const e = extra || {};
  const out = { id: `${rule}/${code}${e.key ? ':' + e.key : ''}`, rule, code, severity: meta.severity, ref: meta.ref, mode };
  if (e.value !== undefined && e.value !== null) out.value = String(e.value);
  if (meta.unverified) out.unverified = true;
  return out;
}
