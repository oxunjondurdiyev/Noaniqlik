/* A1 — bitta manba ulushi chegaradan katta (info).
   Bitta hissa ustun bo'lsa, natijaning taqsimoti shu hissaning taqsimotiga yaqin bo'ladi (EA-4/02 M:2022 S8.3):
   to'g'ri burchakli ustun hissada 95 % uchun k = 1,65 (S9.14), k = 2 yoki t_P(ν_eff) esa ortiqcha (konservativ) qamrov
   beradi. Markaziy limit teoremasi sharti — "comparable amounts" (JCGM 100:2008 G.2.3, G.6.6; EA-4/02 §5.2) —
   bajarilmaydi. Chegara 90 % — loyiha qarori (THRESHOLDS.dominantSharePct). */
import { finding, short, THRESHOLDS } from '../util.js';

const rule = {
  id: 'A1',
  severity: 'info',
  ref: 'EA-4/02 M:2022 §5.2, §5.6, S8.3, S9.14; JCGM 100:2008 G.2.3, G.6.6',
  modes: ['GUM', 'TOP_DOWN'],
  codes: { dominant_source: {} },
  check(spec, result) {
    const rows = (result.budget || []).filter(b => b.kind !== 'corr' && b.kind !== 'second' && b.included !== false && isFinite(b.share));
    if (rows.length < 2) return [];
    const top = rows.reduce((m, b) => (b.share > m.share ? b : m), rows[0]);
    if (!(top.share > THRESHOLDS.dominantSharePct)) return [];
    const name = top.kind === 'A' ? `${top.name} (A)` : (top.name || top.id || top.kind);
    return [finding(rule, 'dominant_source', { key: '', source: name, value: `${short(top.share, 3)} %` })];
  },
};
export default rule;
