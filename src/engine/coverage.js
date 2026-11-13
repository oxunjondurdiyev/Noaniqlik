/* ═══════════════════════════════════════════════════════════════
   COVERAGE.JS — qamrov koeffitsiyenti k = t_P(ν_eff).
   Egasi qarori Q-1(a) (2026-11-13): har doim t(⌊ν_eff⌋); normal kvantilga o'tish
   chegarasi YO'Q (P01 dagi ν > 5000 → z sakrashi olib tashlandi, R-03);
   ν_eff = ∞ bo'lsa — aniq normal kvantil (AS241).
═══════════════════════════════════════════════════════════════ */
import { tQuantile } from './special.js';

/** ν_eff kasr bo'lganda qo'llaniladigan qoidalar.
    Ref: JCGM 100:2008 G.4.1 Note 1 — "by interpolation or by truncating ν_eff to the next lower integer";
    G.6.4 3) — "either interpolate or truncate". 'exact' — kasr ν bilan to'g'ridan-to'g'ri (docs/prompts P01). */
export const NU_RULES = ['floor', 'interpolate', 'exact'];
export const DEFAULT_NU_RULE = 'floor'; // egasi qarori (CLAUDE.md): Excel bilan mos

/**
 * k = t_P(ν) ikki tomonlama Styudent kvantili.
 * @param {number} P   qamrov ehtimoli (0,5 … 0,99999)
 * @param {number} nu  ν_eff (musbat yoki ∞)
 * @param {'floor'|'interpolate'|'exact'} [rule='floor']
 * @returns {{k:number, nuUsed:number, rule:string, distribution:'t'|'normal'}}
 */
export function coverage(P, nu, rule = DEFAULT_NU_RULE) {
  // Ref: JCGM 100:2008 G.3.2, G.4.1 Eq. (G.1e) — k_p = t_p(ν_eff)
  const p = Math.min(Math.max(Number(P) || 0.9545, 0.5), 0.99999);
  const r = NU_RULES.includes(rule) ? rule : DEFAULT_NU_RULE;
  if (!isFinite(nu)) return { k: tQuantile(p, Infinity), nuUsed: Infinity, rule: r, distribution: 'normal' };
  if (r === 'exact') {
    const v = Math.max(nu, 1e-9);
    return { k: tQuantile(p, v), nuUsed: v, rule: r, distribution: 't' };
  }
  const lo = Math.max(1, Math.floor(nu));
  if (r === 'interpolate' && nu > lo) {
    // Ref: JCGM 100:2008 G.4.1 Note 1 — Table G.2 bo'yicha chiziqli interpolyatsiya (qo'shni butun ν lar orasida)
    const kLo = tQuantile(p, lo), kHi = tQuantile(p, lo + 1);
    return { k: kLo + (nu - lo) * (kHi - kLo), nuUsed: nu, rule: r, distribution: 't' };
  }
  return { k: tQuantile(p, lo), nuUsed: lo, rule: r, distribution: 't' };
}

/** P00 bilan mos API: k = t_P(⌊ν⌋) */
export function coverageFactor(P, nu, rule) {
  return coverage(P, nu, rule).k;
}
