/* X4 — korrelyatsiya hisobga olinmagan.
   (i)  Juftlangan kuzatuvlar qatorida |r| chegaradan katta, lekin "juftlangan" sozlamasi o'chirilgan —
        kovariatsiya hadi 2·c_i·c_j·u(x_i, x_j) tushib qolgan (JCGM 100:2008 5.2.2 Eq. 13, 5.2.3 Eq. 17, F.1.2.2).
   (ii) Ikki kirish kattalik bitta etalon / sertifikat manbasidan foydalanadi (bir xil nomli manba), lekin
        kovariatsiya 0 (5.2.4, F.1.2.3).
   Chegara |r| > 0,5 — loyiha qarori (THRESHOLDS.correlationAbs); manbada son yo'q: 5.2.5 — "cannot be ignored if
   present and significant". "Significant" sharti uchun qo'shimcha statistik tekshiruv: ρ = 0 gipotezasining t-testi,
   t = |r|·√((n − 2)/(1 − r²)) > t_{1−α/2}(n − 2), α = 0,05 — kichik n da tasodifiy |r| > 0,5 ni ogohlantirishga
   aylantirmaslik uchun (loyiha qarori; masalan n = 12, r = 0,53 → t = 1,96 < 2,23 — ahamiyatli emas). */
import { finding, gumState, typeBOf, isReferenceLike, isResolutionLike, toNum, short, THRESHOLDS } from '../util.js';
import { correlation } from '../../typeA.js';
import { tQuantile } from '../../special.js';

/** ρ = 0 gipotezasi t-testi (ikki tomonlama, α): r ahamiyatlimi? */
export function correlationSignificant(r, n, alpha) {
  if (!(n > 2)) return false;
  if (Math.abs(r) >= 1) return true;
  const t = Math.abs(r) * Math.sqrt((n - 2) / (1 - r * r));
  return t > tQuantile(1 - alpha, n - 2);
}

const rule = {
  id: 'X4',
  severity: 'warning',
  ref: 'JCGM 100:2008 5.2.2, 5.2.3, 5.2.5, F.1.2.2',
  modes: ['GUM'],
  codes: { x4_correlation_ignored: {}, x4_shared_reference: { ref: 'JCGM 100:2008 5.2.4, F.1.2.3; EA-4/02 M:2022 Appendix D (D4)' } },
  check(spec, result) {
    const state = gumState(spec);
    if (!state) return [];
    const out = [];
    const settings = state.settings || {};
    const inputs = result.inputs || [];
    const rowVals = name => ((state.measurements || {})[name] || []).map(toNum);
    const comps = typeBOf(state);
    for (let i = 0; i < inputs.length; i++) {
      for (let j = i + 1; j < inputs.length; j++) {
        const a = inputs[i], b = inputs[j];
        const pair = (result.pairs || []).find(p => p.a === a.name && p.b === b.name);
        // (i) juftlangan qatorlar, korrelyatsiya o'chiq
        if (settings.paired === false && a.uA > 0 && b.uA > 0) {
          const xa = rowVals(a.name), xb = rowVals(b.name);
          const nPairs = xa.filter((v, r) => isFinite(v) && isFinite(xb[r])).length;
          if (nPairs >= THRESHOLDS.correlationMinPairs && nPairs === a.n && nPairs === b.n) {
            const r = correlation(xa, xb);
            if (Math.abs(r) > THRESHOLDS.correlationAbs && correlationSignificant(r, nPairs, THRESHOLDS.correlationAlpha)) out.push(finding(rule, 'x4_correlation_ignored', { key: `${a.name}|${b.name}`, param: `${a.name} ↔ ${b.name}`, value: `r = ${short(r, 3)} (n = ${nPairs})` }));
          }
        }
        // (ii) bir xil etalon manbasi ikki kirishda, kovariatsiya 0
        if (pair && pair.covB === 0) {
          const ca = comps.filter(c => c.param === a.name && isReferenceLike(c) && !isResolutionLike(c) && c.name);
          const shared = ca.find(c => comps.some(d => d.param === b.name && d.name === c.name && isReferenceLike(d) && !isResolutionLike(d)));
          if (shared) out.push(finding(rule, 'x4_shared_reference', { key: `${a.name}|${b.name}`, param: `${a.name} ↔ ${b.name}`, source: shared.name, ref: rule.codes.x4_shared_reference.ref }));
        }
      }
    }
    return out;
  },
};
export default rule;
