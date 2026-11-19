/* ═══════════════════════════════════════════════════════════════
   SAMPLING/INDEX.JS — namuna olish noaniqligi: dublikat usuli (P10-C).
   Kirish formati: 'uc-sampling/1' (docs/ENGINE_API.md §9). Muvozanatli dizayn:
   n ob'ekt (target) × 2 namuna × 2 tahlil.
   Ref: EURACHEM/CITAC UfS:2019 (2nd ed.) §9.4–9.5, Appendix A (Example A1, A2), Appendix C3.
     x = X_true + ε_target + ε_samp + ε_anal;  s_meas² = s_samp² + s_anal²           Eq. 1–2 (§9.5.2)
     U' = 2·100·s_meas / x̄  (%)                                                       Eq. 4 (p. 20)
     ᶠU = exp(2·s_G,meas) — loge o'zgartirilgan qiymatlardan                           Eq. 5 (§9.5.3)
   Klassik ichma-ich (nested) ANOVA — yopiq formulalar. Robust ANOVA — RANOVA dasturi natijasini
   qayta tiklash (Huber, c = 1,5); dastur kodi repoda yo'q (UfS [53]) — A1 va A2 chiqishlari bilan solishtirilgan.
   Sof modul (brauzer obyektlari yo'q). Natija YAXLITLANMAYDI.
═══════════════════════════════════════════════════════════════ */
import { ENGINE_VERSION } from '../version.js';
import { isBlank, toNum } from '../util.js';
import { normalCdf } from '../special.js';
import { varianceComponent, nonNegative } from '../stats/anova.js';

export const SAMPLING_FORMAT = 'uc-sampling/1';
export const SAMPLING_METHODS = ['classical', 'robust'];
/** Ref: UfS:2019 §9.4.2 — "a minimum of eight" dublikat ob'ekt. */
export const MIN_TARGETS = 8;
/** Ref: UfS:2019 §16.2; Example A1 §8 — o'lchash dispersiyasi umumiy dispersiyaning 20 % idan oshmasligi ideal. */
export const FITNESS_VARIANCE_PCT = 20;
/** Robust ANOVA: Huber vinsorlash chegarasi c va β = E[min(z², c²)] (z ~ N(0, 1)). */
export const HUBER_C = 1.5;
const phi = z => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
export const HUBER_BETA = (2 * normalCdf(HUBER_C) - 1) - 2 * HUBER_C * phi(HUBER_C) + 2 * HUBER_C * HUBER_C * (1 - normalCdf(HUBER_C));

export const SAMPLING_WARNINGS = {
  sampling_negative_variance: { severity: 'warning', ref: 'EURACHEM/CITAC UfS:2019 §9.5.2 — dispersiya bahosi manfiy: 0 ga tenglandi' },
  sampling_few_targets: { severity: 'warning', ref: 'EURACHEM/CITAC UfS:2019 §9.4.2 — kamida 8 ta dublikat ob\'ekt' },
  sampling_fitness: { severity: 'info', ref: 'EURACHEM/CITAC UfS:2019 §16.2; Example A1 §8 — o\'lchash dispersiyasi ≤ 20 %' },
  sampling_robust_reconstructed: { severity: 'info', ref: 'EURACHEM/CITAC UfS:2019 Appendix C3, [53] RANOVA — dastur kodi repoda yo\'q; A1 va A2 chiqishlari bilan 4 qiymatli raqamgacha mos' },
  sampling_robust_no_convergence: { severity: 'warning', ref: 'EURACHEM/CITAC UfS:2019 Appendix C3' },
  sampling_bias_not_included: { severity: 'info', ref: 'EURACHEM/CITAC UfS:2019 §9.4.1; Example A1 §7 — namuna olish va tahlil bias\'i kirmaydi' },
  zero_u: { severity: 'warning', ref: 'CLAUDE.md: U = 0 bo\'lgan natija ogohlantirishsiz hisobotga chiqmaydi' },
};
export const SAMPLING_ERRORS = ['sampling_bad_spec', 'sampling_bad_data', 'sampling_too_few', 'sampling_unbalanced', 'sampling_bad_method', 'sampling_log_nonpositive', 'sampling_zero_mean'];

/**
 * Klassik ichma-ich ANOVA (muvozanatli: n × 2 × 2).
 * Ref: UfS:2019 Appendix C3; Example A1, Figure A1.2 (kvadratlar yig'indisi va standart og'ishlar).
 * @param {number[][]} d  har bir qator [S1A1, S1A2, S2A1, S2A2]
 */
export function classicalAnova(d) {
  const n = d.length;
  const sm = d.map(r => [(r[0] + r[1]) / 2, (r[2] + r[3]) / 2]);
  const tm = sm.map(s => (s[0] + s[1]) / 2);
  const mean = tm.reduce((a, b) => a + b, 0) / n;
  let ssA = 0, ssS = 0, ssT = 0;
  d.forEach((r, i) => {
    ssA += (r[0] - r[1]) ** 2 / 2 + (r[2] - r[3]) ** 2 / 2;
    ssS += 2 * ((sm[i][0] - tm[i]) ** 2 + (sm[i][1] - tm[i]) ** 2);
    ssT += 4 * (tm[i] - mean) ** 2;
  });
  const msA = ssA / (2 * n), msS = ssS / n, msT = ssT / (n - 1);
  // E[MS_anal] = σ_a²; E[MS_samp] = σ_a² + 2σ_s²; E[MS_target] = σ_a² + 2σ_s² + 4σ_t²
  // P12: umumiy yordamchi (src/engine/stats/anova.js) — amallar tartibi avvalgidek, natija bit darajasida bir xil
  const vA = msA, vS = varianceComponent(msS, msA, 2), vT = varianceComponent(msT, msS, 4);
  return { n, mean, ss: { between: ssT, sampling: ssS, analysis: ssA }, ms: { between: msT, sampling: msS, analysis: msA }, variance: { between: vT, sampling: vS, analysis: vA } };
}

/**
 * Robust ANOVA (RANOVA ni qayta tiklash): har uch darajada Huber vinsorlash (c = 1,5), iterativ.
 * Tahlil: juftlik farqi |d| ≤ c·√2·σ_a; namuna: namuna o'rtachalari farqi ≤ c·√(2σ_s² + σ_a²);
 * ob'ekt: o'rtachalar μ ± c·τ ga tortiladi, τ² = Σ(w − μ)²/(n·β); yakunda σ_t² = τ²·n/(n − 1) − σ_s²/2 − σ_a²/4.
 * Ref: UfS:2019 Appendix C3, [53]; Figure A1.2 va A2.2 (robust natijalar) — solishtirish uchun.
 */
export function robustAnova(d, start) {
  const n = d.length, c = HUBER_C, b = HUBER_BETA;
  const sm = d.map(r => [(r[0] + r[1]) / 2, (r[2] + r[3]) / 2]);
  const tm = sm.map(s => (s[0] + s[1]) / 2);
  let mu = start.mean, s3 = Math.sqrt(Math.max(start.variance.analysis, 0)), s2 = Math.sqrt(Math.max(start.variance.sampling, 0)), s1 = Math.sqrt(Math.max(start.variance.between, 0));
  let tau2 = 0, v2 = s2 * s2, v3 = s3 * s3, converged = false, it = 0;
  if (!(s3 > 0)) s3 = Number.MIN_VALUE;
  for (; it < 5000; it++) {
    let q3 = 0;
    d.forEach(r => { for (const [x, y] of [[r[0], r[1]], [r[2], r[3]]]) { const w = Math.min(Math.abs(x - y), c * s3 * Math.SQRT2); q3 += w * w / 2; } });
    v3 = q3 / (2 * n * b);
    let q2 = 0;
    sm.forEach(s => { const w = Math.min(Math.abs(s[0] - s[1]), c * Math.sqrt(2 * s2 * s2 + v3)); q2 += w * w / 2; });
    v2 = Math.max(q2 / (n * b) - v3 / 2, 0);
    const tau = Math.sqrt(s1 * s1 + v2 / 2 + v3 / 4);
    const w = tm.map(t => Math.max(mu - c * tau, Math.min(mu + c * tau, t)));
    const mu2 = w.reduce((a, x) => a + x, 0) / n;
    tau2 = w.reduce((a, x) => a + (x - mu2) ** 2, 0) / (n * b);
    const n1 = Math.sqrt(Math.max(tau2 - v2 / 2 - v3 / 4, 0));
    const delta = Math.abs(mu2 - mu) + Math.abs(n1 - s1) + Math.abs(Math.sqrt(v2) - s2) + Math.abs(Math.sqrt(v3) - s3);
    mu = mu2; s1 = n1; s2 = Math.sqrt(v2); s3 = Math.sqrt(v3);
    if (delta <= 1e-13 * Math.max(Math.abs(mu), 1)) { converged = true; break; }
  }
  const vT = tau2 * n / (n - 1) - v2 / 2 - v3 / 4;
  return { n, mean: mu, variance: { between: vT, sampling: v2, analysis: v3 }, iterations: it + 1, converged };
}

function summarise(a, k) {
  const neg = Object.entries(a.variance).filter(([, v]) => v < 0).map(([key]) => key);
  const v = { between: nonNegative(a.variance.between), sampling: nonNegative(a.variance.sampling), analysis: nonNegative(a.variance.analysis) };
  const vMeas = v.sampling + v.analysis, vTot = v.between + vMeas;
  const s = { between: Math.sqrt(v.between), sampling: Math.sqrt(v.sampling), analysis: Math.sqrt(v.analysis), measurement: Math.sqrt(vMeas), total: Math.sqrt(vTot) };
  const pct = x => (vTot > 0 ? 100 * x / vTot : 0);
  // Ref: UfS:2019 Eq. 4 (p. 20): U' = k·100·s/x̄, k = 2
  const rel = x => (a.mean !== 0 ? k * 100 * x / Math.abs(a.mean) : null);
  return {
    mean: a.mean, s, negative: neg,
    variancePct: { between: pct(v.between), sampling: pct(v.sampling), analysis: pct(v.analysis), measurement: pct(vMeas) },
    relU: { sampling: rel(s.sampling), analysis: rel(s.analysis), measurement: rel(s.measurement) },
    ...(a.ss ? { ss: a.ss } : {}), ...(a.iterations ? { iterations: a.iterations, converged: a.converged } : {}),
  };
}

/**
 * @param {object} spec { format:'uc-sampling/1', targets:[{id?, values:[S1A1,S1A2,S2A1,S2A2]}], unit?, method?:'classical'|'robust',
 *                        logTransform?:boolean, measurement?:{value}, settings?:{k=2} }
 */
export function evaluateSampling(spec) {
  if (!spec || typeof spec !== 'object') return { error: 'sampling_bad_spec' };
  const method = spec.method === undefined ? 'classical' : spec.method;
  if (!SAMPLING_METHODS.includes(method)) return { error: 'sampling_bad_method', detail: String(spec.method) };
  const settings = spec.settings || {};
  const k = isBlank(settings.k) ? 2 : toNum(settings.k);
  if (!(k > 0)) return { error: 'sampling_bad_data', detail: 'settings.k' };
  const targets = Array.isArray(spec.targets) ? spec.targets : [];
  const d = [], ids = [];
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i] || {};
    const raw = Array.isArray(t) ? t : t.values;
    if (!Array.isArray(raw) || raw.length !== 4 || raw.some(isBlank)) return { error: 'sampling_unbalanced', detail: String(t.id || i + 1) };
    const v = raw.map(toNum);
    if (v.some(x => !Number.isFinite(x))) return { error: 'sampling_bad_data', detail: String(t.id || i + 1) };
    d.push(v); ids.push(String((!Array.isArray(t) && t.id) || i + 1));
  }
  if (d.length < 2) return { error: 'sampling_too_few', detail: String(d.length) };

  const warnings = [];
  const warn = (code, extra) => warnings.push({ code, ...SAMPLING_WARNINGS[code], ...(extra || {}) });
  const cl = classicalAnova(d);
  const classical = summarise(cl, k);
  const rb = robustAnova(d, cl);
  const robust = summarise(rb, k);
  const used = method === 'robust' ? robust : classical;
  if (used.mean === 0) return { error: 'sampling_zero_mean' };
  if (d.length < MIN_TARGETS) warn('sampling_few_targets', { value: String(d.length) });
  if (used.negative.length) warn('sampling_negative_variance', { value: used.negative.join(', ') });
  if (method === 'robust') { warn('sampling_robust_reconstructed'); if (!rb.converged) warn('sampling_robust_no_convergence'); }
  if (used.variancePct.measurement > FITNESS_VARIANCE_PCT) warn('sampling_fitness', { value: used.variancePct.measurement.toFixed(1) });
  warn('sampling_bias_not_included');

  // Ref: UfS:2019 §9.5.3 Eq. 5; Example A2 §6.2, Table A2.3 — loge o'zgartirilgan qiymatlarda klassik ANOVA
  let log = null;
  if (spec.logTransform === true) {
    if (d.some(r => r.some(x => !(x > 0)))) return { error: 'sampling_log_nonpositive' };
    const lg = summarise(classicalAnova(d.map(r => r.map(Math.log))), k);
    log = {
      meanLog: lg.mean, geometricMean: Math.exp(lg.mean), sG: lg.s, negative: lg.negative,
      uncertaintyFactor: { sampling: Math.exp(k * lg.s.sampling), analysis: Math.exp(k * lg.s.analysis), measurement: Math.exp(k * lg.s.measurement) },
    };
  }

  const uc = used.s.measurement, U = k * uc;
  if (!(uc > 0)) warn('zero_u');
  let y = null, absU = null;
  if (spec.measurement && !isBlank(spec.measurement.value)) {
    y = toNum(spec.measurement.value);
    if (!Number.isFinite(y)) return { error: 'sampling_bad_data', detail: 'measurement.value' };
    // nisbiy U' har bir natijaga qo'llanadi (UfS A1 §9, Table A1.2)
    absU = Math.abs(y) * used.relU.measurement / 100;
  }
  return {
    engineVersion: ENGINE_VERSION, mode: 'SAMPLING', format: SAMPLING_FORMAT,
    approach: method === 'robust' ? 'DUPLICATE_ROBUST_ANOVA' : 'DUPLICATE_CLASSICAL_ANOVA',
    approachRef: 'EURACHEM/CITAC UfS:2019 §9.4–9.5, Appendix A',
    method, nTargets: d.length, ids, unit: spec.unit || '',
    classical, robust, mean: used.mean,
    sSamp: used.s.sampling, sAnal: used.s.analysis, sBetween: used.s.between, sTotal: used.s.total,
    uc, k, U, relU: used.relU.measurement, relUSamp: used.relU.sampling, relUAnal: used.relU.analysis,
    variancePct: used.variancePct, log, y, absU,
    roundUp: settings.rounding === 'up',
    warnings,
  };
}
