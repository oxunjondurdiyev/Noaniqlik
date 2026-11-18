/* X12 — top-down: empirik kattalikda (usul bilan ta'riflangan) bias / recovery / u(δ̂) kiritilgan.
   P09 da src/engine/topdown/ ning warnings[] da edi — P05a da linterga ko'chirildi.
   Egasi qarori (2026-11-17, RISKS R-20) AYNAN saqlangan — "tayanch qiymat qaysi usul bilan olingan" (referenceMethod):
     • javob berilmagan — hissa u_c ga QO'SHILADI (konservativ) + x12_empirical_bias (warning);
     • 'other' (boshqa usul / ta'rif) — hissa chiqarib tashlanadi (QUAM:2012 §7.9.2) + x12_bias_excluded (info);
     • 'same' (shu usul) — hissa qo'shiladi, topilma yo'q (QUAM:2012 §7.9.3).
   Hissani qo'shish / chiqarish — dvigatelda (budget[].flag = 'X12', included); qoida shu belgidan o'qiydi. */
import { finding } from '../util.js';

const WHERE = { bias: 'bias', recovery: 'recovery', uDelta: 'methodBias' };

const rule = {
  id: 'X12',
  severity: 'warning',
  ref: 'EURACHEM/CITAC QUAM:2012 §7.9.2–7.9.3 (p. 21): empirik usulda usul bias\'i nolga teng deb ta\'riflanadi; tayanch qiymat usuli ko\'rsatilmagan',
  modes: ['TOP_DOWN'],
  codes: {
    x12_empirical_bias: {},
    x12_bias_excluded: { severity: 'info', ref: 'EURACHEM/CITAC QUAM:2012 §7.9.2 (p. 21): tayanch qiymat boshqa usul bilan olingan — usul bias\'i hisobga kirmaydi' },
  },
  check(spec, result) {
    return (result.budget || []).filter(b => b.flag === 'X12').map(b => (b.included
      ? finding(rule, 'x12_empirical_bias', { key: b.id, value: WHERE[b.id] || b.id })
      : finding(rule, 'x12_bias_excluded', { key: b.id, value: WHERE[b.id] || b.id, severity: 'info', ref: rule.codes.x12_bias_excluded.ref })));
  },
};
export default rule;
