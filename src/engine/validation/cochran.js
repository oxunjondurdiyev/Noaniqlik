/* ═══════════════════════════════════════════════════════════════
   VALIDATION/COCHRAN.JS — Cochran C testi: dispersiyalar bir jinsliligi (eng katta dispersiya) (P12). Sof modul.
     C = s²_max / Σ s_i²   (p ta guruh, har birida n ta takror — muvozanatli)
     C_crit(α; p, n) = 1 / (1 + (p − 1) / F_{α/p; n−1, (p−1)(n−1)}),  F — yuqori kritik qiymat.
   MANBA REPODA YO'Q: ISO 5725-2:2019 §7.3.3 (Cochran testi va kritik qiymatlar jadvali) — pullik → (unverified).
   Analitik formula — C ning F-taqsimot orqali ifodasi (Cochran 1941) — repoda yo'q; kritik qiymat Monte-Karlo bilan
   mustaqil tekshirilgan (tests/engine/validation.test.js — majburiy emas, "unverified").
   Natijada HAR DOIM `cochran_unverified` topilmasi chiqadi. Dastur guruhni o'chirmaydi — faqat belgilaydi.
═══════════════════════════════════════════════════════════════ */
import { sampleOf, alphaOf, fail } from './util.js';
import { fCritical } from '../stats/fdist.js';

export const COCHRAN_REF = 'ISO 5725-2:2019 §7.3.3 (unverified)';

/** Kritik qiymat (yuqori, ahamiyatlilik darajasi α). */
export function cochranCritical(p, n, alpha) {
  if (!(p >= 2) || !(n >= 2)) return NaN;
  const f = fCritical(alpha / p, n - 1, (p - 1) * (n - 1));
  return 1 / (1 + (p - 1) / f);
}

/**
 * @param {Array<number[]|{sd:number,n:number}>} groups  guruhlar (kuzatuvlar yoki {sd, n})
 * @param {{alpha?:number}} [opts]
 * @returns {{p, n, variances:number[], C, index, critical, alpha, outlier:boolean, ref, unverified:true}}
 */
export function cochranTest(groups, opts = {}) {
  const alpha = alphaOf(opts.alpha);
  if (!Array.isArray(groups) || groups.length < 2) fail('validation_too_few', 'groups');
  const g = groups.map((x, i) => sampleOf(x, `groups[${i}]`, 2));
  const n = g[0].n;
  if (g.some(x => x.n !== n)) fail('validation_unbalanced', 'cochran: groups must have equal size');
  const variances = g.map(x => x.variance);
  const sum = variances.reduce((a, b) => a + b, 0);
  if (!(sum > 0)) fail('validation_zero_sd', 'Σs² = 0');
  let index = 0;
  for (let i = 1; i < variances.length; i++) if (variances[i] > variances[index]) index = i;
  const C = variances[index] / sum;
  const critical = cochranCritical(g.length, n, alpha);
  return { p: g.length, n, variances, C, index, critical, alpha, outlier: C > critical, ref: COCHRAN_REF, unverified: true };
}
