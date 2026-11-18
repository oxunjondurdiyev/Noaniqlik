/* W2 — P08, P09, P10 modullarining warnings[] yozuvlari topilma sifatida (regressiya, top-down, namuna olish,
   sifatli testlar, mikrobiologiya, tibbiy laboratoriya). Kodlar, darajalar va manbalar O'ZGARMAGAN — ular
   modullarning o'z jadvallaridan olinadi (REGRESSION_WARNINGS, TOPDOWN_WARNINGS, …).
   Boshqa qoidalarga tegishli kodlar o'tkazib yuboriladi: x11_* → X11, x12_* → X12, zero_u → X8.
   Eski warnings[] maydoni bir versiya davomida moslik uchun qoladi (deprecated, ENGINE 2.4.0). */
import { finding } from '../util.js';
import { REGRESSION_WARNINGS } from '../../regression/index.js';
import { TOPDOWN_WARNINGS } from '../../topdown/index.js';
import { SAMPLING_WARNINGS } from '../../sampling/index.js';
import { QUALITATIVE_WARNINGS } from '../../qualitative/index.js';
import { MICRO_WARNINGS } from '../../micro/index.js';
import { MEDICAL_WARNINGS } from '../../medical/index.js';

const OWNED = code => code === 'zero_u' || /^x1[12]_/.test(code);
const UNVERIFIED = /unverified|repoda yo'q|tekshirilmagan/i;

const codes = {};
for (const table of [REGRESSION_WARNINGS, TOPDOWN_WARNINGS, SAMPLING_WARNINGS, QUALITATIVE_WARNINGS, MICRO_WARNINGS, MEDICAL_WARNINGS]) {
  for (const [code, w] of Object.entries(table)) {
    if (!OWNED(code) && !codes[code]) codes[code] = { severity: w.severity, ref: w.ref, unverified: UNVERIFIED.test(w.ref) || /_unverified$/.test(code) };
  }
}

const rule = {
  id: 'W2',
  severity: 'warning',
  ref: '',
  modes: ['REGRESSION', 'TOP_DOWN', 'SAMPLING', 'QUALITATIVE', 'MICRO', 'MEDICAL'],
  codes,
  check(spec, result) {
    const out = [];
    (result.warnings || []).forEach((w, i) => {
      if (OWNED(w.code)) return;
      const c = codes[w.code] || {};
      out.push(finding(rule, w.code, { value: w.value, key: w.value !== undefined ? `#${i}` : '',
        severity: w.severity || c.severity || 'warning', ref: w.ref || c.ref || '', unverified: c.unverified }));
    });
    return out;
  },
};
export default rule;
