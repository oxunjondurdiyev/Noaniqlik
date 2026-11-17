/* ═══════════════════════════════════════════════════════════════
   REGRESSION/FIT.JS — polinom y = a + b·θ + c·θ² + d·θ³ (θ = x − x_ref) ni
   eng kichik kvadratlar bilan moslash: OLS, WLS, GLS.
   Natija YAXLITLANMAYDI.
═══════════════════════════════════════════════════════════════ */
import { cholesky, forwardSolve, leastSquares } from './linalg.js';

/** Dizayn matritsasi satri g(θ) = (1, θ, θ², …, θⁿ) */
export function basis(theta, degree) {
  const g = new Array(degree + 1);
  g[0] = 1;
  for (let j = 1; j <= degree; j++) g[j] = g[j - 1] * theta;
  return g;
}

/**
 * Umumlashgan eng kichik kvadratlar: min (y − A·p)ᵀ·V⁻¹·(y − A·p).
 *   OLS: V = I;  WLS: V = diag(u²(y_i));  GLS: V — to'liq kovariatsiya matritsasi.
 * Oqartirish (whitening): V = L·Lᵀ, Ã = L⁻¹A, ỹ = L⁻¹y → oddiy LS (QR).
 * Ref: JCGM 100:2008 H.3.2 Eq. (H.13a)–(H.13g) (OLS, to'g'ri chiziq);
 *      EURACHEM/CITAC QUAM:2012 E.4.3 Eq. (E3.4) (vaznli holat);
 *      Aitken (1935) Proc. R. Soc. Edinburgh 55, 42–48 (GLS: p = (AᵀV⁻¹A)⁻¹AᵀV⁻¹y,
 *      cov(p) = (AᵀV⁻¹A)⁻¹). ISO/TS 28037:2010 §6, §10 — pullik, repoda yo'q (tekshirilmagan).
 * @param {number[]} theta  x_i − x_ref
 * @param {number[]} y
 * @param {number}   degree 1..3
 * @param {{uy?:number[], covY?:number[][]}} w
 * @returns {{p, cov0, residuals, weighted, chi2}|{error, detail?}}
 *   cov0 = (AᵀV⁻¹A)⁻¹ (aprior asos); chi2 = Σ (oqartirilgan qoldiq)²
 */
export function fitPolynomial(theta, y, degree, w = {}) {
  const m = theta.length;
  const A = theta.map(t => basis(t, degree));
  let At, yt, whiten;
  if (w.covY) {
    const L = cholesky(w.covY);
    if (!L) return { error: 'regression_bad_covariance' };
    // Ã ustunlari va ỹ: L·z = (ustun)
    const cols = [];
    for (let j = 0; j <= degree; j++) cols.push(forwardSolve(L, A.map(r => r[j])));
    At = A.map((_, i) => cols.map(c => c[i]));
    yt = forwardSolve(L, y);
    whiten = r => forwardSolve(L, r);
  } else if (w.uy) {
    At = A.map((r, i) => r.map(v => v / w.uy[i]));
    yt = y.map((v, i) => v / w.uy[i]);
    whiten = r => r.map((v, i) => v / w.uy[i]);
  } else {
    At = A; yt = y; whiten = r => r.slice();
  }
  const ls = leastSquares(At, yt);
  if (ls.singular) return { error: 'regression_x_degenerate' };
  const fitted = A.map(r => r.reduce((s, v, j) => s + v * ls.p[j], 0));
  const residuals = y.map((v, i) => v - fitted[i]);
  const weighted = whiten(residuals);
  // Ref: JCGM 100:2008 H.3.2 Eq. (H.13f) — s² = Σ[b_k − b(t_k)]²/(n − 2) (OLS da chi2 = Σ qoldiq²)
  const chi2 = weighted.reduce((s, v) => s + v * v, 0);
  return { p: ls.p, cov0: ls.cov, fitted, residuals, weighted, chi2, m };
}
