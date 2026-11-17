/* ═══════════════════════════════════════════════════════════════
   TOPDOWN/REPRODUCIBILITY.JS — s_R asosidagi yondashuv (P09).
   TEKSHIRILGAN qism (manba repoda):
     u_c = s_R (+ qamralmagan omillar)        — QUAM:2012 §7.6.1–7.6.3 (p. 18), Example A6 (pp. 84–86);
                                                 Nordtest TR 537 ed. 4 §7 (pp. 24–25)
     s_R = R / 2,8;  s_r = r / 2,8            — Nordtest TR 537 ed. 4 §7.1 (p. 24), Appendix 3 (p. 39)
   TEKSHIRILMAGAN qism (ISO 21748 pullik, repoda yo'q — natijada `unverified` belgisi):
     laboratoriya s_r ni χ² testi bilan tekshirish; s_R ni laboratoriya s_r bilan moslash
     (s_R'² = s_R² − s_r² + s_lab²); u(δ̂) = √((s_R² − (1 − 1/n)·s_r²)/p).
═══════════════════════════════════════════════════════════════ */
import { fail, num, has, declaredScale, stated, toContextUnit, mean, stdev } from './scale.js';
import { chi2Quantile } from '../regression/chi2.js';

/** Ref: Nordtest TR 537 ed. 4 §7.1 (p. 24): "sR = R/2.8"; Appendix 3 (p. 39): r = 2,8·s_r. */
export const LIMIT_FACTOR = 2.8;

function sdOrLimit(o, sKey, limKey, ctx, where) {
  if (has(o[sKey])) return stated(o, o[sKey], ctx, `${where}.${sKey}`);
  if (has(o[limKey])) return stated(o, o[limKey], ctx, `${where}.${limKey}`) / LIMIT_FACTOR;
  return null;
}

/**
 * @param {{sR?:number, R?:number, sr?:number, r?:number, relative?:true, unit?:string, pLabs?:number, nRep?:number}} rep
 * @param {{s?:number, n?:number, values?:number[], relative?:true, unit?:string, P?:number, adjust?:boolean}} [lab]
 * @param {{include?:boolean, uDelta?:number, relative?:true, unit?:string}} [methodBias]
 * @returns {{sR, sr, sRUsed, lab, uDelta, unverified:string[]}}
 */
export function evaluateReproducibility(rep, lab, methodBias, ctx) {
  if (!rep) fail('topdown_need_reproducibility');
  const sR = sdOrLimit(rep, 'sR', 'R', ctx, 'reproducibility');
  if (sR === null) fail('topdown_need_reproducibility');
  const sr = sdOrLimit(rep, 'sr', 'r', ctx, 'reproducibility');
  if (!(sR >= 0) || (sr !== null && !(sr >= 0))) fail('topdown_bad_data', 'reproducibility');
  if (sr !== null && sr > sR) fail('topdown_bad_data', 'reproducibility: sr > sR');
  const unverified = [];
  let sRUsed = sR, labOut = null;

  if (lab) {
    let s, n, m = null;
    if (Array.isArray(lab.values) && lab.values.filter(has).length) {
      const v = lab.values.filter(has).map((x, i) => num(x, `labRepeatability.values[${i}]`));
      if (v.length < 2) fail('topdown_too_few', 'labRepeatability.values');
      const kind = declaredScale(lab, 'labRepeatability');
      m = mean(v); n = v.length;
      const sd = stdev(v);
      if (kind === 'relative') { if (!ctx.relative) fail('topdown_mixed_scale', 'labRepeatability'); s = sd; }
      else if (ctx.relative) { if (!(m !== 0)) fail('topdown_zero_mean', 'labRepeatability'); s = ctx.F * sd / Math.abs(m); }
      else s = toContextUnit(sd, lab.unit, ctx, 'labRepeatability');
    } else {
      s = stated(lab, lab.s, ctx, 'labRepeatability.s');
      n = num(lab.n, 'labRepeatability.n');
      if (!(n >= 2)) fail('topdown_too_few', 'labRepeatability.n');
    }
    if (sr === null) fail('topdown_bad_data', 'reproducibility.sr');
    const P = has(lab.P) ? num(lab.P, 'labRepeatability.P') : 0.95;
    const nu = n - 1;
    // χ² testi (s_r ma'lum deb): (n − 1)·s_lab²/s_r² ≤ χ²_P(n − 1). TEKSHIRILMAGAN (ISO 21748 / ISO 5725-6 repoda yo'q).
    const stat = sr > 0 ? nu * s * s / (sr * sr) : Infinity;
    const crit = chi2Quantile(P, nu);
    labOut = { s, n, nu, mean: m, ratio: sr > 0 ? s / sr : Infinity, chi2: stat, chi2Crit: crit, P, pass: stat <= crit, adjusted: false };
    unverified.push('lab_sr_check');
    if (lab.adjust === true) {
      // s_R'² = s_L² + s_lab², s_L² = s_R² − s_r². TEKSHIRILMAGAN (ISO 21748).
      sRUsed = Math.sqrt(Math.max(sR * sR - sr * sr, 0) + s * s);
      labOut.adjusted = true;
      unverified.push('sR_adjusted');
    }
  }

  let uDelta = null;
  if (methodBias && methodBias.include !== false) {
    if (has(methodBias.uDelta)) uDelta = stated(methodBias, methodBias.uDelta, ctx, 'methodBias.uDelta');
    else if (has(rep.pLabs) && has(rep.nRep) && sr !== null) {
      const p = num(rep.pLabs, 'reproducibility.pLabs'), n = num(rep.nRep, 'reproducibility.nRep');
      if (!(p >= 1) || !(n >= 1)) fail('topdown_bad_data', 'reproducibility.pLabs/nRep');
      // u(δ̂) = √((s_R² − (1 − 1/n)·s_r²)/p). TEKSHIRILMAGAN (ISO 21748).
      uDelta = Math.sqrt(Math.max(sR * sR - (1 - 1 / n) * sr * sr, 0) / p);
    } else fail('topdown_bad_data', 'methodBias');
    if (!(uDelta >= 0)) fail('topdown_bad_data', 'methodBias.uDelta');
    unverified.push('u_delta');
  }
  return { sR, sr, sRUsed, lab: labOut, uDelta, unverified };
}
