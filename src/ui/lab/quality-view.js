/* ═══════════════════════════════════════════════════════════════
   LAB/QUALITY-VIEW.JS — P12: "Malaka sinovlari" va "Validatsiya" bo'limlarining HTML satrlari. Sof modul: DOM'ga tegmaydi.
   Har qanday qiymat ctx.esc (escHtml) orqali; ctx = { t(key), esc(value) }. Hodisalar — quality.js da (data-pt-* / data-vl-*;
   inline handler yo'q — CSP). Hisobot bo'limlari — src/report/pt.js, src/report/validation.js (ekranda ham shular).
═══════════════════════════════════════════════════════════════ */
import { PT_SCORES, VALIDATION_TESTS, GRUBBS_SIDES, TAILS, LOD_METHODS } from '../../engine/index.js';
import { ptSectionHTML } from '../../report/pt.js';
import { validationSectionHTML } from '../../report/validation.js';
import { findingsBlockHTML } from '../../report/findings.js';
import { historyHTML } from './view.js';

const opt = (ctx, value, label, cur) => `<option value="${ctx.esc(value)}"${String(cur ?? '') === String(value) ? ' selected' : ''}>${ctx.esc(label)}</option>`;
const dis = b => (b ? ' disabled' : '');
const inp = (ctx, attr, value, o = {}) =>
  `<input type="${o.type || 'text'}"${o.decimal ? ' inputmode="decimal"' : ''} ${attr} value="${ctx.esc(value ?? '')}"${o.ph ? ` placeholder="${ctx.esc(o.ph)}"` : ''}${dis(o.ro)} autocomplete="off" />`;
const area = (ctx, attr, value, rows) => `<textarea ${attr} rows="${rows || 3}" spellcheck="false" class="td-area">${ctx.esc(value ?? '')}</textarea>`;
const field = (ctx, labelKey, inner, hintKey) =>
  `<label class="rg-field"><span>${ctx.esc(ctx.t(labelKey))}</span>${inner}${hintKey ? `<small class="text-muted">${ctx.esc(ctx.t(hintKey))}</small>` : ''}</label>`;
const findings = (ctx, r, scope) => (r && !r.error && (r.findings || []).length
  ? findingsBlockHTML(r.findings, { t: ctx.t, esc: ctx.esc, scope, print: false, acceptances: {}, canAccept: false }) : '');
const ALPHAS = ['0.05', '0.01'];

/* ── Malaka sinovlari ── */
/** m: { list, selected, series, entry, result, history, canAdmin, bad } */
export function ptHTML(m, ctx) {
  const t = ctx.t, s = m.series;
  const top = `<div class="rg-actions">
      <label class="rg-field"><span>${ctx.esc(t('pt_series'))}</span><select data-pt="select">${opt(ctx, '', '—', m.selected)}${m.list.map(x => opt(ctx, x.id, x.name || x.id, m.selected)).join('')}</select></label>
      <button type="button" class="btn btn-primary btn-sm" data-pt-act="new">${ctx.esc(t('pt_new'))}</button>
      <button type="button" class="btn btn-outline btn-sm" data-pt-act="import"${dis(!s)}>${ctx.esc(t('pt_import'))}</button>
      <button type="button" class="btn btn-outline btn-sm" data-pt-act="export-csv"${dis(!s)}>${ctx.esc(t('lb_export_csv'))}</button>
      <button type="button" class="btn btn-outline btn-sm" data-pt-act="export-json">${ctx.esc(t('lb_export_json'))}</button>
    </div><p class="text-xs text-muted">${ctx.esc(t('pt_import_hint'))}</p>`;
  if (!s) return `<div class="card rg-card" data-lb-list="pt">${top}<div class="empty-state"><p>${ctx.esc(t('pt_empty'))}</p></div></div>`;
  const e = m.entry, a = k => `data-pt-new="${k}"`;
  const rounds = s.rounds.map((r, i) => `<tr data-pt-row="${i}"><td>${ctx.esc(r.id || `R${i + 1}`)}</td><td>${ctx.esc(r.date)}</td><td>${ctx.esc(r.scheme)}</td>
      ${['x', 'xpt', 'sigmaPt', 'ux', 'uxpt', 'Ux', 'Uxpt'].map(k => `<td class="cell-num mono">${ctx.esc(r[k] === '' ? '—' : r[k])}</td>`).join('')}<td>${ctx.esc(r.primary ? t('pt_score_' + r.primary) : t('pt_primary_auto'))}</td>
      <td><button type="button" class="btn btn-ghost btn-sm" data-pt-act="del-round" data-pt-index="${i}">×</button></td></tr>`).join('');
  return `<div class="card rg-card" data-lb-list="pt" data-pt-id="${ctx.esc(s.id)}">${top}
    <div class="settings-grid">
      ${field(ctx, 'lb_f_name', inp(ctx, 'data-pt="name"', s.name))}${field(ctx, 'pt_f_quantity', inp(ctx, 'data-pt="quantity"', s.quantity))}
      ${field(ctx, 'pt_f_method', inp(ctx, 'data-pt="method"', s.method))}${field(ctx, 'pt_f_matrix', inp(ctx, 'data-pt="matrix"', s.matrix))}
      ${field(ctx, 'lb_f_unit', inp(ctx, 'data-pt="unit"', s.unit), 'pt_f_unit_hint')}${field(ctx, 'pt_f_provider', inp(ctx, 'data-pt="provider"', s.provider), 'pt_f_provider_hint')}
    </div>
    <div class="rg-actions">
      <button type="button" class="btn btn-primary btn-sm" data-pt-act="save">${ctx.esc(t('lb_save'))}</button>
      <button type="button" class="btn btn-danger btn-sm" data-pt-act="delete"${dis(!m.canAdmin)}>${ctx.esc(t('lb_delete'))}</button>
    </div>
    <h4 class="rg-card-title">${ctx.esc(t('pt_rounds_title'))} (${s.rounds.length})</h4>
    ${s.rounds.length ? `<div class="table-scroll"><table class="data-table" data-pt-rounds="1"><thead><tr>${['pt_col_round', 'lb_qc_date', 'pt_f_scheme', 'pt_col_x', 'pt_col_xpt', 'pt_col_sigma', 'pt_f_ux', 'pt_col_uxpt', 'pt_f_Ux', 'pt_f_Uxpt', 'pt_f_primary']
    .map(k => `<th>${ctx.esc(t(k))}</th>`).join('')}<th></th></tr></thead><tbody>${rounds}</tbody></table></div>` : `<p class="text-muted">${ctx.esc(t('pt_no_rounds'))}</p>`}
    <h4 class="rg-card-title">${ctx.esc(t('pt_add_title'))}</h4>
    <div class="settings-grid" data-pt-entry="1">
      ${field(ctx, 'pt_col_round', inp(ctx, a('id'), e.id))}${field(ctx, 'lb_qc_date', inp(ctx, a('date'), e.date, { type: 'date' }))}${field(ctx, 'pt_f_scheme', inp(ctx, a('scheme'), e.scheme))}
      ${field(ctx, 'pt_col_x', inp(ctx, a('x'), e.x, { decimal: true }))}${field(ctx, 'pt_col_xpt', inp(ctx, a('xpt'), e.xpt, { decimal: true }))}
      ${field(ctx, 'pt_col_sigma', inp(ctx, a('sigmaPt'), e.sigmaPt, { decimal: true }), 'pt_f_sigma_hint')}
      ${field(ctx, 'pt_f_ux', inp(ctx, a('ux'), e.ux, { decimal: true }))}${field(ctx, 'pt_col_uxpt', inp(ctx, a('uxpt'), e.uxpt, { decimal: true }))}
      ${field(ctx, 'pt_f_Ux', inp(ctx, a('Ux'), e.Ux, { decimal: true }))}${field(ctx, 'pt_f_Uxpt', inp(ctx, a('Uxpt'), e.Uxpt, { decimal: true }))}
      ${field(ctx, 'pt_f_primary', `<select ${a('primary')}>${opt(ctx, '', t('pt_primary_auto'), e.primary)}${PT_SCORES.map(k => opt(ctx, k, t('pt_score_' + k), e.primary)).join('')}</select>`, 'pt_f_primary_hint')}
    </div>
    ${m.bad && m.bad.length ? `<div class="warn-box" data-pt-bad="1">${ctx.esc(t('lb_bad_fields'))}: ${ctx.esc(m.bad.join(', '))}</div>` : ''}
    <div class="rg-actions"><button type="button" class="btn btn-outline btn-sm" data-pt-act="add-round">${ctx.esc(t('pt_add_round'))}</button></div>
    ${m.result ? `<div data-pt-result="1">${ptSectionHTML(ctx, m.result)}${findings(ctx, m.result, 'pt')}
      <div class="rg-actions">
        <button type="button" class="btn btn-outline btn-sm" data-pt-act="to-topdown"${dis(m.result.error)}>${ctx.esc(t('pt_to_topdown'))}</button>
        <button type="button" class="btn btn-outline btn-sm" data-pt-act="print"${dis(m.result.error)}>${ctx.esc(t('rg_print'))}</button>
      </div><p class="text-xs text-muted">${ctx.esc(t('pt_to_topdown_hint'))}</p></div>` : ''}
    ${historyHTML(m.history, ctx)}
  </div>`;
}

/* ── Validatsiya ── */
function testFormHTML(f, ctx) {
  const t = ctx.t, a = k => `data-vl-form="${k}"`;
  const alpha = field(ctx, 'vl_f_alpha', `<select ${a('alpha')}>${opt(ctx, '', '0.05', f.alpha)}${ALPHAS.slice(1).map(x => opt(ctx, x, x, f.alpha)).join('')}</select>`);
  const tail = field(ctx, 'vl_f_tail', `<select ${a('tail')}>${TAILS.map(x => opt(ctx, x, t('vl_tail_' + x), f.tail)).join('')}</select>`);
  let body = '';
  if (f.type === 'grubbs') body = field(ctx, 'vl_f_values', area(ctx, a('values'), f.values, 3), 'vl_f_values_hint') + field(ctx, 'vl_f_side', `<select ${a('side')}>${GRUBBS_SIDES.map(x => opt(ctx, x, t('vl_side_' + x), f.side)).join('')}</select>`) + alpha;
  else if (f.type === 'cochran' || f.type === 'anova') body = field(ctx, 'vl_f_groups', area(ctx, a('groups'), f.groups, 5), 'vl_f_groups_hint') + alpha;
  else if (f.type === 'ttest' || f.type === 'ftest') body = field(ctx, 'vl_f_a', area(ctx, a('a'), f.a, 2), 'vl_f_values_hint') + field(ctx, 'vl_f_b', area(ctx, a('b'), f.b, 2)) + tail + alpha
    + (f.type === 'ttest' ? `<label class="td-choice"><input type="checkbox" ${a('equalVariance')}${f.equalVariance ? ' checked' : ''} /><span>${ctx.esc(t('vl_f_equal_var'))}</span></label>` : '');
  else if (f.type === 'recovery') body = field(ctx, 'vl_f_recoveries', area(ctx, a('values'), f.values, 2), 'vl_f_recoveries_hint')
    + field(ctx, 'vl_f_correction', `<select ${a('correction')}>${opt(ctx, 'not_applied', t('vl_corr_not_applied'), f.correction)}${opt(ctx, 'applied', t('vl_corr_applied'), f.correction)}</select>`);
  else if (f.type === 'linearity') body = field(ctx, 'vl_f_points', area(ctx, a('points'), f.points, 5), 'vl_f_points_hint');
  else if (f.type === 'lod') {
    body = field(ctx, 'vl_f_lod_method', `<select ${a('method')}>${LOD_METHODS.map(x => opt(ctx, x, t('vl_lodm_' + x), f.method)).join('')}</select>`);
    body += f.method === 'calibration' ? field(ctx, 'vl_f_points', area(ctx, a('points'), f.points, 5), 'vl_f_points_hint')
      : field(ctx, 'vl_f_blank', area(ctx, a('values'), f.values, 2), 'vl_f_blank_hint') + field(ctx, 'vl_f_replicates', inp(ctx, a('replicates'), f.replicates, { decimal: true }), 'vl_f_replicates_hint')
        + field(ctx, 'vl_f_kq', inp(ctx, a('kQ'), f.kQ, { decimal: true, ph: '10' }), 'vl_f_kq_hint')
        + `<label class="td-choice"><input type="checkbox" ${a('blankCorrection')}${f.blankCorrection ? ' checked' : ''} /><span>${ctx.esc(t('vl_f_blank_corr'))}</span></label>`
        + field(ctx, 'vl_f_blank_n', inp(ctx, a('blankReplicates'), f.blankReplicates, { decimal: true }));
  }
  return `<div class="settings-grid" data-vl-testform="${ctx.esc(f.type)}">
      ${field(ctx, 'vl_f_type', `<select ${a('type')}>${VALIDATION_TESTS.map(x => opt(ctx, x, t('vl_type_' + x), f.type)).join('')}</select>`)}
      ${field(ctx, 'vl_f_id', inp(ctx, a('id'), f.id))}${field(ctx, 'vl_f_label', inp(ctx, a('label'), f.label))}
      ${body}</div>`;
}

/** Belgilangan qiymat va chiqarish boshqaruvi (Grubbs / Cochran). */
function flagsHTML(m, ctx) {
  const t = ctx.t, r = m.result;
  if (!r || r.error) return '';
  const out = [];
  for (const x of r.tests) {
    if (x.error || !['grubbs', 'cochran'].includes(x.type)) continue;
    const ex = x.excluded || [];
    const flagged = x.flaggedIndex !== null && x.flaggedIndex !== undefined;
    if (!flagged && !ex.length) continue;
    const label = x.type === 'grubbs' ? `x[${(x.flaggedIndex || 0) + 1}] = ${x.value}` : `${t('vl_group')} ${(x.flaggedIndex || 0) + 1}`;
    out.push(`<div class="tpl-banner tpl-banner-warn" data-vl-flag="${ctx.esc(x.id)}">
      ${flagged ? `<div><strong>${ctx.esc(x.id)}</strong>: ${ctx.esc(t('vl_flagged'))} — ${ctx.esc(label)}</div>
      <div class="settings-grid">${field(ctx, 'vl_f_comment', inp(ctx, `data-vl-comment="${ctx.esc(x.id)}"`, m.comments[x.id] || '', { ro: !m.canAdmin }), 'vl_f_comment_hint')}</div>
      <div class="rg-actions"><button type="button" class="btn btn-danger btn-sm" data-vl-act="exclude" data-vl-test="${ctx.esc(x.id)}" data-vl-index="${x.flaggedIndex}"${dis(!m.canAdmin)}>${ctx.esc(t('vl_exclude'))}</button>
        <span class="text-xs text-muted">${ctx.esc(t(m.canAdmin ? 'vl_exclude_hint' : 'vl_exclude_admin'))}</span></div>` : ''}
      ${ex.map(e => `<div class="text-xs" data-vl-excluded-item="${e.index}">${ctx.esc(t('vl_excluded_title'))}: #${e.index + 1} — ${ctx.esc(e.comment)} (${ctx.esc(e.role || '')})
        <button type="button" class="btn btn-ghost btn-sm" data-vl-act="include" data-vl-test="${ctx.esc(x.id)}" data-vl-index="${e.index}"${dis(!m.canAdmin)}>${ctx.esc(t('vl_include'))}</button></div>`).join('')}
    </div>`);
  }
  return out.join('');
}

function draftHTML(m, ctx) {
  const t = ctx.t, r = m.result;
  if (!r || r.error) return '';
  const prec = r.tests.filter(x => x.type === 'anova' && !x.error), rec = r.tests.filter(x => x.type === 'recovery' && !x.error);
  if (!prec.length) return `<p class="text-xs text-muted" data-vl-draft="none">${ctx.esc(t('vl_draft_need_anova'))}</p>`;
  const d = m.draft;
  return `<details class="lb-history" data-vl-draft="1"><summary>${ctx.esc(t('vl_draft_title'))}</summary>
    <p class="text-xs text-muted">${ctx.esc(t('vl_draft_hint'))}</p>
    <div class="settings-grid">
      ${field(ctx, 'vl_draft_id', inp(ctx, 'data-vl-draft="id"', d.id, { ro: !m.canAdmin }))}
      ${field(ctx, 'vl_draft_precision', `<select data-vl-draft="precision">${prec.map(x => opt(ctx, x.id, `${x.id}${x.label ? ' — ' + x.label : ''}`, d.precision)).join('')}</select>`)}
      ${field(ctx, 'vl_draft_recovery', `<select data-vl-draft="recovery">${opt(ctx, '', '—', d.recovery)}${rec.map(x => opt(ctx, x.id, x.id, d.recovery)).join('')}</select>`)}
      ${field(ctx, 'vl_draft_scale', `<select data-vl-draft="scale">${opt(ctx, 'relative', t('vl_scale_relative'), d.scale)}${opt(ctx, 'absolute', t('vl_scale_absolute'), d.scale)}</select>`)}
    </div>
    <div class="rg-actions"><button type="button" class="btn btn-outline btn-sm" data-vl-act="draft"${dis(!m.canAdmin)}>${ctx.esc(t('vl_draft_create'))}</button>
      ${m.canAdmin ? '' : `<span class="text-xs text-muted">${ctx.esc(t('vl_draft_admin'))}</span>`}</div></details>`;
}

/** m: { list, selected, set, form, editing, result, history, canAdmin, comments, draft, bad } */
export function validationHTML(m, ctx) {
  const t = ctx.t, s = m.set;
  const top = `<div class="rg-actions">
      <label class="rg-field"><span>${ctx.esc(t('vl_set'))}</span><select data-vl="select">${opt(ctx, '', '—', m.selected)}${m.list.map(x => opt(ctx, x.id, x.name || x.id, m.selected)).join('')}</select></label>
      <button type="button" class="btn btn-primary btn-sm" data-vl-act="new">${ctx.esc(t('vl_new'))}</button>
    </div>`;
  if (!s) return `<div class="card rg-card" data-lb-list="validation">${top}<div class="empty-state"><p>${ctx.esc(t('vl_empty'))}</p></div></div>`;
  const tests = s.tests.map((x, i) => `<tr data-vl-row="${i}"><td>${ctx.esc(x.id)}</td><td>${ctx.esc(t('vl_type_' + x.type))}</td><td>${ctx.esc(x.label || '')}</td>
      <td>${(x.excluded || []).length ? ctx.esc(String(x.excluded.length)) : ''}</td>
      <td><button type="button" class="btn btn-ghost btn-sm" data-vl-act="edit-test" data-vl-index="${i}">${ctx.esc(t('vl_edit'))}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-vl-act="del-test" data-vl-index="${i}">×</button></td></tr>`).join('');
  return `<div class="card rg-card" data-lb-list="validation" data-vl-id="${ctx.esc(s.id)}">${top}
    <div class="settings-grid">
      ${field(ctx, 'lb_f_name', inp(ctx, 'data-vl="name"', s.name))}${field(ctx, 'pt_f_method', inp(ctx, 'data-vl="method"', s.method))}
      ${field(ctx, 'pt_f_quantity', inp(ctx, 'data-vl="quantity"', s.quantity))}${field(ctx, 'pt_f_matrix', inp(ctx, 'data-vl="matrix"', s.matrix))}${field(ctx, 'lb_f_unit', inp(ctx, 'data-vl="unit"', s.unit))}
    </div>
    <div class="rg-actions">
      <button type="button" class="btn btn-primary btn-sm" data-vl-act="save">${ctx.esc(t('lb_save'))}</button>
      <button type="button" class="btn btn-danger btn-sm" data-vl-act="delete"${dis(!m.canAdmin)}>${ctx.esc(t('lb_delete'))}</button>
    </div>
    <h4 class="rg-card-title">${ctx.esc(t('vl_tests_title'))} (${s.tests.length})</h4>
    ${s.tests.length ? `<table class="data-table" data-vl-tests="1"><thead><tr>${['vl_f_id', 'vl_f_type', 'vl_f_label', 'vl_excluded_short'].map(k => `<th>${ctx.esc(t(k))}</th>`).join('')}<th></th></tr></thead><tbody>${tests}</tbody></table>` : `<p class="text-muted">${ctx.esc(t('vl_no_tests'))}</p>`}
    <h4 class="rg-card-title">${ctx.esc(t(m.editing === null ? 'vl_add_title' : 'vl_edit_title'))}</h4>
    ${testFormHTML(m.form, ctx)}
    ${m.bad && m.bad.length ? `<div class="warn-box" data-vl-bad="1">${ctx.esc(t('lb_bad_fields'))}: ${ctx.esc(m.bad.join(', '))}</div>` : ''}
    <div class="rg-actions"><button type="button" class="btn btn-outline btn-sm" data-vl-act="add-test">${ctx.esc(t(m.editing === null ? 'vl_add_test' : 'vl_update_test'))}</button>
      ${m.editing === null ? '' : `<button type="button" class="btn btn-ghost btn-sm" data-vl-act="cancel-edit">${ctx.esc(t('lb_close'))}</button>`}</div>
    ${m.result ? `<div data-vl-result="1">${flagsHTML(m, ctx)}${validationSectionHTML(ctx, m.result)}${findings(ctx, m.result, 'validation')}
      <div class="rg-actions"><button type="button" class="btn btn-outline btn-sm" data-vl-act="print">${ctx.esc(t('rg_print'))}</button></div>
      ${draftHTML(m, ctx)}</div>` : ''}
    ${historyHTML(m.history, ctx)}
  </div>`;
}
