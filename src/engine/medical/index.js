/* ═══════════════════════════════════════════════════════════════
   MEDICAL/INDEX.JS — tibbiy laboratoriya: IQC darajalari bo'yicha noaniqlik (P10-B). BETA — TEKSHIRILMAGAN.
   Kirish formati: 'uc-medical/1' (docs/ENGINE_API.md §9).
   Yondashuv ISO/TS 20914 ga tayanadi. Standart pullik va docs/references/ da yo'q — formulalar
   docs/prompts (P08-B) dagi tavsif bo'yicha; natijada har doim `medical_unverified` belgisi chiqadi.
     u(y) = √(u_cal² + u_Rw²) [+ u_bias²];  u_Rw — IQC darajasi (L1/L2/L3) bo'yicha uzoq muddatli SD (CV_Rw);
     U = k·u; nisbiy (%) va mutlaq ko'rinishda — o'tkazish har bir darajaning o'z o'rtachasi orqali.
   Har bir kattalikda `unit` yoki `relative: true` (nisbiy qiymatlar foizda); aralash — xato.
   Sof modul (brauzer obyektlari yo'q). Natija YAXLITLANMAYDI.
═══════════════════════════════════════════════════════════════ */
import { ENGINE_VERSION } from '../version.js';
import { isBlank, toNum } from '../util.js';

export const MEDICAL_FORMAT = 'uc-medical/1';

export const MEDICAL_WARNINGS = {
  medical_unverified: { severity: 'warning', ref: 'CLAUDE.md — ISO/TS 20914 pullik, docs/references/ da yo\'q: modul BETA, manba misoli bilan tasdiqlanmagan' },
  medical_no_calibrator: { severity: 'warning', ref: 'ISO/TS 20914 (repoda yo\'q — tekshirilmagan): kalibrator qiymati noaniqligi u_cal kiritilmagan' },
  medical_few_iqc: { severity: 'info', ref: 'ISO/TS 20914 (repoda yo\'q — tekshirilmagan): IQC natijalari soni kam — uzoq muddatli o\'zgaruvchanlik to\'liq qamralmagan bo\'lishi mumkin' },
  zero_u: { severity: 'warning', ref: 'CLAUDE.md: U = 0 bo\'lgan natija ogohlantirishsiz hisobotga chiqmaydi' },
};
export const MEDICAL_ERRORS = ['medical_bad_spec', 'medical_bad_data', 'medical_need_levels', 'medical_need_scale', 'medical_mixed_scale', 'medical_zero_mean', 'medical_too_few'];
/** IQC natijalari soni shundan kam bo'lsa eslatma (loyiha parametri, manba tekshirilmagan). */
export const FEW_IQC = 20;

class Fail extends Error { constructor(code, detail) { super(code); this.code = code; this.detail = detail || ''; } }
const fail = (c, d) => { throw new Fail(c, d); };

/** Kattalik {value, relative:true} (foizda) yoki {value, unit} → {abs, rel} (daraja o'rtachasi orqali). */
function quantity(q, mean, unit, where) {
  if (!q || isBlank(q.value)) return null;
  const v = toNum(q.value);
  if (!(v >= 0)) fail('medical_bad_data', where);
  const rel = q.relative === true, abs = !isBlank(q.unit);
  if (rel && abs) fail('medical_mixed_scale', where);
  if (!rel && !abs) fail('medical_need_scale', where);
  if (abs && String(q.unit).trim() !== unit) fail('medical_mixed_scale', `${where}: ${q.unit} ≠ ${unit}`);
  return rel ? { abs: Math.abs(mean) * v / 100, rel: v } : { abs: v, rel: 100 * v / Math.abs(mean) };
}

function core(spec) {
  if (!spec || typeof spec !== 'object') fail('medical_bad_spec');
  const settings = spec.settings || {};
  const k = isBlank(settings.k) ? 2 : toNum(settings.k);
  if (!(k > 0)) fail('medical_bad_data', 'settings.k');
  if (isBlank(spec.unit)) fail('medical_need_scale', 'unit');
  const unit = String(spec.unit).trim();
  const list = Array.isArray(spec.levels) ? spec.levels : [];
  if (!list.length) fail('medical_need_levels');
  const warnings = [];
  const warn = (code, extra) => warnings.push({ code, ...MEDICAL_WARNINGS[code], ...(extra || {}) });
  warn('medical_unverified');

  const levels = list.map((L, i) => {
    const where = `levels[${i}]`;
    let mean, sd, n = null;
    const vals = Array.isArray(L.values) ? L.values.filter(v => !isBlank(v)).map(toNum) : [];
    if (vals.length) {
      if (vals.some(v => !Number.isFinite(v))) fail('medical_bad_data', `${where}.values`);
      if (vals.length < 2) fail('medical_too_few', where);
      n = vals.length; mean = vals.reduce((a, b) => a + b, 0) / n;
      // Ref: JCGM 100:2008 §4.2.2 Eq. (4) — tajriba standart og'ishi
      sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1));
    } else {
      if (isBlank(L.mean)) fail('medical_bad_data', `${where}.mean`);
      mean = toNum(L.mean);
      if (!isBlank(L.cv)) { const cv = toNum(L.cv); if (!(cv >= 0)) fail('medical_bad_data', `${where}.cv`); sd = Math.abs(mean) * cv / 100; }
      else if (!isBlank(L.sd)) { sd = toNum(L.sd); if (!(sd >= 0)) fail('medical_bad_data', `${where}.sd`); }
      else fail('medical_bad_data', `${where}.cv`);
      if (!isBlank(L.n)) n = toNum(L.n);
    }
    if (!Number.isFinite(mean)) fail('medical_bad_data', `${where}.mean`);
    if (mean === 0) fail('medical_zero_mean', where);
    const id = String(L.id || `L${i + 1}`);
    if (n !== null && n < FEW_IQC) warn('medical_few_iqc', { value: `${id}: n = ${n}` });
    const uRw = { abs: sd, rel: 100 * sd / Math.abs(mean) };
    const uCal = quantity(L.uCal || spec.uCal, mean, unit, `${where}.uCal`);
    const uBias = quantity(L.uBias || spec.uBias, mean, unit, `${where}.uBias`);
    const parts = [['uRw', uRw], ['uCal', uCal], ['uBias', uBias]].filter(([, q]) => q);
    const abs = Math.sqrt(parts.reduce((a, [, q]) => a + q.abs * q.abs, 0));
    const rel = 100 * abs / Math.abs(mean);
    if (!(abs > 0)) warn('zero_u', { value: id });
    return {
      id, mean, n, sd, cv: uRw.rel, uRw, uCal, uBias,
      u: { abs, rel }, U: { abs: k * abs, rel: k * rel },
      budget: parts.map(([key, q]) => ({ id: key, abs: q.abs, rel: q.rel, share: abs > 0 ? 100 * q.abs * q.abs / (abs * abs) : 0 })),
    };
  });
  if (levels.some(L => !L.uCal)) warn('medical_no_calibrator');

  // O'lchangan natija: eng yaqin IQC darajasining NISBIY noaniqligi qo'llanadi (loyiha qoidasi — tekshirilmagan)
  let y = null, applied = null, absU = null, relU = null;
  if (spec.measurement && !isBlank(spec.measurement.value)) {
    y = toNum(spec.measurement.value);
    if (!Number.isFinite(y)) fail('medical_bad_data', 'measurement.value');
    applied = levels.reduce((best, L) => (Math.abs(L.mean - y) < Math.abs(best.mean - y) ? L : best), levels[0]);
    relU = applied.U.rel; absU = Math.abs(y) * relU / 100;
  }
  return {
    engineVersion: ENGINE_VERSION, mode: 'MEDICAL', format: MEDICAL_FORMAT,
    approach: 'IQC_LEVELS', approachRef: 'ISO/TS 20914 (tekshirilmagan — standart repoda yo\'q)', unverified: true,
    unit, k, levels, y, appliedLevel: applied ? applied.id : null, absU, relU,
    U: absU, uc: absU !== null ? absU / k : null,
    roundUp: settings.rounding === 'up',
    warnings,
  };
}

/** @param {object} spec { format:'uc-medical/1', unit, levels:[{id, values[] | (mean, cv | sd, n?), uCal?, uBias?}], uCal?, uBias?, measurement?, settings?:{k=2} } */
export function evaluateMedical(spec) {
  try { return core(spec); } catch (e) {
    if (e instanceof Fail) return { error: e.code, detail: e.detail };
    throw e;
  }
}
