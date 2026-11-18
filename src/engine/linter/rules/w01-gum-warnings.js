/* W1 — GUM yo'lining (src/engine/evaluate.js, typeA.js) boshqa ogohlantirishlari topilma sifatida.
   Kodlar O'ZGARMAGAN (UI matni w_<code>); bu yerda ularga daraja va manba biriktiriladi.
   Boshqa qoidalarga tegishli kodlar bu yerda yo'q: zero_u, below_cmc, zero_s → X8; n_small → A2; unit_* → X6. */
import { finding } from '../util.js';

const rule = {
  id: 'W1',
  severity: 'warning',
  ref: 'JCGM 100:2008',
  modes: ['GUM'],
  codes: {
    // c_i hisoblanmadi → hissa byudjetdan tushib qoladi: natija ishonchsiz
    c_nan: { severity: 'error', ref: 'JCGM 100:2008 5.1.3' },
    c_zero: { ref: 'JCGM 100:2008 5.1.2 Note, 5.1.3' },
    c_mismatch: { ref: 'JCGM 100:2008 5.1.3' },
    c_numeric: { severity: 'info', ref: 'JCGM 100:2008 5.1.3 Note 2' },
    nonlinear: { ref: 'JCGM 100:2008 5.1.2 Note; JCGM 101:2008 §5.7, §8' },
    nu_lt1: { ref: 'JCGM 100:2008 G.4.1' },
    dir_missing: { ref: 'JCGM 100:2008 F.2.2.2, 4.2.8' },
    sp_missing: { ref: 'JCGM 100:2008 4.2.4' },
    coomet_small: { ref: 'COOMET R/GM/32:2017 (unverified)', unverified: true },
  },
  check(spec, result) {
    const out = [];
    (result.warnings || []).forEach((w, i) => {
      const c = rule.codes[w.code];
      if (!c) return;
      out.push(finding(rule, w.code, { param: w.param, value: w.value, key: w.param || (w.value !== undefined ? `#${i}` : ''),
        severity: c.severity || rule.severity, ref: c.ref, unverified: c.unverified }));
    });
    return out;
  },
};
export default rule;
