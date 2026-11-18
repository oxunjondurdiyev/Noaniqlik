/* X6 — birliklar mos emas, sezgirlik ko'paytuvchisi 1.
   (i)  Dvigatelning o'lchamlik tahlili ogohlantirishlari (P03): unit_budget, unit_output, unit_affine, unit_pow —
        kodlar o'zgarmagan holda topilmaga aylanadi.
   (ii) Bitta kirishga tegishli B tur manba birligi kirish birligidan (yoki shu kirishning boshqa manbasi birligidan)
        farq qiladi — o'lchamlik bir xil bo'lsa ham masshtab boshqa (mK va K, mA va A) — ko'paytuvchi esa 1.
   Ref: JCGM 100:2008 5.1.3 (c_i·u(x_i) natija birligida bo'lishi shart); JCGM GUM-6:2020 §11 — repoda yo'q. */
import { finding, gumState, typeBOf, isBlank } from '../util.js';
import { parseUnit, dimEqual } from '../../units.js';

const ENGINE_CODES = ['unit_budget', 'unit_output', 'unit_affine', 'unit_pow'];
const sameScale = (a, b) => dimEqual(a.dim, b.dim) && Math.abs(a.factor - b.factor) <= 1e-12 * Math.abs(b.factor);

const rule = {
  id: 'X6',
  severity: 'warning',
  ref: 'JCGM 100:2008 5.1.3; JCGM GUM-6:2020 §11 (unverified)',
  modes: ['GUM'],
  codes: { unit_budget: {}, unit_output: {}, unit_affine: {}, unit_pow: {}, x6_source_units_differ: {} },
  check(spec, result) {
    const out = [];
    (result.warnings || []).filter(w => ENGINE_CODES.includes(w.code)).forEach((w, i) =>
      out.push(finding(rule, w.code, { param: w.param, value: w.value, key: `${w.param || ''}#${i}` })));
    const state = gumState(spec);
    if (!state) return out;
    const units = state.units || {};
    const flaggedByEngine = new Set((result.warnings || []).filter(w => w.code === 'unit_budget').map(w => w.param));
    for (const p of state.params || []) {
      const comps = typeBOf(state).filter(c => c.param === p && !isBlank(c.unit) && (isBlank(c.sensitivity) || Number(c.sensitivity) === 1));
      const parsed = comps.map(c => ({ c, u: parseUnit(c.unit) })).filter(x => x.u);
      const base = parseUnit(units[p]) ? { name: units[p], u: parseUnit(units[p]) } : (parsed[0] ? { name: parsed[0].c.unit, u: parsed[0].u } : null);
      if (!base) continue;
      for (const { c, u } of parsed) {
        if (sameScale(u, base.u)) continue;
        if (!dimEqual(u.dim, base.u.dim) && flaggedByEngine.has(p)) continue;   // dvigatel allaqachon unit_budget bergan
        out.push(finding(rule, 'x6_source_units_differ', { param: p, source: c.name || `#${c.index + 1}`, value: `${c.unit} ≠ ${base.name}` }));
      }
    }
    return out;
  },
};
export default rule;
