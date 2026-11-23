/* M5 (mcm-required) — MCM tekshiruvi talab qilinadi, lekin natijasi yo'q (P20, audit 21.11.2026 — MET-01).
   LPU → MCM qaror qoidasi (src/engine/mcm-decision.js, result.mcm.required) MCM ni talab qilgan, ammo Monte-Karlo
   bajarilmagan, bekor qilingan yoki xato bilan tugagan. Hisobot "QORALAMA" suv belgisi bilan chiqadi.
   Ref: JCGM 101:2008 §5.7, §5.8 (LPU qo'llanishining shartlari), §8.1.1 (GUM natijasini MCM bilan tekshirish);
        JCGM 100:2008 §5.1.2 NOTE. Chegaralar (|c_i|u(x_i)/u_c > 0,50; ν_eff < 6) — LOYIHA QARORI (egasi, 2026-11-21).
   Qoida evaluate() ichida ISHLAMAYDI (u yerda MCM natijasi ma'lum emas): hisobot / UI qatlami MCM holatini
   ctx.mcm = { missing: boolean } orqali beradi (lintMcm() — X9 dagi lintReported() kabi). */
import { finding } from '../util.js';

const rule = {
  id: 'M5',
  severity: 'warning',
  ref: 'JCGM 101:2008 §5.7, §5.8, §8.1.1; JCGM 100:2008 §5.1.2 NOTE; loyiha qarori (2026-11-21)',
  modes: ['GUM'],
  codes: { mcm_required: {} },
  check(spec, result, ctx) {
    const m = result && result.mcm;
    if (!ctx || !ctx.mcm || ctx.mcm.missing !== true || !m || !m.required) return [];
    const codes = [...new Set((m.reasons || []).map(x => x.code))].join(', ');   // matnda: "… talab qilinadi ({v})" → "(b, d)"
    return [finding(rule, 'mcm_required', { key: '', value: codes })];
  },
};
export default rule;
