/* X10 — etalon manbasi bor, lekin drift / uzoq muddatli barqarorlik manbasi yo'q (info).
   Etalonning qiymati oxirgi kalibrlashdan beri o'zgargan bo'lishi mumkin; EA-4/02 M:2022 misollarining deyarli
   barchasida bu alohida kirish kattalik: S2.4 (δm_D), S3.4 (δR_D), S4.4 (δl_D), S5.11, S6.6, S7.5; Appendix C (C3).
   Info darajasi: drift ahamiyatsiz bo'lishi yoki sertifikat U siga kiritilgan bo'lishi mumkin — qaror laboratoriyada. */
import { finding, gumState, typeBOf, isReferenceLike, isResolutionLike, isDriftLike } from '../util.js';

const rule = {
  id: 'X10',
  severity: 'info',
  ref: 'EA-4/02 M:2022 Appendix C (C3), S2.4, S3.4, S4.4',
  modes: ['GUM'],
  codes: { x10_no_drift: {} },
  check(spec) {
    const state = gumState(spec);
    if (!state) return [];
    const comps = typeBOf(state);
    const refs = comps.filter(c => isReferenceLike(c) && !isResolutionLike(c));
    if (!refs.length || comps.some(isDriftLike)) return [];
    return [finding(rule, 'x10_no_drift', { source: refs.map(c => c.name).filter(Boolean).join('; ') || undefined, key: '' })];
  },
};
export default rule;
