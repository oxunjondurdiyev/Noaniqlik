/* X9 — hisobotdagi yozuv: U ikki qiymatli raqamdan ko'p bilan berilgan yoki y va U ning o'nlik xonalari mos emas.
   Bu qoida HISOBOT QATLAMI satrlarini tekshiradi (ctx.reported = { y, U } — chop etiladigan matn); dvigatel natijasi
   yaxlitlanmaydi (CLAUDE.md). Hisobot qatlami o'zi yaxlitlagan satrlarni chop etishdan oldin shu qoidadan o'tkazadi
   (o'z-o'zini tekshirish); eski versiyada saqlangan `resultText` ("1.235 ± 0.100") ham shu bilan aniqlanadi.
   Ref: JCGM 100:2008 7.2.6 — "It usually suffices to quote u_c(y) and U to at most two significant digits …
   Output and input estimates should be rounded to be consistent with their uncertainties"; ILAC P14 §5 — repoda yo'q. */
import { finding, THRESHOLDS } from '../util.js';

const clean = s => String(s).trim().replace(/[\s ]/g, '').replace(',', '.').replace(/^[+\-−±]/, '');

/** Qiymatli raqamlar soni: "0.10" → 2, "0.100" → 3, "12" → 2, "120" → 2 (butun sonda oxirgi nollar hisoblanmaydi), "1.2e-3" → 2. */
export function significantDigits(text) {
  const s = clean(text).replace(/e[+\-]?\d+$/i, '');
  if (!/^\d*\.?\d*$/.test(s) || !/\d/.test(s)) return NaN;
  const [int, frac] = s.split('.');
  if (frac === undefined) return int.replace(/^0+/, '').replace(/0+$/, '').length || 1;
  const digits = (int + frac).replace(/^0+/, '');
  return digits.length || 1;
}

/** O'nlik xonalar soni: "0.10" → 2, "12" → 0. */
export function decimalPlaces(text) {
  const s = clean(text).replace(/e[+\-]?\d+$/i, '');
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

const rule = {
  id: 'X9',
  severity: 'warning',
  ref: 'JCGM 100:2008 7.2.6; ILAC P14:09/2020 §5 (unverified)',
  modes: ['GUM', 'REGRESSION', 'TOP_DOWN', 'SAMPLING', 'QUALITATIVE', 'MICRO', 'MEDICAL'],
  codes: { x9_too_many_digits: {}, x9_decimals_mismatch: {} },
  check(spec, result, ctx) {
    const rep = ctx && ctx.reported;
    if (!rep || rep.U === undefined || rep.U === null || rep.U === '') return [];
    const out = [];
    const sig = significantDigits(rep.U);
    if (sig > THRESHOLDS.maxReportedDigits) out.push(finding(rule, 'x9_too_many_digits', { value: `U = ${rep.U} (${sig})` }));
    if (rep.y !== undefined && rep.y !== null && rep.y !== '' && decimalPlaces(rep.y) !== decimalPlaces(rep.U)) {
      out.push(finding(rule, 'x9_decimals_mismatch', { value: `${rep.y} ± ${rep.U}` }));
    }
    return out;
  },
};
export default rule;
