/* M4 — Monte-Karlo: sonli barqarorlik va generator (P06).
   • mc_not_converged (warning) — adaptiv protsedura M ning yuqori chegarasiga yetdi, lekin 2s ≤ δ sharti bajarilmadi.
     Ref: JCGM 101:2008 §7.9.4 k) (32-bet), §7.9.3 Note 1 ("cannot be guaranteed").
   • mc_variance_undefined (warning) — kirishga ν ≤ 2 bo'lgan t-taqsimot tayinlangan (masalan, n ≤ 3 kuzatuv):
     Y ning standart og'ishi mavjud bo'lmasligi mumkin, u(y) va δ ma'nosiz; qamrov intervali esa aniqlanadi.
     Ref: JCGM 101:2008 §7.6 Note 2 (30-bet); §6.4.9.4 (V(X) faqat n > 3 da); C.6 Note (63-bet).
   • mc_legacy_rng (info) — eski generator (xorshift32) bilan takrorlangan natija: faqat audit izi uchun.
     Ref: JCGM 101:2008 C.3.2.1 (60-bet) — generatorga talablar. */
import { finding } from '../util.js';

const rule = {
  id: 'M4',
  severity: 'warning',
  ref: 'JCGM 101:2008 §7.9.4 k), §7.9.3 Note 1',
  modes: ['MC'],
  codes: {
    mc_not_converged: {},
    mc_variance_undefined: { ref: 'JCGM 101:2008 §7.6 Note 2, §6.4.9.4, C.6 Note' },
    mc_legacy_rng: { severity: 'info', ref: 'JCGM 101:2008 C.3.2.1' },
  },
  check(spec, result) {
    if (result.error) return [];
    const out = [];
    const a = result.adaptive || {};
    if (a.enabled && a.reachedMax && !a.converged) out.push(finding(rule, 'mc_not_converged', { value: result.M }));
    for (const h of result.varianceUndefined || []) {
      out.push(finding(rule, 'mc_variance_undefined', { param: h.input, source: h.source, value: h.nu, ref: rule.codes.mc_variance_undefined.ref }));
    }
    if (result.legacy || (result.rng && result.rng.name === 'xorshift32-legacy')) {
      out.push(finding(rule, 'mc_legacy_rng', { severity: 'info', ref: rule.codes.mc_legacy_rng.ref }));
    }
    return out;
  },
};
export default rule;
