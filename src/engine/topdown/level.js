/* ═══════════════════════════════════════════════════════════════
   TOPDOWN/LEVEL.JS — konsentratsiyaga (darajaga) bog'liq noaniqlik (P09).
   Ref: EURACHEM/CITAC QUAM:2012 Appendix E.5 (pp. 117–119):
     u(x) = √(s₀² + (x·s₁)²)                          E.5.2.1, Eq. [1] (p. 117)
     s₀, s₁ ni aniqlash: u(x_i)² ni x_i² bo'yicha chiziqli regressiya, s₀ = √c, s₁ = √m   E.5.5.2 (p. 119)
   s₀ — mutlaq (natija birligida), s₁ — nisbiy (o'lchamsiz ulush). Bu — mutlaq va nisbiy hissalar
   x orqali ANIQ birlashtiriladigan yagona joy; natija har doim mutlaq (x birligida).
═══════════════════════════════════════════════════════════════ */

/**
 * u(x) = √(s₀² + (x·s₁)²).
 * @param {number} x   natija (daraja)
 * @param {number} s0  doimiy hissa (x birligida)
 * @param {number} s1  proporsionallik koeffitsiyenti (ulush, o'lchamsiz)
 */
export function levelUncertainty(x, s0, s1) {
  // Ref: QUAM:2012 E.5.2.1 Eq. [1] (p. 117)
  return Math.sqrt(s0 * s0 + (x * s1) * (x * s1));
}

/**
 * s₀ va s₁ ni (x_i, u_i) juftliklaridan aniqlash.
 * Ref: QUAM:2012 E.5.5.2 (p. 119), 2–4-qadamlar: u² = m·x² + c; s₀ = √c, s₁ = √m.
 * (1-qadam kamida 10 ta darajani tavsiya qiladi — kam bo'lsa `fewLevels`.)
 * @param {{x:number, u:number}[]} points
 * @returns {{s0:number, s1:number, m:number, c:number, n:number, fewLevels:boolean} | {error:string, detail?:string}}
 */
export function fitLevelModel(points) {
  const p = (points || []).filter(q => q && Number.isFinite(q.x) && Number.isFinite(q.u));
  if (p.length < 2) return { error: 'topdown_too_few', detail: 'levelModel.points' };
  if (p.some(q => !(q.u >= 0))) return { error: 'topdown_bad_data', detail: 'levelModel.points' };
  const X = p.map(q => q.x * q.x), Y = p.map(q => q.u * q.u);
  const n = p.length, mx = X.reduce((a, b) => a + b, 0) / n, my = Y.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sxx += (X[i] - mx) * (X[i] - mx); sxy += (X[i] - mx) * (Y[i] - my); }
  if (!(sxx > 0)) return { error: 'topdown_bad_data', detail: 'levelModel.points: x' };
  const m = sxy / sxx, c = my - m * mx;
  // Manfiy m yoki c — model ma'lumotga mos emas (√ aniqlanmagan): jimgina 0 ga kesilmaydi
  if (m < 0 || c < 0) return { error: 'topdown_level_fit_negative', detail: `m = ${m.toPrecision(4)}, c = ${c.toPrecision(4)}` };
  return { s0: Math.sqrt(c), s1: Math.sqrt(m), m, c, n, fewLevels: n < 10 };
}
