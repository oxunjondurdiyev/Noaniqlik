/* X5 — rezolyutsiya (ajratish qobiliyati) manbasi noto'g'ri bo'luvchi bilan; boshqa noodatiy bo'luvchilar.
   Rezolyutsiya δ bo'lsa: to'g'ri burchakli taqsimot, kenglik δ → u = δ/(2√3) = 0,29·δ (JCGM 100:2008 F.2.2.1).
   Dasturda ikki to'g'ri yo'l bor: 'resol' (δ kiritiladi, bo'luvchi 2√3) yoki 'rect' (yarim kenglik δ/2, bo'luvchi √3).
   Tipik xato: 'rect' ga to'liq δ kiritiladi (u ikki baravar katta) yoki 'resol' ga δ/2 (u ikki baravar kichik).
   δ ni kuzatuvlarning o'nlik xonalaridan taxmin qilish mumkin bo'lsa (kasr qismi bor qiymatlar) — solishtiriladi;
   aks holda 'rect' uchun faqat eslatma (info). Normal taqsimotda k < 1 yoki k > 4 — noodatiy bo'luvchi. */
import { finding, gumState, typeBOf, isResolutionLike, isBlank, toNum, short, THRESHOLDS } from '../util.js';
import { valueOrExpr } from '../../typeB.js';

/** Kuzatuvlarning eng kichik o'nlik qadami (kasr qismi bor bo'lsa) — aks holda null. */
function observedStep(values) {
  let d = 0, n = 0;
  for (const v of values || []) {
    if (isBlank(v)) continue;
    n++;
    const m = String(v).replace(',', '.').match(/\.(\d+)(?:e|$)/i);
    if (m) d = Math.max(d, m[1].length);
  }
  return n >= 2 && d >= 1 ? Math.pow(10, -d) : null;
}
const near = (a, b) => Math.abs(a - b) <= 0.01 * Math.abs(b);

const rule = {
  id: 'X5',
  severity: 'warning',
  ref: 'JCGM 100:2008 F.2.2.1, 4.3.7',
  modes: ['GUM'],
  codes: {
    x5_resolution_divisor: {},
    x5_resolution_distribution: {},
    x5_resolution_rect: { severity: 'info' },
    x5_unusual_divisor: { ref: 'JCGM 100:2008 4.3.3, 4.3.4' },
  },
  check(spec, result) {
    const state = gumState(spec);
    if (!state) return [];
    const means = Object.fromEntries((result.inputs || []).map(i => [i.name, i.mean]));
    const out = [];
    for (const c of typeBOf(state)) {
      const source = c.name || `#${c.index + 1}`;
      if (c.distribution === 'normal' && !isBlank(c.k)) {
        const k = toNum(c.k);
        if (isFinite(k) && k > 0 && (k < THRESHOLDS.unusualKMin || k > THRESHOLDS.unusualKMax)) {
          out.push(finding(rule, 'x5_unusual_divisor', { source, param: c.param, value: `k = ${short(k, 4)}`, ref: rule.codes.x5_unusual_divisor.ref }));
        }
      }
      if (!isResolutionLike(c)) continue;
      if (c.distribution !== 'rect' && c.distribution !== 'resol') {
        out.push(finding(rule, 'x5_resolution_distribution', { source, param: c.param, value: String(c.distribution || '') }));
        continue;
      }
      let a = NaN;
      try { a = Math.abs(valueOrExpr(c.halfWidth, state.params || [], means)); } catch (_) { /* dvigatel xato qaytargan bo'lardi */ }
      const mult = isBlank(c.sensitivity) ? 1 : Number(c.sensitivity);
      const step = mult === 1 ? observedStep((state.measurements || {})[c.param]) : null;
      if (step !== null && isFinite(a) && a > 0) {
        if (c.distribution === 'rect' && near(a, step)) out.push(finding(rule, 'x5_resolution_divisor', { source, param: c.param, value: `a = ${short(a, 4)} = δ; √3` }));
        else if (c.distribution === 'resol' && near(a, step / 2)) out.push(finding(rule, 'x5_resolution_divisor', { source, param: c.param, value: `d = ${short(a, 4)} = δ/2; 2√3` }));
      } else if (c.distribution === 'rect') {
        out.push(finding(rule, 'x5_resolution_rect', { source, param: c.param, severity: 'info' }));
      }
    }
    return out;
  },
};
export default rule;
