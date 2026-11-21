/* ═══════════════════════════════════════════════════════════════
   MCM-DECISION.JS — LPU (noaniqlikning tarqalish qonuni) natijasini Monte-Karlo usuli (MCM) bilan tekshirish
   MAJBURIYLIGI haqidagi avtomatik qaror qoidasi (P20, audit 21.11.2026 — MET-01).
   Sof modul (DOM / global obyekt / brauzer xotirasi yo'q); HISOBNI O'ZGARTIRMAYDI — faqat result.mcm ni beradi.

   Egasi qarori (2026-11-21, loyiha yo'riqnomasi §3.3 (a)–(d)). Chegaralar (0,50; 6) — LOYIHA QARORI, me'yoriy talab
   emas: JCGM 100 / 101 da bunday aniq sonlar yo'q, faqat LPU shartlari buzilganda MCM ni qo'llash tavsiyasi bor
   (JCGM 101:2008 §5.7, §5.8, §8.1.1). Linter A1 (dispersiya ulushi > 90 %) bu qoidadan mustaqil va o'zgarmagan.
═══════════════════════════════════════════════════════════════ */
import { toNum } from './util.js';

/** Chegaralar — yagona joy (loyiha qarori, egasi 2026-11-21). */
export const MCM_THRESHOLDS = Object.freeze({
  ratio: 0.50,     // (b): |c_i|·u(x_i) / u_c  (DISPERSIYA ULUSHI EMAS: 0,50 nisbat = 25 % ulush)
  nuEff: 6,        // (d): ν_eff < 6
});

/** (b) uchun normal bo'lmagan simmetrik taqsimotlar: to'g'ri burchakli, U-simon, trapetsiya (ikkala turi), uchburchak, diskretlik. */
export const MCM_NON_NORMAL = Object.freeze(['rect', 'ushape', 'trap', 'ctrap', 'triang', 'resol']);
/** (c) uchun asimmetrik taqsimotlar. Ref: JCGM 101:2008 §6.4.10 (eksponensial); log-normal — loyiha qo'shimchasi. */
export const MCM_ASYMMETRIC = Object.freeze(['exp', 'lognorm']);

export const MCM_REFS = Object.freeze({
  a: 'JCGM 100:2008 §5.1.2 NOTE; JCGM 101:2008 §5.7, §5.8',
  b: 'JCGM 101:2008 §5.7.2; loyiha qarori (2026-11-21) — chegara 0,50',
  c: 'JCGM 101:2008 §5.7, §5.8; loyiha qarori (2026-11-21)',
  d: 'JCGM 100:2008 G.6.6; loyiha qarori (2026-11-21) — chegara 6',
});

const DEFAULT_NONLIN_THRESHOLD = 0.01;

/**
 * MCM talab qilinadimi? Bitta chiqishli GUM (LPU) natijasi uchun.
 * @param {object} result    evaluate() natijasi (y, uc, U, nuEff, budget, inputs, secondOrder)
 * @param {object} [settings] hisob sozlamalari: nonlinThreshold, physicalBounds: { lower?, upper? }
 * @returns {{ required: boolean, reasons: Array<{code:'a'|'b'|'c'|'d', value:number|string, threshold:number|string, ref:string, source?:string, param?:string}> }}
 */
export function mcmDecision(result, settings) {
  const r = result || {};
  const s = settings || {};
  const reasons = [];
  if (r.error || !isFinite(r.uc)) return { required: false, reasons };

  // (a) Nochiziqlilik: 2-tartibli hadlar indeksi chegaradan katta, yoki biror c_i = 0 (1-tartibli had yo'qoladi).
  // Ref: JCGM 100:2008 §5.1.2 NOTE (yuqori tartibli hadlar); JCGM 101:2008 §5.7 (LPU shartlari), §5.8
  const so = r.secondOrder;
  const nonlinThreshold = so && isFinite(so.threshold) ? so.threshold
    : (isFinite(toNum(s.nonlinThreshold)) ? toNum(s.nonlinThreshold) : DEFAULT_NONLIN_THRESHOLD);
  if (so && Math.abs(so.index) > nonlinThreshold) {
    reasons.push({ code: 'a', value: so.index, threshold: nonlinThreshold, ref: MCM_REFS.a });
  }
  for (const inp of r.inputs || []) {
    if (inp.c === 0 && inp.cMethod !== 'none') {
      reasons.push({ code: 'a', value: 'c = 0', threshold: 'c ≠ 0', ref: MCM_REFS.a, param: String(inp.name) });
    }
  }

  // (b) Bitta normal bo'lmagan manba ustun: |c_i|·u(x_i) / u_c > 0,50 (nisbat, dispersiya ulushi emas).
  // Ref: JCGM 101:2008 §5.7 (natija taqsimoti normal / t ga yaqin bo'lishi sharti); chegara — loyiha qarori
  // (c) Asimmetrik kirish taqsimoti. Ref: JCGM 101:2008 §5.7, §5.8; loyiha qarori
  for (const row of r.budget || []) {
    if (row.kind !== 'B' || row.included === false) continue;
    if (MCM_ASYMMETRIC.includes(row.dist)) {
      reasons.push({ code: 'c', value: row.dist, threshold: 'symmetric', ref: MCM_REFS.c, source: String(row.name || ''), param: String(row.param || '') });
      continue;
    }
    if (!MCM_NON_NORMAL.includes(row.dist) || !(r.uc > 0)) continue;
    const ratio = Math.abs(row.c) * row.u / r.uc;
    if (ratio > MCM_THRESHOLDS.ratio) {
      reasons.push({ code: 'b', value: ratio, threshold: MCM_THRESHOLDS.ratio, ref: MCM_REFS.b, source: String(row.name || ''), param: String(row.param || '') });
    }
  }

  // (c) Fizik chegara yaqin: |y − chegara| < U (qamrov intervali chegaradan chiqadi — simmetrik interval ma'nosiz).
  // Ref: JCGM 101:2008 §5.7, §5.8 (asimmetrik natija taqsimoti); loyiha qarori
  const pb = s.physicalBounds && typeof s.physicalBounds === 'object' ? s.physicalBounds : null;
  if (pb && isFinite(r.y) && isFinite(r.U)) {
    for (const side of ['lower', 'upper']) {
      const bound = toNum(pb[side]);
      if (!isFinite(bound)) continue;
      const dist = Math.abs(r.y - bound);
      if (dist < r.U) reasons.push({ code: 'c', value: dist, threshold: r.U, ref: MCM_REFS.c, source: side, bound });
    }
  }

  // (d) Erkinlik darajalari kam: ν_eff < 6 (t-taqsimot yaqinlashuvi ishonchsiz). Chegara — loyiha qarori.
  // Ref: JCGM 100:2008 G.6.6 (ν_eff kichik bo'lganda Welch–Satterthwaite yaqinlashuvining cheklovi)
  if (isFinite(r.nuEff) && r.nuEff < MCM_THRESHOLDS.nuEff) {
    reasons.push({ code: 'd', value: r.nuEff, threshold: MCM_THRESHOLDS.nuEff, ref: MCM_REFS.d });
  }

  return { required: reasons.length > 0, reasons };
}

/** MCM tekshiruvi holatlari (hisobot va UI uchun). 'running' — faqat UI holati (bu yerda qaytarilmaydi). */
export const MCM_STATES = Object.freeze(['not_required', 'pending', 'failed', 'not_converged', 'validated', 'rejected', 'performed']);

/**
 * Talab qilingan MCM tekshiruvining holati.
 *   not_required  — qaror qoidasi MCM ni talab qilmaydi;
 *   pending       — talab qilinadi, lekin MCM natijasi yo'q (bajarilmagan yoki bekor qilingan);
 *   failed        — MCM xato bilan tugadi (masalan mc_nonnormal_correlation) — natija yo'q;
 *   not_converged — bajarildi, lekin talab qilingan sonli toleransga erishilmadi (JCGM 101:2008 §7.9.4, §8.2);
 *   validated / rejected — JCGM 101:2008 §8.1.3 xulosasi (LPU tasdiqlandi / tasdiqlanmadi);
 *   performed     — MCM bajarildi, §8 tekshiruvi so'ralmagan (validation: false).
 * @param {object} result  evaluate() natijasi (result.mcm bilan)
 * @param {object|null} mc monteCarlo() natijasi yoki null
 */
export function mcmState(result, mc) {
  const m = result && result.mcm;
  if (!m || !m.required) return 'not_required';
  if (!mc) return 'pending';
  if (mc.error) return 'failed';
  const a = mc.adaptive || {}, v = mc.validation || {};
  // Ref: JCGM 101:2008 §7.9.4 k), §8.2 — linter M4 (mc_not_converged) bilan bir xil shart
  if ((a.enabled && a.reachedMax && !a.converged) || (!a.enabled && v.requested && v.met === false)) return 'not_converged';
  if (mc.validated === true) return 'validated';
  if (mc.validated === false) return 'rejected';
  return 'performed';
}

/** Talab qilingan MCM bajarilmaganmi (hisobot "QORALAMA" bo'ladi)? */
export function mcmMissing(result, mc) {
  const s = mcmState(result, mc);
  return s === 'pending' || s === 'failed';
}
