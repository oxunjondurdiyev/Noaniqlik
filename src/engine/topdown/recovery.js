/* ═══════════════════════════════════════════════════════════════
   TOPDOWN/RECOVERY.JS — EURACHEM/CITAC QUAM:2012 tiklanish (recovery) (P09).
   Ref: QUAM:2012 Example A4, "2. Bias study" (p. 66); §7.7.4, §7.7.8, §7.7.9 (pp. 19–20); §7.16 (p. 25).
     R_m = o'rtacha tiklanish; u(R_m) = s/√n                       (A4, p. 66: 0,28/√42 = 0,0432)
     t = |1 − R_m| / u(R_m); t ≥ t_crit(n − 1; 95 %, ikki tomonlama) → R_m 1 dan ahamiyatli farq qiladi
     tuzatish qo'llansa (1/R_m): nisbiy hissa u(R_m)/R_m           (Table A4.4, p. 68: 0,043/0,9 = 0,048)
═══════════════════════════════════════════════════════════════ */
import { fail, num, has, mean, stdev } from './scale.js';
import { tQuantile } from '../special.js';

export const RECOVERY_CORRECTIONS = ['applied', 'not_applied'];

/**
 * @param {{mean?:number, s?:number, n?:number, values?:number[], correction?:'applied'|'not_applied', P?:number}} rec
 *        qiymatlar ctx.F birligida (foiz: 90, 28; ulush: 0,90, 0,28)
 * @returns {{Rm, s, n, nu, uRm, t, tCrit, P, significant, correction, u, biasFraction}}  u — nisbiy hissa (ctx.F birligida)
 */
export function evaluateRecovery(rec, ctx) {
  if (!rec) fail('topdown_need_recovery');
  if (!ctx.relative) fail('topdown_mixed_scale', `recovery: relative → ${ctx.unit}`);
  const correction = rec.correction === undefined ? 'not_applied' : rec.correction;
  if (!RECOVERY_CORRECTIONS.includes(correction)) fail('topdown_bad_spec', 'recovery.correction');
  let Rm, s, n;
  if (Array.isArray(rec.values) && rec.values.filter(has).length) {
    const v = rec.values.filter(has).map((x, i) => num(x, `recovery.values[${i}]`));
    if (v.length < 2) fail('topdown_too_few', 'recovery.values');
    Rm = mean(v); s = stdev(v); n = v.length;
  } else {
    if (!has(rec.mean) || !has(rec.s) || !has(rec.n)) fail('topdown_need_recovery');
    Rm = num(rec.mean, 'recovery.mean'); s = num(rec.s, 'recovery.s'); n = num(rec.n, 'recovery.n');
    if (!(n >= 2) || !Number.isInteger(n)) fail('topdown_too_few', 'recovery.n');
  }
  if (!(Rm > 0) || !(s >= 0)) fail('topdown_bad_data', 'recovery');
  const P = has(rec.P) ? num(rec.P, 'recovery.P') : 0.95;
  if (!(P > 0 && P < 1)) fail('topdown_bad_data', 'recovery.P');
  // Ref: QUAM:2012 A4 (p. 66): u(Rec) = s/√n — o'rtachaning standart og'ishi
  const uRm = s / Math.sqrt(n);
  const nu = n - 1;
  // Ref: QUAM:2012 A4 (p. 66): t = |1 − Rec|/u(Rec); "2-tailed critical value t_crit, for n–1 degrees of freedom at 95 % confidence"
  const t = uRm > 0 ? Math.abs(ctx.F - Rm) / uRm : (Rm === ctx.F ? 0 : Infinity);
  const tCrit = tQuantile(P, nu);
  const significant = t >= tCrit;      // "If t is greater or equal than the critical value … significantly different from 1"
  // Nisbiy hissa: tuzatish qo'llansa — u(R_m)/R_m (Table A4.4); qo'llanmasa — u(R_m)/1 (R = 1 deb olinadi; §7.7.4)
  const u = correction === 'applied' ? ctx.F * uRm / Rm : uRm;
  return { Rm, s, n, nu, uRm, t, tCrit, P, significant, correction, u, biasFraction: (Rm - ctx.F) / ctx.F };
}
