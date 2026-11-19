/* ═══════════════════════════════════════════════════════════════
   PT.JS (report) — P12: malaka sinovi (PT) natijalari bo'limi. Sof modul (DOM yo'q): HTML satrlari.
   Har bir raund: x, x_pt, σ_pt yoki U, ball(lar), baho, chegara manbasi; tarix grafigi (SVG, skriptsiz).
   Chegaralar va formulalar — unverified belgi bilan (ISO 13528 / Eurachem PT Guide repoda yo'q, R-26).
   Matnlar env.t (src/js/i18n-pt.js), qiymatlar env.esc orqali. Natija yaxlitlanmaydi — faqat ko'rsatish (6 qiymatli raqam,
   ball — 3 qiymatli raqam; ISO 13528 — unverified).
═══════════════════════════════════════════════════════════════ */
import { ptChartSVG, ptChartFamilies, scoreText } from './pt-chart.js';

const num = (v, sig) => (typeof v === 'number' && Number.isFinite(v) ? String(Number(v.toPrecision(sig || 6))) : '—');
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] === undefined ? m : o[k]));
const SCORE_KEYS = ['z', 'zPrime', 'zeta', 'En'];
export { scoreText };

/**
 * @param {{t:Function, esc:Function}} env
 * @param {object} r  evaluatePT() natijasi
 * @param {{print?:boolean, title?:string}} [opt]
 */
export function ptSectionHTML(env, r, opt = {}) {
  const { t, esc } = env;
  if (!r) return '';
  if (r.error) return `<div class="warn-box" data-pt-error="${esc(r.error)}">⚠ ${esc(t('pt_err_' + r.error))}${r.detail ? ' (' + esc(r.detail) + ')' : ''}</div>`;
  const cls = opt.print ? 'print-table' : 'data-table';
  const head = k => (opt.print ? `<div class="print-section">${esc(t(k))}</div>` : `<div class="section-title">${esc(t(k))}</div>`);
  const meta = [['pt_f_quantity', r.quantity], ['pt_f_method', r.method], ['pt_f_matrix', r.matrix]].filter(x => x[1])
    .map(x => `${esc(t(x[0]))}: ${esc(x[1])}`).join(' · ');
  const rows = r.rounds.map(x => {
    const u = x.unit ? ' ' + x.unit : '';
    const scores = SCORE_KEYS.map(k => {
      const v = x.scores[k];
      const cell = v === null ? `<span class="text-muted" title="${esc(t('pt_reason_' + x.reasons[k]))}">—</span>` : esc(scoreText(v));
      return `<td class="num"${k === x.primary ? ' data-pt-primary="1"' : ''}>${k === x.primary ? `<strong>${cell}</strong>` : cell}</td>`;
    }).join('');
    return `<tr data-pt-round="${esc(x.id)}" data-pt-verdict="${esc(x.verdict)}">
      <td>${esc(x.id)}${x.date ? `<br><small>${esc(x.date)}</small>` : ''}${x.scheme ? `<br><small>${esc(x.scheme)}</small>` : ''}</td>
      <td class="num">${esc(num(x.x) + u)}</td><td class="num">${esc(num(x.xpt) + u)}</td>
      <td class="num">${esc(x.sigmaPt === null ? '—' : num(x.sigmaPt) + u)}</td>
      <td class="num">${esc(x.uxpt === null ? '—' : num(x.uxpt))}</td>
      <td class="num">${esc(x.Ux === null ? '—' : num(x.Ux))} / ${esc(x.Uxpt === null ? '—' : num(x.Uxpt))}</td>
      ${scores}<td><strong>${esc(t('pt_verdict_' + x.verdict))}</strong><br><small>${esc(t('pt_score_' + x.primary))}</small></td></tr>`;
  }).join('');
  const table = `<table class="${cls}" data-pt-table="1"><thead><tr>${['pt_col_round', 'pt_col_x', 'pt_col_xpt', 'pt_col_sigma', 'pt_col_uxpt', 'pt_col_U', 'pt_score_z', 'pt_score_zPrime', 'pt_score_zeta', 'pt_score_En', 'pt_col_verdict']
    .map(k => `<th>${esc(t(k))}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  const fam = ptChartFamilies(r.rounds);
  const label = v => t('pt_verdict_' + v);
  const charts = (fam.z.length ? ptChartSVG(fam.z, { esc, family: 'z', title: t('pt_chart_z'), label }) : '')
    + (fam.En.length ? ptChartSVG(fam.En, { esc, family: 'En', title: t('pt_chart_en'), label }) : '');
  const limits = fill(t('pt_limits_line'), { w: num(r.limits.warn), a: num(r.limits.action), e: num(r.limits.en) });
  const counts = fill(t('pt_counts_line'), { n: r.n, s: r.counts.satisfactory, q: r.counts.questionable, u: r.counts.unsatisfactory });
  return `<div class="pt-report" data-report-pt="1">${head('pt_report_title')}
    ${meta ? `<p class="report-line">${meta}</p>` : ''}
    <p class="report-line" data-pt-formulas="1">${esc(t('pt_formulas'))}</p>
    ${table}
    <p class="report-line" data-pt-counts="1">${esc(counts)}</p>
    <p class="report-line" data-pt-limits="1"><strong>${esc(t('pt_limits_title'))}:</strong> ${esc(limits)} — ${esc(t('pt_limits_source'))} <em>(${esc(r.limitsRef)})</em></p>
    <p class="report-line" data-pt-score-rule="1">${esc(fill(t('pt_score_rule'), { tol: '10⁻¹²' }))}</p>
    ${r.mixedUnits ? `<p class="report-line" data-pt-mixed="1">⚠ ${esc(t('pt_mixed_units'))}</p>` : ''}
    ${charts ? `${head('pt_chart_title')}<div class="pt-charts">${charts}</div><p class="report-line text-xs">${esc(t('pt_chart_note'))}</p>` : ''}
  </div>`;
}
