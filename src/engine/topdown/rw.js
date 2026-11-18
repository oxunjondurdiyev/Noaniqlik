/* ═══════════════════════════════════════════════════════════════
   TOPDOWN/RW.JS — laboratoriya ichidagi takrorlanuvchanlik u(R_w) (P09).
   Ref: Nordtest TR 537 ed. 4 §5 (pp. 15–18).
   Manbalar (components[].type):
     control_series — nazorat namunasi qatori: u(R_w) = s_Rw (§5.2);
     control_limits — nazorat kartasi chegaralari: u(R_w) = chegara / 2 (§3.2 2–4-qadam, §5.1 izoh 3);
     duplicates     — dublikatlar farqi: s = √(Σd²/(2n)) (§5.3; Appendix 5, 6 — "pooled s");
     stated         — tayyor s yoki CV % (validatsiya hisobotidan).
   Bir nechta manba kvadratlar yig'indisi bilan birlashtiriladi: u(R_w) = √(s_Rw² + s_r²) (§5, p. 15; §5.3, p. 17).
═══════════════════════════════════════════════════════════════ */
import { fail, num, has, declaredScale, stated, toContextUnit, mean, stdev, rss } from './scale.js';

export const RW_TYPES = ['control_series', 'control_limits', 'duplicates', 'stated'];
export const DUPLICATE_RELATIVE_METHODS = ['per_pair', 'pooled_over_mean'];

/**
 * Dublikatlardan standart og'ish.
 * Mutlaq: s = √(Σd_i²/(2n)), d_i = x_i1 − x_i2.
 * Nisbiy: d_i = (x_i1 − x_i2)/x̄_i — har bir juftlikning o'z o'rtachasiga nisbatan (Appendix 5: "Relative s", "Pooled s %").
 * Ref: Nordtest TR 537 ed. 4 Appendix 5 (p. 41), Appendix 6 (p. 42): juftlik uchun s_i = |d_i|/√2, pooled s = √(Σs_i²/n).
 * @returns {{s:number, n:number, mean:number}}  s — mutlaq (ma'lumot birligida) yoki nisbiy (ulush, ×1)
 */
export function duplicateSd(pairs, relative) {
  let sum = 0, tot = 0;
  pairs.forEach(([a, b]) => {
    const m = (a + b) / 2;
    if (relative && !(m !== 0)) fail('topdown_zero_mean', 'duplicates');
    const d = relative ? (a - b) / m : a - b;
    sum += d * d; tot += m;
  });
  return { s: Math.sqrt(sum / (2 * pairs.length)), n: pairs.length, mean: tot / pairs.length };
}

function component(c, i, ctx) {
  const where = `rw.components[${i}]`;
  if (!c || !RW_TYPES.includes(c.type)) fail('topdown_bad_spec', `${where}.type`);
  const base = { type: c.type, id: c.id || `${c.type}_${i + 1}`, name: c.name || '' };

  if (c.type === 'control_series') {
    const v = (c.values || []).filter(has).map((x, j) => num(x, `${where}.values[${j}]`));
    if (v.length < 2) fail('topdown_too_few', where);
    const kind = declaredScale(c, where);
    const m = mean(v), s = stdev(v);
    let u;
    if (kind === 'relative') {
      // qiymatlar allaqachon nisbiy (masalan, nominalga nisbatan %) — faqat nisbiy baholashda
      if (!ctx.relative) fail('topdown_mixed_scale', `${where}: relative → ${ctx.unit}`);
      u = s;
    } else if (ctx.relative) {
      if (!(m !== 0)) fail('topdown_zero_mean', where);
      u = ctx.F * s / Math.abs(m);        // CV: s / x̄ (Nordtest §5.2 jadvali: 0,5 / 20,01 → 2,5 %)
    } else u = toContextUnit(s, c.unit, ctx, where);
    return { ...base, u, n: v.length, nu: v.length - 1, mean: m, s, ref: 'Nordtest TR 537 ed. 4 §5.2 (p. 16)' };
  }

  if (c.type === 'control_limits') {
    // Ref: Nordtest TR 537 §3.2 (p. 10): "Control limits (2s) are set to ± 3.34 % … u(Rw) = 3.34/2 = 1.67 %"
    const sig = has(c.sigmas) ? num(c.sigmas, `${where}.sigmas`) : 2;
    if (!(sig > 0)) fail('topdown_bad_data', `${where}.sigmas`);
    const lim = stated(c, c.limit, ctx, `${where}.limit`);
    if (!(lim >= 0)) fail('topdown_bad_data', `${where}.limit`);
    return { ...base, u: lim / sig, n: null, nu: Infinity, limit: lim, sigmas: sig, ref: 'Nordtest TR 537 ed. 4 §3.2 (p. 10), §5.1 (p. 15)' };
  }

  if (c.type === 'duplicates') {
    const pairs = (c.pairs || []).filter(p => Array.isArray(p) && (has(p[0]) || has(p[1])))
      .map((p, j) => [num(p[0], `${where}.pairs[${j}]`), num(p[1], `${where}.pairs[${j}]`)]);
    if (pairs.length < 2) fail('topdown_too_few', where);
    if (declaredScale(c, where) === 'relative') fail('topdown_mixed_scale', `${where}: pairs need unit`);
    // Nisbiy shkalada ikki yo'l (ikkalasi ham manbada):
    //   per_pair         — har bir juftlik o'z o'rtachasiga nisbatan (keng diapazon; Appendix 5, p. 41: "Pooled s %");
    //   pooled_over_mean — mutlaq pooled s / umumiy o'rtacha (tor diapazon; §5.3, pp. 17–18: 0,0252 / 7,50 → 0,34 %).
    const method = c.relativeMethod === undefined ? 'per_pair' : c.relativeMethod;
    if (!DUPLICATE_RELATIVE_METHODS.includes(method)) fail('topdown_bad_spec', `${where}.relativeMethod`);
    const perPair = ctx.relative && method === 'per_pair';
    const d = duplicateSd(pairs, perPair);
    let u;
    if (!ctx.relative) u = toContextUnit(d.s, c.unit, ctx, where);
    else if (perPair) u = ctx.F * d.s;
    else { if (!(d.mean !== 0)) fail('topdown_zero_mean', where); u = ctx.F * d.s / Math.abs(d.mean); }
    return { ...base, u, n: d.n, nu: d.n, mean: d.mean, s: d.s, ...(ctx.relative ? { relativeMethod: method } : {}), ref: 'Nordtest TR 537 ed. 4 §5.3 (pp. 16–18), Appendix 5–6 (pp. 41–42)' };
  }

  // stated: tayyor s yoki CV
  const s = stated(c, c.s, ctx, `${where}.s`);
  if (!(s >= 0)) fail('topdown_bad_data', `${where}.s`);
  const n = has(c.n) ? num(c.n, `${where}.n`) : null;
  return { ...base, u: s, n, nu: n ? n - 1 : Infinity, ref: 'Nordtest TR 537 ed. 4 §5 (p. 15)' };
}

/**
 * u(R_w) ni hisoblash.
 * @param {{components:object[], covers?:string[]}} rw
 * @returns {{u:number, components:object[], covers:string[]}}
 */
export function evaluateRw(rw, ctx) {
  const list = rw && Array.isArray(rw.components) ? rw.components : [];
  if (!list.length) fail('topdown_need_rw');
  const components = list.map((c, i) => component(c, i, ctx));
  // Ref: Nordtest TR 537 §5 (p. 15): u(Rw) = √(s_Rw² + s_r²); §5.3 (p. 17): √(0,5² + 0,44²), √(1,5² + 3,8²)
  const u = rss(components.map(c => c.u));
  // Ref: JCGM 100:2008 G.4.1 Eq. (G.2b) — u(R_w) ning samarali erkinlik darajasi (ν berilmagan manba — ∞)
  const d = components.filter(c => isFinite(c.nu) && c.nu > 0).reduce((a, c) => a + (c.u ** 4) / c.nu, 0);
  return { u, nu: d > 0 ? (u ** 4) / d : Infinity, components };
}
