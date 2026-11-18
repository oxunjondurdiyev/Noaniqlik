/* M3 — Monte-Karlo: GUM (noaniqlikning tarqalish qonuni) natijasi MCM bilan tasdiqlanmadi (P06).
   Ref: JCGM 101:2008 §8.1.3 (33–34-betlar): d_low = |y − U_p − y_low|, d_high = |y + U_p − y_high|; ikkalasi ham δ dan
        katta bo'lmasa — tasdiqlangan. §8.1.1: aks holda "consideration should be given to using MCM … instead".
   mc_lpu_not_validated (warning): hisobotda MCM qamrov intervali ko'rsatiladi (interval turi, P, M, generator, urug', n_dig bilan).
   Eslatma: adaptiv protsedura barqarorlashmagan bo'lsa (M4), tekshiruv xulosasi ham ishonchsiz — M4 alohida chiqadi. */
import { finding } from '../util.js';

const rule = {
  id: 'M3',
  severity: 'warning',
  ref: 'JCGM 101:2008 §8.1.1, §8.1.3 (Eq. 19, 20)',
  modes: ['MC'],
  codes: { mc_lpu_not_validated: {} },
  check(spec, result) {
    if (result.error || result.validated !== false) return [];
    return [finding(rule, 'mc_lpu_not_validated')];
  },
};
export default rule;
