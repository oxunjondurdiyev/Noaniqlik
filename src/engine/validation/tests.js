/* ═══════════════════════════════════════════════════════════════
   VALIDATION/TESTS.JS — ikki tanlanma t-testi va F-testi (P12). Sof modul.
   Ref: NIST/SEMATECH e-Handbook §1.3.5.3 "Two-Sample t-Test for Equal Means" (eda353.htm):
     T = (Ȳ₁ − Ȳ₂)/√(s₁²/N₁ + s₂²/N₂);
     ν = (s₁²/N₁ + s₂²/N₂)² / [ (s₁²/N₁)²/(N₁ − 1) + (s₂²/N₂)²/(N₂ − 1) ]                   (teng bo'lmagan dispersiya)
     teng dispersiya:  T = (Ȳ₁ − Ȳ₂)/(s_p·√(1/N₁ + 1/N₂)),  s_p² = [(N₁ − 1)s₁² + (N₂ − 1)s₂²]/(N₁ + N₂ − 2),  ν = N₁ + N₂ − 2
     rad etish:  |T| > t_{1−α/2; ν} (ikki tomonlama);  T > t_{1−α; ν};  T < t_{α; ν}
   Ref: NIST/SEMATECH e-Handbook §1.3.5.9 "F-Test for Equality of Two Variances" (eda359.htm):
     F = s₁²/s₂²;  rad etish:  F > F_{α; N₁−1, N₂−1} (yuqori);  F < F_{1−α; …} (quyi);
     F < F_{1−α/2; …} yoki F > F_{α/2; …} (ikki tomonlama);  F_α — YUQORI kritik qiymat.
═══════════════════════════════════════════════════════════════ */
import { sampleOf, alphaOf, fail } from './util.js';
import { tTail2 } from '../special.js';
import { fUpperTail, fCritical, tCriticalUpper, tUpperTail } from '../stats/fdist.js';

export const TAILS = Object.freeze(['two', 'upper', 'lower']);
export const TTEST_REF = 'NIST/SEMATECH e-Handbook §1.3.5.3';
export const FTEST_REF = 'NIST/SEMATECH e-Handbook §1.3.5.9';

function tailOf(v, where) {
  const tail = v === undefined ? 'two' : v;
  if (!TAILS.includes(tail)) fail('validation_bad_test', `${where}.tail: ${v}`);
  return tail;
}

/**
 * Ikki tanlanma t-testi (juftlanmagan).
 * @param {number[]|{mean,sd,n}} a
 * @param {number[]|{mean,sd,n}} b
 * @param {{equalVariance?:boolean, alpha?:number, tail?:'two'|'upper'|'lower'}} [opts]  equalVariance: standart true (NIST misoli); false — Welch
 */
export function twoSampleT(a, b, opts = {}) {
  const alpha = alphaOf(opts.alpha), tail = tailOf(opts.tail, 'ttest');
  const equal = opts.equalVariance !== false;
  const s1 = sampleOf(a, 'a'), s2 = sampleOf(b, 'b');
  if (!Number.isFinite(s1.mean) || !Number.isFinite(s2.mean)) fail('validation_bad_data', 'mean');
  const v1 = s1.variance / s1.n, v2 = s2.variance / s2.n;
  let se, df, sp = null;
  if (equal) {
    // Ref: NIST §1.3.5.3 — s_p² va ν = N₁ + N₂ − 2
    df = s1.n + s2.n - 2;
    sp = Math.sqrt(((s1.n - 1) * s1.variance + (s2.n - 1) * s2.variance) / df);
    se = sp * Math.sqrt(1 / s1.n + 1 / s2.n);
  } else {
    // Ref: NIST §1.3.5.3 — Welch–Satterthwaite ν
    se = Math.sqrt(v1 + v2);
    df = (v1 + v2) ** 2 / (v1 * v1 / (s1.n - 1) + v2 * v2 / (s2.n - 1));
  }
  if (!(se > 0)) fail('validation_zero_sd', 's = 0');
  const T = (s1.mean - s2.mean) / se;
  const critical = tCriticalUpper(tail === 'two' ? alpha / 2 : alpha, df);
  const p = tail === 'two' ? tTail2(T, df) : tail === 'upper' ? tUpperTail(T, df) : 1 - tUpperTail(T, df);
  const reject = tail === 'two' ? Math.abs(T) > critical : tail === 'upper' ? T > critical : T < -critical;
  return {
    equalVariance: equal, tail, alpha, n1: s1.n, n2: s2.n, mean1: s1.mean, mean2: s2.mean, sd1: s1.sd, sd2: s2.sd,
    difference: s1.mean - s2.mean, sp, se, T, df, critical, p, reject, ref: TTEST_REF,
  };
}

/**
 * Ikki dispersiya tengligining F-testi.
 * @param {number[]|{sd,n}} a
 * @param {number[]|{sd,n}} b
 * @param {{alpha?:number, tail?:'two'|'upper'|'lower'}} [opts]
 */
export function fTest(a, b, opts = {}) {
  const alpha = alphaOf(opts.alpha), tail = tailOf(opts.tail, 'ftest');
  const s1 = sampleOf(a, 'a'), s2 = sampleOf(b, 'b');
  if (!(s2.variance > 0) || !(s1.variance > 0)) fail('validation_zero_sd', 's = 0');
  const F = s1.variance / s2.variance, df1 = s1.n - 1, df2 = s2.n - 1;
  const up = fUpperTail(F, df1, df2);
  let lower = null, upper = null, reject, p;
  if (tail === 'two') {
    lower = fCritical(1 - alpha / 2, df1, df2); upper = fCritical(alpha / 2, df1, df2);
    reject = F < lower || F > upper; p = Math.min(1, 2 * Math.min(up, 1 - up));
  } else if (tail === 'upper') { upper = fCritical(alpha, df1, df2); reject = F > upper; p = up; }
  else { lower = fCritical(1 - alpha, df1, df2); reject = F < lower; p = 1 - up; }
  return { tail, alpha, n1: s1.n, n2: s2.n, sd1: s1.sd, sd2: s2.sd, F, df1, df2, lower, upper, p, reject, ref: FTEST_REF };
}
