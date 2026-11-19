/* ═══════════════════════════════════════════════════════════════
   VALIDATION/INDEX.JS — usul validatsiyasi statistikasi (P12), format 'uc-validation/1' (docs/ENGINE_API.md §15).
   ISO/IEC 17025:2017 §7.2.2 (unverified — standart repoda yo'q). Sof modul, natija YAXLITLANMAYDI.
   Testlar: grubbs, cochran, anova, ttest, ftest, recovery (P09 QUAM funksiyasi), linearity (P08 regressiyasi), lod.
   QAT'IY: dastur nuqtani O'CHIRMAYDI. `excluded` — foydalanuvchi qarori: [{ index, comment ≥ 10 belgi }]; chiqarilgan
   qiymatlar natijada izohi bilan qoladi (hisobotda ko'rsatiladi). Takroriy Grubbs — faqat foydalanuvchi harakati bilan.
═══════════════════════════════════════════════════════════════ */
import { ENGINE_VERSION } from '../version.js';
import { ValidationError, fail, has, num, nums, makeFinding } from './util.js';
import { grubbsTest } from './grubbs.js';
import { cochranTest } from './cochran.js';
import { oneWayAnova } from './anova.js';
import { twoSampleT, fTest } from './tests.js';
import { lodFromBlank, lodFromCalibration, LOD_METHODS } from './lod.js';
import { evaluateRecovery } from '../topdown/recovery.js';
import { makeContext } from '../topdown/scale.js';
import { evaluateRegression } from '../regression/index.js';

export const VALIDATION_FORMAT = 'uc-validation/1';
export const VALIDATION_TESTS = Object.freeze(['grubbs', 'cochran', 'anova', 'ttest', 'ftest', 'recovery', 'linearity', 'lod']);
export const MIN_EXCLUDE_COMMENT = 10;
export const VALIDATION_ERRORS = Object.freeze(['validation_bad_spec', 'validation_bad_test', 'validation_bad_data', 'validation_too_few', 'validation_zero_sd', 'validation_unbalanced', 'validation_bad_alpha', 'validation_bad_exclusion']);

export const VALIDATION_FINDINGS = Object.freeze({
  grubbs_flagged: { severity: 'warning', ref: 'NIST/SEMATECH e-Handbook §1.3.5.17.1 — qiymat belgilandi, o\'chirilmadi' },
  grubbs_multiple: { severity: 'info', ref: 'NIST/SEMATECH e-Handbook §1.3.5.17.1 — Grubbs faqat bitta chetga chiquvchi uchun; takror test — foydalanuvchi harakati' },
  cochran_unverified: { severity: 'info', ref: 'ISO 5725-2:2019 §7.3.3 (unverified)', unverified: true },
  cochran_flagged: { severity: 'warning', ref: 'ISO 5725-2:2019 §7.3.3 (unverified)', unverified: true },
  anova_negative_component: { severity: 'info', ref: 'NIST/SEMATECH e-Handbook §2.4.4.2; loyiha qarori R-26 #2 (s_b = 0)' },
  anova_unbalanced_n0: { severity: 'info', ref: 'n₀ = (N − Σn_i²/N)/(k − 1) — manba repoda yo\'q (unverified)', unverified: true },
  lod_unverified: { severity: 'info', ref: 'Eurachem Fitness for Purpose (2014) §6.2 (unverified)', unverified: true },
  lod_calibration_unverified: { severity: 'info', ref: 'ICH Q2(R1) §6.3, §7.3 (unverified)', unverified: true },
  value_excluded: { severity: 'info', ref: 'NIST/SEMATECH e-Handbook §1.3.5.17 — chiqarish foydalanuvchi qarori, izoh bilan' },
  validation_unauthenticated: { severity: 'info', ref: 'CLAUDE.md (P11 qarori): mehmon (guest) kiritgan yozuv' },
});

/** Foydalanuvchi chiqargan qiymatlar: indeks (0 dan) + izoh (≥ 10 belgi). Qolgan qiymatlar va chiqarilganlar ro'yxati. */
export function applyExclusions(values, excluded, where) {
  const ex = [];
  for (const e of excluded || []) {
    const i = e && Number.isInteger(e.index) ? e.index : NaN;
    const comment = e && typeof e.comment === 'string' ? e.comment.trim() : '';
    if (!(i >= 0 && i < values.length)) fail('validation_bad_exclusion', `${where}: index ${e && e.index}`);
    if (comment.length < MIN_EXCLUDE_COMMENT) fail('validation_bad_exclusion', `${where}: comment < ${MIN_EXCLUDE_COMMENT}`);
    if (ex.some(x => x.index === i)) fail('validation_bad_exclusion', `${where}: duplicate ${i}`);
    ex.push({ index: i, value: values[i], comment, ...(e.role ? { role: String(e.role) } : {}), ...(e.at ? { at: String(e.at) } : {}) });
  }
  const set = new Set(ex.map(x => x.index));
  return { kept: values.filter((_, i) => !set.has(i)), keptIndex: values.map((_, i) => i).filter(i => !set.has(i)), excluded: ex };
}

function runTest(t, i, add) {
  const key = has(t.id) ? String(t.id) : `T${i + 1}`;
  const base = { id: key, type: t.type, label: has(t.label) ? String(t.label) : '' };
  switch (t.type) {
    case 'grubbs': {
      const all = nums(t.values, `${key}.values`);
      const ex = applyExclusions(all, t.excluded, key);
      const r = grubbsTest(ex.kept, { alpha: t.alpha, side: t.side });
      const flaggedIndex = ex.keptIndex[r.index];
      if (r.outlier) add('grubbs_flagged', { key, value: `${key}: x[${flaggedIndex + 1}] = ${r.value}; G = ${r.G.toPrecision(5)} > ${r.critical.toPrecision(4)}` });
      if (ex.excluded.length) add('grubbs_multiple', { key, value: `${key}: ${ex.excluded.length}` });
      return { ...base, ...r, values: all, flaggedIndex: r.outlier ? flaggedIndex : null, excluded: ex.excluded };
    }
    case 'cochran': {
      const groups = t.groups || [];
      const ex = applyExclusions(groups, t.excluded, key);
      const r = cochranTest(ex.kept, { alpha: t.alpha });
      add('cochran_unverified', { key });
      const flaggedIndex = ex.keptIndex[r.index];
      if (r.outlier) add('cochran_flagged', { key, value: `${key}: ${flaggedIndex + 1}; C = ${r.C.toPrecision(4)} > ${r.critical.toPrecision(4)}` });
      return { ...base, ...r, flaggedIndex: r.outlier ? flaggedIndex : null, excluded: ex.excluded.map(e => ({ index: e.index, comment: e.comment, role: e.role, at: e.at })) };
    }
    case 'anova': {
      const r = oneWayAnova(t.groups, { alpha: t.alpha });
      if (r.negative) add('anova_negative_component', { key, value: `${key}: s_b² = ${r.sb2.toPrecision(4)}` });
      if (r.n0Unverified) add('anova_unbalanced_n0', { key, value: `${key}: n₀ = ${r.n0.toPrecision(5)}` });
      return { ...base, ...r };
    }
    case 'ttest': return { ...base, ...twoSampleT(t.a, t.b, { alpha: t.alpha, tail: t.tail, equalVariance: t.equalVariance }) };
    case 'ftest': return { ...base, ...fTest(t.a, t.b, { alpha: t.alpha, tail: t.tail }) };
    case 'recovery': {
      // P09 (QUAM:2012 A4) funksiyasi — qayta yozilmagan. Qiymatlar foizda ('%') yoki ulushda ('1').
      const ctx = makeContext({ relative: true }, t.relativeUnit === '1' ? '1' : '%');
      const r = evaluateRecovery({ values: t.values, mean: t.mean, s: t.s, n: t.n, P: has(t.alpha) ? 1 - num(t.alpha, `${key}.alpha`) : undefined, correction: t.correction }, ctx);
      return { ...base, ...r, relativeUnit: t.relativeUnit === '1' ? '1' : '%', ref: 'EURACHEM/CITAC QUAM:2012 Example A4 (p. 66)' };
    }
    case 'linearity': {
      // P08 regressiyasi (OLS / WLS, χ²) — yangi formula yo'q
      const r = evaluateRegression({ format: 'uc-regression/1', method: t.method || 'OLS', model: { degree: t.degree || 1 }, points: t.points || [], settings: t.settings || {} });
      if (r.error) fail('validation_bad_data', `${key}: ${r.error}`);
      return { ...base, params: r.params, s: r.s, nu: r.nu, residuals: r.residuals, fitted: r.fitted, chi2: r.chi2, method: r.method, warnings: r.warnings || [], ref: 'JCGM 100:2008 H.3; EURACHEM/CITAC QUAM:2012 E.4 (P08)' };
    }
    case 'lod': {
      const method = t.method === undefined ? 'blank' : t.method;
      if (!LOD_METHODS.includes(method)) fail('validation_bad_test', `${key}.method`);
      const r = method === 'blank' ? lodFromBlank(t) : lodFromCalibration(t);
      add(method === 'blank' ? 'lod_unverified' : 'lod_calibration_unverified', { key });
      return { ...base, ...r };
    }
    default: fail('validation_bad_test', `${key}.type: ${t.type}`);
  }
  return null;
}

/**
 * @param {{format:'uc-validation/1', tests:object[], method?, quantity?, matrix?, unit?, savedBy?}} spec
 * @returns {{engineVersion, mode:'VALIDATION', format, tests:[{id,type,…}|{id,type,error,detail}], findings}}
 *          Bitta test xatosi butun baholashni to'xtatmaydi: test qatorida { error, detail }.
 */
export function evaluateValidation(spec) {
  if (!spec || !Array.isArray(spec.tests) || !spec.tests.length) return { error: 'validation_bad_spec', detail: 'tests' };
  const findings = [];
  const add = (code, extra = {}) => {
    const f = makeFinding(VALIDATION_FINDINGS, 'VAL', 'VALIDATION', code, extra);
    if (!findings.some(x => x.id === f.id)) findings.push(f);
  };
  const tests = spec.tests.map((t, i) => {
    try {
      if (!t || typeof t !== 'object') fail('validation_bad_test', String(i));
      return runTest(t, i, add);
    } catch (e) {
      if (e instanceof ValidationError || (e && e.code && /^topdown_/.test(e.code))) return { id: (t && t.id) || `T${i + 1}`, type: t && t.type, error: e.code, detail: e.detail };
      throw e;
    }
  });
  for (const t of tests) for (const x of t.excluded || []) add('value_excluded', { key: `${t.id}#${x.index}`, value: `${t.id}: ${x.index + 1} — ${x.comment}` });
  if (spec.savedBy === 'guest') add('validation_unauthenticated');
  const order = { error: 0, warning: 1, info: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);
  return {
    engineVersion: ENGINE_VERSION, mode: 'VALIDATION', format: VALIDATION_FORMAT,
    method: spec.method || '', quantity: spec.quantity || '', matrix: spec.matrix || '', unit: spec.unit || '',
    tests, errors: tests.filter(t => t.error).length, findings,
  };
}

export { grubbsTest, grubbsCriticalValue, GRUBBS_SIDES, GRUBBS_MIN_N } from './grubbs.js';
export { cochranTest, cochranCritical } from './cochran.js';
export { oneWayAnova } from './anova.js';
export { twoSampleT, fTest, TAILS } from './tests.js';
export { lodFromBlank, lodFromCalibration, LOD_METHODS, LOD_FACTOR, LOQ_FACTOR_DEFAULT, LOD_CAL_FACTOR, LOQ_CAL_FACTOR } from './lod.js';
export { DEFAULT_ALPHA } from './util.js';
export { topDownDraft } from './draft.js';
