/* ═══════════════════════════════════════════════════════════════
   MULTIVARIATE/REGION.JS — vektor chiqish uchun qamrov sohasi (P07). Sof modul.
   Manba: JCGM 102:2011 §6.5 (GUM yondashuvi, ko'p o'lchovli Gauss), §7.7 (Monte-Karlo nuqtalaridan).
═══════════════════════════════════════════════════════════════ */
import { chi2Quantile } from '../regression/chi2.js';
import { normalQuantile } from '../special.js';
import { symEigen, correlationMatrix } from './linalg.js';

/** Sonli jihatdan singular deb hisoblash chegarasi: λ_min / λ_max (korrelyatsiya matritsasi). Texnik chegara. */
export const SINGULAR_RATIO = 1e-9;

/**
 * Gipper-ellipsoid uchun qamrov koeffitsiyenti: p = Pr(χ²_m ≤ k_p²).
 * Ref: JCGM 102:2011 §6.5.2.3 a), §6.5.3 a); Table 1 (23-bet): p = 0,95 — m = 1: 1,96; 2: 2,45; 3: 2,80 …
 */
export const ellipsoidFactor = (P, m) => Math.sqrt(chi2Quantile(P, m));

/**
 * Gipper-to'rtburchak uchun: q = 1 − (1 − p)/m, q = Pr(|Z| ≤ k_q) → k_q = Φ⁻¹((1 + q)/2).
 * Ref: JCGM 102:2011 §6.5.2.3 b) Eq. (19), §6.5.3 b); Table 2 (23-bet): p = 0,95 — m = 1: 1,96; 2: 2,24; 3: 2,39 …
 * Bu soha kamida p ehtimolni qamraydi (chiqishlar orasidagi bog'liqlik hisobga olinmaydi).
 */
export function rectangleFactor(P, m) {
  const q = 1 - (1 - P) / m;
  return { q, kq: normalQuantile((1 + q) / 2) };
}

/**
 * GUM yondashuvidagi qamrov sohasi: Y ~ N(y, U_y) (§6.5.1.3).
 * @returns {{P, m, distribution:'gaussian', ellipsoid:{kp, kp2}, rectangle:{q, kq, intervals:number[][]},
 *            lambdaMax:number, lambdaMin:number, singular:boolean, ellipse?:{semiAxes:number[], angle:number}}}
 */
export function gaussianRegion(y, Uy, P) {
  const m = y.length;
  const kp = ellipsoidFactor(P, m);
  const { q, kq } = rectangleFactor(P, m);
  const eig = symEigen(correlationMatrix(Uy));
  const lambdaMax = eig.values[0], lambdaMin = eig.values[m - 1];
  const out = {
    P, m, distribution: 'gaussian',
    ellipsoid: { kp, kp2: kp * kp },
    // Ref: JCGM 102:2011 Eq. (23) — y_j ± k_q·u(y_j)
    rectangle: { q, kq, intervals: y.map((v, j) => { const u = Math.sqrt(Math.max(Uy[j][j], 0)); return [v - kq * u, v + kq * u]; }) },
    lambdaMax, lambdaMin,
    // Chiqishlar orasida (chiziqlashtirilgan) funksional bog'liqlik: U_y singular — ellipsoid buzilgan (§9.4.2.3 Note 2)
    singular: !(lambdaMin > SINGULAR_RATIO * lambdaMax),
  };
  if (m === 2) out.ellipse = ellipseOf(Uy, kp);
  return out;
}

/**
 * Ikki o'lchovli ellips (η − y)ᵀ U_y⁻¹ (η − y) = k_p² ning yarim o'qlari va burchagi (chizish uchun).
 * Ref: JCGM 102:2011 §6.5.2.3 a), Eq. (16). Yarim o'qlar: k_p·√λ_i (λ_i — U_y ning xos qiymatlari); yuzasi π·k_p²·√det U_y.
 */
export function ellipseOf(Uy, kp) {
  const e = symEigen(Uy);
  const a = kp * Math.sqrt(Math.max(e.values[0], 0)), b = kp * Math.sqrt(Math.max(e.values[1], 0));
  return { semiAxes: [a, b], angle: Math.atan2(e.vectors[0][1], e.vectors[0][0]), area: Math.PI * a * b };
}
