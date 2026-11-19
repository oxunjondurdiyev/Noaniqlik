/* ═══════════════════════════════════════════════════════════════
   PT/INDEX.JS — malaka sinovlari (PT) / laboratoriyalararo solishtirish natijalarini baholash (P12). Sof modul.
   Format: 'uc-pt/1' (docs/ENGINE_API.md §15). ISO/IEC 17025:2017 §7.7.2 (unverified — standart repoda yo'q).
     z   = (x − x_pt) / σ_pt
     z′  = (x − x_pt) / √(σ_pt² + u²(x_pt))
     ζ   = (x − x_pt) / √(u²(x) + u²(x_pt))
     E_n = (x − x_pt) / √(U²(x) + U²(x_pt))
   Ref: ISO 13528:2022 §9.4–9.7 (unverified — pullik, repoda yo'q); Eurachem "Selection, Use and Interpretation of PT
        Schemes", 3rd ed. (2021) — egasi qo'shadi (docs/references/Eurachem_PT_Guide_2021.pdf), qo'shilguncha (unverified).
   Baholash chegaralari — LOYIHA STANDARTI (R-26 #1, egasi tasdig'ini kutadi): PT_LIMITS (yagona joy).
   Ball avtomatik almashtirilmaydi: u(x_pt) > 0,3·σ_pt bo'lsa faqat topilma `pt_uxpt_large` (z′ tavsiya qilinadi).
   Sof: soat o'qilmaydi (raund sanasi tashqaridan).
═══════════════════════════════════════════════════════════════ */
import { ENGINE_VERSION } from '../version.js';
import { isBlank, toNum } from '../util.js';
import { parseUnit, convert } from '../units.js';

export const PT_FORMAT = 'uc-pt/1';
export const PT_SCORES = Object.freeze(['z', 'zPrime', 'zeta', 'En']);
/** Baholash chegaralari — LOYIHA STANDARTI (R-26 #1; ISO 13528 / Eurachem PT Guide bilan solishtirilmagan — unverified).
    |z|, |z′|, |ζ| ≤ 2 — qoniqarli; 2 < |·| < 3 — shubhali; ≥ 3 — qoniqarsiz. |E_n| ≤ 1 — qoniqarli; > 1 — qoniqarsiz.
    Chegaradagi qiymat (|z| = 2,0; |E_n| = 1,0) — qoniqarli. */
export const PT_LIMITS = Object.freeze({ warn: 2, action: 3, en: 1 });
/** Chegara bilan solishtirish toleransi (nisbiy) — ikkilik yaxlitlash xatosi chegarani o'zgartirmasligi uchun (R-26 #1). */
export const PT_BOUNDARY_TOL = 1e-12;
export const PT_LIMITS_REF = 'ISO 13528:2022 §9.4–9.7; Eurachem PT Guide (2021) (unverified) — R-26';
/** u(x_pt) > 0,3·σ_pt → z′ tavsiyasi. Ref: ISO 13528:2022 §9.2.1 (unverified). */
export const PT_UXPT_RATIO = 0.3;
export const PT_VERDICTS = Object.freeze(['satisfactory', 'questionable', 'unsatisfactory']);
export const PT_ERRORS = Object.freeze(['pt_bad_spec', 'pt_bad_data', 'pt_sigma_nonpositive', 'pt_u_nonpositive', 'pt_unit_mismatch', 'pt_unit_unknown', 'pt_no_score']);
export const PT_NULL_REASONS = Object.freeze(['pt_need_sigma', 'pt_need_ux', 'pt_need_uxpt', 'pt_need_U', 'pt_need_Uxpt']);

export const PT_FINDINGS = Object.freeze({
  pt_uxpt_large: { severity: 'info', ref: 'ISO 13528:2022 §9.2.1 (unverified): u(x_pt) > 0,3·σ_pt — z′ tavsiya qilinadi', unverified: true },
  pt_limits_unverified: { severity: 'info', ref: PT_LIMITS_REF, unverified: true },
  pt_unsatisfactory: { severity: 'warning', ref: PT_LIMITS_REF, unverified: true },
  pt_questionable: { severity: 'info', ref: PT_LIMITS_REF, unverified: true },
  pt_unauthenticated: { severity: 'info', ref: 'CLAUDE.md (P11 qarori): mehmon (guest) kiritgan yozuv' },
});

class PtError extends Error { constructor(code, detail) { super(code); this.code = code; this.detail = detail === undefined ? '' : String(detail); } }
const fail = (c, d) => { throw new PtError(c, d); };
const has = v => !isBlank(v);
function num(v, where) { const n = typeof v === 'number' ? v : toNum(v); if (!Number.isFinite(n)) fail('pt_bad_data', where); return n; }

/** Kattalik { value, unit? } yoki son → raund birligidagi son. Birlik mos kelmasa — xato (jimgina tuzatilmaydi). */
function inUnit(v, unit, where, difference) {
  if (!has(v)) return null;
  if (typeof v !== 'object') return num(v, where);
  const val = num(v.value, `${where}.value`);
  if (!has(v.unit) || !has(unit) || v.unit === unit) {
    if (has(v.unit) && !has(unit)) fail('pt_unit_mismatch', `${where}: ${v.unit} → (no unit)`);
    return val;
  }
  const a = parseUnit(v.unit), b = parseUnit(unit);
  if (!a || !b) fail('pt_unit_unknown', `${where}: ${v.unit}`);
  try { return convert(val, a, b, { difference }); } catch (e) { fail('pt_unit_mismatch', `${where}: ${v.unit} → ${unit}`); }
}

/** Ball → baho. */
export function verdictOf(score, kind) {
  if (score === null || !Number.isFinite(score)) return null;
  const a = Math.abs(score);
  // Ref: R-26 #1 (loyiha standarti) — chegaradagi qiymat qoniqarli. Chegara bilan solishtirish 10⁻¹² nisbiy tolerans bilan
  // (PT_BOUNDARY_TOL): (10,4 − 10)/0,2 = 2,0000000000000018 ikkilik arifmetikada — matematik jihatdan aynan 2 (R-26 #1).
  const le = (v, lim) => v <= lim * (1 + PT_BOUNDARY_TOL);
  if (kind === 'En') return le(a, PT_LIMITS.en) ? 'satisfactory' : 'unsatisfactory';
  return le(a, PT_LIMITS.warn) ? 'satisfactory' : !le(PT_LIMITS.action, a) ? 'questionable' : 'unsatisfactory';
}

/**
 * Bitta raund natijasining ballari.
 * @param {{x, xpt, sigmaPt?, ux?, uxpt?, Ux?, Uxpt?, unit?}} r  qiymatlar son yoki {value, unit}
 * @returns {{x, xpt, d, unit, sigmaPt, ux, uxpt, Ux, Uxpt, scores:{z,zPrime,zeta,En}, reasons:{…}, verdicts:{…}, uxptRatio}}
 */
export function ptScores(r) {
  if (!r || typeof r !== 'object') fail('pt_bad_spec');
  const unit = has(r.unit) ? String(r.unit) : '';
  const x = inUnit(r.x, unit, 'x', false), xpt = inUnit(r.xpt, unit, 'xpt', false);
  if (x === null) fail('pt_bad_data', 'x');
  if (xpt === null) fail('pt_bad_data', 'xpt');
  const sigmaPt = inUnit(r.sigmaPt, unit, 'sigmaPt', true);
  const ux = inUnit(r.ux, unit, 'ux', true), uxpt = inUnit(r.uxpt, unit, 'uxpt', true);
  const Ux = inUnit(r.Ux, unit, 'Ux', true), Uxpt = inUnit(r.Uxpt, unit, 'Uxpt', true);
  if (sigmaPt !== null && !(sigmaPt > 0)) fail('pt_sigma_nonpositive', String(sigmaPt));
  for (const [k, v] of [['ux', ux], ['Ux', Ux], ['Uxpt', Uxpt]]) if (v !== null && !(v > 0)) fail('pt_u_nonpositive', `${k} = ${v}`);
  if (uxpt !== null && !(uxpt >= 0)) fail('pt_u_nonpositive', `uxpt = ${uxpt}`);
  const d = x - xpt;
  const scores = { z: null, zPrime: null, zeta: null, En: null }, reasons = {};
  // Ref: ISO 13528:2022 §9.4 (unverified) — z = (x − x_pt)/σ_pt
  if (sigmaPt !== null) scores.z = d / sigmaPt; else reasons.z = 'pt_need_sigma';
  // Ref: ISO 13528:2022 §9.5 (unverified) — z′ = (x − x_pt)/√(σ_pt² + u²(x_pt))
  if (sigmaPt === null) reasons.zPrime = 'pt_need_sigma';
  else if (uxpt === null) reasons.zPrime = 'pt_need_uxpt';
  else scores.zPrime = d / Math.sqrt(sigmaPt * sigmaPt + uxpt * uxpt);
  // Ref: ISO 13528:2022 §9.6 (unverified) — ζ = (x − x_pt)/√(u²(x) + u²(x_pt))
  if (ux === null) reasons.zeta = 'pt_need_ux';
  else if (uxpt === null) reasons.zeta = 'pt_need_uxpt';
  else scores.zeta = d / Math.sqrt(ux * ux + uxpt * uxpt);
  // Ref: ISO 13528:2022 §9.7 (unverified) — E_n = (x − x_pt)/√(U²(x) + U²(x_pt))
  if (Ux === null) reasons.En = 'pt_need_U';
  else if (Uxpt === null) reasons.En = 'pt_need_Uxpt';
  else scores.En = d / Math.sqrt(Ux * Ux + Uxpt * Uxpt);
  const verdicts = Object.fromEntries(PT_SCORES.map(k => [k, verdictOf(scores[k], k)]));
  return { x, xpt, d, unit, sigmaPt, ux, uxpt, Ux, Uxpt, scores, reasons, verdicts, uxptRatio: sigmaPt !== null && uxpt !== null ? uxpt / sigmaPt : null };
}

/** Asosiy ball: berilgan (`primary`) yoki mavjudlaridan birinchisi — E_n, z, z′, ζ tartibida. Avtomatik almashtirilmaydi. */
export function primaryScore(s, wanted) {
  if (wanted && PT_SCORES.includes(wanted)) return s.scores[wanted] === null ? null : wanted;
  return ['En', 'z', 'zPrime', 'zeta'].find(k => s.scores[k] !== null) || null;
}

/**
 * PT baholashi: bitta yoki bir nechta raund (tarix). Natija YAXLITLANMAYDI.
 * @param {{format:'uc-pt/1', rounds:[{id?, date?, scheme?, provider?, x, xpt, sigmaPt?, ux?, uxpt?, Ux?, Uxpt?, unit?, primary?}],
 *          quantity?, method?, matrix?, savedBy?}} spec
 */
export function evaluatePT(spec) {
  try {
    if (!spec || !Array.isArray(spec.rounds) || !spec.rounds.length) fail('pt_bad_spec', 'rounds');
    const findings = [];
    const add = (code, extra = {}) => {
      const m = PT_FINDINGS[code];
      const id = `PT/${code}${extra.key ? ':' + extra.key : ''}`;
      if (findings.some(f => f.id === id)) return;
      findings.push({ id, rule: 'PT', code, severity: m.severity, ref: m.ref, mode: 'PT', ...(extra.value !== undefined ? { value: String(extra.value) } : {}), ...(m.unverified ? { unverified: true } : {}) });
    };
    const rounds = spec.rounds.map((r, i) => {
      let s;
      try { s = ptScores(r); } catch (e) { if (e instanceof PtError) { e.detail = `rounds[${i}] ${e.detail}`.trim(); } throw e; }
      const primary = primaryScore(s, r.primary);
      if (!primary) fail('pt_no_score', `rounds[${i}]`);
      const id = has(r.id) ? String(r.id) : `R${i + 1}`;
      const verdict = s.verdicts[primary];
      if (s.uxptRatio !== null && s.uxptRatio > PT_UXPT_RATIO && primary === 'z') add('pt_uxpt_large', { key: id, value: `${id}: u(x_pt)/σ_pt = ${s.uxptRatio.toPrecision(3)}` });
      if (verdict === 'unsatisfactory') add('pt_unsatisfactory', { key: id, value: `${id}: ${primary} = ${s.scores[primary].toPrecision(3)}` });
      if (verdict === 'questionable') add('pt_questionable', { key: id, value: `${id}: ${primary} = ${s.scores[primary].toPrecision(3)}` });
      return { id, date: has(r.date) ? String(r.date) : '', scheme: has(r.scheme) ? String(r.scheme) : '', provider: has(r.provider) ? String(r.provider) : '', ...s, primary, score: s.scores[primary], verdict };
    });
    const units = new Set(rounds.map(r => r.unit));
    add('pt_limits_unverified');
    if (spec.savedBy === 'guest') add('pt_unauthenticated');
    const order = { error: 0, warning: 1, info: 2 };
    findings.sort((a, b) => order[a.severity] - order[b.severity]);
    return {
      engineVersion: ENGINE_VERSION, mode: 'PT', format: PT_FORMAT,
      quantity: spec.quantity || '', method: spec.method || '', matrix: spec.matrix || '',
      rounds, n: rounds.length, mixedUnits: units.size > 1,
      counts: Object.fromEntries(PT_VERDICTS.map(v => [v, rounds.filter(r => r.verdict === v).length])),
      limits: { ...PT_LIMITS }, limitsRef: PT_LIMITS_REF, uxptRatioLimit: PT_UXPT_RATIO,
      findings,
    };
  } catch (e) {
    if (e instanceof PtError) return { error: e.code, detail: e.detail };
    throw e;
  }
}

/** Oxirgi raund: sanasi eng kech (ISO sana); sanasiz yoki teng sanada — ro'yxatdagi oxirgisi. */
export function lastRound(result) {
  const rs = (result && result.rounds) || [];
  let best = null, bi = -1;
  rs.forEach((r, i) => { if (!best || !r.date || !best.date || r.date >= best.date) { best = r; bi = i; } });
  return bi < 0 ? null : rs[bi];
}

/**
 * Hisobga yoziladigan PT seriyasi NUSXASI (linter L3 uchun; reestr nusxasi kabi — seriya o'zgarsa eski hisob o'zgarmaydi).
 * @param {{id, version, name, quantity, method}} series
 * @param {object} result  evaluatePT() natijasi
 */
export function ptLinkOf(series, result) {
  const s = series || {};
  const last = lastRound(result);
  if (!last) return null;
  return { seriesId: String(s.id || ''), version: s.version || 0, name: String(s.name || ''), quantity: String(s.quantity || ''), method: String(s.method || ''),
    lastRound: { id: last.id, date: last.date || '', primary: last.primary, score: last.score, verdict: last.verdict } };
}

/**
 * PT tarixi → top-down siljish bloki (P09: bias.type 'pt', Nordtest TR 537 §6.2). Formula QAYTA yozilmaydi —
 * faqat kirish tuziladi; hisob — src/engine/topdown/bias.js. Har bir raunddan: assigned = x_pt, result = x,
 * u(C_ref) = u(x_pt) (yoki U(x_pt)/2). Birlik — raund birligi (mutlaq shkala).
 * @returns {{bias:object, rounds:number, missingUref:string[]}}
 */
export function ptToTopDownBias(result) {
  const r = (result && result.rounds) || [];
  const missing = [];
  const rounds = r.map(x => {
    const o = { id: x.id, assigned: x.xpt, result: x.x };
    if (x.uxpt !== null) o.uRef = x.uxpt;
    else if (x.Uxpt !== null) { o.U = x.Uxpt; o.k = 2; }
    else missing.push(x.id);
    return o;
  });
  const unit = r.length ? r[0].unit : '';
  return { bias: { type: 'pt', unit, rounds }, rounds: rounds.length, missingUref: missing };
}
