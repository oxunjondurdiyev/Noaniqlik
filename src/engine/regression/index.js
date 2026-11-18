/* ═══════════════════════════════════════════════════════════════
   REGRESSION/INDEX.JS — REGRESSION rejimi: kalibrlash egri chizig'i (P08).
   Kirish formati: 'uc-regression/1' (docs/ENGINE_API.md §7). evaluate() shu formatni
   evaluateRegression() ga uzatadi; 'uc-model/1' va 'calc-state/v2' yo'li o'zgarmagan.
   Sof modul (brauzer obyektlari yo'q). Natija YAXLITLANMAYDI (yaxlitlash — src/report/).
═══════════════════════════════════════════════════════════════ */
import { ENGINE_VERSION } from '../version.js';
import { isBlank, toNum } from '../util.js';
import { DEFAULT_NU_RULE } from '../coverage.js';
import { fitPolynomial } from './fit.js';
import { fitWtls } from './wtls.js';
import { chi2Cdf, chi2Quantile } from './chi2.js';
import { predict, inversePredict } from './predict.js';
import { uRangeFunction } from './urange.js';

export const REGRESSION_FORMAT = 'uc-regression/1';
export const REGRESSION_METHODS = ['OLS', 'WLS', 'WTLS', 'GLS'];
export const PARAM_NAMES = ['a', 'b', 'c', 'd'];

/* Ogohlantirishlar: { code, severity, ref } — P05 da linter qoidalariga ko'chiriladi. */
export const REGRESSION_WARNINGS = {
  regression_chi2_fail: { severity: 'warning', ref: 'χ² testi (P = 0,95), ν = m − n; ISO/TS 28037:2010 §6.3 (repoda yo\'q, tekshirilmagan); kvantil — Abramowitz & Stegun 26.4' },
  regression_chi2_na: { severity: 'info', ref: 'JCGM 100:2008 H.3.2 Eq. (H.13f) — s² qoldiqlardan; H.3.3 — rasmiy test ko\'rilmagan' },
  regression_posterior_scale: { severity: 'info', ref: 'EURACHEM/CITAC QUAM:2012 E.4.3 Eq. (E3.4) — S² = Σw(y − y_f)²/(n − 2)' },
  regression_slope_weak: { severity: 'warning', ref: 'JCGM 100:2008 H.3.3 (qiyalik o\'z standart noaniqligidan 3 baravardan katta bo\'lishi)' },
  regression_extrapolation: { severity: 'warning', ref: 'JCGM 100:2008 H.3.4 (kalibrlangan diapazondan tashqarida bashorat)' },
  regression_ux_ignored: { severity: 'warning', ref: 'EURACHEM/CITAC QUAM:2012 E.4.4 Eq. (E3.7), E.4.8' },
  regression_uy_unequal: { severity: 'warning', ref: 'EURACHEM/CITAC QUAM:2012 E.4.1 (weighted or un-weighted least squares)' },
  regression_method_unverified: { severity: 'info', ref: 'CLAUDE.md — manba docs/references/ da yo\'q (York et al. 2004; Aitken 1935; ISO/TS 28037 pullik)' },
  regression_inverse_failed: { severity: 'warning', ref: 'EURACHEM/CITAC QUAM:2012 E.4.3 Eq. (E3.3)' },
  urange_unverified: { severity: 'info', ref: 'ILAC P14:09/2020 — PDF repoda yo\'q (tekshirilmagan)' },
  urange_shifted: { severity: 'info', ref: 'loyiha qoidasi: U(X_j) ≥ U_j (ILAC P14:09/2020 — tekshirilmagan)' },
};

function num(v) { return isBlank(v) ? NaN : toNum(v); }

/**
 * Regressiya baholashi.
 * @param {object} spec  { format:'uc-regression/1', model:{degree, xRef}, method, points[], covY?, settings?, predict?, inverse?, uRange? }
 * @returns {object} natija (docs/ENGINE_API.md §7) yoki { error: code, detail }
 */
export function evaluateRegression(spec) {
  if (!spec || typeof spec !== 'object') return { error: 'bad_spec' };
  const model = spec.model || {};
  const settings = spec.settings || {};
  const method = String(spec.method || 'OLS').toUpperCase();
  if (!REGRESSION_METHODS.includes(method)) return { error: 'regression_bad_method', detail: String(spec.method) };
  const degree = model.degree === undefined || model.degree === null ? 1 : Number(model.degree);
  if (![1, 2, 3].includes(degree)) return { error: 'regression_bad_degree', detail: String(model.degree) };
  if (method === 'WTLS' && degree !== 1) return { error: 'regression_bad_method', detail: 'WTLS: degree = 1' };
  const xRef = isBlank(model.xRef) ? 0 : num(model.xRef);
  if (!isFinite(xRef)) return { error: 'regression_bad_data', detail: 'xRef' };

  const pts = Array.isArray(spec.points) ? spec.points : [];
  const m = pts.length, nParam = degree + 1;
  const x = [], y = [], ux = [], uy = [];
  for (let i = 0; i < m; i++) {
    const p = pts[i] || {};
    x.push(num(p.x)); y.push(num(p.y));
    ux.push(isBlank(p.ux) ? null : num(p.ux));
    uy.push(isBlank(p.uy) ? null : num(p.uy));
    if (!isFinite(x[i]) || !isFinite(y[i])) return { error: 'regression_bad_data', detail: String(i + 1) };
    if ((ux[i] !== null && !(ux[i] >= 0)) || (uy[i] !== null && !(uy[i] >= 0))) return { error: 'regression_bad_data', detail: String(i + 1) };
  }
  // Ref: JCGM 100:2008 H.3.2 — ν = n − 2 ≥ 1 bo'lishi kerak (s² aniqlanishi va χ² testi uchun)
  if (m < nParam + 1) return { error: 'regression_too_few_points', detail: `${m} < ${nParam + 1}` };
  if (new Set(x).size < nParam) return { error: 'regression_x_degenerate', detail: String(new Set(x).size) };

  const theta = x.map(v => v - xRef);
  const nu = m - nParam;
  const warnings = [];
  const warn = (code, extra) => warnings.push({ code, ...REGRESSION_WARNINGS[code], ...(extra || {}) });

  // ── Moslash ─────────────────────────────────────────────
  let fit, priorAvailable = true, unweighted = false, commonUy = null;
  if (method === 'OLS') {
    // Teng vaznlar. Umumiy u(y) ma'lum bo'lsa (settings.uy yoki barcha u(y_i) bir xil) — aprior asos mumkin.
    const given = uy.filter(v => v !== null);
    if (!isBlank(settings.uy)) commonUy = num(settings.uy);
    else if (given.length === m && given.every(v => v === given[0])) commonUy = given[0];
    else if (given.length) warn('regression_uy_unequal');
    if (commonUy !== null && !(commonUy > 0)) return { error: 'regression_zero_u', detail: 'uy' };
    fit = fitPolynomial(theta, y, degree);
    unweighted = true;
    if (!fit.error && commonUy !== null) {
      // cov(p) = u²(y)·(AᵀA)⁻¹; χ² = Σ qoldiq²/u²(y)
      const v = commonUy * commonUy;
      fit.cov0 = fit.cov0.map(r => r.map(c => c * v));
      fit.weighted = fit.residuals.map(r => r / commonUy);
      fit.chi2 = fit.chi2 / v;
    } else priorAvailable = false;
  } else if (method === 'WLS') {
    const bad = uy.findIndex(v => v === null || !(v > 0) || !isFinite(v));
    if (bad >= 0) return { error: 'regression_zero_u', detail: String(bad + 1) };
    fit = fitPolynomial(theta, y, degree, { uy });
  } else if (method === 'GLS') {
    const V = spec.covY;
    if (!Array.isArray(V) || V.length !== m || V.some(r => !Array.isArray(r) || r.length !== m)) return { error: 'regression_bad_covariance', detail: 'size' };
    const Vn = V.map(r => r.map(Number));
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) {
      if (!isFinite(Vn[i][j]) || Math.abs(Vn[i][j] - Vn[j][i]) > 1e-12 * Math.max(Math.abs(Vn[i][j]), Math.abs(Vn[j][i]))) return { error: 'regression_bad_covariance', detail: `${i + 1},${j + 1}` };
    }
    if (Vn.some((r, i) => !(r[i] > 0))) return { error: 'regression_zero_u', detail: String(Vn.findIndex((r, i) => !(r[i] > 0)) + 1) };
    fit = fitPolynomial(theta, y, degree, { covY: Vn });
  } else {
    const sx = ux.map(v => v === null ? 0 : v), sy = uy.map(v => v === null ? 0 : v);
    const bad = sx.findIndex((v, i) => !(v > 0) && !(sy[i] > 0));
    if (bad >= 0) return { error: 'regression_zero_u', detail: String(bad + 1) };
    fit = fitWtls(theta, y, sx, sy);
  }
  if (fit.error) return { error: fit.error, detail: fit.detail };
  if (method !== 'WTLS' && ux.some(v => v !== null && v > 0)) warn('regression_ux_ignored');
  if (method === 'WTLS' || method === 'GLS') warn('regression_method_unverified', { value: method });

  // ── Kovariatsiya asosi ──────────────────────────────────
  // 'prior'     — kiritilgan u(y_i) (u(x_i)) dan: cov(p) = (AᵀV⁻¹A)⁻¹, χ² testi qo'llanadi;
  // 'posterior' — qoldiqlardan: cov(p) = s²·(AᵀV⁻¹A)⁻¹, s² = χ²/ν.
  //   Ref: JCGM 100:2008 H.3.2 Eq. (H.13c), (H.13d), (H.13f); QUAM:2012 Eq. (E3.4).
  let basisMode = settings.sigma === 'prior' || settings.sigma === 'posterior' ? settings.sigma : (priorAvailable ? 'prior' : 'posterior');
  if (basisMode === 'prior' && !priorAvailable) return { error: 'regression_need_uy', detail: 'sigma: prior' };
  const s2 = fit.chi2 / nu;
  const cov = basisMode === 'posterior' ? fit.cov0.map(r => r.map(c => c * s2)) : fit.cov0.map(r => r.slice());
  if (basisMode === 'posterior' && priorAvailable) warn('regression_posterior_scale');

  // ── χ² testi ────────────────────────────────────────────
  // H0: model va kiritilgan noaniqliklar ma'lumotlarga mos; χ²_obs ≤ χ²_P(ν) bo'lsa rad etilmaydi.
  const chi2P = Number(settings.chi2P) > 0 && Number(settings.chi2P) < 1 ? Number(settings.chi2P) : 0.95;
  let chi2;
  if (priorAvailable) {
    const crit = chi2Quantile(chi2P, nu);
    chi2 = { applicable: true, obs: fit.chi2, nu, P: chi2P, crit, pValue: 1 - chi2Cdf(fit.chi2, nu), pass: fit.chi2 <= crit };
    if (!chi2.pass) warn('regression_chi2_fail', { value: `${fit.chi2.toPrecision(4)} > ${crit.toPrecision(4)} (ν = ${nu})` });
  } else {
    chi2 = { applicable: false, obs: null, nu, P: chi2P, crit: null, pValue: null, pass: null };
    warn('regression_chi2_na');
  }

  const u = cov.map((r, i) => Math.sqrt(Math.max(r[i], 0)));
  const corr = cov.map((r, i) => r.map((c, j) => (u[i] > 0 && u[j] > 0 ? c / (u[i] * u[j]) : (i === j ? 1 : 0))));
  if (Math.abs(fit.p[1]) < 3 * u[1] && degree === 1) warn('regression_slope_weak', { value: (Math.abs(fit.p[1]) / u[1]).toPrecision(3) });

  const core = {
    p: fit.p, cov, degree, xRef, basis: basisMode, unweighted, commonUy, s2,
    nu: basisMode === 'posterior' ? nu : Infinity,
    xRange: [Math.min(...x), Math.max(...x)],
  };
  const opt = { P: settings.P, nuRule: settings.nuRule || DEFAULT_NU_RULE };

  // ── Bashoratlar ─────────────────────────────────────────
  const predictions = (spec.predict || []).map(q => predict(core, num(typeof q === 'object' && q !== null ? q.x : q), opt));
  const inverse = (spec.inverse || []).map(q => inversePredict(core, q || {}, opt));
  if ([...predictions, ...inverse].some(r => r.extrapolated)) warn('regression_extrapolation');
  inverse.forEach((r, i) => { if (r.error) warn('regression_inverse_failed', { value: `${i + 1}: ${r.error}` }); });

  // ── U — diapazon (ixtiyoriy) ────────────────────────────
  let uRange = null;
  if (spec.uRange) {
    uRange = uRangeFunction(spec.uRange.points, spec.uRange.mode);
    if (!uRange.error) {
      warn('urange_unverified');
      if (uRange.shift > 0) warn('urange_shifted', { value: uRange.shift.toPrecision(3) });
    }
  }

  return {
    engineVersion: ENGINE_VERSION,
    mode: 'REGRESSION',
    format: REGRESSION_FORMAT,
    method, degree, xRef, m, nParam, nu,
    params: fit.p.map((v, j) => ({ name: PARAM_NAMES[j], value: v, u: u[j] })),
    covariance: cov, correlation: corr,
    covarianceBasis: basisMode,
    fitted: fit.fitted, residuals: fit.residuals, weightedResiduals: fit.weighted,
    ssr: fit.residuals.reduce((s, v) => s + v * v, 0),
    // s: OLS (vaznsiz) — qoldiq standart og'ishi (y birligida, H.13f); vaznli — √(χ²/ν) (o'lchamsiz)
    s: Math.sqrt(unweighted && commonUy !== null ? fit.chi2 * commonUy * commonUy / nu : s2),
    sKind: unweighted ? 'y' : 'relative',
    chi2,
    xRange: core.xRange,
    points: x.map((v, i) => ({ x: v, ux: ux[i], y: y[i], uy: uy[i] })),
    wtls: method === 'WTLS' ? { iterations: fit.iterations, adjustedX: fit.adjusted.map(t => t + xRef) } : null,
    predictions, inverse, uRange,
    P: Number(settings.P) || 0.9545, nuRule: opt.nuRule,
    units: { x: (spec.units || {}).x || '', y: (spec.units || {}).y || '' },
    warnings,
  };
}

export { fitPolynomial, basis } from './fit.js';
export { fitWtls } from './wtls.js';
export { chi2Cdf, chi2Quantile, gammaP } from './chi2.js';
export { predict, inversePredict } from './predict.js';
export { uRangeFunction, uRangeAt, URANGE_MODES } from './urange.js';
