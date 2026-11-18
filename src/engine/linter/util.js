/* ═══════════════════════════════════════════════════════════════
   LINTER/UTIL.JS — linter qoidalari uchun umumiy yordamchilar (sof, DOM'siz).
   • Topilma (finding) tuzilmasi;
   • manba nomi bo'yicha evristikalar (uz / ru / en) — manba turi (`kind`) berilmagan eski hisoblar uchun;
   • chegara qiymatlari (THRESHOLDS) — LOYIHA QARORLARI, me'yoriy talab emas (docs/LINTER_RULES.md §4).
═══════════════════════════════════════════════════════════════ */
import { normalize } from '../spec.js';
import { isBlank, toNum } from '../util.js';

export const SEVERITIES = ['error', 'warning', 'info'];
export const MODES = ['GUM', 'REGRESSION', 'TOP_DOWN', 'SAMPLING', 'QUALITATIVE', 'MICRO', 'MEDICAL', 'MC', 'MULTIVARIATE']; // 'MC' — monteCarlo() natijasi (P06)

/** Loyiha qarorlari (egasi tasdiqlagan, 2026-11-18 — docs/LINTER_RULES.md §4). Me'yoriy hujjatlarda bunday aniq sonlar yo'q,
    faqat ko'rsatilgan joylardagi tavsiyalar bor. */
export const THRESHOLDS = Object.freeze({
  dominantSharePct: 90,        // A1: bitta manba ulushi
  minObservations: 3,          // A2: n < 3 → warning
  correlationAbs: 0.5,         // X4: |r| chegarasi
  correlationMinPairs: 3,      // X4: r hisoblanadigan eng kam juft qatorlar soni
  correlationAlpha: 0.05,      // X4: ρ = 0 gipotezasi t-testining ahamiyatlilik darajasi
  k2WarnNuEff: 10,             // X7: ν_eff < 10 → warning (JCGM 100:2008 G.6.6 — "say greater than 10"; egasi qarori 2026-11-18)
  k2MinNuEff: 30,              // X7: 10 ≤ ν_eff < 30 → info (loyiha chegarasi; egasi qarori 2026-11-18)
  turWarn: 1,                  // D1: TUR < 1 → warning (JCGM 106:2012 §7.6.4; egasi qarori 2026-11-18)
  turInfo: 4,                  // D1: 1 ≤ TUR < 4 → info ("4:1" — amaliyotdagi qoida, manbasi repoda yo'q: unverified)
  k2TypeASharePct: 30,         // X7: A tur ulushi
  k2MinObservations: 10,       // X7: EA-4/02 M:2022 §5.3 — "fewer than ten repeated observations"
  grubbsAlpha: 0.05,           // A4: ikki tomonlama ahamiyatlilik darajasi
  grubbsMinN: 3,               // A4
  unusualKMin: 1,              // X5: normal taqsimot bo'luvchisi k < 1
  unusualKMax: 4,              // X5: … yoki k > 4
  outputCorrelationAbs: 0.5,   // MV1: chiqishlar orasidagi |r| chegarasi (P07; manbada son yo'q — egasi tasdig'ini kutadi)
  expiryWarnDays: 30,          // L1: etalon muddati tugashiga qolgan kunlar → info (P11; loyiha qarori — egasi tasdig'ini kutadi)
  maxReportedDigits: 2,        // X9: U ning qiymatli raqamlari (JCGM 100:2008 7.2.6; egasi qarori)
});

/** Natija rejimi → linter rejimi. */
export function modeOf(result) {
  const m = result && result.mode;
  if (!m) return 'GUM';
  if (m === 'MICROBIOLOGY') return 'MICRO';
  return MODES.includes(m) ? m : 'GUM';
}

/**
 * Topilma. id — barqaror kalit (qabul qilish — "asoslangan holda qabul qilish" — shu id bo'yicha saqlanadi).
 * @returns {{id:string, rule:string, code:string, severity:string, ref:string, param?:string, source?:string, value?:string, unverified?:boolean}}
 */
export function finding(rule, code, extra) {
  const e = extra || {};
  const key = e.key !== undefined ? e.key : [e.param, e.source].filter(v => v !== undefined && v !== null && v !== '').join('/');
  const out = { id: `${rule.id}/${code}${key ? ':' + key : ''}`, rule: rule.id, code, severity: e.severity || rule.severity, ref: e.ref || rule.ref };
  if (e.param !== undefined && e.param !== null && e.param !== '') out.param = String(e.param);
  if (e.source !== undefined && e.source !== null && e.source !== '') out.source = String(e.source);
  if (e.value !== undefined && e.value !== null) out.value = String(e.value);
  if (rule.unverified || e.unverified) out.unverified = true;
  return out;
}

/** GUM yo'li uchun ichki holat (calc-state/v2) — spec qaysi formatda bo'lsa ham. */
export function gumState(spec) {
  const n = normalize(spec);
  return n.error ? null : n.state;
}

/** Sonni qisqa ko'rinishga (topilma matni uchun; hisobot yaxlitlashi emas). */
export function short(v, sig) {
  if (typeof v !== 'number' || !isFinite(v)) return String(v);
  return String(Number(v.toPrecision(sig || 3)));
}

/* ── Manba nomi evristikalari ────────────────────────────────────
   Shablon manbalari `kind` bilan keladi (schemas/methodology.schema.json: certificate, specification,
   resolution, drift, reference, …). Qo'lda kiritilgan hisoblarda faqat nom bor — shuning uchun nom bo'yicha
   uz / ru / en kalit so'zlar. Evristika noto'g'ri ishlashi mumkin: bunday topilma izoh bilan qabul qilinadi. */
const RX = {
  // kalibrlanayotgan asbobning ruxsat etilgan xatosi
  mpe: /\bmpe\b|ruxsat\s+etilgan|yo['ʻ’`]?l\s+qo['ʻ’`]?yil|допускаем|допустим|предел\w*\s+\w*\s*погрешност|permissible|tolerance\s+limit|asosiy\s+xato/i,
  // etalon / tayanch vosita (uning xatosi — qonuniy manba)
  reference: /etalon|kalibrator|эталон|калибратор|reference|standard|\bcrm\b|\bpgs\b|пгс|гсо|\bgso\b|namunaviy|образцов|tayanch/i,
  certificate: /sertifikat|сертификат|certificate|свидетельств|guvohnoma|pasport|паспорт/i,
  // rezolyutsiya / diskretlik / shkaladan o'qish (interpolyatsiya) — ko'rsatishni o'qishning chekli aniqligi
  resolution: /rezoly|ajratish\s+qobiliyati|diskret|разреш|дискрет|resolution|readab|reading|bo['ʻ’`]?linma|цена\s+делени|oxirgi\s+xona|младш\w*\s+разряд|o['ʻ’`]?qish|interpolyats|интерполяц|отсч[её]т|shkala|шкал/i,
  hysteresis: /gisterezis|histerezis|hysteres|гистерезис|variatsiya|вариаци/i,
  drift: /dreyf|drift|дрейф|barqarorlik|стабильн|stabil|uzoq\s+muddat|долговремен|eskirish|старени|ageing|aging/i,
};
const nameOf = c => String((c && c.name) || '');

export const isMpeLike = c => RX.mpe.test(nameOf(c));
export const isReferenceLike = c => !!c && (c.kind === 'reference' || c.kind === 'certificate' || RX.reference.test(nameOf(c)) || RX.certificate.test(nameOf(c)));
export const isCertificateLike = c => !!c && (c.kind === 'certificate' || RX.certificate.test(nameOf(c)));
export const isResolutionLike = c => !!c && (c.kind === 'resolution' || c.distribution === 'resol' || RX.resolution.test(nameOf(c)));
export const isHysteresisLike = c => RX.hysteresis.test(nameOf(c));
export const isDriftLike = c => !!c && (c.kind === 'drift' || RX.drift.test(nameOf(c)));

/** B tur manbalar ro'yxati (param har doim to'ldirilgan — dvigatel bilan bir xil qoida). */
export function typeBOf(state) {
  const params = state.params || [];
  return (state.typeB || []).map((c, index) => ({ ...c, index, param: params.includes(c.param) ? c.param : params[0] }));
}

export { isBlank, toNum };
