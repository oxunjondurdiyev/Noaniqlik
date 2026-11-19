/* ═══════════════════════════════════════════════════════════════
   VALIDATION/GRUBBS.JS — Grubbs testi: BITTA chetga chiquvchi qiymat (P12). Sof modul.
   Ref: NIST/SEMATECH e-Handbook of Statistical Methods §1.3.5.17.1 "Grubbs' Test for Outliers"
        (docs/references/nist-ehandbook-p12/eda/section3/eda35h1.htm):
     ikki tomonlama:  G = max|Y_i − Ȳ| / s
     bir tomonlama:   G = (Ȳ − Y_min)/s  yoki  G = (Y_max − Ȳ)/s
     kritik soha:     G > ((N − 1)/√N)·√(t²/(N − 2 + t²)),
                      t = t_{α/(2N); N−2} (ikki tomonlama),  t = t_{α/N; N−2} (bir tomonlama) — yuqori kritik qiymat.
   Test FAQAT bitta chetga chiquvchini aniqlaydi ("If you suspect more than one outlier may be present, it is recommended
   that you use either the Tietjen-Moore test or the generalized extreme studentized deviate test"). Dastur nuqtani
   O'CHIRMAYDI — faqat belgilaydi ("If there is no reason to believe that the outlying point is in error, it should not
   be deleted without careful consideration"). Chiqarish — foydalanuvchi qarori, izoh bilan (evaluateValidation: excluded).
   Linter A4 (src/engine/linter/rules/a04-grubbs-outlier.js) — ikki tomonlama variantning o'zi; u o'zgarmagan.
═══════════════════════════════════════════════════════════════ */
import { nums, mean, variance, alphaOf, fail } from './util.js';
import { tCriticalUpper } from '../stats/fdist.js';

export const GRUBBS_SIDES = Object.freeze(['two', 'max', 'min']);
export const GRUBBS_MIN_N = 3;
export const GRUBBS_REF = 'NIST/SEMATECH e-Handbook §1.3.5.17.1';

/**
 * Grubbs kritik qiymati.
 * @param {number} n  kuzatuvlar soni (≥ 3)
 * @param {number} alpha  ahamiyatlilik darajasi
 * @param {'two'|'max'|'min'} [side='two']
 */
export function grubbsCriticalValue(n, alpha, side = 'two') {
  if (!(n >= GRUBBS_MIN_N)) return NaN;
  // Ref: NIST §1.3.5.17.1 — ikki tomonlama: α/(2N); bir tomonlama: α/N
  const t = tCriticalUpper(side === 'two' ? alpha / (2 * n) : alpha / n, n - 2);
  return ((n - 1) / Math.sqrt(n)) * Math.sqrt((t * t) / (n - 2 + t * t));
}

/**
 * @param {number[]} values
 * @param {{alpha?:number, side?:'two'|'max'|'min'}} [opts]
 * @returns {{n, mean, s, side, alpha, G, index, value, critical, outlier:boolean, ref}}
 */
export function grubbsTest(values, opts = {}) {
  const side = opts.side === undefined ? 'two' : opts.side;
  if (!GRUBBS_SIDES.includes(side)) fail('validation_bad_test', `grubbs.side: ${opts.side}`);
  const alpha = alphaOf(opts.alpha);
  const x = nums(values, 'values');
  const n = x.length;
  if (n < GRUBBS_MIN_N) fail('validation_too_few', `n = ${n} < ${GRUBBS_MIN_N}`);
  const m = mean(x), s = Math.sqrt(variance(x));
  if (!(s > 0)) fail('validation_zero_sd', 's = 0');
  let index = 0;
  const dev = v => (side === 'max' ? v - m : side === 'min' ? m - v : Math.abs(v - m));
  for (let i = 1; i < n; i++) if (dev(x[i]) > dev(x[index])) index = i;
  const G = dev(x[index]) / s;
  const critical = grubbsCriticalValue(n, alpha, side);
  return { n, mean: m, s, side, alpha, G, index, value: x[index], critical, outlier: G > critical, ref: GRUBBS_REF };
}
