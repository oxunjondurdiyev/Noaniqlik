/* ═══════════════════════════════════════════════════════════════
   LAB/INTERVAL.JS — kalibrlash intervali TAVSIYASI (P11): drift trendi bo'yicha tuzatma (xato) MPE yoki
   tolerans chegarasiga qachon yetishini bashorat qilish. Sof modul.

   Ref: ILAC G24 / OIML D 10:2022 §6.3 "Method 2: Control chart (calendar-time)" (p. 15): muhim kalibrlash nuqtalari
        tanlanadi, natijalar vaqt bo'yicha chiziladi, tarqoqlik va instrumental drift hisoblanadi, "from these figures,
        the optimum interval may be calculated"; §6.1 (p. 14) b): vosita "fails to meet prescribed limits (e.g. maximum
        permissible error …) due to drift over time". Hujjat ANIQ FORMULA BERMAYDI — quyidagi hisob loyiha qarori
        (egasi tasdig'ini kutadi, docs/RISKS.md R-25):
          C(t) = a + b·t — tuzatmalarning OLS to'g'ri chizig'i (kamida 3 ta kalibrlash);
          chegara: |C(t)| + U_oxirgi = L (includeU: true — standart, konservativ) yoki |C(t)| = L;
          t* — oxirgi kalibrlashdan keyin chegaraga yetiladigan birinchi vaqt.
   Natija FAQAT TAVSIYA: amal qilish muddatini o'zgartirmaydi; hisobotda "tavsiya" deb yoziladi.
   §6.3 Note: usul driftsiz vositalar uchun mos emas — og'malik nolga teng yoki chegaradan uzoqlashsa `never`.
   Chegara L — etalonning O'Z me'yoriy tavsifi (kartochkadagi `limit`); u noaniqlik manbai sifatida ishlatilmaydi.
═══════════════════════════════════════════════════════════════ */
import { linearTrend } from './drift.js';
import { fromDayNumber } from './dates.js';

export const INTERVAL_MIN_CALIBRATIONS = 3;
export const INTERVAL_ERRORS = Object.freeze(['interval_need_three', 'interval_bad_limit', 'interval_bad_dates']);

/**
 * @param {object[]} history  drift.js::correctionHistory() — [{date, day, correction, U}]
 * @param {{limit:number, includeU?:boolean}} opts
 * @returns {{status:'ok'|'exceeded'|'never', days?:number, date?:string, slopePerDay, slopePerYear, margin, n, recommendation:true}|{error}}
 */
export function intervalRecommendation(history, opts = {}) {
  const h = history || [];
  if (h.length < INTERVAL_MIN_CALIBRATIONS) return { error: 'interval_need_three' };
  const limit = Number(opts.limit);
  if (!(limit > 0)) return { error: 'interval_bad_limit' };
  const trend = linearTrend(h.map(p => ({ t: p.day, y: p.correction })));
  if (!trend) return { error: 'interval_bad_dates' };
  const last = h[h.length - 1];
  const includeU = opts.includeU !== false;
  const U = includeU && last.U > 0 ? last.U : 0;
  const bound = limit - U;                       // |C(t)| shu qiymatga yetganda chegara buziladi
  const base = { recommendation: true, n: h.length, slopePerDay: trend.slope, slopePerYear: trend.slope * 365.25, limit, includeU, U, lastDate: last.date, s: trend.s };
  const cLast = trend.intercept + trend.slope * last.day;      // trend chizig'ining oxirgi kalibrlash sanasidagi qiymati
  const margin = bound - Math.abs(cLast);
  if (!(bound > 0) || margin <= 0) return { ...base, status: 'exceeded', days: 0, date: last.date, margin };
  if (trend.slope === 0) return { ...base, status: 'never', margin };
  // |cLast + b·Δt| = bound: drift yo'nalishidagi chegara
  const target = trend.slope > 0 ? bound : -bound;
  const days = (target - cLast) / trend.slope;
  if (!(days > 0) || !Number.isFinite(days)) return { ...base, status: 'never', margin };
  return { ...base, status: 'ok', days, date: fromDayNumber(Math.floor(last.day + days)), margin };
}
