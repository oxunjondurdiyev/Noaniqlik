/* ═══════════════════════════════════════════════════════════════
   STATS/FDIST.JS — Fisher F-taqsimoti (P12): taqsimot funksiyasi, yuqori dum ehtimoli, yuqori kritik qiymat;
   bir tomonlama Styudent kvantili va dum ehtimoli. Sof modul.
   F va t — to'liqmas beta funksiya orqali (src/engine/special.js::ibeta — P03 da mpmath jadvali bilan tekshirilgan).
   Ref: Abramowitz & Stegun (1964) 26.6.2: Q(F | ν1, ν2) = I_x(ν2/2, ν1/2), x = ν2/(ν2 + ν1·F).
   Belgilash — NIST/SEMATECH e-Handbook §1.3.5.9: F_α — YUQORI kritik qiymat (P(F > F_α) = α), F_{1−α} — quyi.
═══════════════════════════════════════════════════════════════ */
import { ibeta, tQuantile, tTail2 } from '../special.js';

/** Yuqori dum ehtimoli P(F > x), F ~ F(d1, d2). */
export function fUpperTail(x, d1, d2) {
  if (!(d1 > 0) || !(d2 > 0) || Number.isNaN(x)) return NaN;
  if (!(x > 0)) return 1;
  if (!Number.isFinite(x)) return 0;
  // Ref: Abramowitz & Stegun 26.6.2
  return ibeta(d2 / 2, d1 / 2, d2 / (d2 + d1 * x));
}

/** Taqsimot funksiyasi P(F ≤ x). */
export function fCdf(x, d1, d2) {
  if (!(d1 > 0) || !(d2 > 0) || Number.isNaN(x)) return NaN;
  if (!(x > 0)) return 0;
  if (!Number.isFinite(x)) return 1;
  return ibeta(d1 / 2, d2 / 2, d1 * x / (d1 * x + d2));
}

/**
 * Yuqori kritik qiymat F_α(d1, d2): P(F > F_α) = α (bisektsiya — dum ehtimoli monoton kamayadi).
 * Quyi kritik qiymat: fCritical(1 − α, d1, d2).
 */
export function fCritical(alpha, d1, d2) {
  if (!(alpha > 0 && alpha < 1) || !(d1 > 0) || !(d2 > 0)) return NaN;
  let lo = 0, hi = 1;
  while (fUpperTail(hi, d1, d2) > alpha) { lo = hi; hi *= 2; if (hi > 1e300) return Infinity; }
  for (let i = 0; i < 2000; i++) {
    const mid = 0.5 * (lo + hi);
    if (mid === lo || mid === hi) break;
    if (fUpperTail(mid, d1, d2) > alpha) lo = mid; else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/** Bir tomonlama Styudent kritik qiymati t_{1−α; ν}: P(T > t) = α (0 < α < 0,5). */
export function tCriticalUpper(alpha, nu) {
  if (!(alpha > 0 && alpha < 0.5)) return NaN;
  return tQuantile(1 - 2 * alpha, nu);   // tQuantile — ikki tomonlama qamrov P bilan: P = 1 − 2α
}

/** Bir tomonlama dum ehtimoli P(T > t). */
export function tUpperTail(t, nu) {
  const half = tTail2(t, nu) / 2;
  return t >= 0 ? half : 1 - half;
}
