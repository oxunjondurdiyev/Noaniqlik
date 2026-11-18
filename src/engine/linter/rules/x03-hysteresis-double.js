/* X3 — histerezis ikki marta hisoblangan.
   (i)  ↑/↓ o'qishlar bor, lekin A tur BARCHA o'qishlardan (yo'nalishlarga ajratmasdan) hisoblangan — yo'nalishlar
        orasidagi farq allaqachon s ichida — va histerezis yana alohida B tur manba sifatida qo'shilgan;
   (ii) ↑/↓ rejimi yoqilgan (dvigatel histerezisni o'zi qo'shadi: h/2, to'g'ri burchakli) va qo'lda yana histerezis manbasi bor.
   Ref: JCGM 100:2008 4.3.10 — "It is important not to double-count uncertainty components". */
import { finding, gumState, typeBOf, isHysteresisLike, isBlank } from '../util.js';

const rule = {
  id: 'X3',
  severity: 'warning',
  ref: 'JCGM 100:2008 4.3.10, F.2.2.2',
  modes: ['GUM'],
  codes: { x3_hysteresis_double: {} },
  check(spec, result) {
    const state = gumState(spec);
    if (!state) return [];
    const dirs = state.directions || [];
    const out = [];
    for (const inp of result.inputs || []) {
      const manual = typeBOf(state).filter(c => c.param === inp.name && isHysteresisLike(c));
      if (!manual.length) continue;
      const obs = (state.measurements || {})[inp.name] || [];
      const has = d => obs.some((v, i) => !isBlank(v) && dirs[i] === d);
      const bothDirections = has('↑') && has('↓');
      const auto = (result.budget || []).some(b => b.kind === 'B' && b.auto && b.param === inp.name);
      if (auto) manual.forEach(c => out.push(finding(rule, 'x3_hysteresis_double', { param: inp.name, source: c.name, value: 'auto' })));
      else if (bothDirections && !inp.directional && inp.n > 1) manual.forEach(c => out.push(finding(rule, 'x3_hysteresis_double', { param: inp.name, source: c.name, value: 'A' })));
    }
    return out;
  },
};
export default rule;
