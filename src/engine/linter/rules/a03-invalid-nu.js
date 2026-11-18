/* A3 — erkinlik darajasi noto'g'ri kiritilgan (ν ≤ 0 yoki son emas).
   ν — musbat son (JCGM 100:2008 G.3.3: ν = n − 1; G.4.2: B tur uchun ν ≈ ½[Δu/u]⁻², ishonchli bo'lsa ν → ∞).
   Dvigatel noto'g'ri ν ni jimgina ∞ deb oladi (ν ko'rsatilmagan holat kabi) — natijada ν_eff va k optimistik bo'lishi
   mumkin, shuning uchun bu error: qiymatni tuzatish yoki bo'sh qoldirish (∞) kerak. */
import { finding, gumState, typeBOf, isBlank, toNum } from '../util.js';

const bad = v => !isBlank(v) && !(toNum(v) > 0);

const rule = {
  id: 'A3',
  severity: 'error',
  ref: 'JCGM 100:2008 G.3.3, G.4.1, G.4.2',
  modes: ['GUM'],
  codes: { invalid_nu: {} },
  check(spec) {
    const state = gumState(spec);
    if (!state) return [];
    const out = [];
    typeBOf(state).forEach(c => {
      if (bad(c.nu)) out.push(finding(rule, 'invalid_nu', { param: c.param, source: c.name || `#${c.index + 1}`, value: `ν = ${c.nu}` }));
    });
    const typeA = (state.settings || {}).typeA || {};
    (state.params || []).forEach(p => {
      const o = typeA[p];
      if (o && Number(o.method) === 2 && bad(o.nup)) out.push(finding(rule, 'invalid_nu', { param: p, source: 's_p', value: `ν_p = ${o.nup}` }));
    });
    return out;
  },
};
export default rule;
