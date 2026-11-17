/* ═══════════════════════════════════════════════════════════════
   TOPDOWN/VIEW.JS — P09: Top-down ustasi (wizard) qadamlarining HTML satrlari.
   Sof modul: DOM'ga tegmaydi, Node'da test qilinadi. Har qanday qiymat ctx.esc (escHtml) orqali.
   ctx = { t(key), esc(value) }. Hodisalar — app.js da (data-td-* atributlari; inline handler yo'q).
═══════════════════════════════════════════════════════════════ */
import { RW_SOURCES, BIAS_SOURCES, BASES, UI_CATEGORIES, COVER_CATEGORIES, numericRows, numericList } from './build.js';

const opt = (ctx, value, label, cur) => `<option value="${ctx.esc(value)}"${String(cur) === String(value) ? ' selected' : ''}>${ctx.esc(label)}</option>`;
const field = (ctx, id, labelKey, inner, hintKey) =>
  `<label class="rg-field" for="${id}"><span>${ctx.esc(ctx.t(labelKey))}</span>${inner}${hintKey ? `<small class="text-muted">${ctx.esc(ctx.t(hintKey))}</small>` : ''}</label>`;
const text = (ctx, st, key, ph) =>
  `<input type="text" inputmode="decimal" id="td-${key}" data-td-field="${key}" value="${ctx.esc(st[key] ?? '')}" placeholder="${ctx.esc(ph || '')}" autocomplete="off" />`;
const area = (ctx, st, key, rows) =>
  `<textarea id="td-${key}" data-td-field="${key}" rows="${rows || 6}" spellcheck="false" class="td-area">${ctx.esc(st[key] ?? '')}</textarea>`;
const radio = (ctx, name, value, cur, labelKey, descKey) =>
  `<label class="td-choice"><input type="radio" name="td-${name}" data-td-field="${name}" value="${ctx.esc(value)}"${cur === value ? ' checked' : ''} />
    <span><strong>${ctx.esc(ctx.t(labelKey))}</strong>${descKey ? `<small class="text-muted">${ctx.esc(ctx.t(descKey))}</small>` : ''}</span></label>`;
const check = (ctx, attr, value, on, labelKey, descKey) =>
  `<label class="td-choice"><input type="checkbox" ${attr}="${ctx.esc(value)}"${on ? ' checked' : ''} />
    <span><strong>${ctx.esc(ctx.t(labelKey))}</strong>${descKey ? `<small class="text-muted">${ctx.esc(ctx.t(descKey))}</small>` : ''}</span></label>`;

/** Qadamlar ko'rsatkichi */
export function stepsHTML(st, ctx) {
  return `<ol class="td-steps" data-td-steps="1">${[1, 2, 3].map(n =>
    `<li class="td-step${st.step === n ? ' active' : ''}${st.step > n ? ' done' : ''}"><button type="button" class="td-step-btn" data-td-step="${n}"${st.step === n ? ' aria-current="step"' : ''}>
      <span class="td-step-n">${n}</span> ${ctx.esc(ctx.t('td_step' + n))}</button></li>`).join('')}</ol>`;
}

/** 1-qadam: ma'lumot turi */
export function step1HTML(st, ctx) {
  const within = st.basis === 'within';
  const unitLabel = st.basis === 'level' || st.scale === 'absolute' ? 'td_unit_abs' : 'td_unit_data';
  return `<div class="card rg-card" data-td-panel="1">
    <h3 class="rg-card-title">${ctx.esc(ctx.t('td_basis_title'))}</h3>
    <div class="td-choices">${BASES.map(b => radio(ctx, 'basis', b, st.basis, 'td_basis_' + b, 'td_basis_' + b + '_d')).join('')}</div>
  </div>
  <div class="card rg-card${within ? '' : ' hidden'}" data-td-within="1">
    <h3 class="rg-card-title">${ctx.esc(ctx.t('td_rw_sources'))}</h3>
    <p class="text-muted text-sm">${ctx.esc(ctx.t('td_rw_sources_hint'))}</p>
    <div class="td-choices">${RW_SOURCES.map(s => check(ctx, 'data-td-rw', s, (st.rwSources || []).includes(s), 'td_src_' + s, 'td_src_' + s + '_d')).join('')}</div>
    <h3 class="rg-card-title">${ctx.esc(ctx.t('td_bias_sources'))}</h3>
    <div class="td-choices">${BIAS_SOURCES.map(b => radio(ctx, 'bias', b, st.bias, 'td_bias_' + b, 'td_bias_' + b + '_d')).join('')}</div>
  </div>
  <div class="card rg-card">
    <h3 class="rg-card-title">${ctx.esc(ctx.t('td_scale_title'))}</h3>
    <p class="text-muted text-sm">${ctx.esc(ctx.t('td_scale_hint'))}</p>
    <div class="td-choices${st.basis === 'level' ? ' hidden' : ''}">${['relative', 'absolute'].map(s => radio(ctx, 'scale', s, st.scale, 'td_scale_' + s, 'td_scale_' + s + '_d')).join('')}</div>
    <div class="settings-grid">${field(ctx, 'td-unit', unitLabel, `<input type="text" id="td-unit" data-td-field="unit" value="${ctx.esc(st.unit)}" placeholder="mg/L" autocomplete="off" />`)}</div>
    <div class="td-choices">
      ${check(ctx, 'data-td-flag', 'empirical', st.empirical, 'td_empirical', 'td_empirical_d')}
      ${st.empirical && within && st.bias !== 'none' ? check(ctx, 'data-td-flag', 'refByMethod', st.refByMethod, 'td_ref_by_method', 'td_ref_by_method_d') : ''}
    </div>
  </div>`;
}

/** Kiritilgan matndan o'qilgan qatorlar soni (jonli ko'rsatkich) */
export function countHTML(st, key, ctx) {
  const pairs = key === 'dupPairs' || key === 'crmRows' || key === 'ptRows';
  const r = pairs ? numericRows(st[key]) : null;
  const n = pairs ? r.rows.length : numericList(st[key]).values.length;
  const skipped = pairs ? r.skipped : numericList(st[key]).bad;
  return `<small class="text-muted td-count" data-td-count="${ctx.esc(key)}">${ctx.esc(ctx.t('td_parsed').replace('{n}', n))}${skipped ? ' · ' + ctx.esc(ctx.t('td_skipped').replace('{n}', skipped)) : ''}</small>`;
}

const pasteField = (ctx, st, key, labelKey, hintKey, rows) =>
  `<label class="rg-field td-paste" for="td-${key}"><span>${ctx.esc(ctx.t(labelKey))}</span>${area(ctx, st, key, rows)}
    <small class="text-muted">${ctx.esc(ctx.t(hintKey))}</small><span data-td-count-wrap="${ctx.esc(key)}">${countHTML(st, key, ctx)}</span></label>`;

/** Qo'shimcha (gibrid) hissalar jadvali */
export function additionalHTML(st, ctx) {
  const rows = st.additional || [];
  const u = st.scale === 'relative' && st.basis !== 'level' ? '%' : (st.unit || '');
  return `<table class="data-table td-add-table" data-td-additional="1"><thead><tr><th>${ctx.esc(ctx.t('td_add_name'))}</th><th>${ctx.esc(ctx.t('td_add_category'))}</th>
      <th>u${u ? ', ' + ctx.esc(u) : ''}</th><th></th></tr></thead><tbody>${rows.map((a, i) => `<tr>
      <td><input type="text" data-td-add="${i}" data-td-add-key="name" value="${ctx.esc(a.name ?? '')}" autocomplete="off" /></td>
      <td><select data-td-add="${i}" data-td-add-key="category">${UI_CATEGORIES.map(c => opt(ctx, c, ctx.t('td_cat_' + c), a.category || 'other')).join('')}</select></td>
      <td><input type="text" inputmode="decimal" data-td-add="${i}" data-td-add-key="u" value="${ctx.esc(a.u ?? '')}" autocomplete="off" /></td>
      <td><button type="button" class="btn btn-ghost btn-sm" data-td-add-del="${i}" title="${ctx.esc(ctx.t('rg_del_row'))}" aria-label="${ctx.esc(ctx.t('rg_del_row'))}">×</button></td></tr>`).join('')}
    </tbody></table>`;
}

/** 2-qadam: ma'lumot kiritish (jadval yoki Excel'dan qo'yish) */
export function step2HTML(st, ctx) {
  const src = st.rwSources || [];
  const rel = st.scale === 'relative';
  const uLab = rel ? '%' : (st.unit || '');
  // yorliqdagi {u} — qiymat birligi (nisbiy baholashda %, mutlaqda — birlik; y uchun har doim ma'lumot birligi)
  const lab = (id, key, inner, hint, unit = uLab) => `<label class="rg-field" for="${id}"><span>${ctx.esc(ctx.t(key).replace('{u}', unit))}</span>${inner}${hint ? `<small class="text-muted">${ctx.esc(ctx.t(hint))}</small>` : ''}</label>`;
  let body = '';
  if (st.basis === 'within') {
    if (!src.length) body += `<div class="warn-box">⚠ ${ctx.esc(ctx.t('td_need_rw_source'))}</div>`;
    if (src.includes('control_series')) body += `<div class="card rg-card" data-td-input="control_series"><h3 class="rg-card-title">${ctx.esc(ctx.t('td_src_control_series'))}</h3>
      ${pasteField(ctx, st, 'qcValues', 'td_qc_values', 'td_qc_values_hint', 7)}</div>`;
    if (src.includes('duplicates')) body += `<div class="card rg-card" data-td-input="duplicates"><h3 class="rg-card-title">${ctx.esc(ctx.t('td_src_duplicates'))}</h3>
      ${pasteField(ctx, st, 'dupPairs', 'td_dup_pairs', 'td_dup_pairs_hint', 7)}
      ${rel ? `<div class="settings-grid">${field(ctx, 'td-dupMethod', 'td_dup_method', `<select id="td-dupMethod" data-td-field="dupMethod">${['per_pair', 'pooled_over_mean'].map(m => opt(ctx, m, ctx.t('td_dup_' + m), st.dupMethod)).join('')}</select>`)}</div>` : ''}</div>`;
    if (src.includes('control_limits')) body += `<div class="card rg-card" data-td-input="control_limits"><h3 class="rg-card-title">${ctx.esc(ctx.t('td_src_control_limits'))}</h3>
      <div class="settings-grid">${lab('td-limit', 'td_limit', text(ctx, st, 'limit'))}${field(ctx, 'td-sigmas', 'td_sigmas', text(ctx, st, 'sigmas'), 'td_sigmas_hint')}</div></div>`;
    if (src.includes('stated')) body += `<div class="card rg-card" data-td-input="stated"><h3 class="rg-card-title">${ctx.esc(ctx.t('td_src_stated'))}</h3>
      <div class="settings-grid">${lab('td-statedS', 'td_stated_s', text(ctx, st, 'statedS'))}${field(ctx, 'td-statedN', 'td_stated_n', text(ctx, st, 'statedN'))}</div></div>`;
    if (st.bias === 'crm') body += `<div class="card rg-card" data-td-input="crm"><h3 class="rg-card-title">${ctx.esc(ctx.t('td_bias_crm'))}</h3>
      ${pasteField(ctx, st, 'crmRows', 'td_crm_rows', rel ? 'td_crm_rows_hint' : 'td_crm_rows_hint_abs', 5)}</div>`;
    if (st.bias === 'pt') body += `<div class="card rg-card" data-td-input="pt"><h3 class="rg-card-title">${ctx.esc(ctx.t('td_bias_pt'))}</h3>
      ${pasteField(ctx, st, 'ptRows', 'td_pt_rows', rel ? 'td_pt_rows_hint' : 'td_pt_rows_hint_abs', 7)}
      <div class="td-choices">${check(ctx, 'data-td-flag', 'ptRobust', st.ptRobust, 'td_pt_robust', 'td_pt_robust_d')}</div></div>`;
    if (st.bias === 'recovery') body += `<div class="card rg-card" data-td-input="recovery"><h3 class="rg-card-title">${ctx.esc(ctx.t('td_bias_recovery'))}</h3>
      ${rel ? '' : `<div class="warn-box">⚠ ${ctx.esc(ctx.t('td_recovery_needs_relative'))}</div>`}
      ${pasteField(ctx, st, 'recValues', 'td_rec_values', 'td_rec_values_hint', 4)}
      <div class="settings-grid">${field(ctx, 'td-recURef', 'td_rec_uref', text(ctx, st, 'recURef'), 'td_rec_uref_hint')}</div></div>`;
    if (st.bias === 'recovery_quam') body += `<div class="card rg-card" data-td-input="recovery_quam"><h3 class="rg-card-title">${ctx.esc(ctx.t('td_bias_recovery_quam'))}</h3>
      ${rel ? '' : `<div class="warn-box">⚠ ${ctx.esc(ctx.t('td_recovery_needs_relative'))}</div>`}
      ${pasteField(ctx, st, 'quamValues', 'td_quam_values', 'td_quam_values_hint', 4)}
      <div class="settings-grid">${field(ctx, 'td-quamMean', 'td_quam_mean', text(ctx, st, 'quamMean'))}${field(ctx, 'td-quamS', 'td_quam_s', text(ctx, st, 'quamS'))}${field(ctx, 'td-quamN', 'td_quam_n', text(ctx, st, 'quamN'))}
        ${field(ctx, 'td-quamCorrection', 'td_rec_correction', `<select id="td-quamCorrection" data-td-field="quamCorrection">${['not_applied', 'applied'].map(c => opt(ctx, c, ctx.t('td_corr_' + c), st.quamCorrection)).join('')}</select>`)}</div></div>`;
  } else if (st.basis === 'sR') {
    body += `<div class="card rg-card" data-td-input="sR"><h3 class="rg-card-title">${ctx.esc(ctx.t('td_basis_sR'))}</h3>
      <div class="settings-grid">${lab('td-sR', 'td_sR', text(ctx, st, 'sR'))}${lab('td-sr', 'td_sr', text(ctx, st, 'sr'))}</div>
      <h3 class="rg-card-title">${ctx.esc(ctx.t('td_lab_check'))} <span class="badge badge-orange">unverified</span></h3>
      <p class="text-muted text-sm">${ctx.esc(ctx.t('td_lab_check_hint'))}</p>
      <div class="settings-grid">${lab('td-labS', 'td_lab_s', text(ctx, st, 'labS'))}${field(ctx, 'td-labN', 'td_lab_n', text(ctx, st, 'labN'))}</div>
      <div class="td-choices">${check(ctx, 'data-td-flag', 'labAdjust', st.labAdjust, 'td_lab_adjust', 'td_lab_adjust_d')}</div></div>`;
  } else {
    body += `<div class="card rg-card" data-td-input="level"><h3 class="rg-card-title">${ctx.esc(ctx.t('td_basis_level'))}</h3>
      <p class="text-muted text-sm mono">u(x) = √(s₀² + (x·s₁)²)</p>
      <div class="settings-grid">${field(ctx, 'td-s0', 'td_s0', text(ctx, st, 's0'))}${field(ctx, 'td-s1', 'td_s1', text(ctx, st, 's1'))}</div></div>`;
  }
  const coverBox = st.basis === 'level' ? '' : `<h3 class="rg-card-title">${ctx.esc(ctx.t(st.basis === 'sR' ? 'td_covers_sR' : 'td_covers'))}</h3>
      <p class="text-muted text-sm">${ctx.esc(ctx.t('td_covers_hint'))}</p>
      <div class="td-covers">${COVER_CATEGORIES.map(c => `<label class="td-cover"><input type="checkbox" data-td-cover="${ctx.esc(c)}"${(st.covers || []).includes(c) ? ' checked' : ''} /> ${ctx.esc(ctx.t('td_cat_' + c))}</label>`).join('')}</div>`;
  return `${body}
    <div class="card rg-card" data-td-input="additional">
      ${coverBox}
      <h3 class="rg-card-title">${ctx.esc(ctx.t('td_additional'))}</h3>
      <p class="text-muted text-sm">${ctx.esc(ctx.t(st.empirical ? 'td_additional_hint_emp' : 'td_additional_hint'))}</p>
      <div class="table-scroll" id="td-add-wrap">${additionalHTML(st, ctx)}</div>
      <div class="rg-actions"><button type="button" class="btn btn-outline btn-sm" data-td-act="add-row">${ctx.esc(ctx.t('td_add_row'))}</button></div>
    </div>
    <div class="card rg-card" data-td-input="measurement">
      <h3 class="rg-card-title">${ctx.esc(ctx.t('td_measurement'))}</h3>
      <div class="settings-grid">${lab('td-y', 'td_y', text(ctx, st, 'y'), st.basis === 'level' ? 'td_y_required' : 'td_y_hint', st.unit || '')}
        ${field(ctx, 'td-k', 'td_k', text(ctx, st, 'k', '2'), 'td_k_hint')}</div>
    </div>`;
}

/** Pastki navigatsiya tugmalari */
export function navHTML(st, ctx) {
  return `<div class="rg-actions td-nav">
    ${st.step > 1 ? `<button type="button" class="btn btn-outline" data-td-act="back">← ${ctx.esc(ctx.t('td_back'))}</button>` : ''}
    ${st.step < 3 ? `<button type="button" class="btn btn-primary" data-td-act="next" id="td-btn-next">${ctx.esc(ctx.t(st.step === 2 ? 'td_calc' : 'td_next'))} →</button>` : ''}
    ${st.step === 3 ? `<button type="button" class="btn btn-outline" data-td-act="print" id="td-btn-print">${ctx.esc(ctx.t('rg_print'))}</button>` : ''}
    <button type="button" class="btn btn-ghost btn-sm" data-td-act="reset">${ctx.esc(ctx.t('td_reset'))}</button>
  </div>`;
}
