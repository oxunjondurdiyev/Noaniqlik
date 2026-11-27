/* ═══════════════════════════════════════════════════════════════
   METHOD-ADVISOR.JS — P22-2 (audit 21.11.2026 — UX-03): usul maslahatchisi.
   Hisob holatiga qarab QAYSI BAHOLASH USULI mos kelishini TAVSIYA qiladi. Sof modul (DOM / global obyekt / brauzer
   xotirasi yo'q). HISOBNI O'ZGARTIRMAYDI: evaluate() ni chaqirmaydi, natijaga tegmaydi, kirishni o'zgartirmaydi.
   YANGI SON CHEGARA YO'Q: Monte-Karlo tavsiyasi faqat mavjud qaror qoidasidan (mcm-decision.js → result.mcm)
   olinadi — MCM_THRESHOLDS ga tegilmaydi.

   Usul kalitlari — linter/util.js::MODES (yangi kalit o'ylab topilmaydi; laboratoriyalararo ma'lumot → TOP_DOWN,
   sababi alohida kod bilan: `interlab_precision`).
═══════════════════════════════════════════════════════════════ */
import { MODES } from './linter/util.js';

/** "Ma'lumot turi" savoli javoblari (settings.dataKind) — FAQAT interfeys maydoni: evaluate() uni o'qimaydi. */
export const DATA_KINDS = Object.freeze([
  'model', 'calibration_curve', 'qc_crm_pt', 'interlab_sr_sR', 'sampling_duplicates', 'binary', 'micro_count', 'iqc_medical',
]);

/** Shablon `evaluationMode` (schemas/methodology.schema.json) → usul kaliti. */
const TEMPLATE_MODE = Object.freeze({
  GUM_BOTTOM_UP: 'GUM', REGRESSION: 'REGRESSION', TOP_DOWN: 'TOP_DOWN', SAMPLING: 'SAMPLING',
  QUALITATIVE: 'QUALITATIVE', MICROBIOLOGY: 'MICRO', MEDICAL: 'MEDICAL',
});

/* Sabablar: { code, ref, verified }. `verified: false` — manba repoda (docs/references/) yo'q yoki hali solishtirilmagan;
   bunday havolada "(unverified)" belgisi turadi (CLAUDE.md — me'yoriy hujjatlar nashrlari). */
const R = Object.freeze({
  template_mode: { code: 'template_mode', ref: 'docs/TEMPLATE_GUIDE.md — evaluationMode', verified: true },
  // Ref: JCGM 102:2011 §6.2 (oshkor ko'p o'zgaruvchili model)
  multi_output: { code: 'multi_output', ref: 'JCGM 102:2011 §6.2', verified: true },
  // Ref: JCGM 102:2011 §6.3 (oshkor bo'lmagan ko'p o'zgaruvchili model)
  implicit_model: { code: 'implicit_model', ref: 'JCGM 102:2011 §6.3', verified: true },
  // Ref: JCGM 100:2008 H.3; EURACHEM/CITAC QUAM:2012 Appendix E.4 (chiziqli eng kichik kvadratlar kalibrlashi)
  calibration_curve: { code: 'calibration_curve', ref: 'JCGM 100:2008 H.3; EURACHEM/CITAC QUAM:2012 Appendix E.4', verified: true },
  // ISO 28037:2026 (ISO/TS 28037:2010 o'rniga) — repoda yo'q: P23 da tasdiqlanadi
  calibration_curve_iso: { code: 'calibration_curve_iso', ref: 'ISO 28037:2026 (unverified)', verified: false },
  // Ref: Nordtest TR 537 ed. 4 (2017) §3.2 (u(R_w) + u(bias))
  qc_crm_pt: { code: 'qc_crm_pt', ref: 'Nordtest TR 537 ed. 4 (2017) §3.2', verified: true },
  // ISO 11352:2025 — repoda yo'q (pullik)
  qc_crm_pt_iso: { code: 'qc_crm_pt_iso', ref: 'ISO 11352:2025 (unverified)', verified: false },
  // ISO 21748:2017 §10 — repoda yo'q (pullik): P23 da tasdiqlanadi
  interlab_precision: { code: 'interlab_precision', ref: 'ISO 21748:2017 §10 (unverified)', verified: false },
  // Ref: EURACHEM/CITAC UfS:2019 (dublikat usuli, Example A1 / A2)
  sampling_duplicates: { code: 'sampling_duplicates', ref: 'EURACHEM/CITAC UfS:2019 §9.4, Appendix A', verified: true },
  // Ref: EURACHEM/CITAC AQA:2021 (sifatli tahlil)
  binary: { code: 'binary', ref: 'EURACHEM/CITAC AQA:2021', verified: true },
  // ISO 19036 — repoda yo'q (pullik); mikrobiologiya rejimi BETA (P19)
  micro_count: { code: 'micro_count', ref: 'ISO 19036 (unverified)', verified: false },
  // Ref: ISO/TS 20914:2019 (E) Annex A / C — ishlangan misollar tests/fixtures/iso20914/ da (P18)
  iqc_medical: { code: 'iqc_medical', ref: 'ISO/TS 20914:2019', verified: true },
  // Ref: JCGM 100:2008 §5.1 (noaniqlikning tarqalish qonuni)
  measurement_model: { code: 'measurement_model', ref: 'JCGM 100:2008 §5.1', verified: true },
});

const BY_KIND = Object.freeze({
  calibration_curve: { method: 'REGRESSION', reasons: ['calibration_curve', 'calibration_curve_iso'] },
  qc_crm_pt: { method: 'TOP_DOWN', reasons: ['qc_crm_pt', 'qc_crm_pt_iso'] },
  interlab_sr_sR: { method: 'TOP_DOWN', reasons: ['interlab_precision'] },
  sampling_duplicates: { method: 'SAMPLING', reasons: ['sampling_duplicates'] },
  binary: { method: 'QUALITATIVE', reasons: ['binary'] },
  micro_count: { method: 'MICRO', reasons: ['micro_count'] },
  iqc_medical: { method: 'MEDICAL', reasons: ['iqc_medical'] },
});

/** Tavsiya sabablarining kodlari (i18n: `adv_r_<kod>`); MC da sabablar — result.mcm.reasons ning nusxasi (kodlari a–d). */
export const ADVISOR_REASONS = Object.freeze(Object.keys(R));

const pick = codes => codes.map(c => ({ ...R[c] }));
const out = (method, reasons, alternatives) => ({ method, reasons, alternatives: alternatives.filter(m => m !== method && MODES.includes(m)) });
const isMulti = st => !!st.implicit || (Array.isArray(st.outputs) && st.outputs.length >= 2);

/**
 * Usul tavsiyasi. Qoidalar tartib bilan, birinchi mos kelgani.
 * @param {object} state  hisob holati (params, model, outputs, implicit, template, settings.dataKind, units)
 * @param {object|null} [result]  oxirgi evaluate() natijasi (bo'lsa) — FAQAT result.mcm o'qiladi
 * @returns {{ method: string, reasons: Array<{code:string, ref:string, verified?:boolean}>, alternatives: string[] }}
 *   `method` ∈ MODES. MC da `reasons` — result.mcm.reasons ning aynan nusxasi ({code:'a'…'d', value, threshold, ref, …}).
 */
export function suggestMethod(state, result) {
  const st = state && typeof state === 'object' ? state : {};
  const tpl = st.template && typeof st.template === 'object' ? st.template : null;
  const multiReason = st.implicit ? 'implicit_model' : 'multi_output';

  // 1) Shablon: usul shablonning evaluationMode idan (shablon — tekshirilgan metodika, usul qulflangan).
  // 1a) QOIDALAR TARTIBIDAN CHETLANISH (egasi tasdiqladi 2026-11-27): GUM_BOTTOM_UP shabloni bir nechta chiqishli yoki
  //     oshkormas bo'lsa (masalan MV-01), 1-qoida "GUM" bermaydi — MULTIVARIATE qaytadi (sabablar: template_mode +
  //     multi_output / implicit_model). Vektor modelda natija kovariatsiya matritsasi va qamrov sohasi bilan beriladi —
  //     uni "GUM (LPU)" deb atash metrologik jihatdan noto'g'ri. Shablon qulfi saqlanadi (alternatives bo'sh).
  //     Ref: JCGM 102:2011 §6.2 (oshkor), §6.3 (oshkor bo'lmagan)
  const tplMode = tpl ? TEMPLATE_MODE[tpl.evaluationMode] : undefined;
  if (tplMode) {
    if (tplMode === 'GUM' && isMulti(st)) return out('MULTIVARIATE', pick(['template_mode', multiReason]), []);
    return out(tplMode, pick(['template_mode']), []);
  }

  // 2) Vektor model. Ref: JCGM 102:2011 §6.2 (oshkor), §6.3 (oshkor bo'lmagan)
  if (isMulti(st)) return out('MULTIVARIATE', pick([multiReason]), []);

  // 3) Foydalanuvchi ko'rsatgan ma'lumot turi (settings.dataKind) — manbalar yuqoridagi R jadvalida
  const kind = st.settings && typeof st.settings === 'object' ? st.settings.dataKind : undefined;
  const byKind = typeof kind === 'string' && Object.prototype.hasOwnProperty.call(BY_KIND, kind) ? BY_KIND[kind] : null;
  if (byKind) return out(byKind.method, pick(byKind.reasons), ['GUM']);

  // 4) O'lchash modeli (formula). Ref: JCGM 100:2008 §5.1.
  //    LPU ni MCM bilan tekshirish talab qilinsa (mcm-decision.js — P20 qaror qoidasi) → MC; sabablar o'sha qoidadan
  //    AYNAN nusxalanadi. Ref: JCGM 101:2008 §5.7, §5.8, §8.1.1
  const mcm = result && typeof result === 'object' ? result.mcm : null;
  if (mcm && mcm.required === true) return out('MC', (Array.isArray(mcm.reasons) ? mcm.reasons : []).map(r => ({ ...r })), ['GUM']);
  return out('GUM', pick(['measurement_model']), ['MC']);
}
