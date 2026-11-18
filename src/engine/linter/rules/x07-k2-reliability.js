/* X7 — k = 2 qat'iy olingan, lekin standart noaniqlik yetarlicha ishonchli emas.
   EA-4/02 M:2022 §5.1: k = 2 — natijaga normal taqsimot mos kelsa VA u(y) yetarlicha ishonchli bo'lsa;
   §5.3: ishonchlilik ν_eff bilan aniqlanadi; A tur baholashlarining hech biri 10 tadan kam kuzatuvga asoslanmagan
   bo'lsa, mezon bajarilgan hisoblanadi; §5.5 + Appendix E: aks holda k = t_P(ν_eff).
   JCGM 100:2008 G.6.6: ν_eff "say greater than 10" bo'lsa k = 2 ≈ 95 %.
   Egasi qarori (2026-11-18): ν_eff < 10 → warning (G.6.6 chegarasi); 10 ≤ ν_eff < 30 → info (loyiha chegarasi).
   "A tur ulushi > 30 %" — loyiha qarori (THRESHOLDS); n < 10 — EA-4/02 §5.3 dan. */
import { finding, short, THRESHOLDS } from '../util.js';

const rule = {
  id: 'X7',
  severity: 'warning',
  ref: 'EA-4/02 M:2022 §5.1, §5.3, §5.5, Appendix E; JCGM 100:2008 G.6.6',
  modes: ['GUM'],
  codes: { x7_k2_low_dof: {}, x7_k2_few_observations: {} },
  check(spec, result) {
    if (result.kMethod !== 'k2') return [];
    if (isFinite(result.nuEff) && result.nuEff < THRESHOLDS.k2MinNuEff) {
      // Ref: JCGM 100:2008 G.6.6 — k = 2 ≈ 95 % faqat ν_eff "say greater than 10" bo'lsa
      const severity = result.nuEff < THRESHOLDS.k2WarnNuEff ? 'warning' : 'info';
      return [finding(rule, 'x7_k2_low_dof', { value: `ν_eff = ${short(result.nuEff, 3)}`, severity })];
    }
    const rowsA = (result.budget || []).filter(b => b.kind === 'A' && b.method !== 2);
    const share = rowsA.reduce((s, b) => s + (isFinite(b.share) ? b.share : 0), 0);
    const few = rowsA.filter(b => b.n < THRESHOLDS.k2MinObservations && b.contrib > 0);
    if (share > THRESHOLDS.k2TypeASharePct && few.length) {
      return [finding(rule, 'x7_k2_few_observations', { param: few.map(b => b.param).join(', '), value: `${short(share, 3)} %; n = ${Math.min(...few.map(b => b.n))}` })];
    }
    return [];
  },
};
export default rule;
