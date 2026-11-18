/* ═══════════════════════════════════════════════════════════════
   DECISION.JS — qaror qoidasi va muvofiqlik bayonoti (P05b). Sof modul.
   Manbalar (docs/references/ da, verified):
     JCGM 106:2012 §7.2–7.4 — muvofiqlik ehtimoli p_c (normal PDF): Eq. (6), (8)–(11);
                   §7.6    — o'lchash qobiliyati indeksi C_m = T/(4u) = T/(2U); MPE uchun C_m = E_max/U (§7.6.5);
                   §8.2    — oddiy qabul (simple acceptance): A = T;
                   §8.3.2  — himoyalangan qabul: w = T_U − A_U > 0; w = r·U (§8.3.2.3);
                   §8.3.3  — himoyalangan rad etish: w < 0;
                   §9.3.2  — bitta buyum uchun (specific) iste'molchi va ishlab chiqaruvchi xavfi.
     ILAC G8:09/2019 §1.13 (TUR = TL/U), §4.2.1–4.2.3 (binar va binar bo'lmagan bayonot), §5.2, Table 1 (r va PFA).
   Farazlar: o'lchanadigan kattalik haqidagi bilim normal PDF bilan ifodalanadi (o'rtacha — baho, standart og'ish — u).
   ν_eff kichik bo'lsa (t-taqsimot) p_c taxminiy — natijada `assumption: 'normal'` yoziladi.
   Yaxlitlash yo'q (hisobot qatlamida).
═══════════════════════════════════════════════════════════════ */
import { normalCdf } from './special.js';
import { isBlank, toNum } from './util.js';

export const DECISION_RULES = ['simple', 'guard_band'];
export const DECISION_STATEMENTS = ['binary', 'non_binary'];
/** ILAC G8:09/2019 Table 1 — w = r·U uchun tipik ko'paytuvchilar (bir tomonlama chegara, normal taqsimot). */
export const GUARD_PRESETS = Object.freeze([
  { r: 0, ref: 'ILAC G8:09/2019 Table 1 — simple acceptance, PFA < 50 %' },
  { r: 0.83, ref: 'ILAC G8:09/2019 Table 1 — ISO 14253-1:2017, PFA < 5 %' },
  { r: 1, ref: 'ILAC G8:09/2019 Table 1 — ILAC G8:2009 rule; JCGM 106:2012 §8.3.2.3, PFA < 2,5 %' },
  { r: 1.5, ref: 'ILAC G8:09/2019 Table 1 — 3 sigma, PFA < 0,16 %' },
  { r: 3, ref: 'ILAC G8:09/2019 Table 1 — 6 sigma, PFA < 1 ppm' },
]);

/**
 * Muvofiqlik ehtimoli (normal PDF). Ref: JCGM 106:2012 Eq. (10) — bir tomonlama: p_c = Φ(z); Eq. (11) — ikki tomonlama:
 * p_c = Φ((T_U − y)/u) − Φ((T_L − y)/u).
 * @param {number} y  baho; @param {number} u  standart noaniqlik (> 0); lower / upper — tolerantlik chegaralari (null — yo'q)
 */
export function conformanceProbability(y, u, lower, upper) {
  const hasL = lower !== null && lower !== undefined && isFinite(lower), hasU = upper !== null && upper !== undefined && isFinite(upper);
  if (!hasL && !hasU) return NaN;
  if (!(u > 0)) {                                           // u = 0: baho aniq ma'lum deb olinsa (X8 bu holni alohida ushlaydi)
    return (!hasL || y >= lower) && (!hasU || y <= upper) ? 1 : 0;
  }
  const hi = hasU ? normalCdf((upper - y) / u) : 1;
  const lo = hasL ? normalCdf((lower - y) / u) : 0;
  return hi - lo;
}

/**
 * Qaror qoidasini qo'llash.
 * @param {object} o
 * @param {number} o.value      chegara bilan solishtiriladigan baho (E yoki Y)
 * @param {number} o.u          standart noaniqlik u_c
 * @param {number} o.U          kengaytirilgan noaniqlik (himoya zonasi w = r·U shundan)
 * @param {number|null} o.lower, o.upper   tolerantlik chegaralari T_L, T_U (kamida bittasi)
 * @param {'simple'|'guard_band'} o.rule
 * @param {number} [o.r]        guard_band uchun ko'paytuvchi (standart 1; manfiy — himoyalangan rad etish)
 * @param {'binary'|'non_binary'} [o.statement='binary']
 * @returns {object} { type, lower, upper, tolerance, rule, r, w, acceptLower, acceptUpper, tur, cm, pc, pNonConf,
 *                     verdict, specificRisk, riskKind, maxFalseAccept, assumption } yoki { error }
 */
export function decide(o) {
  const value = Number(o.value), u = Number(o.u), U = Number(o.U);
  const lower = o.lower === null || o.lower === undefined ? null : Number(o.lower);
  const upper = o.upper === null || o.upper === undefined ? null : Number(o.upper);
  if (!isFinite(value) || !(u >= 0) || !(U >= 0)) return { error: 'decision_bad_data' };
  if (lower === null && upper === null) return { error: 'decision_need_limit' };
  if ((lower !== null && !isFinite(lower)) || (upper !== null && !isFinite(upper))) return { error: 'decision_bad_data' };
  if (lower !== null && upper !== null && !(upper > lower)) return { error: 'decision_bad_limits' };
  if (!DECISION_RULES.includes(o.rule)) return { error: 'decision_need_rule' };
  const statement = o.statement === undefined || o.statement === null || o.statement === '' ? 'binary' : o.statement;
  if (!DECISION_STATEMENTS.includes(statement)) return { error: 'decision_bad_data' };

  // Ref: JCGM 106:2012 §8.2 — oddiy qabul: w = 0; §8.3.2.3 — w = r·U (r = 1 keng tarqalgan)
  let r = 0;
  if (o.rule === 'guard_band') {
    r = o.r === undefined || o.r === null || o.r === '' ? 1 : Number(o.r);
    if (!isFinite(r)) return { error: 'decision_bad_data' };
  }
  const w = r * U;
  const type = lower !== null && upper !== null ? 'two_sided' : (upper !== null ? 'upper' : 'lower');
  // Qabul chegaralari. Ref: JCGM 106:2012 §8.3.2.2 — w = T_U − A_U; pastki chegara uchun A_L = T_L + w
  const acceptLower = lower === null ? null : lower + w;
  const acceptUpper = upper === null ? null : upper - w;
  if (acceptLower !== null && acceptUpper !== null && acceptLower > acceptUpper) {
    return { error: 'decision_guard_exceeds', detail: `w = ${w}` };       // qabul oralig'i bo'sh: 2w > T
  }
  const tolerance = type === 'two_sided' ? upper - lower : null;
  // Ref: JCGM 106:2012 §7.6.2 Eq. (12): C_m = T/(2U) (U — k = 2 uchun); ILAC G8:09/2019 §1.13: TUR = TL/U.
  // Simmetrik ±MPE da T = 2·MPE → TUR = MPE/U = C_m (JCGM 106 §7.6.5).
  const tur = tolerance !== null && U > 0 ? tolerance / (2 * U) : null;
  const cm = tolerance !== null && u > 0 ? tolerance / (4 * u) : null;

  const pc = conformanceProbability(value, u, lower, upper);
  const inTol = (lower === null || value >= lower) && (upper === null || value <= upper);
  const inAccept = (acceptLower === null || value >= acceptLower) && (acceptUpper === null || value <= acceptUpper);
  // rad etish chegaralari (binar bo'lmagan bayonot): T ± w tashqarisi. Ref: ILAC G8:09/2019 §4.2.3
  const wAbs = Math.abs(w);
  const inRejectZone = (lower !== null && value < lower - wAbs) || (upper !== null && value > upper + wAbs);

  let verdict;
  if (statement === 'binary') {
    // Ref: ILAC G8:09/2019 §4.2.1 (w = 0), §4.2.2 (AL = TL − w): qabul oralig'ida — pass, aks holda — fail
    verdict = inAccept ? 'pass' : 'fail';
  } else if (w >= 0) {
    // Ref: ILAC G8:09/2019 §4.2.3: pass / conditional pass ([TL − w, TL]) / conditional fail ([TL, TL + w]) / fail
    verdict = inAccept ? 'pass' : (inTol ? 'conditional_pass' : (inRejectZone ? 'fail' : 'conditional_fail'));
  } else {
    verdict = inTol ? 'pass' : (inAccept ? 'conditional_fail' : 'fail');   // himoyalangan rad etish (w < 0)
  }

  // Bitta o'lchov (buyum) uchun xavf. Ref: JCGM 106:2012 §9.3.2: qabul qilingan buyum uchun iste'molchi xavfi
  // R*_C = 1 − p_c; rad etilgan buyum uchun ishlab chiqaruvchi xavfi R*_P = p_c.
  const accepted = verdict === 'pass' || verdict === 'conditional_pass';
  const specificRisk = accepted ? 1 - pc : pc;
  // Qoidaning eng yomon holati: baho qabul chegarasida turganda noto'g'ri qabul ehtimoli.
  // Bir tomonlama: Φ(−w/u) (r = 1, k = 2 → 2,3 % — JCGM 106:2012 §8.3.2.3 misoli; ILAC G8 Table 1).
  let maxFalseAccept = null;
  if (u > 0) {
    const at = [acceptLower, acceptUpper].filter(v => v !== null);
    maxFalseAccept = Math.max(...at.map(a => 1 - conformanceProbability(a, u, lower, upper)));
  }
  return {
    type, lower, upper, tolerance, rule: o.rule, r, w, statement,
    acceptLower, acceptUpper, value, u, U,
    tur, cm, pc, pNonConf: 1 - pc,
    verdict, accepted, specificRisk, riskKind: accepted ? 'consumer' : 'producer', maxFalseAccept,
    assumption: 'normal',
  };
}

/**
 * Hisob sozlamalaridan qaror kirishini tuzish (evaluate() uchun).
 * Chegaralar: tolLower / tolUpper (aniq chegaralar, bir yoki ikki tomonlama) — bo'lmasa simmetrik ±MPE:
 *   model turi 'error' → [−MPE, +MPE] (E uchun); 'value' → [nominal − MPE, nominal + MPE] (Y uchun).
 * @returns {{spec:object}|{pending:string}|null}  null — chegara ham, qoida ham berilmagan
 *   pending: 'model_kind' | 'nominal' | 'limit' | 'rule'
 */
export function decisionInput(settings, ctx) {
  const s = settings || {};
  const hasRule = DECISION_RULES.includes(s.decisionRule);
  const tl = toNum(s.tolLower), tu = toNum(s.tolUpper);
  const explicit = isFinite(tl) || isFinite(tu);
  const hasMpe = ctx.mpe !== null && ctx.mpe !== undefined && ctx.mpe > 0;
  if (!hasRule && !explicit && !hasMpe) return null;
  if (!explicit && !hasMpe) return { pending: 'limit' };
  if (ctx.modelKind !== 'error' && ctx.modelKind !== 'value') return { pending: 'model_kind' };
  let lower, upper;
  if (explicit) {
    lower = isFinite(tl) ? tl : null; upper = isFinite(tu) ? tu : null;
  } else if (ctx.modelKind === 'error') {
    lower = -ctx.mpe; upper = ctx.mpe;
  } else {
    if (!isFinite(ctx.nominal)) return { pending: 'nominal' };
    lower = ctx.nominal - ctx.mpe; upper = ctx.nominal + ctx.mpe;
  }
  if (!hasRule) return { pending: 'rule', lower, upper };
  return { spec: { value: ctx.y, u: ctx.uc, U: ctx.U, lower, upper, rule: s.decisionRule,
                   r: isBlank(s.guardR) ? undefined : toNum(s.guardR), statement: isBlank(s.decisionStatement) ? 'binary' : s.decisionStatement } };
}
