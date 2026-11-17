/* ═══════════════════════════════════════════════════════════════
   TOPDOWN/INDEX.JS — TOP_DOWN rejimi: validatsiya va sifat nazorati ma'lumotlaridan noaniqlik (P09).
   Kirish formati: 'uc-topdown/1' (docs/ENGINE_API.md §8). evaluate() shu formatni
   evaluateTopDown() ga uzatadi; boshqa formatlar yo'li o'zgarmagan.
   Yondashuvlar (approach):
     NORDTEST        — u_c = √(u(R_w)² + u(bias)²)                 Nordtest TR 537 ed. 4 §3.2 (p. 10)
     QUAM_RECOVERY   — aniqlik + tiklanish R_m (t-test)            QUAM:2012 §7.7, Example A4 (pp. 65–68)
     REPRODUCIBILITY — u_c = s_R (+ qamralmagan omillar)           QUAM:2012 §7.6, A6; Nordtest §7; ISO 21748 (unverified)
     LEVEL_DEPENDENT — u(x) = √(s₀² + (x·s₁)²)                     QUAM:2012 E.5.2.1 Eq. [1] (p. 117)
   Gibrid: har qanday yondashuvga `additional[]` — asos QAMRAMAGAN omillar (X11 nazorati bilan).
   Empirik kattalik (isEmpiricalMeasurand): usul bias'i ta'rif bo'yicha 0 (QUAM:2012 §7.9.2; X12).
   Sof modul (brauzer obyektlari yo'q). Natija YAXLITLANMAYDI (yaxlitlash — src/report/).
═══════════════════════════════════════════════════════════════ */
import { ENGINE_VERSION } from '../version.js';
import { TopDownError, fail, num, has, declaredScale, makeContext, stated, toContextUnit, rss } from './scale.js';
import { evaluateRw } from './rw.js';
import { evaluateBias, MIN_PT_ROUNDS } from './bias.js';
import { evaluateRecovery } from './recovery.js';
import { evaluateReproducibility } from './reproducibility.js';
import { levelUncertainty, fitLevelModel } from './level.js';
import { coverage } from '../coverage.js';

export const TOPDOWN_FORMAT = 'uc-topdown/1';
export const TOPDOWN_APPROACHES = ['NORDTEST', 'QUAM_RECOVERY', 'REPRODUCIBILITY', 'LEVEL_DEPENDENT'];

/** Yondashuvning manbasi (hisobotda yoziladi). */
export const APPROACH_REF = {
  NORDTEST: 'Nordtest TR 537 ed. 4 (2017) §3.2',
  QUAM_RECOVERY: 'EURACHEM/CITAC QUAM:2012 §7.7, Example A4',
  REPRODUCIBILITY: 'EURACHEM/CITAC QUAM:2012 §7.6; Nordtest TR 537 ed. 4 §7; ISO 21748',
  LEVEL_DEPENDENT: 'EURACHEM/CITAC QUAM:2012 Appendix E.5, Eq. [1]',
};

/** Qo'shimcha (gibrid) hissa toifalari — X11 (ikki marta hisoblash) shu toifalar bo'yicha tekshiradi. */
export const TOPDOWN_CATEGORIES = [
  'repeatability', 'intermediate_precision', 'reproducibility', 'balance', 'volumetric', 'calibration',
  'reference_material', 'recovery', 'matrix', 'homogeneity', 'sampling', 'sample_preparation',
  'temperature', 'time', 'speed', 'operator', 'instrument', 'drift', 'other',
];
/** R_w / s_R har doim qamraydigan toifalar (ta'rif bo'yicha). Qolganlari — `covers[]` da ko'rsatiladi. */
const BASE_COVERS = {
  rw: ['repeatability', 'intermediate_precision'],
  sR: ['repeatability', 'intermediate_precision', 'reproducibility'],
};

/** Empirik kattalikda bias / recovery: tayanch qiymat qaysi usul bilan olingan (egasi qarori 2026-11-17, R-20).
    'same'  — shu usulning o'zi bilan: bias faqat laboratoriya ishiga tegishli → hisobga kiradi (QUAM:2012 §7.9.3);
    'other' — boshqa usul / ta'rif: usul bias'i ta'rif bo'yicha 0 → hissa chiqarib tashlanadi (QUAM:2012 §7.9.2);
    javob yo'q — hissa u_c ga QO'SHILADI (konservativ) va X12 ogohlantirishi chiqadi. */
export const REFERENCE_METHODS = ['same', 'other'];
/** Ref: JCGM 100:2008 G.4.1 (Welch–Satterthwaite); ν_eff shu chegaradan kichik bo'lsa t_P(⌊ν_eff⌋) taklif qilinadi (egasi qarori, R-20). */
export const NU_EFF_WARN_BELOW = 30;

function referenceMethod(o, where) {
  if (!o) return null;
  if (has(o.referenceMethod)) {
    if (!REFERENCE_METHODS.includes(o.referenceMethod)) fail('topdown_bad_spec', `${where}.referenceMethod`);
    return o.referenceMethod;
  }
  return o.referenceByMethod === true ? 'same' : null;   // eski maydon bilan moslik
}

/* Ogohlantirishlar: { code, severity, ref } (+ rule — P05 da linter qoidasiga ko'chiriladi). */
export const TOPDOWN_WARNINGS = {
  x11_double_counting: { rule: 'X11', severity: 'warning', ref: 'Nordtest TR 537 ed. 4 §3.2, 2-qadam B (p. 10): faqat nazorat namunasi qamramagan bosqichlar; QUAM:2012 §7.6.2 d), §7.7.1 (p. 18)' },
  x12_empirical_bias: { rule: 'X12', severity: 'warning', ref: 'EURACHEM/CITAC QUAM:2012 §7.9.2–7.9.3 (p. 21): empirik usulda usul bias\'i nolga teng deb ta\'riflanadi; tayanch qiymat usuli ko\'rsatilmagan' },
  x12_bias_excluded: { rule: 'X12', severity: 'info', ref: 'EURACHEM/CITAC QUAM:2012 §7.9.2 (p. 21): tayanch qiymat boshqa usul bilan olingan — usul bias\'i hisobga kirmaydi' },
  topdown_nu_low: { severity: 'warning', ref: 'JCGM 100:2008 G.4.1 Eq. (G.2b), G.3.2; Nordtest TR 537 ed. 4 §3.2, 6-qadam (p. 10)' },
  topdown_no_bias: { severity: 'warning', ref: 'Nordtest TR 537 ed. 4 §6 (p. 19): bias ahamiyatsiz bo\'lsa ham noaniqlik komponenti sifatida hisobga olinadi' },
  topdown_few_pt_rounds: { severity: 'warning', ref: 'Nordtest TR 537 ed. 4 §6.2 (p. 21): kamida 6 ta PT raundi; QUAM:2012 §7.8.2 (p. 21)' },
  topdown_bias_significant: { severity: 'warning', ref: 'EURACHEM/CITAC QUAM:2012 §7.7.9 (p. 20), §7.16.2 iv) (p. 25)' },
  topdown_sr_check_failed: { severity: 'warning', ref: 'ISO 21748 (repoda yo\'q — tekshirilmagan); QUAM:2012 §7.6.2 c) (p. 18)' },
  topdown_unverified: { severity: 'info', ref: 'CLAUDE.md — ISO 21748 pullik, docs/references/ da yo\'q' },
  zero_u: { severity: 'warning', ref: 'CLAUDE.md: U = 0 bo\'lgan natija ogohlantirishsiz hisobotga chiqmaydi; ISO/IEC 17025:2017 §7.6' },
  topdown_level_few: { severity: 'info', ref: 'EURACHEM/CITAC QUAM:2012 E.5.5.2, 1-qadam (p. 119): kamida 10 ta daraja' },
};
export const TOPDOWN_ERRORS = [
  'topdown_bad_spec', 'topdown_bad_approach', 'topdown_bad_data', 'topdown_mixed_scale', 'topdown_need_scale',
  'topdown_unit_mismatch', 'topdown_zero_mean', 'topdown_too_few', 'topdown_need_rw', 'topdown_need_bias',
  'topdown_need_uref', 'topdown_need_recovery', 'topdown_need_reproducibility', 'topdown_need_level',
  'topdown_level_fit_negative',
];

/** Qo'shimcha (gibrid) hissa: tayyor u yoki |c|·u(parametr) (QUAM:2012 Table A6.3, Note 4, p. 85). */
function additionalComponent(a, i, ctx) {
  const where = `additional[${i}]`;
  if (!a || typeof a !== 'object') fail('topdown_bad_spec', where);
  const category = a.category === undefined ? 'other' : a.category;
  if (!TOPDOWN_CATEGORIES.includes(category)) fail('topdown_bad_spec', `${where}.category`);
  let u, sensitivity = null, uParam = null;
  if (has(a.u)) u = stated(a, a.u, ctx, `${where}.u`);
  else if (has(a.sensitivity) && has(a.uParam)) {
    // Ref: QUAM:2012 Table A6.3 Note 4 (p. 85): natijadagi noaniqlik = sezgirlik koeffitsiyenti × parametr noaniqligi
    sensitivity = num(a.sensitivity, `${where}.sensitivity`); uParam = num(a.uParam, `${where}.uParam`);
    // nisbiy hissa uchun sezgirlik — normallashtirilgan (ulush / parametr birligi): natija ctx.F birligiga o'tkaziladi
    u = stated(a, Math.abs(sensitivity) * uParam * (a.relative === true ? ctx.F : 1), ctx, where);
  } else fail('topdown_bad_data', `${where}.u`);
  if (!(u >= 0)) fail('topdown_bad_data', `${where}.u`);
  return { id: a.id || `add_${i + 1}`, name: a.name || '', category, u, sensitivity, uParam };
}

function evaluateCore(spec) {
  if (!spec || typeof spec !== 'object') fail('topdown_bad_spec');
  const approach = String(spec.approach || '').toUpperCase();
  if (!TOPDOWN_APPROACHES.includes(approach)) fail('topdown_bad_approach', String(spec.approach));
  const ctx = makeContext(spec.scale || {}, spec.relativeUnit);
  const empirical = spec.isEmpiricalMeasurand === true;
  const settings = spec.settings || {};
  // Ref: Nordtest TR 537 ed. 4 §3.2, 6-qadam (p. 10): U = 2·u_c (taxminan 95 %); QUAM:2012 A6 (p. 86): k = 2
  const k = has(settings.k) ? num(settings.k, 'settings.k') : 2;
  if (!(k > 0)) fail('topdown_bad_data', 'settings.k');

  const warnings = [];
  const warn = (code, extra) => warnings.push({ code, ...TOPDOWN_WARNINGS[code], ...(extra || {}) });
  const budget = [];
  const row = (id, kind, u, extra) => budget.push({ id, kind, u, included: true, nu: Infinity, ...(extra || {}) });
  // X12 (egasi qarori 2026-11-17): empirik kattalikda bias — tayanch qiymat usuli bo'yicha
  const empiricalBias = (block, where) => {
    const reference = referenceMethod(block, where);
    if (!empirical || reference === 'same') return { included: true, reference, flag: false };
    if (reference === 'other') { warn('x12_bias_excluded', { value: where }); return { included: false, reference, flag: true }; }
    warn('x12_empirical_bias', { value: where });            // javob berilmagan: konservativ — hissa qo'shiladi
    return { included: true, reference, flag: true };
  };
  const covered = new Set();
  const out = { rw: null, bias: null, recovery: null, reproducibility: null, level: null };

  // ── O'lchangan qiymat (ixtiyoriy; LEVEL_DEPENDENT da majburiy) ──
  let y = null, yUnit = '';
  if (spec.measurement && has(spec.measurement.value)) {
    y = num(spec.measurement.value, 'measurement.value');
    if (!has(spec.measurement.unit)) fail('topdown_need_scale', 'measurement');
    yUnit = String(spec.measurement.unit).trim();
  }
  // y — kontekst birligida (mutlaq baholashda nisbiy U uchun kerak)
  const yCtx = y !== null && !ctx.relative ? toContextUnit(y, yUnit, ctx, 'measurement') : y;

  // ── Asos ────────────────────────────────────────────────
  if (approach === 'NORDTEST' || approach === 'QUAM_RECOVERY') {
    out.rw = evaluateRw(spec.rw, ctx);
    [...BASE_COVERS.rw, ...((spec.rw && spec.rw.covers) || [])].forEach(c => covered.add(c));
    row('rw', 'rw', out.rw.u, { nu: out.rw.nu });
  }

  if (approach === 'NORDTEST') {
    if (spec.bias) {
      out.bias = evaluateBias(spec.bias, ctx);
      // Ref: QUAM:2012 §7.9.2–7.9.3 (p. 21): empirik usulda bias faqat laboratoriya ishiga tegishli bo'lishi mumkin —
      // tayanch qiymat shu usulning o'zi bilan olingan bo'lsa (referenceByMethod). Aks holda usul bias'i = 0.
      const x12 = empiricalBias(spec.bias, 'bias');
      out.bias.included = x12.included; out.bias.referenceMethod = x12.reference;
      row('bias', 'bias', out.bias.u, { included: x12.included, nu: out.bias.nu, ...(x12.flag ? { flag: 'X12' } : {}) });
      if (x12.included) covered.add('reference_material');
      if (spec.bias.type === 'pt' && out.bias.n < MIN_PT_ROUNDS) warn('topdown_few_pt_rounds', { value: String(out.bias.n) });
    } else if (!empirical) warn('topdown_no_bias');
  }

  let yUsed = yCtx;
  if (approach === 'QUAM_RECOVERY') {
    out.recovery = evaluateRecovery(spec.recovery, ctx);
    const rec = out.recovery;
    const x12 = empiricalBias(spec.recovery, 'recovery');
    rec.included = x12.included; rec.referenceMethod = x12.reference;
    row('recovery', 'recovery', rec.u, { included: x12.included, nu: rec.nu, ...(x12.flag ? { flag: 'X12' } : {}) });
    if (x12.included) {
      covered.add('recovery');
      // Ref: QUAM:2012 A4 (p. 66): tuzatish koeffitsiyenti 1/Rec qo'llanadi
      if (rec.correction === 'applied' && y !== null) yUsed = y * ctx.F / rec.Rm;
      if (rec.correction === 'not_applied' && rec.significant) warn('topdown_bias_significant', { value: `t = ${rec.t.toPrecision(3)} ≥ ${rec.tCrit.toPrecision(4)}` });
    }
  }

  if (approach === 'REPRODUCIBILITY') {
    out.reproducibility = evaluateReproducibility(spec.reproducibility, spec.labRepeatability, spec.methodBias, ctx);
    const rp = out.reproducibility;
    [...BASE_COVERS.sR, ...((spec.reproducibility && spec.reproducibility.covers) || [])].forEach(c => covered.add(c));
    row('sR', 'sR', rp.sRUsed);
    if (rp.uDelta !== null) {
      // Empirik usul: usul bias'i ta'rif bo'yicha 0 → u(δ̂) qo'shilmaydi (QUAM:2012 §7.9.2)
      const x12 = empiricalBias(spec.methodBias, 'methodBias');
      rp.uDeltaIncluded = x12.included;
      row('uDelta', 'bias', rp.uDelta, { included: x12.included, ...(x12.flag ? { flag: 'X12' } : {}) });
    }
    if (rp.lab && !rp.lab.pass) warn('topdown_sr_check_failed', { value: `χ² = ${rp.lab.chi2.toPrecision(4)} > ${rp.lab.chi2Crit.toPrecision(4)}` });
    if (rp.unverified.length) warn('topdown_unverified', { value: rp.unverified.join(', ') });
  }

  if (approach === 'LEVEL_DEPENDENT') {
    // Natija mutlaq: s₀ (birlik bilan) va s₁ (relative: true) x orqali birlashtiriladi — QUAM:2012 E.5.2.1 Eq. [1]
    if (ctx.relative) fail('topdown_mixed_scale', 'levelModel: scale.unit required');
    if (y === null) fail('topdown_need_level', 'measurement');
    const lm = spec.levelModel;
    if (!lm) fail('topdown_need_level', 'levelModel');
    let s0, s1, fit = null;
    if (Array.isArray(lm.points)) {
      if (declaredScale(lm, 'levelModel') !== 'absolute') fail('topdown_mixed_scale', 'levelModel.points: unit');
      const pts = lm.points.map((p, i) => ({
        x: toContextUnit(num(p.x, `levelModel.points[${i}].x`), lm.unit, ctx, 'levelModel'),
        u: toContextUnit(num(p.u, `levelModel.points[${i}].u`), lm.unit, ctx, 'levelModel'),
      }));
      fit = fitLevelModel(pts);
      if (fit.error) fail(fit.error, fit.detail);
      s0 = fit.s0; s1 = fit.s1;
      if (fit.fewLevels) warn('topdown_level_few', { value: String(fit.n) });
    } else {
      if (!lm.s0 || !lm.s1) fail('topdown_need_level', 'levelModel.s0/s1');
      if (declaredScale(lm.s0, 'levelModel.s0') !== 'absolute') fail('topdown_mixed_scale', 'levelModel.s0: unit required');
      if (declaredScale(lm.s1, 'levelModel.s1') !== 'relative') fail('topdown_mixed_scale', 'levelModel.s1: relative required');
      s0 = toContextUnit(num(lm.s0.value, 'levelModel.s0'), lm.s0.unit, ctx, 'levelModel.s0');
      s1 = num(lm.s1.value, 'levelModel.s1') / ctx.F;
    }
    if (!(s0 >= 0) || !(s1 >= 0)) fail('topdown_bad_data', 'levelModel');
    out.level = { s0, s1, x: yCtx, constant: s0, proportional: Math.abs(yCtx) * s1, u: levelUncertainty(yCtx, s0, s1), fit };
    row('s0', 'level_constant', s0);
    row('s1', 'level_proportional', out.level.proportional);
    covered.add('repeatability'); covered.add('intermediate_precision');
  }

  // ── Gibrid: asos qamramagan omillar ────────────────────
  const additional = (Array.isArray(spec.additional) ? spec.additional : []).map((a, i) => additionalComponent(a, i, ctx));
  for (const a of additional) {
    // X11: asos allaqachon qamragan omil yana qo'shilgan (ikki marta hisoblash). Hissa hisobda qoladi — qaror foydalanuvchida.
    const dup = covered.has(a.category);
    a.doubleCounted = dup;
    row(a.id, 'additional', a.u, { name: a.name, category: a.category, ...(dup ? { flag: 'X11' } : {}) });
    if (dup) warn('x11_double_counting', { value: `${a.name || a.id}: ${a.category}` });
  }

  // ── Yig'indi ────────────────────────────────────────────
  // Ref: Nordtest TR 537 ed. 4 §3.2, 5-qadam (p. 10): u_c = √(u(R_w)² + u(bias)²); QUAM:2012 §8.2.2 — kvadratlar yig'indisi
  const uc = rss(budget.filter(b => b.included).map(b => b.u));
  const uc2 = uc * uc;
  budget.forEach(b => { b.variance = b.u * b.u; b.share = b.included && uc2 > 0 ? 100 * b.variance / uc2 : 0; });
  const U = k * uc;
  if (!(uc > 0)) warn('zero_u');

  // ── ν_eff (faqat ma'lumot uchun: k avtomatik O'ZGARMAYDI — egasi qarori 2026-11-17) ──
  // Ref: JCGM 100:2008 G.4.1 Eq. (G.2b): ν_eff = u_c⁴ / Σ(u_i⁴/ν_i). ν(R_w) = n − 1 (dublikatlar — juftliklar soni);
  // ν(bias) — CRM / PT / recovery soni bo'yicha (N − 1; bitta CRM — o'lchashlar soni − 1); ν berilmagan hissalar — ∞ (G.4.2).
  const denom = budget.filter(b => b.included && isFinite(b.nu) && b.nu > 0).reduce((a, b) => a + (b.u ** 4) / b.nu, 0);
  const nuEff = denom > 0 ? (uc ** 4) / denom : Infinity;
  const P = has(settings.P) ? num(settings.P, 'settings.P') : 0.9545;
  let kSuggested = null;
  if (nuEff < NU_EFF_WARN_BELOW) {
    // Ref: JCGM 100:2008 G.3.2, G.4.1 Note 1 — k_p = t_p(⌊ν_eff⌋) (egasi qarori: floor)
    kSuggested = coverage(P, nuEff, 'floor').k;
    warn('topdown_nu_low', { value: `ν_eff = ${nuEff.toFixed(1)}; t(${Math.max(1, Math.floor(nuEff))}) = ${kSuggested.toFixed(2)}` });
  }

  // Mutlaq va nisbiy ko'rinish (aralashtirilmaydi: o'tkazish faqat o'lchangan qiymat y orqali)
  let relUc = null, relU = null, absUc = null, absU = null;
  if (ctx.relative) {
    relUc = 100 * uc / ctx.F; relU = 100 * U / ctx.F;
    if (yUsed !== null) { absUc = Math.abs(yUsed) * uc / ctx.F; absU = Math.abs(yUsed) * U / ctx.F; }
  } else {
    absUc = uc; absU = U;
    if (yUsed !== null && yUsed !== 0) { relUc = 100 * uc / Math.abs(yUsed); relU = 100 * U / Math.abs(yUsed); }
  }

  return {
    engineVersion: ENGINE_VERSION,
    mode: 'TOP_DOWN',
    format: TOPDOWN_FORMAT,
    approach, approachRef: APPROACH_REF[approach],
    hybrid: additional.length > 0,
    isEmpiricalMeasurand: empirical,
    scale: ctx.relative ? 'relative' : 'absolute',
    unit: ctx.unit,                          // uc va U birligi ('%', '1' yoki mutlaq birlik)
    relativeUnit: ctx.F === 100 ? '%' : '1',
    y, yUnit, yCorrected: approach === 'QUAM_RECOVERY' && out.recovery.included && out.recovery.correction === 'applied' ? yUsed : null,
    uc, uc2, k, U,
    kBasis: has(settings.k) ? 'given' : 'default',
    nuEff, kSuggested, P,                    // ν_eff — ma'lumot uchun; kSuggested = t_P(⌊ν_eff⌋) (ν_eff < 30 bo'lsa), k o'zgarmaydi
    relUc, relU,                             // har doim foizda (y kerak bo'lsa va berilmagan bo'lsa — null)
    absUc, absU,                             // mutlaq (nisbiy baholashda y berilgan bo'lsa); birlik: absUnit
    absUnit: ctx.relative ? yUnit : ctx.unit,
    rw: out.rw, bias: out.bias, recovery: out.recovery, reproducibility: out.reproducibility, level: out.level,
    additional, covers: [...covered],
    budget,
    roundUp: settings.rounding === 'up',
    warnings,
  };
}

/**
 * Top-down baholash.
 * @param {object} spec  format 'uc-topdown/1' (docs/ENGINE_API.md §8)
 * @returns {object} natija yoki { error: code, detail }
 */
export function evaluateTopDown(spec) {
  try { return evaluateCore(spec); } catch (e) {
    if (e instanceof TopDownError) return { error: e.code, detail: e.detail };
    throw e;
  }
}

export { evaluateRw, duplicateSd, RW_TYPES, DUPLICATE_RELATIVE_METHODS } from './rw.js';
export { evaluateBias, BIAS_TYPES, ROBUST_SD_FACTOR, MIN_PT_ROUNDS } from './bias.js';
export { evaluateRecovery, RECOVERY_CORRECTIONS } from './recovery.js';
export { evaluateReproducibility, LIMIT_FACTOR } from './reproducibility.js';
export { levelUncertainty, fitLevelModel } from './level.js';
export { makeContext, TopDownError } from './scale.js';
