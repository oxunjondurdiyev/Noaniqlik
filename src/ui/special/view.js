/* ═══════════════════════════════════════════════════════════════
   SPECIAL/VIEW.JS — P10: "Maxsus rejimlar" oynasi shakllarining HTML satrlari.
   Sof modul: DOM'ga tegmaydi. Har qanday qiymat ctx.esc (escHtml) orqali. ctx = { t(key), esc(value) }.
   Hodisalar — app.js da (data-sp-* atributlari; inline handler yo'q).
═══════════════════════════════════════════════════════════════ */
import { MODES, samplingRows, levelRows, groupRows } from './build.js';
import { numericRows } from '../topdown/build.js';

const opt = (ctx, value, label, cur) => `<option value="${ctx.esc(value)}"${String(cur) === String(value) ? ' selected' : ''}>${ctx.esc(label)}</option>`;
const field = (ctx, key, labelKey, inner, hintKey) =>
  `<label class="rg-field" for="sp-${key}"><span>${ctx.esc(ctx.t(labelKey))}</span>${inner}${hintKey ? `<small class="text-muted">${ctx.esc(ctx.t(hintKey))}</small>` : ''}</label>`;
const text = (ctx, st, key, labelKey, hintKey, ph) =>
  field(ctx, key, labelKey, `<input type="text" inputmode="decimal" id="sp-${key}" data-sp-field="${key}" value="${ctx.esc(st[key] ?? '')}" placeholder="${ctx.esc(ph || '')}" autocomplete="off" />`, hintKey);
const check = (ctx, st, key, labelKey, hintKey) =>
  `<label class="td-choice"><input type="checkbox" data-sp-flag="${key}"${st[key] ? ' checked' : ''} /><span><strong>${ctx.esc(ctx.t(labelKey))}</strong>${hintKey ? `<small class="text-muted">${ctx.esc(ctx.t(hintKey))}</small>` : ''}</span></label>`;

/** Qo'yilgan matndan o'qilgan qatorlar soni */
export function countHTML(st, key, ctx) {
  const r = key === 'saTargets' ? (() => { const g = samplingRows(st[key]); return { n: g.targets.length, skipped: g.skipped }; })()
    : key === 'miGroups' || key === 'miMatrixGroups' ? (() => { const g = groupRows(st[key]); return { n: g.groups.length, skipped: g.skipped }; })()
    : key === 'meLevels' ? (() => { const g = levelRows(st[key]); return { n: g.levels.length, skipped: g.skipped }; })()
      : (() => { const g = numericRows(st[key]); return { n: g.rows.length, skipped: g.skipped }; })();
  return `<small class="text-muted td-count" data-sp-count="${ctx.esc(key)}">${ctx.esc(ctx.t('td_parsed').replace('{n}', r.n))}${r.skipped ? ' · ' + ctx.esc(ctx.t('td_skipped').replace('{n}', r.skipped)) : ''}</small>`;
}
const area = (ctx, st, key, labelKey, hintKey, rows) =>
  `<label class="rg-field td-paste" for="sp-${key}"><span>${ctx.esc(ctx.t(labelKey))}</span>
    <textarea id="sp-${key}" data-sp-field="${key}" rows="${rows || 7}" spellcheck="false" class="td-area">${ctx.esc(st[key] ?? '')}</textarea>
    <small class="text-muted">${ctx.esc(ctx.t(hintKey))}</small><span data-sp-count-wrap="${ctx.esc(key)}">${countHTML(st, key, ctx)}</span></label>`;

/** Tanlov (o'zgarganda shakl qayta chiziladi — data-sp-rerender) */
const select = (ctx, st, key, labelKey, options, hintKey) =>
  field(ctx, key, labelKey, `<select id="sp-${key}" data-sp-field="${key}" data-sp-rerender="1">${options.map(([v, l]) => opt(ctx, v, ctx.t(l), st[key])).join('')}</select>`, hintKey);

/** Mikrobiologiya shakli (ISO 19036:2019): usul → natija → u_tech → u_matrix → sozlamalar. Faqat tanlangan variant maydonlari chiziladi. */
function microForm(st, ctx) {
  const method = ['count', 'count_confirm', 'mpn', 'instrumental'].includes(st.miMethod) ? st.miMethod : 'count';
  const repro = !!st.miRepro, counting = method === 'count' || method === 'count_confirm';
  const techKind = repro ? 'stated' : (['pairs', 'groups', 'stated'].includes(st.miTechKind) ? st.miTechKind : 'pairs');
  const matrixKind = ['stated', 'preset', 'groups'].includes(st.miMatrixKind) ? st.miMatrixKind : 'stated';
  const h = key => `<h4 class="rg-h">${ctx.esc(ctx.t(key))}</h4>`;
  return `${select(ctx, st, 'miMethod', 'sp_mi_method', MI_METHODS.map(m => [m, 'sp_mi_method_' + m]), 'sp_mi_method_hint')}
    <div class="td-choices"><label class="td-choice"><input type="checkbox" data-sp-flag="miRepro" data-sp-rerender="1"${repro ? ' checked' : ''} /><span><strong>${ctx.esc(ctx.t('sp_mi_repro'))}</strong><small class="text-muted">${ctx.esc(ctx.t('sp_mi_repro_hint'))}</small></span></label></div>
    ${h('sp_mi_h_result')}
    <div class="settings-grid">${text(ctx, st, 'miValue', method === 'mpn' ? 'sp_mi_value_mpn' : method === 'count_confirm' ? 'sp_mi_value_presumptive' : 'sp_mi_value', 'sp_mi_value_hint')}
      ${counting && !repro ? text(ctx, st, 'miSum', 'sp_mi_sum', 'sp_mi_sum_hint') : ''}${text(ctx, st, 'miUnit', 'sp_unit')}
      ${repro || method === 'instrumental' ? '' : text(ctx, st, 'miLoq', 'sp_mi_loq', 'sp_mi_loq_hint')}</div>
    ${method === 'count_confirm' && !repro ? `<div class="settings-grid" data-sp-mi="confirm">${text(ctx, st, 'miNp', 'sp_mi_np', 'sp_mi_np_hint')}${text(ctx, st, 'miNc', 'sp_mi_nc', 'sp_mi_nc_hint')}</div>` : ''}
    ${method === 'mpn' && !repro ? `<div class="settings-grid" data-sp-mi="mpn">${text(ctx, st, 'miMpnU', 'sp_mi_mpn_u', 'sp_mi_mpn_u_hint')}${text(ctx, st, 'miMpnMu', 'sp_mi_mpn_mu', 'sp_mi_mpn_mu_hint')}</div>
      ${area(ctx, st, 'miMpnAliquots', 'sp_mi_mpn_aliquots', 'sp_mi_mpn_aliquots_hint', 4)}` : ''}
    ${h('sp_mi_h_tech')}
    ${repro ? '' : select(ctx, st, 'miTechKind', 'sp_mi_tech_kind', ['pairs', 'groups', 'stated'].map(k => [k, 'sp_mi_tech_kind_' + k]))}
    ${techKind === 'pairs' ? area(ctx, st, 'miPairs', 'sp_mi_pairs', 'sp_mi_pairs_hint', 6) : ''}
    ${techKind === 'groups' ? area(ctx, st, 'miGroups', 'sp_mi_groups', 'sp_mi_groups_hint', 6) : ''}
    <div class="settings-grid">${text(ctx, st, 'miTechS', repro ? 'sp_mi_s_r' : 'sp_mi_tech_s', techKind === 'stated' ? 'sp_mi_tech_s_hint' : 'sp_mi_tech_s_fallback')}
      ${select(ctx, st, 'miTechSource', 'sp_mi_tech_source', ['intralab', 'interlab', 'pt'].map(k => [k, 'sp_mi_tech_source_' + k]))}</div>
    ${repro ? '' : `${h('sp_mi_h_matrix')}
      ${select(ctx, st, 'miMatrixKind', 'sp_mi_matrix_kind', ['stated', 'preset', 'groups'].map(k => [k, 'sp_mi_matrix_kind_' + k]))}
      ${matrixKind === 'stated' ? `<div class="settings-grid">${text(ctx, st, 'miMatrix', 'sp_mi_matrix', 'sp_mi_matrix_hint')}</div>` : ''}
      ${matrixKind === 'groups' ? area(ctx, st, 'miMatrixGroups', 'sp_mi_matrix_groups', 'sp_mi_matrix_groups_hint', 6) : ''}`}
    ${h('sp_mi_h_settings')}
    ${repro ? '' : `<div class="td-choices">${check(ctx, st, 'miIgnore', 'sp_mi_ignore', 'sp_mi_ignore_hint')}</div>`}
    <div class="settings-grid">${select(ctx, st, 'miForm', 'sp_mi_form', ['a', 'b', 'c'].map(k => [k, 'sp_mi_form_' + k]), 'sp_mi_form_hint')}
      ${select(ctx, st, 'miRounding', 'sp_mi_rounding', [['', 'sp_mi_rounding_lab'], ['half_up', 'sp_mi_rounding_half_up'], ['up', 'sp_mi_rounding_up']], 'sp_mi_rounding_hint')}
      ${text(ctx, st, 'miK', 'td_k', 'sp_mi_k_hint', '2')}</div>`;
}
const MI_METHODS = ['count', 'count_confirm', 'mpn', 'instrumental'];

/** Rejim tanlagichi (4 ta rejim; BETA belgisi tekshirilmagan modullarda) */
export function modesHTML(st, ctx) {
  return `<div class="sp-modes" role="tablist" data-sp-modes="1">${MODES.map(m =>
    `<button type="button" role="tab" class="sp-mode${st.mode === m ? ' active' : ''}" data-sp-mode="${m}" aria-selected="${st.mode === m}">${ctx.esc(ctx.t('sp_mode_' + m))}${
      m === 'micro' || m === 'medical' ? ' <span class="badge badge-orange">BETA</span>' : ''}</button>`).join('')}</div>`;
}

export function formHTML(st, ctx) {
  const intro = `<p class="text-muted text-sm" data-sp-intro="${st.mode}">${ctx.esc(ctx.t('sp_intro_' + st.mode))}</p>`;
  const beta = st.mode === 'micro' || st.mode === 'medical' ? `<div class="warn-box" data-sp-beta="1">⚠ ${ctx.esc(ctx.t('sp_beta_' + st.mode))}</div>` : '';
  let body;
  if (st.mode === 'sampling') {
    body = `${area(ctx, st, 'saTargets', 'sp_sa_targets', 'sp_sa_targets_hint', 10)}
      <div class="settings-grid">
        ${field(ctx, 'saMethod', 'sp_sa_method', `<select id="sp-saMethod" data-sp-field="saMethod">${['classical', 'robust'].map(m => opt(ctx, m, ctx.t('sp_sa_' + m), st.saMethod)).join('')}</select>`, 'sp_sa_method_hint')}
        ${text(ctx, st, 'saUnit', 'sp_unit', null, 'mg/kg')}${text(ctx, st, 'saY', 'sp_y', 'sp_sa_y_hint')}
      </div>
      <div class="td-choices">${check(ctx, st, 'saLog', 'sp_sa_log', 'sp_sa_log_hint')}</div>`;
  } else if (st.mode === 'qualitative') {
    body = `<table class="data-table sp-2x2" data-sp-table="1"><thead><tr><th></th><th>${ctx.esc(ctx.t('sp_ql_case_pos'))}</th><th>${ctx.esc(ctx.t('sp_ql_case_neg'))}</th></tr></thead><tbody>
        <tr><th>${ctx.esc(ctx.t('sp_ql_res_pos'))}</th>${['qlTp', 'qlFp'].map(k => `<td><input type="text" inputmode="numeric" id="sp-${k}" data-sp-field="${k}" value="${ctx.esc(st[k] ?? '')}" placeholder="${k === 'qlTp' ? 'tp' : 'fp'}" autocomplete="off" /></td>`).join('')}</tr>
        <tr><th>${ctx.esc(ctx.t('sp_ql_res_neg'))}</th>${['qlFn', 'qlTn'].map(k => `<td><input type="text" inputmode="numeric" id="sp-${k}" data-sp-field="${k}" value="${ctx.esc(st[k] ?? '')}" placeholder="${k === 'qlFn' ? 'fn' : 'tn'}" autocomplete="off" /></td>`).join('')}</tr>
      </tbody></table>
      <div class="settings-grid">${text(ctx, st, 'qlPrev', 'sp_ql_prev', 'sp_ql_prev_hint')}</div>`;
  } else if (st.mode === 'micro') {
    body = microForm(st, ctx);
  } else {
    body = `<div class="settings-grid">${text(ctx, st, 'meUnit', 'sp_me_unit', null, 'mmol/L')}</div>
      ${area(ctx, st, 'meLevels', 'sp_me_levels', 'sp_me_levels_hint', 4)}
      <div class="settings-grid">${text(ctx, st, 'meCal', 'sp_me_cal', 'sp_me_cal_hint')}${text(ctx, st, 'meBias', 'sp_me_bias', 'sp_me_bias_hint')}${text(ctx, st, 'meY', 'sp_y', 'sp_me_y_hint')}${text(ctx, st, 'meK', 'td_k', 'td_k_hint', '2')}</div>`;
  }
  return `<div class="card rg-card" data-sp-form="${st.mode}">${intro}${beta}${body}</div>`;
}
