/* ═══════════════════════════════════════════════════════════════
   LAB/MODEL.JS — P11: "Laboratoriya" oynasi uchun sof yordamchilar (DOM yo'q — Node'da test qilinadi).
   Shakl holati ↔ reestr yozuvi; QC kartasi tahlili (chegaralar, z-ballar, Westgard); CMC kattaliklari ro'yxati.
   Hisob — src/engine/lab; bu yerda faqat tayyorlash.
═══════════════════════════════════════════════════════════════ */
import {
  cleanStandard, currentCalibration, validityStatus, hasTraceabilityEvidence,
  individualsChart, xbarRChart, targetLimits, westgard, sRwFromChart, cleanCmcRow, cmcRowError,
} from '../../engine/lab/index.js';
import { parseGrid, parseNumber } from '../../io/table-text.js';

const POINT_KEYS = ['x', 'correction', 'U', 'k', 'nu'];

/** Kalibrlash nuqtalari → matn (har bir qator: X; tuzatma; U; k; ν). */
export function pointsToText(points) {
  return (points || []).map(p => POINT_KEYS.map(k => (p[k] === null || p[k] === undefined || Number.isNaN(p[k]) ? '' : String(p[k]))).join('; ').replace(/(; )+$/, '')).join('\n');
}

/** Matn → nuqtalar. Ajratuvchi: nuqta-vergul yoki tab; o'nlik vergul qabul qilinadi. @returns {{points:object[], bad:number}} */
export function textToPoints(text) {
  const points = [];
  let bad = 0;
  for (const cells of parseGrid(String(text || '').replace(/;/g, '\t'))) {
    if (!cells.some(c => String(c ?? '').trim() !== '')) continue;
    const nums = POINT_KEYS.map((_, i) => parseNumber(cells[i]));
    if (nums.some(n => Number.isNaN(n)) || !(nums[2] > 0)) { bad++; continue; }
    points.push({ x: nums[0], correction: nums[1], U: nums[2], k: nums[3], nu: nums[4] });
  }
  return { points, bad };
}

/** Tahrirlash qoralamasi: kalibrlash nuqtalari matn ko'rinishida. */
export function draftOf(std) {
  const s = cleanStandard(std || {});
  return {
    id: s.id, version: s.version, name: s.name, type: s.type, serial: s.serial, unit: s.unit,
    rangeMin: s.range.min === null ? '' : String(s.range.min), rangeMax: s.range.max === null ? '' : String(s.range.max),
    limit: s.limit === undefined ? '' : String(s.limit),
    calibrations: s.calibrations.map(c => ({ certificate: c.certificate, calibrator: c.calibrator, accreditation: c.accreditation, route: c.route, traceability: c.traceability, date: c.date, validUntil: c.validUntil, pointsText: pointsToText(c.points) })),
  };
}

export const emptyCalibration = () => ({ certificate: '', calibrator: '', accreditation: '', route: '', traceability: '', date: '', validUntil: '', pointsText: '' });

/** Qoralama → reestr yozuvi. @returns {{standard:object, bad:string[]}} bad — i18n kalitlari qo'shimchalari */
export function standardOf(draft) {
  const d = draft || {};
  const bad = [];
  if (!String(d.name || '').trim()) bad.push('name');
  const calibrations = (d.calibrations || []).map(c => {
    const { points, bad: nb } = textToPoints(c.pointsText);
    if (nb) bad.push('points');
    if (!points.length) bad.push('points');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(c.date || ''))) bad.push('date');
    return { ...c, points };
  });
  const standard = cleanStandard({ id: d.id, version: d.version, name: d.name, type: d.type, serial: d.serial, unit: d.unit, range: { min: d.rangeMin, max: d.rangeMax }, limit: d.limit, calibrations });
  return { standard, bad: [...new Set(bad)] };
}

/** Ro'yxat uchun holat: amaldagi sertifikat, muddat (bugungi sanaga nisbatan), kuzatuvchanlik dalili. */
export function standardStatus(std, today, warnDays) {
  const cal = currentCalibration(std);
  if (!cal) return { calibration: null, status: 'unknown', daysLeft: null, evidence: false };
  return { calibration: cal, ...validityStatus(cal.validUntil, today, warnDays), evidence: hasTraceabilityEvidence(cal) };
}

/**
 * QC kartasi tahlili. `opts.gate` — Westgard 1₂s darvozasi (laboratoriya sozlamasi `westgardGate`, standart true).
 * Chegaralar: `target` (belgilangan o'rtacha va s) bo'lsa — undan; aks holda kartaning o'z ma'lumotidan
 * (I–MR: MR̄/d₂; X̄–R: R̄ va A₂). Westgard qoidalari shu markaziy chiziq va σ ga nisbatan z-ballar bilan.
 * @returns {{type, series:number[], limits:object, range:object|null, z:number[], westgard:object, sRw:object, labels:string[]}|{error:string}}
 */
export function analyseQc(chart, opts = {}) {
  const c = chart || {};
  const pts = (c.points || []).filter(p => p && Array.isArray(p.values) && p.values.length);
  const type = c.type === 'xbar' ? 'xbar' : 'imr';
  const base = type === 'xbar' ? xbarRChart(pts.map(p => p.values)) : individualsChart(pts.map(p => p.values[0]));
  if (base.error) return { error: base.error };
  const series = type === 'xbar' ? base.means : base.values;
  let limits = base.x, fromTarget = false;
  if (c.target) {
    const tl = targetLimits(type === 'xbar' ? { mean: c.target.mean, s: c.target.s / Math.sqrt(base.n) } : c.target);
    if (!tl.error) { limits = tl; fromTarget = true; }
  }
  const z = series.map(v => (v - limits.center) / limits.sigma);
  const runs = pts.map(p => p.run || '');
  const wg = westgard(z, { ...(runs.some(Boolean) && runs.every(Boolean) ? { runs } : {}), gate: opts.gate !== false });
  return {
    type, series, limits, fromTarget, range: { values: type === 'xbar' ? base.ranges : base.mr, ...base.r }, outRange: base.out.r, z, westgard: wg,
    sRw: sRwFromChart(pts), labels: pts.map(p => p.date || ''), n: series.length, subgroup: type === 'xbar' ? base.n : 1,
  };
}

/** CMC jadvalidan kattaliklar ro'yxati (hisobda tanlash uchun): [{key, quantity, method, rows}] — faqat to'g'ri qatorlar. */
export function cmcQuantities(rows) {
  const by = new Map();
  for (const r of (rows || []).map(cleanCmcRow).filter(x => !cmcRowError(x) && x.quantity)) {
    const key = r.quantity + (r.method ? ' — ' + r.method : '');
    if (!by.has(key)) by.set(key, { key, quantity: r.quantity, method: r.method, rows: [] });
    by.get(key).rows.push(r);
  }
  return [...by.values()];
}

/** QC nuqtasi kiritish matni → sonlar (bo'sh joy / nuqta-vergul bilan ajratilgan). */
export function parseValues(text) {
  const cells = String(text || '').trim().split(/[\s;]+/).filter(Boolean);
  const nums = cells.map(parseNumber);
  return { values: nums.filter(n => n !== null && !Number.isNaN(n)), bad: nums.filter(n => Number.isNaN(n)).length };
}
