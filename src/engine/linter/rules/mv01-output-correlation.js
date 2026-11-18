/* MV1 — vektor natija (P07): chiqishlar orasidagi korrelyatsiya.
   • outputs_correlated (info) — |r(y_i, y_j)| chegaradan katta: chiqishlarni alohida-alohida (har birining y ± U intervali
     bilan) talqin qilish noto'g'ri xulosaga olib kelishi mumkin; keyingi hisoblarda kovariatsiya hisobga olinishi kerak,
     qamrov sohasi sifatida ellips (gipper-ellipsoid) mos keladi.
     Ref: JCGM 102:2011 §6.5.2.3 a) ("the mutual dependence of Y1 and Y2 is taken into account"), EXAMPLE 2 (21-bet:
     to'rtburchak soha korrelyatsiyalangan kattaliklar uchun "might be considered inappropriate"); §7.8.2.4 (U_y keyingi
     hisobda: u²(q) = cᵀU_y c). Chegara (THRESHOLDS.outputCorrelationAbs) — LOYIHA QARORI, manbada son yo'q.
   • outputs_singular (info) — U_y singular: chiqishlar (chiziqlashtirilgan) funksional bog'langan (masalan Z² = R² + X²),
     gipper-ellipsoid buzilgan. Ref: JCGM 102:2011 §9.4.2.3 Note 2 (53-bet), §7.8.1.2 Note 6. */
import { finding, THRESHOLDS } from '../util.js';

const rule = {
  id: 'MV1',
  severity: 'info',
  ref: 'JCGM 102:2011 §6.5.2.3 a), EXAMPLE 2; §7.8.2.4',
  modes: ['MULTIVARIATE'],
  codes: { outputs_correlated: {}, outputs_singular: { ref: 'JCGM 102:2011 §9.4.2.3 Note 2, §7.8.1.2 Note 6' } },
  check(spec, result) {
    const out = [];
    const R = result.correlation || [], sym = result.symbols || [];
    for (let i = 0; i < R.length; i++) {
      for (let j = i + 1; j < R.length; j++) {
        if (Math.abs(R[i][j]) > THRESHOLDS.outputCorrelationAbs) {
          out.push(finding(rule, 'outputs_correlated', { key: `${sym[i]}+${sym[j]}`, param: `${sym[i]}, ${sym[j]}`, value: R[i][j].toFixed(3) }));
        }
      }
    }
    if (result.coverageRegion && result.coverageRegion.singular) out.push(finding(rule, 'outputs_singular', { ref: rule.codes.outputs_singular.ref }));
    return out;
  },
};
export default rule;
