/* ═══════════════════════════════════════════════════════════════
   VALIDATION.JS (report) — P12: usul validatsiyasi bo'limi. Sof modul (DOM yo'q): HTML satrlari.
   Har bir test: statistika, kritik qiymat, α, xulosa, Ref; unverified qismlar belgi bilan; chiqarilgan nuqtalar va izohlari
   (kim — ROL, qachon). Belgilangan (Grubbs / Cochran) qiymat ko'rsatiladi — dastur uni o'chirmagan.
   Matnlar env.t (src/js/i18n-pt.js), qiymatlar env.esc orqali. Natija yaxlitlanmaydi (ko'rsatish: 5–6 qiymatli raqam).
═══════════════════════════════════════════════════════════════ */

const num = (v, sig) => (typeof v === 'number' && Number.isFinite(v) ? String(Number(v.toPrecision(sig || 6))) : (v === Infinity ? '∞' : '—'));
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] === undefined ? m : o[k]));

function lines(env, x) {
  const { t } = env;
  const L = [];
  const add = (k, o) => L.push(fill(t(k), o || {}));
  switch (x.type) {
    case 'grubbs':
      add('vl_grubbs_line', { side: t('vl_side_' + x.side), n: x.n, mean: num(x.mean), s: num(x.s), G: num(x.G, 5), crit: num(x.critical, 4), a: num(x.alpha) });
      add(x.outlier ? 'vl_grubbs_out' : 'vl_grubbs_in', { i: x.flaggedIndex === null ? '' : x.flaggedIndex + 1, v: num(x.value) });
      add('vl_grubbs_note');
      break;
    case 'cochran':
      add('vl_cochran_line', { p: x.p, n: x.n, C: num(x.C, 4), crit: num(x.critical, 4), a: num(x.alpha) });
      add(x.outlier ? 'vl_cochran_out' : 'vl_cochran_in', { i: x.flaggedIndex === null ? '' : x.flaggedIndex + 1 });
      break;
    case 'anova':
      add('vl_anova_line', { k: x.k, N: x.N, F: num(x.F, 4), crit: num(x.critical, 4), p: num(x.p, 3), a: num(x.alpha) });
      add(x.significant ? 'vl_anova_sig' : 'vl_anova_nsig');
      add('vl_anova_components', { sr: num(x.sr), sb: num(x.sb), sI: num(x.sI), nu: x.nu.sr, n0: num(x.n0, 5) });
      add(x.nuSIRule === 'negative_component' ? 'vl_anova_nu_si_neg' : 'vl_anova_nu_si', { nu: num(x.nu.sI, 3) });
      if (x.negative) add('vl_anova_negative', { v: num(x.sb2, 4) });
      break;
    case 'ttest':
      add('vl_ttest_line', { kind: t(x.equalVariance ? 'vl_t_equal' : 'vl_t_welch'), tail: t('vl_tail_' + x.tail), T: num(x.T, 6), df: num(x.df, 5), crit: num(x.critical, 5), p: num(x.p, 3), a: num(x.alpha) });
      add(x.reject ? 'vl_ttest_reject' : 'vl_ttest_keep');
      break;
    case 'ftest':
      add('vl_ftest_line', { tail: t('vl_tail_' + x.tail), F: num(x.F, 6), d1: x.df1, d2: x.df2, lo: num(x.lower, 4), hi: num(x.upper, 4), p: num(x.p, 3), a: num(x.alpha) });
      add(x.reject ? 'vl_ftest_reject' : 'vl_ftest_keep');
      break;
    case 'recovery':
      add('vl_recovery_line', { R: num(x.Rm), s: num(x.s), n: x.n, u: num(x.uRm), t: num(x.t, 4), crit: num(x.tCrit, 4), P: num(x.P), unit: x.relativeUnit === '1' ? '' : ' %' });
      add(x.significant ? 'vl_recovery_sig' : 'vl_recovery_nsig');
      break;
    case 'linearity': {
      const p = x.params || [];
      add('vl_linearity_line', { a: num(p[0] && p[0].value), b: num(p[1] && p[1].value), s: num(x.s), nu: x.nu });
      if (x.chi2 && x.chi2.applicable) add(x.chi2.pass ? 'vl_linearity_chi2_ok' : 'vl_linearity_chi2_fail', { obs: num(x.chi2.obs, 4), crit: num(x.chi2.crit, 4) });
      else add('vl_linearity_residuals', { r: (x.residuals || []).map(v => num(v, 3)).join('; ') });
      break;
    }
    case 'lod':
      if (x.method === 'blank') add('vl_lod_blank', { s0: num(x.s0), n: x.replicates, sp: num(x.s0Prime), lod: num(x.lod), loq: num(x.loq), kq: num(x.kQ) });
      else add('vl_lod_cal', { syx: num(x.syx), b: num(x.slope), lod: num(x.lod), loq: num(x.loq) });
      break;
    default: break;
  }
  return L;
}

/**
 * @param {{t:Function, esc:Function}} env
 * @param {object} r  evaluateValidation() natijasi
 * @param {{print?:boolean}} [opt]
 */
export function validationSectionHTML(env, r, opt = {}) {
  const { t, esc } = env;
  if (!r) return '';
  if (r.error) return `<div class="warn-box" data-vl-error="${esc(r.error)}">⚠ ${esc(t('vl_err_' + r.error))}</div>`;
  const head = (k, lvl) => (opt.print ? `<div class="print-section">${esc(t(k))}</div>` : `<div class="${lvl ? 'rg-card-title' : 'section-title'}">${esc(t(k))}</div>`);
  const meta = [['pt_f_method', r.method], ['pt_f_quantity', r.quantity], ['pt_f_matrix', r.matrix]].filter(x => x[1]).map(x => `${esc(t(x[0]))}: ${esc(x[1])}`).join(' · ');
  const blocks = r.tests.map(x => {
    // R-26 #4, #5 (egasi qarori 2026-11-19): tekshirilmagan test sarlavhada ham "(unverified)" belgisi bilan — bosma hisobotda ham
    const title = `${esc(x.id)} — ${esc(t('vl_type_' + x.type))}${x.label ? ' · ' + esc(x.label) : ''}${x.unverified ? ' <em data-vl-unverified-title="1">(unverified)</em>' : ''}`;
    if (x.error) return `<div class="vl-test" data-vl-test="${esc(x.id)}" data-vl-error="${esc(x.error)}"><p class="report-line"><strong>${title}</strong></p><p class="report-line">⚠ ${esc(t('vl_err_' + x.error))}${x.detail ? ' (' + esc(x.detail) + ')' : ''}</p></div>`;
    const body = lines(env, x).map(l => `<p class="report-line">${esc(l)}</p>`).join('');
    const unv = x.unverified || x.n0Unverified ? `<p class="report-line" data-vl-unverified="1"><em>⚠ (unverified) ${esc(t('vl_unverified_mark'))}</em></p>` : '';
    const ex = (x.excluded || []).length ? `<div data-vl-excluded="1"><p class="report-line"><strong>${esc(t('vl_excluded_title'))}</strong></p><ul>${x.excluded.map(e =>
      `<li>${esc(fill(t('vl_excluded_line'), { i: e.index + 1, v: e.value === undefined ? '' : num(e.value), c: e.comment, role: e.role || '—', at: String(e.at || '').slice(0, 10) }))}</li>`).join('')}</ul></div>` : '';
    return `<div class="vl-test" data-vl-test="${esc(x.id)}" data-vl-type="${esc(x.type)}"><p class="report-line"><strong>${title}</strong></p>${body}${unv}${ex}
      <p class="report-line text-xs">${esc(t('vl_ref'))}: ${esc(x.ref || '')}</p></div>`;
  }).join('');
  return `<div class="vl-report" data-report-validation="1">${head('vl_report_title')}${meta ? `<p class="report-line">${meta}</p>` : ''}${blocks}
    <p class="report-line text-xs">${esc(t('vl_report_note'))}</p></div>`;
}
