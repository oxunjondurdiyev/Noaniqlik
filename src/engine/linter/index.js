/* ═══════════════════════════════════════════════════════════════
   LINTER/INDEX.JS — metrologik linter (P05a): modelSpec va natijani tekshirib, tipik xatolarni topadi.
   Har bir qoida — alohida modul: { id, severity, ref, modes, codes, check(spec, result, ctx) → findings[] }.
   Natija: result.findings (evaluate() ichida avtomatik to'ldiriladi).
   Linter HISOBNI O'ZGARTIRMAYDI — y, u_c, ν_eff, k, U ga tegmaydi; faqat topilmalar qo'shadi.
   Qoidalar ro'yxati va manbalari: docs/LINTER_RULES.md. Sof modul (brauzer obyektlari yo'q).
═══════════════════════════════════════════════════════════════ */
import { SEVERITIES, MODES, THRESHOLDS, modeOf } from './util.js';
import x01 from './rules/x01-mpe-in-budget.js';
import x02 from './rules/x02-certificate-divisor.js';
import x03 from './rules/x03-hysteresis-double.js';
import x04 from './rules/x04-correlation.js';
import x05 from './rules/x05-resolution-divisor.js';
import x06 from './rules/x06-units.js';
import x07 from './rules/x07-k2-reliability.js';
import x08 from './rules/x08-zero-uncertainty.js';
import x09 from './rules/x09-reported-digits.js';
import x10 from './rules/x10-no-drift.js';
import x11 from './rules/x11-double-counting.js';
import x12 from './rules/x12-empirical-bias.js';
import a01 from './rules/a01-dominant-source.js';
import a02 from './rules/a02-few-observations.js';
import a03 from './rules/a03-invalid-nu.js';
import a04 from './rules/a04-grubbs-outlier.js';
import m01 from './rules/m01-model-kind.js';
import m02 from './rules/m02-mc-correlation.js';
import m03 from './rules/m03-mc-validation.js';
import m04 from './rules/m04-mc-convergence.js';
import d01 from './rules/d01-decision-rule.js';
import w01 from './rules/w01-gum-warnings.js';
import w02 from './rules/w02-module-warnings.js';

/** Barcha qoidalar (tartib — hisobotdagi tartibga ta'sir qilmaydi: topilmalar darajasi bo'yicha saralanadi). */
export const RULES = Object.freeze([x01, x02, x03, x04, x05, x06, x07, x08, x09, x10, x11, x12, a01, a02, a03, a04, m01, m02, m03, m04, d01, w01, w02]);

/** Kod → { rule, severity, ref, modes, unverified } — hujjat (docs/LINTER_RULES.md), i18n testi va UI uchun. */
export const FINDING_CODES = Object.freeze(Object.fromEntries(RULES.flatMap(r =>
  Object.entries(r.codes).map(([code, c]) => [code, Object.freeze({
    rule: r.id, severity: c.severity || r.severity, ref: c.ref || r.ref, modes: r.modes, unverified: !!(r.unverified || c.unverified),
  })]))));

const ORDER = { error: 0, warning: 1, info: 2 };

/**
 * Tekshiruv. Xato natijada ({error}) — bo'sh ro'yxat (istisno: Monte-Karlo rad etilgan natija, mode: 'MC' — M2).
 * @param {object} spec    evaluate() ga berilgan modelSpec (har qanday format)
 * @param {object} result  evaluate() natijasi
 * @param {{reported?:{y?:string, U:string}}} [ctx]  hisobot qatlamidan: chop etiladigan yaxlitlangan satrlar (X9)
 * @returns {object[]} topilmalar — error, warning, info tartibida
 */
export function lint(spec, result, ctx) {
  if (!result || (result.error && result.mode !== 'MC')) return [];
  const mode = modeOf(result);
  const out = [];
  const seen = new Set();
  for (const rule of RULES) {
    if (!rule.modes.includes(mode)) continue;
    for (const f of rule.check(spec || {}, result, ctx || {}) || []) {
      let id = f.id, n = 1;
      while (seen.has(id)) id = `${f.id}#${++n}`;       // bir xil kalitli takror topilma (kam uchraydi) — tartib raqami bilan
      seen.add(id);
      out.push({ ...f, id, mode });
    }
  }
  return out.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

/** Hisobot qatlami uchun X9: chop etiladigan satrlarni tekshirish (natijaga bog'liq emas). */
export function lintReported(reported, mode) {
  return x09.check({}, {}, { reported }).map(f => ({ ...f, mode: mode || 'GUM' }));
}

/* ── "Asoslangan holda qabul qilish" ─────────────────────────────
   warning yoki error topilmasini foydalanuvchi izoh bilan qabul qilishi mumkin; izoh majburiy.
   Qabul qilish topilmani YASHIRMAYDI: u hisobotda izohi bilan birga chiqadi. */
export const MIN_ACCEPT_COMMENT = 10;

/** Izohni tekshirish: kamida MIN_ACCEPT_COMMENT belgi (bo'sh joylar hisobga kirmaydi boshida/oxirida). */
export function validateAcceptance(comment) {
  const text = typeof comment === 'string' ? comment.trim() : '';
  return text.length >= MIN_ACCEPT_COMMENT ? { ok: true, comment: text } : { ok: false, error: 'accept_comment_short' };
}

/**
 * Topilmalarga qabul qilish yozuvlarini biriktirish.
 * @param {object[]} findings
 * @param {Object<string,{comment:string, role?:string, at?:string}>} acceptances  kalit — topilma id
 * @returns {object[]} har birida accepted: null | {comment, role, at}; info topilma qabul qilinmaydi
 */
export function withAcceptances(findings, acceptances) {
  const acc = acceptances || {};
  return (findings || []).map(f => {
    const a = f.severity !== 'info' && acc[f.id] && validateAcceptance(acc[f.id].comment).ok ? acc[f.id] : null;
    return { ...f, accepted: a ? { comment: a.comment.trim(), role: a.role || '', at: a.at || '' } : null };
  });
}

/**
 * Hisobot holati.
 * official — qabul qilinmagan `error` yo'q (aks holda hisobot "RASMIY EMAS" suv belgisi bilan chiqadi);
 * mustFlag — U = 0, u_c = 0 yoki U < CMC bor (R-05: hisobot yo bloklanadi, yo aniq belgilanadi — laboratoriya sozlamasi).
 */
export function reportStatus(findings, acceptances) {
  const list = withAcceptances(findings, acceptances);
  const open = list.filter(f => f.severity === 'error' && !f.accepted);
  const critical = list.filter(f => f.code === 'zero_u' || f.code === 'below_cmc');
  return {
    official: open.length === 0,
    openErrors: open.map(f => f.id),
    mustFlag: critical.length > 0,
    critical: critical.map(f => f.code),
    counts: { error: list.filter(f => f.severity === 'error').length, warning: list.filter(f => f.severity === 'warning').length, info: list.filter(f => f.severity === 'info').length },
  };
}

export { SEVERITIES, MODES as LINTER_MODES, THRESHOLDS as LINTER_THRESHOLDS, modeOf as linterModeOf };
export { grubbsCritical, grubbsStatistic } from './rules/a04-grubbs-outlier.js';
export { significantDigits, decimalPlaces } from './rules/x09-reported-digits.js';
