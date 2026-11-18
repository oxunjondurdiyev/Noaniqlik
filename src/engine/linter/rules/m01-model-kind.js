/* M1 — model turi (RISKS R-07): muvofiqlik bayonoti uchun model natijasi nima ekani aniq bo'lishi shart.
   'error' — ko'rsatish xatosi E = X − X_ref: MPE bilan |E| solishtiriladi;
   'value' — kattalik qiymati Y (nominal bilan): MPE bilan |Y − Y_nom| solishtiriladi;
   'unknown' — ko'rsatilmagan (eski saqlangan hisoblar): dastur |y| ni xato deb FARAZ QILMAYDI — muvofiqlik bayonoti
               berilmaydi va foydalanuvchidan tanlov so'raladi.
   Ref: JCGM 106:2012 §7.6.5 — MPE talabi "the error of indication must lie in an interval" (ya'ni chegara XATOga);
        §7.1.1 — umumiy holda tolerantlik oralig'i kattalikning O'ZIGA. Qaysi biri ekanini dastur bila olmaydi —
        shuning uchun tanlov foydalanuvchida (loyiha qoidasi, RISKS R-07). */
import { finding, gumState, isBlank, toNum } from '../util.js';

const rule = {
  id: 'M1',
  severity: 'warning',
  ref: 'JCGM 106:2012 §7.6.5 (MPE — ko\'rsatish xatosiga talab), §3.3.5 / §7.1.1 (tolerantlik oralig\'i — kattalik qiymatiga); ILAC G8:09/2019 §1.11, §1.16',
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
