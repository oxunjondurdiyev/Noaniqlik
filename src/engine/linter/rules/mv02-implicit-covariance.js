/* MV2 — oshkor bo'lmagan model h(Y, X) = 0 (P07b): U_y qaysi yo'l bilan hisoblangani.
   • implicit_lu_fallback (info) — U_y JCGM 102:2011 Annex B (B.1 a–j) protsedurasi bilan EMAS, balki C = C_y⁻¹·C_x
     (Eq. (10), C_y·C = C_x sistemasi LU bilan) va U_y = C·U_x·Cᵀ (Eq. (9)) orqali hisoblangan. Sabab: U_x ning Cholesky
     ko'paytuvchisi mavjud emas (U_x singular — masalan u(x_i) = 0 yoki |r(x_i, x_j)| = 1), shuning uchun B.1 a) bajarilmaydi.
     Natija matematik jihatdan bir xil; §6.3.1.5 bu yo'lni sonli jihatdan kamroq barqaror deb "not recommended" deydi —
     C_y yomon shartlangan bo'lsa (hisobotdagi cond₁(C_y)) ehtiyot bo'lish kerak.
     Ref: JCGM 102:2011 §6.3.1.5 (18-bet), Annex B (61-bet). Egasi qarori 2026-11-19 (3-band): LU yo'li + info topilmasi. */
import { finding } from '../util.js';

const rule = {
  id: 'MV2',
  severity: 'info',
  ref: 'JCGM 102:2011 §6.3.1.5, Annex B',
  modes: ['GUM', 'MULTIVARIATE'],
  codes: { implicit_lu_fallback: {} },
  check(spec, result) {
    const imp = result && result.implicit;
    if (!imp || imp.covarianceMethod !== 'lu') return [];
    return [finding(rule, 'implicit_lu_fallback', { value: isFinite(imp.cond) ? imp.cond.toPrecision(3) : '∞' })];
  },
};
export default rule;
