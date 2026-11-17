/* ═══════════════════════════════════════════════════════════════
   REGRESSION/PREDICT.JS — kalibrlash egri chizig'idan bashorat:
     • to'g'ri bashorat  Y(x) va u(Y(x));
     • teskari bashorat  y₀ → x̂₀ va u(x̂₀).
   Natija YAXLITLANMAYDI.
═══════════════════════════════════════════════════════════════ */
import { basis } from './fit.js';
import { coverage } from '../coverage.js';

/** gᵀ·V·g */
function quad(g, V) {
  let s = 0;
  for (let i = 0; i < g.length; i++) for (let j = 0; j < g.length; j++) s += g[i] * V[i][j] * g[j];
  return s;
}
function polyval(p, t) {
  let s = 0;
  for (let j = p.length - 1; j >= 0; j--) s = s * t + p[j];
  return s;
}
function polyder(p, t) {
  let s = 0;
  for (let j = p.length - 1; j >= 1; j--) s = s * t + j * p[j];
  return s;
}

/** Welch–Satterthwaite. Ref: JCGM 100:2008 G.4.1 Eq. (G.2b) */
function welch(parts) {
  const total = parts.reduce((s, c) => s + c.u2, 0);
  let den = 0;
  for (const c of parts) if (c.u2 > 0 && isFinite(c.nu)) den += c.u2 * c.u2 / c.nu;
  return den > 0 ? total * total / den : Infinity;
}

/**
 * To'g'ri bashorat: Y(x) = Σ p_j·θʲ, θ = x − x_ref.
 * Ref: JCGM 100:2008 §5.2.2 Eq. (13)/(16) va H.3.4 Eq. (H.15):
 *      u_c²[b(t)] = u²(y1) + (t − t0)²·u²(y2) + 2(t − t0)·u(y1)·u(y2)·r(y1, y2)
 *      (umumiy holda gᵀ·V·g, g = (1, θ, θ², …)). ν = n − 2 (H.3.4) — aposterior asosda.
 * @param {object} fit  { p, cov, degree, xRef, nu, xRange }
 * @param {number} x
 * @param {{P?:number, nuRule?:string}} [opt]
 */
export function predict(fit, x, opt = {}) {
  const theta = x - fit.xRef;
  if (!isFinite(theta)) return { x, error: 'regression_bad_data' };
  const g = basis(theta, fit.degree);
  const y = polyval(fit.p, theta);
  const u2 = quad(g, fit.cov);
  const u = Math.sqrt(Math.max(u2, 0));
  const cov = coverage(opt.P, fit.nu, opt.nuRule);
  return {
    x, y, u, nu: fit.nu, k: cov.k, U: cov.k * u,
    extrapolated: x < fit.xRange[0] || x > fit.xRange[1],
  };
}

/** f(θ) = y₀ ning [lo, hi] dagi ildizlari (ishora almashishi bo'yicha, ikkiga bo'lish) */
function rootsIn(p, y0, lo, hi) {
  const N = 2000, roots = [];
  let tPrev = lo, fPrev = polyval(p, lo) - y0;
  if (fPrev === 0) roots.push(lo);
  for (let i = 1; i <= N; i++) {
    const t = lo + (hi - lo) * i / N;
    const f = polyval(p, t) - y0;
    if (f === 0) roots.push(t);
    else if (fPrev !== 0 && (f > 0) !== (fPrev > 0)) {
      let a = tPrev, b = t, fa = fPrev;
      for (let k = 0; k < 200; k++) {
        const mid = (a + b) / 2, fm = polyval(p, mid) - y0;
        if (fm === 0) { a = b = mid; break; }
        if ((fm > 0) === (fa > 0)) { a = mid; fa = fm; } else b = mid;
        if (b - a <= 1e-15 * Math.max(Math.abs(a), Math.abs(b), 1e-300)) break;
      }
      roots.push((a + b) / 2);
    }
    tPrev = t; fPrev = f;
  }
  return roots;
}

/**
 * Teskari bashorat: y₀ (p marta o'lchangan) → x̂₀ va u(x̂₀).
 * To'g'ri chiziq: x̂₀ = x_ref + (y₀ − a)/b.
 * Ref: EURACHEM/CITAC QUAM:2012 E.4.1 Eq. (E3.2) — x_pred = (y_obs − b0)/b1;
 *      E.4.3 Eq. (E3.3) — var(x_pred) = [var(y_obs) + x_pred²·var(b1) + 2·x_pred·covar(b0, b1) + var(b0)]/b1²;
 *      Eq. (E3.5) (vaznsiz, y₀ — p o'lchash o'rtachasi): var(x_pred) = S²/b1²·[1/p + 1/n + (x_pred − x̄)²/Sxx]
 *      (Example A5 dagi c₀ formulasi) — Eq. (E3.3) ga u²(y₀) = S²/p qo'yilganda aynan shu chiqadi.
 *      Noaniqlikning tarqalish qonuni: JCGM 100:2008 §5.2.2 Eq. (13); regressiya parametrlari
 *      kovariatsiyasidan foydalanish — H.3.4.
 * Polinom: f(θ₀) = y₀ sonli yechiladi (kalibrlash diapazonida yagona ildiz), u²(x̂₀) = [u²(y₀) + gᵀVg]/f′(θ₀)².
 * @param {object} fit  { p, cov, degree, xRef, nu, s2, basis, commonUy, xRange }
 * @param {{y0:number|number[], p?:number, uy0?:number, nuY0?:number}} q
 * @param {{P?:number, nuRule?:string}} [opt]
 */
export function inversePredict(fit, q, opt = {}) {
  const obs = (Array.isArray(q.y0) ? q.y0 : [q.y0]).map(Number);
  if (!obs.length || obs.some(v => !isFinite(v))) return { error: 'regression_bad_data' };
  const y0 = obs.reduce((s, v) => s + v, 0) / obs.length;
  const p = Array.isArray(q.y0) && obs.length > 1 ? obs.length : Math.max(1, Math.floor(Number(q.p) || 1));
  const out = { y0, p };

  // u(y₀): aniq berilgan; yoki regressiya qoldiq dispersiyasidan s²/p (QUAM Eq. E3.5);
  // yoki OLS da umumiy u(y) ma'lum bo'lsa u²(y)/p. Aks holda — xato (jimgina 0 olinmaydi).
  let uy0sq, uy0Source, nuY0;
  if (q.uy0 !== undefined && q.uy0 !== null && q.uy0 !== '') {
    const v = Number(q.uy0);
    if (!(v >= 0) || !isFinite(v)) return { ...out, error: 'regression_bad_data', detail: 'uy0' };
    uy0sq = v * v; uy0Source = 'given';
    nuY0 = q.nuY0 !== undefined && q.nuY0 !== null && q.nuY0 !== '' ? Number(q.nuY0) : Infinity;
  } else if (fit.basis === 'posterior' && fit.unweighted) {
    uy0sq = fit.s2 / p; uy0Source = 'residual'; nuY0 = fit.nu;
  } else if (fit.commonUy) {
    uy0sq = fit.commonUy * fit.commonUy / p; uy0Source = 'common'; nuY0 = Infinity;
  } else {
    return { ...out, error: 'regression_need_uy0' };
  }

  const b = fit.p[1];
  let theta0, slope;
  if (fit.degree === 1) {
    // b ≈ 0: x̂₀ aniqlanmagan. |b| ≤ u(b) — qiyalik noldan farqlanmaydi → xato.
    const ub = Math.sqrt(fit.cov[1][1]);
    if (!(Math.abs(b) > 0) || !isFinite(b) || Math.abs(b) <= ub) return { ...out, error: 'regression_slope_zero' };
    theta0 = (y0 - fit.p[0]) / b;
    slope = b;
  } else {
    const lo = fit.xRange[0] - fit.xRef, hi = fit.xRange[1] - fit.xRef;
    const roots = rootsIn(fit.p, y0, lo, hi);
    if (!roots.length) return { ...out, error: 'regression_inverse_no_root' };
    if (roots.length > 1) return { ...out, error: 'regression_inverse_ambiguous', detail: String(roots.length) };
    theta0 = roots[0];
    slope = polyder(fit.p, theta0);
    const us = Math.sqrt(Math.max(quad(basis(theta0, fit.degree).map((_, j, g) => j === 0 ? 0 : j * g[j - 1]), fit.cov), 0));
    if (!(Math.abs(slope) > 0) || Math.abs(slope) <= us) return { ...out, error: 'regression_slope_zero' };
  }
  const g = basis(theta0, fit.degree);
  const calSq = quad(g, fit.cov) / (slope * slope);   // kalibrlash chizig'i hissasi
  const obsSq = uy0sq / (slope * slope);              // y₀ hissasi
  const u2 = calSq + obsSq;
  const u = Math.sqrt(Math.max(u2, 0));
  // ν: u(y₀) qoldiq dispersiyasidan olingan bo'lsa ikkala had bir xil s ga proporsional → ν = m − n (JCGM 100 H.3.4);
  // aks holda Welch–Satterthwaite (G.4.1).
  const nu = uy0Source === 'residual' ? fit.nu
    : welch([{ u2: calSq, nu: fit.nu }, { u2: obsSq, nu: nuY0 }]);
  const cov = coverage(opt.P, nu, opt.nuRule);
  const x0 = fit.xRef + theta0;
  return {
    ...out, uy0: Math.sqrt(uy0sq), uy0Source, x0, u, nu, k: cov.k, U: cov.k * u,
    components: { y0: Math.sqrt(obsSq), calibration: Math.sqrt(Math.max(calSq, 0)) },
    extrapolated: x0 < fit.xRange[0] || x0 > fit.xRange[1],
  };
}
