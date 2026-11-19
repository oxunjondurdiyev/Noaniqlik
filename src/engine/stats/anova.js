/* ═══════════════════════════════════════════════════════════════
   STATS/ANOVA.JS — dispersiya tahlilining umumiy yordamchilari (P12). Sof modul.
   src/engine/sampling/ (P10 — ichma-ich ANOVA, UfS:2019) va src/engine/validation/anova.js (P12 — bir omilli ANOVA)
   shu funksiyalardan foydalanadi. P10 natijalari bit darajasida o'zgarmasligi uchun arifmetik amallar tartibi
   aynan avvalgidek: (yuqori − quyi) / n va max(v, 0).
═══════════════════════════════════════════════════════════════ */

/**
 * Dispersiya komponenti: yuqori daraja o'rtacha kvadratidan quyi darajani ayirib, takrorlar soniga bo'lish.
 * E[MS_yuqori] = σ_quyi² + n·σ_yuqori²  →  σ̂_yuqori² = (MS_yuqori − MS_quyi) / n.
 * Ref: EURACHEM/CITAC UfS:2019 Appendix C3; NIST/SEMATECH e-Handbook §2.4.4.2 (s_days² = s₂² − s₁²/J, bu yerda s₂² = MS_kunlar/J).
 * Natija manfiy bo'lishi mumkin — kesish (0 ga tenglash) chaqiruvchida, ogohlantirish bilan.
 */
export function varianceComponent(msUpper, msLower, n) { return (msUpper - msLower) / n; }

/** Manfiy dispersiya bahosi 0 deb olinadi. Ref: NIST/SEMATECH e-Handbook §2.4.4.2 ("interpreted as … zero"); UfS:2019 §9.5.2. */
export function nonNegative(v) { return Math.max(v, 0); }

/**
 * Birlashtirilgan (pooled) standart og'ish: s = √(Σ ν_i·s_i² / Σ ν_i).
 * Ref: NIST/SEMATECH e-Handbook §2.4.4.1 ("Basic pooling rules": SS_i = ν_i·s_i², s₁ = √(SS/ν)).
 * @param {{s:number, nu:number}[]} items
 * @returns {{s:number, nu:number, ss:number}|null}
 */
export function pooledSd(items) {
  let ss = 0, nu = 0;
  for (const it of items || []) {
    if (!it || !(it.nu > 0) || !(it.s >= 0)) return null;
    ss += it.nu * it.s * it.s; nu += it.nu;
  }
  return nu > 0 ? { s: Math.sqrt(ss / nu), nu, ss } : null;
}
