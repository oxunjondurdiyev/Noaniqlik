/* D1 — qaror qoidasi va muvofiqlik bayonoti (P05b).
   decision_rule_missing (warning) — chegara (MPE / tolerantlik) berilgan, lekin qaror qoidasi tanlanmagan:
       muvofiqlik bayonoti BERILMAYDI. ISO/IEC 17025:2017 §7.1.3 — qaror qoidasi aniq belgilanadi va mijoz bilan
       kelishiladi; §7.8.6.1 — qo'llanilgan qoida hujjatlashtiriladi (ILAC G8:09/2019 §2.3, §2.6 dagi iqtiboslar).
   decision_no_agreement (info)   — qoida tanlangan, mijoz bilan kelishuv raqami kiritilmagan (§7.1.3; ILAC G8 §2.3).
   decision_invalid (error)       — chegaralar noto'g'ri yoki himoya zonasi tolerantlikdan keng (qabul oralig'i bo'sh):
       JCGM 106:2012 §8.3.2.2 (w = T_U − A_U).
   decision_low_tur (info)        — TUR < 1 (U > MPE): himoyalangan qoidada hech bir natija qabul qilinmaydi,
       oddiy qabulda xavf katta (JCGM 106:2012 §7.6, §8.2.2; ILAC G8:09/2019 §5.3).
   decision_normal_assumed (info) — p_c normal taqsimot farazida hisoblangan, ν_eff esa kichik (JCGM 106:2012 §7.2.3;
       chegara 30 — loyiha qarori, X7 bilan bir xil). */
import { finding, short, THRESHOLDS } from '../util.js';

const rule = {
  id: 'D1',
  severity: 'warning',
  ref: 'ILAC G8:09/2019 §2.3, §2.6 (ISO/IEC 17025:2017 §7.1.3, §7.8.6.1); JCGM 106:2012 §8',
  modes: ['GUM'],
  codes: {
    decision_rule_missing: {},
    decision_no_agreement: { severity: 'info', ref: 'ILAC G8:09/2019 §2.3 (ISO/IEC 17025:2017 §7.1.3), §4.2.3' },
    decision_invalid: { severity: 'error', ref: 'JCGM 106:2012 §8.3.2.2' },
    decision_low_tur: { severity: 'info', ref: 'JCGM 106:2012 §7.6.4, §7.6.5, §8.2.2; ILAC G8:09/2019 §1.13, §5.3' },
    decision_normal_assumed: { severity: 'info', ref: 'JCGM 106:2012 §7.2.3, §7.2.4' },
  },
  check(spec, result) {
    const d = result.decision;
    if (!d) return [];
    const c = rule.codes;
    if (d.pending === 'rule') return [finding(rule, 'decision_rule_missing')];
    if (d.pending) return [];                                   // model turi / nominal — M1 qoidasi
    if (d.error) return [finding(rule, 'decision_invalid', { value: d.error, severity: 'error', ref: c.decision_invalid.ref })];
    const out = [];
    if (!d.agreement) out.push(finding(rule, 'decision_no_agreement', { severity: 'info', ref: c.decision_no_agreement.ref }));
    if (d.tur !== null && d.tur < 1) out.push(finding(rule, 'decision_low_tur', { value: `TUR = ${short(d.tur, 3)}`, severity: 'info', ref: c.decision_low_tur.ref }));
    if (isFinite(result.nuEff) && result.nuEff < THRESHOLDS.k2MinNuEff) out.push(finding(rule, 'decision_normal_assumed', { value: `ν_eff = ${short(result.nuEff, 3)}`, severity: 'info', ref: c.decision_normal_assumed.ref }));
    return out;
  },
};
export default rule;
