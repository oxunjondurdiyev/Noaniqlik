/* ═══════════════════════════════════════════════════════════════
   LAB/DRIFT.JS — etalon drifti: kalibrlash tarixidan |ΔC| yoki chiziqli trend → drift manbasi TAKLIFI (P11).
   Sof modul. Taklif hisobga AVTOMATIK QO'SHILMAYDI — foydalanuvchi tasdiqlaydi; qo'shilsa, asos (qaysi
   kalibrlashlar, qaysi usul, qaysi bo'luvchi) manba bilan birga saqlanadi va hisobotda yoziladi.

   Ref: EA-4/02 M:2022 S2.4 ("Drift of the value of the standard (δm_D)" — oxirgi kalibrlashdan beri etalon qiymatining
        drifti, chegaralari bilan to'g'ri burchakli taqsimot), S3.4; JCGM 100:2008 4.3.7 (chegaralari ±a ma'lum kattalik: u = a/√3);
        ILAC G24 / OIML D 10:2022 §3.10 (instrumental drift), §6.3 (p. 15: "instrumental drift is the mean drift
        normally over one recalibration interval").
   Loyiha qarorlari (egasi tasdig'ini kutadi — docs/RISKS.md R-25):
     • standart yarim kenglik a = |ΔC| — oxirgi ikki kalibrlash orasidagi tuzatma farqi (bitta kalibrlash oralig'idagi
       drift), taqsimot to'g'ri burchakli (bo'luvchi √3). Taqsimot sozlanadi (rect / triang / ushape / normal).
     • 'trend' usuli: a = |b|·Δt, b — tuzatmaning vaqt bo'yicha OLS og'maligi, Δt — oxirgi kalibrlashdan
       o'lchash sanasigacha (sana berilmasa — oxirgi kalibrlash oralig'i).
     • kamida 2 ta kalibrlash (shu X nuqtada tuzatmasi bilan) bo'lmasa — taklif yo'q.
═══════════════════════════════════════════════════════════════ */
import { dayNumber } from './dates.js';
import { sortedCalibrations, pointAt } from './registry.js';
import { getDivisor, getDivisorLabel, typeB } from '../typeB.js';

export const DRIFT_METHODS = Object.freeze(['last_two', 'trend']);
export const DRIFT_DISTRIBUTIONS = Object.freeze(['rect', 'triang', 'ushape', 'normal']);
export const DRIFT_DEFAULTS = Object.freeze({ method: 'last_two', distribution: 'rect', k: 2 });
export const DRIFT_MIN_CALIBRATIONS = 2;
export const DRIFT_ERRORS = Object.freeze(['drift_need_two', 'drift_bad_dates']);

/**
 * Bitta X nuqtadagi tuzatma tarixi: [{date, day, correction, certificate, U, k}] — sana bo'yicha.
 * Sanasi yoki shu nuqtada tuzatmasi yo'q (yoki diapazondan tashqari) kalibrlashlar tashlanadi.
 */
export function correctionHistory(std, x) {
  const out = [];
  for (const cal of sortedCalibrations(std)) {
    const day = dayNumber(cal.date);
    if (!Number.isFinite(day)) continue;
    const p = pointAt(cal, x);
    if (p.error || p.correction === null) continue;
    out.push({ date: cal.date, day, correction: p.correction, certificate: cal.certificate, U: p.U, k: p.k, interpolated: !!p.interpolated });
  }
  return out;
}

/** Eng kichik kvadratlar to'g'ri chizig'i y = a + b·t. Ref: JCGM 100:2008 H.3 (Eq. H.13a, H.13b — kesishma va og'malik). */
export function linearTrend(points) {
  const n = points.length;
  if (n < 2) return null;
  const tm = points.reduce((s, p) => s + p.t, 0) / n, ym = points.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0, sxy = 0;
  for (const p of points) { sxx += (p.t - tm) ** 2; sxy += (p.t - tm) * (p.y - ym); }
  if (!(sxx > 0)) return null;
  const slope = sxy / sxx, intercept = ym - slope * tm;
  let ss = 0;
  for (const p of points) ss += (p.y - intercept - slope * p.t) ** 2;
  const dof = n - 2;
  const s = dof > 0 ? Math.sqrt(ss / dof) : null;                      // qoldiq standart og'ishi (n = 2 da aniqlanmagan)
  return { slope, intercept, n, dof, s, sSlope: s === null ? null : s / Math.sqrt(sxx), tMean: tm };
}

/**
 * Drift manbasi taklifi.
 * @param {object[]} history  correctionHistory() natijasi
 * @param {{method?:string, distribution?:string, k?:number, asOf?:string}} [opts]
 * @returns {{proposal:object}|{error:string}}  proposal: { halfWidth, distribution, k, divisor, divisorLabel, u, deltaC, method, basis }
 */
export function driftProposal(history, opts = {}) {
  const h = history || [];
  if (h.length < DRIFT_MIN_CALIBRATIONS) return { error: 'drift_need_two' };
  const method = DRIFT_METHODS.includes(opts.method) ? opts.method : DRIFT_DEFAULTS.method;
  const distribution = DRIFT_DISTRIBUTIONS.includes(opts.distribution) ? opts.distribution : DRIFT_DEFAULTS.distribution;
  const k = Number(opts.k) > 0 ? Number(opts.k) : DRIFT_DEFAULTS.k;
  const last = h[h.length - 1], prev = h[h.length - 2];
  const deltaC = last.correction - prev.correction;
  const intervalDays = last.day - prev.day;
  if (!(intervalDays > 0)) return { error: 'drift_bad_dates' };

  let a, trend = null, horizonDays = intervalDays;
  if (method === 'trend') {
    trend = linearTrend(h.map(p => ({ t: p.day, y: p.correction })));
    if (!trend) return { error: 'drift_bad_dates' };
    const asOf = dayNumber(opts.asOf);
    if (Number.isFinite(asOf) && asOf > last.day) horizonDays = asOf - last.day;
    a = Math.abs(trend.slope) * horizonDays;
  } else {
    a = Math.abs(deltaC);
  }
  const divisor = getDivisor(distribution, k);
  return {
    proposal: {
      halfWidth: a, distribution, ...(distribution === 'normal' ? { k } : {}),
      divisor, divisorLabel: getDivisorLabel(distribution, k), u: typeB(a, distribution, k),
      deltaC, method,
      basis: {
        method, distribution, divisorLabel: getDivisorLabel(distribution, k),
        calibrations: (method === 'trend' ? h : [prev, last]).map(p => ({ certificate: p.certificate, date: p.date, correction: p.correction })),
        deltaC, intervalDays, horizonDays,
        ...(trend ? { slopePerDay: trend.slope, slopePerYear: trend.slope * 365.25 } : {}),
      },
    },
  };
}

/**
 * Taklifdan B tur manbasi (foydalanuvchi TASDIQLAGANDAN keyin chaqiriladi).
 * @param {object} proposal  driftProposal().proposal
 * @param {{name?:string, param?:string, unit?:string, registry?:{id:string, version:number}}} [ctx]
 */
export function driftComponent(proposal, ctx = {}) {
  return {
    name: ctx.name || 'drift', kind: 'drift', distribution: proposal.distribution, halfWidth: proposal.halfWidth,
    k: proposal.distribution === 'normal' ? proposal.k : 2, sensitivity: 1, unit: ctx.unit || '',
    ...(ctx.param ? { param: ctx.param } : {}),
    drift: { ...proposal.basis, ...(ctx.registry ? { registryId: ctx.registry.id, registryVersion: ctx.registry.version } : {}) },
  };
}
