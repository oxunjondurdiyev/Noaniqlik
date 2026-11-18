/* M1 — model turi (RISKS R-07): muvofiqlik bayonoti uchun model natijasi nima ekani aniq bo'lishi shart.
   'error' — ko'rsatish xatosi E = X − X_ref: MPE bilan |E| solishtiriladi;
   'value' — kattalik qiymati Y (nominal bilan): MPE bilan |Y − Y_nom| solishtiriladi;
   'unknown' — ko'rsatilmagan (eski saqlangan hisoblar): dastur |y| ni xato deb FARAZ QILMAYDI — muvofiqlik bayonoti
               berilmaydi va foydalanuvchidan tanlov so'raladi.
   Ref: ISO/IEC 17025:2017 §7.8.6 va JCGM 106:2012 — docs/references da yo'q → unverified (loyiha qoidasi). */
import { finding, gumState, isBlank, toNum } from '../util.js';

const rule = {
  id: 'M1',
  severity: 'warning',
  ref: 'ISO/IEC 17025:2017 §7.8.6 (unverified); JCGM 106:2012 §7 (unverified)',
  unverified: true,
  modes: ['GUM'],
  codes: { model_kind_unknown: {}, model_value_no_nominal: {} },
  check(spec, result) {
    const state = gumState(spec);
    if (!state) return [];
    const settings = state.settings || {};
    if (isBlank(settings.mpe)) return [];
    const kind = result.modelKind || 'unknown';
    if (kind === 'unknown') return [finding(rule, 'model_kind_unknown')];
    if (kind === 'value' && !isFinite(toNum(settings.nominal))) return [finding(rule, 'model_value_no_nominal')];
    return [];
  },
};
export default rule;
