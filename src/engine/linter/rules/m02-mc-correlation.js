/* M2 — Monte-Karlo: korrelyatsiyalangan kirishlar orasida normal bo'lmagan taqsimot (P06).
   JCGM 101:2008 birgalikdagi taqsimotdan tanlash usulini faqat ko'p o'lchovli Gauss uchun beradi (§6.4.8.4, C.5);
   §6.4.8.4 Note: "If another multivariate PDF is needed, a means for sampling from it would need to be provided".
   Shuning uchun:
     • mc_nonnormal_correlation (error) — natija BERILMAYDI (standart; copula va shu kabi usullar dasturda yo'q);
     • mc_correlation_gaussian_approx (warning) — laboratoriya sozlamasi bilan guruh ko'p o'lchovli Gauss
       N(x, U_x) bilan yaqinlashtirilgan (o'rtacha va kovariatsiya saqlanadi, taqsimot shakli — yo'q); natija shunday belgilanadi.
   Ref: JCGM 101:2008 §6.4.8.1, §6.4.8.4 Note (25-bet), C.5 (62-bet). */
import { finding } from '../util.js';

const rule = {
  id: 'M2',
  severity: 'error',
  ref: 'JCGM 101:2008 §6.4.8.1, §6.4.8.4 Note, C.5',
  modes: ['MC'],
  codes: { mc_nonnormal_correlation: {}, mc_correlation_gaussian_approx: { severity: 'warning' } },
  check(spec, result) {
    const groups = (result.correlation && result.correlation.groups) || [];
    const out = [];
    for (const g of groups) {
      const names = (g.nonNormal || []).join(', ');
      if (g.method === 'refused') out.push(finding(rule, 'mc_nonnormal_correlation', { key: g.inputs.join('+'), value: names }));
      else if (g.method === 'gaussian-approx') out.push(finding(rule, 'mc_correlation_gaussian_approx', { key: g.inputs.join('+'), value: names, severity: 'warning' }));
    }
    return out;
  },
};
export default rule;
