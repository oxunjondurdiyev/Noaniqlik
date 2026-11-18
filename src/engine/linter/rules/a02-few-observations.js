/* A2 — kuzatuvlar soni kam.
   n_lt3   (warning) n < 3 (ya'ni n = 2): s ning nisbiy standart og'ishi ≈ 1/√(2(n − 1)) — n = 2 da 76 %, n = 3 da 52 %
                     (JCGM 100:2008 E.4.3, Table E.1). Bunday A tur bahosi juda ishonchsiz: birlashtirilgan s_p
                     (4.2.4) yoki B tur baholash tavsiya etiladi (EA-4/02 M:2022 §3.3.2, §5.5).
   n_small (info)    3 ≤ n < 5 — dvigatelning P00 dagi ogohlantirishi (kod o'zgarmagan).
   Chegara n < 3 — loyiha qarori (THRESHOLDS.minObservations). Faqat oddiy A tur (1-usul) uchun. */
import { finding, THRESHOLDS } from '../util.js';

const rule = {
  id: 'A2',
  severity: 'warning',
  ref: 'JCGM 100:2008 E.4.3 (Table E.1), 4.2.4; EA-4/02 M:2022 §5.3, §5.5',
  modes: ['GUM'],
  codes: { n_lt3: {}, n_small: { severity: 'info' } },
  check(spec, result) {
    const out = [];
    const small = new Set((result.warnings || []).filter(w => w.code === 'n_small').map(w => w.param));
    for (const inp of result.inputs || []) {
      if (inp.method !== 1 || !(inp.n > 1)) continue;
      if (inp.n < THRESHOLDS.minObservations) out.push(finding(rule, 'n_lt3', { param: inp.name, value: `n = ${inp.n}` }));
      else if (small.has(inp.name)) out.push(finding(rule, 'n_small', { param: inp.name, value: `n = ${inp.n}`, severity: 'info' }));
    }
    return out;
  },
};
export default rule;
