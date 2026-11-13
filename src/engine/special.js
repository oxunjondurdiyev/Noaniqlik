/* ═══════════════════════════════════════════════════════════════
   SPECIAL.JS — maxsus funksiyalar: ln Γ, ln B, to'liqmas beta funksiya,
   normal taqsimot (CDF, kvantil — Wichura AS241), Styudent t (CDF, kvantil).
   Aniqlik: normal kvantil ~1e-15 nisbiy, t-kvantil ~1e-12 nisbiy
   (tests/engine/quantiles.test.js — mustaqil mpmath jadvali bilan).
═══════════════════════════════════════════════════════════════ */

const LN_SQRT_2PI = 0.918938533204672741780329736406; // ln √(2π)

/* ─── ln Γ(x), x > 0 ─────────────────────────────────
   Ref: C. Lanczos, SIAM J. Numer. Anal. B1 (1964) 86–96; g = 7, n = 9
   koeffitsiyentlari (P. Godfrey). Nisbiy xato ~1e-15. */
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012,
  9.9843695780195716e-6, 1.5056327351493116e-7,
];
export function lgamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  let a = LANCZOS[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
  return LN_SQRT_2PI + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/* Stirling qatori qoldig'i: ln Γ(x) − [(x−½)ln x − x + ln√(2π)], x ≥ 10.
   Ref: Abramowitz & Stegun (1964) 6.1.41. Qoldiq < 1e-15. */
function lgammacor(x) {
  const x2 = 1 / (x * x);
  return (1 / 12 - x2 * (1 / 360 - x2 * (1 / 1260 - x2 * (1 / 1680 - x2 * (1 / 1188 - x2 * (691 / 360360 - x2 / 156)))))) / x;
}

/** ln B(a, b) — katta argumentlarda yo'qotishsiz (R `lbeta` usuli: Stirling qoldig'i bilan). */
export function lbeta(a, b) {
  const p = Math.min(a, b), q = Math.max(a, b);
  if (p >= 10) {
    const corr = lgammacor(p) + lgammacor(q) - lgammacor(p + q);
    return -0.5 * Math.log(q) + LN_SQRT_2PI + corr + (p - 0.5) * Math.log(p / (p + q)) + q * Math.log1p(-p / (p + q));
  }
  if (q >= 10) {
    const corr = lgammacor(q) - lgammacor(p + q);
    return lgamma(p) + corr + p - p * Math.log(p + q) + (q - 0.5) * Math.log1p(-p / (p + q));
  }
  return lgamma(p) + lgamma(q) - lgamma(p + q);
}

/* To'liqmas beta funksiyasining zanjirli kasri (modifikatsiyalangan Lentz).
   Ref: Press et al., Numerical Recipes, 3rd ed. (2007) §6.4, Eq. 6.4.5. */
function betacf(a, b, x) {
  const FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 100000; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return h;
}

/**
 * Regulyarlashgan to'liqmas beta I_x(a, b). x va 1−x alohida beriladi (yo'qotishsiz).
 * lnx = ln x, ln1mx = ln(1−x).
 */
function ibetaParts(a, b, x, y, lnx, ln1mx) {
  if (x <= 0) return 0;
  if (y <= 0) return 1;
  const lbt = a * lnx + b * ln1mx - lbeta(a, b);
  if (x < (a + 1) / (a + b + 2)) return Math.exp(lbt) * betacf(a, b, x) / a;
  return 1 - Math.exp(lbt) * betacf(b, a, y) / b;
}

export function ibeta(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return ibetaParts(a, b, x, 1 - x, Math.log(x), Math.log1p(-x));
}

/* ─── Normal taqsimot ───────────────────────────────── */

/** erfc(x), x ≥ 0: x < 2 — Teylor qatori (erf), aks holda zanjirli kasr. Nisbiy xato ~1e-15. */
function erfcPos(x) {
  if (x < 2) {
    // erf x = 2/√π · Σ (−1)ⁿ x^(2n+1) / (n!(2n+1))
    let term = x, sum = x;
    const x2 = x * x;
    for (let n = 1; n < 200; n++) {
      term *= -x2 / n;
      const add = term / (2 * n + 1);
      sum += add;
      if (Math.abs(add) < 1e-17 * Math.abs(sum)) break;
    }
    return 1 - 2 / Math.sqrt(Math.PI) * sum;
  }
  // erfc x = e^{−x²}/√π · 1/(x + ½/(x + 1/(x + 3/2/(x + …))))  (Lentz)
  const FPMIN = 1e-300;
  let f = x, C = x, D = 0;
  for (let n = 1; n < 500; n++) {
    const an = n / 2;
    D = x + an * D; if (Math.abs(D) < FPMIN) D = FPMIN;
    C = x + an / C; if (Math.abs(C) < FPMIN) C = FPMIN;
    D = 1 / D;
    const del = C * D;
    f *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return Math.exp(-x * x) / Math.sqrt(Math.PI) / f;
}

/** Standart normal taqsimot funksiyasi Φ(z) */
export function normalCdf(z) {
  const t = Math.abs(z) / Math.SQRT2;
  const q = 0.5 * erfcPos(t); // P(Z > |z|)
  return z >= 0 ? 1 - q : q;
}

/**
 * Standart normal kvantil Φ⁻¹(p) (Excel NORMSINV / NORM.S.INV).
 * Ref: M. J. Wichura, Algorithm AS 241 "The percentage points of the normal distribution",
 *      Appl. Statist. 37 (1988) 477–484 — PPND16, nisbiy xato ~1e-16.
 * (D-01: P01 dagi Abramowitz–Stegun 7.1.26 erf o'rniga.)
 */
export function normalQuantile(p) {
  if (!(p > 0 && p < 1)) {
    if (p === 0) return -Infinity;
    if (p === 1) return Infinity;
    return NaN;
  }
  const q = p - 0.5;
  if (Math.abs(q) <= 0.425) {
    const r = 0.180625 - q * q;
    return q * (((((((2509.0809287301226727 * r + 33430.575583588128105) * r + 67265.770927008700853) * r +
      45921.953931549871457) * r + 13731.693765509461125) * r + 1971.5909503065514427) * r +
      133.14166789178437745) * r + 3.387132872796366608) /
      (((((((5226.495278852545925 * r + 28729.085735721942674) * r + 39307.89580009271061) * r +
      21213.794301586595867) * r + 5394.1960214247511077) * r + 687.1870074920579083) * r +
      42.313330701600911252) * r + 1);
  }
  let r = q < 0 ? p : 1 - p;
  r = Math.sqrt(-Math.log(r));
  let val;
  if (r <= 5) {
    r -= 1.6;
    val = (((((((7.7454501427834140764e-4 * r + 0.0227238449892691845833) * r + 0.24178072517745061177) * r +
      1.27045825245236838258) * r + 3.64784832476320460504) * r + 5.7694972214606914055) * r +
      4.6303378461565452959) * r + 1.42343711074968357734) /
      (((((((1.05075007164441684324e-9 * r + 5.475938084995344946e-4) * r + 0.0151986665636164571966) * r +
      0.14810397642748007459) * r + 0.68976733498510000455) * r + 1.6763848301838038494) * r +
      2.05319162663775882187) * r + 1);
  } else {
    r -= 5;
    val = (((((((2.01033439929228813265e-7 * r + 2.71155556874348757815e-5) * r + 0.0012426609473880784386) * r +
      0.026532189526576123093) * r + 0.29656057182850489123) * r + 1.7848265399172913358) * r +
      5.4637849111641143699) * r + 6.6579046435011037772) /
      (((((((2.04426310338993978564e-15 * r + 1.4215117583164458887e-7) * r + 1.8463183175100546818e-5) * r +
      7.868691311456132591e-4) * r + 0.0148753612908506148525) * r + 0.13692988092273580531) * r +
      0.59983220655588793769) * r + 1);
  }
  return q < 0 ? -val : val;
}

/* ─── Styudent t-taqsimoti ──────────────────────────── */

/**
 * Ikki tomonlama dum ehtimoli Q(t; ν) = P(|T| ≥ t) = I_{ν/(ν+t²)}(ν/2, ½), t ≥ 0, ν > 0 (haqiqiy son).
 * Ref: Abramowitz & Stegun (1964) 26.7.1, 26.5.27.
 */
export function tTail2(t, nu) {
  t = Math.abs(t);
  if (!isFinite(nu)) return 2 * normalCdf(-t);
  if (t === 0) return 1;
  const t2 = t * t;
  const x = nu / (nu + t2), y = t2 / (nu + t2);
  return ibetaParts(nu / 2, 0.5, x, y, -Math.log1p(t2 / nu), Math.log(y));
}

/** Ikki tomonlama qamrov ehtimoli P(|T| < t; ν). ν = ∞ — normal. */
export function tCoverage(t, nu) {
  return 1 - tTail2(t, nu);
}

/* Katta ν uchun Kornish–Fisher yoyilmasi (ν ≥ T_ASYMPTOTIC_NU = 2000): t = z + g1/ν + … + g4/ν⁴.
   Ref: Abramowitz & Stegun (1964) 26.7.5. ν ≥ 2000 da qoldiq < 3e-15 — bu "normalga o'tish" chegarasi
   EMAS (Q-1(a)): t(ν) o'zi hisoblanadi, faqat boshqa sonli usul bilan (beta usuli katta ν da aniqlik yo'qotadi); ν = 2000 da ikkala usul
   1e-12 ichida mos keladi (test). */
export const T_ASYMPTOTIC_NU = 2000;
function tQuantileAsymptotic(z, nu) {
  const z2 = z * z, z3 = z2 * z, z5 = z3 * z2, z7 = z5 * z2, z9 = z7 * z2;
  const g1 = (z3 + z) / 4;
  const g2 = (5 * z5 + 16 * z3 + 3 * z) / 96;
  const g3 = (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / 384;
  const g4 = (79 * z9 + 776 * z7 + 1482 * z5 - 1920 * z3 - 945 * z) / 92160;
  return z + g1 / nu + g2 / (nu * nu) + g3 / (nu * nu * nu) + g4 / (nu * nu * nu * nu);
}

/**
 * Ikki tomonlama Styudent kvantili t_P(ν): P(|T| < t) = P. ν — musbat haqiqiy son yoki ∞.
 * Ref: JCGM 100:2008 G.3.2, Table G.2 (t_p(ν)).
 */
export function tQuantile(P, nu) {
  if (!(P > 0 && P < 1)) return NaN;
  const z = normalQuantile((1 + P) / 2);
  if (!isFinite(nu)) return z;
  if (!(nu > 0)) return NaN;
  if (nu >= T_ASYMPTOTIC_NU) return tQuantileAsymptotic(z, nu);
  return tQuantileBeta(P, nu);
}

/** t_P(ν) to'liqmas beta funksiyasini teskari yechish orqali (bisektsiya, dum ehtimoli bo'yicha). */
export function tQuantileBeta(P, nu) {
  const alpha = 1 - P;
  let lo = 0, hi = Math.max(1, normalQuantile((1 + P) / 2));
  while (tTail2(hi, nu) > alpha) { lo = hi; hi *= 2; if (hi > 1e300) return Infinity; }
  for (let i = 0; i < 2000; i++) {
    const mid = 0.5 * (lo + hi);
    if (mid === lo || mid === hi) break;
    if (tTail2(mid, nu) > alpha) lo = mid; else hi = mid;
  }
  return 0.5 * (lo + hi);
}
