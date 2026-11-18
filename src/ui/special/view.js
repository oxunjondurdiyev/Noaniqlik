/* ═══════════════════════════════════════════════════════════════
   SPECIAL/VIEW.JS — P10: "Maxsus rejimlar" oynasi shakllarining HTML satrlari.
   Sof modul: DOM'ga tegmaydi. Har qanday qiymat ctx.esc (escHtml) orqali. ctx = { t(key), esc(value) }.
   Hodisalar — app.js da (data-sp-* atributlari; inline handler yo'q).
═══════════════════════════════════════════════════════════════ */
import { MODES, samplingRows, levelRows } from './build.js';
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
    : key === 'meLevels' ? (() => { const g = levelRows(st[key]); return { n: g.levels.length, skipped: g.skipped }; })()
      : (() => { const g = numericRows(st[key]); return { n: g.rows.length, skipped: g.skipped }; })();
  return `<small class="text-muted td-count" data-sp-count="${ctx.esc(key)}">${ctx.esc(ctx.t('td_parsed').replace('{n}', r.n))}${r.skipped ? ' · ' + ctx.esc(ctx.t('td_skipped').replace('{n}', r.skipped)) : ''}</small>`;
}
const area = (ctx, st, key, labelKey, hintKey, rows) =>
  `<label class="rg-field td-paste" for="sp-${key}"><span>${ctx.esc(ctx.t(labelKey))}</span>
    <textarea id="sp-${key}" data-sp-field="${key}" rows="${rows || 7}" spellcheck="false" class="td-area">${ctx.esc(st[key] ?? '')}</textarea>
    <small class="text-muted">${ctx.esc(ctx.t(hintKey))}</small><span data-sp-count-wrap="${ctx.esc(key)}">${countHTML(st, key, ctx)}</span></label>`;

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
    body = `<div class="settings-grid">${text(ctx, st, 'miValue', 'sp_mi_value', 'sp_mi_value_hint')}${text(ctx, st, 'miSum', 'sp_mi_sum', 'sp_mi_sum_hint')}${text(ctx, st, 'miUnit', 'sp_unit')}</div>
      ${area(ctx, st, 'miPairs', 'sp_mi_pairs', 'sp_mi_pairs_hint', 6)}
      <div class="settings-grid">${text(ctx, st, 'miTechS', 'sp_mi_tech_s', 'sp_mi_tech_s_hint')}${text(ctx, st, 'miMatrix', 'sp_mi_matrix', 'sp_mi_matrix_hint')}${text(ctx, st, 'miK', 'td_k', 'td_k_hint', '2')}</div>`;
  } else {
    body = `<div class="settings-grid">${text(ctx, st, 'meUnit', 'sp_me_unit', null, 'mmol/L')}</div>
      ${area(ctx, st, 'meLevels', 'sp_me_levels', 'sp_me_levels_hint', 4)}
      <div class="settings-grid">${text(ctx, st, 'meCal', 'sp_me_cal', 'sp_me_cal_hint')}${text(ctx, st, 'meBias', 'sp_me_bias', 'sp_me_bias_hint')}${text(ctx, st, 'meY', 'sp_y', 'sp_me_y_hint')}${text(ctx, st, 'meK', 'td_k', 'td_k_hint', '2')}</div>`;
  }
  return `<div class="card rg-card" data-sp-form="${st.mode}">${intro}${beta}${body}</div>`;
}
