/* ═══════════════════════════════════════════════════════════════
   TEMPLATES/VALIDATION-STATUS.JS — shablonning "manba bilan mos" holati (P16; egasi qarori 2026-11-20, R-29). Sof modul, DOM siz.
   Dalil — templates/validation/builtin.json (FAQAT scripts/template-validation.js yaratadi; `_generated` belgisi).
   Holat qo'lda yozilmaydi va ishonib olinmaydi — har safar tekshiriladi:
     • shablon builtin emas (import qilingan / brauzerdagi nusxa)            → unverified (not_builtin)
     • shablon uchun yozuv yo'q                                              → unverified (no_record)
     • yozuvdagi templateHash ≠ ishlatilayotgan shablonning RFC 8785 xeshi   → unverified (hash_mismatch)
     • yozuvdagi ENGINE_VERSION ≠ ishlayotgan dvigatel versiyasi             → unverified (engine_mismatch)
     • birorta test yozuvi o'tmagan                                          → unverified (test_failed)
   Ref: ISO/IEC 17025:2017 §7.11.2 (unverified — standart repoda yo'q): dasturiy ta'minot qo'llashdan oldin tekshirilgani dalili.
═══════════════════════════════════════════════════════════════ */
import { jcsHash } from '../storage/canonical.js';

export const VALIDATION_FORMAT = 'uc-template-validation/2';
/** Har bir yozuvda majburiy maydonlar (egasi sharti) */
export const RECORD_FIELDS = Object.freeze(['templateId', 'templateHash', 'ENGINE_VERSION', 'testId', 'source', 'clause', 'relDiff', 'date']);

/** Shablonning xeshi: RFC 8785 kanonik JSON → SHA-256 (hex). Generator (Node) ham aynan shu kanonik matndan hisoblaydi. */
export function templateHashOf(tpl) {
  return jcsHash(tpl);
}

/**
 * @param {object|null} file  templates/validation/builtin.json mazmuni
 * @param {{templateId:string, templateHash?:string|null, engineVersion:string, builtin:boolean}} q
 * @returns {{status:'verified'|'unverified', reason:string|null, source:string|null, clause:string|null, relDiff:number|null,
 *            known:string[], testIds:string[], engineVersion:string, date:string|null}}
 */
export function templateValidation(file, q) {
  const base = { status: 'unverified', reason: null, source: null, clause: null, relDiff: null, known: [], testIds: [], engineVersion: q.engineVersion, date: null };
  if (!q.builtin) return { ...base, reason: 'not_builtin' };
  const ok = file && file.format === VALIDATION_FORMAT && typeof file._generated === 'string' && Array.isArray(file.records);
  const recs = ok ? file.records.filter(r => r && r.templateId === q.templateId) : [];
  if (!recs.length) return { ...base, reason: 'no_record' };
  const info = {
    source: [...new Set(recs.map(r => r.source))].join(', '), clause: [...new Set(recs.map(r => r.clause))].join(', '),
    relDiff: Math.max(...recs.map(r => r.relDiff)), known: [...new Set(recs.flatMap(r => r.known || []))].sort(),
    testIds: recs.map(r => r.testId), date: recs.map(r => r.date).sort().pop(),
  };
  if (!q.templateHash || recs.some(r => r.templateHash !== q.templateHash)) return { ...base, ...info, reason: 'hash_mismatch' };
  if (recs.some(r => r.ENGINE_VERSION !== q.engineVersion)) return { ...base, ...info, reason: 'engine_mismatch' };
  if (recs.some(r => r.status !== 'verified')) return { ...base, ...info, reason: 'test_failed' };
  return { ...base, ...info, status: 'verified' };
}
