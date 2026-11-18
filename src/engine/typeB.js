/* ═══════════════════════════════════════════════════════════════
   TYPEB.JS — B tur baholash: taqsimot bo'luvchilari, yarim kenglik (son yoki ifoda).
═══════════════════════════════════════════════════════════════ */
import { isBlank, toNum } from './util.js';
import { compile } from './parser.js';

// Ref: JCGM 100:2008 §4.3.7 (to'g'ri burchakli, a/√3), §4.3.9 (uchburchak, a/√6),
//      F.2.2.1 (rezolyutsiya δx/2 → δx/(2√3)), §4.3.3 (normal, U/k); arksinus a/√2 — JCGM 101:2008 §6.4.6
// P06 (JCGM 101:2008 §6.4): trapetsiya, egri trapetsiya, eksponensial, log-normal — bo'luvchisi parametrga bog'liq
// (divisor: null), standart noaniqlik typeB() da hisoblanadi.
export const DIVISORS = {
  rect:   { divisor: Math.sqrt(3),     label: '√3' },
  normal: { divisor: 2,                label: 'k' },
  triang: { divisor: Math.sqrt(6),     label: '√6' },
  ushape: { divisor: Math.sqrt(2),     label: '√2' },
  resol:  { divisor: 2 * Math.sqrt(3), label: '2√3' },
  trap:    { divisor: null, label: '√(6/(1+β²))' },
  ctrap:   { divisor: null, label: '√(a²/3+d²/9)' },
  exp:     { divisor: 1,    label: '1' },
  lognorm: { divisor: 2,    label: 'k' },
};

/** Parametrli taqsimotlar: qo'shimcha maydon nomi (state.typeB[] da). */
export const DIST_PARAMS = Object.freeze({ trap: 'beta', ctrap: 'd' });

export function getDivisor(dist, k) {
  if (dist === 'normal' || dist === 'lognorm') {
    const kk = Number(k);
    return kk > 0 ? kk : 2;
  }
  const d = (DIVISORS[dist] || DIVISORS.rect).divisor;
  return d === null ? NaN : d;
}

export function getDivisorLabel(dist, k) {
  if (dist === 'normal' || dist === 'lognorm') return String(getDivisor(dist, k));
  return (DIVISORS[dist] || DIVISORS.rect).label;
}

/**
 * Parametrli taqsimot parametrini tekshirish.
 * Ref: JCGM 101:2008 §6.4.4.1 (0 ≤ λ1 ≤ λ2, ya'ni 0 ≤ β ≤ 1); §6.4.3.1 (d > 0 va a + d < b − d, ya'ni 0 < d < yarim kenglik)
 * @returns {string|null} xato kodi yoki null
 */
export function distParamError(halfWidth, dist, extra) {
  const a = Math.abs(Number(halfWidth) || 0), e = extra || {};
  if (dist === 'trap') { const b = Number(e.beta); return isFinite(b) && b >= 0 && b <= 1 ? null : 'bad_dist_param'; }
  if (dist === 'ctrap') { const d = Number(e.d); return isFinite(d) && d > 0 && d < a ? null : 'bad_dist_param'; }
  return null;
}

/**
 * Bitta B tur komponentining standart noaniqligi. Ref: JCGM 100:2008 §4.3
 * @param {number} halfWidth  yarim kenglik a (normal / log-normal: U; rezolyutsiya: diskretlik; eksponensial: baho x)
 * @param {object} [extra]    parametrli taqsimotlar uchun: { beta } (trapetsiya), { d } (egri trapetsiya)
 */
export function typeB(halfWidth, dist, k, extra) {
  const a = Math.abs(Number(halfWidth) || 0);
  // Ref: JCGM 101:2008 §6.4.4.3 — V = (b − a)²/24·(1 + β²) = a²(1 + β²)/6
  if (dist === 'trap') { const b = Number((extra || {}).beta); return a * Math.sqrt((1 + b * b) / 6); }
  // Ref: JCGM 101:2008 §6.4.3.3, Eq. (4) — V = (b − a)²/12 + d²/9 = a²/3 + d²/9
  if (dist === 'ctrap') { const d = Number((extra || {}).d); return Math.sqrt(a * a / 3 + d * d / 9); }
  // Ref: JCGM 101:2008 §6.4.10.3 — V = x² (eksponensial: u = x); log-normal: u = a/k (normal kabi beriladi)
  return a / getDivisor(dist, k);
}

/** Son yoki kirish o'rtachalaridan ifoda (masalan "0.0002*I + 0.002"). */
export function valueOrExpr(v, params, means) {
  if (typeof v === 'number') return v;
  const n = toNum(v);
  if (isFinite(n)) return n;
  if (isBlank(v)) return 0;
  const f = compile(String(v), params);
  const r = f(means);
  if (!isFinite(r)) throw new Error('eval');
  return r;
}
