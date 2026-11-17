/* ═══════════════════════════════════════════════════════════════
   REGRESSION/CHI2.JS — χ² taqsimoti: CDF va kvantil (model yaroqliligi testi uchun).
═══════════════════════════════════════════════════════════════ */
import { lgamma } from '../special.js';

/** Regulyarlashgan to'liqmas gamma funksiya P(a, x) = γ(a, x)/Γ(a).
    Ref: Abramowitz & Stegun (1964) 6.5.29 (qator, x < a + 1) va 6.5.31 (zanjir kasr, x ≥ a + 1;
    o'zgartirilgan Lentz usuli). */
export function gammaP(a, x) {
  if (!(a > 0) || !(x >= 0)) return NaN;
  if (x === 0) return 0;
  if (!isFinite(x)) return 1;
  const lnPre = a * Math.log(x) - x - lgamma(a);
  if (x < a + 1) {
    let term = 1 / a, sum = term;
    for (let n = 1; n < 1000; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-16) break;
    }
    return Math.min(1, sum * Math.exp(lnPre));
  }
  const TINY = 1e-300;
  let b = x + 1 - a, c = 1 / TINY, d = 1 / b, h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < TINY) d = TINY;
    c = b + an / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return Math.max(0, 1 - Math.exp(lnPre) * h);
}

/** χ² taqsimoti CDF: Pr(χ²_ν ≤ x) = P(ν/2, x/2). Ref: Abramowitz & Stegun 26.4.19 */
export function chi2Cdf(x, nu) {
  if (!(nu > 0)) return NaN;
  if (!(x > 0)) return 0;
  return gammaP(nu / 2, x / 2);
}

/** χ²_P(ν) kvantili: Pr(χ²_ν ≤ q) = P. Boshlang'ich yaqinlashish — Wilson–Hilferty
    (Ref: Abramowitz & Stegun 26.4.17), so'ng CDF bo'yicha ikkiga bo'lish (monoton, ishonchli). */
export function chi2Quantile(P, nu) {
  if (!(nu > 0) || !(P > 0) || !(P < 1)) return NaN;
  let hi = Math.max(nu + 10 * Math.sqrt(2 * nu) + 20, 1);
  while (chi2Cdf(hi, nu) < P) hi *= 2;
  let lo = 0;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (chi2Cdf(mid, nu) < P) lo = mid; else hi = mid;
    if (hi - lo <= 1e-14 * hi) break;
  }
  return (lo + hi) / 2;
}
