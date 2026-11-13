/* ═══════════════════════════════════════════════════════════════
   TYPEB.JS — B tur baholash: taqsimot bo'luvchilari, yarim kenglik (son yoki ifoda).
═══════════════════════════════════════════════════════════════ */
import { isBlank, toNum } from './util.js';
import { compile } from './parser.js';

// Ref: JCGM 100:2008 §4.3.7 (to'g'ri burchakli, a/√3), §4.3.9 (uchburchak, a/√6),
//      F.2.2.1 (rezolyutsiya δx/2 → δx/(2√3)), §4.3.3 (normal, U/k); arksinus a/√2 — JCGM 101:2008 §6.4.6
export const DIVISORS = {
  rect:   { divisor: Math.sqrt(3),     label: '√3' },
  normal: { divisor: 2,                label: 'k' },
  triang: { divisor: Math.sqrt(6),     label: '√6' },
  ushape: { divisor: Math.sqrt(2),     label: '√2' },
  resol:  { divisor: 2 * Math.sqrt(3), label: '2√3' },
};

export function getDivisor(dist, k) {
  if (dist === 'normal') {
    const kk = Number(k);
    return kk > 0 ? kk : 2;
  }
  return (DIVISORS[dist] || DIVISORS.rect).divisor;
}

export function getDivisorLabel(dist, k) {
  if (dist === 'normal') return String(getDivisor(dist, k));
  return (DIVISORS[dist] || DIVISORS.rect).label;
}

/** Bitta B tur komponentining standart noaniqligi u = a / bo'luvchi. Ref: JCGM 100:2008 §4.3 */
export function typeB(halfWidth, dist, k) {
  return Math.abs(Number(halfWidth) || 0) / getDivisor(dist, k);
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
