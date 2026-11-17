/* ═══════════════════════════════════════════════════════════════
   REGRESSION/WTLS.JS — to'g'ri chiziq y = a + b·θ, x va y ikkalasida ham noaniqlik
   (weighted total least squares / errors-in-variables), iterativ.

   ISO/TS 28037:2010 §7 pullik va repoda yo'q. Algoritm ochiq adabiyotdan:
     D. York, N. M. Evensen, M. López Martínez, J. De Basabe Delgado,
     "Unified equations for the slope, intercept, and standard errors of the best straight line",
     Am. J. Phys. 72 (2004) 367–375, Eq. (13) — qiyalik iteratsiyasi va standart xatolar
     (eng kichik kvadratlar bo'yicha TUZATILGAN nuqtalarda baholanadi — maksimal haqiqatnamolik bilan mos).
   Xuddi shu masala: M. Krystek, M. Anton, Meas. Sci. Technol. 18 (2007) 3438–3442.
   Bu maqolalar docs/references/ da yo'q → usul "unverified"; tekshiruv — tests/engine/regression-wtls.test.js
   (u(x) = 0 → WLS; noaniqlikning tarqalish qonuni bilan sonli taqqoslash; Pearson–York ma'lumotlari).
═══════════════════════════════════════════════════════════════ */

const MAX_ITER = 500;

/**
 * @param {number[]} theta  x_i − x_ref
 * @param {number[]} y
 * @param {number[]} ux     u(x_i) ≥ 0
 * @param {number[]} uy     u(y_i) ≥ 0 (har bir nuqtada u(x_i), u(y_i) dan kamida biri > 0)
 * @param {number[]} [cxy]  cov(x_i, y_i) (ixtiyoriy)
 * @returns {{p, cov0, fitted, residuals, weighted, chi2, iterations, adjusted}|{error}}
 */
export function fitWtls(theta, y, ux, uy, cxy) {
  const m = theta.length;
  const vx = ux.map(v => v * v), vy = uy.map(v => v * v);
  const c = cxy || new Array(m).fill(0);

  // Boshlang'ich qiyalik: oddiy (vaznsiz) eng kichik kvadratlar
  let mx = 0, my = 0;
  for (let i = 0; i < m; i++) { mx += theta[i]; my += y[i]; }
  mx /= m; my /= m;
  let sxx = 0, sxy = 0;
  for (let i = 0; i < m; i++) { sxx += (theta[i] - mx) ** 2; sxy += (theta[i] - mx) * (y[i] - my); }
  if (!(sxx > 0)) return { error: 'regression_x_degenerate' };
  let b = sxy / sxx;

  let W = new Array(m), beta = new Array(m), Xbar = 0, Ybar = 0, iterations = 0, converged = false;
  for (let it = 0; it < MAX_ITER; it++) {
    iterations = it + 1;
    // Ref: York et al. (2004) Eq. (13a): W_i = ω(x_i)ω(y_i)/[ω(x_i) + b²ω(y_i) − 2b·r_i·α_i]
    //      dispersiyalar orqali: W_i = 1/[u²(y_i) + b²u²(x_i) − 2b·cov(x_i, y_i)] (u(x_i) = 0 da ham aniqlangan)
    let sw = 0, swx = 0, swy = 0;
    for (let i = 0; i < m; i++) {
      const d = vy[i] + b * b * vx[i] - 2 * b * c[i];
      if (!(d > 0) || !isFinite(d)) return { error: 'regression_zero_u', detail: String(i + 1) };
      W[i] = 1 / d;
      sw += W[i]; swx += W[i] * theta[i]; swy += W[i] * y[i];
    }
    Xbar = swx / sw; Ybar = swy / sw;
    // Ref: York et al. (2004) Eq. (13b): β_i = W_i[U_i/ω(y_i) + b·V_i/ω(x_i) − (b·U_i + V_i)·r_i/α_i];
    //      Eq. (13c): b = ΣW_iβ_iV_i / ΣW_iβ_iU_i
    let num = 0, den = 0;
    for (let i = 0; i < m; i++) {
      const U = theta[i] - Xbar, V = y[i] - Ybar;
      beta[i] = W[i] * (U * vy[i] + b * V * vx[i] - (b * U + V) * c[i]);
      num += W[i] * beta[i] * V;
      den += W[i] * beta[i] * U;
    }
    if (!(Math.abs(den) > 0) || !isFinite(num / den)) return { error: 'regression_x_degenerate' };
    const bNew = num / den;
    const done = Math.abs(bNew - b) <= 1e-15 * Math.max(Math.abs(bNew), 1e-300);
    b = bNew;
    if (done) { converged = true; break; }
  }
  if (!converged) return { error: 'regression_no_convergence', detail: String(MAX_ITER) };

  // Yakuniy b bilan vaznlar va tuzatilgan nuqtalar
  let sw = 0, swx = 0, swy = 0;
  for (let i = 0; i < m; i++) {
    W[i] = 1 / (vy[i] + b * b * vx[i] - 2 * b * c[i]);
    sw += W[i]; swx += W[i] * theta[i]; swy += W[i] * y[i];
  }
  Xbar = swx / sw; Ybar = swy / sw;
  const a = Ybar - b * Xbar; // Ref: York et al. (2004) Eq. (13): a = Ȳ − b·X̄
  const adjusted = new Array(m);
  let swa = 0;
  for (let i = 0; i < m; i++) {
    const U = theta[i] - Xbar, V = y[i] - Ybar;
    beta[i] = W[i] * (U * vy[i] + b * V * vx[i] - (b * U + V) * c[i]);
    adjusted[i] = Xbar + beta[i]; // tuzatilgan x_i (eng kichik kvadratlar bo'yicha)
    swa += W[i] * adjusted[i];
  }
  const xb = swa / sw;
  let swuu = 0;
  for (let i = 0; i < m; i++) swuu += W[i] * (adjusted[i] - xb) ** 2;
  if (!(swuu > 0)) return { error: 'regression_x_degenerate' };
  // Ref: York et al. (2004) Eq. (13): σ_b² = 1/ΣW_i·u_i², σ_a² = 1/ΣW_i + x̄²·σ_b² (u_i = x_i,adj − x̄);
  //      cov(a, b) = −x̄·σ_b² (xuddi shu normal matritsaning teskarisi: [ΣW, ΣWx; ΣWx, ΣWx²]⁻¹)
  const vb = 1 / swuu;
  const va = 1 / sw + xb * xb * vb;
  const cab = -xb * vb;

  const fitted = theta.map(t => a + b * t);
  const residuals = y.map((v, i) => v - fitted[i]);
  const weighted = residuals.map((r, i) => r * Math.sqrt(W[i]));
  // Ref: York et al. (2004): S = ΣW_i(y_i − b·x_i − a)², erkinlik darajasi m − 2
  const chi2 = weighted.reduce((s, v) => s + v * v, 0);
  return { p: [a, b], cov0: [[va, cab], [cab, vb]], fitted, residuals, weighted, chi2, iterations, adjusted, m };
}
