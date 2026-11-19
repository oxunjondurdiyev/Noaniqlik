/* L3 — oxirgi malaka sinovi (PT) raundi qoniqarsiz (P12; egasi qarori 2026-11-19, R-26 #6 — info darajasida).
   Hisob PT seriyasiga ANIQ bog'langan bo'lsa ishlaydi: `settings.ptLink` — seriyaning hisobga yozilgan NUSXASI
   { seriesId, version, name, quantity, method, lastRound: { id, date, primary, score, verdict } } (src/engine/pt/index.js::ptLinkOf;
   reestr nusxasi kabi — seriya o'zgarsa eski hisob o'zgarmaydi). Baho nusxadan olinadi, qayta hisoblanmaydi.
   pt_last_unsatisfactory (info)  oxirgi raund bahosi "qoniqarsiz" (PT_LIMITS — loyiha standarti, egasi tasdiqladi R-26 #1).
   Maqsad — ISO/IEC 17025:2017 §7.7.2 (standart repoda yo'q — topilma `ref` ida keltirilmaydi, linter qoidasi);
   baho chegaralari — ISO 13528:2022 (unverified); daraja — docs/LINTER_RULES.md §4 #30. */
import { finding, gumState, short } from '../util.js';

const settingsOf = spec => {
  if (spec && spec.format === 'uc-topdown/1') return spec.settings || {};
  const st = gumState(spec);
  return (st && st.settings) || {};
};

const rule = {
  id: 'L3',
  severity: 'info',
  ref: 'ISO 13528:2022 §9 (unverified); docs/LINTER_RULES.md §4 #30 (loyiha qoidasi, egasi qarori 2026-11-19)',
  unverified: true,
  modes: ['GUM', 'TOP_DOWN'],
  codes: { pt_last_unsatisfactory: {} },
  check(spec) {
    const link = settingsOf(spec).ptLink;
    const last = link && link.lastRound;
    if (!last || last.verdict !== 'unsatisfactory') return [];
    const score = typeof last.score === 'number' ? short(last.score, 3) : '—';
    return [finding(rule, 'pt_last_unsatisfactory', {
      key: String(link.seriesId || ''),
      value: `${link.name || link.seriesId || ''}: ${last.id || ''}${last.date ? ' (' + last.date + ')' : ''}, ${last.primary || ''} = ${score}`,
    })];
  },
};
export default rule;
