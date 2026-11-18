/* ═══════════════════════════════════════════════════════════════
   QUALITATIVE/INDEX.JS — sifatli (binar) testlar: 2×2 jadval (P10-D).
   Kirish formati: 'uc-qualitative/1' (docs/ENGINE_API.md §9).
   Ref: EURACHEM/CITAC AQA:2021 §3.2–3.3 (TP, FP, TN, FN ulushlari), §4.2 (LR), §4.3 Eq. (6) (posterior ehtimol),
        §4.4 Eq. (8)–(11) (Wilson score 95 % CI), Example E3 (p. 28), Example 7.6 / Table E6.1–E6.2 (p. 36).
   Ishonch intervali usuli (egasi qarori 2026-11-18, RISKS R-21): standart — Wilson score (AQA:2021 §4.4, Eq. 8–9);
   Clopper–Pearson (aniq binomial) — laboratoriya sozlamasi (`settings.ciMethod`), loyiha qo'shimchasi. AQA bir nechta
   modelni tan oladi ([48]–[54]) va Wilson ni soddaligi uchun tanlagan. Hisobotga faqat tanlangan usul chiqadi;
   natijada ikkalasi ham saqlanadi (UI ning batafsil ko'rinishida solishtirish uchun).
   Clopper–Pearson tekshiruvi: mustaqil ochiq dastur — SciPy 1.18.1, scipy.stats.binomtest(x, n).proportion_ci(method='exact').
   Sof modul (brauzer obyektlari yo'q). Natija YAXLITLANMAYDI.
═══════════════════════════════════════════════════════════════ */
import { ENGINE_VERSION } from '../version.js';
import { isBlank, toNum } from '../util.js';
import { normalQuantile, ibeta } from '../special.js';

export const QUALITATIVE_FORMAT = 'uc-qualitative/1';
/** Ishonch intervali usullari; standart — Wilson (egasi qarori 2026-11-18). */
export const CI_METHODS = ['wilson', 'clopper_pearson'];
export const DEFAULT_CI_METHOD = 'wilson';
const CI_FIELD = { wilson: 'wilson', clopper_pearson: 'clopperPearson' };

export const QUALITATIVE_WARNINGS = {
  qualitative_zero_false: { severity: 'warning', ref: 'EURACHEM/CITAC AQA:2021 Example E3 (p. 28): kuzatilgan nol ulush haqiqiy nol degani emas; §4.4 Table 4' },
  qualitative_prevalence_study: { severity: 'info', ref: 'EURACHEM/CITAC AQA:2021 §4.3 (p. 17): PP va PN tarqalganlikka (prevalence) bog\'liq' },
  qualitative_small_n: { severity: 'warning', ref: 'EURACHEM/CITAC AQA:2021 §4.4 (pp. 17–18): 5 ta holatda SS = 100 % uchun 95 % CI 57 %…100 %' },
  qualitative_cp_project_addition: { severity: 'info', ref: 'Clopper & Pearson, Biometrika 26 (1934) 404 — loyiha qo\'shimchasi (laboratoriya sozlamasi); AQA:2021 §4.4 Wilson intervalini qo\'llaydi; qiymatlar SciPy 1.18.1 bilan tekshirilgan' },
};
export const QUALITATIVE_ERRORS = ['qualitative_bad_spec', 'qualitative_bad_data', 'qualitative_no_positive_cases', 'qualitative_no_negative_cases'];
/** Kichik tanlanma chegarasi (loyiha parametri): musbat yoki manfiy holatlar soni shundan kam bo'lsa ogohlantirish. */
export const SMALL_N = 30;

/**
 * Wilson score intervali.
 * Ref: EURACHEM/CITAC AQA:2021 §4.4 Eq. (8)–(11) (pp. 18–19); [54] Wilson (1927).
 *      Tekshiruv: 100/100 → [96,3; 100] %, 97/100 → [91,6; 99,0] % (Table E6.2, p. 36); 400/400 → 99 %; 5/5 → 57 % (p. 18).
 */
export function wilsonInterval(x, n, P = 0.95) {
  if (!(n > 0)) return { low: NaN, high: NaN };
  const z = normalQuantile((1 + P) / 2), z2 = z * z, p = x / n;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / (1 + z2 / n);
  return { low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

/** Beta taqsimot kvantili (I_x(a, b) = p) — bisektsiya. */
function betaQuantile(p, a, b) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (ibeta(a, b, mid) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/**
 * Clopper–Pearson (aniq binomial) intervali: quyi = B⁻¹(α/2; x, n − x + 1), yuqori = B⁻¹(1 − α/2; x + 1, n − x).
 * Ref: Clopper & Pearson, Biometrika 26 (1934) 404. Tekshiruv: SciPy 1.18.1 binomtest(…).proportion_ci(method='exact')
 *      (7/20 → [0,153909; 0,592189]; 97/100 → [0,914824; 0,993770]); x = n da quyi chegara (α/2)^(1/n).
 */
export function clopperPearsonInterval(x, n, P = 0.95) {
  if (!(n > 0)) return { low: NaN, high: NaN };
  const a = (1 - P) / 2;
  return { low: x === 0 ? 0 : betaQuantile(a, x, n - x + 1), high: x === n ? 1 : betaQuantile(1 - a, x + 1, n - x) };
}

/**
 * Posterior ehtimol (Bayes): PP = O·LR / (O·LR + 1), O = P(+)/(1 − P(+)), LR(+) = TP/FP.
 * Ref: EURACHEM/CITAC AQA:2021 §4.3 Eq. (6) (p. 17); Example E3 Eq. (E3.1) (p. 28): metadon → 0,988.
 */
export function posterior(prior, lr) {
  if (!(prior > 0 && prior < 1)) return NaN;
  if (!isFinite(lr)) return 1;
  const o = prior / (1 - prior) * lr;
  return o / (o + 1);
}

const count = (v, where) => {
  const n = toNum(v);
  if (!Number.isInteger(n) || n < 0) throw Object.assign(new Error('qualitative_bad_data'), { code: 'qualitative_bad_data', detail: where });
  return n;
};

function rate(x, n, P, method) {
  const r = { x, n, value: x / n, wilson: wilsonInterval(x, n, P), clopperPearson: clopperPearsonInterval(x, n, P) };
  r.ci = r[CI_FIELD[method]];          // hisobotga chiqadigan (tanlangan) interval
  return r;
}

/**
 * @param {object} spec { format:'uc-qualitative/1', table:{tp, fn, fp, tn}, prevalence?:number (0…1), settings?:{P=0.95} }
 *                      yoki rates:{fp, fn} + prevalence (jadvalsiz — AQA Example E3)
 */
export function evaluateQualitative(spec) {
  if (!spec || typeof spec !== 'object') return { error: 'qualitative_bad_spec' };
  const P = spec.settings && !isBlank(spec.settings.P) ? toNum(spec.settings.P) : 0.95;
  if (!(P > 0 && P < 1)) return { error: 'qualitative_bad_data', detail: 'settings.P' };
  const ciMethod = spec.settings && !isBlank(spec.settings.ciMethod) ? spec.settings.ciMethod : DEFAULT_CI_METHOD;
  if (!CI_METHODS.includes(ciMethod)) return { error: 'qualitative_bad_data', detail: 'settings.ciMethod' };
  const warnings = [];
  const warn = (code, extra) => warnings.push({ code, ...QUALITATIVE_WARNINGS[code], ...(extra || {}) });
  let prev = null;
  if (!isBlank(spec.prevalence)) {
    prev = toNum(spec.prevalence);
    if (!(prev > 0 && prev < 1)) return { error: 'qualitative_bad_data', detail: 'prevalence' };
  }
  let table = null, ss, sp, fnr, fpr, counts = null;
  try {
    if (spec.table) {
      const t = spec.table;
      table = { tp: count(t.tp, 'tp'), fn: count(t.fn, 'fn'), fp: count(t.fp, 'fp'), tn: count(t.tn, 'tn') };
      const pc = table.tp + table.fn, nc = table.fp + table.tn;
      if (pc === 0) return { error: 'qualitative_no_positive_cases' };
      if (nc === 0) return { error: 'qualitative_no_negative_cases' };
      // Ref: AQA:2021 §3.2 Table 2 (p. 8): TP (SS) = tp/(tp + fn); TN (SP) = tn/(tn + fp); FP = 1 − TN; FN = 1 − TP
      ss = rate(table.tp, pc, P, ciMethod); sp = rate(table.tn, nc, P, ciMethod);
      fnr = rate(table.fn, pc, P, ciMethod); fpr = rate(table.fp, nc, P, ciMethod);
      counts = { positiveCases: pc, negativeCases: nc, positiveResults: table.tp + table.fp, negativeResults: table.fn + table.tn, total: pc + nc };
      if (Math.min(pc, nc) < SMALL_N) warn('qualitative_small_n', { value: `${pc} / ${nc}` });
      if (ciMethod === 'clopper_pearson') warn('qualitative_cp_project_addition');
    } else if (spec.rates) {
      const f = toNum(spec.rates.fp), g = toNum(spec.rates.fn);
      if (!(f >= 0 && f <= 1) || !(g >= 0 && g <= 1)) return { error: 'qualitative_bad_data', detail: 'rates' };
      fpr = { value: f }; fnr = { value: g }; ss = { value: 1 - g }; sp = { value: 1 - f };
    } else return { error: 'qualitative_bad_spec', detail: 'table' };
  } catch (e) {
    if (e.code) return { error: e.code, detail: e.detail };
    throw e;
  }
  if (fpr.value === 0 || fnr.value === 0) warn('qualitative_zero_false', { value: [fpr.value === 0 ? 'FP' : '', fnr.value === 0 ? 'FN' : ''].filter(Boolean).join(', ') });

  // Ref: AQA:2021 §4.2 (pp. 15–16): LR(+) = TP/FP; LR(−) = FN/TN
  const lrPos = fpr.value > 0 ? ss.value / fpr.value : Infinity;
  const lrNeg = sp.value > 0 ? fnr.value / sp.value : Infinity;
  // Tadqiqot jadvalidan PPV / NPV — faqat tadqiqotdagi tarqalganlik uchun to'g'ri
  let ppvStudy = null, npvStudy = null, studyPrevalence = null;
  if (table) {
    const pr = table.tp + table.fp, nr = table.fn + table.tn;
    ppvStudy = pr > 0 ? rate(table.tp, pr, P, ciMethod) : null;
    npvStudy = nr > 0 ? rate(table.tn, nr, P, ciMethod) : null;
    studyPrevalence = counts.positiveCases / counts.total;
  }
  // Ref: AQA:2021 §4.3 Eq. (6), (7): posterior ehtimollar berilgan tarqalganlik bilan
  let pp = null, pn = null;
  if (prev !== null) {
    pp = posterior(prev, lrPos);
    pn = lrNeg === 0 ? 1 : posterior(1 - prev, 1 / lrNeg);
  } else if (table) warn('qualitative_prevalence_study', { value: (100 * studyPrevalence).toFixed(1) });

  return {
    engineVersion: ENGINE_VERSION, mode: 'QUALITATIVE', format: QUALITATIVE_FORMAT,
    approach: 'CONTINGENCY_2X2', approachRef: 'EURACHEM/CITAC AQA:2021 §3.2, §4.2–4.4',
    P, ciMethod, table, counts,
    sensitivity: ss, specificity: sp, falsePositiveRate: fpr, falseNegativeRate: fnr,
    lrPositive: lrPos, lrNegative: lrNeg,
    ppvStudy, npvStudy, studyPrevalence,
    prevalence: prev, posteriorPositive: pp, posteriorNegative: pn,
    warnings,
  };
}
