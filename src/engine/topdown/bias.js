/* ═══════════════════════════════════════════════════════════════
   TOPDOWN/BIAS.JS — usul va laboratoriya siljishi noaniqligi u(bias) (P09).
   Ref: Nordtest TR 537 ed. 4 §6 (pp. 19–23), Appendix 4 (p. 40).
     u(bias) = √(RMS_bias² + u(C_ref)²),  RMS_bias = √(Σ bias_i² / N)            (§6, p. 19)
     bitta CRM: u(bias) = √(bias² + (s_bias/√n)² + u(C_ref)²)                    (§6, p. 19; §6.1, p. 20)
     PT: u(C_ref,i) = s_R,i / √n_Lab,i; u(C_ref) — o'rtacha                      (§6.2, p. 21)
     recovery: u(bias) = √(RMS_bias² + u(C_recovery)²)                           (§6.3, p. 23)
   Xom qiymatlar (certified, mean, assigned, result) — ma'lumot birligida; hosila qiymatlar
   (bias, sBias, uRef, sR) — bias blokining e'lon qilingan shkalasida (relative: true yoki unit).
═══════════════════════════════════════════════════════════════ */
import { fail, num, has, declaredScale, toContextUnit, mean, rss } from './scale.js';

export const BIAS_TYPES = ['crm', 'pt', 'recovery'];
/** Ref: Nordtest TR 537 §6.2 (p. 21) NOTE; Appendix 4 (p. 40): robust standart og'ish × 1,25. */
export const ROBUST_SD_FACTOR = 1.25;
/** Ref: Nordtest TR 537 §6.2 (p. 21): "a laboratory should participate at least 6 times"; QUAM:2012 §7.8.2. */
export const MIN_PT_ROUNDS = 6;

function blockScale(b, ctx) {
  const kind = declaredScale(b, 'bias');
  if ((kind === 'relative') !== ctx.relative) fail('topdown_mixed_scale', `bias: ${kind === 'relative' ? 'relative' : b.unit} → ${ctx.relative ? 'relative' : ctx.unit}`);
  // hosila qiymatni kontekst birligiga keltirish
  return (v, where) => (ctx.relative ? num(v, where) : toContextUnit(num(v, where), b.unit, ctx, where));
}

/** Xom juftlikdan siljish: nisbiy — F·(x − ref)/ref; mutlaq — x − ref (ma'lumot birligi = blok birligi). */
function rawBias(x, ref, ctx, conv, where) {
  if (ctx.relative) {
    if (!(ref !== 0)) fail('topdown_zero_mean', where);
    return ctx.F * (x - ref) / ref;
  }
  return conv(x - ref, where);
}
function rawU(u, ref, ctx, conv, where) {
  if (ctx.relative) {
    if (!(ref !== 0)) fail('topdown_zero_mean', where);
    return ctx.F * u / Math.abs(ref);
  }
  return conv(u, where);
}

function crm(b, ctx, conv) {
  const items = (b.items || []).map((it, i) => {
    const w = `bias.items[${i}]`;
    const cert = has(it.certified) ? num(it.certified, `${w}.certified`) : null;
    let bias, uRef;
    if (has(it.bias)) bias = conv(it.bias, `${w}.bias`);
    else if (cert !== null && has(it.mean)) bias = rawBias(num(it.mean, `${w}.mean`), cert, ctx, conv, w);
    else fail('topdown_bad_data', `${w}.bias`);
    if (has(it.uRef)) uRef = conv(it.uRef, `${w}.uRef`);
    else if (cert !== null && has(it.U)) {
      // Ref: Nordtest TR 537 §6.1 (p. 20): "The confidence interval is ± 0.5. Divide this by 2"
      const k = has(it.k) ? num(it.k, `${w}.k`) : 2;
      if (!(k > 0)) fail('topdown_bad_data', `${w}.k`);
      uRef = rawU(num(it.U, `${w}.U`) / k, cert, ctx, conv, w);
    } else fail('topdown_need_uref', w);
    const sBias = has(it.sBias) ? conv(it.sBias, `${w}.sBias`) : null;
    const n = has(it.n) ? num(it.n, `${w}.n`) : null;
    if (!(uRef >= 0) || (sBias !== null && !(sBias >= 0)) || (n !== null && !(n >= 1))) fail('topdown_bad_data', w);
    return { id: it.id || `CRM${i + 1}`, bias, uRef, sBias, n };
  });
  if (!items.length) fail('topdown_need_bias');
  if (items.length === 1) {
    const it = items[0];
    if (it.sBias === null || it.n === null) fail('topdown_bad_data', 'bias.items[0].sBias/n');
    // Ref: Nordtest TR 537 §6 (p. 19), §6.1 (p. 20): √(bias² + (s_bias/√n)² + u(C_ref)²)
    const sMean = it.sBias / Math.sqrt(it.n);
    return { items, n: 1, rms: Math.abs(it.bias), sMean, uRef: it.uRef, u: rss([it.bias, sMean, it.uRef]), formula: 'single_crm' };
  }
  // Ref: Nordtest TR 537 §6.1 (p. 20) "Several CRM": RMS_bias va o'rtacha u(C_ref)
  const rms = Math.sqrt(mean(items.map(it => it.bias * it.bias)));
  const uRef = mean(items.map(it => it.uRef));
  return { items, n: items.length, rms, sMean: null, uRef, u: rss([rms, uRef]), formula: 'rms' };
}

function pt(b, ctx, conv) {
  const robust = b.robust === true ? ROBUST_SD_FACTOR : 1;
  const items = (b.rounds || []).map((r, i) => {
    const w = `bias.rounds[${i}]`;
    const ref = has(r.assigned) ? num(r.assigned, `${w}.assigned`) : null;
    let bias, uRef = null;
    if (has(r.bias)) bias = conv(r.bias, `${w}.bias`);
    else if (ref !== null && has(r.result)) bias = rawBias(num(r.result, `${w}.result`), ref, ctx, conv, w);
    else fail('topdown_bad_data', `${w}.bias`);
    if (has(r.uRef)) uRef = conv(r.uRef, `${w}.uRef`);
    else if (has(r.U)) {
      // Ref: Nordtest TR 537 §6.2 (p. 22): PT provayderi U bergan bo'lsa — u(C_ref,i) = U/2
      const k = has(r.k) ? num(r.k, `${w}.k`) : 2;
      uRef = conv(r.U, `${w}.U`) / k;
    } else if (has(r.sR) && has(r.nLab)) {
      // Ref: Nordtest TR 537 §6.2 (p. 21): u(C_ref,i) = s_R,i / √n_Lab,i (robust s — × 1,25)
      const n = num(r.nLab, `${w}.nLab`);
      if (!(n >= 1)) fail('topdown_bad_data', `${w}.nLab`);
      uRef = robust * conv(r.sR, `${w}.sR`) / Math.sqrt(n);
    }
    if (uRef !== null && !(uRef >= 0)) fail('topdown_bad_data', w);
    return { id: r.id || `PT${i + 1}`, bias, uRef };
  });
  if (!items.length) fail('topdown_need_bias');
  const rms = Math.sqrt(mean(items.map(it => it.bias * it.bias)));
  let uRef;
  if (items.every(it => it.uRef !== null)) uRef = mean(items.map(it => it.uRef));   // izoh 5 (p. 19): o'rtacha qiymat
  else if (has(b.uRef) && items.every(it => it.uRef === null)) uRef = conv(b.uRef, 'bias.uRef');
  else fail('topdown_need_uref', 'bias.rounds');
  return { items, n: items.length, rms, sMean: null, uRef, u: rss([rms, uRef]), formula: 'rms', meanBias: mean(items.map(it => it.bias)) };
}

function recovery(b, ctx, conv) {
  // Recovery qiymatlari har doim nisbiy (R %, yoki ulush): faqat nisbiy baholashda
  if (!ctx.relative) fail('topdown_mixed_scale', `bias (recovery): relative → ${ctx.unit}`);
  const R = (b.recoveries || []).filter(has).map((v, i) => num(v, `bias.recoveries[${i}]`));
  if (!R.length) fail('topdown_need_bias');
  // Ref: Nordtest TR 537 §6.3 (p. 23): 95, 98, 97, 96, 99, 96 % → RMS_bias = 3,44 %
  const items = R.map((r, i) => ({ id: `R${i + 1}`, bias: r - ctx.F, uRef: null }));
  const rms = Math.sqrt(mean(items.map(it => it.bias * it.bias)));
  let uRef;
  if (has(b.uRef)) uRef = conv(b.uRef, 'bias.uRef');
  else if (Array.isArray(b.uRefComponents) && b.uRefComponents.length) {
    // u(C_recovery) = √(u(conc)² + u(vol)²) (p. 23)
    uRef = rss(b.uRefComponents.map((c, i) => conv(c && typeof c === 'object' ? c.u : c, `bias.uRefComponents[${i}]`)));
  } else fail('topdown_need_uref', 'bias.uRef');
  if (!(uRef >= 0)) fail('topdown_bad_data', 'bias.uRef');
  return { items, n: items.length, rms, sMean: null, uRef, u: rss([rms, uRef]), formula: 'rms', meanBias: mean(items.map(it => it.bias)) };
}

/**
 * u(bias) ni hisoblash.
 * @param {{type:'crm'|'pt'|'recovery', relative?:true, unit?:string, …}} bias
 * @returns {{type, u, rms, uRef, sMean, n, items, formula, meanBias?}}
 */
export function evaluateBias(bias, ctx) {
  if (!bias || !BIAS_TYPES.includes(bias.type)) fail('topdown_bad_spec', 'bias.type');
  const conv = blockScale(bias, ctx);
  const r = bias.type === 'crm' ? crm(bias, ctx, conv) : bias.type === 'pt' ? pt(bias, ctx, conv) : recovery(bias, ctx, conv);
  // ν(bias): CRM / PT / recovery soni bo'yicha N − 1; bitta CRM — o'lchashlar soni n − 1 (kamida 1).
  // Ref: JCGM 100:2008 G.4.1; egasi qarori 2026-11-17 (R-20) — faqat ν_eff ni ko'rsatish uchun, k ga ta'sir qilmaydi
  const nu = Math.max(1, (r.formula === 'single_crm' ? r.items[0].n : r.n) - 1);
  return { type: bias.type, ...r, nu };
}
