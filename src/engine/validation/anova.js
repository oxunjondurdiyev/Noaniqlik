/* ═══════════════════════════════════════════════════════════════
   VALIDATION/ANOVA.JS — bir omilli dispersiya tahlili (P12). Sof modul.
   Ref: NIST/SEMATECH e-Handbook §7.4.3.1–7.4.3.4 (docs/references/nist-ehandbook-p12/prc/section4/prc431…434.htm):
     SS(Total) = SST + SSE;  SST = Σ n_i·(ȳ_i − ȳ)²;  SSE = ΣΣ (y_ij − ȳ_i)²        (§7.4.3.1)
     DFT = k − 1;  DFE = N − k;  MST = SST/DFT;  MSE = SSE/DFE;  F = MST/MSE          (§7.4.3.3)
   Tasodifiy effektlar modeli (§7.4.3.2 "Random effects model") — takrorlanuvchanlik va guruhlararo komponent:
     s_r = √MSE;  s_b² = (MST − MSE)/n₀;  s_I = √(s_r² + s_b²)
   Ref: NIST/SEMATECH e-Handbook §2.4.4 (mpc44.htm), §2.4.4.2 (mpc442.htm): s_days = √(s₂² − s₁²/J), bu yerda
        s₂² — kunlik o'rtachalar dispersiyasi (= MST/J), s₁² = MSE; manfiy baho — "interpreted as meaning that the variance
        component … is zero" → s_b = 0 va topilma `anova_negative_component`.
   Teng bo'lmagan guruhlar: n₀ = (N − Σn_i²/N)/(k − 1) — manba repoda yo'q (Searle, Casella & McCulloch 1992;
   ISO 5725-3) → (unverified), topilma `anova_unbalanced_n0`. Teng guruhlarda n₀ = n (NIST §2.4.4.2 bilan aynan).
   s_I ning erkinlik darajasi — Welch–Satterthwaite (JCGM 100:2008 G.4.1, Eq. (G.2b)); LOYIHA QARORI (egasi, 2026-11-19, R-26 #7):
     s_I² = MS_b/n₀ + (1 − 1/n₀)·MS_w;  ν(s_I) = s_I⁴ / [ (MS_b/n₀)²/(k − 1) + ((1 − 1/n₀)·MS_w)²/(N − k) ]
     s_b² < 0 bo'lsa: s_I = s_r, ν(s_I) = N − k.  NIST §7.4.3 misolida ν(s_I) = 3,90.
═══════════════════════════════════════════════════════════════ */
import { sampleOf, alphaOf, has, fail } from './util.js';
import { fUpperTail, fCritical } from '../stats/fdist.js';
import { varianceComponent, nonNegative } from '../stats/anova.js';

export const ANOVA_REF = 'NIST/SEMATECH e-Handbook §7.4.3; §2.4.4';

/**
 * @param {Array<number[]|{mean:number,sd:number,n:number}>} groups  guruhlar (daraja / kun / operator …)
 * @param {{alpha?:number}} [opts]
 * @returns {{k, N, sizes, means, grandMean, ss:{between,within,total}, df:{between,within,total}, ms:{between,within},
 *            F, p, critical, alpha, significant, balanced, n0, n0Unverified, sr, sb2, sb, sI, negative, nu:{sr}, ref}}
 */
export function oneWayAnova(groups, opts = {}) {
  const alpha = alphaOf(opts.alpha);
  if (!Array.isArray(groups) || groups.length < 2) fail('validation_too_few', 'groups');
  const g = groups.map((x, i) => {
    const s = sampleOf(x, `groups[${i}]`, 1);
    if (!Number.isFinite(s.mean)) fail('validation_bad_data', `groups[${i}].mean`);
    return s;
  });
  const k = g.length, sizes = g.map(x => x.n);
  const N = sizes.reduce((a, b) => a + b, 0);
  if (N - k < 1) fail('validation_too_few', 'N − k < 1');
  const grandMean = g.reduce((a, x) => a + x.n * x.mean, 0) / N;
  // Ref: NIST §7.4.3.1 — SST = Σ n_i(ȳ_i − ȳ)², SSE = ΣΣ(y_ij − ȳ_i)² (= Σ(n_i − 1)·s_i²)
  const ssB = g.reduce((a, x) => a + x.n * (x.mean - grandMean) ** 2, 0);
  const ssW = g.reduce((a, x) => a + (x.values ? x.values.reduce((s, v) => s + (v - x.mean) ** 2, 0) : (x.n - 1) * x.variance), 0);
  const dfB = k - 1, dfW = N - k;
  // Ref: NIST §7.4.3.3 — MST = SST/DFT, MSE = SSE/DFE, F = MST/MSE
  const msB = ssB / dfB, msW = ssW / dfW;
  const F = msW > 0 ? msB / msW : (msB > 0 ? Infinity : NaN);
  const p = Number.isNaN(F) ? NaN : fUpperTail(F, dfB, dfW);
  const critical = fCritical(alpha, dfB, dfW);
  const balanced = sizes.every(n => n === sizes[0]);
  // n₀: teng guruhlarda n (NIST §2.4.4.2: J); teng bo'lmaganda — (unverified) formula
  const n0 = balanced ? sizes[0] : (N - sizes.reduce((a, n) => a + n * n, 0) / N) / (k - 1);
  const sb2 = varianceComponent(msB, msW, n0);
  const sbClamped = nonNegative(sb2);
  // Ref: JCGM 100:2008 G.4.1 Eq. (G.2b) — Welch–Satterthwaite; loyiha qarori R-26 #7 (egasi, 2026-11-19)
  let nuSI = dfW, nuSIRule = 'negative_component';
  if (!(sb2 < 0)) {
    const a = msB / n0, b = (1 - 1 / n0) * msW;
    const den = (a * a) / dfB + (b * b) / dfW;
    if (den > 0) { nuSI = (a + b) ** 2 / den; nuSIRule = 'welch_satterthwaite'; }
  }
  return {
    k, N, sizes, means: g.map(x => x.mean), grandMean,
    ss: { between: ssB, within: ssW, total: ssB + ssW }, df: { between: dfB, within: dfW, total: N - 1 }, ms: { between: msB, within: msW },
    F, p, critical, alpha, significant: F > critical,
    balanced, n0, n0Unverified: !balanced,
    sr: Math.sqrt(msW), sb2, sb: Math.sqrt(sbClamped), sI: Math.sqrt(msW + sbClamped), negative: sb2 < 0,
    nu: { sr: dfW, between: dfB, sI: nuSI }, nuSIRule, nuSIProjectDecision: true,
    ref: ANOVA_REF,
  };
}

/** Kirishni tekshirish uchun: guruh yorliqlari (ixtiyoriy). */
export function groupLabels(groups) {
  return (groups || []).map((x, i) => (x && !Array.isArray(x) && has(x.label) ? String(x.label) : String(i + 1)));
}
