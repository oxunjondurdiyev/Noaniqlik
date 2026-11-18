/* ═══════════════════════════════════════════════════════════════
   MICRO/INDEX.JS — mikrobiologik sanoq noaniqligi, log₁₀ shkala (P10-A). BETA — TEKSHIRILMAGAN.
   Kirish formati: 'uc-micro/1' (docs/ENGINE_API.md §9).
   Yondashuv ISO 19036 ga tayanadi (texnik + matritsa + Puasson hissalari). Standart pullik va
   docs/references/ da yo'q — formulalar docs/prompts (P08-A) dagi tavsif bo'yicha; natijada har doim
   `micro_unverified` belgisi chiqadi (CLAUDE.md: manba aniq bo'lmaguncha unverified).
     y = log₁₀(N);  u_tech = √(Σ(log₁₀x_i1 − log₁₀x_i2)²/(2n));  u_Poisson = 0,4343/√ΣC  (0,4343 = 1/ln 10)
     u_c = √(u_tech² + u_matrix² + u_Poisson²);  U = k·u_c;  interval [10^(y−U); 10^(y+U)]
   Sof modul (brauzer obyektlari yo'q). Natija YAXLITLANMAYDI.
═══════════════════════════════════════════════════════════════ */
import { ENGINE_VERSION } from '../version.js';
import { isBlank, toNum } from '../util.js';

export const MICRO_FORMAT = 'uc-micro/1';
/** 1/ln(10) — log₁₀ shkalaga o'tkazish (Puasson: u(ln C) ≈ 1/√ΣC). Ref: JCGM 100:2008 §5.1.2 (tarqalish qonuni, y = log₁₀ C). */
export const LOG10_E = 1 / Math.LN10;
/** Past sanoq chegarasi — loyiha parametri (manba tekshirilmagan); settings.lowCountThreshold bilan o'zgartiriladi. */
export const LOW_COUNT_DEFAULT = 10;

export const MICRO_WARNINGS = {
  micro_unverified: { severity: 'warning', ref: 'CLAUDE.md — ISO 19036 pullik, docs/references/ da yo\'q: modul BETA, manba misoli bilan tasdiqlanmagan' },
  micro_low_count: { severity: 'warning', ref: 'ISO 19036 (repoda yo\'q — tekshirilmagan): past sanoqda Puasson hissasi ustun, log-normal yaqinlashish ishonchsiz' },
  micro_no_technical: { severity: 'warning', ref: 'ISO 19036 (repoda yo\'q — tekshirilmagan): texnik noaniqlik (laboratoriya ichidagi takrorlanuvchanlik) kiritilmagan' },
  micro_few_pairs: { severity: 'info', ref: 'ISO 19036 (repoda yo\'q — tekshirilmagan): dublikat juftliklari soni kam' },
};
export const MICRO_ERRORS = ['micro_bad_spec', 'micro_bad_data', 'micro_zero_count', 'micro_need_result'];

/** Dublikatlarning log₁₀ farqlaridan standart og'ish: s = √(Σd²/(2n)), d = log₁₀x₁ − log₁₀x₂. */
export function logDuplicateSd(pairs) {
  let q = 0;
  for (const [a, b] of pairs) { const d = Math.log10(a) - Math.log10(b); q += d * d; }
  return Math.sqrt(q / (2 * pairs.length));
}

/**
 * @param {object} spec { format:'uc-micro/1', result:{value (CFU/g yoki CFU/mL), sumCounts (ΣC)}, unit?,
 *   technical?:{pairs:[[x1,x2]…]} | {s (log₁₀)}, matrix?:{u (log₁₀)}, settings?:{k=2, lowCountThreshold} }
 */
export function evaluateMicro(spec) {
  if (!spec || typeof spec !== 'object') return { error: 'micro_bad_spec' };
  const settings = spec.settings || {};
  const k = isBlank(settings.k) ? 2 : toNum(settings.k);
  if (!(k > 0)) return { error: 'micro_bad_data', detail: 'settings.k' };
  const res = spec.result || {};
  if (isBlank(res.value) || isBlank(res.sumCounts)) return { error: 'micro_need_result' };
  const N = toNum(res.value), C = toNum(res.sumCounts);
  if (!Number.isFinite(N) || !Number.isFinite(C) || C < 0) return { error: 'micro_bad_data', detail: 'result' };
  if (!(N > 0) || !(C > 0)) return { error: 'micro_zero_count' };   // log₁₀(0) aniqlanmagan — natija "< aniqlash chegarasi" deb beriladi

  const warnings = [];
  const warn = (code, extra) => warnings.push({ code, ...MICRO_WARNINGS[code], ...(extra || {}) });
  warn('micro_unverified');

  let uTech = null, nPairs = null;
  const tech = spec.technical;
  if (tech && Array.isArray(tech.pairs) && tech.pairs.length) {
    const pairs = [];
    for (const [i, p] of tech.pairs.entries()) {
      const a = toNum(p && p[0]), b = toNum(p && p[1]);
      if (!(a > 0) || !(b > 0)) return { error: 'micro_bad_data', detail: `technical.pairs[${i}]` };
      pairs.push([a, b]);
    }
    uTech = logDuplicateSd(pairs); nPairs = pairs.length;
    if (nPairs < 10) warn('micro_few_pairs', { value: String(nPairs) });
  } else if (tech && !isBlank(tech.s)) {
    uTech = toNum(tech.s);
    if (!(uTech >= 0)) return { error: 'micro_bad_data', detail: 'technical.s' };
  } else warn('micro_no_technical');
  let uMatrix = 0;
  if (spec.matrix && !isBlank(spec.matrix.u)) {
    uMatrix = toNum(spec.matrix.u);
    if (!(uMatrix >= 0)) return { error: 'micro_bad_data', detail: 'matrix.u' };
  }
  const uPoisson = LOG10_E / Math.sqrt(C);
  const low = isBlank(settings.lowCountThreshold) ? LOW_COUNT_DEFAULT : toNum(settings.lowCountThreshold);
  if (C < low) warn('micro_low_count', { value: `ΣC = ${C}` });

  const y = Math.log10(N);
  const parts = [['technical', uTech || 0], ['matrix', uMatrix], ['poisson', uPoisson]];
  const uc2 = parts.reduce((a, [, u]) => a + u * u, 0), uc = Math.sqrt(uc2), U = k * uc;
  return {
    engineVersion: ENGINE_VERSION, mode: 'MICROBIOLOGY', format: MICRO_FORMAT,
    approach: 'LOG10_COUNT', approachRef: 'ISO 19036 (tekshirilmagan — standart repoda yo\'q)', unverified: true,
    value: N, sumCounts: C, unit: spec.unit || '',
    y, uTech, nPairs, uMatrix, uPoisson, uc, uc2, k, U,
    budget: parts.map(([id, u]) => ({ id, u, variance: u * u, share: uc2 > 0 ? 100 * u * u / uc2 : 0 })),
    // log₁₀ shkaladagi simmetrik interval oddiy shkalada asimmetrik
    interval: { low: Math.pow(10, y - U), high: Math.pow(10, y + U) },
    intervalLog: { low: y - U, high: y + U },
    roundUp: settings.rounding === 'up',
    warnings,
  };
}
